from django.contrib import admin

from .models import Order, OrderItem, Receipt


class OrderItemInline(admin.TabularInline):
    model = OrderItem
    extra = 0
    fields = ('name', 'unit_price', 'quantity', 'status')
    readonly_fields = ('name', 'unit_price')


class ReceiptInline(admin.TabularInline):
    model = Receipt
    extra = 0
    fields = ('method', 'amount', 'created_by', 'paid_at')
    readonly_fields = ('paid_at',)


@admin.register(Order)
class OrderAdmin(admin.ModelAdmin):
    list_display = ('id', 'order_type', 'table', 'status', 'created_by', 'created_at')
    list_filter = ('status', 'order_type', 'created_at')
    search_fields = ('id', 'table__name')
    date_hierarchy = 'created_at'
    inlines = [OrderItemInline, ReceiptInline]


@admin.register(OrderItem)
class OrderItemAdmin(admin.ModelAdmin):
    list_display = ('order', 'name', 'unit_price', 'quantity', 'status')
    list_filter = ('status',)
    search_fields = ('name', 'order__id')


@admin.register(Receipt)
class ReceiptAdmin(admin.ModelAdmin):
    list_display = ('order', 'method', 'amount', 'created_by', 'paid_at')
    list_filter = ('method', 'paid_at')
    search_fields = ('order__id',)