from django.contrib import admin
from django.urls import path, include
from .views import *
from rest_framework import routers

router = routers.DefaultRouter()
router.register(r'settings', SettingsViewSet, basename='settings')

urlpatterns = [
    path('ayarlar/', index, name = 'settings'),
]+ router.urls