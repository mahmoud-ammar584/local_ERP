from django.db import models
from apps.settings_app.models import CustomerType

class Customer(models.Model):
    name = models.CharField(max_length=200)
    phone = models.CharField(max_length=50, unique=True, blank=True, null=True)
    email = models.EmailField(unique=True, blank=True, null=True)
    customer_type = models.ForeignKey(CustomerType, on_delete=models.PROTECT, related_name='customers')
    address = models.TextField(blank=True, null=True)
    preferred_brands = models.TextField(blank=True, null=True)
    total_purchases = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    total_profit = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    last_purchase_date = models.DateField(blank=True, null=True)
    notes = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.name
