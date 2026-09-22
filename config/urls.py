from django.conf import settings
from django.conf.urls.static import static
from django.contrib import admin
from django.urls import include, path
from drf_spectacular.views import SpectacularAPIView, SpectacularSwaggerView

urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/schema/", SpectacularAPIView.as_view(), name="schema"),
    path("api/docs/", SpectacularSwaggerView.as_view(url_name="schema"), name="swagger-ui"),
    path("api/v1/auth/", include("apps.accounts.urls")),
    path("api/v1/", include("apps.accounts.user_urls")),
    path("api/v1/", include("apps.audit.urls")),
    path("api/v1/", include("apps.catalog.urls")),
    path("api/v1/", include("apps.suppliers.urls")),
    path("api/v1/", include("apps.warehouses.urls")),
    path("api/v1/", include("apps.inventory.urls")),
    path("api/v1/", include("apps.purchasing.urls")),
    path("api/v1/", include("apps.common.urls")),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
