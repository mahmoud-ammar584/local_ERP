import uuid
from datetime import timedelta
from django.db import models
from django.contrib.auth.models import User
from django.utils import timezone


class Company(models.Model):
    name = models.CharField(max_length=200)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.name

    class Meta:
        verbose_name_plural = "Companies"


class Profile(models.Model):
    ROLE_CHOICES = [
        ('owner', 'Owner'),
        ('admin', 'Admin'),
        ('cashier', 'Cashier'),
        ('custom', 'Custom'),
    ]
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='profile')
    company = models.ForeignKey(
        Company, on_delete=models.CASCADE, related_name='profiles', null=True, blank=True
    )
    role = models.CharField(max_length=10, choices=ROLE_CHOICES, default='cashier')
    permissions = models.JSONField(default=dict, blank=True)

    def has_permission(self, module, action):
        """
        Check if profile has specific action permission for a module.
        Supports both direct action names and hierarchical fallback.
        """
        if self.role in ['owner', 'admin']:
            return True
        if not self.permissions or not isinstance(self.permissions, dict):
            return False

        module_perms = self.permissions.get(module, [])
        if not isinstance(module_perms, list):
            return False

        # Direct match (e.g. 'stocktake_reconcile', 'print_barcode', 'adjust_stock')
        if action in module_perms:
            return True

        # Hierarchical fallback:
        # 'edit' grants adjust_stock, stocktake_reconcile, receive
        if action in ['adjust_stock', 'stocktake_reconcile', 'receive'] and 'edit' in module_perms:
            return True

        # 'add' grants stocktake_count, stocktake_create
        if action in ['stocktake_count', 'stocktake_create'] and 'add' in module_perms:
            return True

        # 'view' grants stocktake_view, print_barcode, export_csv, apply_discount
        if action in ['stocktake_view', 'print_barcode', 'export_csv', 'apply_discount'] and 'view' in module_perms:
            return True

        return False

    def __str__(self):
        company_name = self.company.name if self.company else "No Company"
        return f"{self.user.username} ({self.role}) - {company_name}"


class Invitation(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    company = models.ForeignKey(Company, on_delete=models.CASCADE, related_name='invitations')
    email = models.EmailField()
    invited_by = models.ForeignKey(User, on_delete=models.CASCADE, related_name='sent_invitations')
    token = models.CharField(max_length=100, unique=True)
    role = models.CharField(max_length=20, default='cashier')
    permissions = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField()
    is_used = models.BooleanField(default=False)

    @property
    def is_expired(self):
        return timezone.now() > self.expires_at

    def __str__(self):
        return f"Invite for {self.email} to {self.company.name}"
