from decimal import Decimal, ROUND_HALF_UP

from django.db import IntegrityError, transaction
from django.db.models import Sum
from django.utils import timezone
from rest_framework.exceptions import ValidationError

from apps.audit.models import AuditLog
from apps.audit.services import log_audit
from apps.inventory.models import InventoryTransaction
from apps.inventory.services import (
    BusinessRuleError,
    Conflict,
    allocate_number,
    post_sale,
    post_stock_increase,
    release_reservation,
    reserve_stock,
)
from apps.sales.models import SalesOrder, SalesOrderItem, SalesReturn, SalesReturnItem

ORDER_PREFIX = "SO"
RETURN_PREFIX = "SR"
OPEN_RESERVATION = {SalesOrder.Status.CONFIRMED, SalesOrder.Status.PROCESSING}
COMPLETABLE = {SalesOrder.Status.CONFIRMED, SalesOrder.Status.PROCESSING}


def create_sales_order(
    *,
    warehouse,
    customer_name,
    items,
    user,
    customer_email="",
    customer_phone="",
    discount_amount=Decimal("0.00"),
    tax_rate=Decimal("0.00"),
    notes="",
    idempotency_key=None,
    request=None,
):
    replay = _existing_order(idempotency_key, user)
    if replay is not None:
        return replay, False
    _validate_warehouse(warehouse)
    items = _validate_lines(items)
    _validate_money(discount_amount, tax_rate)
    try:
        with transaction.atomic():
            order = SalesOrder.objects.create(
                number=allocate_number(ORDER_PREFIX),
                warehouse=warehouse,
                customer_name=customer_name,
                customer_email=customer_email,
                customer_phone=customer_phone,
                discount_amount=discount_amount,
                tax_rate=tax_rate,
                notes=notes,
                idempotency_key=idempotency_key or None,
                created_by=user,
            )
            _replace_lines(order, items)
            _store_totals(order, discount_amount, tax_rate)
            log_audit(
                user=user,
                action=AuditLog.Action.CREATE,
                instance=order,
                metadata={"number": order.number, "total": str(order.total)},
                request=request,
            )
    except IntegrityError:
        replay = _existing_order(idempotency_key, user)
        if replay is not None:
            return replay, False
        raise
    return _order_queryset().get(pk=order.pk), True


def update_sales_order(*, order, user, changes, request=None):
    with transaction.atomic():
        order = SalesOrder.objects.select_for_update().get(pk=order.pk)
        if order.status != SalesOrder.Status.DRAFT:
            raise BusinessRuleError("Only a draft sales order can be edited.")
        if "warehouse" in changes:
            _validate_warehouse(changes["warehouse"])
            order.warehouse = changes["warehouse"]
        if "customer_name" in changes:
            order.customer_name = changes["customer_name"]
        if "customer_email" in changes:
            order.customer_email = changes["customer_email"]
        if "customer_phone" in changes:
            order.customer_phone = changes["customer_phone"]
        if "notes" in changes:
            order.notes = changes["notes"]
        discount = changes.get("discount_amount", order.discount_amount)
        tax_rate = changes.get("tax_rate", order.tax_rate)
        _validate_money(discount, tax_rate)
        order.discount_amount = discount
        order.tax_rate = tax_rate
        order.save()
        if "items" in changes:
            changes["items"] = _validate_lines(changes["items"])
            _replace_lines(order, changes["items"])
        _store_totals(order, discount, tax_rate)
        log_audit(
            user=user,
            action=AuditLog.Action.UPDATE,
            instance=order,
            metadata={"number": order.number, "total": str(order.total)},
            request=request,
        )
    return _order_queryset().get(pk=order.pk)


def update_payment_status(*, order, user, payment_status, request=None):
    with transaction.atomic():
        order = SalesOrder.objects.select_for_update().get(pk=order.pk)
        previous = order.payment_status
        order.payment_status = payment_status
        order.save(update_fields=["payment_status", "updated_at"])
        if previous != payment_status:
            log_audit(
                user=user,
                action=AuditLog.Action.UPDATE,
                instance=order,
                metadata={"number": order.number, "payment_status": payment_status},
                request=request,
            )
    return _order_queryset().get(pk=order.pk)


