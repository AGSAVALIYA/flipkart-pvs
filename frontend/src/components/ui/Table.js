import { jsx as _jsx } from "react/jsx-runtime";
import { clsx } from "clsx";
export const Table = ({ className, children, ...props }) => {
    return (_jsx("div", { className: "w-full overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-800", children: _jsx("table", { className: clsx("w-full text-left border-collapse text-sm text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-900", className), ...props, children: children }) }));
};
export const TableHeader = ({ className, children, ...props }) => (_jsx("thead", { className: clsx("bg-slate-50 dark:bg-slate-800/40 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800", className), ...props, children: children }));
export const TableBody = ({ className, children, ...props }) => (_jsx("tbody", { className: clsx("divide-y divide-slate-100 dark:divide-slate-800/50", className), ...props, children: children }));
export const TableRow = ({ className, children, ...props }) => (_jsx("tr", { className: clsx("hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition-colors duration-150", className), ...props, children: children }));
export const TableHead = ({ className, children, ...props }) => (_jsx("th", { className: clsx("px-5 py-3.5 font-bold text-left", className), ...props, children: children }));
export const TableCell = ({ className, children, ...props }) => (_jsx("td", { className: clsx("px-5 py-3.5 font-medium align-middle", className), ...props, children: children }));
