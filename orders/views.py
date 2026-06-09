from django.shortcuts import get_object_or_404, render
from django.utils.decorators import method_decorator
from rest_framework import viewsets
from rest_framework.decorators import action

from cafe.action_resolver import action_resolver, UserGenException
from common.decorators import anahtar_auth
from dining.models import Room, Table
from menu.models import Category
from .models import Order, OrderItem, Receipt
from .serializers import OrderSerializer, OrderItemSerializer, ReceiptSerializer


def _detail_kwargs(request, *a, **k):
    return {'pk': k.get('pk')}


# ---------------------------------------------------------------------------
# Management pages
# ---------------------------------------------------------------------------
@anahtar_auth(perm="orders", action="view")
def order_list(request):
    """Açık adisyonlar + kapanmış son siparişler."""
    open_orders = (
        Order.objects
        .select_related('table', 'created_by')
        .prefetch_related('items', 'receipts')
        .exclude(status__in=Order.CLOSED_STATUSES)
        .order_by('-created_at')
    )
    recent_closed = (
        Order.objects
        .select_related('table', 'created_by')
        .prefetch_related('items', 'receipts')
        .filter(status__in=Order.CLOSED_STATUSES)
        .order_by('-closed_at', '-created_at')[:20]
    )
    rooms = Room.objects.prefetch_related('tables').order_by('list_index', 'name')

    context = {
        'open_orders': open_orders,
        'recent_closed': recent_closed,
        'rooms': rooms,
        'type_choices': Order.TYPE_CHOICES,
    }
    return render(request, 'orders/index.html', context)


@anahtar_auth(perm="orders", action="view")
def order_detail(request, pk):
    """POS ekranı: menüden ürün ekle, kalemleri yönet, ödeme al."""
    order = get_object_or_404(
        Order.objects.select_related('table', 'created_by')
        .prefetch_related('items__product', 'receipts'),
        pk=pk,
    )
    categories = (
        Category.objects
        .filter(is_active=True)
        .prefetch_related('products')
        .order_by('list_index', 'name')
    )
    context = {
        'order': order,
        'categories': categories,
        'item_status_choices': OrderItem.STATUS_CHOICES,
        'order_status_choices': Order.STATUS_CHOICES,
        'payment_methods': Receipt.METHOD_CHOICES,
    }
    return render(request, 'orders/detail.html', context)


# ---------------------------------------------------------------------------
# Order API + form actions
# ---------------------------------------------------------------------------
class OrderViewSet(viewsets.ModelViewSet):
    queryset = Order.objects.select_related('table').all()
    serializer_class = OrderSerializer

    @action(detail=False, methods=['post'])
    @method_decorator(action_resolver(
        redirect_default=True, redirect_url='orders',
        success_message="Adisyon açıldı!",
    ))
    def create_order(self, request, *args, **kwargs):
        if not request.user.has_ext_perm('orders', 'add'):
            raise UserGenException("Bu işlem için yetkiniz yok.")
        Order.create_from_form(request.data, user=request.user)

    @action(detail=True, methods=['post'])
    @method_decorator(action_resolver(
        redirect_default=True, redirect_url='order_detail',
        redirect_kwargs=_detail_kwargs,
        success_message="Sipariş durumu güncellendi!",
    ))
    def set_status(self, request, pk=None, *args, **kwargs):
        if not request.user.has_ext_perm('orders', 'change'):
            raise UserGenException("Bu işlem için yetkiniz yok.")
        self.get_object().set_status(request.data.get('status'))

    @action(detail=True, methods=['post'])
    @method_decorator(action_resolver(
        redirect_default=True, redirect_url='orders',
        success_message="Adisyon iptal edildi!",
    ))
    def cancel_order(self, request, pk=None, *args, **kwargs):
        if not request.user.has_ext_perm('orders', 'change'):
            raise UserGenException("Bu işlem için yetkiniz yok.")
        self.get_object().cancel()

    @action(detail=True, methods=['post'])
    @method_decorator(action_resolver(
        redirect_default=True, redirect_url='orders',
        success_message="Adisyon silindi!",
    ))
    def delete_order(self, request, pk=None, *args, **kwargs):
        if not request.user.has_ext_perm('orders', 'delete'):
            raise UserGenException("Bu işlem için yetkiniz yok.")
        order = self.get_object()
        order.delete()
        order._release_table_if_free()

    # --- Kalem yönetimi (detay sayfasına geri döner) ----------------------
    @action(detail=True, methods=['post'])
    @method_decorator(action_resolver(
        redirect_default=True, redirect_url='order_detail',
        redirect_kwargs=_detail_kwargs,
        success_message="Ürün adisyona eklendi!",
    ))
    def add_item(self, request, pk=None, *args, **kwargs):
        if not request.user.has_ext_perm('orders', 'change'):
            raise UserGenException("Bu işlem için yetkiniz yok.")
        self.get_object().add_item_from_form(request.data)

    # --- Ödeme ------------------------------------------------------------
    @action(detail=True, methods=['post'])
    @method_decorator(action_resolver(
        redirect_default=True, redirect_url='order_detail',
        redirect_kwargs=_detail_kwargs,
        success_message="Ödeme alındı!",
    ))
    def add_payment(self, request, pk=None, *args, **kwargs):
        if not request.user.has_ext_perm('orders', 'change'):
            raise UserGenException("Bu işlem için yetkiniz yok.")
        self.get_object().add_payment_from_form(request.data, user=request.user)


# ---------------------------------------------------------------------------
# OrderItem API + form actions
# ---------------------------------------------------------------------------
class OrderItemViewSet(viewsets.ModelViewSet):
    queryset = OrderItem.objects.select_related('order', 'product').all()
    serializer_class = OrderItemSerializer

    @action(detail=True, methods=['post'])
    @method_decorator(action_resolver(
        redirect_default=True, redirect_url='order_detail',
        redirect_kwargs=lambda request, *a, **k: {'pk': request.POST.get('order')},
        success_message="Kalem güncellendi!",
    ))
    def update_item(self, request, pk=None, *args, **kwargs):
        if not request.user.has_ext_perm('orders', 'change'):
            raise UserGenException("Bu işlem için yetkiniz yok.")
        self.get_object().update_from_form(request.data)

    @action(detail=True, methods=['post'])
    @method_decorator(action_resolver(
        redirect_default=True, redirect_url='order_detail',
        redirect_kwargs=lambda request, *a, **k: {'pk': request.POST.get('order')},
        success_message="Kalem kaldırıldı!",
    ))
    def delete_item(self, request, pk=None, *args, **kwargs):
        if not request.user.has_ext_perm('orders', 'change'):
            raise UserGenException("Bu işlem için yetkiniz yok.")
        item = self.get_object()
        if not item.order.is_open:
            raise UserGenException("Kapanmış bir adisyonun kalemi silinemez.")
        item.delete()


# ---------------------------------------------------------------------------
# Receipt API
# ---------------------------------------------------------------------------
class ReceiptViewSet(viewsets.ModelViewSet):
    queryset = Receipt.objects.select_related('order').all()
    serializer_class = ReceiptSerializer

    @action(detail=True, methods=['post'])
    @method_decorator(action_resolver(
        redirect_default=True, redirect_url='order_detail',
        redirect_kwargs=lambda request, *a, **k: {'pk': request.POST.get('order')},
        success_message="Ödeme kaydı silindi!",
    ))
    def delete_receipt(self, request, pk=None, *args, **kwargs):
        if not request.user.has_ext_perm('orders', 'delete'):
            raise UserGenException("Bu işlem için yetkiniz yok.")
        self.get_object().delete()