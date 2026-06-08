from django.contrib import admin

from .models import Category, Product, Menu


class ProductInline(admin.TabularInline):
    model = Product
    extra = 0
    fields = ('name', 'price', 'is_active', 'is_available', 'list_index')


@admin.register(Category)
class CategoryAdmin(admin.ModelAdmin):
    list_display = ('name', 'list_index', 'is_active', 'product_count')
    list_editable = ('list_index', 'is_active')
    search_fields = ('name',)
    ordering = ('list_index', 'name')
    inlines = [ProductInline]


@admin.register(Product)
class ProductAdmin(admin.ModelAdmin):
    list_display = ('name', 'category', 'price', 'is_active', 'is_available', 'list_index')
    list_filter = ('category', 'is_active', 'is_available')
    list_editable = ('price', 'is_active', 'is_available')
    search_fields = ('name', 'category__name')
    ordering = ('category', 'list_index', 'name')


@admin.register(Menu)
class MenuAdmin(admin.ModelAdmin):
    list_display = ('name', 'list_index', 'is_active', 'product_count')
    list_editable = ('list_index', 'is_active')
    search_fields = ('name',)
    ordering = ('list_index', 'name')
    filter_horizontal = ('products',)