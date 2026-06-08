from decimal import Decimal

from django.core.management.base import BaseCommand
from django.db import transaction

from menu.models import Category, Product, Menu


# ---------------------------------------------------------------------------
# Gerçekçi kafe / restoran menüsü (TL fiyatlarıyla)
# Yapı: (kategori adı, açıklama, [ (ürün, açıklama, fiyat, hazırlık_dk) ... ])
# ---------------------------------------------------------------------------
CATALOG = [
    ("Kahvaltı", "Güne güzel bir başlangıç", [
        ("Serpme Kahvaltı (Tek Kişilik)", "Peynir çeşitleri, zeytin, bal-kaymak, reçel, domates, salatalık", 220, 15),
        ("Menemen", "Domates, biber ve yumurta ile geleneksel lezzet", 145, 12),
        ("Sahanda Yumurta", "Tereyağında pişmiş çift yumurta", 95, 8),
        ("Sucuklu Yumurta", "Bol sucuklu, sahanda yumurta", 130, 10),
        ("Bal Kaymak", "Süzme kaymak ve süzme bal", 120, 5),
        ("Simit Tabağı", "Taze simit, peynir ve çay ile", 90, 5),
    ]),
    ("Çorbalar", "Günlük taze çorbalar", [
        ("Mercimek Çorbası", "Geleneksel kıvamında mercimek çorbası", 75, 5),
        ("Ezogelin Çorbası", "Bulgur ve mercimekli baharatlı çorba", 80, 5),
        ("Tavuk Suyu Çorba", "Şehriyeli tavuk suyu çorba", 85, 5),
        ("Yayla Çorbası", "Yoğurtlu, pirinçli yayla çorbası", 80, 6),
    ]),
    ("Başlangıçlar", "Paylaşmalık lezzetler", [
        ("Sigara Böreği (6 Adet)", "Peynirli, çıtır kızarmış börek", 110, 12),
        ("Humus", "Tahinli nohut ezmesi, zeytinyağı ile", 95, 5),
        ("Haydari", "Süzme yoğurt, sarımsak ve nane", 85, 5),
        ("Patates Kızartması", "Çıtır patates, yanında sos ile", 90, 10),
        ("Soğan Halkası (8 Adet)", "Çıtır kaplama soğan halkaları", 100, 10),
    ]),
    ("Salatalar", "Taze ve hafif seçenekler", [
        ("Mevsim Salata", "Mevsim yeşillikleri, domates, salatalık", 110, 8),
        ("Sezar Salata", "Marul, kruton, parmesan, sezar sos", 165, 10),
        ("Tavuklu Sezar Salata", "Izgara tavuklu sezar salata", 195, 14),
        ("Akdeniz Salata", "Roka, beyaz peynir, zeytin, ceviz", 150, 8),
    ]),
    ("Ana Yemekler", "Doyurucu ana yemekler", [
        ("Tavuk Sote", "Sebzeli tavuk sote, pilav ile", 215, 18),
        ("Et Sote", "Dana eti, sebzeli sote", 295, 20),
        ("İçli Köfte (2 Adet)", "El yapımı, bol cevizli içli köfte", 180, 15),
        ("Karnıyarık", "Kıymalı patlıcan, pilav ile", 235, 22),
        ("Fırın Tavuk", "Baharatlı fırın tavuk but, garnitür ile", 245, 25),
    ]),
    ("Izgaralar", "Mangal & ızgara çeşitleri", [
        ("Izgara Köfte", "El yapımı köfte, pilav ve salata ile", 265, 18),
        ("Tavuk Şiş", "Marine tavuk şiş, garnitür ile", 245, 18),
        ("Adana Kebap", "Acılı zırh kıyma kebap, lavaş ile", 320, 20),
        ("Urfa Kebap", "Acısız zırh kıyma kebap, lavaş ile", 320, 20),
        ("Karışık Izgara", "Köfte, tavuk ve kuzu şiş bir arada", 420, 25),
    ]),
    ("Makarnalar", "El yapımı soslarla", [
        ("Napoliten Makarna", "Domates soslu, fesleğenli makarna", 155, 14),
        ("Alfredo Makarna", "Kremalı, mantarlı tavuklu makarna", 195, 16),
        ("Pesto Makarna", "Fesleğen pesto soslu makarna", 175, 14),
    ]),
    ("Tatlılar", "Tatlı kaçamaklar", [
        ("Künefe", "Antep fıstıklı, sıcak servis", 175, 12),
        ("Sufle", "Akışkan çikolatalı sıcak sufle", 145, 12),
        ("Cheesecake", "Frambuazlı New York cheesecake", 155, 5),
        ("Tiramisu", "Kahveli, mascarpone kremalı", 150, 5),
        ("Sütlaç", "Fırında geleneksel sütlaç", 110, 5),
    ]),
    ("Sıcak İçecekler", "Sıcacık molalar", [
        ("Türk Kahvesi", "Geleneksel közde Türk kahvesi", 60, 6),
        ("Espresso", "Tek shot espresso", 65, 3),
        ("Americano", "Sıcak su ile espresso", 80, 4),
        ("Latte", "Espresso ve buharlı süt", 95, 5),
        ("Cappuccino", "Espresso, süt ve süt köpüğü", 95, 5),
        ("Sıcak Çikolata", "Yoğun sıcak çikolata", 100, 5),
        ("Çay", "Demli siyah çay", 30, 3),
        ("Bitki Çayı", "Ihlamur, adaçayı veya nane-limon", 55, 4),
    ]),
    ("Soğuk İçecekler", "Serinleten içecekler", [
        ("Ice Latte", "Buzlu sütlü kahve", 105, 5),
        ("Ev Yapımı Limonata", "Taze sıkılmış limon ve nane", 90, 5),
        ("Taze Sıkma Portakal Suyu", "Günlük sıkılmış portakal suyu", 100, 5),
        ("Ayran", "Geleneksel köpüklü ayran", 40, 2),
        ("Su (0.5 L)", "Doğal kaynak suyu", 20, 1),
        ("Maden Suyu", "Sade veya meyveli", 45, 1),
        ("Kola", "Soğuk gazlı içecek", 55, 1),
        ("Milkshake", "Çikolatalı, çilekli veya muzlu", 130, 6),
    ]),
]


