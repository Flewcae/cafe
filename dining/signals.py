from django.db.models.signals import pre_save
from django.dispatch import receiver

from .models import Table

GAP = 20          # masalar arası boşluk (px)
START = 20        # ilk masanın başlangıç konumu (px)

# rooms/signals.py

from django.db.models.signals import post_save
from django.dispatch import receiver

from dining.models import Room
from cafe.realtime import emit_event
from dining.services import build_room_payload


@receiver(post_save, sender=Room)
def room_changed(sender, instance: Room, **kwargs):
    payload = build_room_payload(instance.id)
    print('ROOM SIGNAL CALISTI')

    emit_event(
        group_name=f"room_{instance.id}",
        event_type="room.changed",
        payload=payload
    )


@receiver(pre_save, sender=Table)
def auto_place_new_table(sender, instance, **kwargs):
    """Yeni eklenen bir masayı, salondaki son masanın hemen sağına yerleştirir.

    - Yalnızca yeni (henüz kaydedilmemiş) masalar için çalışır.
    - Yerleşim editöründen gelen masalar (``_skip_auto_position`` işaretli)
      atlanır; çünkü onların konumu kanvastan gelir.
    - Satır kanvas genişliğini aşarsa bir alt satıra geçer.
    """
    if instance.pk is not None:
        return
    if getattr(instance, '_skip_auto_position', False):
        return
    if not instance.room_id:
        return

    last = (
        Table.objects
        .filter(room_id=instance.room_id)
        .order_by('-id')
        .first()
    )

    if last is None:
        instance.pos_x = START
        instance.pos_y = START
        return

    canvas_width = instance.room.canvas_width or 1000

    new_x = last.pos_x + last.width + GAP
    new_y = last.pos_y

    # Satır taşarsa bir alt satıra in.
    if new_x + instance.width > canvas_width:
        new_x = START
        new_y = last.pos_y + last.height + GAP

    instance.pos_x = new_x
    instance.pos_y = new_y