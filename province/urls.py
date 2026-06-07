from django.contrib import admin
from django.urls import path, include
from .views import *
from rest_framework.routers import DefaultRouter

router = DefaultRouter()
router.register(r'address', AddressViewSet, basename='address')
urlpatterns = [
    path('htmx/district_by_city/', district_by_city, name = 'district_by_city'),
    path('api/district_name', dist_id, name = 'dist_id'),
]+ router.urls