def confirm_sales_order(*, order, user, request=None):
    with transaction.atomic():
        order = SalesOrder.objects.select_for_update().select_related("warehouse").get(pk=order.pk)
        if order.status != SalesOrder.Status.DRAFT:
            raise BusinessRuleError("Only a draft sales order can be confirmed.")
        if not order.warehouse.is_active:
            raise ValidationError({"warehouse": "Choose an active warehouse."})
        lines = list(order.items.select_related("product"))
        if not lines:
            raise ValidationError({"items": "Add at least one line."})
        reserve_stock(
            warehouse=order.warehouse,
            lines=[{"product": line.product, "quantity": line.quantity} for line in lines],
        )
        previous = order.status
        order.status = SalesOrder.Status.CONFIRMED
        order.confirmed_at = timezone.now()
        order.save(update_fields=["status", "confirmed_at", "updated_at"])
        _audit_status(order, user, previous, request)
    return _order_queryset().get(pk=order.pk)


def process_sales_order(*, order, user, request=None):
    with transaction.atomic():
        order = SalesOrder.objects.select_for_update().get(pk=order.pk)
        if order.status != SalesOrder.Status.CONFIRMED:
            raise BusinessRuleError("Only a confirmed sales order can be processed.")
        previous = order.status
        order.status = SalesOrder.Status.PROCESSING
        order.save(update_fields=["status", "updated_at"])
        _audit_status(order, user, previous, request)
    return _order_queryset().get(pk=order.pk)


def complete_sales_order(*, order, user, request=None):
    with transaction.atomic():
        order = SalesOrder.objects.select_for_update().select_related("warehouse").get(pk=order.pk)
        if order.status not in COMPLETABLE:
            raise BusinessRuleError("Only a confirmed sales order can be completed.")
        lines = list(order.items.select_related("product"))
        post_sale(
            warehouse=order.warehouse,
            lines=[{"product": line.product, "quantity": line.quantity} for line in lines],
            user=user,
            reference_type="sales_order",
            reference_id=order.pk,
            reference_code=order.number,
            note=order.notes,
        )
        previous = order.status
        order.status = SalesOrder.Status.COMPLETED
        order.completed_at = timezone.now()
        order.save(update_fields=["status", "completed_at", "updated_at"])
        _audit_status(order, user, previous, request)
    return _order_queryset().get(pk=order.pk)


def cancel_sales_order(*, order, user, request=None):
    with transaction.atomic():
        order = SalesOrder.objects.select_for_update().select_related("warehouse").get(pk=order.pk)
        if order.status == SalesOrder.Status.COMPLETED:
            raise BusinessRuleError("A completed sales order cannot be cancelled.")
        if order.status == SalesOrder.Status.CANCELLED:
            raise BusinessRuleError("This sales order is already cancelled.")
        if order.status not in {SalesOrder.Status.DRAFT, *OPEN_RESERVATION}:
            raise BusinessRuleError("This sales order cannot be cancelled.")
        if order.status in OPEN_RESERVATION:
            lines = list(order.items.select_related("product"))
            release_reservation(
                warehouse=order.warehouse,
                lines=[{"product": line.product, "quantity": line.quantity} for line in lines],
            )
        previous = order.status
        order.status = SalesOrder.Status.CANCELLED
        order.save(update_fields=["status", "updated_at"])
        _audit_status(order, user, previous, request)
    return _order_queryset().get(pk=order.pk)


def create_sales_return(*, order, items, user, note="", idempotency_key=None, request=None):
    replay = _existing_return(idempotency_key, user)
    if replay is not None:
        return replay, False
    try:
        with transaction.atomic():
            document = _post_return(
                order=order,
                items=items,
                user=user,
                note=note,
                idempotency_key=idempotency_key,
                request=request,
            )
    except IntegrityError:
        replay = _existing_return(idempotency_key, user)
        if replay is not None:
            return replay, False
        raise
    return document, True


