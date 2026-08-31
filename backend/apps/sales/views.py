import csv
from django.http import HttpResponse, FileResponse
from django_filters import rest_framework as filters
from rest_framework import viewsets, status
from rest_framework.decorators import action, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from .models import SalesTransaction, ReturnTransaction
from .serializers import (
    SalesTransactionSerializer,
    SalesTransactionCreateSerializer,
    ReturnTransactionSerializer,
    ReturnTransactionCreateSerializer,
)
from .utils import generate_invoice_pdf
from apps.core.mixins import TenantScopedViewSetMixin, AuditLogMixin
from apps.accounts.permissions import HasModulePermission

class SalesFilter(filters.FilterSet):
    transaction_date = filters.DateFromToRangeFilter()
    
    class Meta:
        model = SalesTransaction
        fields = ['customer', 'payment_method', 'transaction_date']

class SalesTransactionViewSet(TenantScopedViewSetMixin, AuditLogMixin, viewsets.ModelViewSet):
    module_name = 'sales'
    queryset = SalesTransaction.objects.select_related(
        'customer', 'payment_method'
    ).prefetch_related('items__product', 'items__tax_rate').all()
    permission_classes = [IsAuthenticated, HasModulePermission]
    filterset_class = SalesFilter
    ordering = ['-transaction_date']

    def get_serializer_class(self):
        if self.action in ['create']:
            return SalesTransactionCreateSerializer
        return SalesTransactionSerializer

    def create(self, request, *args, **kwargs):
        try:
            return super().create(request, *args, **kwargs)
        except Exception as e:
            import traceback
            traceback.print_exc()
            if hasattr(e, 'detail'):
                return Response(e.detail, status=status.HTTP_400_BAD_REQUEST)
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=False, methods=['get'])
    def export_csv(self, request):
        """Export sales to CSV file"""
        queryset = self.filter_queryset(self.get_queryset())
        
        response = HttpResponse(content_type='text/csv; charset=utf-8-sig')
        response['Content-Disposition'] = 'attachment; filename="sales_report.csv"'
        
        writer = csv.writer(response)
        writer.writerow(['#', 'Date', 'Customer', 'Payment Method', 'Total Amount', 'Profit'])
        
        for sale in queryset:
            writer.writerow([
                sale.id,
                sale.transaction_date.strftime('%Y-%m-%d %H:%M'),
                sale.customer.name if sale.customer else '—',
                sale.payment_method.name,
                sale.final_amount,
                sale.total_profit
            ])
            
        return response

    @action(detail=True, methods=['get'])
    def invoice(self, request, pk=None):
        """Generate PDF invoice for a sale"""
        sale = self.get_object()
        pdf_buffer = generate_invoice_pdf(sale)
        return FileResponse(
            pdf_buffer, 
            as_attachment=True, 
            filename=f'invoice_{sale.id}.pdf'
        )


class ReturnTransactionViewSet(TenantScopedViewSetMixin, AuditLogMixin, viewsets.ModelViewSet):
    """
    ViewSet for handling customer returns, exchanges, and automatic inventory restock.
    """
    module_name = 'sales'
    queryset = ReturnTransaction.objects.select_related('customer', 'original_transaction').prefetch_related('items', 'items__sales_item', 'items__sales_item__variant').all()
    permission_classes = [IsAuthenticated, HasModulePermission]
    ordering = ['-return_date']

    def get_queryset(self):
        profile = getattr(getattr(self.request, 'user', None), 'profile', None)
        if not profile or not profile.company_id:
            return ReturnTransaction.objects.none()
        return ReturnTransaction.objects.filter(original_transaction__company_id=profile.company_id).select_related('customer', 'original_transaction').prefetch_related('items', 'items__sales_item', 'items__sales_item__variant', 'items__sales_item__variant__product').order_by('-return_date')

    def get_serializer_class(self):
        if self.action in ['create']:
            return ReturnTransactionCreateSerializer
        return ReturnTransactionSerializer

    def create(self, request, *args, **kwargs):
        try:
            return super().create(request, *args, **kwargs)
        except Exception as e:
            import traceback
            traceback.print_exc()
            if hasattr(e, 'detail'):
                return Response(e.detail, status=status.HTTP_400_BAD_REQUEST)
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)
