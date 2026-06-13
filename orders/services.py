# orders/services.py

def build_order_payload(order_id):
    from orders.models import Order
    order = Order.objects.get(id=order_id)

    return {
        "id": str(order.id),
        "status": order.status,
        "total": order.total,
    }