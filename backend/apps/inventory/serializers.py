from rest_framework import serializers
from .models import Product, Stock

class StockSerializer(serializers.ModelSerializer):
    class Meta:
        model = Stock
        fields = ['current_quantity', 'last_updated']

class ProductListSerializer(serializers.ModelSerializer):
    brand_name = serializers.CharField(source='brand.name', read_only=True)
    category_name = serializers.CharField(source='category.name', read_only=True)
    supplier_name = serializers.CharField(source='supplier.name', read_only=True)
    currency_code = serializers.CharField(source='currency.code', read_only=True)
    model = serializers.CharField(source='model_name', read_only=True)
    current_quantity = serializers.IntegerField(source='stock.current_quantity', read_only=True, default=0)
    cost_local = serializers.DecimalField(max_digits=12, decimal_places=2, read_only=True)
    total_cost = serializers.DecimalField(max_digits=12, decimal_places=2, read_only=True)
    expected_profit = serializers.DecimalField(max_digits=12, decimal_places=2, read_only=True)
    is_low_stock = serializers.BooleanField(read_only=True)

    class Meta:
        model = Product
        fields = [
            'id', 'sku', 'barcode', 'brand', 'brand_name', 'category', 'category_name',
            'model_name', 'model', 'gender', 'size', 'color', 'description', 
            'cost_foreign', 'currency', 'currency_code', 'customs_cost', 'shipping_cost',
            'suggested_selling_price', 'profit_margin_percentage', 'cost_local', 'total_cost', 'expected_profit',
            'current_quantity', 'min_alert_quantity', 'is_low_stock', 
            'can_be_oversold', 'image', 'supplier', 'supplier_name', 'location'
        ]

class ProductCreateSerializer(serializers.ModelSerializer):
    current_quantity = serializers.IntegerField(required=False, write_only=True)

    class Meta:
        model = Product
        exclude = ['created_at', 'updated_at']

    def create(self, validated_data):
        current_qty = validated_data.pop('current_quantity', 0)
        product = super().create(validated_data)
        Stock.objects.get_or_create(product=product, defaults={'current_quantity': current_qty})
        return product

    def update(self, instance, validated_data):
        current_qty = validated_data.pop('current_quantity', None)
        product = super().update(instance, validated_data)
        if current_qty is not None:
            stock, _ = Stock.objects.get_or_create(product=product)
            stock.current_quantity = current_qty
            stock.save()
        return product
