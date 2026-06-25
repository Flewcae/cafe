# cafe/snapshots.py
#
# Consumer'ların WebSocket üzerinden JSON payload göndermek için kullandığı
# senkron snapshot fonksiyonları.  Her biri DB'den güncel veriyi çeker ve
# serileştirilebilir bir dict/list döner.
# database_sync_to_async(fn)() ile async consumer'larda çağrılır.

from decimal import Decimal

from dining.models import Room, Table
from orders.models import Order, OrderItem


def _fmt(value):
    """Decimal → str (JSON serileştirme için)."""
    if isinstance(value, Decimal):
        return str(value)
    return value


# ---------------------------------------------------------------------------
# Tek adisyon snapshot  →  OrderDetailConsumer
# ---------------------------------------------------------------------------
def order_snapshot(order_id):
    try:
        order = (
            Order.objects
            .select_related('table')
            .prefetch_related('items', 'receipts')
            .get(pk=order_id)
        )
    except Order.DoesNotExist:
        return None

    items = [
        {
            'id': str(item.id),
            'name': item.name,
            'quantity': item.quantity,
            'status': item.status,
            'status_display': item.get_status_display(),
            'status_color': item.status_color,
            'line_total': _fmt(item.line_total),
        }
        for item in order.items.all()
        if item.status != OrderItem.STATUS_CANCELLED
    ]

    return {
        'id': str(order.id),
        'status': order.status,
        'status_display': order.get_status_display(),
        'status_color': order.status_color,
        'item_count': order.item_count,
        'subtotal': _fmt(order.subtotal),
        'total': _fmt(order.total),
        'total_paid': _fmt(order.total_paid),
        'balance': _fmt(order.balance),
        'items': items,
    }


# ---------------------------------------------------------------------------
# Tüm aktif adisyonlar snapshot  →  OrderListConsumer
# ---------------------------------------------------------------------------
def active_orders_snapshot():
    orders = (
        Order.objects
        .select_related('table')
        .prefetch_related('items', 'receipts')
        .exclude(status__in=Order.CLOSED_STATUSES)
        .order_by('-created_at')
    )
    result = []
    for order in orders:
        items = [
            {'id': str(item.id), 'status': item.status}
            for item in order.items.all()
            if item.status != OrderItem.STATUS_CANCELLED
        ]
        result.append({
            'id': str(order.id),
            'status': order.status,
            'status_display': order.get_status_display(),
            'status_color': order.status_color,
            'table_id': str(order.table_id) if order.table_id else None,
            'item_count': order.item_count,
            'total': _fmt(order.total),
            'balance': _fmt(order.balance),
            'items': items,
        })
    return result


# ---------------------------------------------------------------------------
# Salon + masa + adisyon özeti  →  FloorConsumer
# ---------------------------------------------------------------------------
def floor_snapshot():
    rooms = list(
        Room.objects.filter(is_active=True)
        .prefetch_related('tables')
        .order_by('list_index', 'name')
    )

    open_orders = (
        Order.objects
        .exclude(status__in=Order.CLOSED_STATUSES)
        .filter(table__isnull=False)
        .select_related('table')
        .prefetch_related('items', 'receipts')
        .order_by('created_at')
    )

    order_by_table = {}
    for o in open_orders:
        items = [
            {'id': str(item.id), 'status': item.status, 'status_color': item.status_color}
            for item in o.items.all()
            if item.status != OrderItem.STATUS_CANCELLED
        ]
        order_by_table[o.table_id] = {
            'id': str(o.id),
            'status': o.status,
            'status_display': o.get_status_display(),
            'status_color': o.status_color,
            'item_count': o.item_count,
            'total': _fmt(o.total),
            'items': items,
        }

    tables_data = []
    for room in rooms:
        for table in room.tables.all():
            od = order_by_table.get(table.id)
            tables_data.append({
                'id': str(table.id),
                'status': table.status,
                'status_display': table.get_status_display(),
                'status_color': table.status_color,
                'has_open_order': od is not None,
                'open_order_id': od['id'] if od else None,
                'item_count': od['item_count'] if od else 0,
                'total': od['total'] if od else '0.00',
                'order_status': od['status'] if od else None,
                'order_status_display': od['status_display'] if od else None,
                'order_status_color': od['status_color'] if od else None,
                'order_items': od['items'] if od else [],
            })

    return {'tables': tables_data}


# ---------------------------------------------------------------------------
# Masa durumları snapshot  →  TableAdminConsumer (dining/index)
# ---------------------------------------------------------------------------
def tables_status_snapshot():
    return [
        {
            'id': str(t.id),
            'status': t.status,
            'status_display': t.get_status_display(),
            'status_color': t.status_color,
        }
        for t in Table.objects.select_related('room').all()
    ]
