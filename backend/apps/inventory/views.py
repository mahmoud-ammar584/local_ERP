from rest_framework import viewsets, response
from rest_framework.decorators import action
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.filters import SearchFilter, OrderingFilter
from .models import Product, Stock
from .serializers import ProductListSerializer, ProductCreateSerializer

class ProductViewSet(viewsets.ModelViewSet):
    queryset = Product.objects.select_related('brand', 'category', 'supplier', 'currency', 'stock').all()
    filterset_fields = ['brand', 'category', 'gender', 'supplier']
    search_fields = ['sku', 'barcode', 'model_name', 'color']
    ordering_fields = ['created_at', 'suggested_selling_price', 'model_name']
    ordering = ['-created_at']

    def get_serializer_class(self):
        if self.action in ['create', 'update', 'partial_update']:
            return ProductCreateSerializer
        return ProductListSerializer

    @action(detail=False, methods=['get'])
    def lookup(self, request):
        """البحث السريع عن منتج باستخدام الـ SKU"""
        sku = request.query_params.get('sku')
        if not sku:
            return response.Response({'error': 'SKU is required'}, status=400)
        
        try:
            product = Product.objects.get(sku=sku)
            serializer = ProductListSerializer(product)
            return response.Response(serializer.data)
        except Product.DoesNotExist:
            return response.Response({'error': 'Product not found'}, status=404)
