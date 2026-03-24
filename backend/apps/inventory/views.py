from rest_framework import viewsets
from django_filters.rest_framework import DjangoFilterBackend
from .models import Product, Stock
from .serializers import ProductListSerializer, ProductCreateSerializer

class ProductViewSet(viewsets.ModelViewSet):
    queryset = Product.objects.select_related('brand', 'category', 'supplier', 'currency', 'stock').all()
    filterset_fields = ['brand', 'category', 'gender', 'supplier']
    search_fields = ['sku', 'barcode', 'model', 'color']
    ordering_fields = ['created_at', 'suggested_selling_price', 'model']
    ordering = ['-created_at']

    def get_serializer_class(self):
        if self.action in ['create', 'update', 'partial_update']:
            return ProductCreateSerializer
        return ProductListSerializer
