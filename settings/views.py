from django.shortcuts import render
from django.urls import reverse
from rest_framework import viewsets

from account.forms import UserForm
from account.models import User
from authorizement.models import ExtendedPermission
from .serializers import AppSettingsSerializer
from cafe.action_resolver import action_resolver
from settings.models import AppSettings, EmailConfig
from rest_framework.decorators import action
from django.utils.decorators import method_decorator
from django.core.exceptions import ValidationError
from django.db import transaction
from django.middleware.csrf import get_token


def is_truthy(val):
    return str(val).lower() in ["1", "true", "yes", "on"]


def index(request):
    settings = AppSettings.objects.first()
    context = {'settings': settings}
    context['authorities'] = User.objects.filter(is_active=True)
    context['permissions'] =  ExtendedPermission.objects.filter(visible=True).prefetch_related('actions').order_by('list_index')

    return render(request, 'settings/index.html', context)





class SettingsViewSet(viewsets.ModelViewSet):
    queryset = AppSettings.objects.all()
    serializer_class = AppSettingsSerializer

    @action(detail=False, methods=['post'])
    @method_decorator(
        action_resolver(
            redirect_default=True,
            redirect_url='settings',
            success_message="Dernek Ayarları başarıyla güncellendi!"
        )
    )
    def organization_update(self, request, *args, **kwargs):
        settings_obj = AppSettings.objects.select_related("organization").first()

        if not settings_obj or not settings_obj.organization:
            raise ValidationError("Organization bulunamadı")

        instance = settings_obj.organization

        data = request.data
        files = request.FILES

        text_fields = [
            'name',
            'address',
            'phone_number',
            'email',
            'theme_color'
        ]

        file_fields = [
            'logo_light',
            'logo_dark',
            'logo_min_light',
            'logo_min_dark',
            'favicon'
        ]

        with transaction.atomic():

            # --- TEXT UPDATE ---
            for field in text_fields:
                if field in data:
                    value = data.get(field)

                    # boş stringleri None'a çevir (nullable alanlar için)
                    if value == "":
                        value = None

                    setattr(instance, field, value)

            # --- FILE OPERATIONS ---
            for field in file_fields:
                clear_flag = is_truthy(data.get(f"{field}_clear"))
                new_file = files.get(field)

                old_file = getattr(instance, field)

                # CASE 1: yeni dosya gelmiş → her zaman override eder
                if new_file:
                    if old_file:
                        old_file.delete(save=False)

                    setattr(instance, field, new_file)

                # CASE 2: sadece clear yapılmış
                elif clear_flag:
                    if old_file:
                        old_file.delete(save=False)

                    setattr(instance, field, None)

            instance.save()



    @action(detail=False, methods=['post'])
    @method_decorator(
        action_resolver(
            redirect_default=True,
            redirect_url='settings',
            success_message="Mail ayarları başarıyla güncellendi!"
        )
    )
    def email_config_update(self, request, *args, **kwargs):
        settings_obj = AppSettings.objects.select_related("email_config").first()

        if not settings_obj:
            raise ValidationError("AppSettings bulunamadı")

        instance = settings_obj.email_config

        # yoksa oluştur (opsiyonel ama production'da gerekir)
        if not instance:
            instance = EmailConfig.objects.create()
            settings_obj.email_config = instance
            settings_obj.save()

        data = request.data

        with transaction.atomic():

            # TEXT / BASIC FIELDS
            if 'host' in data:
                instance.host = data.get('host') or None

            if 'default_password' in data:
                instance.default_password = data.get('default_password') or None

            # INTEGER FIELDS
            if 'port' in data:
                try:
                    instance.port = int(data.get('port'))
                except (TypeError, ValueError):
                    raise ValidationError("Port geçersiz")

            if 'timeout' in data:
                try:
                    instance.timeout = int(data.get('timeout'))
                except (TypeError, ValueError):
                    raise ValidationError("Timeout geçersiz")

            # BOOLEAN FIELDS
            if 'use_tls' in data:
                instance.use_tls = is_truthy(data.get('use_tls'))

            if 'use_ssl' in data:
                instance.use_ssl = is_truthy(data.get('use_ssl'))

            instance.save()