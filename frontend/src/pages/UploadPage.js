import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { uploadCSV, getIngestionStatus, getRecentJobs, getProductStats } from "@/api/products";
import { useUploadStore } from "@/stores/uploadStore";
import { useToast } from "@/components/ui/Toast";
import { PageHeader } from "@/components/common/PageHeader";
import { FileDropzone } from "@/components/common/FileDropzone";
import { ProgressBar } from "@/components/common/ProgressBar";
import { StatsCard } from "@/components/common/StatsCard";
import { Card, CardContent, CardHeader } from "@/components/ui/Card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/Table";
import { Badge } from "@/components/ui/Badge";
import { getErrorMessage } from "@/api/client";
import { formatDateTime, formatNumber } from "@/lib/formatters";
import { Database, Upload, CheckCircle, AlertTriangle, RefreshCw } from "lucide-react";
export const UploadPage = () => {
    const queryClient = useQueryClient();
    const { toast } = useToast();
    const { currentJobId, status: uploadStatus, progress: uploadProgress, filename: uploadingFilename, startUpload, setUploading, updateProgress, completeUpload, failUpload, reset: resetUploadStore, } = useUploadStore();
    const [pollingActive, setPollingActive] = useState(false);
    // 1. Fetch DB Stats
    const { data: stats } = useQuery({
        queryKey: ["product-stats"],
        queryFn: getProductStats,
        refetchInterval: 10000,
    });
    // 2. Fetch Recent Upload Jobs
    const { data: recentJobs, isLoading: isLoadingRecent } = useQuery({
        queryKey: ["recent-jobs"],
        queryFn: getRecentJobs,
        refetchInterval: pollingActive ? 2000 : 15000, // Speed up polling when active
    });
    // 3. Poll Ingestion Progress using React Query
    const { data: pollData } = useQuery({
        queryKey: ["job-status", currentJobId],
        queryFn: () => getIngestionStatus(currentJobId),
        enabled: !!currentJobId && pollingActive,
        refetchInterval: (query) => {
            const state = query.state.data;
            if (state && (state.job.status === "completed" || state.job.status === "failed")) {
                setPollingActive(false);
                return false;
            }
            return 2000; // poll every 2s
        },
    });
    // Sync poll status updates to Zustand store
    useEffect(() => {
        if (pollData) {
            const jobStatus = pollData.job.status;
            const progress = pollData.progress_percentage;
            updateProgress(progress, jobStatus);
            if (jobStatus === "completed") {
                completeUpload();
                toast(`CSV ingestion completed! Loaded ${formatNumber(pollData.job.processed_rows)} rows.`, "success");
                queryClient.invalidateQueries({ queryKey: ["product-stats"] });
                queryClient.invalidateQueries({ queryKey: ["recent-jobs"] });
            }
            else if (jobStatus === "failed") {
                failUpload(pollData.job.error_message || "Ingestion fatal error.");
                toast(pollData.job.error_message || "Ingestion failed.", "error");
                queryClient.invalidateQueries({ queryKey: ["recent-jobs"] });
            }
        }
    }, [pollData, updateProgress, completeUpload, failUpload, toast, queryClient]);
    // 4. File Upload Mutation
    const uploadMutation = useMutation({
        onMutate: async (file) => {
            setUploading(file.name, 0);
        },
        mutationFn: (file) => uploadCSV(file, (progress) => {
            setUploading(file.name, progress);
        }),
        onSuccess: (data, file) => {
            startUpload(file.name, data.job_id);
            setPollingActive(true);
            toast("CSV sheet uploaded. Processing bulk ingestion...", "info");
            queryClient.invalidateQueries({ queryKey: ["recent-jobs"] });
        },
        onError: (err) => {
            const msg = getErrorMessage(err);
            failUpload(msg);
            toast(msg, "error");
        },
    });
    const handleFileSelect = (file) => {
        uploadMutation.mutate(file);
    };
    const getJobStatusBadge = (status) => {
        switch (status) {
            case "completed":
                return _jsx(Badge, { variant: "success", children: "Completed" });
            case "failed":
                return _jsx(Badge, { variant: "error", children: "Failed" });
            case "processing":
                return _jsx(Badge, { variant: "info", className: "animate-pulse", children: "Processing" });
            case "uploading":
                return _jsx(Badge, { variant: "info", className: "animate-pulse", children: "Uploading" });
            case "pending":
            default:
                return _jsx(Badge, { variant: "warning", children: "Pending" });
        }
    };
    return (_jsxs("div", { className: "flex flex-col gap-6 animate-fade-in select-none", children: [_jsx(PageHeader, { title: "Inventory Data Ingestion", subtitle: "Upload barcode and expiry spreadsheets to load inventory records." }), _jsxs("div", { className: "grid grid-cols-1 md:grid-cols-3 gap-4", children: [_jsx(StatsCard, { label: "Total Products Loaded", value: stats ? formatNumber(stats.count) : "—", icon: Database, description: "Total active references in system" }), _jsx(StatsCard, { label: "Ingestion Runs", value: recentJobs ? recentJobs.length : "—", icon: RefreshCw, description: "Total uploaded spreadsheets logged" }), _jsx(StatsCard, { label: "Last Action", value: recentJobs && recentJobs[0] ? getJobStatusBadge(recentJobs[0].status).props.children : "Idle", icon: CheckCircle, description: recentJobs && recentJobs[0] ? formatDateTime(recentJobs[0].created_at) : "No runs recorded" })] }), _jsxs("div", { className: "grid grid-cols-1 lg:grid-cols-12 gap-6 items-start", children: [_jsx("div", { className: "lg:col-span-5 flex flex-col gap-6", children: _jsxs(Card, { children: [_jsx(CardHeader, { children: _jsxs("h2", { className: "text-sm font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2", children: [_jsx(Upload, { className: "h-4 w-4 text-indigo-500" }), "Upload Spreadsheet"] }) }), _jsxs(CardContent, { className: "flex flex-col gap-5", children: [_jsx(FileDropzone, { onFileSelect: handleFileSelect, isLoading: uploadMutation.isPending || uploadStatus === "processing" || uploadStatus === "pending" || uploadStatus === "uploading" }), uploadStatus !== "idle" && (_jsxs("div", { className: "border border-slate-100 dark:border-slate-800 rounded-xl p-4 bg-slate-50/50 dark:bg-slate-900/40 flex flex-col gap-3.5 animate-fade-in", children: [_jsxs("div", { className: "flex items-center justify-between text-xs font-semibold text-slate-600 dark:text-slate-300", children: [_jsx("span", { className: "truncate max-w-xs", children: uploadingFilename }), _jsx("span", { children: getJobStatusBadge(uploadStatus) })] }), _jsx(ProgressBar, { value: uploadProgress, showText: true, label: uploadStatus === "uploading" ? "UPLOADING" : "PROCESSING" }), pollData?.job && (_jsxs("div", { className: "grid grid-cols-2 gap-4 mt-1 border-t border-slate-100 dark:border-slate-800/60 pt-3 text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider", children: [_jsxs("div", { className: "flex flex-col", children: [_jsx("span", { children: "Rows Processed" }), _jsx("span", { className: "text-sm font-black text-slate-700 dark:text-slate-300 mt-0.5", children: formatNumber(pollData.job.processed_rows) })] }), _jsxs("div", { className: "flex flex-col", children: [_jsx("span", { children: "Errors Flagged" }), _jsx("span", { className: `text-sm font-black mt-0.5 ${pollData.job.error_count > 0 ? "text-rose-500" : "text-slate-700 dark:text-slate-300"}`, children: formatNumber(pollData.job.error_count) })] })] })), uploadStatus === "completed" && (_jsx("button", { onClick: resetUploadStore, className: "mt-1 text-xs font-bold text-indigo-500 hover:text-indigo-600 self-center tracking-wide", children: "Clear Status" }))] }))] })] }) }), _jsx("div", { className: "lg:col-span-7", children: _jsxs(Card, { children: [_jsx(CardHeader, { children: _jsx("h2", { className: "text-sm font-bold text-slate-800 dark:text-slate-100", children: "Recent Ingestion Runs" }) }), _jsx(CardContent, { className: "p-0", children: _jsxs(Table, { children: [_jsx(TableHeader, { children: _jsxs(TableRow, { children: [_jsx(TableHead, { children: "File Name" }), _jsx(TableHead, { children: "Loaded Rows" }), _jsx(TableHead, { children: "Errors" }), _jsx(TableHead, { children: "Date" }), _jsx(TableHead, { children: "Status" })] }) }), _jsx(TableBody, { children: isLoadingRecent ? (Array.from({ length: 4 }).map((_, i) => (_jsx(TableRow, { children: Array.from({ length: 5 }).map((_, j) => (_jsx(TableCell, { children: _jsx("div", { className: "h-4 w-full bg-slate-100 dark:bg-slate-800 animate-pulse rounded" }) }, j))) }, i)))) : recentJobs && recentJobs.length > 0 ? (recentJobs.map((job) => (_jsxs(TableRow, { children: [_jsx(TableCell, { className: "max-w-[180px] truncate font-semibold", title: job.filename, children: job.filename }), _jsx(TableCell, { className: "font-bold", children: formatNumber(job.processed_rows) }), _jsx(TableCell, { className: `font-bold ${job.error_count > 0 ? "text-rose-500" : ""}`, children: formatNumber(job.error_count) }), _jsx(TableCell, { className: "text-xs text-slate-400 dark:text-slate-500", children: formatDateTime(job.created_at) }), _jsx(TableCell, { children: getJobStatusBadge(job.status) })] }, job.id)))) : (_jsx(TableRow, { children: _jsx(TableCell, { colSpan: 5, className: "text-center py-8", children: _jsxs("div", { className: "flex flex-col items-center gap-2 text-slate-400", children: [_jsx(AlertTriangle, { className: "h-6 w-6" }), _jsx("span", { className: "text-xs font-semibold", children: "No Ingestion Logs Recorded" })] }) }) })) })] }) })] }) })] })] }));
};
export default UploadPage;
