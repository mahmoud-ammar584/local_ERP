from django.db import models
from apps.settings_app.models import Supplier, Currency
from apps.inventory.models import Product
from apps.inventory.tasks import update_stock_async

class PurchaseOrder(models.Model):
    STATUS_CHOICES = [
        ('P', 'Pending'), ('R', 'Received'),
        ('PR', 'Partially Received'), ('C', 'Cancelled'),
    ]
    supplier = models.ForeignKey(Supplier, on_delete=models.PROTECT, related_name='purchase_orders')
    order_date = models.DateField()
    expected_delivery_date = models.DateField(blank=True, null=True)
    status = models.CharField(max_length=2, choices=STATUS_CHOICES, default='P')
    total_amount_foreign = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    currency = models.ForeignKey(Currency, on_delete=models.PROTECT)
    notes = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def recalculate_total(self):
        total = sum(
            item.ordered_quantity * item.unit_cost_foreign
            for item in self.items.all()
        )
        self.total_amount_foreign = total
        self.save(update_fields=['total_amount_foreign'])

    def receive_all(self):
        """تنبيه: الاستلام التلقائي لكل الأصناف في الطلب"""
        for item in self.items.all():
            qty_to_receive = item.ordered_quantity - item.received_quantity
            if qty_to_receive > 0:
                item.received_quantity += qty_to_receive
                item.save()
                # --- ASYNC STOCK UPDATE (Phase 9) ---
                update_stock_async(item.product.id, qty_to_receive)

    def __str__(self):
        return f'PO-{self.id} ({self.supplier.name})'

class PurchaseOrderItem(models.Model):
    purchase_order = models.ForeignKey(PurchaseOrder, on_delete=models.CASCADE, related_name='items')
    product = models.ForeignKey(Product, on_delete=models.PROTECT)
    ordered_quantity = models.IntegerField()
    received_quantity = models.IntegerField(default=0)
    unit_cost_foreign = models.DecimalField(max_digits=12, decimal_places=2)

    def __str__(self):
        return f'{self.product.sku} x {self.ordered_quantity}'
