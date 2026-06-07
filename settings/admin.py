from django.contrib import admin

from settings.models import *


admin.site.register(Organization)
admin.site.register(AppSettings)
# Register your models here.
@admin.register(EmailConfig)
class EmailConfigAdmin(admin.ModelAdmin):
    list_display = ("host", "port", "use_tls", "use_ssl", "updated_at")

    def has_add_permission(self, request):
        return not EmailConfig.objects.exists()