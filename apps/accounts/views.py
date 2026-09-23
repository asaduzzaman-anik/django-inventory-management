from rest_framework import status
from rest_framework.exceptions import AuthenticationFailed, ValidationError
from rest_framework.generics import RetrieveUpdateAPIView
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.throttling import AnonRateThrottle, ScopedRateThrottle
from rest_framework.views import APIView
from rest_framework_simplejwt.exceptions import TokenError
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView

from apps.accounts.serializers import ChangePasswordSerializer, LoginSerializer, MeSerializer
from apps.audit.models import AuditLog
from apps.audit.services import log_audit


class LoginView(TokenObtainPairView):
    permission_classes = [AllowAny]
    serializer_class = LoginSerializer
    throttle_classes = [AnonRateThrottle, ScopedRateThrottle]
    throttle_scope = "login"

    def post(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        username = request.data.get("username", "")
        if not isinstance(username, str):
            username = ""
        try:
            serializer.is_valid(raise_exception=True)
        except AuthenticationFailed:
            log_audit(
                user=None,
                action=AuditLog.Action.LOGIN,
                entity_type="accounts.User",
                entity_repr=username[:255],
                metadata={"username": username[:150], "success": False},
                request=request,
            )
            raise
        log_audit(
            user=serializer.user,
            action=AuditLog.Action.LOGIN,
            instance=serializer.user,
            metadata={"username": serializer.user.username, "success": True},
            request=request,
        )
        return Response(serializer.validated_data, status=status.HTTP_200_OK)


class RefreshView(TokenRefreshView):
    permission_classes = [AllowAny]
    throttle_classes = [AnonRateThrottle, ScopedRateThrottle]
    throttle_scope = "refresh"


class LogoutView(APIView):
    def post(self, request):
        refresh = request.data.get("refresh")
        if not refresh:
            raise ValidationError({"refresh": ["This field is required."]})
        try:
            RefreshToken(refresh).blacklist()
        except TokenError as exc:
            raise AuthenticationFailed("Token is invalid or expired.") from exc
        log_audit(
            user=request.user,
            action=AuditLog.Action.LOGOUT,
            instance=request.user,
            request=request,
        )
        return Response(status=status.HTTP_204_NO_CONTENT)


class MeView(RetrieveUpdateAPIView):
    serializer_class = MeSerializer
    http_method_names = ["get", "patch", "head", "options"]

    def get_object(self):
        return self.request.user


class ChangePasswordView(APIView):
    def post(self, request):
        serializer = ChangePasswordSerializer(data=request.data, context={"request": request})
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(status=status.HTTP_204_NO_CONTENT)
