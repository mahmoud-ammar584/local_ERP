from background_task import background
from django.db import transaction
from .models import ProductVariant, Stock

@background(schedule=0)
def update_stock_async(variant_id, quantity_change):
    """
    Update stock in the background to prevent UI blocking.
    quantity_change: can be positive (purchases) or negative (sales).
    """
    with transaction.atomic():
        try:
            variant = ProductVariant.objects.select_related('product').get(id=variant_id)
            stock, created = Stock.objects.get_or_create(variant=variant)
            stock.current_quantity += quantity_change
            stock.save()
            print(f"Async Stock Update: Variant {variant.full_sku} updated by {quantity_change}. New total: {stock.current_quantity}")
        except ProductVariant.DoesNotExist:
            print(f"Async Stock Error: Variant {variant_id} not found")
