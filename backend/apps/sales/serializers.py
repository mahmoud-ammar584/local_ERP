from rest_framework import serializers
from django.utils import timezone
from decimal import Decimal
from .models import SalesTransaction, SalesItem, ReturnTransaction, ReturnItem
from apps.customers.models import Customer
from apps.settings_app.models import PaymentMethod, TaxRate
from apps.inventory.models import Product, ProductVariant
from apps.core.utils import log_activity


class SalesItemSerializer(serializers.ModelSerializer):
    variant_sku = serializers.SerializerMethodField()
    product_name = serializers.SerializerMethodField()
    brand_name = serializers.SerializerMethodField()
    color = serializers.SerializerMethodField()
    size = serializers.SerializerMethodField()
    product_sku = serializers.SerializerMethodField()
    product_image_url = serializers.SerializerMethodField()
    quantity = serializers.IntegerField(source='quantity_sold', required=False)
    price = serializers.DecimalField(source='unit_price', max_digits=12, decimal_places=2, required=False)
    discount_percentage = serializers.DecimalField(source='item_discount_percentage', max_digits=5, decimal_places=2, required=False)
    item_total_before_tax = serializers.DecimalField(max_digits=14, decimal_places=2, read_only=True)
    item_tax = serializers.DecimalField(max_digits=14, decimal_places=2, read_only=True)
    item_total_after_tax = serializers.DecimalField(max_digits=14, decimal_places=2, read_only=True)
    line_total = serializers.DecimalField(source='item_total_after_tax', max_digits=14, decimal_places=2, read_only=True)
    profit_per_item = serializers.DecimalField(max_digits=14, decimal_places=2, read_only=True)
    tax_rate = serializers.PrimaryKeyRelatedField(queryset=TaxRate.objects.all(), required=False, allow_null=True)
    variant = serializers.PrimaryKeyRelatedField(queryset=ProductVariant.objects.all(), required=False, allow_null=True)
    product = serializers.PrimaryKeyRelatedField(queryset=Product.objects.all(), required=False, allow_null=True)

    class Meta:
        model = SalesItem
        fields = [
            'id', 'sales_transaction', 'product', 'variant', 'variant_sku',
            'product_name', 'brand_name', 'color', 'size', 'product_sku', 'product_image_url',
            'quantity_sold', 'quantity', 'unit_price', 'price',
            'item_discount_percentage', 'discount_percentage', 'tax_rate',
            'item_total_before_tax', 'item_tax', 'item_total_after_tax', 'line_total',
            'profit_per_item'
        ]
        read_only_fields = ['sales_transaction']

    def _get_variant(self, obj):
        return getattr(obj, 'variant', None)

    def _get_product(self, obj):
        if getattr(obj, 'product_id', None):
            return obj.product
        v = self._get_variant(obj)
        return v.product if v else None

    def get_variant_sku(self, obj):
        v = self._get_variant(obj)
        if v:
            return v.full_sku
        p = self._get_product(obj)
        return p.sku if p else ''

    def get_product_name(self, obj):
        p = self._get_product(obj)
        return p.model_name if p else 'Item'

    def get_brand_name(self, obj):
        p = self._get_product(obj)
        return p.brand.name if (p and p.brand) else ''

    def get_color(self, obj):
        v = self._get_variant(obj)
        return v.color if v else ''

    def get_size(self, obj):
        v = self._get_variant(obj)
        return v.size if v else ''

    def get_product_sku(self, obj):
        p = self._get_product(obj)
        return getattr(p, 'sku', None) if p else None

    def get_product_image_url(self, obj):
        p = self._get_product(obj)
        return getattr(p, 'image_url', None) if p else None


class SalesTransactionSerializer(serializers.ModelSerializer):
    items = SalesItemSerializer(many=True, read_only=True)
    lines = SalesItemSerializer(source='items', many=True, read_only=True)
    customer_name = serializers.CharField(source='customer.name', read_only=True, default=None)
    payment_method_name = serializers.CharField(source='payment_method.name', read_only=True, default='Cash')
    created_at = serializers.DateTimeField(source='transaction_date', read_only=True)
    subtotal_amount = serializers.DecimalField(source='total_amount_before_tax', max_digits=14, decimal_places=2, read_only=True)
    tax_amount = serializers.DecimalField(source='total_tax', max_digits=14, decimal_places=2, read_only=True)
    final_total = serializers.DecimalField(source='final_amount', max_digits=14, decimal_places=2, read_only=True)
    discount_amount = serializers.SerializerMethodField()
    total_profit = serializers.DecimalField(max_digits=14, decimal_places=2, read_only=True)

    class Meta:
        model = SalesTransaction
        fields = [
            'id', 'company', 'transaction_date', 'created_at',
            'customer', 'customer_name',
            'payment_method', 'payment_method_name',
            'total_amount_before_tax', 'subtotal_amount',
            'total_tax', 'tax_amount',
            'overall_discount_percentage', 'discount_amount',
            'final_amount', 'final_total',
            'total_profit', 'notes',
            'items', 'lines'
        ]

    def get_discount_amount(self, obj):
        gross = (obj.total_amount_before_tax or Decimal('0')) + (obj.total_tax or Decimal('0'))
        return max(Decimal('0'), gross - (obj.final_amount or Decimal('0')))


