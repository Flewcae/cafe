from django.contrib import admin
from django.urls import path, include
from .views import *
from rest_framework import routers

router = routers.DefaultRouter()
router.register(r'user', UserViewSet, 'user')

urlpatterns = [
    path('cikis/', logout_view, name = 'logout_view'),
    path('giris/', login_page, name = 'login_page' ),
    # path('profil/', profile, name = 'my_profile'),
]+ router.urls