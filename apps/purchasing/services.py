from decimal import Decimal, ROUND_HALF_UP

from django.db import IntegrityError, transaction
from django.utils import timezone
from rest_framework.exceptions import ValidationError

from apps.audit.models import AuditLog
from apps.audit.services import log_audit
from apps.inventory.models import InventoryTransaction
from apps.inventory.services import (
    BusinessRuleError,
    Conflict,
    allocate_number,
    post_stock_increase,
)
from apps.purchasing.models import PurchaseOrder, PurchaseOrderItem, PurchaseReceipt, PurchaseReceiptItem

PO_PREFIX = "PO"
RECEIPT_PREFIX = "PRC"
CANCELLABLE = {
    PurchaseOrder.Status.DRAFT,
    PurchaseOrder.Status.SUBMITTED,
    PurchaseOrder.Status.APPROVED,
}
RECEIVABLE = {
    PurchaseOrder.Status.APPROVED,
    PurchaseOrder.Status.PARTIALLY_RECEIVED,
}


def notify_purchase_event(order_id, event):
    """Called after commit. Later notification code can use this without joining the stock transaction."""
    return None


def create_purchase_order(*, supplier, warehouse, items, user, notes="", request=None):
    _validate_parties(supplier, warehouse)
    _validate_new_lines(items)
    with transaction.atomic():
        order = PurchaseOrder.objects.create(
            number=allocate_number(PO_PREFIX),
            supplier=supplier,
            warehouse=warehouse,
            notes=notes,
            created_by=user,
        )
        _replace_lines(order, items)
        log_audit(
            user=user,
            action=AuditLog.Action.CREATE,
            instance=order,
            metadata={"number": order.number, "total": str(order.total)},
            request=request,
        )
    return _order_queryset().get(pk=order.pk)


def update_purchase_order(*, order, user, changes, request=None):
    with transaction.atomic():
        order = PurchaseOrder.objects.select_for_update().get(pk=order.pk)
        if order.status != PurchaseOrder.Status.DRAFT:
            raise BusinessRuleError("Only a draft purchase order can be edited.")
        if "supplier" in changes:
            order.supplier = changes["supplier"]
        if "warehouse" in changes:
            order.warehouse = changes["warehouse"]
        if "supplier" in changes or "warehouse" in changes:
            _validate_parties(order.supplier, order.warehouse)
        if "notes" in changes:
            order.notes = changes["notes"]
        order.save()
        if "items" in changes:
            _validate_new_lines(changes["items"])
            _replace_lines(order, changes["items"])
        log_audit(
            user=user,
            action=AuditLog.Action.UPDATE,
            instance=order,
            metadata={"number": order.number, "total": str(order.total), "status": order.status},
            request=request,
        )
    return _order_queryset().get(pk=order.pk)


def submit_purchase_order(*, order, user, request=None):
    with transaction.atomic():
        order = PurchaseOrder.objects.select_for_update().get(pk=order.pk)
        if order.status != PurchaseOrder.Status.DRAFT:
            raise BusinessRuleError("Only a draft purchase order can be submitted.")
        if not order.items.exists():
            raise BusinessRuleError("Add at least one line before submitting.")
        previous = order.status
        order.status = PurchaseOrder.Status.SUBMITTED
        order.submitted_at = timezone.now()
        order.save(update_fields=["status", "submitted_at", "updated_at"])
        _audit_status(order, user, previous, request)
        _schedule(order.pk, "submitted")
    return _order_queryset().get(pk=order.pk)


def approve_purchase_order(*, order, user, request=None):
    with transaction.atomic():
        order = PurchaseOrder.objects.select_for_update().get(pk=order.pk)
        if order.status != PurchaseOrder.Status.SUBMITTED:
            raise BusinessRuleError("Only a submitted purchase order can be approved.")
        previous = order.status
        order.status = PurchaseOrder.Status.APPROVED
        order.approved_by = user
        order.approved_at = timezone.now()
        order.save(update_fields=["status", "approved_by", "approved_at", "updated_at"])
        _audit_status(order, user, previous, request)
        _schedule(order.pk, "approved")
    return _order_queryset().get(pk=order.pk)


def cancel_purchase_order(*, order, user, request=None):
    with transaction.atomic():
        order = PurchaseOrder.objects.select_for_update().get(pk=order.pk)
        if order.status not in CANCELLABLE:
            raise BusinessRuleError("This purchase order cannot be cancelled.")
        if order.items.filter(quantity_received__gt=0).exists():
            raise BusinessRuleError("A purchase order with received stock cannot be cancelled.")
        previous = order.status
        order.status = PurchaseOrder.Status.CANCELLED
        order.save(update_fields=["status", "updated_at"])
        _audit_status(order, user, previous, request)
        _schedule(order.pk, "cancelled")
    return _order_queryset().get(pk=order.pk)


def receive_purchase_order(*, order, items, user, note="", idempotency_key=None, request=None):
    replay = _existing_receipt(idempotency_key, user)
    if replay is not None:
        return replay, False
    try:
        with transaction.atomic():
            receipt = _post_receipt(
                order=order,
                items=items,
                user=user,
                note=note,
                idempotency_key=idempotency_key,
                request=request,
            )
    except IntegrityError:
        replay = _existing_receipt(idempotency_key, user)
        if replay is not None:
            return replay, False
        raise
    return receipt, True


