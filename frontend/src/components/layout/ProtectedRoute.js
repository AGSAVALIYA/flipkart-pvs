import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { AlertTriangle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
export const ProtectedRoute = ({ requiredPermissions = [], }) => {
    const { isAuthenticated, isLoading, hasPermission } = useAuth();
    if (isLoading) {
        return (_jsx("div", { className: "flex h-screen w-screen items-center justify-center bg-slate-50 dark:bg-slate-950", children: _jsxs("div", { className: "animate-pulse flex flex-col items-center gap-3", children: [_jsx("div", { className: "h-10 w-10 rounded-full bg-indigo-500/20 border border-indigo-500 animate-spin border-t-transparent" }), _jsx("span", { className: "text-sm font-semibold text-slate-500 tracking-wider", children: "Syncing session..." })] }) }));
    }
    // Redirect to login if not authenticated
    if (!isAuthenticated) {
        return _jsx(Navigate, { to: "/login", replace: true });
    }
    // Verify permissions if any are required
    const isAuthorized = requiredPermissions.every((perm) => hasPermission(perm));
    if (!isAuthorized) {
        return (_jsx("div", { className: "flex min-h-[70vh] items-center justify-center p-6", children: _jsx(Card, { className: "max-w-md w-full border-rose-200 dark:border-rose-950 bg-rose-50/10", children: _jsxs(CardContent, { className: "flex flex-col items-center text-center p-6 gap-4", children: [_jsx("div", { className: "h-12 w-12 rounded-full bg-rose-100 dark:bg-rose-950/50 flex items-center justify-center text-rose-600 dark:text-rose-400", children: _jsx(AlertTriangle, { className: "h-6 w-6" }) }), _jsx("h2", { className: "text-lg font-bold text-slate-800 dark:text-slate-100", children: "Access Denied" }), _jsx("p", { className: "text-sm text-slate-500 dark:text-slate-400", children: "Your account role does not have permission to access this compliance module." }), _jsx(Button, { variant: "outline", size: "sm", onClick: () => {
                                window.history.back();
                            }, className: "mt-2", children: "Go Back" })] }) }) }));
    }
    return _jsx(Outlet, {});
};
