import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { clsx } from "clsx";
export const ProgressBar = ({ value, className, showText = false, label, }) => {
    const percent = Math.min(100, Math.max(0, value));
    return (_jsxs("div", { className: clsx("w-full flex flex-col gap-1.5", className), children: [_jsx("div", { className: "w-full h-2.5 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden border border-slate-300/10", children: _jsx("div", { className: "h-full bg-gradient-to-r from-indigo-600 via-indigo-500 to-cyan-500 transition-all duration-300 ease-out rounded-full", style: { width: `${percent}%` } }) }), showText && (_jsxs("div", { className: "flex items-center justify-between text-xs font-bold text-slate-500 tracking-wider", children: [_jsx("span", { children: label || "PROGRESS" }), _jsxs("span", { children: [percent.toFixed(0), "%"] })] }))] }));
};
