from decimal import Decimal
from django.test import TestCase
from django.utils import timezone
from django.contrib.auth.models import User
from rest_framework.test import APIRequestFactory

from apps.settings_app.models import PaymentMethod, TaxRate, Currency, Brand, Category, Supplier
from apps.customers.models import Customer
from apps.inventory.models import Product, ProductVariant, Stock
from apps.sales.models import SalesTransaction, SalesItem
from apps.sales.serializers import SalesTransactionCreateSerializer, SalesTransactionSerializer
from apps.sales.utils import generate_invoice_pdf


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
        self.user = User.objects.create_user(username='cashier_mahmoud', password='password123')

        self.product = Product.objects.create(
            sku='SALE-001', brand=brand, category=category, supplier=supplier,
            model_name='Test Item',
            cost_foreign=Decimal('1000.00'), currency=currency,
            customs_cost=Decimal('0'), shipping_cost=Decimal('0'),
            suggested_selling_price=Decimal('2000.00'),
        )
        self.variant = ProductVariant.objects.create(
            product=self.product,
            color='Black',
            size='M',
            sku_suffix='-BLK-M'
        )
        self.stock = Stock.objects.create(variant=self.variant, current_quantity=20)

        self.transaction = SalesTransaction.objects.create(
            transaction_date=timezone.now(),
            payment_method=payment_method,
            created_by=self.user,
        )

    def test_item_total_before_tax_no_discount(self):
        item = SalesItem(
            sales_transaction=self.transaction,
            product=self.product,
            variant=self.variant,
            quantity_sold=2,
            unit_price=Decimal('2000.00'),
            item_discount_percentage=Decimal('0'),
            tax_rate=self.tax,
        )
        self.assertEqual(item.item_total_before_tax, Decimal('4000.00'))

    def test_cashier_username_in_sales_transaction(self):
        factory = APIRequestFactory()
        request = factory.post('/api/sales/transactions/')
        request.user = self.user

        payload = {
            'items': [{
                'variant': self.variant.id,
                'quantity_sold': 2,
                'unit_price': Decimal('2000.00')
            }]
        }
        serializer = SalesTransactionCreateSerializer(data=payload, context={'request': request})
        self.assertTrue(serializer.is_valid(), serializer.errors)
        sale = serializer.save()

        self.assertEqual(sale.created_by, self.user)
        self.assertEqual(sale.created_by.username, 'cashier_mahmoud')

        # Test representation serializer
        rep_data = SalesTransactionSerializer(sale).data
        self.assertEqual(rep_data['created_by_username'], 'cashier_mahmoud')
        self.assertEqual(rep_data['created_by_name'], 'cashier_mahmoud')

        # Test PDF generation without crashing
        pdf_buffer = generate_invoice_pdf(sale)
        self.assertGreater(pdf_buffer.getbuffer().nbytes, 500)
