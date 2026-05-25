# apps/users/views.py
from rest_framework import status, views
from rest_framework.response import Response
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework_simplejwt.views import TokenRefreshView
from drf_spectacular.utils import extend_schema
from apps.users.serializers import (
    UserRegistrationSerializer, 
    UserLoginSerializer, 
    UserSerializer, 
    CustomTokenRefreshSerializer
)
from apps.users.services import AuthService, SessionService
import os
from django.conf import settings

def get_cookie_params():
    is_vercel = os.environ.get('VERCEL') == '1'
    if is_vercel or not settings.DEBUG:
        samesite = os.environ.get('COOKIE_SAMESITE', 'Lax')
        return samesite, True
    return 'Lax', False


class RegisterView(views.APIView):
    permission_classes = [AllowAny]

    @extend_schema(
        request=UserRegistrationSerializer,
        responses={201: UserSerializer},
        summary="Register a new ESG analyst or manager"
    )
    def post(self, request):
        serializer = UserRegistrationSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = AuthService.register_user(
            email=serializer.validated_data['email'],
            password=serializer.validated_data['password'],
            first_name=serializer.validated_data.get('first_name', ''),
            last_name=serializer.validated_data.get('last_name', ''),
            role=serializer.validated_data.get('role')
        )
        response_serializer = UserSerializer(user)
        return Response(
            {
                "success": True,
                "data": response_serializer.data
            },
            status=status.HTTP_201_CREATED
        )


class LoginView(views.APIView):
    permission_classes = [AllowAny]

    @extend_schema(
        request=UserLoginSerializer,
        responses={200: dict},
        summary="Authenticate user and obtain JWT tokens"
    )
    def post(self, request):
        serializer = UserLoginSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        login_data = AuthService.login_user(
            email=serializer.validated_data['email'],
            password=serializer.validated_data['password']
        )
        
        response = Response(
            {
                "success": True,
                "data": {
                    "access": login_data["access"],
                    "user": login_data["user"]
                }
            },
            status=status.HTTP_202_ACCEPTED
        )
        
        # Set refresh token in HttpOnly cookie (SameSite=None in prod for cross-site cookie sharing)
        samesite, secure = get_cookie_params()
        response.set_cookie(
            key='refresh_token',
            value=login_data["refresh"],
            httponly=True,
            secure=secure,
            samesite=samesite,
            path='/'
        )
        return response


class CustomTokenRefreshView(TokenRefreshView):
    serializer_class = CustomTokenRefreshSerializer

    @extend_schema(
        summary="Rotate JWT access and refresh tokens"
    )
    def post(self, request, *args, **kwargs):
        # Extract refresh token from cookie if not present in request body
        refresh_token = request.data.get('refresh') or request.COOKIES.get('refresh_token')
        
        # Build mutable request data for serializer
        data = request.data.copy() if hasattr(request.data, 'copy') else dict(request.data)
        if refresh_token:
            data['refresh'] = refresh_token
            
        serializer = self.get_serializer(data=data)
        try:
            serializer.is_valid(raise_exception=True)
        except Exception as e:
            from rest_framework.exceptions import ValidationError
            message = str(e)
            if isinstance(e, ValidationError) and 'refresh' in e.detail:
                message = e.detail['refresh'][0]
            return Response({
                "success": False,
                "error": {
                    "code": "AUTHENTICATION_FAILED",
                    "message": message,
                    "details": {}
                }
            }, status=status.HTTP_401_UNAUTHORIZED)
            
        res_data = serializer.validated_data
        
        response = Response(
            {
                "success": True,
                "data": {
                    "access": res_data.get("access")
                }
            },
            status=status.HTTP_200_OK
        )
        
        # Set new rotated refresh token in HttpOnly cookie (SameSite=None in prod for cross-site cookie sharing)
        new_refresh = res_data.get("refresh")
        if new_refresh:
            samesite, secure = get_cookie_params()
            response.set_cookie(
                key='refresh_token',
                value=new_refresh,
                httponly=True,
                secure=secure,
                samesite=samesite,
                path='/'
            )
            
        return response


class LogoutView(views.APIView):
    permission_classes = [IsAuthenticated]

    @extend_schema(
        request=dict(properties={"refresh": dict(type="string")}),
        responses={200: dict},
        summary="De-authenticate user and revoke tokens"
    )
    def post(self, request):
        refresh_token = request.data.get('refresh') or request.COOKIES.get('refresh_token')
        if not refresh_token:
            return Response(
                {
                    "success": False,
                    "error": {
                        "code": "BAD_REQUEST",
                        "message": "Refresh token is required.",
                        "details": {}
                    }
                },
                status=status.HTTP_400_BAD_REQUEST
            )
        
        user_id = str(request.user.id)
        SessionService.revoke_refresh_token(user_id, refresh_token)
        
        response = Response(
            {
                "success": True,
                "data": {"message": "Successfully logged out and session revoked."}
            },
            status=status.HTTP_200_OK
        )
        # Delete refresh token cookie (using SameSite=None in prod to match creation flags)
        samesite, secure = get_cookie_params()
        response.delete_cookie(
            'refresh_token',
            path='/',
            samesite=samesite,
            secure=secure
        )
        return response


class CurrentUserView(views.APIView):
    permission_classes = [IsAuthenticated]

    @extend_schema(
        responses={200: UserSerializer},
        summary="Retrieve profile details of currently authenticated user"
    )
    def get(self, request):
        serializer = UserSerializer(request.user)
        return Response(
            {
                "success": True,
                "data": serializer.data
            },
            status=status.HTTP_200_OK
        )
