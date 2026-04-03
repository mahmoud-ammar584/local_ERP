from rest_framework import viewsets
from .models import Expense
from .serializers import ExpenseSerializer

class ExpenseViewSet(viewsets.ModelViewSet):
    queryset = Expense.objects.select_related('payment_method', 'expense_category').all()
    serializer_class = ExpenseSerializer
    filterset_fields = ['expense_category', 'payment_method']
    ordering = ['-expense_date']
