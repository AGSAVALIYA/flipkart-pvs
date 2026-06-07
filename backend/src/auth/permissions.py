"""Scalable Role-Based Access Control (RBAC) definitions.

Enforces granular permissions mapped to high-level user roles. To add new
permissions or roles, update these enums and mappings.
"""

from __future__ import annotations

from enum import StrEnum


class Permission(StrEnum):
    """Granular permissions for specific API actions."""

    PRODUCTS_VIEW = "products:view"
    PRODUCTS_UPLOAD = "products:upload"

    VALIDATION_VERIFY = "validation:verify"
    VALIDATION_VIEW_LOGS = "validation:view_logs"

    REPORTS_VIEW = "reports:view"
    REPORTS_EXPORT = "reports:export"

    USERS_VIEW = "users:view"
    USERS_CREATE = "users:create"
    USERS_UPDATE = "users:update"
    USERS_DELETE = "users:delete"

    SYSTEM_ADMIN = "system:admin"


class Role(StrEnum):
    """User roles that group granular permissions."""

    SUPER_ADMIN = "super_admin"
    ADMIN = "admin"
    OPERATOR = "operator"
    VIEWER = "viewer"
    QA_MANAGER = "qa_manager"


# ──────────────────────────────────────────────────────────────────────
# Role to Permission mappings
# ──────────────────────────────────────────────────────────────────────
ROLE_PERMISSIONS: dict[Role, set[Permission]] = {
    Role.SUPER_ADMIN: set(Permission),
    Role.ADMIN: {
        Permission.PRODUCTS_VIEW,
        Permission.PRODUCTS_UPLOAD,
        Permission.VALIDATION_VERIFY,
        Permission.VALIDATION_VIEW_LOGS,
        Permission.REPORTS_VIEW,
        Permission.REPORTS_EXPORT,
        Permission.USERS_VIEW,
        Permission.USERS_CREATE,
        Permission.USERS_UPDATE,
        Permission.USERS_DELETE,
    },
    Role.OPERATOR: {
        Permission.PRODUCTS_VIEW,
        Permission.VALIDATION_VERIFY,
        Permission.VALIDATION_VIEW_LOGS,
    },
    Role.VIEWER: {
        Permission.PRODUCTS_VIEW,
        Permission.VALIDATION_VIEW_LOGS,
        Permission.REPORTS_VIEW,
    },
    Role.QA_MANAGER: {
        Permission.PRODUCTS_VIEW,
        Permission.VALIDATION_VIEW_LOGS,
        Permission.REPORTS_VIEW,
        Permission.REPORTS_EXPORT,
    },
}



def get_role_permissions(role: Role | str) -> set[Permission]:
    """Retrieve the set of granular permissions for a given role.

    Args:
        role: High-level role enum or string representation.

    Returns:
        A set of Permission enums.
    """
    try:
        r = Role(role)
        return ROLE_PERMISSIONS.get(r, set())
    except ValueError:
        return set()


def has_permission(role: Role | str, permission: Permission) -> bool:
    """Check if a user role is permitted to perform an action.

    Args:
        role: User role.
        permission: Specific permission to verify.

    Returns:
        True if the role possesses the permission, False otherwise.
    """
    return permission in get_role_permissions(role)
