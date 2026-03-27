from decimal import Decimal
from django.test import TestCase
from django.utils import timezone
from apps.settings_app.models import PaymentMethod, TaxRate, Currency, Brand, Category, Supplier
from apps.customers.models import Customer
from apps.inventory.models import Product
from apps.sales.models import SalesTransaction, SalesItem


class SalesItemCalculationTests(TestCase):

    def setUp(self):
        currency = Currency.objects.create(
            code='EGP', name='Egyptian Pound', exchange_rate_to_base=Decimal('1.0')
        )
        brand = Brand.objects.create(name='Brand')
        category = Category.objects.create(name='Category')
        supplier = Supplier.objects.create(name='Supplier')
        payment_method = PaymentMethod.objects.create(name='Cash')
        self.tax = TaxRate.objects.create(name='VAT 14%', rate=Decimal('0.14'))

        self.product = Product.objects.create(
            sku='SALE-001', brand=brand, category=category, supplier=supplier,
            model_name='Test Item',
            cost_foreign=Decimal('1000.00'), currency=currency,
            customs_cost=Decimal('0'), shipping_cost=Decimal('0'),
            suggested_selling_price=Decimal('2000.00'),
        )

        self.transaction = SalesTransaction.objects.create(
            transaction_date=timezone.now(),
            payment_method=payment_method,
        )

    def test_item_total_before_tax_no_discount(self):
        item = SalesItem(
            sales_transaction=self.transaction,
            product=self.product,
            quantity_sold=2,
            unit_price=Decimal('2000.00'),
            item_discount_percentage=Decimal('0'),
            tax_rate=self.tax,
        )
        self.assertEqual(item.item_total_before_tax, Decimal('4000.00'))

    def test_item_total_with_10_percent_discount(self):
        item = SalesItem(
            sales_transaction=self.transaction,
            product=self.product,
            quantity_sold=1,
            unit_price=Decimal('2000.00'),
            item_discount_percentage=Decimal('10'),
            tax_rate=self.tax,
        )
        self.assertEqual(item.item_total_before_tax, Decimal('1800.00'))

    def test_profit_per_item(self):
        """Selling price after discount minus COGS"""
        item = SalesItem(
            sales_transaction=self.transaction,
            product=self.product,
            quantity_sold=1,
            unit_price=Decimal('2000.00'),
            item_discount_percentage=Decimal('0'),
            tax_rate=self.tax,
        )
        # Profit = 2000 - 1000 (cost_foreign × rate = 1 × 1000) = 1000
        self.assertEqual(item.profit_per_item, Decimal('1000.00'))

