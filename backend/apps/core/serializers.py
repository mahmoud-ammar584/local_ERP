from rest_framework import serializers
from .models import UserActivity

class UserActivitySerializer(serializers.ModelSerializer):
    username = serializers.CharField(source='user.username', read_only=True)
    user_email = serializers.CharField(source='user.email', read_only=True)

    class Meta:
        model = UserActivity
        fields = ['id', 'user', 'username', 'user_email', 'company', 'action', 'model_name', 'object_id', 'ip_address', 'timestamp', 'details']
