# Local ERP - Enterprise Resource Planning System for Luxury Fashion

A comprehensive, enterprise-grade ERP (Enterprise Resource Planning) solution specifically engineered for luxury fashion boutiques and high-end retail operations. Built with modern, scalable technologies: Django 5, Next.js 14, and PostgreSQL.

## Executive Summary

**Local ERP** is an integrated business management platform that consolidates operations across inventory management, sales, procurement, customer relationship management, and financial tracking. The system provides real-time analytics, automated calculations, and intelligent workflow automation to optimize operational efficiency, enhance profitability, and deliver actionable business intelligence.

## Core Features & Capabilities

### 📦 Inventory Management System
Advanced product lifecycle management with real-time stock tracking, configurable low-stock alerts, multi-currency cost calculations, and intelligent inventory valuation using weighted average costing methodologies. Supports SKU management, product variants, and batch tracking.

### 💰 Sales Operations & Point-of-Sale
Sophisticated transaction processing with integrated gross margin calculations, automatic tax computation, flexible discount mechanisms, customer attribution, and comprehensive sales audit trails. Includes support for multiple payment methods and POS integration.

### 📥 Procurement & Supply Chain Management
Streamlined purchase order workflows with vendor management, goods receipt processing, invoice matching, automatic inventory synchronization, and cost tracking throughout the entire procurement lifecycle. Includes purchase requisition workflows and supplier performance metrics.

### 👥 Customer Relationship Management
Comprehensive customer database with detailed purchase history tracking, lifetime value calculations, automated profit attribution, customer segmentation, and loyalty program integration capabilities.

### 💸 Financial Expense Management
Categorized operational expense tracking with departmental cost allocation, cost center management, budget variance analysis, and comprehensive financial reporting for improved profitability control and decision-making.

### 📊 Executive Analytics & Reporting
Real-time business intelligence dashboard with interactive data visualizations, KPI monitoring, sales trend analysis, product performance ranking, customer profitability segmentation, and customizable report generation.

### ⚙️ System Configuration & Administration
Centralized administrative control for master data management including brands, product categories, supplier databases, multi-currency support with dynamic exchange rates, tax configuration, and system-wide settings.

### 🔐 Authentication & Authorization
Enterprise-grade token-based authentication with JWT, role-based access control (RBAC), permission management, audit logging, and session management for secure user access and accountability.

## Technology Stack

| Component | Technology | Version |
|-----------|-----------|---------|
| Backend API | Django REST Framework | 5.x |
| Frontend Interface | Next.js + React | 14.x / 18.x |
| Database | PostgreSQL | 15+ |
| Data Visualization | Recharts | Latest |
| HTTP Client | Axios + React Query | Latest |
| Containerization | Docker + Docker Compose | Latest |
| Task Scheduling | Celery (optional) | Latest |
| Caching | Redis (optional) | Latest |

## Deployment & Installation

### Option 1: Docker Compose Deployment (Recommended for Development)

```bash
docker-compose up --build
```

This command will:
- Build and start the Django backend service on port 8000
- Build and start the Next.js frontend service on port 3000  
- Initialize PostgreSQL database with required schema
- Execute database migrations automatically
- Seed the database with demonstration data
- Configure all service dependencies and networking

**Estimated startup time:** 2-3 minutes on first run

### Option 2: Local Development Environment

#### System Prerequisites
- **Python:** 3.10 or higher
- **Node.js:** 18.x LTS or higher
- **PostgreSQL:** 15 or higher
- **Git:** Latest version

#### Backend Installation & Configuration

```bash
cd backend
pip install --upgrade pip setuptools wheel
pip install -r requirements.txt
python manage.py migrate
python manage.py seed_data --no-input
python manage.py runserver
```

Backend server will be available at: `http://localhost:8000`

#### Frontend Installation & Configuration

```bash
cd frontend
npm install
npm run dev
```

Frontend application will be accessible at: `http://localhost:3000`

#### Database Configuration

Configure PostgreSQL with the following parameters:
```
Database Name: erp1
Username: postgres
Password: 123456
Host: localhost
Port: 5432
```

Alternatively, update `backend/config/settings.py` with your database credentials.

## Default Access Credentials

