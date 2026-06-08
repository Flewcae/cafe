from django.urls import path
from rest_framework import routers

from .views import (
    menu_management, menu_builder,
    CategoryViewSet, ProductViewSet, MenuViewSet,
)

router = routers.DefaultRouter()
router.register(r'category', CategoryViewSet, basename='category')
router.register(r'product', ProductViewSet, basename='product')
router.register(r'menu', MenuViewSet, basename='menu')

urlpatterns = [
    path('urun-yonetimi/', menu_management, name='menu_management'),
    path('urun-yonetimi/menu/<int:pk>/duzen/', menu_builder, name='menu_builder'),
] + router.urls