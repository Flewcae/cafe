import json

from django.db import transaction
from django.shortcuts import get_object_or_404, render
from django.utils.decorators import method_decorator
from rest_framework import viewsets
from rest_framework.decorators import action

from cafe.action_resolver import action_resolver, UserGenException
from common.decorators import anahtar_auth
from .models import Room, Table
from .serializers import RoomSerializer, TableSerializer


# ---------------------------------------------------------------------------
# Management pages
# ---------------------------------------------------------------------------
@anahtar_auth(perm="tables", action="view")
def room_table_list(request):
    rooms = Room.objects.prefetch_related('tables').order_by('list_index', 'name')
    context = {
        'rooms': rooms,
        'status_choices': Table.STATUS_CHOICES,
        'shape_choices': Table.SHAPE_CHOICES,
    }
    return render(request, 'dining/index.html', context)


@anahtar_auth(perm="tables", action="view")
def room_layout_editor(request, pk):
    """Kuş bakışı yerleşim editörü (kanvas + sürükle-bırak masalar)."""
    room = get_object_or_404(Room, pk=pk)
    tables_json = [
        {
            'id': t.id,
            'name': t.name,
            'capacity': t.capacity,
            'status': t.status,
            'shape': t.shape,
            'pos_x': t.pos_x,
            'pos_y': t.pos_y,
            'width': t.width,
            'height': t.height,
            'rotation': t.rotation,
        }
        for t in room.tables.all()
    ]
    context = {
        'room': room,
        'tables_json': tables_json,
        'status_choices': Table.STATUS_CHOICES,
        'shape_choices': Table.SHAPE_CHOICES,
    }
    return render(request, 'dining/layout_editor.html', context)


# ---------------------------------------------------------------------------
# Room API + form actions
# ---------------------------------------------------------------------------
class RoomViewSet(viewsets.ModelViewSet):
    queryset = Room.objects.all()
    serializer_class = RoomSerializer

    @action(detail=False, methods=['post'])
    @method_decorator(action_resolver(
        redirect_default=True, redirect_url='tables',
        success_message="Salon başarıyla oluşturuldu!",
    ))
    def create_room(self, request, *args, **kwargs):
        if not request.user.has_ext_perm('tables', 'add'):
            raise UserGenException("Bu işlem için yetkiniz yok.")
        Room.create_from_form(request.data)

    @action(detail=True, methods=['post'])
    @method_decorator(action_resolver(
        redirect_default=True, redirect_url='tables',
        success_message="Salon başarıyla güncellendi!",
    ))
    def update_room(self, request, pk=None, *args, **kwargs):
        if not request.user.has_ext_perm('tables', 'change'):
            raise UserGenException("Bu işlem için yetkiniz yok.")
        Room.update_from_form(self.get_object(), request.data)

    @action(detail=True, methods=['post'])
    @method_decorator(action_resolver(
        redirect_default=True, redirect_url='tables',
        success_message="Salon başarıyla silindi!",
    ))
    def delete_room(self, request, pk=None, *args, **kwargs):
        if not request.user.has_ext_perm('tables', 'delete'):
            raise UserGenException("Bu işlem için yetkiniz yok.")
        self.get_object().delete()

    @action(detail=True, methods=['post'])
    @method_decorator(action_resolver(
        redirect_default=True, redirect_url='room_layout',
        redirect_kwargs=lambda request, *a, **k: {'pk': k.get('pk')},
        success_message="Salon düzeni kaydedildi!",
    ))
    def save_layout(self, request, pk=None, *args, **kwargs):
        if not request.user.has_ext_perm('tables', 'change'):
            raise UserGenException("Düzeni değiştirme yetkiniz yok.")

        raw = request.data.get('layout')
        if not raw:
            raise UserGenException("Düzen verisi alınamadı.")
        try:
            data = json.loads(raw)
        except (ValueError, TypeError):
            raise UserGenException("Düzen verisi çözümlenemedi.")

        room = self.get_object()
        incoming = data.get('tables', []) if isinstance(data, dict) else []
        incoming_ids = {t.get('id') for t in incoming if isinstance(t, dict) and t.get('id')}
        existing_ids = set(room.tables.values_list('id', flat=True))

        adds_new = any(isinstance(t, dict) and not t.get('id') for t in incoming)
        removes = bool(existing_ids - incoming_ids)
        if adds_new and not request.user.has_ext_perm('tables', 'add'):
            raise UserGenException("Yeni masa ekleme yetkiniz yok.")
        if removes and not request.user.has_ext_perm('tables', 'delete'):
            raise UserGenException("Masa silme yetkiniz yok.")

        with transaction.atomic():
            room.apply_layout(data)


# ---------------------------------------------------------------------------
# Table API + form actions
# ---------------------------------------------------------------------------
class TableViewSet(viewsets.ModelViewSet):
    queryset = Table.objects.select_related('room').all()
    serializer_class = TableSerializer

    @action(detail=False, methods=['post'])
    @method_decorator(action_resolver(
        redirect_default=True, redirect_url='tables',
        success_message="Masa başarıyla oluşturuldu!",
    ))
    def create_table(self, request, *args, **kwargs):
        if not request.user.has_ext_perm('tables', 'add'):
            raise UserGenException("Bu işlem için yetkiniz yok.")
        Table.create_from_form(request.data)

    @action(detail=True, methods=['post'])
    @method_decorator(action_resolver(
        redirect_default=True, redirect_url='tables',
        success_message="Masa başarıyla güncellendi!",
    ))
    def update_table(self, request, pk=None, *args, **kwargs):
        if not request.user.has_ext_perm('tables', 'change'):
            raise UserGenException("Bu işlem için yetkiniz yok.")
        Table.update_from_form(self.get_object(), request.data)

    @action(detail=True, methods=['post'])
    @method_decorator(action_resolver(
        redirect_default=True, redirect_url='tables',
        success_message="Masa başarıyla silindi!",
    ))
    def delete_table(self, request, pk=None, *args, **kwargs):
        if not request.user.has_ext_perm('tables', 'delete'):
            raise UserGenException("Bu işlem için yetkiniz yok.")
        self.get_object().delete()

    @action(detail=True, methods=['post'])
    @method_decorator(action_resolver(
        redirect_default=True, redirect_url='tables',
        success_message="Masa durumu güncellendi!",
    ))
    def set_status(self, request, pk=None, *args, **kwargs):
        if not request.user.has_ext_perm('tables', 'change'):
            raise UserGenException("Bu işlem için yetkiniz yok.")
        self.get_object().set_status(request.data.get('status'))