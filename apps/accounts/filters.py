import django_filters

from apps.accounts.models import User
from apps.accounts.roles import ROLE_NAMES


class UserFilter(django_filters.FilterSet):
    role = django_filters.ChoiceFilter(choices=[(name, name) for name in ROLE_NAMES], method="filter_role")

    class Meta:
        model = User
        fields = ["is_active", "role"]

    def filter_role(self, queryset, name, value):
        return queryset.filter(groups__name=value).distinct()
