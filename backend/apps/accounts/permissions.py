from rest_framework import permissions

class AdminOnly(permissions.BasePermission):
    def has_permission(self, request, view):
        return request.user and request.user.is_authenticated and hasattr(request.user, 'profile') and request.user.profile.role == 'admin'

class CashierInventoryPermission(permissions.BasePermission):
    def has_permission(self, request, view):
        if not (request.user and request.user.is_authenticated and hasattr(request.user, 'profile')):
            return False
        if request.user.profile.role == 'admin':
            return True
        return request.method in permissions.SAFE_METHODS

class CashierSalesPermission(permissions.BasePermission):
    def has_permission(self, request, view):
        if not (request.user and request.user.is_authenticated and hasattr(request.user, 'profile')):
            return False
        if request.user.profile.role == 'admin':
            return True
        # Cashier: create-only (and read safe methods)
        return request.method == 'POST' or request.method in permissions.SAFE_METHODS

class CashierPurchasesPermission(permissions.BasePermission):
    def has_permission(self, request, view):
        if not (request.user and request.user.is_authenticated and hasattr(request.user, 'profile')):
            return False
        if request.user.profile.role == 'admin':
            return True
        # Cashier: no deletion
        return request.method != 'DELETE'
