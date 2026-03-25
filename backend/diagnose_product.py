import os
import django
import sys

# Add project to path
sys.path.append(os.getcwd())
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from apps.inventory.serializers import ProductCreateSerializer
from apps.inventory.models import Product

serializer = ProductCreateSerializer()
print("Serializer Fields:")
for field_name, field in serializer.fields.items():
    print(f"- {field_name}: {field.__class__.__name__} (required={field.required})")

# Test validation with a sample payload similar to frontend
sample_data = {
    'sku': 'TEST-001',
    'brand': 1, # Assume 1 exists
    'category': 1,
    'model': 'Test Model', # Frontend still sends 'model'
    'gender': 'U',
    'size': 'L',
    'color': 'Red',
    'cost_foreign': '100',
    'currency': 1,
    'customs_cost': '0',
    'shipping_cost': '0',
    'suggested_selling_price': '900', # User entered 900
    'min_alert_quantity': '0',
    'supplier': 1,
    'initial_quantity': '10'
}

serializer = ProductCreateSerializer(data=sample_data)
is_valid = serializer.is_valid()
print(f"\nIs valid with 'model': {is_valid}")
if not is_valid:
    print(f"Errors: {serializer.errors}")

# Test with 'model_name'
sample_data_2 = sample_data.copy()
del sample_data_2['model']
sample_data_2['model_name'] = 'Test Model'
serializer_2 = ProductCreateSerializer(data=sample_data_2)
is_valid_2 = serializer_2.is_valid()
print(f"\nIs valid with 'model_name': {is_valid_2}")
if not is_valid_2:
    print(f"Errors: {serializer_2.errors}")
