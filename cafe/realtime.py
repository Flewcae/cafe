# cafe/realtime.py
#
# Tek doğruluk kaynağı: tüm realtime (Channels) broadcast'leri buradan geçer.
# Order/OrderItem/Table/Room sinyalleri (orders/signals.py, dining/signals.py)
# ve GraphQL subscription'lar (cafe/schema.py) bu fonksiyonları kullanır —
# böylece bir kaydı değiştiren her yol (mutation, Django form view, customer
# QR akışı, admin) otomatik olarak aynı kanallara yayın yapar.

from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer


def _publish(group_name: str, message_type: str, **data) -> None:
    layer = get_channel_layer()
    if layer is None:  # CHANNEL_LAYERS yapılandırılmamış -> realtime kapalı, no-op
        return
    payload = {"type": message_type}
    payload.update(data)
    async_to_sync(layer.group_send)(group_name, payload)


def broadcast_order(order) -> None:
    """Adisyon ticket'ına, masa ekranına ve (masa varsa) salon haritasına abone olanları bilgilendirir.

    Masa kanalı (`table_{id}`) özellikle önemli: `order_{id}` kanalına abone
    olmak için önce bir order id'sine ihtiyaç var — masada henüz açık adisyon
    yokken (örn. müşteri QR'dan ilk siparişi verene kadar) o kanala abone
    olunamaz. `table_updates` bu yüzden order id'sinden bağımsız, masaya
    bağlı her değişiklikte (yeni adisyon açılışı dahil) tetiklenir.
    """
    _publish(f"order_{order.id}", "order.changed", order_id=str(order.id))
    if order.table_id:
        broadcast_table(order.table_id)
        _publish(f"room_{order.table.room_id}", "room.changed", room_id=str(order.table.room_id))


def broadcast_table(table_id) -> None:
    """Masa ekranını (`table_updates`) bilgilendirir — adisyon değişse de
    (yeni açılış dahil) ya da masanın kendi durumu değişse de (örn.
    `set_table_status`) buradan geçer."""
    _publish(f"table_{table_id}", "table.changed", table_id=str(table_id))


def broadcast_room(room_id) -> None:
    _publish(f"room_{room_id}", "room.changed", room_id=str(room_id))


def broadcast_active_orders() -> None:
    """Mutfak web ekranı ve mobil `activeOrdersUpdates` subscription'ı için tetik."""
    _publish("active_orders", "active_orders.changed")
