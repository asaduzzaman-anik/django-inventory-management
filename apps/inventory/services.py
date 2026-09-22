from decimal import Decimal

from django.db import IntegrityError, transaction
from django.db.models import Case, CharField, DecimalField, ExpressionWrapper, F, Q, Value, When
from django.db.models.functions import Coalesce
from rest_framework.exceptions import APIException, ValidationError

from apps.audit.models import AuditLog
from apps.audit.services import log_audit
from apps.inventory.models import DocumentSequence, InventoryTransaction, StockLevel, StockReceipt, StockReceiptItem

RECEIPT_PREFIX = "RCP"


class Conflict(APIException):
    status_code = 409
    default_detail = "This idempotency key was already used."
    default_code = "conflict"


def stock_queryset():
    available = ExpressionWrapper(
        F("on_hand") - F("reserved"),
        output_field=DecimalField(max_digits=12, decimal_places=3),
    )
    annotated = StockLevel.objects.select_related("product", "product__category", "warehouse").annotate(
        available=available,
        effective_reorder_level=Coalesce("reorder_level", "product__reorder_level"),
    )
    return annotated.annotate(
        status=Case(
            When(available__lte=0, then=Value("OUT")),
            When(
                Q(available__gt=0)
                & Q(effective_reorder_level__gt=0)
                & Q(available__lte=F("effective_reorder_level")),
                then=Value("LOW"),
            ),
            default=Value("IN_STOCK"),
            output_field=CharField(),
        )
    )


def receive_stock(*, warehouse, items, user, note="", idempotency_key=None, request=None):
    replay = _existing_receipt(idempotency_key, user)
    if replay is not None:
        return replay, False

    _validate_receipt(warehouse, items)
    try:
        with transaction.atomic():
            receipt = _post_receipt(
                warehouse=warehouse,
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


def _validate_receipt(warehouse, items):
    if not warehouse.is_active:
        raise ValidationError({"warehouse": "Choose an active warehouse."})
    if not items:
        raise ValidationError({"items": "Add at least one line."})

    product_ids = [item["product"].pk for item in items]
    if len(product_ids) != len(set(product_ids)):
        raise ValidationError({"items": "Each product can appear only once."})

    for item in items:
        product = item["product"]
        if not product.is_active:
            raise ValidationError({"items": f"{product.sku} is inactive."})
        if item["quantity"] <= 0:
            raise ValidationError({"items": "Quantity must be greater than zero."})
        if item["unit_cost"] < 0:
            raise ValidationError({"items": "Unit cost cannot be negative."})


def _post_receipt(*, warehouse, items, user, note, idempotency_key, request):
    number = _next_number(RECEIPT_PREFIX)
    ordered_items = sorted(items, key=lambda item: item["product"].pk)
    for item in ordered_items:
        _get_or_lock_stock(item["product"], warehouse)

    receipt = StockReceipt.objects.create(
        number=number,
        warehouse=warehouse,
        note=note,
        idempotency_key=idempotency_key or None,
        created_by=user,
    )
    product_ids = [item["product"].pk for item in ordered_items]
    locked = {
        stock.product_id: stock
        for stock in StockLevel.objects.select_for_update()
        .filter(warehouse=warehouse, product_id__in=product_ids)
        .order_by("pk")
    }

    for item in ordered_items:
        stock = locked[item["product"].pk]
        stock.on_hand = stock.on_hand + item["quantity"]
        stock.save(update_fields=["on_hand", "updated_at"])
        movement = InventoryTransaction.objects.create(
            product=item["product"],
            warehouse=warehouse,
            transaction_type=InventoryTransaction.Type.RECEIPT,
            quantity_change=item["quantity"],
            balance_after=stock.on_hand,
            unit_cost=item["unit_cost"],
            reference_type="stock_receipt",
            reference_id=receipt.pk,
            reference_code=receipt.number,
            note=(note or "")[:255],
            created_by=user,
        )
        StockReceiptItem.objects.create(
            receipt=receipt,
            product=item["product"],
            quantity=item["quantity"],
            unit_cost=item["unit_cost"],
            transaction=movement,
        )

    log_audit(
        user=user,
        action=AuditLog.Action.RECEIVE,
        instance=receipt,
        metadata={
            "number": receipt.number,
            "warehouse_id": warehouse.pk,
            "lines": [
                {"product_id": item["product"].pk, "quantity": str(item["quantity"])}
                for item in ordered_items
            ],
        },
        request=request,
    )
    return _receipt_with_lines(receipt.pk)


def _get_or_lock_stock(product, warehouse):
    stock = StockLevel.objects.select_for_update().filter(product=product, warehouse=warehouse).first()
    if stock is not None:
        return stock
    try:
        with transaction.atomic():
            stock = StockLevel.objects.create(
                product=product,
                warehouse=warehouse,
                on_hand=Decimal("0.000"),
                reserved=Decimal("0.000"),
            )
    except IntegrityError:
        stock = StockLevel.objects.select_for_update().get(product=product, warehouse=warehouse)
    else:
        stock = StockLevel.objects.select_for_update().get(pk=stock.pk)
    return stock


def _next_number(prefix):
    try:
        with transaction.atomic():
            DocumentSequence.objects.create(prefix=prefix, last_value=0)
    except IntegrityError:
        pass
    sequence = DocumentSequence.objects.select_for_update().get(prefix=prefix)
    sequence.last_value += 1
    sequence.save(update_fields=["last_value"])
    return f"{prefix}-{sequence.last_value:06d}"


def _existing_receipt(idempotency_key, user):
    if not idempotency_key:
        return None
    existing = _receipt_queryset().filter(idempotency_key=idempotency_key).first()
    if existing is None:
        return None
    if existing.created_by_id != user.pk:
        raise Conflict()
    return existing


def _receipt_with_lines(receipt_id):
    return _receipt_queryset().get(pk=receipt_id)


def _receipt_queryset():
    return StockReceipt.objects.select_related("warehouse", "created_by").prefetch_related(
        "items__product",
        "items__transaction",
    )
