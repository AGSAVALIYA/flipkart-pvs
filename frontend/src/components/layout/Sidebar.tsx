import React from "react";
import { NavLink } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useTheme } from "@/contexts/ThemeContext";
import { Permission } from "@/lib/permissions";
import { Badge } from "@/components/ui/Badge";
import {
  UploadCloud,
  QrCode,
  FileSpreadsheet,
  Users,
  LogOut,
  PackageCheck,
  Settings,
} from "lucide-react";
import { clsx } from "clsx";

interface SidebarProps {
  onClose?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ onClose }) => {
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

  return (
    <aside className="w-72 h-full flex flex-col justify-between transition-colors duration-200 bg-white text-slate-700 border-r border-slate-200">
      <div className="flex flex-col gap-6 p-6">
        {/* Brand Logo (40x40px container) */}
        <div className="flex items-center gap-3.5 select-none">
          <div className="h-10 w-10 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-md shadow-blue-600/20 flex-shrink-0">
            <PackageCheck className="h-5.5 w-5.5" />
          </div>
          <div>
            <h1 className="text-sm font-extrabold tracking-wide uppercase transition-colors text-slate-900">Flipkart PVS</h1>
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5 block">
              verification
            </span>
          </div>
        </div>

        {/* Navigation Items */}
        <nav className="flex flex-col gap-1.5 mt-2">
          {visibleItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              onClick={onClose}
              className={({ isActive }) =>
                clsx(
                  "flex items-center gap-3.5 px-4 py-3 rounded-xl text-sm font-semibold tracking-wide transition-all duration-200 select-none",
                  isActive
                    ? "bg-[#EFF6FF] text-[#2563EB] shadow-sm"
                    : "text-slate-500 hover:text-slate-900 hover:bg-slate-50"
                )
              }
            >
              <item.icon className="h-4.5 w-4.5 flex-shrink-0" />
              {item.label}
            </NavLink>
          ))}
        </nav>
      </div>

      {/* User Footer Profile switcher card */}
      <div className="p-4 transition-colors border-t border-slate-200 bg-slate-50/50">
        <div className="flex items-center justify-between p-3 rounded-xl border transition-all duration-200 bg-white border-slate-200 hover:border-slate-300">
          <div className="flex items-center gap-2.5 min-w-0">
            {/* 32px circular avatar */}
            <div className="h-8 w-8 rounded-full flex items-center justify-center font-extrabold uppercase transition-colors text-xs flex-shrink-0 bg-blue-50 border border-blue-100 text-blue-600">
              {user?.username?.substring(0, 2) || "OP"}
            </div>
            <div className="flex flex-col min-w-0">
              <span className="text-xs font-bold truncate tracking-wide transition-colors text-slate-700">
                {user?.username || "Operator"}
              </span>
              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">
                {role || "operator"}
              </span>
            </div>
          </div>
          
          {/* Settings / Logout action button */}
          <button
            onClick={logout}
            className="p-1.5 rounded-lg transition-colors flex-shrink-0 text-slate-500 hover:text-slate-800 hover:bg-slate-100"
            title="Logout"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </aside>
  );
};
export default Sidebar;