| User Role | Username | Password |
|-----------|----------|----------|
| Administrator | admin | admin123 |

**⚠️ Security Notice:** Change default credentials immediately before production deployment.

## Application Service URLs

| Service | URL | Purpose |
|---------|-----|---------|
| Web Application | http://localhost:3000 | User interface & dashboard |
| REST API Base | http://localhost:8000/api/ | API endpoints |
| Django Admin Panel | http://localhost:8000/admin/ | System administration |
| Database Admin (pgAdmin) | http://localhost:5050 | PostgreSQL management |

## REST API Reference

### Authentication Endpoints
| Endpoint | HTTP Method | Description |
|----------|-------------|-------------|
| `/api/auth/login/` | POST | User authentication and token generation |
| `/api/auth/logout/` | POST | User session termination |
| `/api/auth/refresh/` | POST | JWT token refresh |
| `/api/auth/me/` | GET | Retrieve current user profile |

### Configuration Management Endpoints
| Endpoint | HTTP Method | Description |
|----------|-------------|-------------|
| `/api/settings/brands/` | CRUD | Brand master data management |
| `/api/settings/categories/` | CRUD | Product category configuration |
| `/api/settings/suppliers/` | CRUD | Supplier information management |
| `/api/settings/currencies/` | CRUD | Multi-currency setup |
| `/api/settings/taxes/` | CRUD | Tax rate configuration |

### Inventory Management Endpoints
| Endpoint | HTTP Method | Description |
|----------|-------------|-------------|
| `/api/inventory/products/` | CRUD | Product catalog operations |
| `/api/inventory/products/{id}/stock/` | GET | Current stock levels |
| `/api/inventory/stock-adjustments/` | POST | Inventory adjustments |

### Procurement Endpoints
| Endpoint | HTTP Method | Description |
|----------|-------------|-------------|
| `/api/purchases/orders/` | CRUD | Purchase order management |
| `/api/purchases/orders/{id}/receive/` | POST | Goods receipt processing |
| `/api/purchases/invoices/` | CRUD | Supplier invoice management |

### Sales Endpoints
| Endpoint | HTTP Method | Description |
|----------|-------------|-------------|
| `/api/sales/transactions/` | CRUD | Sales transaction recording |
| `/api/sales/invoices/{id}/pdf/` | GET | Invoice PDF generation |
| `/api/sales/returns/` | CRUD | Sales return processing |

### Customer Management Endpoints
| Endpoint | HTTP Method | Description |
|----------|-------------|-------------|
| `/api/customers/` | CRUD | Customer database management |
| `/api/customers/{id}/transactions/` | GET | Customer transaction history |
| `/api/customers/{id}/credit-limit/` | PATCH | Credit limit management |

### Financial Endpoints
| Endpoint | HTTP Method | Description |
|----------|-------------|-------------|
| `/api/expenses/` | CRUD | Expense tracking and categorization |
| `/api/expenses/reports/` | GET | Expense analytics and reports |

### Analytics & Reporting Endpoints
| Endpoint | HTTP Method | Description |
|----------|-------------|-------------|
| `/api/dashboard/summary/` | GET | Key business metrics aggregation |
| `/api/dashboard/sales-over-time/` | GET | Historical sales trend analysis |
| `/api/dashboard/top-products/` | GET | Best-performing product ranking |
| `/api/dashboard/top-customers/` | GET | High-value customer segmentation |
| `/api/dashboard/inventory-health/` | GET | Inventory status overview |
| `/api/reports/profitability/` | GET | Profitability analysis report |

## Cost Calculation & Valuation Methodology

The system implements sophisticated cost accounting algorithms for accurate product valuation, inventory measurement, and profitability analysis:

### Local Currency Cost Determination
```
Local Cost = Product Cost (Foreign Currency) × Current Exchange Rate
```

### Total Cost of Goods (COGS)
```
Total COGS = Local Cost + Customs Duties + Shipping Charges + Handling Costs
```

### Standard Profit Margin Calculation
```
Expected Profit = Suggested Retail Price − Total COGS
Profit Margin % = (Expected Profit / Suggested Retail Price) × 100
```

### Weighted Average Inventory Valuation
```
Average Unit Cost = Total Inventory Value / Total Units in Stock
```

## Project Directory Structure

