import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/Button";
export const EmptyState = ({ icon: Icon = AlertCircle, title = "No Data Found", description, actionLabel, onAction, }) => {
    return (_jsxs("div", { className: "flex flex-col items-center justify-center p-8 md:p-12 text-center rounded-xl border border-dashed border-slate-300 dark:border-slate-800 bg-white/30 dark:bg-slate-900/10", children: [_jsx("div", { className: "h-12 w-12 rounded-full bg-slate-100 dark:bg-slate-800/60 flex items-center justify-center text-slate-400 dark:text-slate-500 mb-4 border border-slate-200/40 dark:border-slate-800/40", children: _jsx(Icon, { className: "h-6 w-6" }) }), _jsx("h3", { className: "text-sm font-bold text-slate-700 dark:text-slate-200 tracking-wide mb-1", children: title }), _jsx("p", { className: "text-xs text-slate-400 dark:text-slate-500 max-w-xs leading-relaxed mb-4", children: description }), actionLabel && onAction && (_jsx(Button, { variant: "outline", size: "sm", onClick: onAction, children: actionLabel }))] }));
};
export default EmptyState;
