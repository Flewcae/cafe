import time
import requests

from django.core.management.base import BaseCommand
from django.core.files.base import ContentFile
from django.utils.text import slugify
from django.db.models import Q

from ddgs import DDGS

from menu.models import Product


class Command(BaseCommand):
    help = "Görseli olmayan ürünlere otomatik görsel ekler"

    def handle(self, *args, **options):

        products = Product.objects.filter(
            Q(image__isnull=True) | Q(image='')
        )
        total = products.count()

        self.stdout.write(
            self.style.WARNING(
                f"{total} adet ürün işlenecek."
            )
        )

        with DDGS() as ddgs:

            for product in products:

                try:
                    self.stdout.write(
                        f"Aranıyor: {product.name}"
                    )

                    query = f"{product.name} food photo"

                    results = list(
                        ddgs.images(
                            query,
                            max_results=10
                        )
                    )

                    image_url = None

                    for result in results:

                        candidate = (
                            result.get("image")
                            or result.get("thumbnail")
                        )

                        if not candidate:
                            continue

                        lower = candidate.lower()

                        if any(
                            x in lower
                            for x in [
                                "logo",
                                "icon",
                                "svg",
                                ".gif"
                            ]
                        ):
                            continue

                        image_url = candidate
                        break

                    if not image_url:
                        self.stdout.write(
                            self.style.ERROR(
                                f"Görsel bulunamadı -> {product.name}"
                            )
                        )
                        continue

                    response = requests.get(
                        image_url,
                        timeout=20,
                        headers={
                            "User-Agent": (
                                "Mozilla/5.0"
                            )
                        }
                    )

                    if response.status_code != 200:
                        raise Exception(
                            f"HTTP {response.status_code}"
                        )

                    content_type = response.headers.get(
                        "content-type",
                        ""
                    )

                    if "image" not in content_type:
                        raise Exception(
                            "Dosya görsel değil"
                        )

                    filename = (
                        f"{slugify(product.name)}.jpg"
                    )

                    product.image.save(
                        filename,
                        ContentFile(response.content),
                        save=True
                    )

                    self.stdout.write(
                        self.style.SUCCESS(
                            f"✓ {product.name}"
                        )
                    )

                    time.sleep(1)

                except Exception as e:
                    self.stdout.write(
                        self.style.ERROR(
                            f"✗ {product.name} -> {e}"
                        )
                    )

        self.stdout.write(
            self.style.SUCCESS(
                "İşlem tamamlandı."
            )
        )