# Menüler: ürünlerden derlenen isimli listeler.
#   - "Ana Menü": tüm ürünleri içerir.
#   - Diğerleri: belirli kategorilerin ürünlerini içerir.
# (kategori filtresi None ise tüm kategoriler dâhil edilir)
MENUS = [
    ("Ana Menü", "İşletmenin tüm ürünlerini içeren genel menü", None),
    ("İçecek Menüsü", "Sıcak ve soğuk içecekler", ["Sıcak İçecekler", "Soğuk İçecekler"]),
    ("Tatlı Menüsü", "Tatlı çeşitleri", ["Tatlılar"]),
    ("Kahvaltı Menüsü", "Kahvaltılık ürünler ve sıcak içecekler", ["Kahvaltı", "Sıcak İçecekler"]),
]


class Command(BaseCommand):
    help = "Gerçekçi kafe/restoran kategorileri, ürünleri ve ürün-listesi menülerini oluşturur (idempotent)."

    def add_arguments(self, parser):
        parser.add_argument(
            '--flush',
            action='store_true',
            help="Eklemeden önce mevcut tüm kategori, ürün ve menüleri siler.",
        )

    @transaction.atomic
    def handle(self, *args, **options):
        if options['flush']:
            self.stdout.write(self.style.WARNING("Mevcut menü verileri siliniyor..."))
            Menu.objects.all().delete()
            Product.objects.all().delete()
            Category.objects.all().delete()

        cat_created = prod_created = menu_created = 0
        # kategori adı -> o kategorinin ürün listesi
        products_by_cat = {}

        # --- Kategoriler & ürünler ---
        for c_idx, (cat_name, cat_desc, products) in enumerate(CATALOG):
            category, c_new = Category.objects.get_or_create(
                name=cat_name,
                defaults={'description': cat_desc, 'list_index': c_idx, 'is_active': True},
            )
            if c_new:
                cat_created += 1

            products_by_cat.setdefault(cat_name, [])
            for p_idx, (p_name, p_desc, price, prep) in enumerate(products):
                product, p_new = Product.objects.get_or_create(
                    category=category,
                    name=p_name,
                    defaults={
                        'description': p_desc,
                        'price': Decimal(str(price)),
                        'preparation_time': prep,
                        'list_index': p_idx,
                        'is_active': True,
                        'is_available': True,
                    },
                )
                if p_new:
                    prod_created += 1
                products_by_cat[cat_name].append(product)

        # --- Menüler (ürün listeleri) ---
        for m_idx, (menu_name, menu_desc, cat_filter) in enumerate(MENUS):
            menu, m_new = Menu.objects.get_or_create(
                name=menu_name,
                defaults={'description': menu_desc, 'list_index': m_idx, 'is_active': True},
            )
            if m_new:
                menu_created += 1

            if cat_filter is None:
                selected = [p for plist in products_by_cat.values() for p in plist]
            else:
                selected = [p for cat in cat_filter for p in products_by_cat.get(cat, [])]

            menu.products.set(selected)

        self.stdout.write(self.style.SUCCESS(
            f"✔ Tamamlandı — {cat_created} kategori, {prod_created} ürün, {menu_created} menü oluşturuldu."
        ))
        self.stdout.write(
            f"  Toplam: {Category.objects.count()} kategori · "
            f"{Product.objects.count()} ürün · {Menu.objects.count()} menü."
        )