from django.db import models


class Brand(models.Model):
    """العلامات التجارية الفاخرة - مثل Gucci, Prada"""
    name = models.CharField(max_length=200, unique=True)
    description = models.TextField(blank=True, null=True)
    logo_url = models.URLField(blank=True, null=True)

    # TODO: إضافة حقل logo كـ ImageField بدلاً من URL
    # لاحقاً ممكن نربطه بـ S3 أو مجلد media محلي

    def __str__(self):
        return self.name


class Category(models.Model):
    """فئات المنتجات - حقائب، أحذية، إلخ"""
    name = models.CharField(max_length=200, unique=True)
    description = models.TextField(blank=True, null=True)

    class Meta:
        verbose_name_plural = 'Categories'

    def __str__(self):
        return self.name


class Supplier(models.Model):
    """
    الموردون - بيانات التواصل وشروط الدفع
    ملاحظة: payment_terms حالياً نص حر، المفروض يكون choices
    بس سبناه كده عشان كل مورد ممكن يكون ليه شروط مختلفة
    """
    name = models.CharField(max_length=200)
    contact_person = models.CharField(max_length=200, blank=True, null=True)
    phone = models.CharField(max_length=50, blank=True, null=True)
    email = models.EmailField(blank=True, null=True)
    address = models.TextField(blank=True, null=True)
    payment_terms = models.TextField(blank=True, null=True)

    # FIXME: المفروض نضيف validation على رقم التليفون
    # حالياً بيقبل أي حاجة وده مش ideal

    def __str__(self):
        return self.name


class CustomerType(models.Model):
    """أنواع العملاء - VIP, عادي, جملة"""
    name = models.CharField(max_length=100, unique=True)

    # TODO: إضافة حقل discount_percentage لكل نوع عميل
    # بحيث الخصم يتطبق تلقائي حسب نوع العميل

    def __str__(self):
        return self.name


class PaymentMethod(models.Model):
    """طرق الدفع المتاحة"""
    name = models.CharField(max_length=100, unique=True)

    def __str__(self):
        return self.name


class Currency(models.Model):
    """
    العملات وأسعار الصرف
    العملة الأساسية هي الجنيه المصري (EGP) بسعر صرف = 1.0
    باقي العملات بتتحول للجنيه عن طريق exchange_rate_to_base
    """
    code = models.CharField(max_length=10, unique=True)
    name = models.CharField(max_length=100)
    exchange_rate_to_base = models.DecimalField(
        max_digits=12, decimal_places=4, default=1.0
    )

    # TODO: ربط API خارجي لتحديث أسعار الصرف تلقائياً
    # ممكن نستخدم openexchangerates.org أو fixer.io
    # حالياً التحديث يدوي من صفحة الإعدادات

    class Meta:
        verbose_name_plural = 'Currencies'

    def __str__(self):
        return f'{self.code} - {self.name}'


class TaxRate(models.Model):
    """نسب الضرائب - القيمة المضافة وغيرها"""
    name = models.CharField(max_length=100)
    # rate مخزنة كرقم عشري: 0.14 يعني 14%
    rate = models.DecimalField(max_digits=5, decimal_places=4)

    def __str__(self):
        return f'{self.name} ({self.rate * 100}%)'


class StoreInfo(models.Model):
    """
    بيانات المتجر - Singleton model
    يعني فيه instance واحد بس في الداتابيز
    عملنا override لـ save() عشان نضمن الـ pk دايماً = 1
    """
    name = models.CharField(max_length=200)
    address = models.TextField()
    phone = models.CharField(max_length=50)
    email = models.EmailField()

    # TODO: إضافة حقل commercial_registration (سجل تجاري)
    # وحقل tax_number (الرقم الضريبي) للفواتير الرسمية

    class Meta:
        verbose_name = 'Store Info'
        verbose_name_plural = 'Store Info'

    def save(self, *args, **kwargs):
        # نضمن إن فيه record واحد بس - Singleton pattern
        self.pk = 1
        super().save(*args, **kwargs)

    @classmethod
    def load(cls):
        """بتجيب بيانات المتجر أو بتعمل واحدة default لو مفيش"""
        obj, _ = cls.objects.get_or_create(pk=1, defaults={
            'name': 'المتجر', 'address': '-', 'phone': '-', 'email': 'store@example.com'
        })
        return obj

    def __str__(self):
        return self.name
