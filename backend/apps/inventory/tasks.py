from django.db import transaction
from django.db.models import F
from .models import Stock

def update_stock(variant_id: int, quantity_change: int) -> None:
    """
    Atomic stock update using F() expression to prevent race conditions.
    Uses select_for_update to lock the row during the transaction.
    """
    with transaction.atomic():
        stock, created = (
            Stock.objects
            .select_for_update()
            .get_or_create(variant_id=variant_id)
        )
        stock.current_quantity = F('current_quantity') + quantity_change
        stock.save(update_fields=['current_quantity', 'last_updated'])
        
        # Note: We don't print here in production, but keeping it for visibility during development
        # stock.refresh_from_db() # If we need to print the new value
        # print(f"Stock Update: Variant ID {variant_id} updated by {quantity_change}")
