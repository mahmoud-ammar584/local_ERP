from rest_framework import viewsets
from .models import Customer
from .serializers import CustomerSerializer

class CustomerViewSet(viewsets.ModelViewSet):
    queryset = Customer.objects.select_related('customer_type').all()
    serializer_class = CustomerSerializer
    filterset_fields = ['customer_type']
    search_fields = ['name', 'phone', 'email']
    ordering = ['-created_at']
