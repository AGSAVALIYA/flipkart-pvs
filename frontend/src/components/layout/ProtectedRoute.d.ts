import React from "react";
import { Permission } from "@/lib/permissions";
interface ProtectedRouteProps {
    requiredPermissions?: Permission[];
}
export declare const ProtectedRoute: React.FC<ProtectedRouteProps>;
export {};
