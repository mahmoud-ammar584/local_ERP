from django.contrib import admin
from .models import Product, Stock, ProductVariant

class StockInline(admin.TabularInline):
    model = Stock
    extra = 0

class ProductVariantInline(admin.TabularInline):
    model = ProductVariant
    extra = 1
    show_change_link = True
    fields = ['sku_suffix', 'color', 'size', 'gender', 'price_override', 'is_active']

@admin.register(Product)
class ProductAdmin(admin.ModelAdmin):
    list_display = ['brand', 'model_name', 'category', 'sku', 'suggested_selling_price']
    list_filter = ['brand', 'category']
    search_fields = ['model_name', 'sku', 'variants__sku_suffix']
    inlines = [ProductVariantInline]

@admin.register(ProductVariant)
class ProductVariantAdmin(admin.ModelAdmin):
    list_display = ['full_sku', 'product', 'size', 'color', 'stock_quantity']
    search_fields = ['sku_suffix', 'product__sku', 'product__model_name']
    inlines = [StockInline]

    def stock_quantity(self, obj):
        try:
            return obj.stock.current_quantity
        except:
            return 0
    stock_quantity.short_description = 'Stock'

@admin.register(Stock)
class StockAdmin(admin.ModelAdmin):
    list_display = ['variant', 'current_quantity', 'last_updated']
