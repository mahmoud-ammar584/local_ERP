# لا بوتيك - نظام ERP للأزياء الفاخرة

نظام إدارة موارد متكامل لمتاجر الأزياء الفاخرة مبني بـ Django + Next.js + PostgreSQL.

## المميزات

- 🏷️ **إدارة المخزون** - تتبع المنتجات مع تنبيهات المخزون المنخفض وحسابات التكلفة التلقائية
- 💰 **المبيعات** - تسجيل عمليات البيع مع حساب الأرباح والضرائب والخصومات
- 📦 **المشتريات** - إدارة طلبات الشراء واستلام البضائع مع تحديث المخزون تلقائياً
- 👥 **العملاء** - إدارة بيانات العملاء مع تتبع المشتريات والأرباح تلقائياً
- 💸 **المصروفات** - تتبع المصروفات التشغيلية بالفئات
- 📊 **لوحة التحكم** - رسوم بيانية ومؤشرات أداء شاملة
- ⚙️ **الإعدادات** - إدارة الماركات والفئات والموردين والعملات وأسعار الصرف
- 🔐 **المصادقة** - تسجيل دخول بالتوكن مع صلاحيات

## التقنيات

| Component | Technology |
|-----------|-----------|
| Backend | Django 5, Django REST Framework |
| Frontend | Next.js 14, React, Tailwind CSS |
| Database | PostgreSQL 15 |
| Charts | Recharts |
| HTTP Client | Axios + React Query |
| Container | Docker + Docker Compose |

## التشغيل السريع

### باستخدام Docker Compose:
```bash
docker-compose up --build
```

### بدون Docker:

**Backend:**
```bash
cd backend
pip install -r requirements.txt
python manage.py migrate
python manage.py seed_data --no-input
python manage.py runserver
```

**Frontend:**
```bash
cd frontend
npm install
npm run dev
```

**Prerequisites:** PostgreSQL running with database `erp1`, user `postgres`, password `123456`.

## بيانات الدخول

| Username | Password |
|----------|----------|
| admin | admin123 |

## الروابط

- **Frontend:** http://localhost:3000
- **Backend API:** http://localhost:8000/api/
- **Django Admin:** http://localhost:8000/admin/

## API Endpoints

| Module | Endpoint | Methods |
|--------|----------|---------|
| Auth | `/api/auth/login/` | POST |
| Auth | `/api/auth/me/` | GET |
| Brands | `/api/settings/brands/` | CRUD |
| Categories | `/api/settings/categories/` | CRUD |
| Suppliers | `/api/settings/suppliers/` | CRUD |
| Currencies | `/api/settings/currencies/` | CRUD |
| Products | `/api/inventory/products/` | CRUD |
| Purchase Orders | `/api/purchases/orders/` | CRUD |
| Receive Items | `/api/purchases/orders/{id}/receive/` | POST |
| Sales | `/api/sales/transactions/` | CRUD |
| Customers | `/api/customers/` | CRUD |
| Expenses | `/api/expenses/` | CRUD |
| Dashboard | `/api/dashboard/summary/` | GET |
| Dashboard | `/api/dashboard/sales-over-time/` | GET |
| Dashboard | `/api/dashboard/top-products/` | GET |
| Dashboard | `/api/dashboard/top-customers/` | GET |

## حسابات المنتج

- **التكلفة المحلية** = التكلفة بالعملة الأجنبية × سعر الصرف
- **التكلفة الإجمالية** = التكلفة المحلية + الجمارك + الشحن
- **الربح المتوقع** = سعر البيع المقترح - التكلفة الإجمالية
