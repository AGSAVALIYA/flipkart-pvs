import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
export const PageHeader = ({ title, subtitle, action, }) => {
    return (_jsxs("div", { className: "flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-5 border-b border-slate-200/50 dark:border-slate-800/50 mb-6 select-none", children: [_jsxs("div", { className: "flex flex-col", children: [_jsx("h1", { className: "text-xl font-black text-slate-800 dark:text-slate-100 tracking-tight", children: title }), subtitle && (_jsx("p", { className: "text-xs font-semibold text-slate-400 dark:text-slate-500 mt-1", children: subtitle }))] }), action && _jsx("div", { className: "flex items-center gap-3", children: action })] }));
};
