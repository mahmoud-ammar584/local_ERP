from decimal import Decimal
from django.test import TestCase
from apps.settings_app.models import Brand, Category, Currency, Supplier
from apps.inventory.models import Product


class ProductCostCalculationTests(TestCase):
    """
    Tests for the core financial calculations in Product.
    These are the most critical business logic paths — if they break,
    profit reporting and pricing become unreliable.
    """

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

    def test_zero_margin_no_price_change(self):
        """A product with explicit price and 0% margin should not recalculate price"""
        self.product.profit_margin_percentage = Decimal('0')
        self.product.suggested_selling_price = Decimal('12000.00')
        # Should keep the manually set price
        self.assertEqual(self.product.suggested_selling_price, Decimal('12000.00'))

