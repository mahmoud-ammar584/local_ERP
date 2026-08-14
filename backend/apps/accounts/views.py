import secrets
from datetime import timedelta
from django.utils import timezone
from django.contrib.auth import authenticate
from django.contrib.auth.models import User
from django.db import transaction
from rest_framework import status, viewsets
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from django_ratelimit.decorators import ratelimit
from knox.models import AuthToken

from .models import Profile, Company, Invitation
from .serializers import (
    LoginSerializer, UserSerializer, InvitationCreateSerializer, AcceptInvitationSerializer
)
from .permissions import AdminOnly, HasModulePermission
from apps.core.mixins import TenantScopedViewSetMixin, AuditLogMixin, get_client_ip
from apps.core.models import UserActivity


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
    
    profile = getattr(user, 'profile', None)
    if not profile or not profile.company_id:
        return Response({'error': 'User account is not associated with an active company'}, status=status.HTTP_403_FORBIDDEN)

    instance, token = AuthToken.objects.create(user)
    
    # Audit log login event
    try:
        UserActivity.objects.create(
            user=user,
            company=profile.company,
            action="User logged in",
            model_name="User",
            object_id=user.id,
            ip_address=get_client_ip(request),
            details={"username": user.username}
        )
    except Exception as e:
        print(f"Login audit error: {e}")

    return Response({
        'token': token,
        'user': UserSerializer(user).data,
        'expiry': instance.expiry
    })


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def logout_view(request):
    if hasattr(request, '_auth') and request._auth:
        request._auth.delete()
    return Response({'message': 'Logged out successfully'})


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def logout_all_view(request):
    AuthToken.objects.filter(user=request.user).delete()
    return Response({'message': 'All sessions terminated'})


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def me_view(request):
    return Response(UserSerializer(request.user).data)


class UserViewSet(AuditLogMixin, viewsets.ModelViewSet):
    """
    Company Admin ViewSet to manage user roles/permissions within their company.
    Self-registration/Direct user creation is disabled. Users are created via Invitations.
    """
    module_name = 'users'
    serializer_class = UserSerializer
    permission_classes = [IsAuthenticated, AdminOnly]

    def get_queryset(self):
        profile = getattr(self.request.user, 'profile', None)
        if not profile or not profile.company_id:
            return User.objects.none()
        return User.objects.filter(profile__company_id=profile.company_id).select_related('profile', 'profile__company').order_by('-id')

    def create(self, request, *args, **kwargs):
        return Response(
            {'error': 'Direct user creation is disabled. Please issue an email invitation instead.'},
            status=status.HTTP_400_BAD_REQUEST
        )

    def partial_update(self, request, *args, **kwargs):
        user = self.get_object()
        role = request.data.get('role')
        permissions_data = request.data.get('permissions')

        profile = user.profile
        if role:
            profile.role = role
        if permissions_data is not None and isinstance(permissions_data, dict):
            profile.permissions = permissions_data
        profile.save()

        if 'first_name' in request.data:
            user.first_name = request.data['first_name']
        if 'last_name' in request.data:
            user.last_name = request.data['last_name']
        user.save()

        return Response(UserSerializer(user).data)


