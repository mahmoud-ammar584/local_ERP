from rest_framework import serializers
from django.utils import timezone
from decimal import Decimal
from .models import SalesTransaction, SalesItem, ReturnTransaction, ReturnItem
from apps.customers.models import Customer
from apps.settings_app.models import PaymentMethod, TaxRate
from apps.inventory.models import Product, ProductVariant
from django.db.models import Sum as DbSum
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
    created_by_username = serializers.CharField(source='created_by.username', read_only=True, default=None)
    created_by_name = serializers.SerializerMethodField()
    created_at = serializers.DateTimeField(source='transaction_date', read_only=True)
    subtotal_amount = serializers.DecimalField(source='total_amount_before_tax', max_digits=14, decimal_places=2, read_only=True)
    tax_amount = serializers.DecimalField(source='total_tax', max_digits=14, decimal_places=2, read_only=True)
    final_total = serializers.DecimalField(source='final_amount', max_digits=14, decimal_places=2, read_only=True)
    discount_amount = serializers.SerializerMethodField()
    total_profit = serializers.DecimalField(max_digits=14, decimal_places=2, read_only=True)

    class Meta:
        model = SalesTransaction
        fields = [
            'id', 'company', 'created_by', 'created_by_username', 'created_by_name',
            'transaction_date', 'created_at',
            'customer', 'customer_name',
            'payment_method', 'payment_method_name',
            'total_amount_before_tax', 'subtotal_amount',
            'total_tax', 'tax_amount',
            'overall_discount_percentage', 'discount_amount',
            'final_amount', 'final_total',
            'total_profit', 'notes',
            'items', 'lines'
        ]

    def get_created_by_name(self, obj):
        if obj.created_by:
            return obj.created_by.username
        return 'Staff'

    def get_discount_amount(self, obj):
        gross = Decimal(str(obj.total_amount_before_tax or '0')) + Decimal(str(obj.total_tax or '0'))
        return max(Decimal('0'), gross - Decimal(str(obj.final_amount or '0')))


class SalesTransactionCreateSerializer(serializers.ModelSerializer):
    transaction_date = serializers.DateTimeField(required=False, default=timezone.now)
    payment_method = serializers.PrimaryKeyRelatedField(queryset=PaymentMethod.objects.all(), required=False, allow_null=True)
    customer = serializers.PrimaryKeyRelatedField(queryset=Customer.objects.all(), required=False, allow_null=True)
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

        if data.get('customer') == '':
            data['customer'] = None

        request = self.context.get('request')
        profile = getattr(getattr(request, 'user', None), 'profile', None)
        company = getattr(profile, 'company', None)

        # Cleanly pop both 'items' and 'lines' so neither leaks into model create kwargs
        items_payload = data.pop('items', None)
        lines_payload = data.pop('lines', None)
        raw_items = items_payload or lines_payload or []
        if not raw_items:
            raise serializers.ValidationError({'items': 'At least one item is required in the sale transaction.'})

        if not data.get('payment_method'):
            pm = PaymentMethod.objects.filter(company=company).first() if company else None
            if not pm:
                pm = PaymentMethod.objects.filter(company__isnull=True).first() or PaymentMethod.objects.first()
            if not pm:
                pm = PaymentMethod.objects.create(name='Cash', company=company)
            data['payment_method'] = pm

        from apps.settings_app.models import StoreInfo
        store_info = StoreInfo.load(company=company)
        is_tax_enabled = getattr(store_info, 'is_tax_enabled', True)

        normalized_items = []
        default_tax = None
        if is_tax_enabled:
            default_tax = TaxRate.objects.filter(company=company).first() if company else None
            if not default_tax:
                default_tax = TaxRate.objects.filter(company__isnull=True).first() or TaxRate.objects.first()
        
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
                if is_tax_enabled:
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
        items_data = validated_data.pop('_normalized_items', [])
        validated_data.pop('items', None)
        validated_data.pop('lines', None)
        
        # Ensure company and user are attached
        request = self.context.get('request')
        profile = getattr(getattr(request, 'user', None), 'profile', None)
        if profile and profile.company:
            validated_data['company'] = profile.company
        if request and request.user and request.user.is_authenticated:
            validated_data['created_by'] = request.user

        # Only pass valid model fields
        valid_model_fields = {'company', 'created_by', 'transaction_date', 'customer', 'payment_method', 'overall_discount_percentage', 'notes'}
        create_kwargs = {k: v for k, v in validated_data.items() if k in valid_model_fields}

        transaction = SalesTransaction.objects.create(**create_kwargs)

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
            customer.total_purchases = (customer.total_purchases or Decimal('0')) + (transaction.final_amount or Decimal('0'))
            customer.total_profit = (customer.total_profit or Decimal('0')) + (transaction.total_profit or Decimal('0'))
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

    def to_representation(self, instance):
        return SalesTransactionSerializer(instance, context=self.context).data


# --- Return Transaction Serializers ---

