from rest_framework import serializers
from django.contrib.auth.models import User

class LoginSerializer(serializers.Serializer):
    username = serializers.CharField()
    password = serializers.CharField()

class UserSerializer(serializers.ModelSerializer):
    role = serializers.ChoiceField(choices=['admin', 'cashier'], required=False)
    password = serializers.CharField(write_only=True, required=False)

    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'first_name', 'last_name', 'role', 'password']

    def create(self, validated_data):
        role = validated_data.pop('role', 'cashier')
        password = validated_data.pop('password', None)
        user = User.objects.create(**validated_data)
        if password:
            user.set_password(password)
            user.save()
        
        from .models import Profile
        Profile.objects.update_or_create(user=user, defaults={'role': role})
        return user

    def update(self, instance, validated_data):
        role = validated_data.pop('role', None)
        password = validated_data.pop('password', None)
        
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        
        if password:
            instance.set_password(password)
        
        instance.save()
        
        if role:
            from .models import Profile
            Profile.objects.update_or_create(user=instance, defaults={'role': role})
        
        return instance

    def to_representation(self, instance):
        data = super().to_representation(instance)
        data['role'] = getattr(instance.profile, 'role', 'cashier') if hasattr(instance, 'profile') else 'cashier'
        return data
