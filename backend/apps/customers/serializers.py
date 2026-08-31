from rest_framework import serializers
from .models import Customer
from apps.settings_app.models import CustomerType

class CustomerSerializer(serializers.ModelSerializer):
    customer_type = serializers.PrimaryKeyRelatedField(queryset=CustomerType.objects.all(), required=False, allow_null=True)
    customer_type_name = serializers.CharField(source='customer_type.name', read_only=True)

    class Meta:
        model = Customer
        fields = '__all__'
        read_only_fields = ['total_purchases', 'total_profit', 'last_purchase_date']

    def create(self, validated_data):
        if not validated_data.get('customer_type'):
            request = self.context.get('request')
            profile = getattr(getattr(request, 'user', None), 'profile', None)
            company = getattr(profile, 'company', None)
            
            ct = None
            if company:
                ct = CustomerType.objects.filter(company=company).first()
            if not ct:
                ct = CustomerType.objects.first()
            if not ct:
                ct = CustomerType.objects.create(name='VIP Client', company=company)
            validated_data['customer_type'] = ct
        return super().create(validated_data)
