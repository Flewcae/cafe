from decimal import Decimal, InvalidOperation

from django.conf import settings
from django.db import models, transaction
from django.utils import timezone

from cafe.action_resolver import UserGenException


# ---------------------------------------------------------------------------
# Form-data parsing helpers (mirror dining/menu conventions)
# ---------------------------------------------------------------------------
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
        return Decimal(str(value).replace(',', '.'))
    except (InvalidOperation, TypeError, ValueError):
        raise UserGenException("Tutar geçerli bir sayı olmalıdır.")


# ---------------------------------------------------------------------------
# Order  (bir masaya ya da paket servise ait adisyon)
# ---------------------------------------------------------------------------
class Order(models.Model):
    STATUS_OPEN = 'open'
    STATUS_PREPARING = 'preparing'
    STATUS_SERVED = 'served'
    STATUS_PAID = 'paid'
    STATUS_CANCELLED = 'cancelled'

    STATUS_CHOICES = [
        (STATUS_OPEN, 'Açık'),
        (STATUS_PREPARING, 'Hazırlanıyor'),
        (STATUS_SERVED, 'Servis Edildi'),
        (STATUS_PAID, 'Ödendi'),
        (STATUS_CANCELLED, 'İptal'),
    ]

    # Kapanmış (artık aktif olmayan) durumlar
    CLOSED_STATUSES = {STATUS_PAID, STATUS_CANCELLED}

    TYPE_DINE_IN = 'dine_in'
    TYPE_TAKEAWAY = 'takeaway'

    TYPE_CHOICES = [
        (TYPE_DINE_IN, 'Masada'),
        (TYPE_TAKEAWAY, 'Paket / Gel-Al'),
    ]

    table = models.ForeignKey(
        'dining.Table', on_delete=models.SET_NULL, null=True, blank=True,
        related_name='orders', verbose_name="Masa",
    )
    order_type = models.CharField(
        max_length=10, choices=TYPE_CHOICES, default=TYPE_DINE_IN, verbose_name="Sipariş Tipi"
    )
    status = models.CharField(
        max_length=10, choices=STATUS_CHOICES, default=STATUS_OPEN, verbose_name="Durum"
    )
    note = models.TextField(null=True, blank=True, verbose_name="Not")

    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True,
        related_name='created_orders', verbose_name="Oluşturan",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    closed_at = models.DateTimeField(null=True, blank=True, verbose_name="Kapanış Zamanı")

    class Meta:
        verbose_name = "Sipariş"
        verbose_name_plural = "Siparişler"
        ordering = ['-created_at']

    def __str__(self):
        target = self.table.name if self.table else 'Paket'
        return f"Adisyon #{self.id} - {target}"

    @property
    def code(self):
        return f"#{self.id}"

    @property
    def is_open(self):
        return self.status not in self.CLOSED_STATUSES

    @property
    def status_color(self):
        return {
            self.STATUS_OPEN: 'info',
            self.STATUS_PREPARING: 'warning',
            self.STATUS_SERVED: 'primary',
            self.STATUS_PAID: 'success',
            self.STATUS_CANCELLED: 'secondary',
        }.get(self.status, 'secondary')

    @property
    def active_items(self):
        return self.items.exclude(status=OrderItem.STATUS_CANCELLED)

    @property
    def item_count(self):
        return sum(i.quantity for i in self.active_items)

    @property
    def subtotal(self):
        return sum((i.line_total for i in self.active_items), Decimal('0'))

    @property
    def total(self):
        # Şimdilik indirim/servis bedeli yok; subtotal = total.
        return self.subtotal

    @property
    def total_paid(self):
        return sum((r.amount for r in self.receipts.all()), Decimal('0'))

    @property
    def balance(self):
        return self.total - self.total_paid

    @property
    def is_fully_paid(self):
        return self.total > 0 and self.balance <= 0

    # ------------------------------------------------------------------ #
    # Masa durum senkronizasyonu
    # ------------------------------------------------------------------ #
    def _occupy_table(self):
        from dining.models import Table
        if self.table_id and self.table.status != Table.STATUS_OCCUPIED:
            self.table.status = Table.STATUS_OCCUPIED
            self.table.save(update_fields=['status'])

    def _release_table_if_free(self):
        """Masada başka açık adisyon yoksa masayı boşa çek."""
        from dining.models import Table
        if not self.table_id:
            return
        others = (
            Order.objects
            .filter(table_id=self.table_id)
            .exclude(pk=self.pk)
            .exclude(status__in=self.CLOSED_STATUSES)
            .exists()
        )
        if not others and self.table.status == Table.STATUS_OCCUPIED:
            self.table.status = Table.STATUS_EMPTY
            self.table.save(update_fields=['status'])

    # ------------------------------------------------------------------ #
    # Form aksiyonları
    # ------------------------------------------------------------------ #
    @classmethod
    def _resolve_table(cls, table_id):
        from dining.models import Table
        try:
            return Table.objects.get(id=table_id)
        except Table.DoesNotExist:
            raise UserGenException("Seçilen masa bulunamadı.")

    @classmethod
    def create_from_form(cls, form_data, user=None):
        order_type = form_data.get('order_type') or cls.TYPE_DINE_IN
        if order_type not in [c[0] for c in cls.TYPE_CHOICES]:
            order_type = cls.TYPE_DINE_IN

        table = None
        if order_type == cls.TYPE_DINE_IN:
            table_id = form_data.get('table')
            if not table_id:
                raise UserGenException("Masada sipariş için masa seçimi zorunludur.")
            table = cls._resolve_table(table_id)

        with transaction.atomic():
            order = cls.objects.create(
                table=table,
                order_type=order_type,
                note=(form_data.get('note') or None),
                created_by=user if (user and user.is_authenticated) else None,
            )
            order._occupy_table()
        return order

    def add_item_from_form(self, form_data):
        from menu.models import Product

        product_id = form_data.get('product')
        if not product_id:
            raise UserGenException("Ürün seçimi zorunludur.")
        try:
            product = Product.objects.get(id=product_id)
        except Product.DoesNotExist:
            raise UserGenException("Seçilen ürün bulunamadı.")

        if not product.is_active:
            raise UserGenException("Pasif bir ürün siparişe eklenemez.")

        quantity = _to_int(form_data.get('quantity'), 1)
        if quantity < 1:
            raise UserGenException("Adet en az 1 olmalıdır.")

        if not self.is_open:
            raise UserGenException("Kapanmış bir adisyona ürün eklenemez.")

        # Aynı üründen daha önce eklenmiş aktif kalem varsa adedini artır.
        existing = self.items.filter(
            product=product, status=OrderItem.STATUS_PENDING
        ).first()
        if existing:
            existing.quantity += quantity
            existing.save(update_fields=['quantity'])
            return existing

        return OrderItem.objects.create(
            order=self,
            product=product,
            name=product.name,
            unit_price=product.price,
            quantity=quantity,
            note=(form_data.get('note') or None),
        )

    def set_status(self, status):
        if status not in [c[0] for c in self.STATUS_CHOICES]:
            raise UserGenException("Geçersiz sipariş durumu.")

        with transaction.atomic():
            self.status = status
            if status in self.CLOSED_STATUSES and not self.closed_at:
                self.closed_at = timezone.now()
            if status not in self.CLOSED_STATUSES:
                self.closed_at = None
            self.save(update_fields=['status', 'closed_at', 'updated_at'])

            if status in self.CLOSED_STATUSES:
                self._release_table_if_free()
            else:
                self._occupy_table()
        return self

    def cancel(self):
        return self.set_status(self.STATUS_CANCELLED)

    def add_payment_from_form(self, form_data, user=None):
        if not self.is_open:
            raise UserGenException("Kapanmış bir adisyona ödeme eklenemez.")
        if self.total <= 0:
            raise UserGenException("Boş bir adisyon için ödeme alınamaz.")

        with transaction.atomic():
            receipt = Receipt.create_from_form(self, form_data, user=user)
            if self.is_fully_paid:
                self.set_status(self.STATUS_PAID)
        return receipt