```
local_ERP/
├── backend/                          # Django REST API Backend
│   ├── apps/                         # Django Applications
│   │   ├── accounts/                 # User authentication & authorization
│   │   │   ├── models.py            # User profile models
│   │   │   ├── serializers.py       # User serializers
│   │   │   ├── views.py             # Authentication views
│   │   │   └── urls.py              # Auth endpoint routing
│   │   ├── customers/                # Customer Management Module
│   │   │   ├── models.py            # Customer models
│   │   │   ├── admin.py             # Django admin configuration
│   │   │   ├── serializers.py       # Customer serializers
│   │   │   ├── views.py             # Customer API views
│   │   │   ├── urls.py              # Customer endpoints
│   │   │   └── migrations/          # Database migrations
│   │   ├── dashboard/                # Analytics & Reporting
│   │   │   ├── views.py             # Dashboard API endpoints
│   │   │   └── urls.py              # Dashboard routing
│   │   ├── expenses/                 # Expense Management
│   │   │   ├── models.py            # Expense models
│   │   │   ├── serializers.py       # Expense serializers
│   │   │   ├── views.py             # Expense API views
│   │   │   └── migrations/          # Database migrations
│   │   ├── inventory/                # Product & Inventory Management
│   │   │   ├── models.py            # Product models
│   │   │   ├── admin.py             # Admin configuration
│   │   │   ├── serializers.py       # Product serializers
│   │   │   ├── views.py             # Inventory API views
│   │   │   └── migrations/
│   │   ├── purchases/                # Procurement Module
│   │   │   ├── models.py            # Purchase order models
│   │   │   ├── admin.py
│   │   │   ├── serializers.py
│   │   │   ├── views.py
│   │   │   └── migrations/
│   │   ├── sales/                    # Sales Module
│   │   │   ├── models.py            # Transaction models
│   │   │   ├── admin.py
│   │   │   ├── serializers.py
│   │   │   ├── views.py
│   │   │   └── migrations/
│   │   └── settings_app/             # System Configuration
│   │       ├── models.py            # Configuration models
│   │       ├── serializers.py
│   │       ├── views.py
│   │       └── migrations/
│   ├── config/                       # Django Project Configuration
│   │   ├── settings.py              # Main Django settings
│   │   ├── urls.py                  # URL routing configuration
│   │   └── wsgi.py                  # WSGI application entry point
│   ├── seed/                         # Database Seeding Utilities
│   │   ├── apps.py
│   │   └── management/
│   │       └── commands/
│   │           └── seed_data.py     # Seed data command
│   ├── manage.py                    # Django management CLI
│   └── requirements.txt             # Python dependencies
│
├── frontend/                        # Next.js React Frontend
│   ├── src/
│   │   ├── app/                     # Next.js App Router
│   │   │   ├── layout.js            # Root layout component
│   │   │   ├── page.js              # Home/dashboard page
│   │   │   ├── globals.css          # Global styles
│   │   │   ├── login/               # Login module
│   │   │   ├── customers/           # Customer management pages
│   │   │   ├── inventory/           # Inventory pages
│   │   │   ├── sales/               # Sales pages
│   │   │   ├── purchases/           # Purchase pages
│   │   │   ├── expenses/            # Expense pages
│   │   │   └── settings/            # Settings pages
│   │   ├── components/              # Reusable React Components
│   │   │   ├── AppShell.js         # Main layout wrapper
│   │   │   ├── Sidebar.js          # Navigation sidebar
│   │   │   ├── Modal.js            # Modal dialog component
│   │   │   └── [other components]/
│   │   └── lib/                     # Utility Functions & Services
│   │       ├── api.js              # Axios API client configuration
│   │       └── [utilities]/
│   ├── public/                      # Static assets
│   ├── package.json                # Node.js dependencies
│   ├── next.config.mjs             # Next.js configuration
│   ├── tailwind.config.js          # Tailwind CSS configuration
│   └── jsconfig.json               # JavaScript configuration
│
├── docker-compose.yml              # Multi-container orchestration
├── Dockerfile (backend)            # Backend container image
├── Dockerfile (frontend)           # Frontend container image
└── README.md                       # This documentation file
```

## Development Workflow & Best Practices

