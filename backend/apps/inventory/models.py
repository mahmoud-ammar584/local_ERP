from django.db import models
from apps.settings_app.models import Brand, Category, Currency, Supplier


class Product(models.Model):
    """
    المنتج الفاخر - الجدول الأساسي في النظام
    كل منتج ليه SKU فريد وممكن barcode كمان
    التكلفة بتتحسب من العملة الأجنبية + الجمارك + الشحن
    """
    GENDER_CHOICES = [('M', 'Male'), ('F', 'Female'), ('U', 'Unisex')]

    sku = models.CharField(max_length=100, unique=True)
    barcode = models.CharField(max_length=100, unique=True, blank=True, null=True)
    brand = models.ForeignKey(Brand, on_delete=models.PROTECT, related_name='products')
    category = models.ForeignKey(Category, on_delete=models.PROTECT, related_name='products')

    # سميناه model مش product_name عشان في الفاشن بيقولوا "model"
    # مثلاً: "GG Marmont Bag" أو "Monolith Boots"
    model_name = models.CharField(max_length=200, db_column='model')

    gender = models.CharField(max_length=1, choices=GENDER_CHOICES, default='U')
    size = models.CharField(max_length=50)
    color = models.CharField(max_length=100)
    description = models.TextField(blank=True, null=True)
    image_url = models.URLField(blank=True, null=True)

    # --- تكلفة الشراء ---
    # cost_foreign = التكلفة بالعملة الأجنبية (اللي بندفعها للمورد)
    cost_foreign = models.DecimalField(max_digits=12, decimal_places=2)
    currency = models.ForeignKey(Currency, on_delete=models.PROTECT)
    customs_cost = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    shipping_cost = models.DecimalField(max_digits=12, decimal_places=2, default=0)

    suggested_selling_price = models.DecimalField(max_digits=12, decimal_places=2)
    min_alert_quantity = models.IntegerField(default=0)
    location = models.CharField(max_length=200, blank=True, null=True)  # مكان التخزين
    supplier = models.ForeignKey(Supplier, on_delete=models.PROTECT, related_name='products')

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    # FIXME: لو المنتج ليه ألوان/مقاسات كتير
    # المفروض نعمل ProductVariant model منفصل
    # بس حالياً كل لون/مقاس = record منفصل وده بيشتغل

    @property
    def cost_local(self):
        """التكلفة بالجنيه المصري = التكلفة بالعملة × سعر الصرف"""
        return self.cost_foreign * self.currency.exchange_rate_to_base

    @property
    def total_cost(self):
        """التكلفة الكاملة شاملة الجمارك والشحن"""
        return self.cost_local + self.customs_cost + self.shipping_cost

    @property
    def expected_profit(self):
        """الربح المتوقع = سعر البيع - إجمالي التكلفة"""
        return self.suggested_selling_price - self.total_cost

    @property
    def is_low_stock(self):
        """
        هل المخزون تحت الحد الأدنى؟
        لو مفيش Stock record أصلاً يبقى low stock برضو
        """
        try:
            return self.stock.current_quantity <= self.min_alert_quantity
        except Stock.DoesNotExist:
            return True

    def __str__(self):
        return f'{self.brand.name} - {self.model_name} ({self.sku})'

    class Meta:
        ordering = ['-created_at']


class Stock(models.Model):
    """
    المخزون الحالي لكل منتج
    OneToOne عشان كل منتج ليه record واحد بس
    current_quantity بيتحدث تلقائي مع البيع والشراء
    """
    product = models.OneToOneField(Product, on_delete=models.CASCADE, related_name='stock')
    current_quantity = models.IntegerField(default=0)
    last_updated = models.DateTimeField(auto_now=True)

    # TODO: إضافة حقل reserved_quantity
    # للكميات المحجوزة في طلبات لسه ما اتشحنتش

    def __str__(self):
        return f'{self.product.sku}: {self.current_quantity}'
