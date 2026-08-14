from django.db import migrations


def backfill_default_company(apps, schema_editor):
    Company = apps.get_model('accounts', 'Company')
    Profile = apps.get_model('accounts', 'Profile')
    
    # Create or get default company
    default_company, _ = Company.objects.get_or_create(
        name='La Boutique Deluxe'
    )

    # Backfill Profile
    Profile.objects.filter(company__isnull=True).update(company=default_company)

    # Backfill apps
    app_models = [
        ('inventory', 'Product'),
        ('sales', 'SalesTransaction'),
        ('purchases', 'PurchaseOrder'),
        ('customers', 'Customer'),
        ('expenses', 'ExpenseCategory'),
        ('expenses', 'Expense'),
        ('settings_app', 'Brand'),
        ('settings_app', 'Category'),
        ('settings_app', 'Supplier'),
        ('settings_app', 'CustomerType'),
        ('settings_app', 'PaymentMethod'),
        ('settings_app', 'Currency'),
        ('settings_app', 'TaxRate'),
        ('settings_app', 'StoreInfo'),
        ('settings_app', 'Season'),
        ('core', 'UserActivity'),
    ]

    for app_label, model_name in app_models:
        try:
            Model = apps.get_model(app_label, model_name)
            Model.objects.filter(company__isnull=True).update(company=default_company)
        except Exception as e:
            print(f"Backfill warning for {app_label}.{model_name}: {e}")


def reverse_backfill(apps, schema_editor):
    pass


class Migration(migrations.Migration):

    dependencies = [
        ('accounts', '0002_company_profile_permissions_alter_profile_role_and_more'),
        ('core', '0002_useractivity_company_useractivity_ip_address'),
        ('customers', '0002_customer_company_alter_customer_email_and_more'),
        ('expenses', '0004_expense_company_expensecategory_company'),
        ('inventory', '0008_product_company'),
        ('purchases', '0003_purchaseorder_company'),
        ('sales', '0005_salestransaction_company'),
        ('settings_app', '0003_brand_company_category_company_currency_company_and_more'),
    ]

    operations = [
        migrations.RunPython(backfill_default_company, reverse_code=reverse_backfill),
    ]
