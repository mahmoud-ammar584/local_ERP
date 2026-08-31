from rest_framework import viewsets, response, status
from rest_framework.decorators import action
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.filters import SearchFilter, OrderingFilter
from django.utils import timezone
from django.db import transaction
from django.db.models import F, Q, CharField
from django.db.models.functions import Concat
from django.http import HttpResponse
import csv

from .models import Product, Stock, ProductVariant, StockAudit, StockAuditItem
from .serializers import (
    ProductListSerializer,
    ProductCreateSerializer,
    ProductVariantSerializer,
    StockAuditSerializer,
    StockAuditDetailSerializer,
    StockAuditItemSerializer,
)

from apps.core.mixins import TenantScopedViewSetMixin, AuditLogMixin
from apps.core.models import UserActivity
from apps.core.utils import log_activity
from apps.accounts.permissions import HasModulePermission
from rest_framework.permissions import IsAuthenticated


class ProductViewSet(AuditLogMixin, TenantScopedViewSetMixin, viewsets.ModelViewSet):
    module_name = 'inventory'
    queryset = Product.objects.select_related('brand', 'category', 'supplier', 'currency').prefetch_related('variants', 'variants__stock').all()
    permission_classes = [IsAuthenticated, HasModulePermission]
    filterset_fields = ['brand', 'category', 'supplier', 'season']
    search_fields = ['sku', 'barcode', 'variants__sku_suffix', 'variants__barcode', 'model_name']
    ordering_fields = ['created_at', 'suggested_selling_price', 'model_name']
    ordering = ['-created_at']

    def get_serializer_class(self):
        if self.action in ['create', 'update', 'partial_update']:
            return ProductCreateSerializer
        return ProductListSerializer

    @action(detail=False, methods=['get'])
    def lookup(self, request):
        """
        Quick product lookup by SKU or Barcode.
        Supports exact variant full SKU, variant barcode, product SKU, or product barcode.
        """
        query = request.query_params.get('sku') or request.query_params.get('barcode') or request.query_params.get('q')
        if not query:
            return response.Response({'error': 'SKU or Barcode query is required'}, status=400)
        
        query = query.strip()
        user = getattr(request, 'user', None)
        company_id = getattr(getattr(user, 'profile', None), 'company_id', None)

        variant_qs = (
            ProductVariant.objects
            .select_related('product', 'product__brand', 'product__category', 'product__currency')
            .prefetch_related('stock')
            .annotate(_full_sku=Concat(F('product__sku'), F('sku_suffix'), output_field=CharField()))
        )
        if company_id:
            variant_qs = variant_qs.filter(product__company_id=company_id)

        # 1. Try exact match on variant barcode or full SKU
        variant = variant_qs.filter(
            Q(_full_sku__iexact=query) | Q(barcode__iexact=query)
        ).first()

        # 2. If not found, try base product SKU or base product barcode
        if not variant:
            variant = variant_qs.filter(
                Q(product__sku__iexact=query) | Q(product__barcode__iexact=query)
            ).order_by('id').first()

        if not variant:
            return response.Response({'error': f'No product found matching "{query}"'}, status=404)

        serializer = ProductVariantSerializer(variant)
        return response.Response(serializer.data)

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


