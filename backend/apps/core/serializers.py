from rest_framework import serializers
from .models import UserActivity

class UserActivitySerializer(serializers.ModelSerializer):
    username = serializers.CharField(source='user.username', read_only=True, default='System')
    user_username = serializers.CharField(source='user.username', read_only=True, default='System')
    created_at = serializers.DateTimeField(source='timestamp', read_only=True)
    user_full_name = serializers.SerializerMethodField()
    user_role = serializers.SerializerMethodField()

    class Meta:
        model = UserActivity
        fields = [
            'id', 'user', 'username', 'user_username', 'user_full_name', 'user_role',
            'company', 'action', 'model_name', 'object_id', 'ip_address', 'timestamp', 'created_at', 'details'
        ]

    def get_user_full_name(self, obj):
        if obj.user:
            name = f"{obj.user.first_name} {obj.user.last_name}".strip()
            return name if name else obj.user.username
        return 'System'

    def get_user_role(self, obj):
        if obj.user and hasattr(obj.user, 'profile'):
            return obj.user.profile.role
        return 'system'
