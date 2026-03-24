from django.contrib import admin
from .models import Customer

@admin.register(Customer)
class CustomerAdmin(admin.ModelAdmin):
    list_display = ['name', 'phone', 'customer_type', 'total_purchases', 'last_purchase_date']
    list_filter = ['customer_type']
    search_fields = ['name', 'phone', 'email']
