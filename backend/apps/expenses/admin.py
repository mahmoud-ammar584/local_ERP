from django.contrib import admin
from .models import Expense, ExpenseCategory

@admin.register(ExpenseCategory)
class ExpenseCategoryAdmin(admin.ModelAdmin):
    list_display = ['name', 'description']

@admin.register(Expense)
class ExpenseAdmin(admin.ModelAdmin):
    list_display = ['expense_date', 'expense_category', 'description', 'amount', 'payment_method']
    list_filter = ['expense_category', 'expense_date']