# ---------------------------------------------------------------------------
# OrderItem  (adisyon kalemi — ürün adı ve fiyatı sipariş anında kopyalanır)
# ---------------------------------------------------------------------------
class OrderItem(models.Model):
    STATUS_PENDING = 'pending'
    STATUS_PREPARING = 'preparing'
    STATUS_SERVED = 'served'
    STATUS_CANCELLED = 'cancelled'

    STATUS_CHOICES = [
        (STATUS_PENDING, 'Beklemede'),
        (STATUS_PREPARING, 'Hazırlanıyor'),
        (STATUS_SERVED, 'Servis Edildi'),
        (STATUS_CANCELLED, 'İptal'),
    ]

    order = models.ForeignKey(
        Order, on_delete=models.CASCADE, related_name='items', verbose_name="Sipariş"
    )
    product = models.ForeignKey(
        'menu.Product', on_delete=models.SET_NULL, null=True, blank=True,
        related_name='order_items', verbose_name="Ürün",
    )
    name = models.CharField(max_length=150, verbose_name="Ürün Adı")
    unit_price = models.DecimalField(max_digits=10, decimal_places=2, default=0, verbose_name="Birim Fiyat")
    quantity = models.PositiveIntegerField(default=1, verbose_name="Adet")
    note = models.TextField(null=True, blank=True, verbose_name="Not")
    status = models.CharField(
        max_length=10, choices=STATUS_CHOICES, default=STATUS_PENDING, verbose_name="Durum"
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = "Sipariş Kalemi"
        verbose_name_plural = "Sipariş Kalemleri"
        ordering = ['id']

    def __str__(self):
        return f"{self.quantity}× {self.name}"

    @property
    def line_total(self):
        return self.unit_price * self.quantity

    @property
    def status_color(self):
        return {
            self.STATUS_PENDING: 'secondary',
            self.STATUS_PREPARING: 'warning',
            self.STATUS_SERVED: 'success',
            self.STATUS_CANCELLED: 'danger',
        }.get(self.status, 'secondary')

    def update_from_form(self, form_data):
        if not self.order.is_open:
            raise UserGenException("Kapanmış bir adisyonun kalemi düzenlenemez.")

        if 'quantity' in form_data:
            quantity = _to_int(form_data.get('quantity'), self.quantity)
            if quantity < 1:
                raise UserGenException("Adet en az 1 olmalıdır.")
            self.quantity = quantity

        status = form_data.get('status')
        if status and status in [c[0] for c in self.STATUS_CHOICES]:
            self.status = status

        if 'note' in form_data:
            self.note = form_data.get('note') or None

        self.save()
        return self


# ---------------------------------------------------------------------------
# Receipt  (adisyona kesilen ödeme / adisyon fişi)
# ---------------------------------------------------------------------------
class Receipt(models.Model):
    METHOD_CASH = 'cash'
    METHOD_CARD = 'card'
    METHOD_OTHER = 'other'

    METHOD_CHOICES = [
        (METHOD_CASH, 'Nakit'),
        (METHOD_CARD, 'Kredi Kartı'),
        (METHOD_OTHER, 'Diğer'),
    ]

    order = models.ForeignKey(
        Order, on_delete=models.CASCADE, related_name='receipts', verbose_name="Sipariş"
    )
    method = models.CharField(
        max_length=10, choices=METHOD_CHOICES, default=METHOD_CASH, verbose_name="Ödeme Yöntemi"
    )
    amount = models.DecimalField(max_digits=10, decimal_places=2, default=0, verbose_name="Tutar")
    note = models.TextField(null=True, blank=True, verbose_name="Not")

    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True,
        related_name='collected_receipts', verbose_name="Tahsil Eden",
    )
    paid_at = models.DateTimeField(auto_now_add=True, verbose_name="Ödeme Zamanı")

    class Meta:
        verbose_name = "Adisyon Fişi"
        verbose_name_plural = "Adisyon Fişleri"
        ordering = ['-paid_at']

    def __str__(self):
        return f"{self.order.code} - {self.get_method_display()} - {self.amount}"

    @property
    def code(self):
        return f"F#{self.id}"

    @classmethod
    def create_from_form(cls, order, form_data, user=None):
        method = form_data.get('method') or cls.METHOD_CASH
        if method not in [c[0] for c in cls.METHOD_CHOICES]:
            method = cls.METHOD_CASH

        amount = _to_decimal(form_data.get('amount'), Decimal('0'))
        if amount <= 0:
            raise UserGenException("Ödeme tutarı sıfırdan büyük olmalıdır.")
        if amount > order.balance:
            raise UserGenException("Ödeme tutarı, kalan adisyon tutarını aşamaz.")

        return cls.objects.create(
            order=order,
            method=method,
            amount=amount,
            note=(form_data.get('note') or None),
            created_by=user if (user and user.is_authenticated) else None,
        )