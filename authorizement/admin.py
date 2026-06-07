from django.contrib import admin
from .models import *
# Register your models here.
class ExtendedPermissionAdmin(admin.ModelAdmin):
    list_display = ('name', 'code', 'list_index')  # Listede gösterilecek alanlar
    ordering = ('list_index',)  # Admin listesinde sıralama
admin.site.register(ExtendedPermission, ExtendedPermissionAdmin)
admin.site.register(ExtendedPermissionAction)
admin.site.register(UserExtendedPermission)