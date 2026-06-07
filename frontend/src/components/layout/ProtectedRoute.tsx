import React from "react";
import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Permission } from "@/lib/permissions";
import { AlertTriangle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";

interface ProtectedRouteProps {
  requiredPermissions?: Permission[];
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  requiredPermissions = [],
}) => {
  const { isAuthenticated, isLoading, hasPermission } = useAuth();

  if (isLoading) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-slate-50 dark:bg-slate-950">
        <div className="animate-pulse flex flex-col items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-indigo-500/20 border border-indigo-500 animate-spin border-t-transparent" />
          <span className="text-sm font-semibold text-slate-500 tracking-wider">Syncing session...</span>
        </div>
      </div>
    );
  }

  // Redirect to login if not authenticated
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // Verify permissions if any are required
  const isAuthorized = requiredPermissions.every((perm) => hasPermission(perm));

  if (!isAuthorized) {
    return (
      <div className="flex min-h-[70vh] items-center justify-center p-6">
        <Card className="max-w-md w-full border-rose-200 dark:border-rose-950 bg-rose-50/10">
          <CardContent className="flex flex-col items-center text-center p-6 gap-4">
            <div className="h-12 w-12 rounded-full bg-rose-100 dark:bg-rose-950/50 flex items-center justify-center text-rose-600 dark:text-rose-400">
              <AlertTriangle className="h-6 w-6" />
            </div>
            <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100">Access Denied</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Your account role does not have permission to access this compliance module.
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                window.history.back();
              }}
              className="mt-2"
            >
              Go Back
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return <Outlet />;
};
