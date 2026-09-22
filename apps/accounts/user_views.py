from django.contrib.auth.models import Group
from django.db import transaction
from django.shortcuts import get_object_or_404
from rest_framework import status
from rest_framework.exceptions import ValidationError
from rest_framework.generics import ListCreateAPIView, RetrieveUpdateAPIView
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.accounts.filters import UserFilter
from apps.accounts.models import User, UserWarehouse
from apps.accounts.roles import ROLE_NAMES, role_name
from apps.accounts.serializers import UserAdminSerializer, UserCreateSerializer, UserUpdateSerializer
from apps.audit.models import AuditLog
from apps.audit.services import log_audit
from apps.common.permissions import CanManageUsers
from apps.warehouses.models import Warehouse

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


class UserWarehouseView(APIView):
    permission_classes = [CanManageUsers]

    def get(self, request, pk):
        user = get_object_or_404(User, pk=pk)
        return Response({"warehouses": _warehouse_rows(user)})

    def put(self, request, pk):
        user = get_object_or_404(User, pk=pk)
        raw_ids = request.data.get("warehouses")
        if not isinstance(raw_ids, list):
            raise ValidationError({"warehouses": ["Provide a list of warehouse ids."]})
        try:
            warehouse_ids = [int(value) for value in raw_ids]
        except (TypeError, ValueError) as exc:
            raise ValidationError({"warehouses": ["Warehouse ids must be integers."]}) from exc

        unique_ids = list(dict.fromkeys(warehouse_ids))
        warehouses = list(Warehouse.objects.filter(pk__in=unique_ids))
        if len(warehouses) != len(unique_ids):
            raise ValidationError({"warehouses": ["One or more warehouses do not exist."]})

        previous = sorted(
            UserWarehouse.objects.filter(user=user).values_list("warehouse_id", flat=True)
        )
        with transaction.atomic():
            UserWarehouse.objects.filter(user=user).delete()
            UserWarehouse.objects.bulk_create(
                [UserWarehouse(user=user, warehouse=warehouse) for warehouse in warehouses]
            )
        log_audit(
            user=request.user,
            action=AuditLog.Action.UPDATE,
            instance=user,
            metadata={"previous": previous, "current": sorted(unique_ids)},
            request=request,
        )
        return Response({"warehouses": _warehouse_rows(user)})


def _warehouse_rows(user):
    assignments = UserWarehouse.objects.filter(user=user).select_related("warehouse").order_by("warehouse__code")
    return [
        {"id": row.warehouse_id, "code": row.warehouse.code, "name": row.warehouse.name}
        for row in assignments
    ]


def _profile_snapshot(user):
    return {field: getattr(user, field) for field in PROFILE_FIELDS}
