from rest_framework import serializers
from .models import SalesTransaction, SalesItem
from apps.customers.models import Customer
from apps.inventory.tasks import update_stock
from apps.core.utils import log_activity

class SalesItemSerializer(serializers.ModelSerializer):
    product_name = serializers.SerializerMethodField()
    product_sku = serializers.SerializerMethodField()
    product_image_url = serializers.SerializerMethodField()
    item_total_before_tax = serializers.DecimalField(max_digits=14, decimal_places=2, read_only=True)
    item_tax = serializers.DecimalField(max_digits=14, decimal_places=2, read_only=True)
    item_total_after_tax = serializers.DecimalField(max_digits=14, decimal_places=2, read_only=True)
    profit_per_item = serializers.DecimalField(max_digits=14, decimal_places=2, read_only=True)

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
    items = SalesItemSerializer(many=True)

    class Meta:
        model = SalesTransaction
        exclude = ['total_amount_before_tax', 'total_tax', 'final_amount', 'created_at', 'updated_at']

    def validate(self, data):
        from django.db import transaction
        from apps.inventory.models import Stock

        items_data = data.get('items', [])
        
        with transaction.atomic():
            for item in items_data:
                product = item.get('product')
                variant = item.get('variant')
                qty_sold = item['quantity_sold']
                
                target_variant = variant
                if not target_variant and product:
                    target_variant = product.variants.filter(is_active=True).order_by('id').first()

                if target_variant:
                    # Use select_for_update to prevent race conditions during validation
                    stock = Stock.objects.select_for_update().filter(variant=target_variant).first()
                    current_qty = stock.current_quantity if stock else 0
                    
                    # Enforce oversold check: current_quantity >= quantity_sold UNLESS product.can_be_oversold is True
                    can_oversell = target_variant.product.can_be_oversold if target_variant else (product.can_be_oversold if product else False)
                    
                    if not can_oversell and current_qty < qty_sold:
                        raise serializers.ValidationError({
                            'items': f"Insufficient stock for {target_variant.full_sku}. Available: {current_qty}"
                        })
        return data

    def create(self, validated_data):
        items_data = validated_data.pop('items')
        transaction = SalesTransaction.objects.create(**validated_data)

        for item_data in items_data:
            SalesItem.objects.create(sales_transaction=transaction, **item_data)
            # --- ASYNC STOCK UPDATE (Phase 9) ---
            variant = item_data.get('variant')
            if not variant and item_data.get('product'):
                variant = item_data['product'].variants.filter(is_active=True).order_by('id').first()
            if variant:
                update_stock(variant.id, -item_data['quantity_sold'])

        transaction.recalculate()

        # Update customer totals
        if transaction.customer:
            customer = transaction.customer
            customer.total_purchases += transaction.final_amount
            customer.total_profit += transaction.total_profit
            customer.last_purchase_date = transaction.transaction_date.date()
            customer.save()

        # --- LOG ACTIVITY (Phase 10) ---
        request = self.context.get('request')
        if request and request.user:
            log_activity(
                request.user, 
                f"Created Sale #{transaction.id}", 
                "SalesTransaction", 
                transaction.id,
                {"amount": str(transaction.final_amount)}
            )

        return transaction
