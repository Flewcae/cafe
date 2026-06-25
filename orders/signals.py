# orders/signals.py
#
# Order/OrderItem her kaydedildiğinde/silindiğinde otomatik broadcast yapar.
# Bu, hangi koddan geldiğine bakmaz (GraphQL mutation, waiter web view,
# customer QR akışı, admin panel, shell) — tek senkron noktası budur.
#
# Broadcast'ler `transaction.on_commit` ile geciktirilir: aksi halde (örn.
# `place_customer_order`/`add_order_item` gibi `transaction.atomic()` bloğu
# içindeki çoklu save'lerde) sinyal commit'ten ÖNCE ateşlenir, Redis'e anında
# yayılır ve subscription consumer'ı veritabanını commit tamamlanmadan
# sorgulayıp eski/eksik veri görebilir (yeni adisyon/kalem "yokmuş" gibi
# görünür). `on_commit` bunu, transaction kesin başarıyla bitene kadar
# bekleterek çözer; autocommit modunda (aktif transaction yoksa) hemen çalışır.

from django.db import transaction
from django.db.models.signals import post_save, post_delete
from django.dispatch import receiver

from orders.models import Order, OrderItem
from cafe.realtime import broadcast_order, broadcast_active_orders


@receiver(post_save, sender=Order)
@receiver(post_delete, sender=Order)
def order_changed(sender, instance: Order, **kwargs):
    transaction.on_commit(lambda: broadcast_order(instance))
    transaction.on_commit(broadcast_active_orders)


@receiver(post_save, sender=OrderItem)
@receiver(post_delete, sender=OrderItem)
def order_item_changed(sender, instance: OrderItem, **kwargs):
    order = instance.order
    order.sync_status_from_items()
    transaction.on_commit(lambda: broadcast_order(order))
    transaction.on_commit(broadcast_active_orders)
