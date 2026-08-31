from django.contrib import admin
from .models import Product, Stock, ProductVariant, StockAudit, StockAuditItem

class StockInline(admin.TabularInline):
    model = Stock
    extra = 0

class ProductVariantInline(admin.TabularInline):
    model = ProductVariant
    extra = 1
    show_change_link = True
    fields = ['sku_suffix', 'barcode', 'color', 'size', 'gender', 'price_override', 'is_active']

@admin.register(Product)
class ProductAdmin(admin.ModelAdmin):
    list_display = ['brand', 'model_name', 'category', 'sku', 'barcode', 'suggested_selling_price']
    list_filter = ['brand', 'category']
    search_fields = ['model_name', 'sku', 'barcode', 'variants__sku_suffix', 'variants__barcode']
    inlines = [ProductVariantInline]

@admin.register(ProductVariant)
class ProductVariantAdmin(admin.ModelAdmin):
    list_display = ['full_sku', 'barcode', 'product', 'size', 'color', 'stock_quantity']
    search_fields = ['sku_suffix', 'barcode', 'product__sku', 'product__model_name']
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


class StockAuditItemInline(admin.TabularInline):
    model = StockAuditItem
    extra = 0
    readonly_fields = ['variant', 'expected_quantity', 'counted_quantity', 'unit_cost', 'discrepancy', 'discrepancy_value', 'last_scanned_at']
    can_delete = False

@admin.register(StockAudit)
class StockAuditAdmin(admin.ModelAdmin):
    list_display = ['id', 'title', 'status', 'total_expected_items', 'total_counted_items', 'total_variance_items', 'total_variance_cost', 'created_at']
    list_filter = ['status', 'created_at']
    search_fields = ['title', 'notes']
    inlines = [StockAuditItemInline]

