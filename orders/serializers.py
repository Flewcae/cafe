from rest_framework import serializers

from .models import Order, OrderItem, Receipt


class OrderItemSerializer(serializers.ModelSerializer):
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    status_color = serializers.CharField(read_only=True)
    line_total = serializers.DecimalField(max_digits=12, decimal_places=2, read_only=True)

    class Meta:
        model = OrderItem
        fields = [
            'id', 'order', 'product', 'name', 'unit_price', 'quantity',
            'note', 'status', 'status_display', 'status_color', 'line_total',
        ]


class ReceiptSerializer(serializers.ModelSerializer):
    method_display = serializers.CharField(source='get_method_display', read_only=True)

    class Meta:
        model = Receipt
        fields = ['id', 'order', 'method', 'method_display', 'amount', 'note', 'created_by', 'paid_at']


class OrderSerializer(serializers.ModelSerializer):
    items = OrderItemSerializer(many=True, read_only=True)
    receipts = ReceiptSerializer(many=True, read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    status_color = serializers.CharField(read_only=True)
    type_display = serializers.CharField(source='get_order_type_display', read_only=True)
    table_name = serializers.CharField(source='table.name', read_only=True)

    subtotal = serializers.DecimalField(max_digits=12, decimal_places=2, read_only=True)
    total = serializers.DecimalField(max_digits=12, decimal_places=2, read_only=True)
    total_paid = serializers.DecimalField(max_digits=12, decimal_places=2, read_only=True)
    balance = serializers.DecimalField(max_digits=12, decimal_places=2, read_only=True)
    item_count = serializers.IntegerField(read_only=True)

    class Meta:
        model = Order
        fields = [
            'id', 'table', 'table_name', 'order_type', 'type_display',
            'status', 'status_display', 'status_color', 'note',
            'created_by', 'created_at', 'updated_at', 'closed_at',
            'subtotal', 'total', 'total_paid', 'balance', 'item_count',
            'items', 'receipts',
        ]