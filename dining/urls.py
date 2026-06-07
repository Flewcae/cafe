from django.urls import path
from rest_framework import routers

from .views import room_table_list, room_layout_editor, RoomViewSet, TableViewSet

router = routers.DefaultRouter()
router.register(r'room', RoomViewSet, basename='room')
router.register(r'table', TableViewSet, basename='table')

urlpatterns = [
    path('salon-yonetimi/', room_table_list, name='tables'),
    path('salon-yonetimi/<int:pk>/duzen/', room_layout_editor, name='room_layout'),
] + router.urls