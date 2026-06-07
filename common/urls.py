from django.urls import path
from .views import *
from rest_framework import routers


routers = routers.DefaultRouter()

routers.register("faq", FaqViewSet, "faq")
routers.register("email", EmailViewSet, "email")
routers.register("sms", SMSViewSet, "sms")
routers.register("notification", NotificationViewSet, "notification")

urlpatterns = [
    path('sss/', faq_list, name='faqs'),
    path('email/', email_list, name='emails'),
    path('sms/', sms_list, name='smss'),
    path('bildirim/', notification_list, name='notifications'),
] + routers.urls
