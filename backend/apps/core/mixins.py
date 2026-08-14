from rest_framework import status
from rest_framework.response import Response
from apps.core.models import UserActivity


def get_client_ip(request):
    """Extract client IP address from HTTP request headers"""
    if not request:
        return None
    x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
    if x_forwarded_for:
        ip = x_forwarded_for.split(',')[0].strip()
    else:
        ip = request.META.get('REMOTE_ADDR')
    return ip


class TenantScopedViewSetMixin:
    """
    Ensures ViewSet querysets are strictly scoped to request.user.profile.company.
    Automatically assigns company to new instances on create.
    """
    def get_queryset(self):
        queryset = super().get_queryset()
        user = getattr(self.request, 'user', None)
        
        if not user or not user.is_authenticated:
            return queryset.none()
            
        profile = getattr(user, 'profile', None)
        if not profile or not profile.company_id:
            return queryset.none()

        model = queryset.model
        field_names = [f.name for f in model._meta.get_fields()]

        if 'company' in field_names:
            return queryset.filter(company_id=profile.company_id)
        elif 'product' in field_names and hasattr(model.product.field.related_model, 'company'):
            return queryset.filter(product__company_id=profile.company_id)
        elif 'sales_transaction' in field_names and hasattr(model.sales_transaction.field.related_model, 'company'):
            return queryset.filter(sales_transaction__company_id=profile.company_id)
        elif 'purchase_order' in field_names and hasattr(model.purchase_order.field.related_model, 'company'):
            return queryset.filter(purchase_order__company_id=profile.company_id)
            
        return queryset

    def perform_create(self, serializer):
        user = getattr(self.request, 'user', None)
        profile = getattr(user, 'profile', None)
        company = profile.company if profile else None
        
        model = serializer.Meta.model
        field_names = [f.name for f in model._meta.get_fields()]

        kwargs = {}
        if 'company' in field_names and company:
            kwargs['company'] = company

        instance = serializer.save(**kwargs)
        return instance


class AuditLogMixin:
    """
    Automatically creates UserActivity log entries for DRF mutating actions
    (create, update, destroy).
    """
    def perform_create(self, serializer):
        if hasattr(super(), 'perform_create'):
            instance = super().perform_create(serializer)
        else:
            instance = serializer.save()
            
        self._log_audit_event(
            action=f"Created {instance._meta.verbose_name.title()} #{getattr(instance, 'pk', '')}",
            instance=instance
        )
        return instance

    def perform_update(self, serializer):
        if hasattr(super(), 'perform_update'):
            instance = super().perform_update(serializer)
        else:
            instance = serializer.save()
            
        self._log_audit_event(
            action=f"Updated {instance._meta.verbose_name.title()} #{getattr(instance, 'pk', '')}",
            instance=instance
        )
        return instance

    def perform_destroy(self, instance):
        pk = getattr(instance, 'pk', '')
        verbose_name = instance._meta.verbose_name.title()
        
        if hasattr(super(), 'perform_destroy'):
            super().perform_destroy(instance)
        else:
            instance.delete()
            
        self._log_audit_event(
            action=f"Deleted {verbose_name} #{pk}",
            instance=instance,
            object_id=pk if isinstance(pk, int) else None
        )

    def _log_audit_event(self, action, instance=None, object_id=None):
        try:
            request = getattr(self, 'request', None)
            if not request or not request.user or not request.user.is_authenticated:
                return

            profile = getattr(request.user, 'profile', None)
            company = profile.company if profile else None
            ip_address = get_client_ip(request)
            
            model_name = instance._meta.model_name if instance else getattr(self, 'module_name', 'Unknown')
            obj_id = object_id or getattr(instance, 'pk', None)
            if not isinstance(obj_id, int):
                obj_id = None

            UserActivity.objects.create(
                user=request.user,
                company=company,
                action=action,
                model_name=model_name,
                object_id=obj_id,
                ip_address=ip_address,
                details={
                    "path": request.path,
                    "method": request.method,
                }
            )
        except Exception as e:
            # Audit failures must not crash primary operations
            print(f"Audit log error: {e}")
