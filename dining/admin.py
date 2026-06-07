from django.contrib import admin

from .models import Room, Table


class TableInline(admin.TabularInline):
    model = Table
    extra = 0
    fields = ('name', 'capacity', 'status', 'shape', 'is_active')


@admin.register(Room)
class RoomAdmin(admin.ModelAdmin):
    list_display = ('name', 'list_index', 'is_active', 'table_count')
    list_editable = ('list_index', 'is_active')
    search_fields = ('name',)
    ordering = ('list_index', 'name')
    inlines = [TableInline]


@admin.register(Table)
class TableAdmin(admin.ModelAdmin):
    list_display = ('name', 'room', 'capacity', 'status', 'shape', 'is_active')
    list_filter = ('room', 'status', 'is_active')
    search_fields = ('name', 'room__name')
    list_editable = ('status', 'is_active')