from rest_framework import viewsets, response
from rest_framework.decorators import action
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.filters import SearchFilter, OrderingFilter
from .models import Product, Stock
from .serializers import ProductListSerializer, ProductCreateSerializer

class ProductViewSet(viewsets.ModelViewSet):
    queryset = Product.objects.select_related('brand', 'category', 'supplier', 'currency').prefetch_related('variants', 'variants__stock').all()
    filterset_fields = ['brand', 'category', 'supplier', 'season']
    search_fields = ['sku', 'variants__sku_suffix', 'model_name']
    ordering_fields = ['created_at', 'suggested_selling_price', 'model_name']
    ordering = ['-created_at']

    def get_serializer_class(self):
        if self.action in ['create', 'update', 'partial_update']:
            return ProductCreateSerializer
        return ProductListSerializer

    @action(detail=False, methods=['get'])
    def lookup(self, request):
        """Quick product lookup by SKU"""
        sku = request.query_params.get('sku')
        if not sku:
            return response.Response({'error': 'SKU is required'}, status=400)
        
        try:
            from .models import ProductVariant
            from .serializers import ProductVariantSerializer
            # full_sku = product.sku + sku_suffix (sku_suffix includes leading dash)
            from django.db.models import F, CharField
            from django.db.models.functions import Concat
            variant = (
                ProductVariant.objects
                .select_related('product', 'product__brand', 'product__category', 'product__currency')
                .annotate(_full_sku=Concat(F('product__sku'), F('sku_suffix'), output_field=CharField()))
                .get(_full_sku=sku)
            )
            serializer = ProductVariantSerializer(variant)
            return response.Response(serializer.data)
        except ProductVariant.DoesNotExist:
            return response.Response({'error': 'Variant not found'}, status=404)
