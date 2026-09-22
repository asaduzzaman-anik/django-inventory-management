from datetime import datetime, time, timedelta
from decimal import Decimal

from django.core.cache import cache
from django.db.models import DecimalField, ExpressionWrapper, F, Sum
from django.db.models.functions import TruncDate
from django.utils import timezone
from django.utils.dateparse import parse_date, parse_datetime
from rest_framework.exceptions import ValidationError

from apps.catalog.models import Product
from apps.common.scoping import visible_warehouses
from apps.inventory.models import InventoryTransaction
from apps.inventory.services import stock_queryset
from apps.purchasing.models import PurchaseOrder, PurchaseReceiptItem
from apps.sales.models import SalesOrder, SalesOrderItem

DASHBOARD_VERSION_KEY = "dashboard-version"
DASHBOARD_TIMEOUT = 60

INVENTORY_COLUMNS = [
    ("sku", "SKU"),
    ("product_name", "Product"),
    ("warehouse_code", "Warehouse"),
    ("on_hand", "On hand"),
    ("reserved", "Reserved"),
    ("available", "Available"),
    ("status", "Status"),
    ("cost_price", "Cost"),
    ("value", "Value"),
]
MOVEMENT_COLUMNS = [
    ("created_at", "Created"),
    ("transaction_type", "Type"),
    ("sku", "SKU"),
    ("warehouse_code", "Warehouse"),
    ("quantity_change", "Quantity"),
    ("balance_after", "Balance"),
    ("reference_code", "Reference"),
]
PURCHASE_COLUMNS = [
    ("received_at", "Received"),
    ("number", "Receipt"),
    ("purchase_order", "Purchase order"),
    ("supplier", "Supplier"),
    ("warehouse_code", "Warehouse"),
    ("sku", "SKU"),
    ("quantity", "Quantity"),
    ("unit_cost", "Unit cost"),
    ("line_total", "Line total"),
]
SALES_COLUMNS = [
    ("completed_at", "Completed"),
    ("number", "Order"),
    ("customer_name", "Customer"),
    ("warehouse_code", "Warehouse"),
    ("sku", "SKU"),
    ("quantity", "Quantity"),
    ("unit_price", "Unit price"),
    ("line_total", "Line total"),
]
WAREHOUSE_COLUMNS = [
    ("code", "Code"),
    ("name", "Name"),
    ("on_hand", "On hand"),
    ("inventory_value", "Inventory value"),
    ("low_stock", "Low stock"),
    ("out_of_stock", "Out of stock"),
]
PERFORMANCE_COLUMNS = [
    ("sku", "SKU"),
    ("product_name", "Product"),
    ("quantity_sold", "Quantity sold"),
    ("revenue", "Revenue"),
]

REPORTS = {}


def invalidate_dashboard_cache():
    if cache.get(DASHBOARD_VERSION_KEY) is None:
        cache.set(DASHBOARD_VERSION_KEY, 1, timeout=None)
        return
    try:
        cache.incr(DASHBOARD_VERSION_KEY)
    except ValueError:
        cache.set(DASHBOARD_VERSION_KEY, 1, timeout=None)


def get_dashboard(user):
    version = cache.get(DASHBOARD_VERSION_KEY, 0)
    key = f"dashboard:{version}:{user.pk}"
    cached = cache.get(key)
    if cached is not None:
        return cached
    payload = _build_dashboard(user)
    cache.set(key, payload, timeout=DASHBOARD_TIMEOUT)
    return payload


def report_rows(name, user, params):
    builder = REPORTS.get(name)
    if builder is None:
        return None
    return builder(user, params)


def _build_dashboard(user):
    since = timezone.now() - timedelta(days=30)
    stock = _scoped_stock(user)
    low = stock.filter(status="LOW").count()
    out = stock.filter(status="OUT").count()
    warehouses = visible_warehouses(user)
    movements = _movements(user).filter(created_at__gte=since)
    return {
        "products": Product.objects.filter(is_active=True).count(),
        "warehouses": warehouses.count(),
        "low_stock": low,
        "out_of_stock": out,
        "inventory_value": money(_inventory_value(stock)),
        "purchase_total_30_days": money(_purchase_total(user, since, timezone.now())),
        "sales_total_30_days": money(_sales_total(user, since, timezone.now())),
        "stock_value_by_warehouse": _value_by_warehouse(stock),
        "daily_movements": _daily_movements(movements),
        "recent_transactions": _recent_transactions(user),
        "recent_purchase_orders": _recent_purchase_orders(user),
        "recent_sales": _recent_sales(user),
    }


