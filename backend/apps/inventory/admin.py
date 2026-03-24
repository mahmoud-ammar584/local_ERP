from django.contrib import admin
from .models import Product, Stock

class StockInline(admin.StackedInline):
    model = Stock
    extra = 0

@admin.register(Product)
class ProductAdmin(admin.ModelAdmin):
    list_display = ['sku', 'brand', 'model', 'category', 'size', 'color', 'suggested_selling_price']
    list_filter = ['brand', 'category', 'gender']
    search_fields = ['sku', 'barcode', 'model']
    inlines = [StockInline]

@admin.register(Stock)
class StockAdmin(admin.ModelAdmin):
    list_display = ['product', 'current_quantity', 'last_updated']
