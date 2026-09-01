from rest_framework import serializers
from django.utils.text import slugify
from django.db import transaction

from .models import Product, Stock, ProductVariant, StockAudit, StockAuditItem

class StockSerializer(serializers.ModelSerializer):
    class Meta:
        model = Stock
        fields = ['current_quantity', 'last_updated']

class ProductVariantSerializer(serializers.ModelSerializer):
    full_sku = serializers.ReadOnlyField()
    effective_price = serializers.ReadOnlyField()
    effective_image_url = serializers.ReadOnlyField()
    stock_quantity = serializers.SerializerMethodField()
    current_quantity = serializers.SerializerMethodField()
    model_name = serializers.CharField(source='product.model_name', read_only=True)
    brand_name = serializers.CharField(source='product.brand.name', read_only=True)
    brand_id = serializers.IntegerField(source='product.brand.id', read_only=True)
    category_name = serializers.CharField(source='product.category.name', read_only=True)
    suggested_selling_price = serializers.DecimalField(source='product.suggested_selling_price', max_digits=12, decimal_places=2, read_only=True)

    class Meta:
        model = ProductVariant
        fields = [
            'id', 'product', 'sku_suffix', 'full_sku', 'barcode',
            'color', 'size', 'gender', 'image', 'image_url', 'effective_image_url',
            'price_override', 'effective_price',
            'stock_quantity', 'current_quantity', 'is_active', 'created_at',
            'model_name', 'brand_name', 'brand_id', 'category_name', 'suggested_selling_price'
        ]

    def get_stock_quantity(self, obj):
        try:
            return obj.stock.current_quantity
        except Exception:
            return 0

    def get_current_quantity(self, obj):
        return self.get_stock_quantity(obj)

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
    total_stock = serializers.SerializerMethodField()
    colors = serializers.SerializerMethodField()
    image = serializers.SerializerMethodField()
    primary_image_url = serializers.ReadOnlyField()
    cost_local = serializers.DecimalField(max_digits=12, decimal_places=2, read_only=True)
    total_cost = serializers.DecimalField(max_digits=12, decimal_places=2, read_only=True)
    expected_profit = serializers.DecimalField(max_digits=12, decimal_places=2, read_only=True)
    is_low_stock = serializers.BooleanField(read_only=True)

    class Meta:
        model = Product
        fields = [
            'id', 'brand', 'brand_name', 'category', 'category_name',
            'sku', 'barcode', 'season',
            'model_name', 'model', 'description',
            'cost_foreign', 'currency', 'currency_code', 'customs_cost', 'shipping_cost',
            'suggested_selling_price', 'profit_margin_percentage', 'cost_local', 'total_cost', 'expected_profit',
            'min_alert_quantity', 'is_low_stock',
            'can_be_oversold', 'supplier', 'supplier_name', 'location',
            'variants', 'colors', 'total_stock',
            'size', 'color', 'gender', 'current_quantity', 'image', 'primary_image_url',
        ]

    def _get_first_variant(self, obj):
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
        return self.get_total_stock(obj)

    def get_total_stock(self, obj):
        variants = obj.variants.all()
        return sum(getattr(getattr(v, 'stock', None), 'current_quantity', 0) for v in variants)

    def get_colors(self, obj):
        seen = {}
        for v in obj.variants.all():
            if v.color and v.color not in seen:
                seen[v.color] = {
                    'color': v.color,
                    'image_url': v.effective_image_url,
                    'count': 1
                }
            elif v.color in seen:
                seen[v.color]['count'] += 1
                if not seen[v.color]['image_url'] and v.effective_image_url:
                    seen[v.color]['image_url'] = v.effective_image_url
        return list(seen.values())

    def get_image(self, obj):
        return obj.primary_image_url

def compute_sku_suffix(color: str, size: str, gender: str = 'U') -> str:
    color_code = slugify(color or 'STD').replace('-', '').upper()[:10]
    size_code = slugify(size or 'STD').replace('-', '').upper()[:10]
    gender_code = gender if gender in {'M', 'F', 'U'} else 'U'
    suffix = f"-{color_code}-{size_code}"
    if gender_code != 'U':
        suffix = f"{suffix}-{gender_code}"
    return suffix[:50]

