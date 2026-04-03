from datetime import timedelta
from django.utils import timezone
from django.db.models import Sum, Count, F, DecimalField
from django.db.models.functions import TruncDate
from django.core.cache import cache
from rest_framework.decorators import api_view
from rest_framework.response import Response
from apps.sales.models import SalesTransaction, SalesItem
from apps.expenses.models import Expense
from apps.inventory.models import Product, Stock
from apps.customers.models import Customer

def _parse_date_range(request):
    period = request.query_params.get('period', 'month')
    now = timezone.now()
    if period == 'today':
        start = now.replace(hour=0, minute=0, second=0)
    elif period == 'week':
        start = now - timedelta(days=7)
    elif period == 'year':
        start = now - timedelta(days=365)
    elif period == 'custom':
        start = request.query_params.get('start_date', (now - timedelta(days=30)).isoformat())
        end = request.query_params.get('end_date', now.isoformat())
        return start, end
    else:  # month
        start = now - timedelta(days=30)
    return start, now

@api_view(['GET'])
def summary(request):
    start, end = _parse_date_range(request)
    period = request.query_params.get('period', 'month')
    cache_key = f"dashboard_summary_{period}_{start}_{end}"
    
    cached_data = cache.get(cache_key)
    if cached_data:
        return Response(cached_data)

    from django.db.models import Q, Sum, F, ExpressionWrapper
    
    # Efficient aggregation for Sales and Profits
    sales_stats = SalesItem.objects.filter(
        sales_transaction__transaction_date__range=[start, end]
    ).annotate(
        item_revenue=ExpressionWrapper(
            F('unit_price') * F('quantity_sold') * (1 - F('item_discount_percentage') / 100.0),
            output_field=DecimalField()
        ),
        item_profit=ExpressionWrapper(
            (F('unit_price') * (1 - F('item_discount_percentage') / 100.0) - F('variant__product__cost_foreign') * F('variant__product__currency__exchange_rate_to_base') - F('variant__product__customs_cost') - F('variant__product__shipping_cost')) * F('quantity_sold'),
            output_field=DecimalField()
        )
    ).aggregate(
        total_revenue=Sum('item_revenue'),
        total_profit=Sum('item_profit')
    )

    # Use the final_amount from SalesTransaction for total sales (includes transaction-level discounts if any)
    total_sales = SalesTransaction.objects.filter(
        transaction_date__range=[start, end]
    ).aggregate(total=Sum('final_amount'))['total'] or 0
    
    total_profit = sales_stats['total_profit'] or 0

    expenses = Expense.objects.filter(expense_date__range=[start, end])
    total_expenses = expenses.aggregate(total=Sum('amount'))['total'] or 0

    # Optimized Inventory stats
    inventory_stats = Stock.objects.annotate(
        item_value=ExpressionWrapper(
            F('current_quantity') * (
                F('variant__product__cost_foreign') * F('variant__product__currency__exchange_rate_to_base') + 
                F('variant__product__customs_cost') + 
                F('variant__product__shipping_cost')
            ),
            output_field=DecimalField()
        )
    ).aggregate(
        total_value=Sum('item_value'),
        low_stock_count=Count('id', filter=Q(current_quantity__lte=F('variant__product__min_alert_quantity')))
    )

    result = {
        'total_sales': total_sales,
        'total_profit': total_profit,
        'total_expenses': total_expenses,
        'net_income': float(total_sales) - float(total_expenses),
        'low_stock_count': inventory_stats['low_stock_count'],
        'total_inventory_value': inventory_stats['total_value'] or 0,
        'total_transactions': SalesTransaction.objects.filter(transaction_date__range=[start, end]).count(),
    }
    
    cache.set(cache_key, result, 300) # 5 minutes cache
    return Response(result)

@api_view(['GET'])
def sales_over_time(request):
    start, end = _parse_date_range(request)
    data = (
        SalesTransaction.objects
        .filter(transaction_date__range=[start, end])
        .annotate(date=TruncDate('transaction_date'))
        .values('date')
        .annotate(total=Sum('final_amount'), count=Count('id'))
        .order_by('date')
    )
    return Response(list(data))

@api_view(['GET'])
def expenses_by_category(request):
    start, end = _parse_date_range(request)
    data = (
        Expense.objects
        .filter(expense_date__range=[start, end])
        .values('category')
        .annotate(total=Sum('amount'))
        .order_by('-total')
    )
    category_map = dict(Expense.CATEGORY_CHOICES)
    result = [{'category': category_map.get(d['category'], d['category']), 'total': d['total']} for d in data]
    return Response(result)

@api_view(['GET'])
def top_products(request):
    start, end = _parse_date_range(request)
    data = (
        SalesItem.objects
        .filter(sales_transaction__transaction_date__range=[start, end])
        .values('variant__product__model_name', 'variant__product__brand__name')
        .annotate(
            total_qty=Sum('quantity_sold'),
            total_revenue=Sum(F('unit_price') * F('quantity_sold'), output_field=DecimalField())
        )
        .order_by('-total_revenue')[:10]
    )
    return Response(list(data))

@api_view(['GET'])
def top_customers(request):
    data = (
        Customer.objects
        .filter(total_purchases__gt=0)
        .values('id', 'name', 'total_purchases', 'total_profit')
        .order_by('-total_purchases')[:10]
    )
    return Response(list(data))
