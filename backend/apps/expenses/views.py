from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated
from .models import Expense, ExpenseCategory
from .serializers import ExpenseSerializer, ExpenseCategorySerializer
from apps.core.mixins import TenantScopedViewSetMixin, AuditLogMixin
from apps.accounts.permissions import HasModulePermission


class ExpenseCategoryViewSet(TenantScopedViewSetMixin, AuditLogMixin, viewsets.ModelViewSet):
    module_name = 'expenses'
    queryset = ExpenseCategory.objects.all()
    serializer_class = ExpenseCategorySerializer
    permission_classes = [IsAuthenticated, HasModulePermission]


class ExpenseViewSet(TenantScopedViewSetMixin, AuditLogMixin, viewsets.ModelViewSet):
    module_name = 'expenses'
    queryset = Expense.objects.select_related('payment_method', 'expense_category').all()
    serializer_class = ExpenseSerializer
    permission_classes = [IsAuthenticated, HasModulePermission]
    filterset_fields = ['expense_category', 'payment_method']
    ordering = ['-expense_date']
