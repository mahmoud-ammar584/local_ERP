from django.core.management.base import BaseCommand
from django.contrib.auth.models import User
from django.utils import timezone
from decimal import Decimal
from datetime import timedelta
import random

from apps.settings_app.models import (
    Brand, Category, Supplier, CustomerType, PaymentMethod, Currency, TaxRate, StoreInfo
)
from apps.inventory.models import Product, ProductVariant, Stock
from apps.customers.models import Customer
from apps.sales.models import SalesTransaction, SalesItem
from apps.expenses.models import Expense


class Command(BaseCommand):
    help = 'Seed database with sample luxury apparel data'

    def add_arguments(self, parser):
        parser.add_argument('--no-input', action='store_true')

    def handle(self, *args, **options):
        if Brand.objects.exists() and not options.get('no_input'):
            self.stdout.write('Data already exists. Use --no-input to skip this check.')
            return

        if Brand.objects.exists():
            self.stdout.write('Data already seeded. Skipping.')
            return

        self.stdout.write('Seeding database...')

        # Admin user
        if not User.objects.filter(username='admin').exists():
            User.objects.create_superuser('admin', 'admin@erp.local', 'admin123')

        # Store Info
        StoreInfo.objects.update_or_create(pk=1, defaults={
            'name': 'La Boutique Deluxe',
            'address': '90th St, Fifth Settlement, Cairo',
            'phone': '01234567890',
            'email': 'info@laboutique.com',
        })

        # Currencies
        egp, _ = Currency.objects.get_or_create(code='EGP', defaults={'name': 'Egyptian Pound', 'exchange_rate_to_base': Decimal('1.0')})
        usd, _ = Currency.objects.get_or_create(code='USD', defaults={'name': 'US Dollar', 'exchange_rate_to_base': Decimal('50.0')})
        eur, _ = Currency.objects.get_or_create(code='EUR', defaults={'name': 'Euro', 'exchange_rate_to_base': Decimal('55.0')})

        brands = {}
        for name in ['Gucci', 'Prada', 'Louis Vuitton', 'Chanel', 'Dior', 'Versace']:
            brands[name], _ = Brand.objects.get_or_create(name=name, defaults={'description': f'Luxury {name} Brand'})

        # Categories
        cats = {}
        for name, desc in [('Bags', 'Handbags & Totes'), ('Shoes', 'Luxury Footwear'), ('Ready-to-wear', 'Clothing'),
                           ('Accessories', 'Jewelry & More'), ('Perfumes', 'Fragrances')]:
            cats[name], _ = Category.objects.get_or_create(name=name, defaults={'description': desc})

        suppliers = []
        for name, contact, phone in [
            ('Milan Imports', 'Marco Rossi', '+39 02 1234567'),
            ('Paris Luxe Trading', 'Jean Dupont', '+33 1 23456789'),
            ('Global Fashion Hub', 'Ahmed Hassan', '+20 1098765432'),
        ]:
            s, _ = Supplier.objects.get_or_create(
                name=name, defaults={
                    'contact_person': contact, 'phone': phone,
                    'email': f'{name.lower().replace(" ", "")}@supplier.com',
                    'payment_terms': 'Net 30'
                }
            )
            suppliers.append(s)

        # Customer Types
        vip, _ = CustomerType.objects.get_or_create(name='VIP')
        regular, _ = CustomerType.objects.get_or_create(name='Regular')
        wholesale, _ = CustomerType.objects.get_or_create(name='Wholesale')

        # Payment Methods
        cash, _ = PaymentMethod.objects.get_or_create(name='Cash')
        card, _ = PaymentMethod.objects.get_or_create(name='Credit Card')
        transfer, _ = PaymentMethod.objects.get_or_create(name='Bank Transfer')
        instapay, _ = PaymentMethod.objects.get_or_create(name='InstaPay')

        # Tax Rates
        vat, _ = TaxRate.objects.get_or_create(name='VAT', defaults={'rate': Decimal('0.14')})
        no_tax, _ = TaxRate.objects.get_or_create(name='Tax Free', defaults={'rate': Decimal('0.0')})

        # Products
        products_data = [
            ('GC-BAG-001', brands['Gucci'], cats['Bags'], 'GG Marmont Bag', 'F', '25cm', 'Black', usd, 800, 2500, 15000),
            ('GC-BAG-002', brands['Gucci'], cats['Bags'], 'Dionysus Mini', 'F', '20cm', 'Beige', usd, 950, 3000, 18000),
            ('PR-SHO-001', brands['Prada'], cats['Shoes'], 'Monolith Boots', 'F', '38', 'Black', eur, 600, 1800, 12000),
            ('PR-SHO-002', brands['Prada'], cats['Shoes'], 'Triangle Logo Sneakers', 'M', '42', 'White', eur, 450, 1500, 9000),
            ('LV-BAG-001', brands['Louis Vuitton'], cats['Bags'], 'Neverfull MM', 'F', 'MM', 'Brown', eur, 1200, 3500, 22000),
            ('LV-ACC-001', brands['Louis Vuitton'], cats['Accessories'], 'Monogram Wallet', 'U', 'Standard', 'Brown', eur, 350, 900, 7500),
            ('CH-CLO-001', brands['Chanel'], cats['Ready-to-wear'], 'Tweed Jacket', 'F', 'M', 'Pink', eur, 2500, 5000, 35000),
            ('DI-PER-001', brands['Dior'], cats['Perfumes'], 'Sauvage EDP', 'M', '100ml', 'Gold', eur, 80, 200, 3500),
            ('VR-CLO-001', brands['Versace'], cats['Ready-to-wear'], 'Medusa T-Shirt', 'M', 'L', 'Black', eur, 250, 600, 4500),
            ('CH-BAG-001', brands['Chanel'], cats['Bags'], 'Classic Flap Medium', 'F', 'Medium', 'Black', eur, 5000, 8000, 65000),
        ]

        products = []
        variants = []
        for sku, brand, cat, model, gender, size, color, curr, cost, cust_ship, price in products_data:
            p, _ = Product.objects.get_or_create(
                brand=brand, category=cat, model_name=model, gender=gender,
                defaults={
                    'cost_foreign': Decimal(str(cost)),
                    'currency': curr,
                    'customs_cost': Decimal(str(cust_ship * 0.6)),
                    'shipping_cost': Decimal(str(cust_ship * 0.4)),
                    'suggested_selling_price': Decimal(str(price)),
                    'min_alert_quantity': 2,
                    'supplier': random.choice(suppliers),
                }
            )
            v, v_created = ProductVariant.objects.get_or_create(
                sku=sku,
                defaults={
                    'product': p, 'size': size, 'color': color
                }
            )
            if v_created:
                Stock.objects.get_or_create(variant=v, defaults={'current_quantity': random.randint(1, 15)})
            
            products.append(p)
            variants.append(v)

        # Customers
        customers_data = [
            ('Layla Ahmed', '01001234567', vip, 'VIP customer since 2020'),
            ('Nora Mohamed', '01112345678', vip, 'Prefers Chanel and Dior'),
            ('Sara Ali', '01223456789', regular, None),
            ('Ahmed Hassan', '01098765432', regular, None),
            ('Elegance Shop', '01556789012', wholesale, 'Wholesale client'),
        ]
        customers = []
        for name, phone, ctype, notes in customers_data:
            c = Customer.objects.create(
                name=name, phone=phone, customer_type=ctype, notes=notes
            )
            customers.append(c)

        # Sample Sales
        now = timezone.now()
        payment_methods = [cash, card, transfer, instapay]
        for i in range(15):
            date = now - timedelta(days=random.randint(0, 60))
            customer = random.choice(customers) if random.random() > 0.2 else None
            tx = SalesTransaction.objects.create(
                transaction_date=date,
                customer=customer,
                payment_method=random.choice(payment_methods),
                overall_discount_percentage=Decimal(str(random.choice([0, 0, 0, 5, 10]))),
            )
            num_items = random.randint(1, 3)
            for _ in range(num_items):
                variant = random.choice(variants)
                qty = random.randint(1, 2)
                SalesItem.objects.create(
                    sales_transaction=tx,
                    variant=variant,
                    quantity_sold=qty,
                    unit_price=variant.product.suggested_selling_price,
                    item_discount_percentage=Decimal(str(random.choice([0, 0, 5, 10]))),
                    tax_rate=vat,
                )
            tx.recalculate()
            if customer:
                customer.total_purchases += tx.final_amount
                customer.total_profit += tx.total_profit
                customer.last_purchase_date = date.date()
                customer.save()

        # Sample Expenses
        expense_cats = ['R', 'S', 'U', 'M', 'O']
        expense_descs = {
            'R': 'Monthly Shop Rent',
            'S': 'Employee Salaries',
            'U': 'Electricity & Water Utilities',
            'M': 'Social Media Advertising Campaign',
            'O': 'Miscellaneous Expenses',
        }
        for i in range(10):
            cat = random.choice(expense_cats)
            Expense.objects.create(
                expense_date=(now - timedelta(days=random.randint(0, 60))).date(),
                category=cat,
                description=expense_descs[cat],
                amount=Decimal(str(random.randint(500, 25000))),
                payment_method=random.choice(payment_methods),
            )

        self.stdout.write(self.style.SUCCESS('✅ Database seeded successfully!'))
