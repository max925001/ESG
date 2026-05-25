# apps/users/permissions.py
from rest_framework.permissions import BasePermission
from apps.users.models import User


class IsESGAnalyst(BasePermission):
    """
    Allows access only to ESG Analysts, Managers, or Admins.
    """
    def has_permission(self, request, view):
        return (
            request.user and 
            request.user.is_authenticated and 
            request.user.role in [User.ROLES.ANALYST, User.ROLES.MANAGER, User.ROLES.ADMIN]
        )


class IsESGManager(BasePermission):
    """
    Allows access only to ESG Managers or Admins.
    """
    def has_permission(self, request, view):
        return (
            request.user and 
            request.user.is_authenticated and 
            request.user.role in [User.ROLES.MANAGER, User.ROLES.ADMIN]
        )


class IsSystemAdmin(BasePermission):
    """
    Allows access only to System Administrators.
    """
    def has_permission(self, request, view):
        return (
            request.user and 
            request.user.is_authenticated and 
            request.user.role == User.ROLES.ADMIN
        )