def inventory_rows(user, params):
    return [_stock_row(stock) for stock in _filter_stock(_scoped_stock(user), params)]


def low_stock_rows(user, params):
    stock = _scoped_stock(user).filter(status__in=["LOW", "OUT"])
    return [_stock_row(row) for row in _filter_stock(stock, params)]


def movement_rows(user, params):
    start, end = _require_range(params)
    return movement_rows_between(
        user,
        start,
        end,
        warehouse=params.get("warehouse"),
        product=params.get("product"),
        category=params.get("category"),
        transaction_type=params.get("transaction_type") or params.get("type"),
    )


def movement_rows_between(user, start, end, warehouse=None, product=None, category=None, transaction_type=None):
    queryset = _movements(user).filter(created_at__gte=start, created_at__lte=end)
    if warehouse:
        queryset = queryset.filter(warehouse_id=warehouse)
    if product:
        queryset = queryset.filter(product_id=product)
    if category:
        queryset = queryset.filter(product__category_id=category)
    if transaction_type:
        queryset = queryset.filter(transaction_type=transaction_type)
    return [
        {
            "created_at": stamp(row.created_at),
            "transaction_type": row.transaction_type,
            "sku": row.product.sku,
            "warehouse_code": row.warehouse.code,
            "quantity_change": qty(row.quantity_change),
            "balance_after": qty(row.balance_after),
            "reference_code": row.reference_code,
        }
        for row in queryset.select_related("product", "warehouse")
    ]


def purchase_rows(user, params):
    start, end = _require_range(params)
    queryset = PurchaseReceiptItem.objects.select_related(
        "receipt",
        "receipt__purchase_order",
        "receipt__purchase_order__supplier",
        "receipt__purchase_order__warehouse",
        "product",
        "purchase_order_item",
    ).filter(
        receipt__purchase_order__warehouse__in=_warehouses(user),
        receipt__received_at__gte=start,
        receipt__received_at__lte=end,
    )
    if params.get("warehouse"):
        queryset = queryset.filter(receipt__purchase_order__warehouse_id=params["warehouse"])
    if params.get("supplier"):
        queryset = queryset.filter(receipt__purchase_order__supplier_id=params["supplier"])
    rows = []
    for item in queryset.order_by("-receipt__received_at"):
        rows.append(
            {
                "received_at": stamp(item.receipt.received_at),
                "number": item.receipt.number,
                "purchase_order": item.receipt.purchase_order.number,
                "supplier": item.receipt.purchase_order.supplier.code,
                "warehouse_code": item.receipt.purchase_order.warehouse.code,
                "sku": item.product.sku,
                "quantity": qty(item.quantity),
                "unit_cost": money(item.purchase_order_item.unit_cost),
                "line_total": money(item.quantity * item.purchase_order_item.unit_cost),
            }
        )
    return rows


def sales_rows(user, params):
    start, end = _require_range(params)
    queryset = _completed_lines(user).filter(
        sales_order__completed_at__gte=start,
        sales_order__completed_at__lte=end,
    )
    if params.get("warehouse"):
        queryset = queryset.filter(sales_order__warehouse_id=params["warehouse"])
    if params.get("product"):
        queryset = queryset.filter(product_id=params["product"])
    return [_sales_row(item) for item in queryset.order_by("-sales_order__completed_at")]


