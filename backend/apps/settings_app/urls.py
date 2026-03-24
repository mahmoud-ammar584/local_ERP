from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register('brands', views.BrandViewSet)
router.register('categories', views.CategoryViewSet)
router.register('suppliers', views.SupplierViewSet)
router.register('customer-types', views.CustomerTypeViewSet)
router.register('payment-methods', views.PaymentMethodViewSet)
router.register('currencies', views.CurrencyViewSet)
router.register('tax-rates', views.TaxRateViewSet)

urlpatterns = [
    path('store-info/', views.store_info_view),
    path('', include(router.urls)),
]
