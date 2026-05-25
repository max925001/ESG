# apps/users/services.py
import redis
from django.conf import settings
from rest_framework_simplejwt.tokens import RefreshToken
from apps.users.models import User
from apps.common.exceptions import AuthenticationFailedException, ConflictException
import logging

logger = logging.getLogger(__name__)

# Initialize Redis client for session tracking
if settings.REDIS_URL.startswith('rediss://'):
    import ssl
    redis_client = redis.from_url(settings.REDIS_URL, ssl_cert_reqs=ssl.CERT_NONE)
else:
    redis_client = redis.from_url(settings.REDIS_URL)


class SessionService:
    @staticmethod
    def whitelist_refresh_token(user_id: str, refresh_token: str) -> None:
        """
        Store refresh token JTI in Redis whitelist with TTL matching token lifetime.
        """
        try:
            token = RefreshToken(refresh_token)
            jti = token['jti']
            ttl = int(token['exp'] - token['iat'])
            redis_key = f"user_session:{user_id}:{jti}"
            redis_client.setex(redis_key, ttl, "active")
        except Exception as e:
            logger.error(f"Failed to whitelist refresh token in Redis: {str(e)}")

    @staticmethod
    def is_refresh_token_valid(user_id: str, refresh_token: str) -> bool:
        """
        Verify if the refresh token's JTI is whitelisted in Redis.
        """
        try:
            token = RefreshToken(refresh_token)
            jti = token['jti']
            redis_key = f"user_session:{user_id}:{jti}"
            return redis_client.exists(redis_key) > 0
        except Exception:
            return False

    @staticmethod
    def revoke_refresh_token(user_id: str, refresh_token: str) -> None:
        """
        Revoke specific refresh token by removing it from the Redis whitelist
        and blacklisting it in SimpleJWT.
        """
        try:
            token = RefreshToken(refresh_token)
            jti = token['jti']
            redis_key = f"user_session:{user_id}:{jti}"
            redis_client.delete(redis_key)
            # Blacklist in simplejwt
            token.blacklist()
        except Exception as e:
            logger.error(f"Failed to revoke refresh token: {str(e)}")

    @staticmethod
    def revoke_all_user_sessions(user_id: str) -> None:
        """
        Revoke all active sessions for a user by deleting all keys matching user pattern.
        """
        try:
            pattern = f"user_session:{user_id}:*"
            keys = redis_client.keys(pattern)
            if keys:
                redis_client.delete(*keys)
        except Exception as e:
            logger.error(f"Failed to revoke all user sessions: {str(e)}")


class AuthService:
    @staticmethod
    def register_user(email: str, password: str, first_name: str = "", last_name: str = "", role: str = User.ROLES.ANALYST) -> User:
        """
        Registers a new user in the platform.
        """
        if User.objects.filter(email=email).exists():
            raise ConflictException("A user with this email address already exists.")

        user = User.objects.create_user(
            email=email,
            password=password,
            first_name=first_name,
            last_name=last_name,
            role=role,
            is_verified=False  # default false, needs verification (can be simulated or set)
        )
        logger.info(f"Successfully registered new user: {email} with role {role}")
        return user

    @staticmethod
    def login_user(email: str, password: str) -> dict:
        """
        Authenticates a user and generates access/refresh tokens.
        Whitelists the refresh token in Redis.
        """
        try:
            user = User.objects.get(email=email)
        except User.DoesNotExist:
            raise AuthenticationFailedException("Invalid email or password.")

        if not user.is_active:
            raise AuthenticationFailedException("User account is deactivated.")

        if not user.check_password(password):
            raise AuthenticationFailedException("Invalid email or password.")

        # Generate tokens
        refresh = RefreshToken.for_user(user)
        access_token = str(refresh.access_token)
        refresh_token = str(refresh)

        # Store in Redis whitelist
        SessionService.whitelist_refresh_token(str(user.id), refresh_token)

        return {
            "access": access_token,
            "refresh": refresh_token,
            "user": {
                "id": str(user.id),
                "email": user.email,
                "role": user.role,
                "first_name": user.first_name,
                "last_name": user.last_name,
                "is_verified": user.is_verified
            }
        }
