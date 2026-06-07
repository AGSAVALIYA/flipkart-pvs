/* ===== Enums ===== */
export var Role;
(function (Role) {
    Role["SUPER_ADMIN"] = "super_admin";
    Role["ADMIN"] = "admin";
    Role["OPERATOR"] = "operator";
    Role["VIEWER"] = "viewer";
})(Role || (Role = {}));
export var Permission;
(function (Permission) {
    Permission["PRODUCTS_VIEW"] = "products:view";
    Permission["PRODUCTS_UPLOAD"] = "products:upload";
    Permission["VALIDATION_VERIFY"] = "validation:verify";
    Permission["VALIDATION_VIEW_LOGS"] = "validation:view_logs";
    Permission["REPORTS_VIEW"] = "reports:view";
    Permission["REPORTS_EXPORT"] = "reports:export";
    Permission["USERS_VIEW"] = "users:view";
    Permission["USERS_CREATE"] = "users:create";
    Permission["USERS_UPDATE"] = "users:update";
    Permission["USERS_DELETE"] = "users:delete";
    Permission["SYSTEM_ADMIN"] = "system:admin";
})(Permission || (Permission = {}));
export var ValidationStatus;
(function (ValidationStatus) {
    ValidationStatus["VERIFIED"] = "VERIFIED";
    ValidationStatus["MISMATCH"] = "MISMATCH";
    ValidationStatus["PENDING"] = "PENDING";
})(ValidationStatus || (ValidationStatus = {}));
