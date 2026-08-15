from rest_framework import serializers
from django.utils import timezone
from .models import SalesTransaction, SalesItem
from apps.customers.models import Customer
from apps.settings_app.models import PaymentMethod, TaxRate
from apps.inventory.models import Product, ProductVariant
from apps.core.utils import log_activity

class SalesItemSerializer(serializers.ModelSerializer):
    product_name = serializers.SerializerMethodField()
    product_sku = serializers.SerializerMethodField()
    product_image_url = serializers.SerializerMethodField()
    item_total_before_tax = serializers.DecimalField(max_digits=14, decimal_places=2, read_only=True)
    item_tax = serializers.DecimalField(max_digits=14, decimal_places=2, read_only=True)
    item_total_after_tax = serializers.DecimalField(max_digits=14, decimal_places=2, read_only=True)
    profit_per_item = serializers.DecimalField(max_digits=14, decimal_places=2, read_only=True)
    tax_rate = serializers.PrimaryKeyRelatedField(queryset=TaxRate.objects.all(), required=False, allow_null=True)

    class Meta:
        model = SalesItem
        fields = '__all__'
        read_only_fields = ['sales_transaction']

    def _get_product(self, obj):
        if getattr(obj, 'product_id', None):
            return obj.product
        if getattr(obj, 'variant_id', None):
            return obj.variant.product
        return None

    def get_product_name(self, obj):
        p = self._get_product(obj)
        return str(p) if p else None

    def get_product_sku(self, obj):
        p = self._get_product(obj)
        return getattr(p, 'sku', None) if p else None

    def get_product_image_url(self, obj):
        p = self._get_product(obj)
        return getattr(p, 'image_url', None) if p else None


class SalesTransactionSerializer(serializers.ModelSerializer):
    items = SalesItemSerializer(many=True, read_only=True)
    customer_name = serializers.CharField(source='customer.name', read_only=True, default=None)
    payment_method_name = serializers.CharField(source='payment_method.name', read_only=True)
    total_profit = serializers.DecimalField(max_digits=14, decimal_places=2, read_only=True)

    class Meta:
        model = SalesTransaction
        fields = '__all__'


class SalesTransactionCreateSerializer(serializers.ModelSerializer):
    transaction_date = serializers.DateTimeField(required=False, default=timezone.now)
    payment_method = serializers.PrimaryKeyRelatedField(queryset=PaymentMethod.objects.all(), required=False, allow_null=True)
    items = SalesItemSerializer(many=True)

    class Meta:
        model = SalesTransaction
        exclude = ['total_amount_before_tax', 'total_tax', 'final_amount', 'created_at', 'updated_at']

    def validate(self, data):
        from django.db import transaction
        from apps.inventory.models import Stock

        if not data.get('transaction_date'):
            data['transaction_date'] = timezone.now()

        if not data.get('payment_method'):
            pm = PaymentMethod.objects.first()
            if pm:
                data['payment_method'] = pm

        items_data = data.get('items', [])
        default_tax = TaxRate.objects.first()
        
        with transaction.atomic():
            for item in items_data:
                variant = item.get('variant')
                product = item.get('product')
                qty_sold = item.get('quantity_sold', 1)

                if not item.get('tax_rate') and default_tax:
                    item['tax_rate'] = default_tax

                target_variant = variant
                if not target_variant and product:
                    target_variant = product.variants.filter(is_active=True).order_by('id').first()
                    item['variant'] = target_variant

                if target_variant and not product:
                    item['product'] = target_variant.product

                if target_variant:
                    stock = Stock.objects.select_for_update().filter(variant=target_variant).first()
                    current_qty = stock.current_quantity if stock else 0
                    
                    can_oversell = target_variant.product.can_be_oversold if target_variant else (product.can_be_oversold if product else False)
                    
                    if not can_oversell and current_qty < qty_sold:
                        raise serializers.ValidationError({
                            'items': f"Insufficient stock for {target_variant.full_sku}. Available: {current_qty}"
                        })
        return data

    def create(self, validated_data):
        items_data = validated_data.pop('items')
        
        # Ensure company is attached
        request = self.context.get('request')
        if request and hasattr(request.user, 'profile') and request.user.profile.company:
            validated_data['company'] = request.user.profile.company

        transaction = SalesTransaction.objects.create(**validated_data)

        default_tax = TaxRate.objects.first()
        for item_data in items_data:
            if not item_data.get('tax_rate') and default_tax:
                item_data['tax_rate'] = default_tax
            SalesItem.objects.create(sales_transaction=transaction, **item_data)

        transaction.recalculate()

        # Update customer totals
        if transaction.customer:
            customer = transaction.customer
            customer.total_purchases += transaction.final_amount
            customer.total_profit += transaction.total_profit
            customer.last_purchase_date = transaction.transaction_date.date()
            customer.save()

        if request and request.user:
            log_activity(
                request.user, 
                f"Created Sale #{transaction.id}", 
                "SalesTransaction", 
                transaction.id,
                {"amount": str(transaction.final_amount)}
            )

        return transaction
