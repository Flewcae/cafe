# orders/signals.py

from django.db.models.signals import post_save
from django.dispatch import receiver
from asgiref.sync import sync_to_async

from orders.models import Order
from cafe.realtime import emit_event
from orders.services import build_order_payload


@receiver(post_save, sender=Order)
def order_changed(sender, instance: Order, **kwargs):
    payload = build_order_payload(instance.id)
    print('ORDER SIGNAL CALISTI')
    emit_event(
        group_name=f"order_{instance.id}",
        event_type="order.changed",
        payload=payload
    )