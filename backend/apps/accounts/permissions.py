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
        view_name = view.__class__.__name__

        # Granular Stocktake checks
        if view_name == 'StockAuditViewSet':
            if action == 'reconcile':
                return profile.has_permission('inventory', 'stocktake_reconcile')
            elif action in ['scan', 'set_item_count']:
                return profile.has_permission('inventory', 'stocktake_count')
            elif action == 'create':
                return profile.has_permission('inventory', 'stocktake_create')
            elif action in ['list', 'retrieve', 'export_csv']:
                return profile.has_permission('inventory', 'stocktake_view')

        # Product lookup (Used by POS cashier and Stocktake)
        if action == 'lookup':
            if profile.has_permission('sales', 'add') or profile.has_permission('inventory', 'view') or profile.has_permission('inventory', 'stocktake_count'):
                return True

        # Manual Stock Adjustment
        if action == 'adjust_stock':
            return profile.has_permission('inventory', 'adjust_stock')

        # Purchase Order Receiving
        if action == 'receive':
            return profile.has_permission('purchases', 'receive')

        # Generic Action Mapping
        if action in ['list', 'retrieve', 'invoice']:
            action_name = 'view'
        elif action in ['export_csv']:
            action_name = 'export_csv' if profile.has_permission(module, 'export_csv') else 'view'
        elif action in ['create']:
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

