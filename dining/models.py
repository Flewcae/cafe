from django.db import models

from cafe.action_resolver import UserGenException


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


def _num(value, default):
    """JSON düzen verisi için hata fırlatmayan güvenli sayı dönüşümü."""
    if value is None or value == "":
        return default
    try:
        return float(value)
    except (TypeError, ValueError):
        return default


class Room(models.Model):
    """Bir salon / alan (örn. İç Salon, Bahçe, Teras, VIP).

    Her salonun, masaların kuş bakışı yerleştirildiği bir kanvası vardır.
    """

    name = models.CharField(max_length=100, verbose_name="Salon Adı")
    description = models.TextField(null=True, blank=True, verbose_name="Açıklama")
    list_index = models.FloatField(default=0, verbose_name="Sıralama")
    is_active = models.BooleanField(default=True, verbose_name="Aktif")

    # Kuş bakışı yerleşim kanvası boyutları (px)
    canvas_width = models.PositiveIntegerField(default=1000, verbose_name="Kanvas Genişliği")
    canvas_height = models.PositiveIntegerField(default=700, verbose_name="Kanvas Yüksekliği")

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = "Salon"
        verbose_name_plural = "Salonlar"
        ordering = ['list_index', 'name']

    def __str__(self):
        return self.name

    @property
    def code(self):
        return f"#{self.id}"

    @property
    def table_count(self):
        return self.tables.count()

    @property
    def total_capacity(self):
        return sum(t.capacity for t in self.tables.all())

    @classmethod
    def create_from_form(cls, form_data):
        name = (form_data.get('name') or '').strip()
        description = form_data.get('description', None)
        list_index = _to_float(form_data.get('list_index'), 0)
        canvas_width = _to_int(form_data.get('canvas_width'), 1000)
        canvas_height = _to_int(form_data.get('canvas_height'), 700)

        if not name:
            raise UserGenException("Salon adı zorunludur.")
        if cls.objects.filter(name=name).exists():
            raise UserGenException("Bu isimde bir salon zaten mevcut.")

        return cls.objects.create(
            name=name,
            description=description or None,
            list_index=list_index,
            canvas_width=max(200, canvas_width),
            canvas_height=max(200, canvas_height),
        )

    @classmethod
    def update_from_form(cls, instance, form_data):
        name = (form_data.get('name') or '').strip()
        description = form_data.get('description', None)

        if not name:
            raise UserGenException("Salon adı zorunludur.")
        if name != instance.name and cls.objects.filter(name=name).exists():
            raise UserGenException("Bu isimde bir salon zaten mevcut.")

        instance.name = name
        instance.description = description or None
        if 'list_index' in form_data:
            instance.list_index = _to_float(form_data.get('list_index'), instance.list_index)
        if 'canvas_width' in form_data:
            instance.canvas_width = max(200, _to_int(form_data.get('canvas_width'), instance.canvas_width))
        if 'canvas_height' in form_data:
            instance.canvas_height = max(200, _to_int(form_data.get('canvas_height'), instance.canvas_height))
        if 'is_active' in form_data:
            instance.is_active = str(form_data.get('is_active')).lower() in ['1', 'true', 'on', 'yes']
        instance.save()
        return instance

    def apply_layout(self, data):
        """Editör'den gelen tüm yerleşimi (kanvas + masalar) uygular.

        ``data`` örnek:
            {
              "canvas_width": 1000, "canvas_height": 700,
              "tables": [
                {"id": 12, "name": "Masa 1", "capacity": 4, "status": "empty",
                 "shape": "round", "pos_x": 100, "pos_y": 150,
                 "width": 90, "height": 90, "rotation": 0},
                {"id": null, "name": "Masa 2", ...}   # id yoksa -> yeni masa
              ]
            }

        Payload'da olmayan mevcut masalar silinir (tam senkron).
        """
        if not isinstance(data, dict):
            raise UserGenException("Geçersiz düzen verisi.")

        cw = max(200, min(int(round(_num(data.get('canvas_width'), self.canvas_width))), 6000))
        ch = max(200, min(int(round(_num(data.get('canvas_height'), self.canvas_height))), 6000))

        tables = data.get('tables', [])
        if not isinstance(tables, list):
            raise UserGenException("Geçersiz masa verisi.")

        valid_status = {c[0] for c in Table.STATUS_CHOICES}
        valid_shape = {c[0] for c in Table.SHAPE_CHOICES}

        cleaned = []
        seen_names = set()
        for t in tables:
            if not isinstance(t, dict):
                continue
            name = (t.get('name') or '').strip()
            if not name:
                raise UserGenException("Tüm masaların bir adı olmalıdır.")
            key = name.lower()
            if key in seen_names:
                raise UserGenException(f"'{name}' masa adı bu salonda birden fazla kez kullanılmış.")
            seen_names.add(key)

            cleaned.append({
                'id': t.get('id') or None,
                'name': name,
                'capacity': max(1, int(round(_num(t.get('capacity'), 4)))),
                'status': t.get('status') if t.get('status') in valid_status else Table.STATUS_EMPTY,
                'shape': t.get('shape') if t.get('shape') in valid_shape else 'square',
                'pos_x': round(_num(t.get('pos_x'), 0), 2),
                'pos_y': round(_num(t.get('pos_y'), 0), 2),
                'width': max(20, int(round(_num(t.get('width'), 150)))),
                'height': max(20, int(round(_num(t.get('height'), 150)))),
                'rotation': int(round(_num(t.get('rotation'), 0))) % 360,
            })

        self.canvas_width = cw
        self.canvas_height = ch
        self.save(update_fields=['canvas_width', 'canvas_height'])

        existing = {obj.id: obj for obj in self.tables.all()}
        kept_ids = set()

        for c in cleaned:
            tid = c.pop('id')
            if tid and tid in existing:
                obj = existing[tid]
                for field, value in c.items():
                    setattr(obj, field, value)
                obj.save()
                kept_ids.add(tid)
            else:
                obj = Table(room=self, **c)
                obj._skip_auto_position = True  # konum kanvastan geliyor
                obj.save()

        for old_id, obj in existing.items():
            if old_id not in kept_ids:
                obj.delete()


