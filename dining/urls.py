from django.urls import path
from rest_framework import routers

from .views import room_table_list, room_layout_editor, RoomViewSet, TableViewSet, table_qr_codes, table_qr_png, table_qr_zip

router = routers.DefaultRouter()
router.register(r'room', RoomViewSet, basename='room')
router.register(r'table', TableViewSet, basename='table')

urlpatterns = [
    path('salon-yonetimi/', room_table_list, name='tables'),
    path('salon-yonetimi/qr-kodlari/', table_qr_codes, name='table_qr_codes'),
    path('salon-yonetimi/qr-kodlari/indir/', table_qr_zip, name='table_qr_zip'),
    path('salon-yonetimi/qr-kodlari/<uuid:token>.png', table_qr_png, name='table_qr_png'),
    path('salon-yonetimi/<int:pk>/duzen/', room_layout_editor, name='room_layout'),
] + router.urls