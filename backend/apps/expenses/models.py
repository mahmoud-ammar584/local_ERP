from django.db import models
from apps.settings_app.models import PaymentMethod

class ExpenseCategory(models.Model):
    company = models.ForeignKey('accounts.Company', on_delete=models.CASCADE, related_name='expense_categories', null=True, blank=True)
    name = models.CharField(max_length=100)
    description = models.TextField(blank=True, null=True)

    def __str__(self):
        return self.name

    class Meta:
        verbose_name_plural = "Expense Categories"

class Expense(models.Model):
    company = models.ForeignKey('accounts.Company', on_delete=models.CASCADE, related_name='expenses', null=True, blank=True)
    expense_date = models.DateField()
    expense_category = models.ForeignKey(ExpenseCategory, on_delete=models.PROTECT, related_name='expenses')
    description = models.TextField()
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    payment_method = models.ForeignKey(PaymentMethod, on_delete=models.PROTECT)
    notes = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f'{self.expense_category.name} - {self.amount}'
