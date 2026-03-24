from rest_framework import serializers
from .models import Customer

class CustomerSerializer(serializers.ModelSerializer):
    customer_type_name = serializers.CharField(source='customer_type.name', read_only=True)

    class Meta:
        model = Customer
        fields = '__all__'
        read_only_fields = ['total_purchases', 'total_profit', 'last_purchase_date']
