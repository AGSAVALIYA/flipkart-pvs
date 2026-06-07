import React, { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { clsx } from "clsx";
import {
  Activity,
  AlertTriangle,
  Database,
  Eye,
  FileClock,
  Gauge,
  History,
  TimerReset,
  UploadCloud,
} from "lucide-react";

import { getErrorMessage } from "@/api/client";
import { getIngestionStatus, getProductStats, getRecentJobs, uploadCSV } from "@/api/products";
import type { IngestionJobResponse } from "@/api/types";
import { FileDropzone } from "@/components/common/FileDropzone";
import { PageHeader } from "@/components/common/PageHeader";
import { PaginationBar } from "@/components/common/PaginationBar";
import { ProgressBar } from "@/components/common/ProgressBar";
import { StatsCard } from "@/components/common/StatsCard";
import { Badge } from "@/components/ui/Badge";
import { Card, CardContent, CardHeader } from "@/components/ui/Card";
import { Dialog } from "@/components/ui/Dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/Table";
import { useToast } from "@/components/ui/Toast";
import { formatDateTime, formatDuration, formatNumber } from "@/lib/formatters";
import { useUploadStore } from "@/stores/uploadStore";

const JOBS_PAGE_SIZE_OPTIONS = [10, 20, 50];
const DEFAULT_JOBS_PAGE_SIZE = 10;

function isInFlightStatus(status: IngestionJobResponse["status"]): boolean {
  return status === "pending" || status === "processing";
}

function getJobProgress(job: IngestionJobResponse): number {
  if (job.status === "completed" || job.status === "failed") {
    return 100;
  }

  if (job.total_rows && job.total_rows > 0) {
    const processed = job.processed_rows + job.error_count;
    return Math.min(99, (processed / job.total_rows) * 100);
  }

  return 0;
}

function renderJobStatus(status: IngestionJobResponse["status"]): React.ReactNode {
  switch (status) {
    case "completed":
      return <Badge variant="success">Completed</Badge>;
    case "failed":
      return <Badge variant="error">Failed</Badge>;
    case "processing":
      return <Badge variant="info">Processing</Badge>;
    case "pending":
    default:
      return <Badge variant="warning">Pending</Badge>;
  }
}

function renderMetric(label: string, value: string, tone?: string): React.ReactNode {
  return (
    <div className="min-w-0 rounded-2xl border border-slate-200 bg-slate-50/80 p-4 dark:border-slate-800 dark:bg-slate-950/40">
      <div className="text-[11px] font-bold uppercase tracking-[0.24em] text-slate-400 dark:text-slate-500">
        {label}
      </div>
      <div className={`mt-2 break-words text-lg font-black leading-tight tracking-tight text-slate-900 dark:text-slate-100 sm:text-xl ${tone || ""}`}>
        {value}
      </div>
    </div>
  );
}

export const UploadPage: React.FC = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const lastTerminalStatusRef = useRef<string | null>(null);

  const {
    currentJobId,
    status: uploadStatus,
    progress: uploadProgress,
    filename: uploadingFilename,
    startUpload,
    setUploading,
    updateProgress,
    completeUpload,
    failUpload,
    reset: resetUploadStore,
  } = useUploadStore();

  const [pollingActive, setPollingActive] = useState(false);
  const [jobsPage, setJobsPage] = useState(1);
  const [jobsPageSize, setJobsPageSize] = useState(DEFAULT_JOBS_PAGE_SIZE);
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);
  const [isJobDialogOpen, setIsJobDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"upload" | "history">("upload");

  useEffect(() => {
    const handlePrimary = () => {
      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement | null;
      fileInput?.click();
    };

    const handleSecondary = () => {
      resetUploadStore();
      queryClient.invalidateQueries({ queryKey: ["product-stats"] });
      queryClient.invalidateQueries({ queryKey: ["ingestion-jobs"] });
      toast("Upload monitor reset and jobs list refreshed.", "success");
    };

    window.addEventListener("header-primary-click", handlePrimary);
    window.addEventListener("header-secondary-click", handleSecondary);

    return () => {
      window.removeEventListener("header-primary-click", handlePrimary);
      window.removeEventListener("header-secondary-click", handleSecondary);
    };
  }, [queryClient, resetUploadStore, toast]);

  const { data: stats } = useQuery({
    queryKey: ["product-stats"],
    queryFn: getProductStats,
    refetchInterval: (query) => (query.state.status === "error" ? false : 10000),
  });

  const jobsQuery = useQuery({
    queryKey: ["ingestion-jobs", jobsPage, jobsPageSize],
    queryFn: () => getRecentJobs({ page: jobsPage, page_size: jobsPageSize }),
    refetchInterval: (query) => {
      if (query.state.status === "error") {
        return false;
      }

      const hasActiveJob = query.state.data?.items.some((job) => isInFlightStatus(job.status));
      return pollingActive || hasActiveJob ? 2000 : 15000;
    },
  });

  const activeJobStatusQuery = useQuery({
    queryKey: ["ingestion-job-status", currentJobId],
    queryFn: () => getIngestionStatus(currentJobId!),
    enabled: Boolean(currentJobId) && pollingActive,
    refetchInterval: (query) => {
      const status = query.state.data?.job.status;
      return status && isInFlightStatus(status) ? 2000 : false;
    },
  });

  const selectedJobStatusQuery = useQuery({
    queryKey: ["ingestion-job-status", selectedJobId],
    queryFn: () => getIngestionStatus(selectedJobId!),
    enabled: Boolean(selectedJobId) && isJobDialogOpen,
    refetchInterval: (query) => {
      const status = query.state.data?.job.status;
      return status && isInFlightStatus(status) ? 2000 : false;
    },
  });

  useEffect(() => {
    if (currentJobId) {
      setSelectedJobId(currentJobId);
    }
  }, [currentJobId]);

  useEffect(() => {
    if (!selectedJobId && jobsQuery.data?.items[0]) {
      setSelectedJobId(jobsQuery.data.items[0].id);
    }
  }, [jobsQuery.data, selectedJobId]);

  useEffect(() => {
    const pollData = activeJobStatusQuery.data;
    if (!pollData) {
      return;
    }

    const jobStatus = pollData.job.status;
    updateProgress(pollData.progress_percentage, jobStatus);

    if (jobStatus === lastTerminalStatusRef.current) {
      return;
    }

    if (jobStatus === "completed") {
      lastTerminalStatusRef.current = jobStatus;
      completeUpload();
      setPollingActive(false);
      toast(`CSV ingestion completed. Loaded ${formatNumber(pollData.job.processed_rows)} rows.`, "success");
      queryClient.invalidateQueries({ queryKey: ["product-stats"] });
      queryClient.invalidateQueries({ queryKey: ["ingestion-jobs"] });
    } else if (jobStatus === "failed") {
      lastTerminalStatusRef.current = jobStatus;
      setPollingActive(false);
      failUpload(pollData.job.error_message || "Ingestion failed.");
      toast(pollData.job.error_message || "Ingestion failed.", "error");
      queryClient.invalidateQueries({ queryKey: ["ingestion-jobs"] });
    } else {
      lastTerminalStatusRef.current = null;
    }
  }, [activeJobStatusQuery.data, completeUpload, failUpload, queryClient, toast, updateProgress]);

  const uploadMutation = useMutation({
    onMutate: async (file: File) => {
      lastTerminalStatusRef.current = null;
      setUploading(file.name, 0);
    },
    mutationFn: (file: File) =>
      uploadCSV(file, (progress) => {
        setUploading(file.name, progress);
      }),
    onSuccess: (data, file) => {
      setJobsPage(1);
      startUpload(file.name, data.job_id);
      setSelectedJobId(data.job_id);
      setPollingActive(true);
      toast("CSV uploaded. Ingestion is now running in the background.", "info");
      queryClient.invalidateQueries({ queryKey: ["ingestion-jobs"] });
    },
    onError: (error) => {
      const message = getErrorMessage(error);
      failUpload(message);
      toast(message, "error");
    },
  });

  const activeJobStatus = activeJobStatusQuery.data;
  const jobs = jobsQuery.data?.items ?? [];
  const selectedJobStatus =
    selectedJobStatusQuery.data ?? (selectedJobId === currentJobId ? activeJobStatus : undefined);
  const activeJobsInView = useMemo(
    () => jobs.filter((job) => isInFlightStatus(job.status)).length,
    [jobs],
  );

  const activeRateLabel = activeJobStatus?.current_rows_per_second
    ? `${formatNumber(Math.round(activeJobStatus.current_rows_per_second))}/sec`
    : "Idle";

  const handleFileSelect = (file: File) => {
    uploadMutation.mutate(file);
  };

  const openJobDetails = (jobId: string) => {
    setSelectedJobId(jobId);
    setIsJobDialogOpen(true);
  };

  return (
    <div className="flex flex-col gap-6 animate-fade-in">
      <PageHeader
        title="Upload & Ingestion Control"
        subtitle="Upload product CSVs, track background ingestion in real time, and inspect row-level failures from one place."
      />

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <StatsCard
          label="Products Loaded"
          value={stats ? formatNumber(stats.count) : "—"}
          icon={Database}
          description="Current product reference rows"
        />
        <StatsCard
          label="Tracked Jobs"
          value={jobsQuery.data ? formatNumber(jobsQuery.data.total) : "—"}
          icon={History}
          iconColor="text-cyan-600 dark:text-cyan-400"
          iconBg="bg-cyan-50 dark:bg-cyan-950/30"
          description="Paginated ingestion history"
        />
        <StatsCard
          label="Live Throughput"
          value={activeRateLabel}
          icon={Gauge}
          iconColor="text-emerald-600 dark:text-emerald-400"
          iconBg="bg-emerald-50 dark:bg-emerald-950/30"
          description={activeJobsInView > 0 ? `${activeJobsInView} job(s) still running` : "No active ingestion on this page"}
        />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white/90 p-2 shadow-sm dark:border-slate-800 dark:bg-slate-900/80">
        <div className="inline-flex rounded-2xl bg-slate-100 p-1 dark:bg-slate-800/80">
          {[
            { id: "upload", label: "Upload", icon: UploadCloud },
            { id: "history", label: "History", icon: History },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;

            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id as "upload" | "history")}
                className={clsx(
                  "inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-black tracking-wide transition-all",
                  isActive
                    ? "bg-white text-slate-900 shadow-sm dark:bg-slate-950 dark:text-slate-100"
                    : "text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200",
                )}
              >
                <Icon className="h-4 w-4" />
                {tab.label}
              </button>
            );
          })}
        </div>

        <div className="text-xs font-semibold text-slate-500 dark:text-slate-400">
          {activeTab === "upload"
            ? "Upload a new CSV and monitor the active run in real time."
            : "Browse the full ingestion history and open detailed job diagnostics."}
        </div>
      </div>

      {activeTab === "upload" ? (
        <div className="grid gap-6 xl:grid-cols-[380px,1fr]">
          <div className="flex flex-col gap-6">
            <Card className="overflow-visible border-slate-200 dark:border-slate-800">
              <CardHeader className="bg-gradient-to-r from-slate-50 to-cyan-50/70 dark:from-slate-900 dark:to-cyan-950/20">
                <div>
                  <h2 className="flex items-center gap-2 text-base font-black text-slate-900 dark:text-slate-100">
                    <UploadCloud className="h-5 w-5 text-cyan-600 dark:text-cyan-400" />
                    Upload Inventory File
                  </h2>
                  <p className="mt-1 text-xs font-semibold text-slate-500 dark:text-slate-400">
                    Fastest path uses the canonical header order: WID, EAN, Manufacturing_Date, Expiry_Date.
                  </p>
                </div>
              </CardHeader>
              <CardContent className="space-y-5">
                <FileDropzone
                  onFileSelect={handleFileSelect}
                  isLoading={uploadMutation.isPending || uploadStatus === "pending" || uploadStatus === "processing"}
                />
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <div>
                <h2 className="flex items-center gap-2 text-base font-black text-slate-900 dark:text-slate-100">
                  <Activity className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                  Live Job Monitor
                </h2>
                <p className="mt-1 text-xs font-semibold text-slate-500 dark:text-slate-400">
                  Active upload progress, ETA, and ingestion health.
                </p>
              </div>
              {uploadStatus !== "idle" ? renderJobStatus(uploadStatus === "uploading" ? "processing" : uploadStatus) : null}
            </CardHeader>
            <CardContent className="space-y-5">
              {uploadStatus === "idle" && !activeJobStatus ? (
                <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/80 px-5 py-8 text-center text-sm font-semibold text-slate-500 dark:border-slate-800 dark:bg-slate-950/30 dark:text-slate-400">
                  Start an upload to see live progress, ETA, and throughput here.
                </div>
              ) : (
                <>
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <div className="text-sm font-black text-slate-900 dark:text-slate-100">
                          {uploadingFilename || activeJobStatus?.job.filename || "Current upload"}
                        </div>
                        <div className="mt-1 text-xs font-semibold text-slate-500 dark:text-slate-400">
                          {activeJobStatus?.job.id ? `Job ${activeJobStatus.job.id}` : "Waiting for ingestion job status"}
                        </div>
                      </div>
                      {activeJobStatus ? renderJobStatus(activeJobStatus.job.status) : null}
                    </div>

                    <ProgressBar
                      value={activeJobStatus?.progress_percentage ?? uploadProgress}
                      showText
                      label={uploadStatus === "uploading" ? "UPLOADING" : "PROCESSING"}
                    />
                  </div>

                  {activeJobStatus ? (
                    <div className="grid grid-cols-2 gap-3">
                      {renderMetric("Processed", formatNumber(activeJobStatus.job.processed_rows))}
                      {renderMetric(
                        "Errors",
                        formatNumber(activeJobStatus.job.error_count),
                        activeJobStatus.job.error_count > 0 ? "text-rose-600 dark:text-rose-400" : undefined,
                      )}
                      {renderMetric(
                        "Rate",
                        activeJobStatus.current_rows_per_second
                          ? `${formatNumber(Math.round(activeJobStatus.current_rows_per_second))}/sec`
                          : "—",
                      )}
                      {renderMetric(
                        "ETA",
                        activeJobStatus.job.status === "completed"
                          ? "Done"
                          : formatDuration(activeJobStatus.estimated_remaining_seconds),
                      )}
                    </div>
                  ) : null}

                  {activeJobStatus?.job.error_message ? (
                    <div className="flex items-start gap-3 rounded-2xl border border-rose-200 bg-rose-50/70 px-4 py-3 text-sm font-semibold text-rose-700 dark:border-rose-950/40 dark:bg-rose-950/20 dark:text-rose-300">
                      <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0" />
                      <span>{activeJobStatus.job.error_message}</span>
                    </div>
                  ) : null}

                  {(uploadStatus === "completed" || uploadStatus === "failed") && (
                    <button
                      type="button"
                      onClick={resetUploadStore}
                      className="text-xs font-bold uppercase tracking-[0.24em] text-blue-600 transition-colors hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
                    >
                      Clear monitor
                    </button>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </div>
      ) : (
        <Card>
          <CardHeader>
            <div>
              <h2 className="flex items-center gap-2 text-base font-black text-slate-900 dark:text-slate-100">
                <History className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
                Ingestion Jobs
              </h2>
              <p className="mt-1 text-xs font-semibold text-slate-500 dark:text-slate-400">
                Click any job to inspect progress, ETA, timing, and row-level errors.
              </p>
            </div>
            <div className="flex items-center gap-2">
              {jobsQuery.isFetching ? <Badge variant="info">Refreshing</Badge> : null}
              <Badge variant="neutral">{formatNumber(jobsQuery.data?.total ?? 0)} jobs</Badge>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>File</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Progress</TableHead>
                  <TableHead>Rows</TableHead>
                  <TableHead>Errors</TableHead>
                  <TableHead>Started</TableHead>
                  <TableHead className="text-right">Details</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {jobsQuery.isLoading ? (
                  Array.from({ length: jobsPageSize }).map((_, index) => (
                    <TableRow key={index}>
                      {Array.from({ length: 7 }).map((__, cellIndex) => (
                        <TableCell key={cellIndex}>
                          <div className="h-4 w-full animate-pulse rounded bg-slate-100 dark:bg-slate-800" />
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : jobs.length > 0 ? (
                  jobs.map((job) => (
                    <TableRow key={job.id} onClick={() => openJobDetails(job.id)} className="cursor-pointer">
                      <TableCell>
                        <div className="max-w-[240px] truncate font-bold text-slate-900 dark:text-slate-100" title={job.filename}>
                          {job.filename}
                        </div>
                        <div className="mt-1 text-xs font-semibold text-slate-500 dark:text-slate-400">
                          {formatDateTime(job.created_at)}
                        </div>
                      </TableCell>
                      <TableCell>{renderJobStatus(job.status)}</TableCell>
                      <TableCell>
                        <div className="min-w-[120px]">
                          <ProgressBar value={getJobProgress(job)} />
                          <div className="mt-1 text-xs font-bold text-slate-500 dark:text-slate-400">
                            {Math.round(getJobProgress(job))}%
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="font-bold text-slate-900 dark:text-slate-100">
                        {formatNumber(job.processed_rows)}
                        {job.total_rows ? (
                          <span className="block text-xs font-semibold text-slate-500 dark:text-slate-400">
                            of {formatNumber(job.total_rows)}
                          </span>
                        ) : null}
                      </TableCell>
                      <TableCell className={job.error_count > 0 ? "font-bold text-rose-600 dark:text-rose-400" : "font-bold"}>
                        {formatNumber(job.error_count)}
                      </TableCell>
                      <TableCell className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                        {formatDateTime(job.started_at || job.created_at)}
                      </TableCell>
                      <TableCell className="text-right">
                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            openJobDetails(job.id);
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
                    <TableCell colSpan={7} className="py-12 text-center">
                      <div className="flex flex-col items-center gap-3 text-slate-500 dark:text-slate-400">
                        <FileClock className="h-8 w-8" />
                        <div className="text-sm font-bold">No ingestion jobs found yet.</div>
                        <div className="text-xs font-semibold">Your uploaded CSV runs will appear here with status and progress.</div>
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>

            {jobsQuery.data ? (
              <PaginationBar
                page={jobsPage}
                pageSize={jobsPageSize}
                totalItems={jobsQuery.data.total}
                totalPages={jobsQuery.data.total_pages}
                itemLabel="jobs"
                onPageChange={setJobsPage}
                onPageSizeChange={(pageSize) => {
                  setJobsPageSize(pageSize);
                  setJobsPage(1);
                }}
                pageSizeOptions={JOBS_PAGE_SIZE_OPTIONS}
                isLoading={jobsQuery.isFetching}
              />
            ) : null}
          </CardContent>
        </Card>
      )}

      <Dialog
        isOpen={isJobDialogOpen}
        onClose={() => setIsJobDialogOpen(false)}
        title={selectedJobStatus?.job.filename || "Job details"}
        className="max-w-6xl"
      >
        {selectedJobStatusQuery.isLoading && !selectedJobStatus ? (
          <div className="space-y-4">
            {Array.from({ length: 4 }).map((_, index) => (
              <div key={index} className="h-16 animate-pulse rounded-2xl bg-slate-100 dark:bg-slate-800" />
            ))}
          </div>
        ) : selectedJobStatus ? (
          <div className="space-y-6">
            <div className="flex flex-wrap items-center gap-3">
              {renderJobStatus(selectedJobStatus.job.status)}
              <Badge variant="neutral">{selectedJobStatus.job.id}</Badge>
              {selectedJobStatus.estimated_completion_at && selectedJobStatus.job.status === "processing" ? (
                <Badge variant="info">ETA {formatDateTime(selectedJobStatus.estimated_completion_at)}</Badge>
              ) : null}
            </div>

            <ProgressBar
              value={selectedJobStatus.progress_percentage}
              showText
              label={selectedJobStatus.job.status === "completed" ? "COMPLETED" : "PROGRESS"}
            />

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {renderMetric("Total rows", selectedJobStatus.job.total_rows ? formatNumber(selectedJobStatus.job.total_rows) : "—")}
              {renderMetric("Processed", formatNumber(selectedJobStatus.job.processed_rows))}
              {renderMetric(
                "Errors",
                formatNumber(selectedJobStatus.job.error_count),
                selectedJobStatus.job.error_count > 0 ? "text-rose-600 dark:text-rose-400" : undefined,
              )}
              {renderMetric(
                "Rate",
                selectedJobStatus.current_rows_per_second
                  ? `${formatNumber(Math.round(selectedJobStatus.current_rows_per_second))}/sec`
                  : "—",
              )}
            </div>

            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              {renderMetric("Created", formatDateTime(selectedJobStatus.job.created_at))}
              {renderMetric("Started", formatDateTime(selectedJobStatus.job.started_at || selectedJobStatus.job.created_at))}
              {renderMetric("Elapsed", formatDuration(selectedJobStatus.elapsed_seconds))}
              {renderMetric(
                selectedJobStatus.job.status === "completed" ? "Completed" : "Time remaining",
                selectedJobStatus.job.status === "completed"
                  ? formatDateTime(selectedJobStatus.job.completed_at)
                  : formatDuration(selectedJobStatus.estimated_remaining_seconds),
              )}
            </div>

            {selectedJobStatus.job.error_message ? (
              <div className="rounded-2xl border border-rose-200 bg-rose-50/80 px-4 py-3 text-sm font-semibold text-rose-700 dark:border-rose-950/40 dark:bg-rose-950/20 dark:text-rose-300">
                {selectedJobStatus.job.error_message}
              </div>
            ) : null}

            <div className="rounded-2xl border border-slate-200 dark:border-slate-800">
              <div className="border-b border-slate-100 px-5 py-4 dark:border-slate-800/60">
                <div className="flex items-center gap-2 text-sm font-black text-slate-900 dark:text-slate-100">
                  <TimerReset className="h-4 w-4 text-rose-500" />
                  Error details
                </div>
                <p className="mt-1 text-xs font-semibold text-slate-500 dark:text-slate-400">
                  Row-level failures captured during ingestion. Empty when the run completed cleanly.
                </p>
              </div>

              {selectedJobStatus.errors.length > 0 ? (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Row</TableHead>
                        <TableHead>Field</TableHead>
                        <TableHead>Message</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {selectedJobStatus.errors.map((error) => (
                        <TableRow key={`${error.row}-${error.field}-${error.msg}`}>
                          <TableCell className="font-bold">{formatNumber(error.row)}</TableCell>
                          <TableCell className="font-bold text-slate-700 dark:text-slate-200">{error.field}</TableCell>
                          <TableCell className="text-sm text-slate-600 dark:text-slate-300">{error.msg}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <div className="px-5 py-8 text-center text-sm font-semibold text-slate-500 dark:text-slate-400">
                  No row-level errors were recorded for this job.
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-slate-200 px-5 py-10 text-center text-sm font-semibold text-slate-500 dark:border-slate-800 dark:text-slate-400">
            Select a job from the table to inspect its details.
          </div>
        )}
      </Dialog>
    </div>
  );
};

export default UploadPage;