from rest_framework import serializers
from .models import SalesTransaction, SalesItem

class SalesItemSerializer(serializers.ModelSerializer):
    product_name = serializers.CharField(source='product.__str__', read_only=True)
    item_total_before_tax = serializers.DecimalField(max_digits=14, decimal_places=2, read_only=True)
    item_tax = serializers.DecimalField(max_digits=14, decimal_places=2, read_only=True)
    item_total_after_tax = serializers.DecimalField(max_digits=14, decimal_places=2, read_only=True)
    profit_per_item = serializers.DecimalField(max_digits=14, decimal_places=2, read_only=True)

    class Meta:
        model = SalesItem
        fields = '__all__'
        read_only_fields = ['sales_transaction']

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

    def create(self, validated_data):
        items_data = validated_data.pop('items')
        transaction = SalesTransaction.objects.create(**validated_data)

        for item_data in items_data:
            SalesItem.objects.create(sales_transaction=transaction, **item_data)
            # Decrement stock
            product = item_data['product']
            stock = product.stock
            stock.current_quantity -= item_data['quantity_sold']
            stock.save()

        transaction.recalculate()

        # Update customer totals
        if transaction.customer:
            customer = transaction.customer
            customer.total_purchases += transaction.final_amount
            customer.total_profit += transaction.total_profit
            customer.last_purchase_date = transaction.transaction_date.date()
            customer.save()

        return transaction
