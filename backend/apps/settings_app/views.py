from rest_framework import viewsets
from rest_framework.decorators import api_view
from rest_framework.response import Response
from .models import Brand, Category, Supplier, CustomerType, PaymentMethod, Currency, TaxRate, StoreInfo
from .serializers import (
    BrandSerializer, CategorySerializer, SupplierSerializer,
    CustomerTypeSerializer, PaymentMethodSerializer, CurrencySerializer,
    TaxRateSerializer, StoreInfoSerializer
)

class BrandViewSet(viewsets.ModelViewSet):
    queryset = Brand.objects.all()
    serializer_class = BrandSerializer
    search_fields = ['name']

class CategoryViewSet(viewsets.ModelViewSet):
    queryset = Category.objects.all()
    serializer_class = CategorySerializer
    search_fields = ['name']

class SupplierViewSet(viewsets.ModelViewSet):
    queryset = Supplier.objects.all()
    serializer_class = SupplierSerializer
    search_fields = ['name', 'contact_person']

class CustomerTypeViewSet(viewsets.ModelViewSet):
    queryset = CustomerType.objects.all()
    serializer_class = CustomerTypeSerializer

class PaymentMethodViewSet(viewsets.ModelViewSet):
    queryset = PaymentMethod.objects.all()
    serializer_class = PaymentMethodSerializer

class CurrencyViewSet(viewsets.ModelViewSet):
    queryset = Currency.objects.all()
    serializer_class = CurrencySerializer

class TaxRateViewSet(viewsets.ModelViewSet):
    queryset = TaxRate.objects.all()
    serializer_class = TaxRateSerializer

@api_view(['GET', 'PUT'])
def store_info_view(request):
    store = StoreInfo.load()
    if request.method == 'GET':
        return Response(StoreInfoSerializer(store).data)
    serializer = StoreInfoSerializer(store, data=request.data)
    serializer.is_valid(raise_exception=True)
    serializer.save()
    return Response(serializer.data)
