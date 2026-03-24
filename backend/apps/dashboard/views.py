from datetime import timedelta
from django.utils import timezone
from django.db.models import Sum, Count, F, DecimalField
from django.db.models.functions import TruncDate
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

    sales = SalesTransaction.objects.filter(transaction_date__range=[start, end])
    total_sales = sales.aggregate(total=Sum('final_amount'))['total'] or 0

    expenses = Expense.objects.filter(expense_date__range=[start, end])
    total_expenses = expenses.aggregate(total=Sum('amount'))['total'] or 0

    # Inventory stats
    low_stock_count = 0
    total_inventory_value = 0
    for product in Product.objects.select_related('stock', 'currency').all():
        try:
            qty = product.stock.current_quantity
            if qty <= product.min_alert_quantity:
                low_stock_count += 1
            total_inventory_value += product.total_cost * qty
        except Stock.DoesNotExist:
            low_stock_count += 1

    # Calculate profit from sales items
    total_profit = 0
    for sale in sales:
        total_profit += sale.total_profit

    return Response({
        'total_sales': total_sales,
        'total_profit': total_profit,
        'total_expenses': total_expenses,
        'net_income': float(total_sales) - float(total_expenses),
        'low_stock_count': low_stock_count,
        'total_inventory_value': total_inventory_value,
        'total_transactions': sales.count(),
    })

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
        .values('product__sku', 'product__model', 'product__brand__name')
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
