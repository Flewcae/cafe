from django.urls import path
from rest_framework import routers

from .views import (
    order_list, order_detail,
    OrderViewSet, OrderItemViewSet, ReceiptViewSet,
)

router = routers.DefaultRouter()
router.register(r'order', OrderViewSet, basename='order')
router.register(r'order-item', OrderItemViewSet, basename='order-item')
router.register(r'receipt', ReceiptViewSet, basename='receipt')

urlpatterns = [
    path('siparisler/', order_list, name='orders'),
    path('siparisler/<int:pk>/', order_detail, name='order_detail'),
] + router.urls