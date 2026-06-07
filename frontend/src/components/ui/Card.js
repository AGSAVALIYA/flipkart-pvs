import { jsx as _jsx } from "react/jsx-runtime";
import { clsx } from "clsx";
export const Card = ({ className, glass = false, hoverEffect = false, children, ...props }) => {
    return (_jsx("div", { className: clsx("rounded-xl border transition-all duration-200 overflow-hidden", {
            "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-md": !glass,
            "bg-white/70 dark:bg-slate-900/60 backdrop-blur-md border-white/20 dark:border-slate-800/30 shadow-glass": glass,
            "hover:shadow-lg hover:-translate-y-0.5": hoverEffect,
        }, className), ...props, children: children }));
};
export const CardHeader = ({ className, children, ...props }) => (_jsx("div", { className: clsx("px-5 py-4 border-b border-slate-100 dark:border-slate-800/50 flex items-center justify-between gap-4 bg-slate-50/50 dark:bg-slate-900/30", className), ...props, children: children }));
export const CardContent = ({ className, children, ...props }) => (_jsx("div", { className: clsx("p-5", className), ...props, children: children }));
export const CardFooter = ({ className, children, ...props }) => (_jsx("div", { className: clsx("px-5 py-3 border-t border-slate-100 dark:border-slate-800/50 bg-slate-50/30 dark:bg-slate-900/10 flex items-center justify-end gap-3", className), ...props, children: children }));
