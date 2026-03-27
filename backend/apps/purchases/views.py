from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from .models import PurchaseOrder, PurchaseOrderItem
from .serializers import PurchaseOrderSerializer, PurchaseOrderCreateSerializer, ReceiveItemsSerializer
from apps.inventory.tasks import update_stock_async
from apps.core.utils import log_activity

class PurchaseOrderViewSet(viewsets.ModelViewSet):
    queryset = PurchaseOrder.objects.select_related('supplier', 'currency').prefetch_related('items__product').all()
    filterset_fields = ['status', 'supplier']
    ordering = ['-created_at']

    def get_serializer_class(self):
        if self.action in ['create']:
            return PurchaseOrderCreateSerializer
        return PurchaseOrderSerializer

    @action(detail=True, methods=['post'])
    def receive(self, request, pk=None):
        order = self.get_object()
        serializer = ReceiveItemsSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        for item_data in serializer.validated_data['items']:
            try:
                item = order.items.get(id=item_data['item_id'])
            except PurchaseOrderItem.DoesNotExist:
                continue
            qty = int(item_data.get('quantity', 0))
            if qty <= 0:
                continue
            item.received_quantity += qty
            item.save()
            # --- ASYNC STOCK UPDATE (Phase 9) ---
            update_stock_async(item.product.id, qty)

        all_received = all(i.received_quantity >= i.ordered_quantity for i in order.items.all())
        any_received = any(i.received_quantity > 0 for i in order.items.all())
        if all_received:
            order.status = 'R'
        elif any_received:
            order.status = 'PR'
        order.save()

        # --- LOG ACTIVITY (Phase 10) ---
        log_activity(
            request.user, 
            f"Received items for PO-{order.id}", 
            "PurchaseOrder", 
            order.id
        )

        return Response(PurchaseOrderSerializer(order).data)
