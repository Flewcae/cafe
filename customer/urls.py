from django.urls import path

from .views import customer_menu, customer_submit_order, customer_order_status

urlpatterns = [
    path('m/<uuid:token>/', customer_menu, name='customer_menu'),
    path('m/<uuid:token>/siparis/', customer_submit_order, name='customer_submit_order'),
    path('m/<uuid:token>/durum/', customer_order_status, name='customer_order_status'),
]