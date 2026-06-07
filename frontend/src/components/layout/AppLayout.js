import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from "react";
import { Outlet } from "react-router-dom";
import { Sidebar } from "./Sidebar";
import { Header } from "./Header";
export const AppLayout = () => {
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    return (_jsxs("div", { className: "flex h-screen w-screen bg-slate-50 dark:bg-slate-950 overflow-hidden font-sans", children: [_jsx("div", { className: "hidden md:block h-full", children: _jsx(Sidebar, {}) }), isMobileMenuOpen && (_jsxs("div", { className: "fixed inset-0 z-[100] flex md:hidden", children: [_jsx("div", { className: "fixed inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity", onClick: () => setIsMobileMenuOpen(false) }), _jsx("div", { className: "relative flex flex-col w-64 h-full animate-slide-right", children: _jsx(Sidebar, { onClose: () => setIsMobileMenuOpen(false) }) })] })), _jsxs("div", { className: "flex flex-col flex-1 h-full min-w-0 overflow-hidden", children: [_jsx(Header, { onMenuToggle: () => setIsMobileMenuOpen(true) }), _jsx("main", { className: "flex-1 overflow-y-auto bg-slate-50 dark:bg-slate-950/40 p-4 md:p-6", children: _jsx("div", { className: "max-w-7xl mx-auto w-full", children: _jsx(Outlet, {}) }) })] })] }));
};
export default AppLayout;
