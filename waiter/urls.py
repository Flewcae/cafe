from django.urls import path

from .views import (
    waiter_floor, waiter_ticket,
    open_table_order, create_takeaway,
    add_item, update_item, delete_item,
    send_to_kitchen, mark_served,
)

urlpatterns = [
    path('garson/', waiter_floor, name='waiter_floor'),
    path('garson/adisyon/<int:pk>/', waiter_ticket, name='waiter_ticket'),

    path('garson/masa-ac/', open_table_order, name='waiter_open_table'),
    path('garson/paket-ac/', create_takeaway, name='waiter_create_takeaway'),

    path('garson/adisyon/<int:pk>/urun-ekle/', add_item, name='waiter_add_item'),
    path('garson/adisyon/<int:pk>/mutfaga-gonder/', send_to_kitchen, name='waiter_send_kitchen'),
    path('garson/adisyon/<int:pk>/servis-edildi/', mark_served, name='waiter_mark_served'),
    path('garson/kalem/<int:pk>/guncelle/', update_item, name='waiter_update_item'),
    path('garson/kalem/<int:pk>/sil/', delete_item, name='waiter_delete_item'),
]