### Backend Development Procedure

**Adding a New Model Field:**
1. Edit model in `backend/apps/[module]/models.py`
2. Create migration: `python manage.py makemigrations [app_name]`
3. Review and verify migration file in `migrations/`
4. Apply migration: `python manage.py migrate [app_name]`
5. Update serializer in `backend/apps/[module]/serializers.py`
6. Update API views if necessary
7. Test via API endpoint

**Adding New API Endpoints:**
1. Update views in `backend/apps/[module]/views.py`
2. Register routes in `backend/apps/[module]/urls.py`
3. Add unit tests
4. Document in API Reference section
5. Restart development server

### Frontend Development Workflow

**Creating New Pages:**
1. Create directory in `frontend/src/app/[feature]/`
2. Add `page.js` component
3. Import necessary components from `frontend/src/components/`
4. Update API calls as necessary in `frontend/src/lib/api.js`
5. Use Next.js hot reload for instant feedback

**Updating Components:**
1. Edit component in `frontend/src/components/`
2. Check hot reload functionality
3. Test with various data states
4. Ensure responsive design (mobile, tablet, desktop)

## System Requirements & Infrastructure

### Minimum System Configuration
- **Processor:** Dual-core CPU (2.0 GHz+)
- **Memory:** 2GB RAM
- **Storage:** 10GB free disk space
- **Database:** PostgreSQL 12+
- **Connectivity:** 100 Mbps network

### Recommended Production Configuration  
- **Processor:** Quad-core CPU or better (2.4 GHz+)
- **Memory:** 8GB+ RAM
- **Storage:** 50GB+ (SSD strongly recommended for database)
- **Database:** PostgreSQL 15+ with replication and backup
- **Cache:** Redis for session and query caching
- **Message Queue:** RabbitMQ or Celery for async tasks
- **Monitoring:** Application Performance Monitoring (APM) stack

## Pre-Production Deployment Checklist

- [ ] **Security:** Update all default credentials (`admin/admin123`)
- [ ] **Configuration:** Create and configure `.env` file with environment variables
- [ ] **SSL/TLS:** Install valid SSL certificates and configure HTTPS
- [ ] **Database:** Configure automated backup schedule and test restore procedures
- [ ] **API Security:** Implement rate limiting and request throttling
- [ ] **CORS:** Configure CORS appropriately for your domain
- [ ] **Security Headers:** Enable CSP, HSTS, X-Frame-Options, and other security headers
- [ ] **Logging:** Configure centralized logging and monitoring
- [ ] **Backups:** Test complete backup and disaster recovery procedures
- [ ] **Load Testing:** Conduct capacity testing before production launch
- [ ] **Documentation:** Update system documentation and runbooks
- [ ] **User Training:** Train staff on system usage and best practices

## Performance Optimization

### Database Optimizations
- Enable query result caching with Redis
- Configure appropriate database indexes
- Implement query pagination (limit 100 records per request)
- Use database connection pooling

### API Optimizations  
- Implement request/response compression
- Configure CDN for static assets
- Enable API caching headers appropriately
- Implement lazy loading for data-heavy endpoints

### Frontend Optimizations
- Enable production build optimization
- Configure image optimization
- Implement code splitting and lazy loading
- Monitor Core Web Vitals and performance metrics

## Troubleshooting Guide

### Common Issues

**API Connection Errors**
- Verify backend service is running on port 8000
- Check network connectivity and firewall rules
- Review CORS configuration in Django settings

**Database Connection Issues**
- Verify PostgreSQL is running and accessible
- Confirm database name, username, password
- Check database user has required permissions
- Review PostgreSQL logs for errors

**Frontend Load Issues**
- Clear browser cache and cookies
- Verify Node.js and npm versions
- Check for console errors in browser developer tools
- Ensure API endpoints are accessible

## License

**Proprietary Software** - Authorized use only. All rights reserved.

This software is confidential and proprietary to the organization. Unauthorized copying, modification, or distribution is strictly prohibited.

## Support & Maintenance

For technical support, documentation updates, or feature requests, please contact the development team or refer to internal documentation repositories.

---

**Product Version:** 1.0.0  
**Last Updated:** March 2026  
**Build:** Production Ready  
**Status:** Stable
