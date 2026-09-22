from django.urls import path

from apps.accounts.user_views import UserDetailView, UserListCreateView, UserRoleView, UserWarehouseView

urlpatterns = [
    path("users/", UserListCreateView.as_view(), name="user-list"),
    path("users/<int:pk>/", UserDetailView.as_view(), name="user-detail"),
    path("users/<int:pk>/role/", UserRoleView.as_view(), name="user-role"),
    path("users/<int:pk>/warehouses/", UserWarehouseView.as_view(), name="user-warehouses"),
]
