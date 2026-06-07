import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useTheme } from "@/hooks/useTheme";
import { Menu, SunMoon, Moon } from "lucide-react";
import { Button } from "@/components/ui/Button";
export const Header = ({ onMenuToggle }) => {
    const { user } = useAuth();
    const location = useLocation();
    const { theme, toggleTheme } = useTheme();
    // Dynamic Page Titles based on Routing Path
    const getPageTitle = () => {
        switch (location.pathname) {
            case "/upload":
                return "Inventory Sheet Ingestion";
            case "/operator":
                return "Verification Terminal";
            case "/reports":
                return "QA Compliance Reports";
            case "/admin":
                return "User Management Portal";
            default:
                return "Flipkart Product Verification System";
        }
    };
    return (_jsxs("header", { className: "h-16 border-b border-slate-200 dark:border-slate-800 bg-white/70 dark:bg-slate-900/70 backdrop-blur-md flex items-center justify-between px-6 z-30 sticky top-0 shadow-sm", children: [_jsxs("div", { className: "flex items-center gap-3", children: [onMenuToggle && (_jsx(Button, { variant: "ghost", size: "sm", onClick: onMenuToggle, className: "md:hidden p-1.5", "aria-label": "Toggle Navigation Menu", children: _jsx(Menu, { className: "h-5 w-5 text-slate-500" }) })), _jsxs("div", { className: "flex flex-col", children: [_jsx("h2", { className: "text-sm font-extrabold text-slate-800 dark:text-slate-100 tracking-wide", children: getPageTitle() }), _jsx("span", { className: "text-[10px] text-slate-400 dark:text-slate-500 font-medium select-none tracking-wider", children: "SYSTEM AUDITING \u00B7 ACTIVE" })] })] }), _jsxs("div", { className: "flex items-center gap-4", children: [_jsx("button", { onClick: toggleTheme, className: "text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300 p-1.5 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500/50", "aria-label": "Toggle Dark Mode", children: theme === 'dark' ? (_jsx(Moon, { className: "h-4.5 w-4.5" })) : (_jsx(SunMoon, { className: "h-4.5 w-4.5" })) }), _jsx("div", { className: "hidden sm:flex items-center gap-3", children: _jsxs("div", { className: "flex flex-col items-end", children: [_jsx("span", { className: "text-xs font-bold text-slate-700 dark:text-slate-200", children: user?.username }), _jsx("span", { className: "text-[9px] font-bold text-indigo-500 uppercase tracking-widest", children: user?.role })] }) })] })] }));
};
