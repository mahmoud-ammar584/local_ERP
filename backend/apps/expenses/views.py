from rest_framework import viewsets
from .models import Expense, ExpenseCategory
from .serializers import ExpenseSerializer, ExpenseCategorySerializer

class ExpenseCategoryViewSet(viewsets.ModelViewSet):
    queryset = ExpenseCategory.objects.all()
    serializer_class = ExpenseCategorySerializer

class ExpenseViewSet(viewsets.ModelViewSet):
    queryset = Expense.objects.select_related('payment_method', 'expense_category').all()
    serializer_class = ExpenseSerializer
    filterset_fields = ['expense_category', 'payment_method']
    ordering = ['-expense_date']
