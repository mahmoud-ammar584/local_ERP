from django.contrib.auth import authenticate
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.authtoken.models import Token
from .serializers import LoginSerializer, UserSerializer

from django_ratelimit.decorators import ratelimit
from knox.views import LoginView as KnoxLoginView
from knox.auth import TokenAuthentication

@api_view(['POST'])
@permission_classes([AllowAny])
@ratelimit(key='ip', rate='5/m', method='POST', block=True)
def login_view(request):
    serializer = LoginSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    user = authenticate(
        username=serializer.validated_data['username'],
        password=serializer.validated_data['password']
    )
    if not user:
        return Response({'error': 'Invalid credentials'}, status=status.HTTP_401_UNAUTHORIZED)
    
    # Knox handles token creation and expiry
    from knox.models import AuthToken
    instance, token = AuthToken.objects.create(user)
    
    return Response({
        'token': token,
        'user': UserSerializer(user).data,
        'expiry': instance.expiry
    })

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def logout_view(request):
    # Knox logout usually happens via its own views, but here we can do it manually or redirect
    from knox.models import AuthToken
    AuthToken.objects.filter(user=request.user).delete()
    return Response({'message': 'Logged out successfully'})

@api_view(['GET'])
def me_view(request):
    return Response(UserSerializer(request.user).data)
