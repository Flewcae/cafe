from decimal import Decimal, InvalidOperation

from django.db import models

from cafe.action_resolver import UserGenException


# ---------------------------------------------------------------------------
# Form-data parsing helpers (mirror dining.models conventions)
# ---------------------------------------------------------------------------
def _to_float(value, default=0):
    if value is None or value == "":
        return default
    try:
        return float(value)
    except (TypeError, ValueError):
        raise UserGenException("Sayısal alan geçerli bir sayı olmalıdır.")


def _to_int(value, default):
    if value is None or value == "":
        return default
    try:
        return int(value)
    except (TypeError, ValueError):
        raise UserGenException("Sayısal alan geçerli bir tam sayı olmalıdır.")


def _to_decimal(value, default=Decimal('0')):
    if value is None or value == "":
        return default
    try:
        # kullanıcı "12,50" ya da "12.50" yazabilir
        return Decimal(str(value).replace(',', '.'))
    except (InvalidOperation, TypeError, ValueError):
        raise UserGenException("Fiyat geçerli bir tutar olmalıdır.")


def _is_truthy(value):
    return str(value).lower() in ['1', 'true', 'on', 'yes']


def _apply_image(instance, files, form_data, field='image', upload_field='image'):
    """Ortak görsel işleme: yeni dosya / temizleme / koru."""
    image = files.get(field) if files else None
    clear = _is_truthy(form_data.get('image_clear') or form_data.get('image-clear'))

    if image:
        setattr(instance, upload_field, image)
    elif clear:
        setattr(instance, upload_field, None)
    # aksi halde mevcut görsel korunur


# ---------------------------------------------------------------------------
# Category  (ürün kategorisi — örn. Başlangıçlar, Ana Yemekler, İçecekler)
# ---------------------------------------------------------------------------
class Category(models.Model):
    name = models.CharField(max_length=100, verbose_name="Kategori Adı")
    description = models.TextField(null=True, blank=True, verbose_name="Açıklama")
    image = models.ImageField(upload_to='menu/categories/', null=True, blank=True, verbose_name="Görsel")
    list_index = models.FloatField(default=0, verbose_name="Sıralama")
    is_active = models.BooleanField(default=True, verbose_name="Aktif")

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = "Kategori"
        verbose_name_plural = "Kategoriler"
        ordering = ['list_index', 'name']

    def __str__(self):
        return self.name

    @property
    def code(self):
        return f"#{self.id}"

    @property
    def product_count(self):
        return self.products.count()

    @property
    def active_product_count(self):
        return self.products.filter(is_active=True).count()

    @classmethod
    def create_from_form(cls, form_data, files=None):
        name = (form_data.get('name') or '').strip()
        if not name:
            raise UserGenException("Kategori adı zorunludur.")
        if cls.objects.filter(name=name).exists():
            raise UserGenException("Bu isimde bir kategori zaten mevcut.")

        instance = cls(
            name=name,
            description=(form_data.get('description') or None),
            list_index=_to_float(form_data.get('list_index'), 0),
            is_active=_is_truthy(form_data.get('is_active', '1')),
        )
        _apply_image(instance, files, form_data)
        instance.save()
        return instance

    @classmethod
    def update_from_form(cls, instance, form_data, files=None):
        name = (form_data.get('name') or '').strip()
        if not name:
            raise UserGenException("Kategori adı zorunludur.")
        if name != instance.name and cls.objects.filter(name=name).exists():
            raise UserGenException("Bu isimde bir kategori zaten mevcut.")

        instance.name = name
        instance.description = (form_data.get('description') or None)
        if 'list_index' in form_data:
            instance.list_index = _to_float(form_data.get('list_index'), instance.list_index)
        if 'is_active' in form_data:
            instance.is_active = _is_truthy(form_data.get('is_active'))
        _apply_image(instance, files, form_data)
        instance.save()
        return instance


