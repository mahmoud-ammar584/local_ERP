from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated
from .models import UserActivity
from .serializers import UserActivitySerializer
from apps.core.mixins import TenantScopedViewSetMixin
from apps.accounts.permissions import HasModulePermission

class UserActivityViewSet(TenantScopedViewSetMixin, viewsets.ReadOnlyModelViewSet):
    """
    Read-only endpoint for admins and authorized auditors to inspect tenant audit logs.
    Filterable by date, user, model_name.
    """
    module_name = 'audit'
    queryset = UserActivity.objects.select_related('user', 'company').all()
    serializer_class = UserActivitySerializer
    permission_classes = [IsAuthenticated, HasModulePermission]
    filterset_fields = ['user', 'model_name']
    search_fields = ['action', 'user__username', 'model_name', 'ip_address']
    ordering_fields = ['timestamp']
    ordering = ['-timestamp']