def warehouse_rows(user, params):
    stock = _scoped_stock(user)
    if params.get("warehouse"):
        stock = stock.filter(warehouse_id=params["warehouse"])
    grouped = {}
    for row in stock:
        bucket = grouped.setdefault(
            row.warehouse_id,
            {
                "code": row.warehouse.code,
                "name": row.warehouse.name,
                "on_hand": Decimal("0"),
                "inventory_value": Decimal("0"),
                "low_stock": 0,
                "out_of_stock": 0,
            },
        )
        bucket["on_hand"] += row.on_hand
        bucket["inventory_value"] += row.on_hand * row.product.cost_price
        if row.status == "LOW":
            bucket["low_stock"] += 1
        elif row.status == "OUT":
            bucket["out_of_stock"] += 1
    rows = []
    for bucket in grouped.values():
        rows.append(
            {
                "code": bucket["code"],
                "name": bucket["name"],
                "on_hand": qty(bucket["on_hand"]),
                "inventory_value": money(bucket["inventory_value"]),
                "low_stock": bucket["low_stock"],
                "out_of_stock": bucket["out_of_stock"],
            }
        )
    return sorted(rows, key=lambda row: row["code"])


def performance_rows(user, params):
    queryset = _completed_lines(user)
    if params.get("product"):
        queryset = queryset.filter(product_id=params["product"])
    if params.get("category"):
        queryset = queryset.filter(product__category_id=params["category"])
    totals = {}
    for item in queryset:
        bucket = totals.setdefault(
            item.product_id,
            {"sku": item.product.sku, "product_name": item.product.name, "quantity_sold": Decimal("0"), "revenue": Decimal("0")},
        )
        bucket["quantity_sold"] += item.quantity
        bucket["revenue"] += item.line_total
    return [
        {
            "sku": bucket["sku"],
            "product_name": bucket["product_name"],
            "quantity_sold": qty(bucket["quantity_sold"]),
            "revenue": money(bucket["revenue"]),
        }
        for bucket in sorted(totals.values(), key=lambda row: row["sku"])
    ]


REPORTS.update(
    {
        "inventory": inventory_rows,
        "stock-movements": movement_rows,
        "low-stock": low_stock_rows,
        "purchases": purchase_rows,
        "sales": sales_rows,
        "warehouses": warehouse_rows,
        "product-performance": performance_rows,
    }
)


def _scoped_stock(user):
    return stock_queryset().filter(warehouse__in=_warehouses(user))


def _warehouses(user):
    if user is None:
        from apps.warehouses.models import Warehouse

        return Warehouse.objects.all()
    return visible_warehouses(user)


def _movements(user):
    return InventoryTransaction.objects.filter(warehouse__in=_warehouses(user)).order_by("-created_at")


def _filter_stock(queryset, params):
    if params.get("warehouse"):
        queryset = queryset.filter(warehouse_id=params["warehouse"])
    if params.get("category"):
        queryset = queryset.filter(product__category_id=params["category"])
    if params.get("product"):
        queryset = queryset.filter(product_id=params["product"])
    if params.get("status"):
        queryset = queryset.filter(status=params["status"])
    return queryset.order_by("warehouse__code", "product__sku")


def _stock_row(stock):
    value = stock.on_hand * stock.product.cost_price
    return {
        "sku": stock.product.sku,
        "product_name": stock.product.name,
        "category": stock.product.category_id,
        "warehouse": stock.warehouse_id,
        "warehouse_code": stock.warehouse.code,
        "on_hand": qty(stock.on_hand),
        "reserved": qty(stock.reserved),
        "available": qty(stock.available),
        "status": stock.status,
        "cost_price": money(stock.product.cost_price),
        "value": money(value),
    }


def _inventory_value(stock):
    valued = stock.annotate(
        line_value=ExpressionWrapper(
            F("on_hand") * F("product__cost_price"),
            output_field=DecimalField(max_digits=16, decimal_places=2),
        )
    )
    return valued.aggregate(total=Sum("line_value"))["total"]


def _purchase_total(user, start, end):
    line_value = ExpressionWrapper(
        F("quantity") * F("purchase_order_item__unit_cost"),
        output_field=DecimalField(max_digits=16, decimal_places=2),
    )
    return PurchaseReceiptItem.objects.filter(
        receipt__purchase_order__warehouse__in=_warehouses(user),
        receipt__received_at__gte=start,
        receipt__received_at__lte=end,
    ).aggregate(total=Sum(line_value))["total"]


