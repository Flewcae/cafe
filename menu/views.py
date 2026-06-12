from django.db import transaction
from django.shortcuts import get_object_or_404, render
from django.utils.decorators import method_decorator
from rest_framework import viewsets
from rest_framework.decorators import action

from authorizement.constants import Action, Perm
from cafe.action_resolver import action_resolver, UserGenException
from common.decorators import anahtar_auth
from .models import Category, Product, Menu
from .serializers import CategorySerializer, ProductSerializer, MenuSerializer


# ---------------------------------------------------------------------------
# Management pages
# ---------------------------------------------------------------------------
@anahtar_auth(perm=Perm.MENU, action=Action.VIEW)
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


@anahtar_auth(perm=Perm.MENU, action=Action.VIEW)
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
        perm=Perm.MENU, action=Action.ADD,
        redirect_default=True, redirect_url='menu_management',
        success_message="Kategori başarıyla oluşturuldu!",
    ))
    def create_category(self, request, *args, **kwargs):
        Category.create_from_form(request.data, request.FILES)

    @action(detail=True, methods=['post'])
    @method_decorator(action_resolver(
        redirect_default=True, redirect_url='menu_management',
        success_message="Kategori başarıyla güncellendi!",
        perm=Perm.MENU, action=Action.CHANGE,
    ))
    def update_category(self, request, pk=None, *args, **kwargs):
        Category.update_from_form(self.get_object(), request.data, request.FILES)

    @action(detail=True, methods=['post'])
    @method_decorator(action_resolver(
        redirect_default=True, redirect_url='menu_management',
        success_message="Kategori başarıyla silindi!",
        perm=Perm.MENU, action=Action.DELETE,
    ))
    def delete_category(self, request, pk=None, *args, **kwargs):
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
        perm=Perm.MENU, action=Action.ADD,

    ))
    def create_product(self, request, *args, **kwargs):
        Product.create_from_form(request.data, request.FILES)

    @action(detail=True, methods=['post'])
    @method_decorator(action_resolver(
        redirect_default=True, redirect_url='menu_management',
        success_message="Ürün başarıyla güncellendi!",
        perm=Perm.MENU, action=Action.CHANGE,
    ))
    def update_product(self, request, pk=None, *args, **kwargs):
        Product.update_from_form(self.get_object(), request.data, request.FILES)

    @action(detail=True, methods=['post'])
    @method_decorator(action_resolver(
        redirect_default=True, redirect_url='menu_management',
        success_message="Ürün başarıyla silindi!",
        perm=Perm.MENU, action=Action.DELETE,
    ))
    def delete_product(self, request, pk=None, *args, **kwargs):
        self.get_object().delete()

    @action(detail=True, methods=['post'])
    @method_decorator(action_resolver(
        redirect_default=True, redirect_url='menu_management',
        success_message="Ürün durumu güncellendi!",
        perm=Perm.MENU, action=Action.CHANGE,
    ))
    def toggle_availability(self, request, pk=None, *args, **kwargs):
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
        perm=Perm.MENU, action=Action.ADD,
    ))
    def create_menu(self, request, *args, **kwargs):
        Menu.create_from_form(request.data)

    @action(detail=True, methods=['post'])
    @method_decorator(action_resolver(
        redirect_default=True, redirect_url='menu_management',
        success_message="Menü başarıyla güncellendi!",
        perm=Perm.MENU, action=Action.CHANGE,
    ))
    def update_menu(self, request, pk=None, *args, **kwargs):
        Menu.update_from_form(self.get_object(), request.data)

    @action(detail=True, methods=['post'])
    @method_decorator(action_resolver(
        redirect_default=True, redirect_url='menu_management',
        success_message="Menü başarıyla silindi!",
        perm=Perm.MENU, action=Action.DELETE,
    ))
    def delete_menu(self, request, pk=None, *args, **kwargs):
        self.get_object().delete()

    @action(detail=True, methods=['post'])
    @method_decorator(action_resolver(
        redirect_default=True, redirect_url='menu_builder',
        redirect_kwargs=lambda request, *a, **k: {'pk': k.get('pk')},
        success_message="Menü içeriği kaydedildi!",
        perm=Perm.MENU, action=Action.CHANGE,
    ))
    def save_items(self, request, pk=None, *args, **kwargs):
        menu = self.get_object()
        with transaction.atomic():
            menu.set_products(request.data)