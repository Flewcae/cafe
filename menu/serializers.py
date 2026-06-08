from rest_framework import serializers

from .models import Category, Product, Menu


class ProductSerializer(serializers.ModelSerializer):
    status_color = serializers.CharField(read_only=True)
    status_label = serializers.CharField(read_only=True)
    category_name = serializers.CharField(source='category.name', read_only=True)
    image_url = serializers.SerializerMethodField()

    class Meta:
        model = Product
        fields = [
            'id', 'category', 'category_name', 'name', 'description', 'price',
            'image', 'image_url', 'preparation_time', 'is_active', 'is_available',
            'status_color', 'status_label', 'list_index',
        ]

    def get_image_url(self, obj):
        return obj.image.url if obj.image else None


class CategorySerializer(serializers.ModelSerializer):
    products = ProductSerializer(many=True, read_only=True)
    product_count = serializers.IntegerField(read_only=True)
    active_product_count = serializers.IntegerField(read_only=True)
    image_url = serializers.SerializerMethodField()

    class Meta:
        model = Category
        fields = [
            'id', 'name', 'description', 'image', 'image_url', 'list_index',
            'is_active', 'product_count', 'active_product_count', 'products',
        ]

    def get_image_url(self, obj):
        return obj.image.url if obj.image else None


class MenuSerializer(serializers.ModelSerializer):
    """Menü = isimlendirilmiş ürün listesi."""
    products = ProductSerializer(many=True, read_only=True)
    product_count = serializers.IntegerField(read_only=True)
    category_count = serializers.IntegerField(read_only=True)

    class Meta:
        model = Menu
        fields = ['id', 'name', 'description', 'is_active', 'list_index',
                  'product_count', 'category_count', 'products']