class SalesTransactionCreateSerializer(serializers.ModelSerializer):
    transaction_date = serializers.DateTimeField(required=False, default=timezone.now)
    payment_method = serializers.PrimaryKeyRelatedField(queryset=PaymentMethod.objects.all(), required=False, allow_null=True)
    items = serializers.ListField(child=serializers.DictField(), required=False)
    lines = serializers.ListField(child=serializers.DictField(), required=False)

    class Meta:
        model = SalesTransaction
        fields = [
            'id', 'transaction_date', 'customer', 'payment_method',
            'overall_discount_percentage', 'notes', 'items', 'lines'
        ]

    def validate(self, data):
        from django.db import transaction
        from apps.inventory.models import Stock

        if not data.get('transaction_date'):
            data['transaction_date'] = timezone.now()

        # Support both 'items' and 'lines'
        raw_items = data.pop('items', None) or data.pop('lines', None) or []
        if not raw_items:
            raise serializers.ValidationError({'items': 'At least one item is required in the sale transaction.'})

        if not data.get('payment_method'):
            pm = PaymentMethod.objects.first()
            if not pm:
                pm = PaymentMethod.objects.create(name='Cash')
            data['payment_method'] = pm

        normalized_items = []
        default_tax = TaxRate.objects.first()
        
        with transaction.atomic():
            for raw in raw_items:
                variant_id = raw.get('variant') or raw.get('product_variant') or raw.get('variant_id')
                product_id = raw.get('product') or raw.get('product_id')
                qty = int(raw.get('quantity_sold') or raw.get('quantity') or 1)
                unit_price = Decimal(str(raw.get('unit_price') or raw.get('price') or 0))
                disc = Decimal(str(raw.get('item_discount_percentage') or raw.get('discount_percentage') or raw.get('discount') or 0))
                tax_rate_id = raw.get('tax_rate')

                target_variant = None
                if variant_id:
                    target_variant = ProductVariant.objects.select_related('product').filter(id=variant_id).first()
                elif product_id:
                    target_variant = ProductVariant.objects.select_related('product').filter(product_id=product_id, is_active=True).first()

                if not target_variant:
                    raise serializers.ValidationError({'items': f"Product variant '{variant_id or product_id}' not found."})

                if unit_price <= 0:
                    unit_price = target_variant.effective_price or target_variant.product.suggested_selling_price or Decimal('0')

                tax_rate = None
                if tax_rate_id:
                    tax_rate = TaxRate.objects.filter(id=tax_rate_id).first()
                if not tax_rate and default_tax:
                    tax_rate = default_tax

                # Stock availability validation
                stock = Stock.objects.select_for_update().filter(variant=target_variant).first()
                current_qty = stock.current_quantity if stock else 0
                can_oversell = target_variant.product.can_be_oversold

                if not can_oversell and current_qty < qty:
                    raise serializers.ValidationError({
                        'items': f"الكمية المطلوبة ({qty}) غير متوفرة في المخزن لـ {target_variant.full_sku}. الرصيد المتاح: {current_qty}"
                    })

                normalized_items.append({
                    'variant': target_variant,
                    'product': target_variant.product,
                    'quantity_sold': qty,
                    'unit_price': unit_price,
                    'item_discount_percentage': disc,
                    'tax_rate': tax_rate
                })

        data['_normalized_items'] = normalized_items
        return data

    def create(self, validated_data):
        items_data = validated_data.pop('_normalized_items')
        
        # Ensure company is attached
        request = self.context.get('request')
        profile = getattr(getattr(request, 'user', None), 'profile', None)
        if profile and profile.company:
            validated_data['company'] = profile.company

        transaction = SalesTransaction.objects.create(**validated_data)

        for item_dict in items_data:
            SalesItem.objects.create(
                sales_transaction=transaction,
                product=item_dict['product'],
                variant=item_dict['variant'],
                quantity_sold=item_dict['quantity_sold'],
                unit_price=item_dict['unit_price'],
                item_discount_percentage=item_dict['item_discount_percentage'],
                tax_rate=item_dict['tax_rate']
            )

        transaction.recalculate()

        # Update customer stats
        if transaction.customer:
            customer = transaction.customer
            customer.total_purchases += transaction.final_amount
            customer.total_profit += transaction.total_profit
            customer.last_purchase_date = transaction.transaction_date.date()
            customer.save()

        if request and request.user and request.user.is_authenticated:
            log_activity(
                request.user, 
                f"Created Sale #{transaction.id}", 
                "SalesTransaction", 
                transaction.id,
                {"amount": str(transaction.final_amount)}
            )

        return transaction
