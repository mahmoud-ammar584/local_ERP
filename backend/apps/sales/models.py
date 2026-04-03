from django.db import models
from django.db.models import Sum as DbSum
from django.core.exceptions import ValidationError
from decimal import Decimal
from apps.customers.models import Customer
from apps.settings_app.models import PaymentMethod, TaxRate
from apps.inventory.models import Product, ProductVariant

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
    product = models.ForeignKey(Product, on_delete=models.PROTECT, null=True, blank=True)
    variant = models.ForeignKey(ProductVariant, on_delete=models.PROTECT, null=True, blank=True)
    quantity_sold = models.IntegerField()
    unit_price = models.DecimalField(max_digits=12, decimal_places=2)
    item_discount_percentage = models.DecimalField(max_digits=5, decimal_places=2, default=0)
    tax_rate = models.ForeignKey(TaxRate, on_delete=models.PROTECT)

    def save(self, *args, **kwargs):
        # Backward compatibility: if a product is provided but no variant is set,
        # attach the first active variant (common for single-variant products).
        if self.product_id and not self.variant_id:
            self.variant = (
                ProductVariant.objects
                .filter(product_id=self.product_id, is_active=True)
                .order_by('id')
                .first()
            )
        super().save(*args, **kwargs)
        if self._state.adding and self.variant_id:
            from apps.inventory.tasks import update_stock
            update_stock(self.variant_id, -self.quantity_sold)

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
        base = self.unit_price * (1 - self.item_discount_percentage / Decimal('100'))
        if self.variant_id:
            return base - self.variant.product.total_cost
        if self.product_id:
            return base - self.product.total_cost
        return base

    def __str__(self):
        if self.variant_id:
            return f'{self.variant.full_sku} x {self.quantity_sold}'
        if self.product_id:
            return f'{self.product.sku} x {self.quantity_sold}'
        return f'Item x {self.quantity_sold}'

class ReturnTransaction(models.Model):
    return_date = models.DateTimeField(auto_now_add=True)
    customer = models.ForeignKey(Customer, on_delete=models.SET_NULL, null=True, related_name='returns')
    original_transaction = models.ForeignKey(SalesTransaction, on_delete=models.CASCADE, related_name='returns')
    reason = models.TextField(blank=True, null=True)
    total_refund_amount = models.DecimalField(max_digits=14, decimal_places=2, default=0)

    def __str__(self):
        return f"Return #{self.id} (Original Sale #{self.original_transaction.id})"

from django.db.models import Sum

class ReturnItem(models.Model):
    return_transaction = models.ForeignKey(ReturnTransaction, on_delete=models.CASCADE, related_name='items')
    sales_item = models.ForeignKey(SalesItem, on_delete=models.CASCADE)
    quantity_returned = models.IntegerField()
    reason = models.CharField(max_length=255, blank=True, null=True)

    def save(self, *args, **kwargs):
        # Prevent returning more units than were originally sold
        already_returned = (
            ReturnItem.objects
            .filter(sales_item=self.sales_item)
            .exclude(pk=self.pk)
            .aggregate(total=DbSum('quantity_returned'))['total'] or 0
        )
        max_returnable = self.sales_item.quantity_sold - already_returned
        if self.quantity_returned > max_returnable:
            raise ValidationError(
                f"Cannot return {self.quantity_returned} units. "
                f"Maximum returnable for this item: {max_returnable}"
            )
        is_new = self._state.adding
        super().save(*args, **kwargs)
        if is_new:
            from apps.inventory.tasks import update_stock
            update_stock(self.sales_item.variant_id, self.quantity_returned)

    def __str__(self):
        return f"Return Item: {self.sales_item.variant.full_sku} x {self.quantity_returned}"
