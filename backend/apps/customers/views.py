from decimal import Decimal
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django.db import transaction
from .models import Customer
from .serializers import CustomerSerializer
from apps.core.mixins import TenantScopedViewSetMixin, AuditLogMixin
from apps.core.utils import log_activity
from apps.accounts.permissions import HasModulePermission
from apps.sales.serializers import SalesTransactionSerializer, ReturnTransactionSerializer


class CustomerViewSet(TenantScopedViewSetMixin, AuditLogMixin, viewsets.ModelViewSet):
    module_name = 'customers'
    queryset = Customer.objects.select_related('customer_type').all()
    serializer_class = CustomerSerializer
    permission_classes = [IsAuthenticated, HasModulePermission]
    filterset_fields = ['customer_type']
    search_fields = ['name', 'phone', 'email']
    ordering = ['-created_at']

    @action(detail=True, methods=['post'], url_path='record-payment')
    def record_payment(self, request, pk=None):
        """
        Record a debt settlement or store credit deposit for this customer.
        Payload: { "amount": 500.00, "notes": "Cash settlement for invoice #12", "payment_type": "debt_payment" }
        """
        customer = self.get_object()
        amount_raw = request.data.get('amount')
        notes = request.data.get('notes', 'Payment recorded')
        payment_type = request.data.get('payment_type', 'debt_payment')

        if not amount_raw:
            return Response({'error': 'Amount is required'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            amount = Decimal(str(amount_raw))
            if amount <= 0:
                return Response({'error': 'Amount must be greater than zero'}, status=status.HTTP_400_BAD_REQUEST)
        except Exception:
            return Response({'error': 'Invalid amount format'}, status=status.HTTP_400_BAD_REQUEST)

        with transaction.atomic():
            old_balance = customer.current_balance
            # In standard accounting:
            # If current_balance represents debt owed by customer (positive = debt):
            # Paying debt reduces current_balance.
            customer.current_balance = customer.current_balance - amount
            customer.save(update_fields=['current_balance'])

            log_activity(
                user=request.user,
                action=f"Payment recorded for customer {customer.name}",
                model_name="Customer",
                object_id=customer.id,
                details={
                    "amount": str(amount),
                    "old_balance": str(old_balance),
                    "new_balance": str(customer.current_balance),
                    "payment_type": payment_type,
                    "notes": notes
                }
            )

        return Response({
            'message': 'Payment recorded successfully',
            'customer_id': customer.id,
            'customer_name': customer.name,
            'amount_paid': str(amount),
            'previous_balance': str(old_balance),
            'new_balance': str(customer.current_balance)
        })

    @action(detail=True, methods=['get'], url_path='statement')
    def statement(self, request, pk=None):
        """
        Get full account statement: Sales transactions + Returns for this customer.
        """
        customer = self.get_object()
        sales = customer.sales.order_by('-transaction_date')[:50]
        returns = customer.returns.order_by('-return_date')[:50]

        return Response({
            'customer': CustomerSerializer(customer).data,
            'sales': SalesTransactionSerializer(sales, many=True).data,
            'returns': ReturnTransactionSerializer(returns, many=True).data,
        })
