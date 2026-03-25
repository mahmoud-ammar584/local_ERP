import os
import django
import sys
import json
from decimal import Decimal

# Add project to path
sys.path.append('d:\\erp\\1\\backend')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from apps.inventory.serializers import ProductCreateSerializer
from apps.inventory.models import Product, Brand, Category, Supplier, Currency

# Ensure dependencies exist for the test
brand, _ = Brand.objects.get_or_create(name="Test Brand")
category, _ = Category.objects.get_or_create(name="Test Category")
supplier, _ = Supplier.objects.get_or_create(name="Test Supplier")
currency, _ = Currency.objects.get_or_create(code="USD", defaults={"name": "US Dollar", "exchange_rate_to_base": 50})

# This payload matches what the frontend InventoryPage.js would send
# (Note: it sends 'model' instead of 'model_name')
payload = {
    "sku": "NEW-PROD-001",
    "brand": brand.id,
    "category": category.id,
    "model": "Marmont", # Mapping discrepancy
    "gender": "U",
    "size": "42",
    "color": "Black",
    "supplier": supplier.id,
    "cost_foreign": "100",
    "currency": currency.id,
    "customs_cost": "0",
    "shipping_cost": "0",
    "suggested_selling_price": "900", # User says they entered this
    "min_alert_quantity": "5",
    "initial_quantity": "10"
}

print(f"Testing payload: {json.dumps(payload, indent=2)}")

serializer = ProductCreateSerializer(data=payload)
if serializer.is_valid():
    print("SUCCESS: Serializer is valid")
else:
    print("FAILURE: Serializer errors:")
    print(json.dumps(serializer.errors, indent=2))

# Check if maybe suggested_selling_price is being expected as suggestedSellingPrice (camelCase)
payload_camel = payload.copy()
payload_camel["suggestedSellingPrice"] = payload_camel.pop("suggested_selling_price")
serializer_camel = ProductCreateSerializer(data=payload_camel)
if not serializer_camel.is_valid():
    print("\nErrors with camelCase:")
    print(json.dumps(serializer_camel.errors, indent=2))
