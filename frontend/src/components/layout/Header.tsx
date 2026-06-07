import React from "react";
import { useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useTheme } from "@/contexts/ThemeContext";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getProductStats } from "@/api/products";
import { getReport } from "@/api/reports";
import { getUsers } from "@/api/auth";
import { subDays } from "date-fns";
import { toISODate } from "@/lib/formatters";
import { 
  Menu, 
  RefreshCw, 
  Upload, 
  Scan, 
  FileDown, 
  UserPlus, 
  Play
} from "lucide-react";
import { Button } from "@/components/ui/Button";

interface HeaderProps {
  onMenuToggle?: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onMenuToggle }) => {
  const location = useLocation();
  const { theme, toggleTheme } = useTheme();
  const queryClient = useQueryClient();

  // Queries to fetch live record numbers to display in header (shares cache with other pages)
  const { data: stats } = useQuery({
    queryKey: ["product-stats-header"],
    queryFn: getProductStats,
    enabled: location.pathname === "/upload",
    staleTime: 15000,
  });

  const { data: reportData } = useQuery({
    queryKey: ["report-compliance-header"],
    queryFn: () => getReport(
      toISODate(subDays(new Date(), 6)), 
      toISODate(new Date()), 
      { page: 1, page_size: 1 }
    ),
    enabled: location.pathname === "/reports" || location.pathname === "/operator",
    staleTime: 15000,
  });

  const { data: users } = useQuery({
    queryKey: ["users-list-header"],
    queryFn: getUsers,
    enabled: location.pathname === "/admin",
    staleTime: 15000,
  });

  // Dynamic config for header based on current pathname
  const getHeaderConfig = () => {
    switch (location.pathname) {
      case "/upload":
        return {
          title: "Data Ingestion Terminal",
          countLabel: stats ? `${stats.count.toLocaleString()} products` : "—",
          secondaryLabel: "Clear Ingest Logs",
          primaryLabel: "Ingest CSV",
          primaryIcon: Upload,
        };
      case "/operator":
        return {
          title: "Verification Terminal",
          countLabel: reportData?.summary ? `${reportData.summary.verified_count} checks today` : "—",
          secondaryLabel: "Reset Input",
          primaryLabel: "Scan Barcode",
          primaryIcon: Scan,
        };
      case "/reports":
        return {
          title: "QA Compliance Reports",
          countLabel: reportData?.summary ? `${reportData.summary.total_verifications} total audits` : "—",
          secondaryLabel: "",
          primaryLabel: "Export Report",
          primaryIcon: FileDown,
        };
      case "/admin":
        return {
          title: "User Management Portal",
          countLabel: users ? `${users.length} accounts` : "—",
          secondaryLabel: "Reload Table",
          primaryLabel: "Create User",
          primaryIcon: UserPlus,
        };
      default:
        return {
          title: "Flipkart Product Verification",
          countLabel: "Active",
          secondaryLabel: "Support",
          primaryLabel: "Action",
          primaryIcon: Play,
        };
    }
  };

  const config = getHeaderConfig();

  const handleSecondaryAction = () => {
    // Dispatch local events that pages can subscribe to
    window.dispatchEvent(new CustomEvent("header-secondary-click"));
  };

  const handlePrimaryAction = () => {
    window.dispatchEvent(new CustomEvent("header-primary-click"));
  };

  return (
    <header className="h-16 border-b border-slate-200 bg-white/80 backdrop-blur-md flex items-center justify-between px-6 z-30 sticky top-0 select-none">
      {/* Left Items (Page Title, Separator, Record Count) */}
      <div className="flex items-center gap-3">
        {onMenuToggle && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onMenuToggle}
            className="md:hidden p-1.5 hover:bg-slate-100 rounded-lg"
            aria-label="Toggle Navigation Menu"
          >
            <Menu className="h-5 w-5 text-slate-500" />
          </Button>
        )}
        
        <div className="flex items-center gap-3">
          <h2 className="text-base font-bold text-slate-800 tracking-tight">
            {config.title}
          </h2>
          
          {/* Vertical Separator */}
          <div className="h-4 w-px bg-slate-200" />
          
          {/* Record Count */}
          <span className="text-xs font-semibold text-slate-500 font-mono tracking-wide">
            {config.countLabel}
          </span>
        </div>
      </div>

      {/* Right Items (Outline & Primary Shadow Buttons) */}
      <div className="flex items-center gap-4">
        {/* Dynamic Button Group */}
        <div className="flex items-center gap-2">
          {config.secondaryLabel && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleSecondaryAction}
              className="text-xs font-semibold border-slate-200 hover:bg-slate-50 text-slate-600"
            >
              {config.secondaryLabel}
            </Button>
          )}
          
          <Button
            variant="primary"
            size="sm"
            onClick={handlePrimaryAction}
            className="text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-200 hover:shadow-lg hover:shadow-blue-300/30 gap-1.5 px-3 py-1.5"
          >
            {config.primaryIcon && <config.primaryIcon className="h-3.5 w-3.5" />}
            {config.primaryLabel}
          </Button>
        </div>
      </div>
    </header>
  );
};
export default Header;