class Table(models.Model):
    """Bir salona ait masa; kanvas üzerinde konumu, boyutu ve şekli vardır."""

    STATUS_EMPTY = 'empty'
    STATUS_OCCUPIED = 'occupied'
    STATUS_RESERVED = 'reserved'
    STATUS_DISABLED = 'disabled'

    STATUS_CHOICES = [
        (STATUS_EMPTY, 'Boş'),
        (STATUS_OCCUPIED, 'Dolu'),
        (STATUS_RESERVED, 'Rezerve'),
        (STATUS_DISABLED, 'Kullanım Dışı'),
    ]

    SHAPE_CHOICES = [
        ('square', 'Kare'),
        ('round', 'Yuvarlak'),
        ('rectangle', 'Dikdörtgen'),
    ]

    room = models.ForeignKey(
        Room, on_delete=models.CASCADE, related_name='tables', verbose_name="Salon"
    )
    name = models.CharField(max_length=50, verbose_name="Masa Adı / No")
    capacity = models.PositiveIntegerField(default=4, verbose_name="Kapasite")
    status = models.CharField(
        max_length=10, choices=STATUS_CHOICES, default=STATUS_EMPTY, verbose_name="Durum"
    )
    shape = models.CharField(
        max_length=10, choices=SHAPE_CHOICES, default='square', verbose_name="Şekil"
    )
    is_active = models.BooleanField(default=True, verbose_name="Aktif")

    # Kanvas üzerindeki yerleşim
    pos_x = models.FloatField(default=20, verbose_name="X Konumu")
    pos_y = models.FloatField(default=20, verbose_name="Y Konumu")
    width = models.PositiveIntegerField(default=150, verbose_name="Genişlik")
    height = models.PositiveIntegerField(default=150, verbose_name="Yükseklik")
    rotation = models.IntegerField(default=0, verbose_name="Dönüş (derece)")

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = "Masa"
        verbose_name_plural = "Masalar"
        ordering = ['room', 'id']

    def __str__(self):
        return f"{self.room.name} - {self.name}"

    @property
    def code(self):
        return f"#{self.room_id}-{self.id}"

    @property
    def status_color(self):
        return {
            self.STATUS_EMPTY: 'success',
            self.STATUS_OCCUPIED: 'danger',
            self.STATUS_RESERVED: 'warning',
            self.STATUS_DISABLED: 'secondary',
        }.get(self.status, 'secondary')

    @classmethod
    def _resolve_room(cls, room_id):
        if not room_id:
            raise UserGenException("Salon seçimi zorunludur.")
        try:
            return Room.objects.get(id=room_id)
        except Room.DoesNotExist:
            raise UserGenException("Seçilen salon bulunamadı.")

    @classmethod
    def create_from_form(cls, form_data):
        room = cls._resolve_room(form_data.get('room'))
        name = (form_data.get('name') or '').strip()
        capacity = _to_int(form_data.get('capacity'), 4)
        status = form_data.get('status') or cls.STATUS_EMPTY
        shape = form_data.get('shape') or 'square'

        if not name:
            raise UserGenException("Masa adı zorunludur.")
        if capacity < 1:
            raise UserGenException("Kapasite en az 1 olmalıdır.")
        if cls.objects.filter(room=room, name=name).exists():
            raise UserGenException("Bu salonda aynı isimde bir masa zaten var.")

        if status not in [c[0] for c in cls.STATUS_CHOICES]:
            status = cls.STATUS_EMPTY
        if shape not in [c[0] for c in cls.SHAPE_CHOICES]:
            shape = 'square'

        return cls.objects.create(
            room=room, name=name, capacity=capacity, status=status, shape=shape,
            pos_x=_to_float(form_data.get('pos_x'), 20),
            pos_y=_to_float(form_data.get('pos_y'), 20),
            width=_to_int(form_data.get('width'), 150),
            height=_to_int(form_data.get('height'), 150),
            rotation=_to_int(form_data.get('rotation'), 0),
        )

    @classmethod
    def update_from_form(cls, instance, form_data):
        room = cls._resolve_room(form_data.get('room', instance.room_id))
        name = (form_data.get('name') or '').strip()
        capacity = _to_int(form_data.get('capacity'), instance.capacity)

        if not name:
            raise UserGenException("Masa adı zorunludur.")
        if capacity < 1:
            raise UserGenException("Kapasite en az 1 olmalıdır.")
        if cls.objects.filter(room=room, name=name).exclude(pk=instance.pk).exists():
            raise UserGenException("Bu salonda aynı isimde bir masa zaten var.")

        instance.room = room
        instance.name = name
        instance.capacity = capacity

        status = form_data.get('status')
        if status in [c[0] for c in cls.STATUS_CHOICES]:
            instance.status = status

        shape = form_data.get('shape')
        if shape in [c[0] for c in cls.SHAPE_CHOICES]:
            instance.shape = shape

        for field in ('pos_x', 'pos_y'):
            if field in form_data:
                setattr(instance, field, _to_float(form_data.get(field), getattr(instance, field)))
        for field in ('width', 'height', 'rotation'):
            if field in form_data:
                setattr(instance, field, _to_int(form_data.get(field), getattr(instance, field)))

        if 'is_active' in form_data:
            instance.is_active = str(form_data.get('is_active')).lower() in ['1', 'true', 'on', 'yes']

        instance.save()
        return instance

    def set_status(self, status):
        if status not in [c[0] for c in self.STATUS_CHOICES]:
            raise UserGenException("Geçersiz masa durumu.")
        self.status = status
        self.save(update_fields=['status'])
        return self