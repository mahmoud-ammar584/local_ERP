from rest_framework import permissions


class AdminOnly(permissions.BasePermission):
    """
    Allow access to users with 'owner' or 'admin' role within their company.
    """
    def has_permission(self, request, view):
        if not (request.user and request.user.is_authenticated):
            return False
        profile = getattr(request.user, 'profile', None)
        return bool(profile and profile.company_id and profile.role in ['owner', 'admin'])


class HasModulePermission(permissions.BasePermission):
    """
    Granular per-module & per-action permission class.
    Modules: 'dashboard', 'sales', 'purchases', 'inventory', 'customers', 'expenses', 'settings', 'users', 'audit'
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

    LOOKUP_VIEW_NAMES = {
        'BrandViewSet',
        'CategoryViewSet',
        'SupplierViewSet',
        'CustomerTypeViewSet',
        'PaymentMethodViewSet',
        'CurrencyViewSet',
        'TaxRateViewSet',
    }

    def has_permission(self, request, view):
        if not (request.user and request.user.is_authenticated):
            return False

        profile = getattr(request.user, 'profile', None)
        if not profile or not profile.company_id:
            return False

        # Company owner and admins have full access across all modules/actions
        if profile.role in ['owner', 'admin']:
            return True

        # Common master / lookup tables: allow read-only (GET) to all authenticated company members
        view_name = view.__class__.__name__
        if view_name in self.LOOKUP_VIEW_NAMES and request.method in ['GET', 'HEAD', 'OPTIONS']:
            return True

        # Determine target module
        module = getattr(view, 'module_name', None)
        if not module:
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


# Backward compatibility aliases
CashierSalesPermission = HasModulePermission
CashierInventoryPermission = HasModulePermission
CashierPurchasesPermission = HasModulePermission
