from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register('transactions', views.SalesTransactionViewSet)
router.register('returns', views.ReturnTransactionViewSet)

urlpatterns = [
    path('', include(router.urls)),
]
