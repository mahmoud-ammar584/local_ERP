from rest_framework import viewsets
from rest_framework.decorators import api_view, permission_classes, action
from rest_framework.response import Response
from .models import Brand, Category, Supplier, CustomerType, PaymentMethod, Currency, TaxRate, StoreInfo
from .serializers import (
    BrandSerializer, CategorySerializer, SupplierSerializer,
    CustomerTypeSerializer, PaymentMethodSerializer, CurrencySerializer,
    TaxRateSerializer, StoreInfoSerializer
)
from apps.core.mixins import TenantScopedViewSetMixin, AuditLogMixin
from apps.accounts.permissions import HasModulePermission, AdminOnly
from rest_framework.permissions import IsAuthenticated


class BaseSettingsViewSet(TenantScopedViewSetMixin, AuditLogMixin, viewsets.ModelViewSet):
    module_name = 'settings'
    permission_classes = [IsAuthenticated, HasModulePermission]


class BrandViewSet(BaseSettingsViewSet):
    queryset = Brand.objects.all()
    serializer_class = BrandSerializer
    search_fields = ['name']


class CategoryViewSet(BaseSettingsViewSet):
    queryset = Category.objects.all()
    serializer_class = CategorySerializer
    search_fields = ['name']


class SupplierViewSet(BaseSettingsViewSet):
    queryset = Supplier.objects.all()
    serializer_class = SupplierSerializer
    search_fields = ['name', 'contact_person']


class CustomerTypeViewSet(BaseSettingsViewSet):
    queryset = CustomerType.objects.all()
    serializer_class = CustomerTypeSerializer


class PaymentMethodViewSet(BaseSettingsViewSet):
    queryset = PaymentMethod.objects.all()
    serializer_class = PaymentMethodSerializer


class CurrencyViewSet(BaseSettingsViewSet):
    queryset = Currency.objects.all()
    serializer_class = CurrencySerializer

    def list(self, request, *args, **kwargs):
        from .services import maybe_auto_sync_rates
        company = getattr(getattr(request.user, 'profile', None), 'company', None)
        maybe_auto_sync_rates(company=company)
        return super().list(request, *args, **kwargs)

    @action(detail=False, methods=['post'], url_path='sync-live-rates')
    def sync_live_rates(self, request):
        from .services import sync_exchange_rates
        company = getattr(getattr(request.user, 'profile', None), 'company', None)
        res = sync_exchange_rates(company=company)
        return Response({
            'message': 'Exchange rates successfully synchronized from Central Bank / Open Rates API',
            'details': res,
            'currencies': CurrencySerializer(self.get_queryset(), many=True).data
        })


class TaxRateViewSet(BaseSettingsViewSet):
    queryset = TaxRate.objects.all()
    serializer_class = TaxRateSerializer


@api_view(['GET', 'PUT', 'POST', 'PATCH'])
@permission_classes([IsAuthenticated, HasModulePermission])
def store_info_view(request):
    company = getattr(getattr(request.user, 'profile', None), 'company', None)
    store = StoreInfo.load(company=company)
    if request.method == 'GET':
        return Response(StoreInfoSerializer(store).data)
    serializer = StoreInfoSerializer(store, data=request.data, partial=True)
    serializer.is_valid(raise_exception=True)
    serializer.save(company=company)
    return Response(serializer.data)
