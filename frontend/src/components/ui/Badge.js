import { jsx as _jsx } from "react/jsx-runtime";
import { clsx } from "clsx";
export const Badge = ({ className, variant = "neutral", children, ...props }) => {
    return (_jsx("span", { className: clsx("inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold tracking-wide shadow-sm border border-transparent", {
            "bg-emerald-100/80 dark:bg-emerald-950/30 text-emerald-800 dark:text-emerald-300 border-emerald-200 dark:border-emerald-900/30": variant === "success",
            "bg-rose-100/80 dark:bg-rose-950/30 text-rose-800 dark:text-rose-300 border-rose-200 dark:border-rose-900/30": variant === "error",
            "bg-amber-100/80 dark:bg-amber-950/30 text-amber-800 dark:text-amber-300 border-amber-200 dark:border-amber-900/30": variant === "warning",
            "bg-cyan-100/80 dark:bg-cyan-950/30 text-cyan-800 dark:text-cyan-300 border-cyan-200 dark:border-cyan-900/30": variant === "info",
            "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700/50": variant === "neutral",
        }, className), ...props, children: children }));
};
