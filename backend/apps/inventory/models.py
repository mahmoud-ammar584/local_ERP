from django.db import models
from apps.settings_app.models import Brand, Category, Currency, Supplier
from django.utils import timezone


class Product(models.Model):
    """
    Luxury Product - The core table in the system.
    Each product has a unique SKU and optional barcode.
    Cost is calculated from foreign currency + customs + shipping.
    """
    brand = models.ForeignKey(Brand, on_delete=models.PROTECT, related_name='products')
    category = models.ForeignKey(Category, on_delete=models.PROTECT, related_name='products')
    season = models.ForeignKey(
        'settings_app.Season',
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name='products'
    )

    sku = models.CharField(
        max_length=100,
        help_text="Base SKU for the product. Variants append sku_suffix to build full SKU."
    )

    # Named 'model_name' instead of 'product_name' following fashion industry conventions.
    # e.g.: "GG Marmont Bag" or "Monolith Boots"
    model_name = models.CharField(max_length=200, db_column='model')

    # Variant-specific attributes (size/color/gender) live on ProductVariant.
    description = models.TextField(blank=True, null=True)
    image_url = models.URLField(blank=True, null=True)

    # --- Acquisition Cost ---
    # cost_foreign = Cost in foreign currency (paid to supplier)
    cost_foreign = models.DecimalField(max_digits=12, decimal_places=2)
    currency = models.ForeignKey(Currency, on_delete=models.PROTECT)
    customs_cost = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    shipping_cost = models.DecimalField(max_digits=12, decimal_places=2, default=0)

    suggested_selling_price = models.DecimalField(max_digits=12, decimal_places=2, verbose_name="Suggested Selling Price", blank=True, null=True)
    profit_margin_percentage = models.DecimalField(max_digits=5, decimal_places=2, default=0, verbose_name="Profit Margin (%)")
    min_alert_quantity = models.IntegerField(default=5, verbose_name="Low Stock Threshold")
    can_be_oversold = models.BooleanField(default=False, verbose_name="Allow Overselling")
    location = models.CharField(max_length=200, blank=True, null=True, verbose_name="Warehouse Location")
    supplier = models.ForeignKey(Supplier, on_delete=models.PROTECT, related_name='products')

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def save(self, *args, **kwargs):
        # --- Automatic Selling Price Calculation ---
        # Recalculate if suggested_selling_price is null or profit_margin_percentage is set.
        if not self.suggested_selling_price or self.profit_margin_percentage > 0:
            # Calculate total cost first (from manual logic for certainty during save)
            cost_local = self.cost_foreign * self.currency.exchange_rate_to_base
            total_cost = cost_local + self.customs_cost + self.shipping_cost
            
            # Apply margin if no explicit price is set, or if margin is > 0 (priority to margin if exists)
            if not self.suggested_selling_price or self._state.adding or 'profit_margin_percentage' in kwargs.get('update_fields', []):
                 self.suggested_selling_price = total_cost * (1 + self.profit_margin_percentage / 100)

        super().save(*args, **kwargs)

    # NOTE: Stock is tracked at the variant level via ProductVariant + Stock.

    @property
    def cost_local(self):
        """Local cost in EGP = Foreign cost × Exchange Rate"""
        return self.cost_foreign * self.currency.exchange_rate_to_base

    @property
    def total_cost(self):
        """Total landed cost including customs and shipping"""
        return self.cost_local + self.customs_cost + self.shipping_cost

    @property
    def expected_profit(self):
        """Expected Profit = Selling Price - Total COGS"""
        if self.suggested_selling_price is None:
            return 0
        return self.suggested_selling_price - self.total_cost

    @property
    def is_low_stock(self):
        """
        Check if any variant is below threshold.
        """
        return any(v.is_low_stock for v in self.variants.all())

    def __str__(self):
        return f'{self.brand.name} - {self.model_name}'

    class Meta:
        ordering = ['-created_at']


class ProductVariant(models.Model):
    """
    Represents a specific variant of a product (size + color combination).
    Each variant has its own stock record and can override the base price.
    Example: GG Marmont Bag — Black — Size M
    """
    GENDER_CHOICES = [('M', 'Male'), ('F', 'Female'), ('U', 'Unisex')]

    product = models.ForeignKey(
        Product, on_delete=models.CASCADE, related_name='variants'
    )
    sku_suffix = models.CharField(
        max_length=50,
        default='',
        help_text="Appended to product SKU. e.g. '-BLK-M' → full SKU: 'GG-001-BLK-M'"
    )
    color = models.CharField(max_length=100)
    size = models.CharField(max_length=50)
    gender = models.CharField(max_length=1, choices=GENDER_CHOICES, default='U')
    price_override = models.DecimalField(
        max_digits=12, decimal_places=2, null=True, blank=True,
        help_text="If set, overrides product's suggested_selling_price for this variant"
    )
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(default=timezone.now)

    @property
    def full_sku(self):
        return f"{self.product.sku}{self.sku_suffix}"

    @property
    def effective_price(self):
        return self.price_override or self.product.suggested_selling_price

    @property
    def is_low_stock(self):
        try:
            return self.stock.current_quantity <= self.product.min_alert_quantity
        except Stock.DoesNotExist:
            return True

    def __str__(self):
        return f"{self.product.sku} — {self.color} / {self.size}"

    class Meta:
        unique_together = [('product', 'sku_suffix')]
        ordering = ['product', 'color', 'size']


class Stock(models.Model):
    """
    Current inventory levels for each specific variant.
    OneToOne relationship ensures one stock record per variant.
    """
    variant = models.OneToOneField(ProductVariant, on_delete=models.CASCADE, related_name='stock')
    current_quantity = models.IntegerField(default=0)
    last_updated = models.DateTimeField(auto_now=True)

    # TODO: Add 'reserved_quantity' field
    # For quantities allocated to orders not yet shipped.

    def __str__(self):
        return f'{self.variant.full_sku}: {self.current_quantity}'
