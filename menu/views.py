from django.db import transaction
from django.shortcuts import get_object_or_404, render
from django.utils.decorators import method_decorator
from rest_framework import viewsets
from rest_framework.decorators import action

from cafe.action_resolver import action_resolver, UserGenException
from common.decorators import anahtar_auth
from .models import Category, Product, Menu
from .serializers import CategorySerializer, ProductSerializer, MenuSerializer


# ---------------------------------------------------------------------------
# Management pages
# ---------------------------------------------------------------------------
@anahtar_auth(perm="menu", action="view")
def menu_management(request):
    categories = Category.objects.prefetch_related('products').order_by('list_index', 'name')
    menus = (
        Menu.objects
        .prefetch_related('products')         # yeni
        .order_by('list_index', 'name')
    )
    context = {
        'categories': categories,
        'menus': menus,
    }
    return render(request, 'menu/index.html', context)


@anahtar_auth(perm="menu", action="view")
def menu_builder(request, pk):
    """Bir menüye hangi ürünlerin dâhil olacağını seçme ekranı."""
    menu = get_object_or_404(Menu, pk=pk)
    selected_ids = list(menu.products.values_list('id', flat=True))

    categories = Category.objects.prefetch_related('products').order_by('list_index', 'name')

    context = {
        'menu': menu,
        'categories': categories,
        'selected_ids': selected_ids,
    }
    return render(request, 'menu/menu_builder.html', context)


# ---------------------------------------------------------------------------
# Category API + form actions
# ---------------------------------------------------------------------------
class CategoryViewSet(viewsets.ModelViewSet):
    queryset = Category.objects.all()
    serializer_class = CategorySerializer

    @action(detail=False, methods=['post'])
    @method_decorator(action_resolver(
        redirect_default=True, redirect_url='menu_management',
        success_message="Kategori başarıyla oluşturuldu!",
    ))
    def create_category(self, request, *args, **kwargs):
        if not request.user.has_ext_perm('menu', 'add'):
            raise UserGenException("Bu işlem için yetkiniz yok.")
        Category.create_from_form(request.data, request.FILES)

    @action(detail=True, methods=['post'])
    @method_decorator(action_resolver(
        redirect_default=True, redirect_url='menu_management',
        success_message="Kategori başarıyla güncellendi!",
    ))
    def update_category(self, request, pk=None, *args, **kwargs):
        if not request.user.has_ext_perm('menu', 'change'):
            raise UserGenException("Bu işlem için yetkiniz yok.")
        Category.update_from_form(self.get_object(), request.data, request.FILES)

    @action(detail=True, methods=['post'])
    @method_decorator(action_resolver(
        redirect_default=True, redirect_url='menu_management',
        success_message="Kategori başarıyla silindi!",
    ))
    def delete_category(self, request, pk=None, *args, **kwargs):
        if not request.user.has_ext_perm('menu', 'delete'):
            raise UserGenException("Bu işlem için yetkiniz yok.")
        self.get_object().delete()


# ---------------------------------------------------------------------------
# Product API + form actions
# ---------------------------------------------------------------------------
class ProductViewSet(viewsets.ModelViewSet):
    queryset = Product.objects.select_related('category').all()
    serializer_class = ProductSerializer

    @action(detail=False, methods=['post'])
    @method_decorator(action_resolver(
        redirect_default=True, redirect_url='menu_management',
        success_message="Ürün başarıyla oluşturuldu!",
    ))
    def create_product(self, request, *args, **kwargs):
        if not request.user.has_ext_perm('menu', 'add'):
            raise UserGenException("Bu işlem için yetkiniz yok.")
        Product.create_from_form(request.data, request.FILES)

    @action(detail=True, methods=['post'])
    @method_decorator(action_resolver(
        redirect_default=True, redirect_url='menu_management',
        success_message="Ürün başarıyla güncellendi!",
    ))
    def update_product(self, request, pk=None, *args, **kwargs):
        if not request.user.has_ext_perm('menu', 'change'):
            raise UserGenException("Bu işlem için yetkiniz yok.")
        Product.update_from_form(self.get_object(), request.data, request.FILES)

    @action(detail=True, methods=['post'])
    @method_decorator(action_resolver(
        redirect_default=True, redirect_url='menu_management',
        success_message="Ürün başarıyla silindi!",
    ))
    def delete_product(self, request, pk=None, *args, **kwargs):
        if not request.user.has_ext_perm('menu', 'delete'):
            raise UserGenException("Bu işlem için yetkiniz yok.")
        self.get_object().delete()

    @action(detail=True, methods=['post'])
    @method_decorator(action_resolver(
        redirect_default=True, redirect_url='menu_management',
        success_message="Ürün durumu güncellendi!",
    ))
    def toggle_availability(self, request, pk=None, *args, **kwargs):
        if not request.user.has_ext_perm('menu', 'change'):
            raise UserGenException("Bu işlem için yetkiniz yok.")
        self.get_object().toggle_availability()


# ---------------------------------------------------------------------------
# Menu API + form actions
# ---------------------------------------------------------------------------
class MenuViewSet(viewsets.ModelViewSet):
    queryset = Menu.objects.all()
    serializer_class = MenuSerializer

    @action(detail=False, methods=['post'])
    @method_decorator(action_resolver(
        redirect_default=True, redirect_url='menu_management',
        success_message="Menü başarıyla oluşturuldu!",
    ))
    def create_menu(self, request, *args, **kwargs):
        if not request.user.has_ext_perm('menu', 'add'):
            raise UserGenException("Bu işlem için yetkiniz yok.")
        Menu.create_from_form(request.data)

    @action(detail=True, methods=['post'])
    @method_decorator(action_resolver(
        redirect_default=True, redirect_url='menu_management',
        success_message="Menü başarıyla güncellendi!",
    ))
    def update_menu(self, request, pk=None, *args, **kwargs):
        if not request.user.has_ext_perm('menu', 'change'):
            raise UserGenException("Bu işlem için yetkiniz yok.")
        Menu.update_from_form(self.get_object(), request.data)

    @action(detail=True, methods=['post'])
    @method_decorator(action_resolver(
        redirect_default=True, redirect_url='menu_management',
        success_message="Menü başarıyla silindi!",
    ))
    def delete_menu(self, request, pk=None, *args, **kwargs):
        if not request.user.has_ext_perm('menu', 'delete'):
            raise UserGenException("Bu işlem için yetkiniz yok.")
        self.get_object().delete()

    @action(detail=True, methods=['post'])
    @method_decorator(action_resolver(
        redirect_default=True, redirect_url='menu_builder',
        redirect_kwargs=lambda request, *a, **k: {'pk': k.get('pk')},
        success_message="Menü içeriği kaydedildi!",
    ))
    def save_items(self, request, pk=None, *args, **kwargs):
        if not request.user.has_ext_perm('menu', 'change'):
            raise UserGenException("Menü içeriğini değiştirme yetkiniz yok.")
        menu = self.get_object()
        with transaction.atomic():
            menu.set_products(request.data)