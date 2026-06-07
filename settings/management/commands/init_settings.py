import os
from django.conf import settings
from django.core.management.base import BaseCommand, CommandError
from django.core.files import File

from settings.models import Organization, EmailConfig, AppSettings


class Command(BaseCommand):
    help = "Initialize default settings with logos"

    def handle(self, *args, **kwargs):
        media_root = settings.MEDIA_ROOT
        logo_path = os.path.join(media_root, "organization_logos")

        # Beklenen dosyalar
        required_files = {
            "logo_light": "helpifly-light.png",
            "logo_dark": "helpifly-dark.png",
            "logo_min_light": "helpifly-sm.png",
            "logo_min_dark": "helpifly-sm.png",
            "favicon": "favicon.ico",
        }

        file_objects = {}

        # Dosya kontrolü
        for field, filename in required_files.items():
            full_path = os.path.join(logo_path, filename)

            if not os.path.exists(full_path):
                raise CommandError(
                    f"❌ Eksik dosya: {filename}\n"
                    f"Lütfen şu klasöre ekleyin: {logo_path}"
                )

            file_objects[field] = open(full_path, "rb")

        # Organization oluştur
        organization, _ = Organization.objects.get_or_create(
            defaults={
                "name": "Abra Uygulaması",
                "theme_color": "#b89567",
            }
        )

        # Dosyaları ata (sadece boşsa)
        if not organization.logo_light:
            organization.logo_light.save(
                required_files["logo_light"],
                File(file_objects["logo_light"]),
                save=False
            )

        if not organization.logo_dark:
            organization.logo_dark.save(
                required_files["logo_dark"],
                File(file_objects["logo_dark"]),
                save=False
            )

        if not organization.logo_min_light:
            organization.logo_min_light.save(
                required_files["logo_min_light"],
                File(file_objects["logo_min_light"]),
                save=False
            )

        if not organization.logo_min_dark:
            organization.logo_min_dark.save(
                required_files["logo_min_dark"],
                File(file_objects["logo_min_dark"]),
                save=False
            )

        if not organization.favicon:
            organization.favicon.save(
                required_files["favicon"],
                File(file_objects["favicon"]),
                save=False
            )

        organization.save()

        # EmailConfig
        email_config, _ = EmailConfig.objects.get_or_create(
            defaults={
                "host": "smtp.example.com",
                "port": 587,
                "use_tls": True,
                "use_ssl": False,
                "default_password": "change_me",
                "timeout": 10,
            }
        )

        # AppSettings
        app_settings, _ = AppSettings.objects.get_or_create(
            organization=organization,
            defaults={"email_config": email_config}
        )

        if not app_settings.email_config:
            app_settings.email_config = email_config
            app_settings.save()

        self.stdout.write(self.style.SUCCESS("✔ Tüm ayarlar ve logolar hazır"))