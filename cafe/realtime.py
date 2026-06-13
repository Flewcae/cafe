# core/realtime.py

from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer

channel_layer = get_channel_layer()


def emit_event(group_name: str, event_type: str, payload: dict):
    """
    group_name: order_123 / room_45
    event_type: order.changed / room.changed
    payload: subscriber'ın yeniden fetch edeceği veri
    """
    async_to_sync(channel_layer.group_send)(
        group_name,
        {
            "type": "broadcast.message",
            "event": event_type,
            "payload": payload,
        }
    )