from django.db import models
from decimal import Decimal
from apps.customers.models import Customer
from apps.settings_app.models import PaymentMethod, TaxRate
from apps.inventory.models import Product

class SalesTransaction(models.Model):
    transaction_date = models.DateTimeField()
    customer = models.ForeignKey(Customer, on_delete=models.SET_NULL, null=True, blank=True, related_name='sales')
    payment_method = models.ForeignKey(PaymentMethod, on_delete=models.PROTECT)
    total_amount_before_tax = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    total_tax = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    final_amount = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    overall_discount_percentage = models.DecimalField(max_digits=5, decimal_places=2, default=0)
    notes = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    @property
    def total_profit(self):
        return sum(item.profit_per_item * item.quantity_sold for item in self.items.all())

    def recalculate(self):
        items = self.items.all()
        self.total_amount_before_tax = sum(i.item_total_before_tax for i in items)
        self.total_tax = sum(i.item_tax for i in items)
        subtotal = self.total_amount_before_tax + self.total_tax
        self.final_amount = subtotal * (1 - self.overall_discount_percentage / Decimal('100'))
        self.save(update_fields=['total_amount_before_tax', 'total_tax', 'final_amount'])

    def __str__(self):
        return f'Sale #{self.id} - {self.transaction_date.strftime("%Y-%m-%d")}'

class SalesItem(models.Model):
    sales_transaction = models.ForeignKey(SalesTransaction, on_delete=models.CASCADE, related_name='items')
    product = models.ForeignKey(Product, on_delete=models.PROTECT)
    quantity_sold = models.IntegerField()
    unit_price = models.DecimalField(max_digits=12, decimal_places=2)
    item_discount_percentage = models.DecimalField(max_digits=5, decimal_places=2, default=0)
    tax_rate = models.ForeignKey(TaxRate, on_delete=models.PROTECT)

    @property
    def item_total_before_tax(self):
        return (self.unit_price * self.quantity_sold) * (1 - self.item_discount_percentage / Decimal('100'))

    @property
    def item_tax(self):
        return self.item_total_before_tax * self.tax_rate.rate

    @property
    def item_total_after_tax(self):
        return self.item_total_before_tax + self.item_tax

    @property
    def profit_per_item(self):
        return (self.unit_price * (1 - self.item_discount_percentage / Decimal('100'))) - self.product.total_cost

    def __str__(self):
        return f'{self.product.sku} x {self.quantity_sold}'
