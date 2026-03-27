from django.core.management.base import BaseCommand
from django.db import transaction
from apps.inventory.models import Product, ProductVariant, Stock

class Command(BaseCommand):
    help = 'Migrate existing products to product variants'

    def handle(self, *args, **options):
        self.stdout.write('Starting migration...')
        
        products = Product.objects.all()
        migrated_count = 0
        
        with transaction.atomic():
            for product in products:
                if product.variants.exists():
                    continue
                
                # Use raw SQL to get old columns before they are deleted by migration
                from django.db import connection
                with connection.cursor() as cursor:
                    cursor.execute("SELECT sku, size, color FROM inventory_product WHERE id=%s", [product.id])
                    row = cursor.fetchone()
                    if row:
                        old_sku, old_size, old_color = row
                    else:
                        old_sku, old_size, old_color = f"OLD-{product.id}", "N/A", "N/A"
                
                # Create the first variant
                # Use the previous SKU as the product base SKU.
                product.sku = old_sku
                product.save(update_fields=['sku'])

                variant = ProductVariant.objects.create(
                    product=product,
                    sku_suffix='',
                    size=old_size,
                    color=old_color,
                )
                
                # Transfer stock
                with connection.cursor() as cursor:
                    cursor.execute("SELECT current_quantity FROM inventory_stock WHERE product_id=%s", [product.id])
                    row = cursor.fetchone()
                    if row:
                        qty = row[0]
                        Stock.objects.update_or_create(
                            variant=variant,
                            defaults={'current_quantity': qty}
                        )
                
                migrated_count += 1
                
        self.stdout.write(self.style.SUCCESS(f'Successfully migrated {migrated_count} products to variants.'))
