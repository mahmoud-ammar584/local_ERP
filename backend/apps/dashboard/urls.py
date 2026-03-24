from django.urls import path
from . import views

urlpatterns = [
    path('summary/', views.summary),
    path('sales-over-time/', views.sales_over_time),
    path('expenses-by-category/', views.expenses_by_category),
    path('top-products/', views.top_products),
    path('top-customers/', views.top_customers),
]
