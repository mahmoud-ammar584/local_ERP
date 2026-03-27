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

    suggested_selling_price = models.DecimalField(max_digits=12, decimal_places=2, verbose_name="سعر البيع المقترح", blank=True, null=True)
    profit_margin_percentage = models.DecimalField(max_digits=5, decimal_places=2, default=0, verbose_name="هامش الربح (%)")
    min_alert_quantity = models.IntegerField(default=5, verbose_name="حد التنبيه")
    can_be_oversold = models.BooleanField(default=False, verbose_name="يسمح بالبيع بدون رصيد")
    image = models.ImageField(upload_to='products/', blank=True, null=True, verbose_name="صورة المنتج")
    location = models.CharField(max_length=200, blank=True, null=True, verbose_name="المكان في المخزن")
    supplier = models.ForeignKey(Supplier, on_delete=models.PROTECT, related_name='products')

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def save(self, *args, **kwargs):
        # FIXME: الصور الكبيرة ممكن تبطأ التحميل، بنصغرها قبل الحفظ
        if self.image:
            from PIL import Image
            import io
            from django.core.files.base import ContentFile
            
            # فتح الصورة
            img = Image.open(self.image)
            # لو الحجم أكبر من 800 بكسل بنصغره
            if img.height > 800 or img.width > 800:
                output_size = (800, 800)
                img.thumbnail(output_size)
                
                img_io = io.BytesIO()
                # نسيفها بصيغة JPEG بجودة 85% لتقليل الحجم
                if img.mode in ("RGBA", "P"):
                    img = img.convert("RGB")
                img.save(img_io, format='JPEG', quality=85)
                
                # نغير الامتداد ل .jpg
                new_name = self.image.name.split('.')[0] + '.jpg'
                self.image.save(new_name, ContentFile(img_io.getvalue()), save=False)

        # --- حساب سعر البيع تلقائياً ---
        # لو مفيش سعر بيع محدد أو لو هامش الربح اتغير، بنحسب السعر
        if not self.suggested_selling_price or self.profit_margin_percentage > 0:
            # بنحسب التكلفة الإجمالية الأول (من الـ properties)
            # بس الـ properties بتحتاج أحياناً يكون الـ user_id أو الـ currency موجودين
            # هنا بنحسبها يدوي للتأكيد
            cost_local = self.cost_foreign * self.currency.exchange_rate_to_base
            total_cost = cost_local + self.customs_cost + self.shipping_cost
            
            # لو المستخدم ما حددش سعر، بنطبق الهامش
            # أو لو الهامش أكبر من 0 بنحدث السعر بناء عليه (أولوية للهامش لو موجود)
            if not self.suggested_selling_price or self._state.adding or 'profit_margin_percentage' in kwargs.get('update_fields', []):
                 self.suggested_selling_price = total_cost * (1 + self.profit_margin_percentage / 100)

        super().save(*args, **kwargs)

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
        if self.suggested_selling_price is None:
            return 0
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
