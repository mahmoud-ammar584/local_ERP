from rest_framework import viewsets, response, status
from rest_framework.decorators import action
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
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

    @action(
        detail=False,
        methods=['post'],
        url_path='upload-image',
        parser_classes=[MultiPartParser, FormParser, JSONParser]
    )
    def upload_image(self, request):
        """
        Upload and auto-compress a product or variant image to WebP format.
        Supports binary file uploads, multipart form data, or base64 data.
        """
        try:
            image_file = request.FILES.get('image') or request.FILES.get('file')
            base64_str = request.data.get('image_base64') or (request.data.get('image') if isinstance(request.data.get('image'), str) else None)

            if not image_file and not base64_str:
                return response.Response({'error': 'No image file or base64 provided in request'}, status=400)

            from .image_optimizer import compress_and_optimize_image
            from django.core.files.storage import default_storage
            from django.conf import settings
            import uuid
            import base64
            import os
            from django.core.files.base import ContentFile

            if base64_str and ',' in base64_str:
                base64_str = base64_str.split(',', 1)[1]

            if base64_str and not image_file:
                decoded = base64.b64decode(base64_str)
                image_file = ContentFile(decoded, name="upload.jpg")

            optimized_file = compress_and_optimize_image(image_file)
            if not optimized_file:
                return response.Response({'error': 'Failed to process image'}, status=400)

            file_url = None
            saved_path = None

            # Try saving to storage
            try:
                unique_name = f"variants/{uuid.uuid4().hex[:12]}_{getattr(optimized_file, 'name', 'img.webp')}"
                if hasattr(settings, 'MEDIA_ROOT') and settings.MEDIA_ROOT:
                    try:
                        os.makedirs(os.path.join(str(settings.MEDIA_ROOT), 'variants'), exist_ok=True)
                    except Exception:
                        pass

                saved_path = default_storage.save(unique_name, optimized_file)
                media_url = settings.MEDIA_URL if settings.MEDIA_URL.startswith('/') else f"/{settings.MEDIA_URL}"
                file_url = f"{media_url.rstrip('/')}/{saved_path}"
            except Exception:
                # If disk storage is unavailable (e.g. read-only serverless environment), fallback to Data URL
                try:
                    optimized_file.seek(0)
                    encoded = base64.b64encode(optimized_file.read()).decode('utf-8')
                    file_url = f"data:image/webp;base64,{encoded}"
                    saved_path = 'data_url'
                except Exception:
                    file_url = None

            if not file_url:
                return response.Response({'error': 'Failed to save processed image'}, status=400)

            variant_id = request.data.get('variant_id')
            product_id = request.data.get('product_id')
            if variant_id:
                try:
                    v = ProductVariant.objects.get(id=int(variant_id))
                    v.image_url = file_url
                    v.save(update_fields=['image_url'])
                    # Automatically propagate this color's photo to ALL sizes of the same product and color!
                    ProductVariant.objects.filter(
                        product=v.product,
                        color__iexact=v.color
                    ).update(image_url=file_url)
                except (ProductVariant.DoesNotExist, ValueError):
                    pass
            elif product_id:
                try:
                    p = Product.objects.get(id=int(product_id))
                    p.image_url = file_url
                    p.save(update_fields=['image_url'])
                except (Product.DoesNotExist, ValueError):
                    pass

            return response.Response({
                'message': 'Image uploaded and compressed successfully',
                'url': file_url,
                'path': saved_path
            })
        except Exception as e:
            return response.Response({'error': f'Image processing error: {str(e)}'}, status=400)

    @action(detail=True, methods=['post'], url_path='add-variant')
    def add_variant(self, request, pk=None):
        """
        Add one or multiple Color/Size variants to an existing Product.
        Supports single payload or { "variants": [...] } batch payload.
        """
        product = self.get_object()
        from .serializers import compute_sku_suffix

        raw_variants = request.data.get('variants')
        if not isinstance(raw_variants, list) or len(raw_variants) == 0:
            raw_variants = [request.data]

        created_or_updated = []

        with transaction.atomic():
            for item in raw_variants:
                color = str(item.get('color', 'Standard')).strip()
                size = str(item.get('size', 'Standard')).strip()
                gender = str(item.get('gender', 'U')).strip()
                barcode = str(item.get('barcode', '')).strip() or None
                image_url = str(item.get('image_url', '')).strip() or None
                price_override = item.get('price_override')
                initial_quantity = int(item.get('current_quantity') or item.get('initial_quantity') or item.get('quantity') or 0)

                # Inherit image from same-color siblings if not explicitly given
                if not image_url:
                    sibling = ProductVariant.objects.filter(
                        product=product,
                        color__iexact=color
                    ).filter(models.Q(image__isnull=False) | models.Q(image_url__isnull=False)).first()
                    if sibling:
                        image_url = sibling.image_url or (sibling.image.url if sibling.image else None)

                sku_suffix = item.get('sku_suffix') or compute_sku_suffix(color=color, size=size, gender=gender)

                variant, created = ProductVariant.objects.get_or_create(
                    product=product,
                    sku_suffix=sku_suffix,
                    defaults={
                        'color': color,
                        'size': size,
                        'gender': gender,
                        'barcode': barcode,
                        'image_url': image_url,
                        'price_override': price_override
                    }
                )

                if not created:
                    if color: variant.color = color
                    if size: variant.size = size
                    if barcode: variant.barcode = barcode
                    if image_url: variant.image_url = image_url
                    if price_override is not None: variant.price_override = price_override
                    variant.save()

                stock, _ = Stock.objects.get_or_create(variant=variant)
                if created:
                    stock.current_quantity = initial_quantity
                else:
                    stock.current_quantity += initial_quantity
                stock.save()

                log_activity(
                    user=request.user,
                    action=f"Variant added/updated: {variant.full_sku} for {product.model_name}",
                    model_name="ProductVariant",
                    object_id=variant.id,
                    details={
                        "color": color,
                        "size": size,
                        "initial_quantity": initial_quantity
                    }
                )
                created_or_updated.append(variant)

        if len(created_or_updated) == 1:
            return response.Response(ProductVariantSerializer(created_or_updated[0]).data, status=status.HTTP_201_CREATED)
        return response.Response(ProductVariantSerializer(created_or_updated, many=True).data, status=status.HTTP_201_CREATED)

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

        is_exact_variant = True

        # 2. If not found, try base product SKU or base product barcode
        if not variant:
            is_exact_variant = False
            variant = variant_qs.filter(
                Q(product__sku__iexact=query) | Q(product__barcode__iexact=query)
            ).order_by('id').first()

        if not variant:
            return response.Response({'error': f'No product found matching "{query}"'}, status=404)

        serializer = ProductVariantSerializer(variant)
        data = serializer.data
        data['is_exact_variant'] = is_exact_variant

        # Attach sibling variants of the product
        all_variants = (
            ProductVariant.objects
            .filter(product_id=variant.product_id, is_active=True)
            .select_related('product', 'product__brand')
            .prefetch_related('stock')
        )
        data['all_variants'] = ProductVariantSerializer(all_variants, many=True).data

        return response.Response(data)

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

