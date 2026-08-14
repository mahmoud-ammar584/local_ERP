from rest_framework import permissions


class AdminOnly(permissions.BasePermission):
    """
    Allow access only to users with 'admin' role within their company.
    """
    def has_permission(self, request, view):
        if not (request.user and request.user.is_authenticated):
            return False
        profile = getattr(request.user, 'profile', None)
        return bool(profile and profile.company_id and profile.role == 'admin')


class HasModulePermission(permissions.BasePermission):
    """
    Granular per-module & per-action permission class.
    Modules: 'sales', 'purchases', 'inventory', 'customers', 'expenses', 'settings', 'users', 'audit'
    Actions: 'view', 'add', 'edit', 'delete'
    """
    METHOD_ACTION_MAP = {
        'GET': 'view',
        'HEAD': 'view',
        'OPTIONS': 'view',
        'POST': 'add',
        'PUT': 'edit',
        'PATCH': 'edit',
        'DELETE': 'delete',
    }

    def has_permission(self, request, view):
        if not (request.user and request.user.is_authenticated):
            return False

        profile = getattr(request.user, 'profile', None)
        if not profile or not profile.company_id:
            return False

        # Company admins have full access across all modules/actions by default
        if profile.role == 'admin':
            return True

        # Determine target module
        module = getattr(view, 'module_name', None)
        if not module:
            # Fallback to app_label of the queryset model if defined
            queryset = getattr(view, 'queryset', None)
            if queryset is not None:
                module = queryset.model._meta.app_label
            else:
                return False

        # Determine target action
        action = getattr(view, 'action', None)
        if action in ['list', 'retrieve', 'export_csv', 'invoice', 'lookup']:
            action_name = 'view'
        elif action in ['create', 'adjust_stock', 'receive']:
            action_name = 'add'
        elif action in ['update', 'partial_update']:
            action_name = 'edit'
        elif action in ['destroy']:
            action_name = 'delete'
        else:
            action_name = self.METHOD_ACTION_MAP.get(request.method, 'view')

        return profile.has_permission(module, action_name)


# Backward compatibility aliases for existing code paths
CashierSalesPermission = HasModulePermission
CashierInventoryPermission = HasModulePermission
CashierPurchasesPermission = HasModulePermission
