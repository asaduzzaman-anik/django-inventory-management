from django.urls import path

from apps.warehouses.views import WarehouseDetailView, WarehouseListCreateView

urlpatterns = [
    path("warehouses/", WarehouseListCreateView.as_view(), name="warehouse-list"),
    path("warehouses/<int:pk>/", WarehouseDetailView.as_view(), name="warehouse-detail"),
]
