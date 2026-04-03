from rest_framework import viewsets, response
from rest_framework.decorators import action
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.filters import SearchFilter, OrderingFilter
from .models import Product, Stock
from .serializers import ProductListSerializer, ProductCreateSerializer

from apps.accounts.permissions import CashierInventoryPermission
from rest_framework.permissions import IsAuthenticated

class ProductViewSet(viewsets.ModelViewSet):
    queryset = Product.objects.select_related('brand', 'category', 'supplier', 'currency').prefetch_related('variants', 'variants__stock').all()
    permission_classes = [IsAuthenticated, CashierInventoryPermission]
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

    @action(detail=False, methods=['post'], url_path='adjust-stock')
    def adjust_stock(self, request):
        """
        Manually adjust stock for a specific variant.
        Payload: { "variant_id": int, "new_quantity": int, "reason": str }
        """
        variant_id = request.data.get('variant_id')
        new_quantity = request.data.get('new_quantity')
        reason = request.data.get('reason', 'Manual Adjustment')

        if variant_id is None or new_quantity is None:
            return response.Response({'error': 'variant_id and new_quantity are required'}, status=400)

        from .models import ProductVariant, Stock
        from django.db import transaction
        from apps.core.utils import log_activity

        try:
            variant = ProductVariant.objects.get(id=variant_id)
            with transaction.atomic():
                stock, created = Stock.objects.select_for_update().get_or_create(variant=variant)
                old_quantity = stock.current_quantity
                stock.current_quantity = int(new_quantity)
                stock.save()

                log_activity(
                    user=request.user,
                    action=f"Stock Adjusted for {variant.full_sku}",
                    model_name="Stock",
                    object_id=stock.id,
                    details={
                        "old_quantity": old_quantity,
                        "new_quantity": int(new_quantity),
                        "reason": reason
                    }
                )
            return response.Response({
                'message': 'Stock adjusted successfully',
                'variant': variant.full_sku,
                'old_quantity': old_quantity,
                'new_quantity': stock.current_quantity
            })
        except ProductVariant.DoesNotExist:
            return response.Response({'error': 'Variant not found'}, status=404)
        except ValueError:
            return response.Response({'error': 'new_quantity must be an integer'}, status=400)
