from django.contrib.auth import authenticate
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.authtoken.models import Token
from .serializers import LoginSerializer, UserSerializer

@api_view(['POST'])
@permission_classes([AllowAny])
def login_view(request):
    serializer = LoginSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    user = authenticate(
        username=serializer.validated_data['username'],
        password=serializer.validated_data['password']
    )
    if not user:
        return Response({'error': 'بيانات الدخول غير صحيحة'}, status=status.HTTP_401_UNAUTHORIZED)
    token, _ = Token.objects.get_or_create(user=user)
    return Response({'token': token.key, 'user': UserSerializer(user).data})

@api_view(['POST'])
def logout_view(request):
    request.user.auth_token.delete()
    return Response({'message': 'تم تسجيل الخروج بنجاح'})

@api_view(['GET'])
def me_view(request):
    return Response(UserSerializer(request.user).data)