def _sales_total(user, start, end):
    return SalesOrder.objects.filter(
        warehouse__in=_warehouses(user),
        status=SalesOrder.Status.COMPLETED,
        completed_at__gte=start,
        completed_at__lte=end,
    ).aggregate(total=Sum("total"))["total"]


def _value_by_warehouse(stock):
    grouped = {}
    for row in stock.select_related("warehouse", "product"):
        bucket = grouped.setdefault(
            row.warehouse_id,
            {"warehouse_id": row.warehouse_id, "code": row.warehouse.code, "name": row.warehouse.name, "value": Decimal("0")},
        )
        bucket["value"] += row.on_hand * row.product.cost_price
    return [
        {**bucket, "value": money(bucket["value"])}
        for bucket in sorted(grouped.values(), key=lambda item: item["code"])
    ]


def _daily_movements(movements):
    rows = (
        movements.annotate(day=TruncDate("created_at"))
        .values("day")
        .annotate(quantity=Sum("quantity_change"))
        .order_by("day")
    )
    return [{"date": row["day"].isoformat(), "quantity": qty(row["quantity"])} for row in rows]


def _recent_transactions(user):
    rows = _movements(user).select_related("product", "warehouse")[:10]
    return [
        {
            "id": row.pk,
            "transaction_type": row.transaction_type,
            "sku": row.product.sku,
            "warehouse_code": row.warehouse.code,
            "quantity_change": qty(row.quantity_change),
            "created_at": stamp(row.created_at),
        }
        for row in rows
    ]


def _recent_purchase_orders(user):
    rows = PurchaseOrder.objects.filter(warehouse__in=_warehouses(user)).order_by("-created_at")[:10]
    return [
        {
            "id": row.pk,
            "number": row.number,
            "status": row.status,
            "total": money(row.total),
            "created_at": stamp(row.created_at),
        }
        for row in rows
    ]


def _recent_sales(user):
    rows = SalesOrder.objects.filter(warehouse__in=_warehouses(user)).order_by("-created_at")[:10]
    return [
        {
            "id": row.pk,
            "number": row.number,
            "customer_name": row.customer_name,
            "status": row.status,
            "total": money(row.total),
            "created_at": stamp(row.created_at),
        }
        for row in rows
    ]


def _completed_lines(user):
    return SalesOrderItem.objects.select_related("sales_order", "sales_order__warehouse", "product").filter(
        sales_order__warehouse__in=_warehouses(user),
        sales_order__status=SalesOrder.Status.COMPLETED,
    )


def _sales_row(item):
    return {
        "completed_at": stamp(item.sales_order.completed_at),
        "number": item.sales_order.number,
        "customer_name": item.sales_order.customer_name,
        "warehouse_code": item.sales_order.warehouse.code,
        "sku": item.product.sku,
        "quantity": qty(item.quantity),
        "unit_price": money(item.unit_price),
        "line_total": money(item.line_total),
    }


def _require_range(params):
    start = _parse_bound(params.get("created_after"), end=False)
    end = _parse_bound(params.get("created_before"), end=True)
    if start is None or end is None:
        raise ValidationError(
            {
                "created_after": "A start and end date are required.",
                "created_before": "A start and end date are required.",
            }
        )
    if end < start:
        raise ValidationError({"created_before": "The end must be on or after the start."})
    if (end.date() - start.date()).days > 366:
        raise ValidationError({"created_before": "Date range cannot exceed 366 days."})
    return start, end


def _parse_bound(value, end):
    if value in (None, ""):
        return None
    parsed = parse_datetime(str(value))
    if parsed is None:
        parsed_date = parse_date(str(value))
        if parsed_date is None:
            raise ValidationError({"created_after": "Enter a valid date."})
        parsed = datetime.combine(parsed_date, time.max if end else time.min)
    if timezone.is_naive(parsed):
        parsed = timezone.make_aware(parsed, timezone.get_current_timezone())
    return parsed


def money(value):
    if value is None:
        value = Decimal("0")
    return format(Decimal(value).quantize(Decimal("0.01")), "f")


def qty(value):
    if value is None:
        value = Decimal("0")
    return format(Decimal(value).quantize(Decimal("0.001")), "f")


def stamp(value):
    if value is None:
        return None
    return value.isoformat()
