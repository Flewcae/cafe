import os

from django.core.management.base import BaseCommand
from django.urls import reverse

from dining.models import Room
from dining.qr import make_qr_png, safe_name


class Command(BaseCommand):
    help = "Tüm aktif masalar için kalıcı QR PNG dosyalarını bir klasöre üretir."

    def add_arguments(self, parser):
        parser.add_argument(
            '--base-url', required=True,
            help="Sitenin kök adresi, örn: https://infaktabirlik.com",
        )
        parser.add_argument('--out', default='qrcodes', help="Çıktı klasörü (varsayılan: qrcodes)")

    def handle(self, *args, **opts):
        base = opts['base_url'].rstrip('/')
        out = opts['out']

        rooms = (
            Room.objects.filter(is_active=True)
            .prefetch_related('tables')
            .order_by('list_index', 'name')
        )

        count = 0
        manifest = []
        for room in rooms:
            room_dir = os.path.join(out, safe_name(room.name))
            os.makedirs(room_dir, exist_ok=True)
            for table in room.tables.all():
                url = base + reverse('customer_menu', args=[table.qr_token])
                fpath = os.path.join(room_dir, f"{safe_name(table.name)}.png")
                with open(fpath, 'wb') as f:
                    f.write(make_qr_png(url))
                manifest.append(f"{room.name} / {table.name}: {url}")
                count += 1
                self.stdout.write(self.style.SUCCESS(f"✓ {room.name} / {table.name}"))

        with open(os.path.join(out, 'urls.txt'), 'w', encoding='utf-8') as f:
            f.write("\n".join(manifest))

        self.stdout.write(self.style.SUCCESS(f"Tamamlandı: {count} QR üretildi → {out}/"))