from rest_framework import serializers
from .models import Expense, ExpenseCategory
from apps.settings_app.models import PaymentMethod

class ExpenseCategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = ExpenseCategory
        fields = '__all__'

class ExpenseSerializer(serializers.ModelSerializer):
    payment_method = serializers.PrimaryKeyRelatedField(queryset=PaymentMethod.objects.all(), required=False, allow_null=True)
    payment_method_name = serializers.CharField(source='payment_method.name', read_only=True)
    category_name = serializers.CharField(source='expense_category.name', read_only=True)
    expense_category = serializers.PrimaryKeyRelatedField(queryset=ExpenseCategory.objects.all(), required=False, allow_null=True)

    class Meta:
        model = Expense
        fields = '__all__'

    def create(self, validated_data):
        if not validated_data.get('payment_method'):
            pm = PaymentMethod.objects.first()
            if not pm:
                pm = PaymentMethod.objects.create(name='Cash')
            validated_data['payment_method'] = pm

        if not validated_data.get('expense_category'):
            cat = ExpenseCategory.objects.first()
            if not cat:
                cat = ExpenseCategory.objects.create(name='General Overhead')
            validated_data['expense_category'] = cat

        if not validated_data.get('description'):
            validated_data['description'] = validated_data.get('notes') or 'Store Expense'

        return super().create(validated_data)