def _post_return(*, order, items, user, note, idempotency_key, request):
    order = SalesOrder.objects.select_for_update().select_related("warehouse").get(pk=order.pk)
    if order.status != SalesOrder.Status.COMPLETED:
        raise BusinessRuleError("Only a completed sales order can be returned.")
    if not items:
        raise ValidationError({"items": "Add at least one line."})
    locked_lines = {
        line.pk: line for line in order.items.select_related("product").select_for_update().order_by("product_id")
    }
    item_ids = [item["item_id"] for item in items]
    if len(item_ids) != len(set(item_ids)):
        raise ValidationError({"items": "Each line can appear only once."})

    accepted = []
    for item in items:
        line = locked_lines.get(item["item_id"])
        if line is None:
            raise ValidationError({"items": "Each line must belong to this sales order."})
        if item["quantity"] <= 0:
            raise ValidationError({"items": "Quantity must be greater than zero."})
        already = line.return_items.aggregate(total=Sum("quantity"))["total"] or Decimal("0")
        remaining = line.quantity - already
        if item["quantity"] > remaining:
            raise BusinessRuleError(f"Return quantity exceeds the remaining quantity for {line.product.sku}.")
        accepted.append((line, item["quantity"]))

    document = SalesReturn.objects.create(
        number=allocate_number(RETURN_PREFIX),
        sales_order=order,
        created_by=user,
        note=note,
        idempotency_key=idempotency_key or None,
    )
    movements = post_stock_increase(
        warehouse=order.warehouse,
        lines=[{"product": line.product, "quantity": quantity} for line, quantity in accepted],
        user=user,
        transaction_type=InventoryTransaction.Type.RETURN,
        reference_type="sales_return",
        reference_id=document.pk,
        reference_code=document.number,
        note=note,
    )
    by_product = {movement.product_id: movement for movement in movements}
    for line, quantity in accepted:
        SalesReturnItem.objects.create(
            sales_return=document,
            sales_order_item=line,
            product=line.product,
            quantity=quantity,
            transaction=by_product[line.product_id],
        )
    log_audit(
        user=user,
        action=AuditLog.Action.CREATE,
        instance=document,
        metadata={
            "number": document.number,
            "sales_order": order.number,
            "lines": [{"product_id": line.product_id, "quantity": str(quantity)} for line, quantity in accepted],
        },
        request=request,
    )
    return _return_queryset().get(pk=document.pk)


def _validate_warehouse(warehouse):
    if not warehouse.is_active:
        raise ValidationError({"warehouse": "Choose an active warehouse."})


def _validate_lines(items):
    if not items:
        raise ValidationError({"items": "Add at least one line."})
    product_ids = [item["product"].pk for item in items]
    if len(product_ids) != len(set(product_ids)):
        raise ValidationError({"items": "Each product can appear only once."})
    prepared = []
    for item in items:
        product = item["product"]
        if not product.is_active:
            raise ValidationError({"items": f"{product.sku} is inactive."})
        if item["quantity"] <= 0:
            raise ValidationError({"items": "Quantity must be greater than zero."})
        unit_price = item["unit_price"] if item.get("unit_price") is not None else product.selling_price
        if unit_price < 0:
            raise ValidationError({"items": "Unit price cannot be negative."})
        prepared.append({"product": product, "quantity": item["quantity"], "unit_price": unit_price})
    return prepared


def _validate_money(discount_amount, tax_rate):
    if discount_amount < 0:
        raise ValidationError({"discount_amount": "Discount cannot be negative."})
    if tax_rate < 0:
        raise ValidationError({"tax_rate": "Tax rate cannot be negative."})


def _replace_lines(order, items):
    order.items.all().delete()
    for item in sorted(items, key=lambda row: row["product"].pk):
        unit_price = item["unit_price"]
        amount = (item["quantity"] * unit_price).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
        SalesOrderItem.objects.create(
            sales_order=order,
            product=item["product"],
            quantity=item["quantity"],
            unit_price=unit_price,
            line_total=amount,
        )


def _store_totals(order, discount_amount, tax_rate):
    subtotal = sum((item.line_total for item in order.items.all()), Decimal("0.00"))
    if discount_amount > subtotal:
        raise ValidationError({"discount_amount": "Discount cannot exceed the subtotal."})
    taxable = subtotal - discount_amount
    tax_amount = (taxable * tax_rate / Decimal("100")).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
    order.subtotal = subtotal
    order.discount_amount = discount_amount
    order.tax_rate = tax_rate
    order.tax_amount = tax_amount
    order.total = taxable + tax_amount
    order.save(update_fields=["subtotal", "discount_amount", "tax_rate", "tax_amount", "total", "updated_at"])


def _audit_status(order, user, previous, request):
    log_audit(
        user=user,
        action=AuditLog.Action.STATUS_CHANGE,
        instance=order,
        metadata={"number": order.number, "from": previous, "to": order.status},
        request=request,
    )


def _existing_order(idempotency_key, user):
    if not idempotency_key:
        return None
    existing = _order_queryset().filter(idempotency_key=idempotency_key).first()
    if existing is None:
        return None
    if existing.created_by_id != user.pk:
        raise Conflict()
    return existing


def _existing_return(idempotency_key, user):
    if not idempotency_key:
        return None
    existing = _return_queryset().filter(idempotency_key=idempotency_key).first()
    if existing is None:
        return None
    if existing.created_by_id != user.pk:
        raise Conflict()
    return existing


def _order_queryset():
    return SalesOrder.objects.select_related("warehouse", "created_by").prefetch_related(
        "items__product",
        "items__return_items",
    )


def _return_queryset():
    return SalesReturn.objects.select_related("sales_order", "sales_order__warehouse", "created_by").prefetch_related(
        "items__product"
    )
