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
    # اضافه الحقل ده لضمان التوافق مع الفرونت إند القديم لو احتاجنا
    model = serializers.CharField(source='model_name', read_only=True)
    current_quantity = serializers.IntegerField(source='stock.current_quantity', read_only=True, default=0)
    cost_local = serializers.DecimalField(max_digits=12, decimal_places=2, read_only=True)
    total_cost = serializers.DecimalField(max_digits=12, decimal_places=2, read_only=True)
    expected_profit = serializers.DecimalField(max_digits=12, decimal_places=2, read_only=True)
    is_low_stock = serializers.BooleanField(read_only=True)

    class Meta:
        model = Product
        fields = '__all__'

class ProductCreateSerializer(serializers.ModelSerializer):
    initial_quantity = serializers.IntegerField(write_only=True, required=False, default=0)

    class Meta:
        model = Product
        exclude = ['created_at', 'updated_at']

    def create(self, validated_data):
        # FIXME: initial_quantity المفروض يتضاف في عمليات شراء (Purchase Orders) مش هنا
        # بس سايبينه كدا للتبسيط في أول مرة
        qty = validated_data.pop('initial_quantity', 0)
        product = super().create(validated_data)
        Stock.objects.create(product=product, current_quantity=qty)
        return product
