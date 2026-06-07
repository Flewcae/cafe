from django.core.management.base import BaseCommand

from authorizement.models import ExtendedPermission, ExtendedPermissionAction


class Command(BaseCommand):
    help = "Masa & Salon yönetimi için 'tables' yetkisini ve aksiyonlarını oluşturur"

    def handle(self, *args, **options):
        perm, created = ExtendedPermission.objects.get_or_create(
            code='tables',
            defaults={
                'name': 'Masa & Salon Yönetimi',
                'list_index': 100,
                'visible': True,
            },
        )

        # post_save signal normalde 4 aksiyonu otomatik oluşturur; idempotent
        # olması için yine de garanti altına alıyoruz.
        for act in ['add', 'change', 'delete', 'view']:
            ExtendedPermissionAction.objects.get_or_create(permission=perm, action=act)

        msg = "oluşturuldu" if created else "zaten mevcuttu"
        self.stdout.write(self.style.SUCCESS(f"✔ 'tables' yetkisi {msg}."))