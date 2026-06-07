import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { createContext, useContext, useState, useCallback } from "react";
import { AlertCircle, CheckCircle, Info, X, XCircle } from "lucide-react";
import { clsx } from "clsx";
const ToastContext = createContext(undefined);
export const ToastProvider = ({ children }) => {
    const [toasts, setToasts] = useState([]);
    const dismiss = useCallback((id) => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
    }, []);
    const toast = useCallback((message, variant = "info", duration = 4000) => {
        const id = Math.random().toString(36).substring(2, 9);
        const newToast = { id, message, variant, duration };
        setToasts((prev) => [...prev, newToast]);
        if (duration > 0) {
            setTimeout(() => {
                dismiss(id);
            }, duration);
        }
    }, [dismiss]);
    return (_jsxs(ToastContext.Provider, { value: { toast, toasts, dismiss }, children: [children, _jsx("div", { className: "fixed bottom-5 right-5 z-[9999] flex flex-col gap-3 max-w-md w-full pointer-events-none", children: toasts.map((t) => (_jsx(ToastCard, { toast: t, onClose: () => dismiss(t.id) }, t.id))) })] }));
};
export function useToast() {
    const context = useContext(ToastContext);
    if (!context) {
        throw new Error("useToast must be used within a ToastProvider");
    }
    return context;
}
const ToastCard = ({ toast, onClose }) => {
    const { message, variant } = toast;
    return (_jsxs("div", { className: clsx("pointer-events-auto flex items-start gap-3.5 px-4 py-3.5 rounded-xl border shadow-xl animate-slide-up bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800/80 transition-all duration-300", {
            "border-l-4 border-l-emerald-500": variant === "success",
            "border-l-4 border-l-rose-500": variant === "error",
            "border-l-4 border-l-amber-500": variant === "warning",
            "border-l-4 border-l-cyan-500": variant === "info",
        }), children: [_jsxs("div", { className: "flex-shrink-0 mt-0.5", children: [variant === "success" && _jsx(CheckCircle, { className: "h-5 w-5 text-emerald-500" }), variant === "error" && _jsx(XCircle, { className: "h-5 w-5 text-rose-500" }), variant === "warning" && _jsx(AlertCircle, { className: "h-5 w-5 text-amber-500" }), variant === "info" && _jsx(Info, { className: "h-5 w-5 text-cyan-500" })] }), _jsx("div", { className: "flex-grow text-sm font-semibold text-slate-700 dark:text-slate-200 tracking-wide select-none", children: message }), _jsx("button", { onClick: onClose, className: "flex-shrink-0 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors", children: _jsx(X, { className: "h-4 w-4" }) })] }));
};
