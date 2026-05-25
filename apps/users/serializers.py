# apps/users/serializers.py
from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenRefreshSerializer
from rest_framework_simplejwt.exceptions import InvalidToken
from apps.users.models import User
from apps.users.services import SessionService
import logging

logger = logging.getLogger(__name__)


class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'email', 'first_name', 'last_name', 'role', 'is_verified', 'created_at']
        read_only_fields = ['id', 'is_verified', 'created_at']


class UserRegistrationSerializer(serializers.Serializer):
    email = serializers.EmailField(max_length=255)
    password = serializers.CharField(write_only=True, min_length=10)
    first_name = serializers.CharField(max_length=150, required=False, allow_blank=True)
    last_name = serializers.CharField(max_length=150, required=False, allow_blank=True)
    role = serializers.ChoiceField(choices=User.ROLES.choices, default=User.ROLES.ANALYST)

    def validate_email(self, value):
        if User.objects.filter(email=value).exists():
            raise serializers.ValidationError("A user with this email address already exists.")
        return value.lower()


class UserLoginSerializer(serializers.Serializer):
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True)


class CustomTokenRefreshSerializer(TokenRefreshSerializer):
    """
    Subclass token refresh to verify token is in the Redis whitelist
    prior to issuing a new rotated access/refresh pair.
    """
    def validate(self, attrs):
        refresh_token = attrs.get('refresh')
        if not refresh_token:
            raise serializers.ValidationError({"refresh": "This field is required."})

        # Decode token manually or extract jti/user_id from simplejwt token object BEFORE super() invalidates it
        from rest_framework_simplejwt.tokens import RefreshToken
        try:
            token_obj = RefreshToken(refresh_token)
            user_id = str(token_obj['user_id'])
        except Exception as e:
            raise serializers.ValidationError({"refresh": f"Invalid token: {str(e)}"})

        # Check Redis whitelist
        if not SessionService.is_refresh_token_valid(user_id, refresh_token):
            logger.warning(f"Rejected revoked or blacklisted refresh token for user {user_id}")
            raise serializers.ValidationError({"refresh": "Token has been revoked or session invalidated."})

        # Base simplejwt validation parses the token, verifies signatures, rotates and blacklists the token
        try:
            data = super().validate(attrs)
        except InvalidToken as e:
            raise serializers.ValidationError({"refresh": f"Invalid or expired token: {str(e)}"})

        # Remove old token from Redis whitelist
        SessionService.revoke_refresh_token(user_id, refresh_token)

        # Whitelist the newly generated rotated refresh token
        new_refresh = data.get('refresh')
        if new_refresh:
            SessionService.whitelist_refresh_token(user_id, new_refresh)

        return data
