import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React from "react";
import { clsx } from "clsx";
export const Input = React.forwardRef(({ className, type = "text", label, error, helperText, icon, id, ...props }, ref) => {
    const inputId = id ?? label?.toLowerCase().replace(/\s+/g, "-");
    return (_jsxs("div", { className: "flex flex-col w-full gap-1.5", children: [label && (_jsx("label", { htmlFor: inputId, className: "text-xs font-semibold text-slate-700 dark:text-slate-200 tracking-wide", children: label })), _jsxs("div", { className: "relative flex items-center", children: [icon && (_jsx("div", { className: "absolute left-3.5 text-slate-400 dark:text-slate-500", children: icon })), _jsx("input", { id: inputId, type: type, ref: ref, className: clsx("w-full rounded-lg border text-sm font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100", icon ? "pl-10 pr-4 py-2.5" : "px-4 py-2.5", error
                            ? "border-rose-500 focus:ring-rose-500/30 focus:border-rose-500"
                            : "border-slate-300 dark:border-slate-700 hover:border-slate-400 dark:hover:border-slate-600"), ...props })] }), error && (_jsx("span", { className: "text-xs font-medium text-rose-500 tracking-wide animate-fade-in", children: error })), !error && helperText && (_jsx("span", { className: "text-xs text-slate-400 dark:text-slate-500", children: helperText }))] }));
});
Input.displayName = "Input";