# ---------------------------------------------------------------------------
# Product  (kategoriye ait satılabilir ürün)
# ---------------------------------------------------------------------------
class Product(models.Model):
    category = models.ForeignKey(
        Category, on_delete=models.CASCADE, related_name='products', verbose_name="Kategori"
    )
    name = models.CharField(max_length=150, verbose_name="Ürün Adı")
    description = models.TextField(null=True, blank=True, verbose_name="Açıklama")
    price = models.DecimalField(max_digits=10, decimal_places=2, default=0, verbose_name="Fiyat")
    image = models.ImageField(upload_to='menu/products/', null=True, blank=True, verbose_name="Görsel")
    preparation_time = models.PositiveIntegerField(
        null=True, blank=True, verbose_name="Hazırlık Süresi (dk)"
    )

    is_active = models.BooleanField(default=True, verbose_name="Aktif")
    is_available = models.BooleanField(default=True, verbose_name="Servise Açık")

    list_index = models.FloatField(default=0, verbose_name="Sıralama")

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = "Ürün"
        verbose_name_plural = "Ürünler"
        ordering = ['category', 'list_index', 'name']

    def __str__(self):
        return f"{self.category.name} - {self.name}"

    @property
    def code(self):
        return f"#{self.category_id}-{self.id}"

    @property
    def status_color(self):
        if not self.is_active:
            return 'secondary'
        return 'success' if self.is_available else 'warning'

    @property
    def status_label(self):
        if not self.is_active:
            return 'Pasif'
        return 'Servise Açık' if self.is_available else 'Tükendi'

    @classmethod
    def _resolve_category(cls, category_id):
        if not category_id:
            raise UserGenException("Kategori seçimi zorunludur.")
        try:
            return Category.objects.get(id=category_id)
        except Category.DoesNotExist:
            raise UserGenException("Seçilen kategori bulunamadı.")

    @classmethod
    def create_from_form(cls, form_data, files=None):
        category = cls._resolve_category(form_data.get('category'))
        name = (form_data.get('name') or '').strip()
        if not name:
            raise UserGenException("Ürün adı zorunludur.")

        price = _to_decimal(form_data.get('price'), Decimal('0'))
        if price < 0:
            raise UserGenException("Fiyat negatif olamaz.")

        if cls.objects.filter(category=category, name=name).exists():
            raise UserGenException("Bu kategoride aynı isimde bir ürün zaten var.")

        instance = cls(
            category=category,
            name=name,
            description=(form_data.get('description') or None),
            price=price,
            preparation_time=(_to_int(form_data.get('preparation_time'), None)
                              if form_data.get('preparation_time') else None),
            list_index=_to_float(form_data.get('list_index'), 0),
            is_active=_is_truthy(form_data.get('is_active', '1')),
            is_available=_is_truthy(form_data.get('is_available', '1')),
        )
        _apply_image(instance, files, form_data)
        instance.save()
        return instance

    @classmethod
    def update_from_form(cls, instance, form_data, files=None):
        category = cls._resolve_category(form_data.get('category', instance.category_id))
        name = (form_data.get('name') or '').strip()
        if not name:
            raise UserGenException("Ürün adı zorunludur.")

        price = _to_decimal(form_data.get('price'), instance.price)
        if price < 0:
            raise UserGenException("Fiyat negatif olamaz.")

        if cls.objects.filter(category=category, name=name).exclude(pk=instance.pk).exists():
            raise UserGenException("Bu kategoride aynı isimde bir ürün zaten var.")

        instance.category = category
        instance.name = name
        instance.description = (form_data.get('description') or None)
        instance.price = price

        if 'preparation_time' in form_data:
            pt = form_data.get('preparation_time')
            instance.preparation_time = _to_int(pt, None) if pt else None
        if 'list_index' in form_data:
            instance.list_index = _to_float(form_data.get('list_index'), instance.list_index)
        if 'is_active' in form_data:
            instance.is_active = _is_truthy(form_data.get('is_active'))
        if 'is_available' in form_data:
            instance.is_available = _is_truthy(form_data.get('is_available'))

        _apply_image(instance, files, form_data)
        instance.save()
        return instance

    def toggle_availability(self):
        self.is_available = not self.is_available
        self.save(update_fields=['is_available'])
        return self


# ---------------------------------------------------------------------------
# Menu  (isimlendirilmiş ürün listesi — örn. "Ana Menü", "İçecek Menüsü")
#  -> Bir öğün/paket DEĞİLDİR. Sadece ürünlerin derlendiği bir listedir;
#     her ürün listede kendi fiyatıyla görünür.
# ---------------------------------------------------------------------------
class Menu(models.Model):
    name = models.CharField(max_length=120, verbose_name="Menü Adı")
    description = models.TextField(null=True, blank=True, verbose_name="Açıklama")
    is_active = models.BooleanField(default=True, verbose_name="Aktif")
    list_index = models.FloatField(default=0, verbose_name="Sıralama")

    products = models.ManyToManyField(
        Product, related_name='menus', blank=True, verbose_name="Ürünler"
    )

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = "Menü"
        verbose_name_plural = "Menüler"
        ordering = ['list_index', 'name']

    def __str__(self):
        return self.name

    @property
    def code(self):
        return f"#{self.id}"

    @property
    def product_count(self):
        return self.products.count()

    @property
    def category_count(self):
        return self.products.values('category').distinct().count()

    def products_by_category(self):
        """Menüdeki ürünleri kategoriye göre gruplar -> [(Category, [Product, ...]), ...]."""
        grouped = {}
        qs = self.products.select_related('category').order_by(
            'category__list_index', 'category__name', 'list_index', 'name'
        )
        for product in qs:
            grouped.setdefault(product.category, []).append(product)
        return list(grouped.items())

    @classmethod
    def create_from_form(cls, form_data):
        name = (form_data.get('name') or '').strip()
        if not name:
            raise UserGenException("Menü adı zorunludur.")
        if cls.objects.filter(name=name).exists():
            raise UserGenException("Bu isimde bir menü zaten mevcut.")

        return cls.objects.create(
            name=name,
            description=(form_data.get('description') or None),
            list_index=_to_float(form_data.get('list_index'), 0),
            is_active=_is_truthy(form_data.get('is_active', '1')),
        )

    @classmethod
    def update_from_form(cls, instance, form_data):
        name = (form_data.get('name') or '').strip()
        if not name:
            raise UserGenException("Menü adı zorunludur.")
        if name != instance.name and cls.objects.filter(name=name).exists():
            raise UserGenException("Bu isimde bir menü zaten mevcut.")

        instance.name = name
        instance.description = (form_data.get('description') or None)
        if 'list_index' in form_data:
            instance.list_index = _to_float(form_data.get('list_index'), instance.list_index)
        if 'is_active' in form_data:
            instance.is_active = _is_truthy(form_data.get('is_active'))
        instance.save()
        return instance

    def set_products(self, form_data):
        """Menü-builder formundan gelen ürün seçimini menüye uygular (tam senkron).

        Beklenen alan:
          - selected_products: birden çok product id (getlist)
        """
        selected = form_data.getlist('selected_products') if hasattr(form_data, 'getlist') \
            else (form_data.get('selected_products') or [])
        try:
            selected_ids = {int(pid) for pid in selected if str(pid).strip()}
        except (TypeError, ValueError):
            raise UserGenException("Geçersiz ürün seçimi.")

        valid = Product.objects.filter(id__in=selected_ids)
        self.products.set(valid)
        return self