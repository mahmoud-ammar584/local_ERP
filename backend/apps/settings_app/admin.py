from django.contrib import admin
from .models import Brand, Category, Supplier, CustomerType, PaymentMethod, Currency, TaxRate, StoreInfo

@admin.register(Brand)
class BrandAdmin(admin.ModelAdmin):
    list_display = ['name', 'description']
    search_fields = ['name']

@admin.register(Category)
class CategoryAdmin(admin.ModelAdmin):
    list_display = ['name', 'description']
    search_fields = ['name']

@admin.register(Supplier)
class SupplierAdmin(admin.ModelAdmin):
    list_display = ['name', 'contact_person', 'phone', 'email']
    search_fields = ['name', 'contact_person']

@admin.register(CustomerType)
class CustomerTypeAdmin(admin.ModelAdmin):
    list_display = ['name']

@admin.register(PaymentMethod)
class PaymentMethodAdmin(admin.ModelAdmin):
    list_display = ['name']

@admin.register(Currency)
class CurrencyAdmin(admin.ModelAdmin):
    list_display = ['code', 'name', 'exchange_rate_to_base']

@admin.register(TaxRate)
class TaxRateAdmin(admin.ModelAdmin):
    list_display = ['name', 'rate']

@admin.register(StoreInfo)
class StoreInfoAdmin(admin.ModelAdmin):
    list_display = ['name', 'phone', 'email']
