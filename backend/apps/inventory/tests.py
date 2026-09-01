import io
from decimal import Decimal
from PIL import Image
from django.test import TestCase
from django.contrib.auth.models import User
from django.core.files.uploadedfile import SimpleUploadedFile
from rest_framework.test import APIClient

from apps.settings_app.models import Brand, Category, Currency, Supplier
from apps.inventory.models import Product, ProductVariant, Stock
from apps.inventory.image_optimizer import compress_and_optimize_image
from apps.inventory.serializers import ProductCreateSerializer, ProductListSerializer


class ProductCostCalculationTests(TestCase):
    def setUp(self):
        self.currency = Currency.objects.create(
            code='EUR', name='Euro', exchange_rate_to_base=Decimal('55.0')
        )
        self.brand = Brand.objects.create(name='Test Brand')
        self.category = Category.objects.create(name='Bags')
        self.supplier = Supplier.objects.create(name='Test Supplier')

        self.product = Product(
            sku='TEST-001',
            brand=self.brand,
            category=self.category,
            supplier=self.supplier,
            model_name='Test Bag',
            cost_foreign=Decimal('100.00'),
            currency=self.currency,
            customs_cost=Decimal('200.00'),
            shipping_cost=Decimal('300.00'),
            profit_margin_percentage=Decimal('50.00'),
        )

    def test_cost_local(self):
        """100 EUR × 55 EGP/EUR = 5,500 EGP"""
        self.assertEqual(self.product.cost_local, Decimal('5500.00'))

    def test_total_cost(self):
        """5,500 + 200 customs + 300 shipping = 6,000 EGP"""
        self.assertEqual(self.product.total_cost, Decimal('6000.00'))

    def test_expected_profit(self):
        """Price = 6,000 × 1.5 = 9,000. Profit = 9,000 - 6,000 = 3,000"""
        self.product.suggested_selling_price = Decimal('9000.00')
        self.assertEqual(self.product.expected_profit, Decimal('3000.00'))


class ProductVariantMatrixTests(TestCase):
    def setUp(self):
        self.currency = Currency.objects.create(code='EGP', name='EGP', exchange_rate_to_base=Decimal('1.0'))
        self.brand = Brand.objects.create(name='Gucci')
        self.category = Category.objects.create(name='T-Shirts')
        self.supplier = Supplier.objects.create(name='Milano Luxe')
        self.user = User.objects.create_user(username='tester', password='password123')

    def test_multi_variant_creation(self):
        payload = {
            'sku': 'GC-POLO-01',
            'model_name': 'GG Monogram Polo',
            'brand': self.brand.id,
            'category': self.category.id,
            'supplier': self.supplier.id,
            'currency': self.currency.id,
            'cost_foreign': Decimal('1500.00'),
            'suggested_selling_price': Decimal('3500.00'),
            'variants': [
                {'color': 'Black', 'size': 'S', 'sku_suffix': '-BLK-S', 'current_quantity': 5},
                {'color': 'Black', 'size': 'M', 'sku_suffix': '-BLK-M', 'current_quantity': 10},
                {'color': 'White', 'size': 'L', 'sku_suffix': '-WHT-L', 'current_quantity': 7},
            ]
        }
        serializer = ProductCreateSerializer(data=payload)
        self.assertTrue(serializer.is_valid(), serializer.errors)
        product = serializer.save()

        self.assertEqual(product.variants.count(), 3)
        v_black_m = product.variants.get(sku_suffix='-BLK-M')
        self.assertEqual(v_black_m.full_sku, 'GC-POLO-01-BLK-M')
        self.assertEqual(v_black_m.stock.current_quantity, 10)

        # Test list serializer total stock calculation
        list_data = ProductListSerializer(product).data
        self.assertEqual(list_data['total_stock'], 22)
        self.assertEqual(len(list_data['colors']), 2)

    def test_image_compression_webp(self):
        # Create a mock 1200x1200 image in memory
        img = Image.new('RGB', (1200, 1200), color=(255, 100, 50))
        img_io = io.BytesIO()
        img.save(img_io, format='JPEG', quality=95)
        img_io.seek(0)

        uploaded = SimpleUploadedFile("sample.jpg", img_io.getvalue(), content_type="image/jpeg")
        compressed = compress_and_optimize_image(uploaded, max_dimension=800, quality=82)

        self.assertIsNotNone(compressed)
        self.assertTrue(compressed.name.endswith('.webp'))

        # Open compressed result and verify resized
        result_img = Image.open(compressed)
        self.assertEqual(result_img.format, 'WEBP')
        self.assertLessEqual(max(result_img.size), 800)