class InvitationViewSet(AuditLogMixin, viewsets.ModelViewSet):
    """
    ViewSet for Company Admins to manage and issue user invitations by email.
    """
    module_name = 'users'
    serializer_class = InvitationCreateSerializer
    permission_classes = [IsAuthenticated, AdminOnly]

    def get_queryset(self):
        profile = getattr(self.request.user, 'profile', None)
        if not profile or not profile.company_id:
            return Invitation.objects.none()
        return Invitation.objects.filter(company_id=profile.company_id).order_by('-created_at')

    def create(self, request, *args, **kwargs):
        email = request.data.get('email', '').strip().lower()
        role = request.data.get('role', 'cashier')
        permissions_data = request.data.get('permissions', {})

        if not email:
            return Response({'error': 'Email is required'}, status=status.HTTP_400_BAD_REQUEST)

        if User.objects.filter(email__iexact=email).exists():
            return Response({'error': f'A user account with email {email} already exists.'}, status=status.HTTP_400_BAD_REQUEST)

        profile = request.user.profile
        company = profile.company

        pending_invite = Invitation.objects.filter(company=company, email__iexact=email, is_used=False, expires_at__gt=timezone.now()).first()
        if pending_invite:
            return Response({'error': f'An active invitation for {email} already exists.'}, status=status.HTTP_400_BAD_REQUEST)

        token = secrets.token_urlsafe(32)
        expires_at = timezone.now() + timedelta(hours=48)

        invitation = Invitation.objects.create(
            company=company,
            email=email,
            invited_by=request.user,
            token=token,
            role=role,
            permissions=permissions_data if isinstance(permissions_data, dict) else {},
            expires_at=expires_at
        )

        return Response({
            'message': f'Invitation created successfully for {email}',
            'invitation': InvitationCreateSerializer(invitation).data,
            'token': token,
            'invite_link': f"/signup?token={token}"
        }, status=status.HTTP_201_CREATED)


@api_view(['GET'])
@permission_classes([AllowAny])
def verify_invitation_view(request):
    token = request.query_params.get('token')
    if not token:
        return Response({'error': 'Token parameter is required'}, status=status.HTTP_400_BAD_REQUEST)

    try:
        invitation = Invitation.objects.select_related('company').get(token=token)
    except Invitation.DoesNotExist:
        return Response({'error': 'Invalid or unknown invitation token'}, status=status.HTTP_404_NOT_FOUND)

    if invitation.is_used:
        return Response({'error': 'This invitation token has already been used'}, status=status.HTTP_400_BAD_REQUEST)

    if invitation.is_expired:
        return Response({'error': 'This invitation token has expired'}, status=status.HTTP_400_BAD_REQUEST)

    return Response({
        'valid': True,
        'email': invitation.email,
        'company_name': invitation.company.name,
        'role': invitation.role
    })


@api_view(['POST'])
@permission_classes([AllowAny])
@ratelimit(key='ip', rate='5/m', method='POST', block=True)
def accept_invitation_view(request):
    serializer = AcceptInvitationSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)

    token = serializer.validated_data['token']
    username = serializer.validated_data['username'].strip()
    password = serializer.validated_data['password']
    first_name = serializer.validated_data.get('first_name', '').strip()
    last_name = serializer.validated_data.get('last_name', '').strip()

    try:
        invitation = Invitation.objects.select_related('company').get(token=token)
    except Invitation.DoesNotExist:
        return Response({'error': 'Invalid or unknown invitation token'}, status=status.HTTP_404_NOT_FOUND)

    if invitation.is_used:
        return Response({'error': 'This invitation token has already been used'}, status=status.HTTP_400_BAD_REQUEST)

    if invitation.is_expired:
        return Response({'error': 'This invitation token has expired'}, status=status.HTTP_400_BAD_REQUEST)

    if User.objects.filter(username__iexact=username).exists():
        return Response({'error': f'Username "{username}" is already taken'}, status=status.HTTP_400_BAD_REQUEST)

    with transaction.atomic():
        user = User.objects.create_user(
            username=username,
            email=invitation.email,
            password=password,
            first_name=first_name,
            last_name=last_name
        )

        Profile.objects.update_or_create(
            user=user,
            defaults={
                'company': invitation.company,
                'role': invitation.role,
                'permissions': invitation.permissions
            }
        )

        invitation.is_used = True
        invitation.save()

        # Log audit trail
        try:
            UserActivity.objects.create(
                user=user,
                company=invitation.company,
                action=f"User accepted invitation and created account ({username})",
                model_name="User",
                object_id=user.id,
                ip_address=get_client_ip(request),
                details={"email": invitation.email, "role": invitation.role}
            )
        except Exception as e:
            print(f"Audit log error during accept: {e}")

    return Response({
        'message': 'Account created successfully from invitation',
        'user': UserSerializer(user).data
    }, status=status.HTTP_201_CREATED)
