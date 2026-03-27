from background_task import background
from django.db import transaction
from .models import Product, Stock

@background(schedule=0)
def update_stock_async(product_id, quantity_change):
    """
    تحديث المخزون في الخلفية لتجنب بطء العمليات الأساسية
    quantity_change: ممكن يكون موجب (مشتريات) أو سالب (مبيعات)
    """
    with transaction.atomic():
        try:
            product = Product.objects.get(id=product_id)
            stock, created = Stock.objects.get_or_create(product=product)
            stock.current_quantity += quantity_change
            stock.save()
            print(f"Async Stock Update: Product {product.sku} updated by {quantity_change}. New total: {stock.current_quantity}")
        except Product.DoesNotExist:
            print(f"Async Stock Error: Product {product_id} not found")
