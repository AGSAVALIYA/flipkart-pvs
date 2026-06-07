import React, { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { subDays } from "date-fns";
import { CheckCircle, Clock, Eye, FileSpreadsheet, ScanSearch, XCircle, RefreshCw, Sparkles } from "lucide-react";

import { getStorageUrl, getErrorMessage } from "@/api/client";
import { getValidationLog, requestValidationAIProcessing } from "@/api/validation";
import { getReport } from "@/api/reports";
import { getProduct } from "@/api/products";
import { getUsers } from "@/api/auth";
import { AIStatusBadge } from "@/components/common/AIStatusBadge";
import { DateRangePicker } from "@/components/common/DateRangePicker";
import { PageHeader } from "@/components/common/PageHeader";
import { PaginationBar } from "@/components/common/PaginationBar";
import { StatsCard } from "@/components/common/StatsCard";
import { StatusBadge } from "@/components/common/StatusBadge";
import { Badge } from "@/components/ui/Badge";
import { Card, CardContent, CardHeader } from "@/components/ui/Card";
import { Dialog } from "@/components/ui/Dialog";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/Table";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import { formatDateTime, formatNumber, toISODate, formatDate } from "@/lib/formatters";

const PAGE_SIZE_OPTIONS = [10, 25, 50];

function renderDetailMetric(label: string, value: string): React.ReactNode {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4 dark:border-slate-800 dark:bg-slate-950/40">
      <div className="text-[11px] font-bold uppercase tracking-[0.24em] text-slate-400 dark:text-slate-500">
        {label}
      </div>
      <div className="mt-2 text-sm font-black text-slate-900 dark:text-slate-100 sm:text-base">
        {value}
      </div>
    </div>
  );
}

