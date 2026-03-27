from django.db import models
from django.core.validators import RegexValidator


phone_validator = RegexValidator(
    regex=r'^\+?[0-9\s\-\(\)]{7,20}$',
    message="Enter a valid phone number. Examples: +201001234567, 01001234567"
)


class Brand(models.Model):
    """Luxury brands - such as Gucci, Prada"""
    name = models.CharField(max_length=200, unique=True)
    description = models.TextField(blank=True, null=True)
    logo_url = models.URLField(blank=True, null=True)

    # TODO: Change logo_url to an ImageField named 'logo'
    # This will allow local media or S3 storage integration later.

    def __str__(self):
        return self.name


class Category(models.Model):
    """Product categories - Bags, Shoes, Ready-to-wear, etc."""
    name = models.CharField(max_length=200, unique=True)
    description = models.TextField(blank=True, null=True)

    class Meta:
        verbose_name_plural = 'Categories'

    def __str__(self):
        return self.name


class Supplier(models.Model):
    """
    Suppliers - contact details and payment terms.
    NOTE: payment_terms is currently a free-text field. It could be converted to choices,
    but was left as text to accommodate unique terms for each supplier.
    """
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
    """
    Customer tiers — VIP, Regular, Wholesale.
    The discount_percentage is automatically applied to sales for this tier.
    """
    name = models.CharField(max_length=100, unique=True)
    discount_percentage = models.DecimalField(
        max_digits=5, decimal_places=2, default=0,
        help_text="Auto-applied discount percentage for this customer type (0–100)"
    )

    def __str__(self):
        return f"{self.name} ({self.discount_percentage}% off)"


class PaymentMethod(models.Model):
    """Available payment methods"""
    name = models.CharField(max_length=100, unique=True)

    def __str__(self):
        return self.name


class Currency(models.Model):
    """
    Currencies and exchange rates.
    Base currency is Egyptian Pound (EGP) with an exchange rate to base = 1.0.
    All other currencies are converted to EGP via exchange_rate_to_base.
    """
    code = models.CharField(max_length=10, unique=True)
    name = models.CharField(max_length=100)
    exchange_rate_to_base = models.DecimalField(
        max_digits=12, decimal_places=4, default=1.0
    )

    # TODO: Integrate external API for automatic exchange rate updates
    # Consider openexchangerates.org or fixer.io.
    # Currently, updates are performed manually via the settings page.

    class Meta:
        verbose_name_plural = 'Currencies'

    def __str__(self):
        return f'{self.code} - {self.name}'


class TaxRate(models.Model):
    """Tax rates - VAT and others"""
    name = models.CharField(max_length=100)
    # rate stored as decimal: 0.14 represents 14%
    rate = models.DecimalField(max_digits=5, decimal_places=4)

    def __str__(self):
        return f'{self.name} ({self.rate * 100}%)'


class StoreInfo(models.Model):
    """
    Store settings - Singleton model.
    Only one instance exists in the database.
    save() is overridden to ensure pk is always 1.
    """
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

    class Meta:
        verbose_name = 'Store Info'
        verbose_name_plural = 'Store Info'

    def save(self, *args, **kwargs):
        # Ensure only one record exists - Singleton pattern
        self.pk = 1
        super().save(*args, **kwargs)

    @classmethod
    def load(cls):
        """Retrieves store info or creates a default instance if none exists."""
        obj, _ = cls.objects.get_or_create(pk=1, defaults={
            'name': 'Boutique', 'address': '-', 'phone': '-', 'email': 'store@example.com'
        })
        return obj

    def __str__(self):
        return self.name


class Season(models.Model):
    """
    Fashion season — used to group products into collections.
    Example: SS25, FW25, Resort 2026
    """
    SEASON_TYPES = [
        ('SS', 'Spring/Summer'),
        ('FW', 'Fall/Winter'),
        ('RST', 'Resort'),
        ('PRE', 'Pre-Collection'),
    ]
    name = models.CharField(max_length=100, unique=True)
    season_type = models.CharField(max_length=4, choices=SEASON_TYPES)
    year = models.IntegerField()
    is_active = models.BooleanField(default=True)

    def __str__(self):
        return self.name

    class Meta:
        ordering = ['-year', 'season_type']
