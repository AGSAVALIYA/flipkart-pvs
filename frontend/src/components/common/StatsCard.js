import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Card, CardContent } from "@/components/ui/Card";
import { clsx } from "clsx";
export const StatsCard = ({ label, value, icon: Icon, iconColor = "text-indigo-600 dark:text-indigo-400", iconBg = "bg-indigo-50 dark:bg-indigo-950/40", description, }) => {
    return (_jsx(Card, { hoverEffect: true, children: _jsxs(CardContent, { className: "flex items-center gap-4.5 p-5", children: [_jsx("div", { className: clsx("h-11 w-11 rounded-lg flex items-center justify-center flex-shrink-0 border border-slate-100 dark:border-slate-800", iconBg), children: _jsx(Icon, { className: clsx("h-5 w-5", iconColor) }) }), _jsxs("div", { className: "flex flex-col min-w-0", children: [_jsx("span", { className: "text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider", children: label }), _jsx("h3", { className: "text-xl font-black text-slate-800 dark:text-slate-100 tracking-tight mt-0.5", children: value }), description && (_jsx("span", { className: "text-[10px] text-slate-400 dark:text-slate-500 font-semibold tracking-wide mt-0.5 truncate", children: description }))] })] }) }));
};
export default StatsCard;
