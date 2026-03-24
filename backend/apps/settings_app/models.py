from django.db import models

class Brand(models.Model):
    name = models.CharField(max_length=200, unique=True)
    description = models.TextField(blank=True, null=True)
    logo_url = models.URLField(blank=True, null=True)

    def __str__(self):
        return self.name

class Category(models.Model):
    name = models.CharField(max_length=200, unique=True)
    description = models.TextField(blank=True, null=True)

    class Meta:
        verbose_name_plural = 'Categories'

    def __str__(self):
        return self.name

class Supplier(models.Model):
    name = models.CharField(max_length=200)
    contact_person = models.CharField(max_length=200, blank=True, null=True)
    phone = models.CharField(max_length=50, blank=True, null=True)
    email = models.EmailField(blank=True, null=True)
    address = models.TextField(blank=True, null=True)
    payment_terms = models.TextField(blank=True, null=True)

    def __str__(self):
        return self.name

class CustomerType(models.Model):
    name = models.CharField(max_length=100, unique=True)

    def __str__(self):
        return self.name

class PaymentMethod(models.Model):
    name = models.CharField(max_length=100, unique=True)

    def __str__(self):
        return self.name

class Currency(models.Model):
    code = models.CharField(max_length=10, unique=True)
    name = models.CharField(max_length=100)
    exchange_rate_to_base = models.DecimalField(max_digits=12, decimal_places=4, default=1.0)

    class Meta:
        verbose_name_plural = 'Currencies'

    def __str__(self):
        return f'{self.code} - {self.name}'

class TaxRate(models.Model):
    name = models.CharField(max_length=100)
    rate = models.DecimalField(max_digits=5, decimal_places=4)

    def __str__(self):
        return f'{self.name} ({self.rate * 100}%)'

class StoreInfo(models.Model):
    name = models.CharField(max_length=200)
    address = models.TextField()
    phone = models.CharField(max_length=50)
    email = models.EmailField()

    class Meta:
        verbose_name = 'Store Info'
        verbose_name_plural = 'Store Info'

    def save(self, *args, **kwargs):
        self.pk = 1
        super().save(*args, **kwargs)

    @classmethod
    def load(cls):
        obj, _ = cls.objects.get_or_create(pk=1, defaults={
            'name': 'المتجر', 'address': '-', 'phone': '-', 'email': 'store@example.com'
        })
        return obj

    def __str__(self):
        return self.name
