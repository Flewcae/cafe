from django.contrib import messages
from django.db import transaction
from django.shortcuts import get_object_or_404, redirect, render

from cafe.action_resolver import action_resolver, UserGenException
from common.decorators import anahtar_auth
from dining.models import Room
from menu.models import Category
from orders.models import Order, OrderItem


def _ticket_kwargs(request, *a, **k):
    return {'pk': k.get('pk')}


def _ticket_kwargs_from_post(request, *a, **k):
    return {'pk': request.POST.get('order')}


# ---------------------------------------------------------------------------
# Screens
# ---------------------------------------------------------------------------
@anahtar_auth(perm="waiter", action="view")
def waiter_floor(request):
    """Kuş bakışı salon görünümü — masaya dokun, adisyon aç/gör."""
    rooms = list(
        Room.objects.filter(is_active=True)
        .prefetch_related('tables')
        .order_by('list_index', 'name')
    )

    open_by_table = {
        o.table_id: o
        for o in (
            Order.objects
            .exclude(status__in=Order.CLOSED_STATUSES)
            .filter(table__isnull=False)
            .order_by('created_at')          # bir masada birden çok varsa sonuncusu kalır
        )
    }
    for room in rooms:
        for table in room.tables.all():
            table.open_order = open_by_table.get(table.id)

    takeaway = (
        Order.objects
        .exclude(status__in=Order.CLOSED_STATUSES)
        .filter(order_type=Order.TYPE_TAKEAWAY)
        .order_by('-created_at')
    )

    return render(request, 'waiter/floor.html', {
        'rooms': rooms,
        'takeaway_orders': takeaway,
    })


@anahtar_auth(perm="waiter", action="view")
def waiter_ticket(request, pk):
    """Sipariş ekranı: menüden hızlı ekleme + adisyon kalemleri."""
    order = get_object_or_404(
        Order.objects.select_related('table').prefetch_related('items__product'),
        pk=pk,
    )
    categories = (
        Category.objects.filter(is_active=True)
        .prefetch_related('products')
        .order_by('list_index', 'name')
    )
    return render(request, 'waiter/ticket.html', {
        'order': order,
        'categories': categories,
    })


# ---------------------------------------------------------------------------
# Actions (form POST)
# ---------------------------------------------------------------------------
@action_resolver(redirect_default=True, redirect_url='waiter_floor')
def open_table_order(request):
    if not request.user.has_ext_perm('waiter', 'add'):
        raise UserGenException("Adisyon açma yetkiniz yok.")

    table_id = request.POST.get('table')
    if not table_id:
        raise UserGenException("Masa seçimi zorunludur.")

    existing = (
        Order.objects
        .exclude(status__in=Order.CLOSED_STATUSES)
        .filter(table_id=table_id)
        .order_by('-created_at')
        .first()
    )
    if existing:
        return redirect('waiter_ticket', pk=existing.id)

    order = Order.create_from_form(request.POST, user=request.user)
    messages.success(request, "Adisyon açıldı!")
    return redirect('waiter_ticket', pk=order.id)


@action_resolver(redirect_default=True, redirect_url='waiter_floor')
def create_takeaway(request):
    if not request.user.has_ext_perm('waiter', 'add'):
        raise UserGenException("Adisyon açma yetkiniz yok.")
    order = Order.create_from_form(
        {'order_type': Order.TYPE_TAKEAWAY, 'note': request.POST.get('note')},
        user=request.user,
    )
    messages.success(request, "Paket adisyonu açıldı!")
    return redirect('waiter_ticket', pk=order.id)


@action_resolver(
    redirect_default=True, redirect_url='waiter_ticket',
    redirect_kwargs=_ticket_kwargs, success_message="Ürün eklendi!",
)
def add_item(request, pk=None):
    if not request.user.has_ext_perm('waiter', 'add'):
        raise UserGenException("Ürün ekleme yetkiniz yok.")
    order = get_object_or_404(Order, pk=pk)
    order.add_item_from_form(request.POST)


@action_resolver(
    redirect_default=True, redirect_url='waiter_ticket',
    redirect_kwargs=_ticket_kwargs_from_post, success_message="Kalem güncellendi!",
)
def update_item(request, pk=None):
    if not request.user.has_ext_perm('waiter', 'change'):
        raise UserGenException("Düzenleme yetkiniz yok.")
    item = get_object_or_404(OrderItem, pk=pk)
    item.update_from_form(request.POST)


@action_resolver(
    redirect_default=True, redirect_url='waiter_ticket',
    redirect_kwargs=_ticket_kwargs_from_post, success_message="Kalem kaldırıldı!",
)
def delete_item(request, pk=None):
    if not request.user.has_ext_perm('waiter', 'change'):
        raise UserGenException("Düzenleme yetkiniz yok.")
    item = get_object_or_404(OrderItem, pk=pk)
    if not item.order.is_open:
        raise UserGenException("Kapanmış bir adisyonun kalemi silinemez.")
    item.delete()


@action_resolver(
    redirect_default=True, redirect_url='waiter_ticket',
    redirect_kwargs=_ticket_kwargs, success_message="Sipariş mutfağa iletildi!",
)
def send_to_kitchen(request, pk=None):
    if not request.user.has_ext_perm('waiter', 'change'):
        raise UserGenException("Bu işlem için yetkiniz yok.")
    order = get_object_or_404(Order, pk=pk)
    if not order.is_open:
        raise UserGenException("Kapanmış bir adisyon güncellenemez.")
    with transaction.atomic():
        order.items.filter(status=OrderItem.STATUS_PENDING).update(
            status=OrderItem.STATUS_PREPARING
        )
        if order.status == Order.STATUS_OPEN:
            order.set_status(Order.STATUS_PREPARING)


@action_resolver(
    redirect_default=True, redirect_url='waiter_ticket',
    redirect_kwargs=_ticket_kwargs, success_message="Sipariş servis edildi!",
)
def mark_served(request, pk=None):
    if not request.user.has_ext_perm('waiter', 'change'):
        raise UserGenException("Bu işlem için yetkiniz yok.")
    order = get_object_or_404(Order, pk=pk)
    if not order.is_open:
        raise UserGenException("Kapanmış bir adisyon güncellenemez.")
    with transaction.atomic():
        order.items.exclude(status=OrderItem.STATUS_CANCELLED).update(
            status=OrderItem.STATUS_SERVED
        )
        order.set_status(Order.STATUS_SERVED)