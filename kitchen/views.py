from django.shortcuts import get_object_or_404, render

from authorizement.constants import Action, Perm
from cafe.action_resolver import action_resolver, UserGenException
from common.decorators import anahtar_auth
from orders.models import Order, OrderItem


def _kitchen_queues():
    base = (
        OrderItem.objects
        .filter(order__status__in=[Order.STATUS_OPEN, Order.STATUS_PREPARING, Order.STATUS_READY])
        .select_related('order', 'order__table')
        .order_by('order__created_at', 'id')
    )
    preparing_items = base.filter(status=OrderItem.STATUS_PREPARING)
    ready_items = base.filter(status=OrderItem.STATUS_READY)
    return preparing_items, ready_items


@anahtar_auth(perm=Perm.KITCHEN, action=Action.VIEW)
def kitchen_queue(request):
    """Mutfak ekranı: hazırlanıyor / hazır kalemler, gerçek zamanlı (WS) güncellenir."""
    preparing_items, ready_items = _kitchen_queues()
    return render(request, 'kitchen/queue.html', {
        'preparing_items': preparing_items,
        'ready_items': ready_items,
    })


@anahtar_auth(perm=Perm.KITCHEN, action=Action.VIEW)
def kitchen_queue_partial(request):
    """WS tetiklediğinde sayfanın fetch ile yenilediği parça."""
    preparing_items, ready_items = _kitchen_queues()
    return render(request, 'kitchen/_queue.html', {
        'preparing_items': preparing_items,
        'ready_items': ready_items,
    })


@action_resolver(
    redirect_default=True, redirect_url='kitchen_queue',
    success_message="Kalem hazır olarak işaretlendi!",
    perm=Perm.KITCHEN, action=Action.CHANGE,
)
def mark_item_ready(request, pk=None):
    item = get_object_or_404(OrderItem, pk=pk)
    if item.status != OrderItem.STATUS_PREPARING:
        raise UserGenException("Bu kalem hazırlanıyor durumunda değil.")
    item.status = OrderItem.STATUS_READY
    item.save()


@action_resolver(
    redirect_default=True, redirect_url='kitchen_queue',
    success_message="Kalem hazırlanıyora geri alındı!",
    perm=Perm.KITCHEN, action=Action.CHANGE,
)
def unmark_item_ready(request, pk=None):
    item = get_object_or_404(OrderItem, pk=pk)
    if item.status != OrderItem.STATUS_READY:
        raise UserGenException("Bu kalem hazır durumunda değil.")
    item.status = OrderItem.STATUS_PREPARING
    item.save()
