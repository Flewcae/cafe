from django.urls import path

from .views import (
    kitchen_queue, kitchen_queue_partial,
    mark_item_ready, unmark_item_ready,
)

urlpatterns = [
    path('mutfak/', kitchen_queue, name='kitchen_queue'),
    path('mutfak/queue-parcasi/', kitchen_queue_partial, name='kitchen_queue_partial'),
    path('mutfak/kalem/<int:pk>/hazir/', mark_item_ready, name='kitchen_mark_ready'),
    path('mutfak/kalem/<int:pk>/geri-al/', unmark_item_ready, name='kitchen_unmark_ready'),
]
