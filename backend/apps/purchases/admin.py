from django.contrib import admin
from .models import PurchaseOrder, PurchaseOrderItem

class PurchaseOrderItemInline(admin.TabularInline):
    model = PurchaseOrderItem
    extra = 1

@admin.register(PurchaseOrder)
class PurchaseOrderAdmin(admin.ModelAdmin):
    list_display = ['id', 'supplier', 'order_date', 'status', 'total_amount_foreign']
    list_filter = ['status', 'supplier']
    inlines = [PurchaseOrderItemInline]
