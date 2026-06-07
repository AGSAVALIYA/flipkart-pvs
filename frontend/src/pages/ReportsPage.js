import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { getReport } from "@/api/reports";
import { PageHeader } from "@/components/common/PageHeader";
import { DateRangePicker } from "@/components/common/DateRangePicker";
import { StatsCard } from "@/components/common/StatsCard";
import { StatusBadge } from "@/components/common/StatusBadge";
import { Card, CardContent, CardHeader } from "@/components/ui/Card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/Table";
import { Button } from "@/components/ui/Button";
import { subDays } from "date-fns";
import { toISODate, formatDateTime, formatNumber } from "@/lib/formatters";
import { FileSpreadsheet, CheckCircle, XCircle, Clock, ChevronLeft, ChevronRight, FileDown } from "lucide-react";
export const ReportsPage = () => {
    // Default date window: last 7 days
    const [startDate, setStartDate] = useState(() => toISODate(subDays(new Date(), 6)));
    const [endDate, setEndDate] = useState(() => toISODate(new Date()));
    const [page, setPage] = useState(1);
    const pageSize = 15;
    // 1. Fetch Report data (contains summary stats + paginated logs list)
    const { data: reportData, isLoading, isPlaceholderData } = useQuery({
        queryKey: ["report-compliance", startDate, endDate, page],
        queryFn: () => getReport(startDate, endDate, { page, page_size: pageSize }),
        refetchInterval: 30000, // Sync stats every 30s
    });
    const handleDateChange = (start, end) => {
        setStartDate(start);
        setEndDate(end);
        setPage(1); // Reset page to 1 on date filter change
    };
    const summary = reportData?.summary;
    const logsPagination = reportData?.logs;
    return (_jsxs("div", { className: "flex flex-col gap-6 animate-fade-in select-none", children: [_jsxs("div", { className: "flex flex-col md:flex-row md:items-center md:justify-between gap-4", children: [_jsx(PageHeader, { title: "QA Audit Reports", subtitle: "Generate inventory compliance sheets and inspect physical check outcomes." }), _jsxs(Button, { variant: "outline", size: "sm", onClick: () => {
                            window.print(); // Easy browser print layout export fallback
                        }, className: "gap-2 self-start md:self-auto", children: [_jsx(FileDown, { className: "h-4 w-4" }), "Print / PDF"] })] }), _jsx(DateRangePicker, { startDate: startDate, endDate: endDate, onChange: handleDateChange }), _jsxs("div", { className: "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4", children: [_jsx(StatsCard, { label: "Total Checked", value: summary ? formatNumber(summary.total_verifications) : "—", icon: FileSpreadsheet, description: "Packages validated in date window" }), _jsx(StatsCard, { label: "Verified Success", value: summary ? formatNumber(summary.verified_count) : "—", icon: CheckCircle, iconColor: "text-emerald-600 dark:text-emerald-400", iconBg: "bg-emerald-50 dark:bg-emerald-950/40", description: "Matches physical package spec" }), _jsx(StatsCard, { label: "Mismatch Flags", value: summary ? formatNumber(summary.mismatch_count) : "—", icon: XCircle, iconColor: "text-rose-600 dark:text-rose-400", iconBg: "bg-rose-50 dark:bg-rose-950/40", description: "EAN or Date expiry discrepancies" }), _jsx(StatsCard, { label: "Pending Checks", value: summary ? formatNumber(summary.pending_count) : "—", icon: Clock, iconColor: "text-amber-600 dark:text-amber-400", iconBg: "bg-amber-50 dark:bg-amber-950/40", description: "Awating operator completion" })] }), _jsxs(Card, { children: [_jsx(CardHeader, { children: _jsx("h2", { className: "text-sm font-bold text-slate-800 dark:text-slate-100", children: "Compliance Logs audit trail" }) }), _jsxs(CardContent, { className: "p-0", children: [_jsxs(Table, { children: [_jsx(TableHeader, { children: _jsxs(TableRow, { children: [_jsx(TableHead, { children: "Check ID" }), _jsx(TableHead, { children: "WID" }), _jsx(TableHead, { children: "EAN" }), _jsx(TableHead, { children: "Verification Status" }), _jsx(TableHead, { children: "Checked By" }), _jsx(TableHead, { children: "Checked At" }), _jsx(TableHead, { children: "AI Result" })] }) }), _jsx(TableBody, { children: isLoading ? (Array.from({ length: 5 }).map((_, i) => (_jsx(TableRow, { children: Array.from({ length: 7 }).map((_, j) => (_jsx(TableCell, { children: _jsx("div", { className: "h-4 w-full bg-slate-100 dark:bg-slate-800 animate-pulse rounded" }) }, j))) }, i)))) : logsPagination && logsPagination.items.length > 0 ? (logsPagination.items.map((row) => (_jsxs(TableRow, { children: [_jsxs(TableCell, { className: "font-bold text-slate-400 text-xs", children: ["#", row.id] }), _jsx(TableCell, { className: "font-bold", children: row.wid }), _jsx(TableCell, { className: "font-semibold", children: row.ean }), _jsx(TableCell, { children: _jsx(StatusBadge, { status: row.validation_status }) }), _jsx(TableCell, { className: "text-xs font-semibold", children: row.verified_by }), _jsx(TableCell, { className: "text-xs text-slate-400 dark:text-slate-500", children: formatDateTime(row.verified_at) }), _jsx(TableCell, { children: row.ai_match_result ? (_jsx("span", { className: `text-xs font-bold ${row.ai_match_result === "MATCH" ? "text-emerald-500" : "text-rose-500"}`, children: row.ai_match_result })) : (_jsx("span", { className: "text-xs text-slate-400 select-none", children: "\u2014" })) })] }, row.id)))) : (_jsx(TableRow, { children: _jsx(TableCell, { colSpan: 7, className: "text-center py-10", children: _jsxs("div", { className: "flex flex-col items-center gap-2 text-slate-400", children: [_jsx(FileSpreadsheet, { className: "h-8 w-8" }), _jsx("span", { className: "text-xs font-bold", children: "No Audit Log records found for selected dates." })] }) }) })) })] }), logsPagination && logsPagination.total_pages > 1 && (_jsxs("div", { className: "flex items-center justify-between px-5 py-4 border-t border-slate-100 dark:border-slate-800/60 select-none", children: [_jsxs("span", { className: "text-xs font-semibold text-slate-400", children: ["Showing page ", page, " of ", logsPagination.total_pages, " (", formatNumber(logsPagination.total), " total checks)"] }), _jsxs("div", { className: "flex items-center gap-2", children: [_jsx(Button, { variant: "outline", size: "sm", disabled: page <= 1, onClick: () => setPage((p) => Math.max(1, p - 1)), className: "p-1.5", children: _jsx(ChevronLeft, { className: "h-4 w-4" }) }), _jsx(Button, { variant: "outline", size: "sm", disabled: page >= logsPagination.total_pages, onClick: () => setPage((p) => Math.min(logsPagination.total_pages, p + 1)), className: "p-1.5", children: _jsx(ChevronRight, { className: "h-4 w-4" }) })] })] }))] })] })] }));
};
export default ReportsPage;
