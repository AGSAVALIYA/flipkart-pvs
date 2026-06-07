import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React from "react";
import { clsx } from "clsx";
export const Button = React.forwardRef(({ className, variant = "primary", size = "md", isLoading, children, disabled, ...props }, ref) => {
    return (_jsxs("button", { ref: ref, disabled: disabled || isLoading, className: clsx("inline-flex items-center justify-center font-semibold rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 disabled:opacity-50 disabled:cursor-not-allowed", 
        // Style Variants
        {
            "bg-gradient-to-r from-indigo-600 to-indigo-500 text-white hover:from-indigo-500 hover:to-indigo-600 shadow-md hover:shadow-lg focus:ring-indigo-500": variant === "primary",
            "bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-100 hover:bg-slate-300 dark:hover:bg-slate-600": variant === "secondary",
            "border border-slate-300 dark:border-slate-600 bg-transparent text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800": variant === "outline",
            "bg-transparent text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800": variant === "ghost",
            "bg-rose-600 text-white hover:bg-rose-500 focus:ring-rose-500 shadow-md": variant === "danger",
        }, 
        // Sizing
        {
            "px-3 py-1.5 text-xs": size === "sm",
            "px-4 py-2 text-sm": size === "md",
            "px-5 py-3 text-base": size === "lg",
        }, className), ...props, children: [isLoading && (_jsxs("svg", { className: "animate-spin -ml-1 mr-2.5 h-4 w-4 text-current", xmlns: "http://www.w3.org/2000/svg", fill: "none", viewBox: "0 0 24 24", children: [_jsx("circle", { className: "opacity-25", cx: "12", cy: "12", r: "10", stroke: "currentColor", strokeWidth: "4" }), _jsx("path", { className: "opacity-75", fill: "currentColor", d: "M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" })] })), children] }));
});
Button.displayName = "Button";
