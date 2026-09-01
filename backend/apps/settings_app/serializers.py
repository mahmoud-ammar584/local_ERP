from rest_framework import serializers
from .models import Brand, Category, Supplier, CustomerType, PaymentMethod, Currency, TaxRate, StoreInfo

class BrandSerializer(serializers.ModelSerializer):
    class Meta:
        model = Brand
        fields = '__all__'

class CategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = Category
        fields = '__all__'

class SupplierSerializer(serializers.ModelSerializer):
    class Meta:
        model = Supplier
        fields = '__all__'

class CustomerTypeSerializer(serializers.ModelSerializer):
    class Meta:
        model = CustomerType
        fields = '__all__'

class PaymentMethodSerializer(serializers.ModelSerializer):
    class Meta:
        model = PaymentMethod
        fields = '__all__'

class CurrencySerializer(serializers.ModelSerializer):
    class Meta:
        model = Currency
        fields = '__all__'

class TaxRateSerializer(serializers.ModelSerializer):
    class Meta:
        model = TaxRate
        fields = '__all__'

class StoreInfoSerializer(serializers.ModelSerializer):
    store_name = serializers.CharField(source='name', required=False)
    legal_name = serializers.CharField(source='commercial_registration', required=False, allow_blank=True, allow_null=True)

    class Meta:
        model = StoreInfo
        fields = [
            'id', 'company', 'name', 'store_name', 'address', 'phone', 'email',
            'commercial_registration', 'legal_name', 'tax_registration_number',
            'is_tax_enabled', 'tax_rate_percentage', 'base_currency_code', 'last_rates_sync'
        ]
        read_only_fields = ['id', 'company', 'last_rates_sync']

    def update(self, instance, validated_data):
        for attr, val in validated_data.items():
            setattr(instance, attr, val)
        instance.save()
        return instance
