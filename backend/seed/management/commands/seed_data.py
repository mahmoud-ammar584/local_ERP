from django.core.management.base import BaseCommand
from django.contrib.auth.models import User
from django.utils import timezone
from decimal import Decimal
from datetime import timedelta
import random

from apps.settings_app.models import (
    Brand, Category, Supplier, CustomerType, PaymentMethod, Currency, TaxRate, StoreInfo
)
from apps.inventory.models import Product, Stock
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
        StoreInfo.objects.get_or_create(pk=1, defaults={
            'name': 'لا بوتيك الفاخرة',
            'address': 'شارع التسعين، التجمع الخامس، القاهرة',
            'phone': '01234567890',
            'email': 'info@laboutique.com',
        })

        # Currencies
        egp = Currency.objects.create(code='EGP', name='جنيه مصري', exchange_rate_to_base=Decimal('1.0'))
        usd = Currency.objects.create(code='USD', name='دولار أمريكي', exchange_rate_to_base=Decimal('50.0'))
        eur = Currency.objects.create(code='EUR', name='يورو', exchange_rate_to_base=Decimal('55.0'))

        # Brands
        brands = {}
        for name in ['Gucci', 'Prada', 'Louis Vuitton', 'Chanel', 'Dior', 'Versace']:
            brands[name] = Brand.objects.create(name=name, description=f'علامة {name} التجارية الفاخرة')

        # Categories
        cats = {}
        for name, desc in [('حقائب', 'Bags'), ('أحذية', 'Shoes'), ('ملابس جاهزة', 'Ready-to-wear'),
                           ('إكسسوارات', 'Accessories'), ('عطور', 'Perfumes')]:
            cats[name] = Category.objects.create(name=name, description=desc)

        # Suppliers
        suppliers = []
        for name, contact, phone in [
            ('Milan Imports', 'Marco Rossi', '+39 02 1234567'),
            ('Paris Luxe Trading', 'Jean Dupont', '+33 1 23456789'),
            ('Global Fashion Hub', 'Ahmed Hassan', '+20 1098765432'),
        ]:
            suppliers.append(Supplier.objects.create(
                name=name, contact_person=contact, phone=phone,
                email=f'{name.lower().replace(" ", "")}@supplier.com',
                payment_terms='Net 30'
            ))

        # Customer Types
        vip = CustomerType.objects.create(name='VIP')
        regular = CustomerType.objects.create(name='عادي')
        wholesale = CustomerType.objects.create(name='جملة')

        # Payment Methods
        cash = PaymentMethod.objects.create(name='كاش')
        card = PaymentMethod.objects.create(name='بطاقة ائتمان')
        transfer = PaymentMethod.objects.create(name='تحويل بنكي')
        instapay = PaymentMethod.objects.create(name='إنستاباي')

        # Tax Rates
        vat = TaxRate.objects.create(name='ضريبة القيمة المضافة', rate=Decimal('0.14'))
        no_tax = TaxRate.objects.create(name='بدون ضريبة', rate=Decimal('0.0'))

        # Products
        products_data = [
            ('GC-BAG-001', brands['Gucci'], cats['حقائب'], 'GG Marmont Bag', 'F', '25cm', 'أسود', usd, 800, 2500, 15000),
            ('GC-BAG-002', brands['Gucci'], cats['حقائب'], 'Dionysus Mini', 'F', '20cm', 'بيج', usd, 950, 3000, 18000),
            ('PR-SHO-001', brands['Prada'], cats['أحذية'], 'Monolith Boots', 'F', '38', 'أسود', eur, 600, 1800, 12000),
            ('PR-SHO-002', brands['Prada'], cats['أحذية'], 'Triangle Logo Sneakers', 'M', '42', 'أبيض', eur, 450, 1500, 9000),
            ('LV-BAG-001', brands['Louis Vuitton'], cats['حقائب'], 'Neverfull MM', 'F', 'MM', 'بني', eur, 1200, 3500, 22000),
            ('LV-ACC-001', brands['Louis Vuitton'], cats['إكسسوارات'], 'Monogram Wallet', 'U', 'Standard', 'بني', eur, 350, 900, 7500),
            ('CH-CLO-001', brands['Chanel'], cats['ملابس جاهزة'], 'Tweed Jacket', 'F', 'M', 'وردي', eur, 2500, 5000, 35000),
            ('DI-PER-001', brands['Dior'], cats['عطور'], 'Sauvage EDP', 'M', '100ml', 'ذهبي', eur, 80, 200, 3500),
            ('VR-CLO-001', brands['Versace'], cats['ملابس جاهزة'], 'Medusa T-Shirt', 'M', 'L', 'أسود', eur, 250, 600, 4500),
            ('CH-BAG-001', brands['Chanel'], cats['حقائب'], 'Classic Flap Medium', 'F', 'Medium', 'أسود', eur, 5000, 8000, 65000),
        ]

        products = []
        for sku, brand, cat, model, gender, size, color, curr, cost, cust_ship, price in products_data:
            p = Product.objects.create(
                sku=sku, brand=brand, category=cat, model=model, gender=gender,
                size=size, color=color, cost_foreign=Decimal(str(cost)),
                currency=curr, customs_cost=Decimal(str(cust_ship * 0.6)),
                shipping_cost=Decimal(str(cust_ship * 0.4)),
                suggested_selling_price=Decimal(str(price)),
                min_alert_quantity=2, supplier=random.choice(suppliers),
            )
            Stock.objects.create(product=p, current_quantity=random.randint(1, 15))
            products.append(p)

        # Customers
        customers_data = [
            ('ليلى أحمد', '01001234567', vip, 'ليلى عميلة VIP منذ 2020'),
            ('نورا محمد', '01112345678', vip, 'تفضل Chanel و Dior'),
            ('سارة علي', '01223456789', regular, None),
            ('أحمد حسن', '01098765432', regular, None),
            ('محل الأناقة', '01556789012', wholesale, 'عميل جملة'),
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
                product = random.choice(products)
                qty = random.randint(1, 2)
                SalesItem.objects.create(
                    sales_transaction=tx,
                    product=product,
                    quantity_sold=qty,
                    unit_price=product.suggested_selling_price,
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
            'R': 'إيجار المحل الشهري',
            'S': 'رواتب الموظفين',
            'U': 'فواتير كهرباء ومياه',
            'M': 'حملة إعلانية على السوشيال ميديا',
            'O': 'مصاريف نثرية',
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