class StockAuditViewSet(AuditLogMixin, TenantScopedViewSetMixin, viewsets.ModelViewSet):
    """
    Stocktake Audit Session ViewSet.
    Manages inventory count sessions, live barcode scanning, discrepancy calculation, and reconciliation.
    """
    module_name = 'inventory'
    queryset = StockAudit.objects.prefetch_related('items', 'items__variant', 'items__variant__product', 'items__variant__product__brand').all()
    permission_classes = [IsAuthenticated, HasModulePermission]
    filterset_fields = ['status']
    search_fields = ['title', 'notes']
    ordering_fields = ['created_at', 'status']
    ordering = ['-created_at']

    def get_serializer_class(self):
        if self.action in ['retrieve', 'create']:
            return StockAuditDetailSerializer
        return StockAuditSerializer

    def perform_create(self, serializer):
        user = getattr(self.request, 'user', None)
        profile = getattr(user, 'profile', None)
        company = profile.company if profile else None

        audit = serializer.save(
            company=company,
            created_by=user,
            status='in_progress'
        )

        # Snapshot all active product variants for this tenant
        variant_qs = (
            ProductVariant.objects
            .filter(is_active=True)
            .select_related('product', 'stock')
        )
        if company:
            variant_qs = variant_qs.filter(product__company=company)

        audit_items = []
        for v in variant_qs:
            try:
                curr_qty = v.stock.current_quantity
            except Exception:
                curr_qty = 0

            audit_items.append(
                StockAuditItem(
                    audit=audit,
                    variant=v,
                    expected_quantity=curr_qty,
                    counted_quantity=0,
                    unit_cost=v.product.total_cost
                )
            )

        if audit_items:
            StockAuditItem.objects.bulk_create(audit_items)

        audit.recalculate_totals()
        return audit

    @action(detail=True, methods=['post'])
    def scan(self, request, pk=None):
        """
        Record a scanned SKU or barcode in the audit session.
        Payload: { "sku": str, "quantity": int (optional default 1) }
        """
        audit = self.get_object()
        if audit.status == 'completed':
            return response.Response({'error': 'Cannot scan into an already completed audit'}, status=400)

        query = request.data.get('sku') or request.data.get('barcode') or request.data.get('q')
        quantity = int(request.data.get('quantity', 1))

        if not query:
            return response.Response({'error': 'SKU or Barcode is required'}, status=400)

        query = query.strip()

        # Find matching audit item
        items_qs = audit.items.select_related('variant', 'variant__product', 'variant__product__brand').annotate(
            _full_sku=Concat(F('variant__product__sku'), F('variant__sku_suffix'), output_field=CharField())
        )

        item = items_qs.filter(
            Q(_full_sku__iexact=query) |
            Q(variant__barcode__iexact=query) |
            Q(variant__product__sku__iexact=query) |
            Q(variant__product__barcode__iexact=query)
        ).first()

        if not item:
            return response.Response({
                'error': f'Product with SKU/Barcode "{query}" is not found in this audit session'
            }, status=404)

        item.counted_quantity += quantity
        item.last_scanned_at = timezone.now()
        item.save(update_fields=['counted_quantity', 'last_scanned_at'])

        audit.recalculate_totals()
        return response.Response(StockAuditDetailSerializer(audit).data)

    @action(detail=True, methods=['post'], url_path='set-item-count')
    def set_item_count(self, request, pk=None):
        """
        Manually set the counted quantity for a specific audit line item.
        Payload: { "item_id": int, "counted_quantity": int, "notes": str }
        """
        audit = self.get_object()
        if audit.status == 'completed':
            return response.Response({'error': 'Audit is already completed'}, status=400)

        item_id = request.data.get('item_id')
        counted_quantity = request.data.get('counted_quantity')
        notes = request.data.get('notes')

        if item_id is None or counted_quantity is None:
            return response.Response({'error': 'item_id and counted_quantity are required'}, status=400)

        try:
            item = audit.items.get(id=item_id)
            item.counted_quantity = max(0, int(counted_quantity))
            if notes is not None:
                item.notes = notes
            item.last_scanned_at = timezone.now()
            item.save()

            audit.recalculate_totals()
            return response.Response(StockAuditDetailSerializer(audit).data)
        except StockAuditItem.DoesNotExist:
            return response.Response({'error': 'Audit item not found'}, status=404)
        except ValueError:
            return response.Response({'error': 'counted_quantity must be a valid integer'}, status=400)

    @action(detail=True, methods=['post'])
    def reconcile(self, request, pk=None):
        """
        Reconcile and finalize the stock audit session.
        Applies counted quantities directly into Stock.current_quantity and marks audit completed.
        """
        audit = self.get_object()
        if audit.status == 'completed':
            return response.Response({'error': 'Audit is already reconciled and completed'}, status=400)

        with transaction.atomic():
            items = audit.items.select_related('variant', 'variant__stock').all()
            for itm in items:
                stock, created = Stock.objects.select_for_update().get_or_create(variant=itm.variant)
                stock.current_quantity = itm.counted_quantity
                stock.save(update_fields=['current_quantity', 'last_updated'])

            audit.status = 'completed'
            audit.completed_at = timezone.now()
            audit.save(update_fields=['status', 'completed_at'])
            audit.recalculate_totals()

            # Log to UserActivity
            if request.user and request.user.is_authenticated:
                UserActivity.objects.create(
                    company=audit.company,
                    user=request.user,
                    action='reconcile',
                    model_name='StockAudit',
                    object_id=audit.id,
                    ip_address=request.META.get('REMOTE_ADDR'),
                    details={
                        'title': audit.title,
                        'total_counted': audit.total_counted_items,
                        'total_variance': audit.total_variance_items,
                        'variance_cost': str(audit.total_variance_cost),
                        'user_agent': request.META.get('HTTP_USER_AGENT', ''),
                    }
                )

        return response.Response(StockAuditDetailSerializer(audit).data)

    @action(detail=True, methods=['post'])
    def cancel(self, request, pk=None):
        """
        Cancel an active stock audit session without applying any stock changes.
        """
        audit = self.get_object()
        if audit.status == 'completed':
            return response.Response({'error': 'Cannot cancel an already completed and reconciled stocktake'}, status=400)

        audit.status = 'cancelled'
        audit.save(update_fields=['status'])

        # Log to UserActivity
        if request.user and request.user.is_authenticated:
            UserActivity.objects.create(
                company=audit.company,
                user=request.user,
                action='cancel',
                model_name='StockAudit',
                object_id=audit.id,
                ip_address=request.META.get('REMOTE_ADDR'),
                details={
                    'title': audit.title,
                    'reason': request.data.get('reason', 'Cancelled by user'),
                    'user_agent': request.META.get('HTTP_USER_AGENT', ''),
                }
            )

        return response.Response(StockAuditDetailSerializer(audit).data)

    @action(detail=True, methods=['get'], url_path='export-csv')
    def export_csv(self, request, pk=None):
        """Export full stocktake discrepancy report as CSV"""
        audit = self.get_object()
        items = audit.items.select_related('variant', 'variant__product', 'variant__product__brand').all()

        resp = HttpResponse(content_type='text/csv; charset=utf-8')
        resp['Content-Disposition'] = f'attachment; filename="stock_audit_{audit.id}_discrepancies.csv"'
        # Write UTF-8 BOM for Excel Arabic compatibility
        resp.write('\ufeff')

        writer = csv.writer(resp)
        writer.writerow([
            'Item ID', 'Brand', 'Model Name', 'Color', 'Size',
            'SKU', 'Barcode', 'Unit Cost (EGP)',
            'Expected (System)', 'Counted (Physical)',
            'Discrepancy (Variance)', 'Variance Value (EGP)', 'Status'
        ])

        for itm in items:
            writer.writerow([
                itm.id,
                itm.variant.product.brand.name if itm.variant.product.brand else '',
                itm.variant.product.model_name,
                itm.variant.color,
                itm.variant.size,
                itm.variant.full_sku,
                itm.variant.barcode or '',
                str(itm.unit_cost),
                itm.expected_quantity,
                itm.counted_quantity,
                itm.discrepancy,
                str(itm.discrepancy_value),
                itm.discrepancy_type.upper()
            ])

        return resp

