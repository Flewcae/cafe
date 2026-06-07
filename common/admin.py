from django.contrib import admin
from .models import *
# Register your models here.
admin.site.register(Email)
admin.site.register(EmailAttachment)
admin.site.register(EmailStatus)
admin.site.register(NotificationToken)
admin.site.register(Notification)
admin.site.register(NotificationStatus)



