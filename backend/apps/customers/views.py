from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated
from .models import Customer
from .serializers import CustomerSerializer
from apps.core.mixins import TenantScopedViewSetMixin, AuditLogMixin
from apps.accounts.permissions import HasModulePermission

class CustomerViewSet(TenantScopedViewSetMixin, AuditLogMixin, viewsets.ModelViewSet):
    module_name = 'customers'
    queryset = Customer.objects.select_related('customer_type').all()
    serializer_class = CustomerSerializer
    permission_classes = [IsAuthenticated, HasModulePermission]
    filterset_fields = ['customer_type']
    search_fields = ['name', 'phone', 'email']
    ordering = ['-created_at']
