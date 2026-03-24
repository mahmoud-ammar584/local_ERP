from django.db import models
from apps.settings_app.models import PaymentMethod

class Expense(models.Model):
    CATEGORY_CHOICES = [
        ('R', 'Rent'), ('S', 'Salaries'), ('U', 'Utilities'),
        ('M', 'Marketing'), ('O', 'Other'),
    ]
    expense_date = models.DateField()
    category = models.CharField(max_length=1, choices=CATEGORY_CHOICES)
    description = models.TextField()
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    payment_method = models.ForeignKey(PaymentMethod, on_delete=models.PROTECT)
    notes = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f'{self.get_category_display()} - {self.amount}'
