from decimal import Decimal

from django.db import IntegrityError, transaction
from django.db.models import Case, CharField, DecimalField, ExpressionWrapper, F, Q, Value, When
from django.db.models.functions import Coalesce
from rest_framework.exceptions import APIException, ValidationError

from apps.audit.models import AuditLog
from apps.audit.services import log_audit
from apps.inventory.models import (
    DocumentSequence,
    InventoryTransaction,
    StockAdjustment,
    StockLevel,
    StockReceipt,
    StockReceiptItem,
    StockTransfer,
    StockTransferItem,
)

RECEIPT_PREFIX = "RCP"
TRANSFER_PREFIX = "TRF"
ADJUSTMENT_PREFIX = "ADJ"
OUTBOUND_REASONS = {
    StockAdjustment.Reason.DAMAGED,
    StockAdjustment.Reason.LOST,
    StockAdjustment.Reason.EXPIRED,
}


class Conflict(APIException):
    status_code = 409
    default_detail = "This idempotency key was already used."
    default_code = "conflict"


class BusinessRuleError(APIException):
    status_code = 409
    default_detail = "The request conflicts with the current stock."
    default_code = "business_rule"


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


def transfer_stock(*, source, destination, items, user, note="", idempotency_key=None, request=None):
    replay = _existing_document(_transfer_queryset(), idempotency_key, user)
    if replay is not None:
        return replay, False

    _validate_transfer(source, destination, items)
    try:
        with transaction.atomic():
            document = _post_transfer(
                source=source,
                destination=destination,
                items=items,
                user=user,
                note=note,
                idempotency_key=idempotency_key,
                request=request,
            )
    except IntegrityError:
        replay = _existing_document(_transfer_queryset(), idempotency_key, user)
        if replay is not None:
            return replay, False
        raise
    return document, True


def adjust_stock(*, warehouse, product, quantity_change, reason, user, note="", idempotency_key=None, request=None):
    replay = _existing_document(_adjustment_queryset(), idempotency_key, user)
    if replay is not None:
        return replay, False

    _validate_adjustment(warehouse, product, quantity_change, reason, note)
    try:
        with transaction.atomic():
            document = _post_adjustment(
                warehouse=warehouse,
                product=product,
                quantity_change=quantity_change,
                reason=reason,
                user=user,
                note=note,
                idempotency_key=idempotency_key,
                request=request,
            )
    except IntegrityError:
        replay = _existing_document(_adjustment_queryset(), idempotency_key, user)
        if replay is not None:
            return replay, False
        raise
    return document, True


def _validate_transfer(source, destination, items):
    if source.pk == destination.pk:
        raise ValidationError({"destination_warehouse": "Source and destination must be different warehouses."})
    if not source.is_active or not destination.is_active:
        raise ValidationError({"warehouse": "Choose active warehouses."})
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


def _post_transfer(*, source, destination, items, user, note, idempotency_key, request):
    number = _next_number(TRANSFER_PREFIX)
    ordered_items = sorted(items, key=lambda item: item["product"].pk)
    pairs = []
    for item in ordered_items:
        pairs.append((item["product"], source))
        pairs.append((item["product"], destination))
    locked = _lock_stock_rows(pairs)

    for item in ordered_items:
        stock = locked[(item["product"].pk, source.pk)]
        available = stock.on_hand - stock.reserved
        if available < item["quantity"]:
            raise BusinessRuleError(f"Insufficient available stock for {item['product'].sku}.")

    document = StockTransfer.objects.create(
        number=number,
        source_warehouse=source,
        destination_warehouse=destination,
        note=note,
        idempotency_key=idempotency_key or None,
        created_by=user,
    )
    for item in ordered_items:
        product = item["product"]
        quantity = item["quantity"]
        source_stock = locked[(product.pk, source.pk)]
        destination_stock = locked[(product.pk, destination.pk)]
        source_stock.on_hand = source_stock.on_hand - quantity
        source_stock.save(update_fields=["on_hand", "updated_at"])
        destination_stock.on_hand = destination_stock.on_hand + quantity
        destination_stock.save(update_fields=["on_hand", "updated_at"])
        movement_out = InventoryTransaction.objects.create(
            product=product,
            warehouse=source,
            transaction_type=InventoryTransaction.Type.TRANSFER_OUT,
            quantity_change=-quantity,
            balance_after=source_stock.on_hand,
            reference_type="stock_transfer",
            reference_id=document.pk,
            reference_code=document.number,
            note=(note or "")[:255],
            created_by=user,
        )
        movement_in = InventoryTransaction.objects.create(
            product=product,
            warehouse=destination,
            transaction_type=InventoryTransaction.Type.TRANSFER_IN,
            quantity_change=quantity,
            balance_after=destination_stock.on_hand,
            reference_type="stock_transfer",
            reference_id=document.pk,
            reference_code=document.number,
            note=(note or "")[:255],
            created_by=user,
        )
        StockTransferItem.objects.create(
            transfer=document,
            product=product,
            quantity=quantity,
            transaction_out=movement_out,
            transaction_in=movement_in,
        )

    log_audit(
        user=user,
        action=AuditLog.Action.TRANSFER,
        instance=document,
        metadata={
            "number": document.number,
            "source_warehouse_id": source.pk,
            "destination_warehouse_id": destination.pk,
            "lines": [
                {"product_id": item["product"].pk, "quantity": str(item["quantity"])} for item in ordered_items
            ],
        },
        request=request,
    )
    return _transfer_queryset().get(pk=document.pk)


