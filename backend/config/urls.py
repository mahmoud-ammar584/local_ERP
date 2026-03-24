from django.contrib import admin
from django.urls import path, include

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/auth/', include('apps.accounts.urls')),
    path('api/settings/', include('apps.settings_app.urls')),
    path('api/inventory/', include('apps.inventory.urls')),
    path('api/purchases/', include('apps.purchases.urls')),
    path('api/sales/', include('apps.sales.urls')),
    path('api/customers/', include('apps.customers.urls')),
    path('api/expenses/', include('apps.expenses.urls')),
    path('api/dashboard/', include('apps.dashboard.urls')),
]