class ReturnItemSerializer(serializers.ModelSerializer):
    variant_sku = serializers.CharField(source='sales_item.variant.full_sku', read_only=True)
    product_name = serializers.CharField(source='sales_item.variant.product.model_name', read_only=True)
    brand_name = serializers.CharField(source='sales_item.variant.product.brand.name', read_only=True)
    color = serializers.CharField(source='sales_item.variant.color', read_only=True)
    size = serializers.CharField(source='sales_item.variant.size', read_only=True)
    unit_price = serializers.DecimalField(source='sales_item.unit_price', max_digits=12, decimal_places=2, read_only=True)
    refund_amount = serializers.SerializerMethodField()

    class Meta:
        model = ReturnItem
        fields = [
            'id', 'return_transaction', 'sales_item',
            'variant_sku', 'product_name', 'brand_name', 'color', 'size',
            'unit_price', 'quantity_returned', 'refund_amount', 'reason'
        ]
        read_only_fields = ['return_transaction']

    def get_refund_amount(self, obj):
        return (obj.sales_item.unit_price * obj.quantity_returned) * (1 - (obj.sales_item.item_discount_percentage or Decimal('0')) / Decimal('100'))


class ReturnTransactionSerializer(serializers.ModelSerializer):
    items = ReturnItemSerializer(many=True, read_only=True)
    customer_name = serializers.CharField(source='customer.name', read_only=True, default=None)
    original_invoice_number = serializers.CharField(source='original_transaction.id', read_only=True)

    class Meta:
        model = ReturnTransaction
        fields = [
            'id', 'return_date', 'customer', 'customer_name',
            'original_transaction', 'original_invoice_number',
            'reason', 'total_refund_amount', 'items'
        ]


class ReturnTransactionCreateSerializer(serializers.ModelSerializer):
    original_transaction_id = serializers.IntegerField(write_only=True)
    reason = serializers.CharField(required=False, allow_blank=True)
    items = serializers.ListField(child=serializers.DictField(), write_only=True)

    class Meta:
        model = ReturnTransaction
        fields = ['id', 'original_transaction_id', 'reason', 'items']

    def validate(self, data):
        original_tx_id = data.get('original_transaction_id')
        items_data = data.get('items', [])

        try:
            tx = SalesTransaction.objects.get(id=original_tx_id)
        except SalesTransaction.DoesNotExist:
            raise serializers.ValidationError({'original_transaction_id': f'Transaction #{original_tx_id} not found.'})

        if not items_data:
            raise serializers.ValidationError({'items': 'At least one item must be selected for return.'})

        validated_items = []
        total_refund = Decimal('0')

        for item in items_data:
            sales_item_id = item.get('sales_item_id') or item.get('sales_item')
            qty_return = int(item.get('quantity_returned') or item.get('quantity') or 0)
            item_reason = item.get('reason', '')

            if qty_return <= 0:
                continue

            try:
                sales_item = SalesItem.objects.get(id=sales_item_id, sales_transaction=tx)
            except SalesItem.DoesNotExist:
                raise serializers.ValidationError({'items': f'Sales item #{sales_item_id} not found in this transaction.'})

            # Check max returnable
            already_returned = (
                ReturnItem.objects
                .filter(sales_item=sales_item)
                .aggregate(total=DbSum('quantity_returned'))['total'] or 0
            )
            max_returnable = sales_item.quantity_sold - already_returned
            if qty_return > max_returnable:
                raise serializers.ValidationError({
                    'items': f"Cannot return {qty_return} units for {sales_item.variant.full_sku if sales_item.variant else 'item'}. Maximum returnable: {max_returnable}"
                })

            item_price = sales_item.unit_price * (1 - (sales_item.item_discount_percentage or Decimal('0')) / Decimal('100'))
            refund_line = item_price * qty_return
            total_refund += refund_line

            validated_items.append({
                'sales_item': sales_item,
                'quantity_returned': qty_return,
                'reason': item_reason,
            })

        if not validated_items:
            raise serializers.ValidationError({'items': 'Please specify valid return quantities greater than 0.'})

        data['_original_transaction'] = tx
        data['_validated_items'] = validated_items
        data['_total_refund'] = total_refund
        return data

    def create(self, validated_data):
        from django.db import transaction

        tx = validated_data['_original_transaction']
        items = validated_data['_validated_items']
        total_refund = validated_data['_total_refund']
        reason = validated_data.get('reason', 'Customer return')

        with transaction.atomic():
            return_tx = ReturnTransaction.objects.create(
                customer=tx.customer,
                original_transaction=tx,
                reason=reason,
                total_refund_amount=total_refund
            )

            for item_info in items:
                ReturnItem.objects.create(
                    return_transaction=return_tx,
                    sales_item=item_info['sales_item'],
                    quantity_returned=item_info['quantity_returned'],
                    reason=item_info['reason']
                )

            # Update customer statistics if applicable
            if tx.customer:
                tx.customer.total_purchases = max(Decimal('0'), tx.customer.total_purchases - total_refund)
                tx.customer.save(update_fields=['total_purchases'])

            request = self.context.get('request')
            if request and request.user and request.user.is_authenticated:
                log_activity(
                    request.user,
                    f"Created Return #{return_tx.id} for Sale #{tx.id}",
                    "ReturnTransaction",
                    return_tx.id,
                    {"refund_amount": str(total_refund)}
                )

        return return_tx

    def to_representation(self, instance):
        return ReturnTransactionSerializer(instance, context=self.context).data

