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
            'commercial_registration', 'legal_name', 'tax_registration_number'
        ]
        read_only_fields = ['id', 'company']

    def update(self, instance, validated_data):
        if 'name' in validated_data:
            instance.name = validated_data['name']
        if 'address' in validated_data:
            instance.address = validated_data['address']
        if 'phone' in validated_data:
            instance.phone = validated_data['phone']
        if 'email' in validated_data:
            instance.email = validated_data['email']
        if 'commercial_registration' in validated_data:
            instance.commercial_registration = validated_data['commercial_registration']
        if 'tax_registration_number' in validated_data:
            instance.tax_registration_number = validated_data['tax_registration_number']
        instance.save()
        return instance
