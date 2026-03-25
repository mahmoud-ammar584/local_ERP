import os
import django
import sys
import json

# Add project to path
sys.path.append(os.getcwd())
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from apps.inventory.serializers import ProductCreateSerializer
from apps.inventory.models import Product, Brand, Category, Supplier, Currency

# Ensure dependencies exist for the test
brand, _ = Brand.objects.get_or_create(name="Test Brand")
category, _ = Category.objects.get_or_create(name="Test Category")
supplier, _ = Supplier.objects.get_or_create(name="Test Supplier")
currency, _ = Currency.objects.get_or_create(code="USD", defaults={"name": "US Dollar", "exchange_rate_to_base": 50})

# This payload matches the FIXED frontend
payload = {
    "sku": "FIXED-PROD-002",
    "brand": brand.id,
    "category": category.id,
    "model_name": "Marmont Fixed", # Now using correct key
    "gender": "U",
    "size": "42",
    "color": "Black",
    "supplier": supplier.id,
    "cost_foreign": "100",
    "currency": currency.id,
    "customs_cost": "0",
    "shipping_cost": "0",
    "suggested_selling_price": "900",
    "min_alert_quantity": "5",
    "initial_quantity": "10"
}

print(f"Testing fixed payload: {json.dumps(payload, indent=2)}")

serializer = ProductCreateSerializer(data=payload)
if serializer.is_valid():
    print("SUCCESS: Serializer is valid!")
    # Actually try to save it to be 100% sure
    try:
        serializer.save()
        print("SUCCESS: Product saved to database.")
    except Exception as e:
        print(f"FAILURE during save: {e}")
else:
    print("FAILURE: Serializer still has errors:")
    print(json.dumps(serializer.errors, indent=2))
