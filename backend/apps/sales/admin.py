from django.contrib import admin
from .models import SalesTransaction, SalesItem

class SalesItemInline(admin.TabularInline):
    model = SalesItem
    extra = 1

@admin.register(SalesTransaction)
class SalesTransactionAdmin(admin.ModelAdmin):
    list_display = ['id', 'transaction_date', 'customer', 'payment_method', 'final_amount']
    list_filter = ['payment_method', 'transaction_date']
    inlines = [SalesItemInline]
