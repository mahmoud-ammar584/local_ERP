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
    class Meta:
        model = StoreInfo
        fields = '__all__'
