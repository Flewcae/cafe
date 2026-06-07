from rest_framework.permissions import BasePermission
from django.core.exceptions import PermissionDenied
from strawberry.types import Info
from strawberry.permission import BasePermission
from .utils import get_user_from_request


class CanViewSomething(BasePermission):
    def has_permission(self, request, view):
        if not request.user.is_authenticated:
            raise PermissionDenied
        return True
    

class IsAuthenticated(BasePermission):
    message = "Kullanıcı doğrulanmadı"
    def has_permission(self, source, info: Info, **kwargs) -> bool:
        user = get_user_from_request(info.context["request"])
        return True if user else False
