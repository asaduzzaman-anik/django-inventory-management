from django.contrib.auth.models import Group
from django.shortcuts import get_object_or_404
from rest_framework import status
from rest_framework.exceptions import ValidationError
from rest_framework.generics import ListCreateAPIView, RetrieveUpdateAPIView
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.accounts.filters import UserFilter
from apps.accounts.models import User
from apps.accounts.roles import ROLE_NAMES, role_name
from apps.accounts.serializers import UserAdminSerializer, UserCreateSerializer, UserUpdateSerializer
from apps.audit.models import AuditLog
from apps.audit.services import log_audit
from apps.common.permissions import CanManageUsers

PROFILE_FIELDS = ("email", "first_name", "last_name", "phone", "is_active")


class UserListCreateView(ListCreateAPIView):
    permission_classes = [CanManageUsers]
    queryset = User.objects.prefetch_related("groups")
    filterset_class = UserFilter
    search_fields = ["username", "first_name", "last_name", "email"]
    ordering_fields = ["username", "email", "date_joined"]
    ordering = ["username"]

    def get_serializer_class(self):
        if self.request.method == "POST":
            return UserCreateSerializer
        return UserAdminSerializer

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        log_audit(
            user=request.user,
            action=AuditLog.Action.CREATE,
            instance=user,
            metadata={"role": role_name(user)},
            request=request,
        )
        return Response(UserAdminSerializer(user).data, status=status.HTTP_201_CREATED)


class UserDetailView(RetrieveUpdateAPIView):
    permission_classes = [CanManageUsers]
    queryset = User.objects.prefetch_related("groups")
    http_method_names = ["get", "patch", "head", "options"]

    def get_serializer_class(self):
        if self.request.method == "PATCH":
            return UserUpdateSerializer
        return UserAdminSerializer

    def update(self, request, *args, **kwargs):
        user = self.get_object()
        before = _profile_snapshot(user)
        serializer = self.get_serializer(user, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        user.refresh_from_db()
        changed = {
            field: getattr(user, field)
            for field in PROFILE_FIELDS
            if before[field] != getattr(user, field)
        }
        if changed:
            log_audit(
                user=request.user,
                action=AuditLog.Action.UPDATE,
                instance=user,
                metadata=changed,
                request=request,
            )
        return Response(UserAdminSerializer(user).data)


class UserRoleView(APIView):
    permission_classes = [CanManageUsers]

    def put(self, request, pk):
        user = get_object_or_404(User, pk=pk)
        role = request.data.get("role")
        if role not in ROLE_NAMES:
            raise ValidationError({"role": ["Select a valid role."]})

        previous = [{"id": group.id, "name": group.name} for group in user.groups.all()]
        group = Group.objects.get(name=role)
        user.groups.set([group])
        log_audit(
            user=request.user,
            action=AuditLog.Action.UPDATE,
            instance=user,
            metadata={"previous": previous, "current": {"id": group.id, "name": group.name}},
            request=request,
        )
        return Response(UserAdminSerializer(user).data)


def _profile_snapshot(user):
    return {field: getattr(user, field) for field in PROFILE_FIELDS}
