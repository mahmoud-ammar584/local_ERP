from rest_framework import serializers
from .models import PurchaseOrder, PurchaseOrderItem

class PurchaseOrderItemSerializer(serializers.ModelSerializer):
    product_name = serializers.CharField(source='product.__str__', read_only=True)

    class Meta:
        model = PurchaseOrderItem
        fields = '__all__'
        read_only_fields = ['purchase_order']

class PurchaseOrderSerializer(serializers.ModelSerializer):
    items = PurchaseOrderItemSerializer(many=True, read_only=True)
    supplier_name = serializers.CharField(source='supplier.name', read_only=True)
    currency_code = serializers.CharField(source='currency.code', read_only=True)

    class Meta:
        model = PurchaseOrder
        fields = '__all__'

class PurchaseOrderCreateSerializer(serializers.ModelSerializer):
    items = PurchaseOrderItemSerializer(many=True)

    class Meta:
        model = PurchaseOrder
        exclude = ['total_amount_foreign', 'created_at', 'updated_at']

    def create(self, validated_data):
        items_data = validated_data.pop('items')
        order = PurchaseOrder.objects.create(**validated_data)
        for item_data in items_data:
            PurchaseOrderItem.objects.create(purchase_order=order, **item_data)
        order.recalculate_total()
        return order

class ReceiveItemsSerializer(serializers.Serializer):
    items = serializers.ListField(child=serializers.DictField())