class ProductCreateSerializer(serializers.ModelSerializer):
    variants = serializers.ListField(child=serializers.DictField(), required=False, write_only=True)
    current_quantity = serializers.IntegerField(required=False, write_only=True, default=0)
    size = serializers.CharField(write_only=True, required=False, default='Standard')
    color = serializers.CharField(write_only=True, required=False, default='Standard')
    gender = serializers.ChoiceField(choices=ProductVariant.GENDER_CHOICES, write_only=True, default='U')
    variant_barcode = serializers.CharField(required=False, allow_blank=True, write_only=True)

    class Meta:
        model = Product
        exclude = ['created_at', 'updated_at']

    def create(self, validated_data):
        variants_data = validated_data.pop('variants', None)
        current_quantity = validated_data.pop('current_quantity', 0)
        size = validated_data.pop('size', 'Standard')
        color = validated_data.pop('color', 'Standard')
        gender = validated_data.pop('gender', 'U')
        variant_barcode = validated_data.pop('variant_barcode', None) or validated_data.get('barcode')

        request = self.context.get('request')
        profile = getattr(getattr(request, 'user', None), 'profile', None)
        if profile and profile.company and not validated_data.get('company'):
            validated_data['company'] = profile.company

        with transaction.atomic():
            product = super().create(validated_data)

            if variants_data and isinstance(variants_data, list) and len(variants_data) > 0:
                for v_data in variants_data:
                    v_color = v_data.get('color', 'Standard')
                    v_size = v_data.get('size', 'Standard')
                    v_gender = v_data.get('gender', 'U')
                    v_suffix = v_data.get('sku_suffix') or compute_sku_suffix(v_color, v_size, v_gender)
                    v_barcode = v_data.get('barcode') or v_data.get('variant_barcode') or ''
                    v_image_url = v_data.get('image_url') or v_data.get('image') or ''
                    v_price_override = v_data.get('price_override')
                    v_qty = int(v_data.get('current_quantity') or v_data.get('stock_quantity') or v_data.get('initial_quantity') or v_data.get('quantity') or 0)

                    variant = ProductVariant.objects.create(
                        product=product,
                        sku_suffix=v_suffix,
                        barcode=v_barcode if v_barcode else None,
                        color=v_color,
                        size=v_size,
                        gender=v_gender,
                        image_url=str(v_image_url) if v_image_url else None,
                        price_override=v_price_override
                    )
                    Stock.objects.create(variant=variant, current_quantity=v_qty)
            else:
                sku_suffix = compute_sku_suffix(color=color, size=size, gender=gender)
                variant = ProductVariant.objects.create(
                    product=product,
                    sku_suffix=sku_suffix,
                    barcode=variant_barcode,
                    color=color,
                    size=size,
                    gender=gender,
                )
                Stock.objects.create(variant=variant, current_quantity=current_quantity)

        return product

    def update(self, instance, validated_data):
        variants_data = validated_data.pop('variants', None)
        current_quantity = validated_data.pop('current_quantity', None)
        size = validated_data.pop('size', None)
        color = validated_data.pop('color', None)
        gender = validated_data.pop('gender', None)
        variant_barcode = validated_data.pop('variant_barcode', None)

        with transaction.atomic():
            product = super().update(instance, validated_data)

            if variants_data and isinstance(variants_data, list) and len(variants_data) > 0:
                for v_data in variants_data:
                    v_id = v_data.get('id')
                    v_color = v_data.get('color', 'Standard')
                    v_size = v_data.get('size', 'Standard')
                    v_gender = v_data.get('gender', 'U')
                    v_suffix = v_data.get('sku_suffix') or compute_sku_suffix(v_color, v_size, v_gender)
                    v_barcode = v_data.get('barcode') or v_data.get('variant_barcode') or None
                    v_image_url = v_data.get('image_url') or v_data.get('image') or None
                    v_price_override = v_data.get('price_override')
                    v_qty = v_data.get('current_quantity')

                    if v_id:
                        try:
                            variant = ProductVariant.objects.get(id=v_id, product=product)
                            variant.color = v_color
                            variant.size = v_size
                            variant.gender = v_gender
                            variant.sku_suffix = v_suffix
                            variant.barcode = v_barcode
                            if v_image_url:
                                variant.image_url = str(v_image_url)
                            if v_price_override is not None:
                                variant.price_override = v_price_override
                            variant.save()
                        except ProductVariant.DoesNotExist:
                            variant = ProductVariant.objects.create(
                                product=product,
                                sku_suffix=v_suffix,
                                barcode=v_barcode,
                                color=v_color,
                                size=v_size,
                                gender=v_gender,
                                image_url=str(v_image_url) if v_image_url else None,
                                price_override=v_price_override
                            )
                    else:
                        variant = ProductVariant.objects.create(
                            product=product,
                            sku_suffix=v_suffix,
                            barcode=v_barcode,
                            color=v_color,
                            size=v_size,
                            gender=v_gender,
                            image_url=str(v_image_url) if v_image_url else None,
                            price_override=v_price_override
                        )

                    if v_qty is not None:
                        Stock.objects.update_or_create(
                            variant=variant,
                            defaults={'current_quantity': int(v_qty)},
                        )
            elif size is not None and color is not None:
                existing_variant = (
                    ProductVariant.objects
                    .filter(product=product, size=size, color=color)
                    .order_by('id')
                    .first()
                )

                if existing_variant:
                    variant = existing_variant
                    variant.gender = gender or variant.gender
                    if variant_barcode is not None:
                        variant.barcode = variant_barcode
                    variant.sku_suffix = compute_sku_suffix(
                        color=color, size=size, gender=variant.gender
                    )
                    variant.save(update_fields=['gender', 'sku_suffix', 'barcode'])
                else:
                    sku_suffix = compute_sku_suffix(
                        color=color, size=size, gender=gender or 'U'
                    )
                    variant = ProductVariant.objects.create(
                        product=product,
                        sku_suffix=sku_suffix,
                        barcode=variant_barcode,
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


# --- Stock Audit Serializers ---

class StockAuditItemSerializer(serializers.ModelSerializer):
    variant_sku = serializers.CharField(source='variant.full_sku', read_only=True)
    product_name = serializers.CharField(source='variant.product.model_name', read_only=True)
    brand_name = serializers.CharField(source='variant.product.brand.name', read_only=True)
    category_name = serializers.CharField(source='variant.product.category.name', read_only=True)
    color = serializers.CharField(source='variant.color', read_only=True)
    size = serializers.CharField(source='variant.size', read_only=True)
    image_url = serializers.CharField(source='variant.effective_image_url', read_only=True)
    barcode = serializers.CharField(source='variant.barcode', read_only=True)
    effective_price = serializers.DecimalField(source='variant.effective_price', max_digits=12, decimal_places=2, read_only=True)
    discrepancy = serializers.IntegerField(read_only=True)
    discrepancy_value = serializers.DecimalField(max_digits=14, decimal_places=2, read_only=True)
    discrepancy_type = serializers.CharField(read_only=True)

    class Meta:
        model = StockAuditItem
        fields = [
            'id', 'audit', 'variant', 'variant_sku', 'product_name', 'brand_name', 'category_name',
            'color', 'size', 'image_url', 'barcode', 'effective_price',
            'expected_quantity', 'counted_quantity', 'unit_cost',
            'discrepancy', 'discrepancy_value', 'discrepancy_type',
            'notes', 'last_scanned_at', 'created_at'
        ]


class StockAuditSerializer(serializers.ModelSerializer):
    created_by_name = serializers.SerializerMethodField()
    items_count = serializers.SerializerMethodField()

    class Meta:
        model = StockAudit
        fields = [
            'id', 'title', 'status', 'created_by', 'created_by_name',
            'notes', 'created_at', 'completed_at',
            'total_expected_items', 'total_counted_items',
            'total_variance_items', 'total_variance_cost',
            'items_count'
        ]

    def get_created_by_name(self, obj):
        if not obj.created_by:
            return 'System'
        return f"{obj.created_by.first_name} {obj.created_by.last_name}".strip() or obj.created_by.username

    def get_items_count(self, obj):
        return obj.items.count()


class StockAuditDetailSerializer(StockAuditSerializer):
    items = StockAuditItemSerializer(many=True, read_only=True)

    class Meta(StockAuditSerializer.Meta):
        fields = StockAuditSerializer.Meta.fields + ['items']
