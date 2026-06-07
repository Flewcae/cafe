from rest_framework import serializers

from .models import Room, Table


class TableSerializer(serializers.ModelSerializer):
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    shape_display = serializers.CharField(source='get_shape_display', read_only=True)
    status_color = serializers.CharField(read_only=True)

    class Meta:
        model = Table
        fields = [
            'id', 'room', 'name', 'capacity', 'status', 'status_display',
            'status_color', 'shape', 'shape_display', 'is_active',
            'pos_x', 'pos_y', 'width', 'height', 'rotation',
        ]


class RoomSerializer(serializers.ModelSerializer):
    tables = TableSerializer(many=True, read_only=True)
    table_count = serializers.IntegerField(read_only=True)
    total_capacity = serializers.IntegerField(read_only=True)

    class Meta:
        model = Room
        fields = [
            'id', 'name', 'description', 'list_index', 'is_active',
            'canvas_width', 'canvas_height',
            'table_count', 'total_capacity', 'tables',
        ]