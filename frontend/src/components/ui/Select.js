import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React from "react";
import { clsx } from "clsx";
export const Select = React.forwardRef(({ className, label, error, helperText, options, id, ...props }, ref) => {
    const selectId = id ?? label?.toLowerCase().replace(/\s+/g, "-");
    return (_jsxs("div", { className: "flex flex-col w-full gap-1.5", children: [label && (_jsx("label", { htmlFor: selectId, className: "text-xs font-semibold text-slate-700 dark:text-slate-200 tracking-wide", children: label })), _jsx("select", { id: selectId, ref: ref, className: clsx("w-full rounded-lg border text-sm font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 px-4 py-2.5", error
                    ? "border-rose-500 focus:ring-rose-500/30 focus:border-rose-500"
                    : "border-slate-300 dark:border-slate-700 hover:border-slate-400 dark:hover:border-slate-600", className), ...props, children: options.map((opt) => (_jsx("option", { value: opt.value, children: opt.label }, opt.value))) }), error && (_jsx("span", { className: "text-xs font-medium text-rose-500 tracking-wide", children: error })), !error && helperText && (_jsx("span", { className: "text-xs text-slate-400 dark:text-slate-500", children: helperText }))] }));
});
Select.displayName = "Select";
