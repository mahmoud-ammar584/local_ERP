from rest_framework import viewsets
from .models import SalesTransaction
from .serializers import SalesTransactionSerializer, SalesTransactionCreateSerializer

class SalesTransactionViewSet(viewsets.ModelViewSet):
    queryset = SalesTransaction.objects.select_related(
        'customer', 'payment_method'
    ).prefetch_related('items__product', 'items__tax_rate').all()
    filterset_fields = ['customer', 'payment_method']
    ordering = ['-transaction_date']

    def get_serializer_class(self):
        if self.action in ['create']:
            return SalesTransactionCreateSerializer
        return SalesTransactionSerializer
