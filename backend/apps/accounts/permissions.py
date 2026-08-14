from rest_framework import permissions

class AdminOnly(permissions.BasePermission):
    """
    Allow access only to users with 'admin' role.
    """
    def has_permission(self, request, view):
        return (
            request.user and 
            request.user.is_authenticated and 
            hasattr(request.user, 'profile') and 
            request.user.profile.role == 'admin'
        )

class CashierSalesPermission(permissions.BasePermission):
    """
    Allow access to Admin or Cashier for sales.
    """
    def has_permission(self, request, view):
        if not (request.user and request.user.is_authenticated):
            return False
        if not hasattr(request.user, 'profile'):
            return False
        return request.user.profile.role in ['admin', 'cashier']

class CashierInventoryPermission(permissions.BasePermission):
    """
    Allow access to Admin or Cashier for inventory.
    """
    def has_permission(self, request, view):
        if not (request.user and request.user.is_authenticated):
            return False
        if not hasattr(request.user, 'profile'):
            return False
        return request.user.profile.role in ['admin', 'cashier']

class CashierPurchasesPermission(permissions.BasePermission):
    """
    Allow access to Admin or Cashier for purchases.
    """
    def has_permission(self, request, view):
        if not (request.user and request.user.is_authenticated):
            return False
        if not hasattr(request.user, 'profile'):
            return False
        return request.user.profile.role in ['admin', 'cashier']
