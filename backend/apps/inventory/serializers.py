from rest_framework import serializers
from django.utils.text import slugify

from .models import Product, Stock, ProductVariant

class StockSerializer(serializers.ModelSerializer):
    class Meta:
        model = Stock
        fields = ['current_quantity', 'last_updated']

class ProductVariantSerializer(serializers.ModelSerializer):
    full_sku = serializers.ReadOnlyField()
    effective_price = serializers.ReadOnlyField()
    stock_quantity = serializers.SerializerMethodField()

    class Meta:
        model = ProductVariant
        fields = [
            'id', 'product', 'sku_suffix', 'full_sku',
            'color', 'size', 'gender',
            'price_override', 'effective_price',
            'stock_quantity', 'is_active', 'created_at'
        ]

    def get_stock_quantity(self, obj):
        try:
            return obj.stock.current_quantity
        except Stock.DoesNotExist:
            return 0

class ProductListSerializer(serializers.ModelSerializer):
    brand_name = serializers.CharField(source='brand.name', read_only=True)
    category_name = serializers.CharField(source='category.name', read_only=True)
    supplier_name = serializers.CharField(source='supplier.name', read_only=True)
    currency_code = serializers.CharField(source='currency.code', read_only=True)
    model = serializers.CharField(source='model_name', read_only=True)
    variants = ProductVariantSerializer(many=True, read_only=True)
    size = serializers.SerializerMethodField()
    color = serializers.SerializerMethodField()
    gender = serializers.SerializerMethodField()
    current_quantity = serializers.SerializerMethodField()
    image = serializers.SerializerMethodField()
    cost_local = serializers.DecimalField(max_digits=12, decimal_places=2, read_only=True)
    total_cost = serializers.DecimalField(max_digits=12, decimal_places=2, read_only=True)
    expected_profit = serializers.DecimalField(max_digits=12, decimal_places=2, read_only=True)
    is_low_stock = serializers.BooleanField(read_only=True)

    class Meta:
        model = Product
        fields = [
            'id', 'brand', 'brand_name', 'category', 'category_name',
            'sku', 'season',
            'model_name', 'model', 'description',
            'cost_foreign', 'currency', 'currency_code', 'customs_cost', 'shipping_cost',
            'suggested_selling_price', 'profit_margin_percentage', 'cost_local', 'total_cost', 'expected_profit',
            'min_alert_quantity', 'is_low_stock',
            'can_be_oversold', 'supplier', 'supplier_name', 'location',
            'variants',
            'size', 'color', 'gender', 'current_quantity', 'image',
        ]

    def _get_first_variant(self, obj):
        # Variants + stock are prefetched in ProductViewSet, so this should not cause N+1 queries.
        return obj.variants.all().order_by('id').first()

    def get_size(self, obj):
        v = self._get_first_variant(obj)
        return v.size if v else None

    def get_color(self, obj):
        v = self._get_first_variant(obj)
        return v.color if v else None

    def get_gender(self, obj):
        v = self._get_first_variant(obj)
        return v.gender if v else None

    def get_current_quantity(self, obj):
        v = self._get_first_variant(obj)
        if not v:
            return 0
        try:
            return v.stock.current_quantity
        except Stock.DoesNotExist:
            return 0

    def get_image(self, obj):
        # Frontend expects `image` but model stores `image_url`.
        return obj.image_url

class ProductCreateSerializer(serializers.ModelSerializer):
    current_quantity = serializers.IntegerField(required=False, write_only=True)
    size = serializers.CharField(write_only=True)
    color = serializers.CharField(write_only=True)
    gender = serializers.ChoiceField(choices=ProductVariant.GENDER_CHOICES, write_only=True, default='U')

    def _compute_sku_suffix(self, color: str, size: str, gender: str) -> str:
        # Deterministic suffix for the variant SKU (unique per product).
        color_code = slugify(color or '').replace('-', '').upper()[:10]
        size_code = slugify(size or '').replace('-', '').upper()[:10]
        gender_code = gender if gender in {'M', 'F', 'U'} else 'U'

        suffix = f"-{color_code}-{size_code}"
        if gender_code != 'U':
            suffix = f"{suffix}-{gender_code}"
        return suffix[:50]

    class Meta:
        model = Product
        exclude = ['created_at', 'updated_at']

    def create(self, validated_data):
        current_quantity = validated_data.pop('current_quantity', 0)
        size = validated_data.pop('size')
        color = validated_data.pop('color')
        gender = validated_data.pop('gender', 'U')

        product = super().create(validated_data)

        sku_suffix = self._compute_sku_suffix(color=color, size=size, gender=gender)
        variant = ProductVariant.objects.create(
            product=product,
            sku_suffix=sku_suffix,
            color=color,
            size=size,
            gender=gender,
        )
        Stock.objects.create(variant=variant, current_quantity=current_quantity)
        return product

    def update(self, instance, validated_data):
        current_quantity = validated_data.pop('current_quantity', None)
        size = validated_data.pop('size', None)
        color = validated_data.pop('color', None)
        gender = validated_data.pop('gender', None)

        product = super().update(instance, validated_data)

        if size is not None and color is not None:
            existing_variant = (
                ProductVariant.objects
                .filter(product=product, size=size, color=color)
                .order_by('id')
                .first()
            )

            if existing_variant:
                variant = existing_variant
                variant.gender = gender or variant.gender
                variant.sku_suffix = self._compute_sku_suffix(
                    color=color, size=size, gender=variant.gender
                )
                variant.save(update_fields=['gender', 'sku_suffix'])
            else:
                sku_suffix = self._compute_sku_suffix(
                    color=color, size=size, gender=gender or 'U'
                )
                variant = ProductVariant.objects.create(
                    product=product,
                    sku_suffix=sku_suffix,
                    color=color,
                    size=size,
                    gender=gender or 'U',
                )

            if current_quantity is not None:
                Stock.objects.update_or_create(
                    variant=variant,
                    defaults={'current_quantity': current_quantity},
                )

        return product