def _post_receipt(*, order, items, user, note, idempotency_key, request):
    order = PurchaseOrder.objects.select_for_update().select_related("warehouse").get(pk=order.pk)
    if order.status not in RECEIVABLE:
        raise BusinessRuleError("Only an approved purchase order can be received.")
    if not order.warehouse.is_active:
        raise ValidationError({"warehouse": "Choose an active warehouse."})
    if not items:
        raise ValidationError({"items": "Add at least one line."})

    locked_lines = {line.pk: line for line in order.items.select_for_update().select_related("product").order_by("pk")}
    item_ids = [item["item_id"] for item in items]
    if len(item_ids) != len(set(item_ids)):
        raise ValidationError({"items": "Each line can appear only once."})

    accepted = []
    for item in items:
        line = locked_lines.get(item["item_id"])
        if line is None:
            raise ValidationError({"items": "Each line must belong to this purchase order."})
        if item["quantity"] <= 0:
            raise ValidationError({"items": "Quantity must be greater than zero."})
        remaining = line.quantity_ordered - line.quantity_received
        if item["quantity"] > remaining:
            raise BusinessRuleError(f"Receive quantity exceeds the remaining quantity for {line.product.sku}.")
        accepted.append((line, item["quantity"]))

    receipt = PurchaseReceipt.objects.create(
        number=allocate_number(RECEIPT_PREFIX),
        purchase_order=order,
        received_by=user,
        note=note,
        idempotency_key=idempotency_key or None,
    )
    for line, quantity in accepted:
        line.quantity_received = line.quantity_received + quantity
        line.save(update_fields=["quantity_received"])

    movements = post_stock_increase(
        warehouse=order.warehouse,
        lines=[
            {"product": line.product, "quantity": quantity, "unit_cost": line.unit_cost}
            for line, quantity in accepted
        ],
        user=user,
        transaction_type=InventoryTransaction.Type.PURCHASE,
        reference_type="purchase_receipt",
        reference_id=receipt.pk,
        reference_code=receipt.number,
        note=note,
    )
    by_product = {movement.product_id: movement for movement in movements}
    for line, quantity in accepted:
        PurchaseReceiptItem.objects.create(
            receipt=receipt,
            purchase_order_item=line,
            product=line.product,
            quantity=quantity,
            transaction=by_product[line.product_id],
        )

    previous = order.status
    if all(line.quantity_received == line.quantity_ordered for line in locked_lines.values()):
        order.status = PurchaseOrder.Status.RECEIVED
    else:
        order.status = PurchaseOrder.Status.PARTIALLY_RECEIVED
    order.save(update_fields=["status", "updated_at"])
    log_audit(
        user=user,
        action=AuditLog.Action.RECEIVE,
        instance=receipt,
        metadata={
            "number": receipt.number,
            "purchase_order": order.number,
            "status": order.status,
            "lines": [
                {"product_id": line.product_id, "quantity": str(quantity)} for line, quantity in accepted
            ],
        },
        request=request,
    )
    _audit_status(order, user, previous, request)
    _schedule(order.pk, "received")
    return _receipt_queryset().get(pk=receipt.pk)


def _validate_parties(supplier, warehouse):
    if not supplier.is_active:
        raise ValidationError({"supplier": "Choose an active supplier."})
    if not warehouse.is_active:
        raise ValidationError({"warehouse": "Choose an active warehouse."})


def _validate_new_lines(items):
    if not items:
        raise ValidationError({"items": "Add at least one line."})
    product_ids = [item["product"].pk for item in items]
    if len(product_ids) != len(set(product_ids)):
        raise ValidationError({"items": "Each product can appear only once."})
    for item in items:
        product = item["product"]
        if not product.is_active:
            raise ValidationError({"items": f"{product.sku} is inactive."})
        if item["quantity_ordered"] <= 0:
            raise ValidationError({"items": "Quantity must be greater than zero."})
        if item["unit_cost"] < 0:
            raise ValidationError({"items": "Unit cost cannot be negative."})


def _replace_lines(order, items):
    order.items.all().delete()
    total = Decimal("0.00")
    for item in sorted(items, key=lambda row: row["product"].pk):
        amount = (item["quantity_ordered"] * item["unit_cost"]).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
        PurchaseOrderItem.objects.create(
            purchase_order=order,
            product=item["product"],
            quantity_ordered=item["quantity_ordered"],
            quantity_received=Decimal("0.000"),
            unit_cost=item["unit_cost"],
            line_total=amount,
        )
        total += amount
    order.total = total
    order.save(update_fields=["total", "updated_at"])


def _audit_status(order, user, previous, request):
    log_audit(
        user=user,
        action=AuditLog.Action.STATUS_CHANGE,
        instance=order,
        metadata={"number": order.number, "from": previous, "to": order.status},
        request=request,
    )


def _schedule(order_id, event):
    transaction.on_commit(lambda order_id=order_id, event=event: notify_purchase_event(order_id, event))


def _existing_receipt(idempotency_key, user):
    if not idempotency_key:
        return None
    existing = _receipt_queryset().filter(idempotency_key=idempotency_key).first()
    if existing is None:
        return None
    if existing.received_by_id != user.pk:
        raise Conflict()
    return existing


def _order_queryset():
    return PurchaseOrder.objects.select_related("supplier", "warehouse", "created_by", "approved_by").prefetch_related(
        "items__product"
    )


def _receipt_queryset():
    return PurchaseReceipt.objects.select_related(
        "purchase_order",
        "purchase_order__warehouse",
        "received_by",
    ).prefetch_related("items__product")