def _validate_adjustment(warehouse, product, quantity_change, reason, note):
    if not warehouse.is_active:
        raise ValidationError({"warehouse": "Choose an active warehouse."})
    if not product.is_active:
        raise ValidationError({"product": f"{product.sku} is inactive."})
    if quantity_change == 0:
        raise ValidationError({"quantity_change": "Quantity change cannot be zero."})
    if reason == StockAdjustment.Reason.FOUND and quantity_change < 0:
        raise ValidationError({"quantity_change": "Found stock must increase on-hand."})
    if reason in OUTBOUND_REASONS and quantity_change > 0:
        raise ValidationError({"quantity_change": "This reason must decrease on-hand."})
    if reason == StockAdjustment.Reason.OTHER and not (note or "").strip():
        raise ValidationError({"note": "A note is required when the reason is OTHER."})


def _post_adjustment(*, warehouse, product, quantity_change, reason, user, note, idempotency_key, request):
    number = _next_number(ADJUSTMENT_PREFIX)
    locked = _lock_stock_rows([(product, warehouse)])
    stock = locked[(product.pk, warehouse.pk)]
    new_on_hand = stock.on_hand + quantity_change
    if new_on_hand < stock.reserved:
        raise BusinessRuleError("Adjustment would drop on-hand below reserved stock.")

    stock.on_hand = new_on_hand
    stock.save(update_fields=["on_hand", "updated_at"])
    transaction_type = (
        InventoryTransaction.Type.ADJUSTMENT_IN if quantity_change > 0 else InventoryTransaction.Type.ADJUSTMENT_OUT
    )
    document = StockAdjustment.objects.create(
        number=number,
        warehouse=warehouse,
        product=product,
        quantity_change=quantity_change,
        reason=reason,
        note=note,
        idempotency_key=idempotency_key or None,
        created_by=user,
    )
    movement = InventoryTransaction.objects.create(
        product=product,
        warehouse=warehouse,
        transaction_type=transaction_type,
        quantity_change=quantity_change,
        balance_after=stock.on_hand,
        reference_type="stock_adjustment",
        reference_id=document.pk,
        reference_code=document.number,
        note=(note or "")[:255],
        created_by=user,
    )
    document.transaction = movement
    document.save(update_fields=["transaction"])

    log_audit(
        user=user,
        action=AuditLog.Action.ADJUST,
        instance=document,
        metadata={
            "number": document.number,
            "warehouse_id": warehouse.pk,
            "product_id": product.pk,
            "quantity_change": str(quantity_change),
            "reason": reason,
        },
        request=request,
    )
    return _adjustment_queryset().get(pk=document.pk)


def _lock_stock_rows(pairs):
    ensured = [_ensure_stock(product, warehouse) for product, warehouse in pairs]
    locked = StockLevel.objects.select_for_update().filter(pk__in=[stock.pk for stock in ensured]).order_by("pk")
    return {(stock.product_id, stock.warehouse_id): stock for stock in locked}


def _ensure_stock(product, warehouse):
    stock = StockLevel.objects.filter(product=product, warehouse=warehouse).first()
    if stock is not None:
        return stock
    try:
        with transaction.atomic():
            return StockLevel.objects.create(
                product=product,
                warehouse=warehouse,
                on_hand=Decimal("0.000"),
                reserved=Decimal("0.000"),
            )
    except IntegrityError:
        return StockLevel.objects.get(product=product, warehouse=warehouse)


def _existing_document(queryset, idempotency_key, user):
    if not idempotency_key:
        return None
    existing = queryset.filter(idempotency_key=idempotency_key).first()
    if existing is None:
        return None
    if existing.created_by_id != user.pk:
        raise Conflict()
    return existing


def _transfer_queryset():
    return StockTransfer.objects.select_related(
        "source_warehouse",
        "destination_warehouse",
        "created_by",
    ).prefetch_related("items__product")


def _adjustment_queryset():
    return StockAdjustment.objects.select_related("warehouse", "product", "created_by", "transaction")