export const ReportsPage: React.FC = () => {
  const [startDate, setStartDate] = useState(() => toISODate(subDays(new Date(), 6)));
  const [endDate, setEndDate] = useState(() => toISODate(new Date()));
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [selectedLogId, setSelectedLogId] = useState<number | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  // Custom Export Dialog state variables
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [exportStartDate, setExportStartDate] = useState(() => toISODate(subDays(new Date(), 6)));
  const [exportEndDate, setExportEndDate] = useState(() => toISODate(new Date()));
  const [exportOperator, setExportOperator] = useState<string[]>([]);
  const [exportStatus, setExportStatus] = useState<string[]>([]);
  const [exportAIResult, setExportAIResult] = useState("all");
  const [printData, setPrintData] = useState<{
    logs: any[];
    summary: any;
    startDate: string;
    endDate: string;
    operator: string[];
    status: string[];
    aiResult: string;
  } | null>(null);

  const queryClient = useQueryClient();
  const { toast } = useToast();

  const rerunAiMutation = useMutation({
    mutationFn: (logId: number) => requestValidationAIProcessing(logId),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["validation-log-detail", data.id] });
      queryClient.invalidateQueries({ queryKey: ["report-compliance"] });
      toast("AI analysis queued for background rerun.", "success");
    },
    onError: (err: any) => {
      toast(getErrorMessage(err), "error");
    },
  });

  const { data: reportData, isLoading, isFetching } = useQuery({
    queryKey: ["report-compliance", startDate, endDate, page, pageSize],
    queryFn: () => getReport(startDate, endDate, { page, page_size: pageSize }),
    refetchInterval: (query) => (query.state.status === "error" ? false : 30000),
  });

  const logs = reportData?.logs.items ?? [];
  const summary = reportData?.summary;

  // Fetch users list for operator selector
  const { data: users } = useQuery({
    queryKey: ["users-list-export"],
    queryFn: getUsers,
  });

  const selectedLogQuery = useQuery({
    queryKey: ["validation-log-detail", selectedLogId],
    queryFn: () => getValidationLog(selectedLogId!),
    enabled: Boolean(selectedLogId) && isDetailOpen,
    refetchInterval: (query) => {
      const status = query.state.data?.ai_processing_status;
      return status === "queued" || status === "processing" ? 2000 : false;
    },
  });

  const selectedLog = selectedLogQuery.data;
  const selectedImageUrl = getStorageUrl(selectedLog?.captured_image_url);

  const productQuery = useQuery({
    queryKey: ["product-detail", selectedLog?.wid],
    queryFn: () => getProduct(selectedLog!.wid),
    enabled: Boolean(selectedLog?.wid) && isDetailOpen,
  });

  const canRerunAI = Boolean(
    selectedLog &&
      selectedLog.ai_processing_mode !== "not_allowed" &&
      selectedLog.ai_processing_status !== "queued" &&
      selectedLog.ai_processing_status !== "processing"
  );

  const fetchFilteredData = async () => {
    // Fetch all logs in the selected date range by passing a very large page size
    const allData = await getReport(exportStartDate, exportEndDate, { page: 1, page_size: 100000 });
    const allLogs = allData?.logs?.items ?? [];

    const filteredLogs = allLogs.filter((log) => {
      // Multi-select operator checking
      const operatorFilterActive = exportOperator.length > 0 && !exportOperator.includes("all");
      if (operatorFilterActive && !exportOperator.includes(log.verified_by)) {
        return false;
      }
      // Multi-select compliance status checking
      const statusFilterActive = exportStatus.length > 0 && !exportStatus.includes("all");
      if (statusFilterActive && !exportStatus.includes(log.validation_status)) {
        return false;
      }
      if (exportAIResult !== "all") {
        const status = log.ai_processing_status;
        const result = log.ai_match_result;
        switch (exportAIResult) {
          case "MATCH":
            if (result !== "MATCH") return false;
            break;
          case "MISMATCH":
            if (result !== "MISMATCH") return false;
            break;
          case "FAILED":
            if (status !== "failed") return false;
            break;
          case "QUEUED_PROCESSING":
            if (status !== "queued" && status !== "processing") return false;
            break;
          case "NOT_ALLOWED":
            if (status !== "not_allowed") return false;
            break;
          case "NOT_REQUESTED":
            if (status !== "not_requested") return false;
            break;
          default:
            break;
        }
      }
      return true;
    });

    const total = filteredLogs.length;
    const verified = filteredLogs.filter((l) => l.validation_status === "VERIFIED").length;
    const mismatch = filteredLogs.filter((l) => l.validation_status === "MISMATCH").length;
    const pending = filteredLogs.filter((l) => l.validation_status === "PENDING").length;

    return {
      logs: filteredLogs,
      summary: {
        total_verifications: total,
        verified_count: verified,
        mismatch_count: mismatch,
        pending_count: pending,
      },
    };
  };

  const handleExportCSV = async () => {
    try {
      const { logs: filteredLogs } = await fetchFilteredData();
      if (filteredLogs.length === 0) {
        toast("No audit logs found for the selected filters.", "warning");
        return;
      }

      const headers = ["Check ID", "WID", "EAN", "Status", "Operator", "Checked At", "AI Result"];
      const csvContent = [
        headers.join(","),
        ...filteredLogs.map((log) => [
          log.id,
          log.wid,
          log.ean,
          log.validation_status,
          log.verified_by,
          `"${formatDateTime(log.verified_at)}"`,
          log.ai_match_result || log.ai_processing_status || "NONE",
        ].join(",")),
      ].join("\n");

      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `pvs_audit_report_${exportStartDate}_to_${exportEndDate}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      setIsExportOpen(false);
      toast("CSV Report exported successfully.", "success");
    } catch (err) {
      toast("Failed to export CSV: " + getErrorMessage(err), "error");
    }
  };

  const handleExportPDF = async () => {
    try {
      const { logs: filteredLogs, summary } = await fetchFilteredData();
      if (filteredLogs.length === 0) {
        toast("No audit logs found for the selected filters.", "warning");
        return;
      }

      setPrintData({
        logs: filteredLogs,
        summary,
        startDate: exportStartDate,
        endDate: exportEndDate,
        operator: exportOperator,
        status: exportStatus,
        aiResult: exportAIResult,
      });

      setIsExportOpen(false);

      // Trigger standard print dialog after React updates DOM
      setTimeout(() => {
        window.print();
      }, 250);
    } catch (err) {
      toast("Failed to export PDF: " + getErrorMessage(err), "error");
    }
  };

  useEffect(() => {
    const handlePrimaryClick = () => {
      setExportStartDate(startDate);
      setExportEndDate(endDate);
      setExportOperator([]);
      setExportStatus([]);
      setExportAIResult("all");
      setIsExportOpen(true);
    };

    window.addEventListener("header-primary-click", handlePrimaryClick);

    return () => {
      window.removeEventListener("header-primary-click", handlePrimaryClick);
    };
  }, [startDate, endDate]);

  const handleDateChange = (start: string, end: string) => {
    setStartDate(start);
    setEndDate(end);
    setPage(1);
  };

  const openAuditDetail = (logId: number) => {
    setSelectedLogId(logId);
    setIsDetailOpen(true);
  };

  return (
    <div className="flex flex-col gap-6 animate-fade-in">
      <PageHeader
        title="Audit Trail"
        subtitle="Review verification history with a consistent paginated table for compliance and warehouse QA checks."
      />

      <div className="grid gap-4 xl:grid-cols-[1.3fr,0.7fr]">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatsCard
            label="Total Checks"
            value={summary ? formatNumber(summary.total_verifications) : "—"}
            icon={FileSpreadsheet}
            description="Audit records in selected range"
          />
          <StatsCard
            label="Verified"
            value={summary ? formatNumber(summary.verified_count) : "—"}
            icon={CheckCircle}
            iconColor="text-emerald-600 dark:text-emerald-400"
            iconBg="bg-emerald-50 dark:bg-emerald-950/30"
            description="Package matched reference"
          />
          <StatsCard
            label="Mismatch"
            value={summary ? formatNumber(summary.mismatch_count) : "—"}
            icon={XCircle}
            iconColor="text-rose-600 dark:text-rose-400"
            iconBg="bg-rose-50 dark:bg-rose-950/30"
            description="Operator flagged mismatch"
          />
          <StatsCard
            label="Pending"
            value={summary ? formatNumber(summary.pending_count) : "—"}
            icon={Clock}
            iconColor="text-amber-600 dark:text-amber-400"
            iconBg="bg-amber-50 dark:bg-amber-950/30"
            description="Awaiting final action"
          />
        </div>

        <DateRangePicker startDate={startDate} endDate={endDate} onChange={handleDateChange} />
      </div>

      <Card>
        <CardHeader>
          <div>
            <h2 className="text-base font-black text-slate-900 dark:text-slate-100">Paginated Audit Logs</h2>
            <p className="mt-1 text-xs font-semibold text-slate-500 dark:text-slate-400">
              Stable table view for audit trails with pagination, export, and print actions.
            </p>
          </div>
          <div className="flex items-center gap-2">
            {isFetching ? <Badge variant="info">Refreshing</Badge> : null}
            <Badge variant="neutral">{formatNumber(reportData?.logs.total ?? 0)} records</Badge>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Check ID</TableHead>
                <TableHead>WID</TableHead>
                <TableHead>EAN</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Operator</TableHead>
                <TableHead>AI Result</TableHead>
                <TableHead>Checked At</TableHead>
                <TableHead className="text-right">Details</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: pageSize }).map((_, index) => (
                  <TableRow key={index}>
                    {Array.from({ length: 8 }).map((__, cellIndex) => (
                      <TableCell key={cellIndex}>
                        <div className="h-4 w-full animate-pulse rounded bg-slate-100 dark:bg-slate-800" />
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : logs.length > 0 ? (
                logs.map((row) => (
                  <TableRow key={row.id} className="cursor-pointer" onClick={() => openAuditDetail(row.id)}>
                    <TableCell className="font-bold text-slate-500 dark:text-slate-400">#{row.id}</TableCell>
                    <TableCell className="font-bold text-slate-900 dark:text-slate-100">{row.wid}</TableCell>
                    <TableCell className="font-semibold text-slate-700 dark:text-slate-200">{row.ean}</TableCell>
                    <TableCell>
                      <StatusBadge status={row.validation_status} />
                    </TableCell>
                    <TableCell className="text-sm font-semibold">{row.verified_by}</TableCell>
                    <TableCell>
                      <AIStatusBadge
                        processingStatus={row.ai_processing_status}
                        matchResult={row.ai_match_result}
                      />
                    </TableCell>
                    <TableCell className="text-sm font-semibold text-slate-500 dark:text-slate-400">
                      {formatDateTime(row.verified_at)}
                    </TableCell>
                    <TableCell className="text-right">
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          openAuditDetail(row.id);
                        }}
                        className="inline-flex items-center gap-1 text-xs font-bold uppercase tracking-[0.24em] text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
                      >
                        <Eye className="h-4 w-4" />
                        Open
                      </button>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={8} className="py-12 text-center">
                    <div className="flex flex-col items-center gap-3 text-slate-500 dark:text-slate-400">
                      <FileSpreadsheet className="h-8 w-8" />
                      <div className="text-sm font-bold">No audit logs found for this date range.</div>
                      <div className="text-xs font-semibold">Adjust the range and the table will refresh automatically.</div>
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>

          {reportData?.logs ? (
            <PaginationBar
              page={page}
              pageSize={pageSize}
              totalItems={reportData.logs.total}
              totalPages={reportData.logs.total_pages}
              itemLabel="audit records"
              onPageChange={setPage}
              onPageSizeChange={(nextPageSize) => {
                setPageSize(nextPageSize);
                setPage(1);
              }}
              pageSizeOptions={PAGE_SIZE_OPTIONS}
              isLoading={isFetching}
            />
          ) : null}
        </CardContent>
      </Card>

      <Dialog
        isOpen={isDetailOpen}
        onClose={() => setIsDetailOpen(false)}
        title={selectedLog ? `Audit check #${selectedLog.id}` : "Audit check details"}
        className="max-w-6xl"
      >
        {selectedLogQuery.isLoading && !selectedLog ? (
          <div className="space-y-4">
            {Array.from({ length: 4 }).map((_, index) => (
              <div key={index} className="h-20 animate-pulse rounded-2xl bg-slate-100 dark:bg-slate-800" />
            ))}
          </div>
        ) : selectedLog ? (
          <div className="space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-50 dark:bg-slate-800/20 p-3.5 rounded-2xl border border-slate-100 dark:border-slate-800/40">
              <div className="flex flex-wrap items-center gap-2.5">
                <StatusBadge status={selectedLog.validation_status} />
                <AIStatusBadge
                  processingStatus={selectedLog.ai_processing_status}
                  matchResult={selectedLog.ai_match_result}
                />
                <Badge variant="neutral" className="font-mono tracking-wide">{selectedLog.wid}</Badge>
              </div>

              {canRerunAI && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => rerunAiMutation.mutate(selectedLog.id)}
                  isLoading={rerunAiMutation.isPending}
                  className="gap-1.5 text-xs font-bold font-mono tracking-wider uppercase border-slate-200 text-slate-700 hover:bg-slate-50 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-800/50"
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                  Rerun AI
                </Button>
              )}
            </div>

            <div className="grid gap-6 xl:grid-cols-[0.95fr,1.05fr]">
              <div className="space-y-4">
                <div className="overflow-hidden rounded-3xl border border-slate-200 bg-slate-950 shadow-xl dark:border-slate-800">
                  <div className="flex items-center gap-2 border-b border-slate-200/80 bg-slate-900/90 px-4 py-3 text-xs font-bold uppercase tracking-[0.24em] text-slate-200 dark:border-slate-800/80">
                    <ScanSearch className="h-4 w-4" />
                    Uploaded label image
                  </div>
                  <div className="h-[200px] bg-slate-950 flex items-center justify-center">
                    {selectedImageUrl ? (
                      <img
                        src={selectedImageUrl}
                        alt={`Captured package for ${selectedLog.wid}`}
                        className="h-full w-full object-contain"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center px-6 text-center text-sm font-semibold text-slate-400">
                        No captured image was stored for this audit log.
                      </div>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {renderDetailMetric("Operator", selectedLog.verified_by)}
                  {renderDetailMetric("Checked at", formatDateTime(selectedLog.verified_at))}
                  {renderDetailMetric("Warehouse ID", selectedLog.wid)}
                  {renderDetailMetric(
                    "AI decision",
                    selectedLog.ai_match_result ?? selectedLog.ai_processing_status ?? "Not processed",
                  )}
                </div>
 
                {/* System Reference Specs */}
                {productQuery.data?.found && productQuery.data?.product && (
                  <div className="rounded-3xl border border-slate-200 bg-slate-50/20 p-5 dark:border-slate-800">
                    <div className="text-sm font-black text-slate-900 dark:text-slate-100">System Reference Specs</div>
                    <p className="mt-1 text-xs font-semibold text-slate-500 dark:text-slate-400">
                      Product details registered in database.
                    </p>
                    <div className="grid grid-cols-3 gap-2.5 text-center text-xs mt-3.5">
                      <div className="flex flex-col bg-slate-50 dark:bg-slate-800/40 p-2 rounded-xl border border-slate-100 dark:border-slate-800/50">
                        <span className="text-[9px] font-bold text-slate-400 tracking-wide uppercase">EAN</span>
                        <span className="font-extrabold text-slate-800 dark:text-slate-200 mt-1">
                          {productQuery.data.product.ean}
                        </span>
                      </div>
                      <div className="flex flex-col bg-slate-50 dark:bg-slate-800/40 p-2 rounded-xl border border-slate-100 dark:border-slate-800/50">
                        <span className="text-[9px] font-bold text-slate-400 tracking-wide uppercase">MFG Date</span>
                        <span className="font-extrabold text-slate-800 dark:text-slate-200 mt-1">
                          {formatDate(productQuery.data.product.manufacturing_date)}
                        </span>
                      </div>
                      <div className="flex flex-col bg-slate-50 dark:bg-slate-800/40 p-2 rounded-xl border border-slate-100 dark:border-slate-800/50">
                        <span className="text-[9px] font-bold text-slate-400 tracking-wide uppercase">EXP Date</span>
                        <span className="font-extrabold text-slate-800 dark:text-slate-200 mt-1">
                          {formatDate(productQuery.data.product.expiry_date)}
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
 
              <div className="space-y-4">
                <div className="rounded-3xl border border-slate-200 dark:border-slate-800">
                  <div className="border-b border-slate-100 px-5 py-4 dark:border-slate-800/60">
                    <div className="text-sm font-black text-slate-900 dark:text-slate-100">AI extraction</div>
                    <p className="mt-1 text-xs font-semibold text-slate-500 dark:text-slate-400">
                      Structured output saved with the verification record.
                    </p>
                  </div>

                  {selectedLog.ai_error_message ? (
                    <div className="mx-5 mt-5 rounded-2xl border border-rose-200 bg-rose-50/80 px-4 py-3 text-sm font-semibold text-rose-700 dark:border-rose-950/40 dark:bg-rose-950/20 dark:text-rose-300">
                      {selectedLog.ai_error_message}
                    </div>
                  ) : null}

                  {selectedLog.ai_extraction ? (
                    <div className="space-y-3 px-5 py-4">
                      {/* Modern AI Extraction Card */}
                      <div className="rounded-2xl border border-indigo-100/80 bg-gradient-to-br from-indigo-50/15 to-violet-50/5 dark:border-indigo-950/45 dark:from-indigo-950/10 dark:to-purple-950/5 p-3.5 space-y-3 shadow-xs">
                        
                        {/* Header: Label & Match Confidence */}
                        <div className="flex items-center justify-between border-b border-indigo-100/40 dark:border-indigo-950/30 pb-2">
                          <div className="flex items-center gap-2">
                            <span className="relative flex h-2 w-2">
                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                              <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-500"></span>
                            </span>
                            <span className="text-[10px] font-black uppercase tracking-widest text-indigo-500 dark:text-indigo-400">
                              Vision AI OCR Results
                            </span>
                          </div>
                          
                          {(selectedLog.ai_extraction as Record<string, unknown>).confidence != null && (
                            <div className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold bg-indigo-50/90 text-indigo-600 border border-indigo-100/50 dark:bg-indigo-950/40 dark:text-indigo-300 dark:border-indigo-900/40">
                              <Sparkles className="h-2.5 w-2.5 text-indigo-500 animate-pulse" />
                              <span>
                                {Math.round(Number((selectedLog.ai_extraction as Record<string, unknown>).confidence) * 100)}% Confidence
                              </span>
                            </div>
                          )}
                        </div>

                        {/* Extracted Values Grid */}
                        <div className="grid grid-cols-3 gap-2 text-center text-xs">
                          <div className="flex flex-col bg-white/70 dark:bg-slate-900/45 p-2 rounded-xl border border-slate-100 dark:border-slate-800/40 shadow-2xs">
                            <span className="text-[9px] font-bold text-slate-400 dark:text-slate-500 tracking-wide uppercase">Detected EAN</span>
                            <span className="font-extrabold text-slate-800 dark:text-slate-200 mt-1 text-xs truncate">
                              {String((selectedLog.ai_extraction as Record<string, unknown>).ean ?? "—")}
                            </span>
                          </div>
                          <div className="flex flex-col bg-white/70 dark:bg-slate-900/45 p-2 rounded-xl border border-slate-100 dark:border-slate-800/40 shadow-2xs">
                            <span className="text-[9px] font-bold text-slate-400 dark:text-slate-500 tracking-wide uppercase">Detected MFG</span>
                            <span className="font-extrabold text-slate-800 dark:text-slate-200 mt-1 text-xs">
                              {String((selectedLog.ai_extraction as Record<string, unknown>).manufacturing_date ?? "—")}
                            </span>
                          </div>
                          <div className="flex flex-col bg-white/70 dark:bg-slate-900/45 p-2 rounded-xl border border-slate-100 dark:border-slate-800/40 shadow-2xs">
                            <span className="text-[9px] font-bold text-slate-400 dark:text-slate-500 tracking-wide uppercase">Detected EXP</span>
                            <span className="font-extrabold text-slate-800 dark:text-slate-200 mt-1 text-xs">
                              {String((selectedLog.ai_extraction as Record<string, unknown>).expiry_date ?? "—")}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* OCR Raw Text */}
                      <div className="rounded-2xl border border-slate-100 bg-slate-50/20 p-3 dark:border-slate-800/60 dark:bg-slate-900/10">
                        <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">
                          OCR raw text
                        </div>
                        <pre className="mt-2 max-h-[80px] overflow-y-auto whitespace-pre-wrap break-words text-[11px] font-mono leading-4 text-slate-600 dark:text-slate-400 bg-slate-50/70 dark:bg-slate-950/40 p-2 rounded-lg border border-slate-100/50 dark:border-slate-800/50">
                          {String((selectedLog.ai_extraction as Record<string, unknown>).raw_text ?? "No raw text was captured.")}
                        </pre>
                      </div>
                    </div>
                  ) : (
                    <div className="px-5 py-8 text-sm font-semibold text-slate-500 dark:text-slate-400">
                      No AI extraction data is stored for this audit row yet.
                    </div>
                  )}
                </div>

                <div className="rounded-3xl border border-slate-200 dark:border-slate-800">
                  <div className="border-b border-slate-100 px-5 py-4 dark:border-slate-800/60">
                    <div className="text-sm font-black text-slate-900 dark:text-slate-100">Operator notes</div>
                  </div>
                  <div className="px-5 py-5 text-sm font-medium leading-7 text-slate-600 dark:text-slate-300">
                    {selectedLog.notes?.trim() || "No manual notes were saved for this audit record."}
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-slate-200 px-5 py-10 text-center text-sm font-semibold text-slate-500 dark:border-slate-800 dark:text-slate-400">
            Select an audit row to inspect its full detail.
          </div>
        )}
      </Dialog>

      {/* EXPORT DATA CONFIGURE DIALOG */}
      <Dialog
        isOpen={isExportOpen}
        onClose={() => setIsExportOpen(false)}
        title="Export QA Compliance Report"
      >
        <div className="flex flex-col gap-4 mt-2 px-1 py-1">
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="START DATE"
              type="date"
              value={exportStartDate}
              onChange={(e) => setExportStartDate(e.target.value)}
            />
            <Input
              label="END DATE"
              type="date"
              value={exportEndDate}
              onChange={(e) => setExportEndDate(e.target.value)}
            />
          </div>

          <Select
            label="OPERATOR SELECTION"
            placeholder="All Operators"
            multiple={true}
            enableSearch={true}
            value={exportOperator}
            onChange={(e) => setExportOperator(e.target.value)}
            options={users?.map((u) => ({ value: u.username, label: u.username })) ?? []}
          />

          <Select
            label="COMPLIANCE STATUS"
            placeholder="All Statuses"
            multiple={true}
            value={exportStatus}
            onChange={(e) => setExportStatus(e.target.value)}
            options={[
              { value: "VERIFIED", label: "VERIFIED MATCH" },
              { value: "MISMATCH", label: "MISMATCH FLAGGED" },
              { value: "PENDING", label: "PENDING REVIEW" },
            ]}
          />

          <Select
            label="AI EXTRACTION RESULT"
            value={exportAIResult}
            onChange={(e) => setExportAIResult(e.target.value)}
            options={[
              { value: "all", label: "All AI Results" },
              { value: "MATCH", label: "AI MATCH" },
              { value: "MISMATCH", label: "AI MISMATCH" },
              { value: "FAILED", label: "AI PROCESSING FAILED" },
              { value: "QUEUED_PROCESSING", label: "AI QUEUED / PROCESSING" },
              { value: "NOT_ALLOWED", label: "AI DISABLED FOR ROLE" },
              { value: "NOT_REQUESTED", label: "AI NOT REQUESTED" },
            ]}
          />

          <div className="flex justify-end gap-3 mt-4 border-t border-slate-100 dark:border-slate-800/60 pt-4">
            <Button
              variant="outline"
              type="button"
              onClick={() => setIsExportOpen(false)}
            >
              Cancel
            </Button>
            <Button
              variant="outline"
              type="button"
              onClick={handleExportCSV}
              className="border-slate-200 text-slate-700 hover:bg-slate-50"
            >
              Export CSV
            </Button>
            <Button
              variant="primary"
              type="button"
              onClick={handleExportPDF}
              className="bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-200 hover:shadow-lg"
            >
              Export PDF
            </Button>
          </div>
        </div>
      </Dialog>

      {/* PRINT-ONLY COMPLIANCE REPORT DOCUMENT */}
      {printData && (
        <div id="print-report-container" className="hidden print:block p-8 bg-white text-slate-900 font-sans w-full">
          <style>{`
            @media print {
              body * {
                visibility: hidden !important;
              }
              #print-report-container, #print-report-container * {
                visibility: visible !important;
              }
              #print-report-container {
                position: absolute;
                left: 0;
                top: 0;
                width: 100%;
              }
              tr {
                page-break-inside: avoid !important;
              }
            }
          `}</style>
          
          <div className="border-b-2 border-slate-900 pb-4 mb-6">
            <div className="flex justify-between items-start">
              <div>
                <h1 className="text-2xl font-black tracking-tight text-slate-900 uppercase">
                  Flipkart PVS - Compliance Audit Report
                </h1>
                <p className="text-xs text-slate-500 font-semibold mt-1">
                  Product Verification System | Warehouse Quality Assurance
                </p>
              </div>
              <div className="text-right">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">
                  Report Status
                </span>
                <span className="text-sm font-black text-emerald-600 uppercase tracking-wide">
                  Official Audit Trail
                </span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-6 bg-slate-50 p-4 rounded-2xl border border-slate-200 mb-6 text-xs">
            <div className="space-y-1.5 flex flex-col justify-start">
              <div>
                <span className="font-bold text-slate-400 uppercase tracking-wider text-[9px] mr-2">Date Range:</span>
                <span className="font-extrabold text-slate-800">{formatDate(printData.startDate)} to {formatDate(printData.endDate)}</span>
              </div>
              <div className="truncate">
                <span className="font-bold text-slate-400 uppercase tracking-wider text-[9px] mr-2">Operator Filter:</span>
                <span className="font-extrabold text-slate-800">
                  {printData.operator.length === 0 ? "All Operators" : printData.operator.join(", ")}
                </span>
              </div>
              <div>
                <span className="font-bold text-slate-400 uppercase tracking-wider text-[9px] mr-2">Generated On:</span>
                <span className="font-extrabold text-slate-800">{new Date().toLocaleString()}</span>
              </div>
            </div>
            <div className="space-y-1.5 flex flex-col justify-start">
              <div className="truncate">
                <span className="font-bold text-slate-400 uppercase tracking-wider text-[9px] mr-2">Status Filter:</span>
                <span className="font-extrabold text-slate-800">
                  {printData.status.length === 0 ? "All Statuses" : printData.status.join(", ")}
                </span>
              </div>
              <div>
                <span className="font-bold text-slate-400 uppercase tracking-wider text-[9px] mr-2">AI Result Filter:</span>
                <span className="font-extrabold text-slate-800">{printData.aiResult === "all" ? "All AI Results" : printData.aiResult}</span>
              </div>
            </div>
          </div>

          {/* Aggregated Filter Summary Cards */}
          <div className="grid grid-cols-4 gap-4 mb-6">
            <div className="border border-slate-200 p-3 rounded-xl text-center">
              <div className="text-[8px] font-bold uppercase tracking-wider text-slate-400">Total Audits</div>
              <div className="text-lg font-black text-slate-800 mt-1">{printData.summary.total_verifications}</div>
            </div>
            <div className="border border-slate-200 p-3 rounded-xl text-center">
              <div className="text-[8px] font-bold uppercase tracking-wider text-emerald-500">Verified Match</div>
              <div className="text-lg font-black text-emerald-600 mt-1">{printData.summary.verified_count}</div>
            </div>
            <div className="border border-slate-200 p-3 rounded-xl text-center">
              <div className="text-[8px] font-bold uppercase tracking-wider text-rose-500">Mismatches</div>
              <div className="text-lg font-black text-rose-600 mt-1">{printData.summary.mismatch_count}</div>
            </div>
            <div className="border border-slate-200 p-3 rounded-xl text-center">
              <div className="text-[8px] font-bold uppercase tracking-wider text-amber-500">Pending QA</div>
              <div className="text-lg font-black text-amber-600 mt-1">{printData.summary.pending_count}</div>
            </div>
          </div>

          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-300 bg-slate-50 text-slate-600 font-bold uppercase text-[9px] tracking-wider">
                <th className="py-2.5 px-3">Check ID</th>
                <th className="py-2.5 px-3">WID</th>
                <th className="py-2.5 px-3">EAN</th>
                <th className="py-2.5 px-3">Status</th>
                <th className="py-2.5 px-3">Operator</th>
                <th className="py-2.5 px-3">AI Result</th>
                <th className="py-2.5 px-3">Checked At</th>
              </tr>
            </thead>
            <tbody>
              {printData.logs.map((row) => (
                <tr key={row.id} className="border-b border-slate-200">
                  <td className="py-2 px-3 font-bold text-slate-500">#{row.id}</td>
                  <td className="py-2 px-3 font-bold text-slate-800">{row.wid}</td>
                  <td className="py-2 px-3 text-slate-600">{row.ean}</td>
                  <td className="py-2 px-3 font-semibold">
                    <span className={
                      row.validation_status === "VERIFIED" ? "text-emerald-600 font-bold" :
                      row.validation_status === "MISMATCH" ? "text-rose-600 font-bold" :
                      "text-amber-600 font-bold"
                    }>
                      {row.validation_status}
                    </span>
                  </td>
                  <td className="py-2 px-3 font-semibold">{row.verified_by}</td>
                  <td className="py-2 px-3 text-slate-600">
                    {row.ai_match_result || row.ai_processing_status || "NONE"}
                  </td>
                  <td className="py-2 px-3 text-slate-500">
                    {formatDateTime(row.verified_at)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default ReportsPage;