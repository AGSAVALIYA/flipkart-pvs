import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect } from "react";
import { X } from "lucide-react";
import { clsx } from "clsx";
export const Dialog = ({ isOpen, onClose, title, children, className, }) => {
    // Prevent background scroll when dialog is active
    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = "hidden";
        }
        else {
            document.body.style.overflow = "unset";
        }
        return () => {
            document.body.style.overflow = "unset";
        };
    }, [isOpen]);
    if (!isOpen)
        return null;
    return (_jsxs("div", { className: "fixed inset-0 z-[999] flex items-center justify-center p-4", children: [_jsx("div", { className: "fixed inset-0 bg-slate-900/60 dark:bg-slate-950/80 backdrop-blur-sm animate-fade-in", onClick: onClose }), _jsxs("div", { className: clsx("relative w-full max-w-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-2xl p-5 z-10 flex flex-col gap-4 animate-scale-in max-h-[90vh] overflow-y-auto", className), children: [(title || typeof onClose === "function") && (_jsxs("div", { className: "flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800/60", children: [title && (_jsx("h3", { className: "text-base font-bold text-slate-800 dark:text-slate-100 tracking-wide", children: title })), onClose && (_jsx("button", { onClick: onClose, className: "text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg", children: _jsx(X, { className: "h-4 w-4" }) }))] })), _jsx("div", { className: "flex-grow", children: children })] })] }));
};
