import csv
from django.http import HttpResponse
from django_filters import rest_framework as filters
from rest_framework import viewsets, status
from rest_framework.decorators import action, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from .models import SalesTransaction
from .serializers import SalesTransactionSerializer, SalesTransactionCreateSerializer
from apps.accounts.permissions import CashierSalesPermission

class SalesFilter(filters.FilterSet):
    transaction_date = filters.DateFromToRangeFilter()
    
    class Meta:
        model = SalesTransaction
        fields = ['customer', 'payment_method', 'transaction_date']

class SalesTransactionViewSet(viewsets.ModelViewSet):
    queryset = SalesTransaction.objects.select_related(
        'customer', 'payment_method'
    ).prefetch_related('items__product', 'items__tax_rate').all()
    permission_classes = [IsAuthenticated, CashierSalesPermission]
    filterset_class = SalesFilter
    ordering = ['-transaction_date']

    def get_serializer_class(self):
        if self.action in ['create']:
            return SalesTransactionCreateSerializer
        return SalesTransactionSerializer

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
