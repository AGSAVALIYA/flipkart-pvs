import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { NavLink } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Permission } from "@/lib/permissions";
import { Badge } from "@/components/ui/Badge";
import { UploadCloud, QrCode, FileSpreadsheet, Users, LogOut, PackageCheck, } from "lucide-react";
import { clsx } from "clsx";
export const Sidebar = ({ onClose }) => {
    const { user, logout, hasPermission, role } = useAuth();
    const menuItems = [
        {
            label: "Data Ingestion",
            path: "/upload",
            icon: UploadCloud,
            permission: Permission.PRODUCTS_UPLOAD,
        },
        {
            label: "Operator Terminal",
            path: "/operator",
            icon: QrCode,
            permission: Permission.VALIDATION_VERIFY,
        },
        {
            label: "Audit Reports",
            path: "/reports",
            icon: FileSpreadsheet,
            permission: Permission.REPORTS_VIEW,
        },
        {
            label: "User Management",
            path: "/admin",
            icon: Users,
            permission: Permission.USERS_VIEW,
        },
    ];
    // Filter menu items by user permissions
    const visibleItems = menuItems.filter((item) => hasPermission(item.permission));
    return (_jsxs("aside", { className: "w-64 h-full bg-slate-900 text-slate-100 flex flex-col justify-between border-r border-slate-800 shadow-xl", children: [_jsxs("div", { className: "flex flex-col gap-6 p-5", children: [_jsxs("div", { className: "flex items-center gap-3", children: [_jsx("div", { className: "h-9 w-9 rounded-lg bg-indigo-600 flex items-center justify-center text-white shadow-lg shadow-indigo-600/30", children: _jsx(PackageCheck, { className: "h-5 w-5" }) }), _jsxs("div", { children: [_jsx("h1", { className: "text-sm font-extrabold tracking-wide text-white uppercase", children: "Flipkart PVS" }), _jsx("span", { className: "text-[10px] text-slate-500 tracking-wider", children: "Product Verification" })] })] }), _jsx("nav", { className: "flex flex-col gap-1.5 mt-2", children: visibleItems.map((item) => (_jsxs(NavLink, { to: item.path, onClick: onClose, className: ({ isActive }) => clsx("flex items-center gap-3.5 px-4 py-3 rounded-lg text-sm font-semibold tracking-wide transition-all duration-150 select-none", isActive
                                ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/20"
                                : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60"), children: [_jsx(item.icon, { className: "h-4.5 w-4.5 flex-shrink-0" }), item.label] }, item.path))) })] }), _jsxs("div", { className: "p-4 border-t border-slate-800 bg-slate-950/40 flex flex-col gap-3.5", children: [_jsxs("div", { className: "flex items-center gap-3", children: [_jsx("div", { className: "h-9 w-9 rounded-full bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center font-bold text-indigo-400 uppercase", children: user?.username?.substring(0, 2) || "OP" }), _jsxs("div", { className: "flex flex-col min-w-0", children: [_jsx("span", { className: "text-xs font-bold truncate text-slate-200 tracking-wide", children: user?.username || "Operator" }), _jsx("span", { className: "mt-0.5 self-start", children: _jsx(Badge, { variant: "info", className: "px-1.5 py-0.25 text-[9px] uppercase", children: role || "operator" }) })] })] }), _jsxs("button", { onClick: logout, className: "flex items-center justify-center gap-2.5 px-4 py-2.5 rounded-lg text-xs font-bold tracking-wide text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 transition-colors w-full border border-rose-500/15", children: [_jsx(LogOut, { className: "h-4 w-4" }), "Logout"] })] })] }));
};
