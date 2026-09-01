from django.db import models
from django.core.validators import RegexValidator


phone_validator = RegexValidator(
    regex=r'^\+?[0-9\s\-\(\)]{7,20}$',
    message="Enter a valid phone number. Examples: +201001234567, 01001234567"
)


class Brand(models.Model):
    """Luxury brands - such as Gucci, Prada"""
    company = models.ForeignKey('accounts.Company', on_delete=models.CASCADE, related_name='brands', null=True, blank=True)
    name = models.CharField(max_length=200)
    description = models.TextField(blank=True, null=True)
    logo_url = models.URLField(blank=True, null=True)

    def __str__(self):
        return self.name


class Category(models.Model):
    """Product categories - Bags, Shoes, Ready-to-wear, etc."""
    company = models.ForeignKey('accounts.Company', on_delete=models.CASCADE, related_name='categories', null=True, blank=True)
    name = models.CharField(max_length=200)
    description = models.TextField(blank=True, null=True)

    class Meta:
        verbose_name_plural = 'Categories'

    def __str__(self):
        return self.name


class Supplier(models.Model):
    """Suppliers - contact details and payment terms."""
    company = models.ForeignKey('accounts.Company', on_delete=models.CASCADE, related_name='suppliers', null=True, blank=True)
    name = models.CharField(max_length=200)
    contact_person = models.CharField(max_length=200, blank=True, null=True)
    phone = models.CharField(
        max_length=50, blank=True, null=True,
        validators=[phone_validator]
    )
    email = models.EmailField(blank=True, null=True)
    address = models.TextField(blank=True, null=True)
    payment_terms = models.TextField(blank=True, null=True)

    def __str__(self):
        return self.name


class CustomerType(models.Model):
    """Customer tiers — VIP, Regular, Wholesale."""
    company = models.ForeignKey('accounts.Company', on_delete=models.CASCADE, related_name='customer_types', null=True, blank=True)
    name = models.CharField(max_length=100)
    discount_percentage = models.DecimalField(
        max_digits=5, decimal_places=2, default=0,
        help_text="Auto-applied discount percentage for this customer type (0–100)"
    )

    def __str__(self):
        return f"{self.name} ({self.discount_percentage}% off)"


class PaymentMethod(models.Model):
    """Available payment methods"""
    company = models.ForeignKey('accounts.Company', on_delete=models.CASCADE, related_name='payment_methods', null=True, blank=True)
    name = models.CharField(max_length=100)

    def __str__(self):
        return self.name


class Currency(models.Model):
    """Currencies and exchange rates."""
    company = models.ForeignKey('accounts.Company', on_delete=models.CASCADE, related_name='currencies', null=True, blank=True)
    code = models.CharField(max_length=10)
    name = models.CharField(max_length=100)
    exchange_rate_to_base = models.DecimalField(
        max_digits=12, decimal_places=4, default=1.0
    )

    class Meta:
        verbose_name_plural = 'Currencies'

    def __str__(self):
        return f'{self.code} - {self.name}'


class TaxRate(models.Model):
    """Tax rates - VAT and others"""
    company = models.ForeignKey('accounts.Company', on_delete=models.CASCADE, related_name='tax_rates', null=True, blank=True)
    name = models.CharField(max_length=100)
    rate = models.DecimalField(max_digits=5, decimal_places=4)

    def __str__(self):
        return f'{self.name} ({self.rate * 100}%)'


class StoreInfo(models.Model):
    """Store settings for a company"""
    company = models.ForeignKey('accounts.Company', on_delete=models.CASCADE, related_name='store_info', null=True, blank=True)
    name = models.CharField(max_length=200)
    address = models.TextField()
    phone = models.CharField(max_length=50)
    email = models.EmailField()
    commercial_registration = models.CharField(
        max_length=100, blank=True, null=True,
        verbose_name="Commercial Registration Number"
    )
    tax_registration_number = models.CharField(
        max_length=100, blank=True, null=True,
        verbose_name="Tax Registration Number"
    )
    is_tax_enabled = models.BooleanField(
        default=True,
        help_text="Global VAT active / inactive toggle"
    )
    tax_rate_percentage = models.DecimalField(
        max_digits=5, decimal_places=2, default=14.00,
        help_text="Default VAT percentage (e.g. 14 for 14%)"
    )
    base_currency_code = models.CharField(
        max_length=10, default='EGP',
        help_text="Base store currency for calculations"
    )
    last_rates_sync = models.DateTimeField(null=True, blank=True)

    class Meta:
        verbose_name = 'Store Info'
        verbose_name_plural = 'Store Info'

    @classmethod
    def load(cls, company=None):
        """Retrieves store info for a company or creates a default instance."""
        if not company:
            obj, _ = cls.objects.get_or_create(pk=1, defaults={
                'name': 'Boutique', 'address': '-', 'phone': '-', 'email': 'store@example.com'
            })
            return obj
        obj, _ = cls.objects.get_or_create(company=company, defaults={
            'name': company.name, 'address': '-', 'phone': '-', 'email': 'store@example.com'
        })
        return obj

    def __str__(self):
        return self.name


class Season(models.Model):
    """Fashion season — used to group products into collections."""
    SEASON_TYPES = [
        ('SS', 'Spring/Summer'),
        ('FW', 'Fall/Winter'),
        ('RST', 'Resort'),
        ('PRE', 'Pre-Collection'),
    ]
    company = models.ForeignKey('accounts.Company', on_delete=models.CASCADE, related_name='seasons', null=True, blank=True)
    name = models.CharField(max_length=100)
    season_type = models.CharField(max_length=4, choices=SEASON_TYPES)
    year = models.IntegerField()
    is_active = models.BooleanField(default=True)

    def __str__(self):
        return self.name

    class Meta:
        ordering = ['-year', 'season_type']
