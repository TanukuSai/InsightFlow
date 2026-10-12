"use client";

import React, { useEffect, useState, useCallback, useRef } from "react";
import AppHeader from "@/components/navigation/AppHeader";
import { useDataset } from "@/lib/context/DatasetContext";
import { adaptionApi } from "@/lib/api/client";
import {
  AdaptionConfigStatus,
  AdaptionEstimateResponse,
  AdaptionJobResponse,
} from "@/lib/api/types";
import {
  Sparkles,
  ShieldCheck,
  ShieldAlert,
  Coins,
  Cpu,
  CheckCircle2,
  AlertTriangle,
  Play,
  RotateCw,
  Download,
  Lock,
  X,
  ChevronDown,
  ChevronRight,
  Database,
} from "lucide-react";

type StatusState =
  | "checking"
  | "ready"
  | "key_missing"
  | "operations_disabled"
  | "unreachable";

const formatJobStatus = (status: string, operationType?: string) => {
  if (operationType === "estimate" && status?.toLowerCase() === "succeeded") {
    return "Quote received";
  }
  switch (status?.toLowerCase()) {
    case "succeeded":
      return "Completed";
    case "pending":
      return "Queued";
    case "running":
      return "Running";
    case "failed":
      return "Failed";
    default:
      return status ? status.charAt(0).toUpperCase() + status.slice(1) : "Unknown";
  }
};

export default function AdaptionLabPage() {
  const { selectedDatasetId, selectedDataset } = useDataset();

  // Status and data state
  const [statusInfo, setStatusInfo] = useState<AdaptionConfigStatus | null>(null);
  const [statusState, setStatusState] = useState<StatusState>("checking");
  const [jobs, setJobs] = useState<AdaptionJobResponse[]>([]);
  const [estimateResult, setEstimateResult] = useState<AdaptionEstimateResponse | null>(null);

  // Form states
  const [maxRows, setMaxRows] = useState<number>(250);
  const [hasConsented, setHasConsented] = useState<boolean>(false);
  const [isEstimating, setIsEstimating] = useState(false);
  const [isStartingJob, setIsStartingJob] = useState(false);
  const [isLoadingJobs, setIsLoadingJobs] = useState(false);
  const [downloadingJobId, setDownloadingJobId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Technical details accordion in drawer
  const [showTechnicalDetails, setShowTechnicalDetails] = useState(false);

  // Confirmation dialog
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  // Inspection drawer
  const [selectedJob, setSelectedJob] = useState<AdaptionJobResponse | null>(null);

  // Polling ref to handle unmount/cleanup
  const pollTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Reset estimate and consent if dataset or row cap changes
  useEffect(() => {
    setEstimateResult(null);
    setHasConsented(false);
  }, [selectedDatasetId, maxRows]);

  // Handle ESC key to close modal and drawer
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setShowConfirmModal(false);
        setSelectedJob(null);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Fetch status and jobs from real backend
  const fetchStatusAndJobs = useCallback(async () => {
    setStatusState("checking");
    try {
      const [st, jobList] = await Promise.all([
        adaptionApi.getStatus().catch((err) => {
          console.warn("Adaption status call failed:", err);
          return null;
        }),
        adaptionApi.listJobs().catch(() => []),
      ]);

      if (st) {
        setStatusInfo(st);
        if (!st.configured || !st.api_key_set) {
          setStatusState("key_missing");
        } else if (!st.public_operations_enabled) {
          setStatusState("operations_disabled");
        } else {
          setStatusState("ready");
        }
      } else {
        setStatusState("unreachable");
        setStatusInfo(null);
      }

      setJobs(jobList || []);
    } catch {
      setStatusState("unreachable");
      setStatusInfo(null);
    }
  }, []);

  useEffect(() => {
    fetchStatusAndJobs();
  }, [fetchStatusAndJobs]);

  // Honest, bounded polling for running jobs
  useEffect(() => {
    const runningJobs = jobs.filter((j) => j.status === "running");
    if (runningJobs.length === 0) return;

    let pollInterval = 6000;
    let active = true;

    const pollActiveJobs = async () => {
      try {
        const updated = await Promise.all(
          runningJobs.map(async (job) => {
            try {
              return await adaptionApi.getJob(job.id);
            } catch {
              return job;
            }
          })
        );

        if (!active) return;

        setJobs((prevJobs) =>
          prevJobs.map((j) => {
            const up = updated.find((u) => u.id === j.id);
            return up || j;
          })
        );

        const stillRunning = updated.some((j) => j.status === "running");
        if (stillRunning && active) {
          pollInterval = Math.min(pollInterval + 2000, 15000);
          pollTimerRef.current = setTimeout(pollActiveJobs, pollInterval);
        }
      } catch (err) {
        console.error("Polling error:", err);
      }
    };

    pollTimerRef.current = setTimeout(pollActiveJobs, pollInterval);

    return () => {
      active = false;
      if (pollTimerRef.current) clearTimeout(pollTimerRef.current);
    };
  }, [jobs]);

  // Action: Estimate Run
  const handleEstimate = async () => {
    if (!selectedDatasetId) {
      setErrorMessage("Please select an active dataset before requesting an estimate.");
      return;
    }
    if (!hasConsented) {
      setErrorMessage("Please review and acknowledge the external data transfer notice before estimating.");
      return;
    }

    setErrorMessage(null);
    setSuccessMessage(null);
    setIsEstimating(true);

    try {
      const res = await adaptionApi.estimate({
        dataset_id: selectedDatasetId,
        max_rows: maxRows,
        column_mapping: {
          prompt: "instruction",
          context: ["input"],
        },
      });
      setEstimateResult(res);
      setSuccessMessage("Live cost and time quote received from Adaption Labs.");
      fetchStatusAndJobs();
    } catch (err: any) {
      console.error("Estimate failed:", err);
      setErrorMessage(
        err?.message ||
          "Estimate failed. If daily quota is reached or operations are unavailable, see status above."
      );
      fetchStatusAndJobs();
    } finally {
      setIsEstimating(false);
    }
  };

  // Action: Start Actual Run
  const handleStartRun = async () => {
    if (!selectedDatasetId) {
      setErrorMessage("Please select an active dataset first.");
      return;
    }
    if (!hasConsented) {
      setErrorMessage("Please acknowledge the data transfer and credit usage notice.");
      return;
    }

    setShowConfirmModal(false);
    setErrorMessage(null);
    setSuccessMessage(null);
    setIsStartingJob(true);

    try {
      const job = await adaptionApi.startJob({
        dataset_id: selectedDatasetId,
        column_mapping: {
          prompt: "instruction",
          context: ["input"],
        },
        job_specification: {
          max_rows: maxRows,
        },
      });

      setSuccessMessage(`Support dataset pipeline job launched: #${job.id}. Tracking live progress...`);
      fetchStatusAndJobs();
    } catch (err: any) {
      console.error("Start run failed:", err);
      setErrorMessage(
        err?.message ||
          "Could not launch Adaption pipeline. Please check connection status and remaining quota."
      );
      fetchStatusAndJobs();
    } finally {
      setIsStartingJob(false);
    }
  };

  const handleRefreshJobs = async () => {
    setIsLoadingJobs(true);
    try {
      const freshJobs = await adaptionApi.listJobs();
      setJobs(freshJobs);
      const st = await adaptionApi.getStatus().catch(() => null);
      if (st) setStatusInfo(st);
    } catch (err: any) {
      console.error("Refresh jobs failed:", err);
    } finally {
      setIsLoadingJobs(false);
    }
  };

  // Action: Download Output File
  const handleDownloadOutput = async (jobId: string) => {
    setDownloadingJobId(jobId);
    setErrorMessage(null);
    setSuccessMessage(null);
    try {
      await adaptionApi.downloadJobOutput(jobId, `insightflow_adapted_${jobId}.csv`, "csv");
      setSuccessMessage(`Dataset for job #${jobId} downloaded successfully.`);
    } catch (err: any) {
      setSuccessMessage(null);
      setErrorMessage(err?.message || "Failed to download adapted dataset artifact.");
    } finally {
      setDownloadingJobId(null);
    }
  };

  const isOperationsReady =
    statusState === "ready" &&
    statusInfo?.configured === true &&
    statusInfo?.api_key_set === true &&
    statusInfo?.public_operations_enabled === true;

  const hasEstimateQuota =
    statusInfo?.daily_estimates_remaining === null ||
    statusInfo?.daily_estimates_remaining === undefined ||
    statusInfo.daily_estimates_remaining > 0;

  const hasRunQuota =
    statusInfo?.daily_runs_remaining === null ||
    statusInfo?.daily_runs_remaining === undefined ||
    statusInfo.daily_runs_remaining > 0;

  const canEstimate = isOperationsReady && hasEstimateQuota;
  const canRun = isOperationsReady && hasRunQuota;

  return (
    <div className="flex flex-col min-h-screen bg-[var(--canvas)]">
      <AppHeader
        title="Adaption Lab"
        subtitle="Adaptive Data Ingestion & Support Assistant Alignment"
        actions={
          <button
            onClick={fetchStatusAndJobs}
            disabled={statusState === "checking"}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-[var(--border-subtle)] text-xs font-semibold rounded-xl text-[var(--ink)] hover:bg-[#F2F4F6] transition-colors focus-visible-ring cursor-pointer disabled:opacity-50"
          >
            <RotateCw className={`w-3.5 h-3.5 ${statusState === "checking" ? "animate-spin" : ""}`} />
            <span>Check Status</span>
          </button>
        }
      />

      <div className="p-4 sm:p-6 lg:py-4 lg:px-8 max-w-7xl mx-auto w-full space-y-4">
        {/* =========================================================================
            HEADER & REAL INTEGRATION STATUS (Compact First-Viewport Bar)
            ========================================================================= */}
        <div className="p-3.5 sm:py-3 sm:px-5 rounded-2xl bg-white border border-[var(--border-subtle)] shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="space-y-0.5">
            <div className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-[var(--brand)] font-mono">
              <Sparkles className="w-3.5 h-3.5" />
              <span>ADAPTION LABS · SUPPORT DATA WORKFLOW</span>
            </div>
            <h1 className="text-lg sm:text-xl font-extrabold text-[var(--ink)] tracking-tight">
              Turn customer feedback into support-training data
            </h1>
            <p className="text-[11px] text-[var(--ink-secondary)] max-w-2xl leading-tight">
              Select a feedback sample, estimate usage with Adaption Labs, then launch adaptation and download the resulting dataset when complete.
            </p>
          </div>

          <div className="flex flex-col items-start md:items-end gap-1 shrink-0">
            <div className="flex items-center gap-2">
              <span
                className={`text-[11px] font-mono font-bold px-3 py-0.5 rounded-full border inline-flex items-center gap-1.5 ${
                  isOperationsReady
                    ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                    : statusState === "unreachable"
                    ? "bg-rose-50 text-rose-800 border-rose-200"
                    : "bg-amber-50 text-amber-800 border-amber-200"
                }`}
              >
                {statusState === "ready" && (
                  <>
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                    <span>CONNECTION ACTIVE</span>
                  </>
                )}
                {statusState === "checking" && (
                  <>
                    <RotateCw className="w-3.5 h-3.5 animate-spin" />
                    <span>CHECKING STATUS</span>
                  </>
                )}
                {statusState === "key_missing" && (
                  <>
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                    <span>KEY NOT CONFIGURED</span>
                  </>
                )}
                {statusState === "operations_disabled" && (
                  <>
                    <Lock className="w-3.5 h-3.5 text-amber-600" />
                    <span>OPERATIONS DISABLED</span>
                  </>
                )}
                {statusState === "unreachable" && (
                  <>
                    <ShieldAlert className="w-3.5 h-3.5 text-rose-600" />
                    <span>BACKEND OFFLINE</span>
                  </>
                )}
              </span>
            </div>

            <div className="text-[10px] font-mono text-[var(--ink-muted)]">
              {statusInfo?.daily_runs_remaining !== undefined && statusInfo?.daily_runs_remaining !== null ? (
                <span>
                  Quota: <strong className="text-[var(--ink)]">{statusInfo.daily_runs_remaining}/{statusInfo.daily_runs_limit ?? 3}</strong> runs · <strong className="text-[var(--ink)]">{statusInfo.daily_estimates_remaining ?? 0}/{statusInfo.daily_estimates_limit ?? 10}</strong> estimates remaining today (UTC)
                </span>
              ) : (
                <span>Pre-configured service</span>
              )}
            </div>
          </div>
        </div>

        {/* Global Feedback Banners */}
        {errorMessage && (
          <div className="p-3.5 rounded-2xl bg-red-50 border border-red-200 text-xs text-red-700 flex items-start gap-2.5 shadow-xs">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-red-600" />
            <div className="space-y-0.5">
              <strong className="block font-bold">Action Notice:</strong>
              <div>{errorMessage}</div>
            </div>
          </div>
        )}

        {successMessage && (
          <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 flex items-start gap-2.5 shadow-xs">
            <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-emerald-600" />
            <div>{successMessage}</div>
          </div>
        )}

        {/* =========================================================================
            BALANCED FIRST-VIEWPORT 2-COLUMN WORKFLOW
            Left (7 cols): Prepare Run & Actions | Right (5 cols): Estimate & Recent Runs
            ========================================================================= */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
          {/* ---------------------------------------------------------------------
              LEFT COLUMN: STEP 1 SOURCE & SAFETY BOUND
              --------------------------------------------------------------------- */}
          <div className="lg:col-span-7 space-y-4">
            <div className="p-5 sm:p-5.5 rounded-2xl bg-white border border-[var(--border-subtle)] shadow-xs space-y-3.5">
              <div>
                <div className="text-[10px] font-bold uppercase tracking-wider text-[var(--brand)] font-mono">
                  STEP 1 · SOURCE &amp; SAFETY BOUND
                </div>
                <h2 className="text-sm sm:text-base font-bold text-[var(--ink)] mt-0.5">
                  Prepare feedback sample
                </h2>
                <p className="text-[11px] text-[var(--ink-muted)]">
                  Bound source dataset rows for support assistant alignment
                </p>
              </div>

              {/* Source Dataset Summary */}
              <div className="p-3.5 rounded-xl bg-[#F6F5F1] border border-[var(--border-subtle)] space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-[var(--ink)] flex items-center gap-1.5">
                    <Database className="w-3.5 h-3.5 text-[var(--brand)]" />
                    Selected Workspace Dataset:
                  </span>
                  <span className="font-mono text-[11px] text-[var(--ink-muted)]">
                    {selectedDatasetId || "None"}
                  </span>
                </div>
                {selectedDataset ? (
                  <div className="text-xs text-[var(--ink-secondary)]">
                    <strong>{selectedDataset.name}</strong> • {selectedDataset.row_count.toLocaleString()} valid rows ingested
                  </div>
                ) : (
                  <div className="text-xs text-amber-700">
                    No active dataset selected. Select one in the top header selector.
                  </div>
                )}
              </div>

              {/* Row Cap Selector */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <label className="font-bold text-[var(--ink)]">
                    Sample limit:
                  </label>
                  <span className="font-mono text-[var(--brand)] font-bold text-[11px]">
                    {maxRows} rows maximum
                  </span>
                </div>

                <div className="grid grid-cols-4 gap-2">
                  {[100, 250, 500, 1000].map((rows) => (
                    <button
                      key={rows}
                      type="button"
                      onClick={() => setMaxRows(rows)}
                      className={`py-1.5 px-3 rounded-xl text-xs font-mono font-bold transition-all focus-visible-ring cursor-pointer ${
                        maxRows === rows
                          ? "bg-[var(--brand)] text-white shadow-xs"
                          : "bg-[#F6F5F1] text-[var(--ink)] hover:bg-[#EAE8E2] border border-[var(--border-subtle)]"
                      }`}
                    >
                      {rows} rows
                    </button>
                  ))}
                </div>
                <p className="text-[10px] text-[var(--ink-muted)]">
                  Bounded to 1,000 rows maximum to ensure predictable execution.
                </p>
              </div>

              {/* Task Blueprint Preview */}
              <div className="p-3 rounded-xl bg-[#F6F5F1] border border-[var(--border-subtle)] space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase font-mono text-[var(--ink-muted)]">
                    Task Blueprint (Support Assistant Alignment)
                  </span>
                  <span className="text-[10px] font-mono text-[var(--brand)]">Prompt + Context</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  <div className="p-2.5 bg-white rounded-lg border border-[var(--border-subtle)]">
                    <span className="text-[9px] font-bold uppercase font-mono text-[var(--brand)] block">
                      prompt
                    </span>
                    <div className="text-[11px] font-medium text-[var(--ink)] mt-0.5 leading-snug">
                      "Write a concise, empathetic customer-support resolution"
                    </div>
                  </div>
                  <div className="p-2.5 bg-white rounded-lg border border-[var(--border-subtle)]">
                    <span className="text-[9px] font-bold uppercase font-mono text-[#7C3AED] block">
                      context
                    </span>
                    <div className="text-[11px] font-medium text-[var(--ink)] mt-0.5 leading-snug">
                      Verbatim feedback quote + source category
                    </div>
                  </div>
                </div>
              </div>

              {/* Data Transfer & Consent Notice */}
              <div className="p-3.5 rounded-xl bg-[#FAF5E8] border border-amber-200/80 space-y-2">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-700 shrink-0 mt-0.5" />
                  <div className="space-y-0.5 text-xs text-amber-950 leading-relaxed">
                    <div className="font-bold text-[11px]">
                      Data Transfer Notice
                    </div>
                    <p className="text-[10px] text-amber-800 leading-snug">
                      Selected feedback rows (up to {maxRows}) will be sent to Adaption Labs for processing. An estimate evaluates the sample for credit and runtime forecasting without starting the adaptation run.
                    </p>
                  </div>
                </div>

                <label className="flex items-start gap-2 pt-1.5 border-t border-amber-200 text-xs text-amber-950 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={hasConsented}
                    onChange={(e) => setHasConsented(e.target.checked)}
                    className="mt-0.5 h-3.5 w-3.5 rounded border-amber-300 text-[var(--brand)] focus:ring-[var(--brand)]"
                  />
                  <span className="text-[11px] font-medium leading-tight">
                    I understand that up to {maxRows} feedback rows will be sent to Adaption Labs for processing.
                  </span>
                </label>
              </div>

              {/* Action Buttons */}
              <div className="pt-1 flex flex-col sm:flex-row gap-2.5">
                <button
                  type="button"
                  onClick={handleEstimate}
                  disabled={isEstimating || !selectedDatasetId || !hasConsented || !canEstimate}
                  className="flex-1 py-2.5 px-4 bg-white border border-[var(--border-strong)] hover:border-[var(--brand)] text-[var(--ink)] text-xs font-bold rounded-xl transition-all shadow-xs flex items-center justify-center gap-2 focus-visible-ring disabled:opacity-50 cursor-pointer"
                >
                  {statusInfo?.daily_estimates_remaining === 0 ? (
                    <>
                      <Coins className="w-3.5 h-3.5 text-amber-600" />
                      <span>No estimates remaining today</span>
                    </>
                  ) : isEstimating ? (
                    <>
                      <RotateCw className="w-3.5 h-3.5 animate-spin text-[var(--brand)]" />
                      <span>Querying Estimate...</span>
                    </>
                  ) : (
                    <>
                      <Coins className="w-3.5 h-3.5 text-[var(--brand)]" />
                      <span>Estimate Cost &amp; Time</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => setShowConfirmModal(true)}
                  disabled={isStartingJob || !selectedDatasetId || !hasConsented || !canRun}
                  className="flex-1 py-2.5 px-4 bg-[var(--brand)] hover:bg-[var(--brand-hover)] text-white text-xs font-bold rounded-xl transition-all shadow-md flex items-center justify-center gap-2 focus-visible-ring disabled:opacity-50 cursor-pointer"
                >
                  {statusInfo?.daily_runs_remaining === 0 ? (
                    <>
                      <Play className="w-3.5 h-3.5 fill-current opacity-50" />
                      <span>No runs remaining today</span>
                    </>
                  ) : isStartingJob ? (
                    <>
                      <RotateCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Launching Run...</span>
                    </>
                  ) : (
                    <>
                      <Play className="w-3.5 h-3.5 fill-current" />
                      <span>Run with Adaption Labs</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* ---------------------------------------------------------------------
              RIGHT COLUMN: STEP 2 ESTIMATE & STEP 3 RECENT ACTIVITY LEDGER
              --------------------------------------------------------------------- */}
          <div className="lg:col-span-5 space-y-4">
            {/* Computation Forecast Card */}
            <div className="p-5 rounded-2xl bg-white border border-[var(--border-subtle)] shadow-xs space-y-3.5">
              <div>
                <div className="text-[10px] font-bold uppercase tracking-wider text-[var(--ink-muted)] font-mono">
                  STEP 2 · USAGE ESTIMATE
                </div>
                <h3 className="text-sm sm:text-base font-bold text-[var(--ink)] mt-0.5">
                  Computation forecast
                </h3>
                <p className="text-[11px] text-[var(--ink-muted)]">
                  Live pre-flight quote returned by Adaption Labs
                </p>
              </div>

              {estimateResult ? (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-2.5">
                    <div className="p-3.5 rounded-xl bg-[#E9EDFC] border border-[var(--brand)]/20">
                      <span className="text-[9px] font-bold uppercase font-mono text-[var(--brand)] block">
                        Estimated Credits
                      </span>
                      <div className="text-xl sm:text-2xl font-extrabold text-[var(--brand)] mt-0.5 font-mono">
                        {estimateResult.estimated_credits !== null && estimateResult.estimated_credits !== undefined
                          ? estimateResult.estimated_credits.toFixed(1)
                          : "N/A"}
                      </div>
                      <span className="text-[9px] text-[var(--ink-muted)]">
                        Adaption compute units
                      </span>
                    </div>

                    <div className="p-3.5 rounded-xl bg-[#FAF5E8] border border-amber-200">
                      <span className="text-[9px] font-bold uppercase font-mono text-amber-800 block">
                        Estimated Minutes
                      </span>
                      <div className="text-xl sm:text-2xl font-extrabold text-amber-900 mt-0.5 font-mono">
                        {estimateResult.estimated_minutes !== null && estimateResult.estimated_minutes !== undefined
                          ? `~${estimateResult.estimated_minutes.toFixed(1)}m`
                          : "N/A"}
                      </div>
                      <span className="text-[9px] text-[var(--ink-muted)]">
                        Expected runtime
                      </span>
                    </div>
                  </div>

                  <div className="p-2.5 bg-[#F6F5F1] rounded-xl border border-[var(--border-subtle)] text-[11px] text-[var(--ink-secondary)] space-y-1">
                    <div className="flex justify-between">
                      <span className="text-[var(--ink-muted)]">Job:</span>
                      <span className="font-mono font-bold text-[var(--ink)]">{estimateResult.local_job_id}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[var(--ink-muted)]">Sample Bound:</span>
                      <span className="font-mono text-[var(--ink)]">{maxRows} rows</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[var(--ink-muted)]">Quote Timestamp:</span>
                      <span className="font-mono text-[var(--ink)]">
                        {new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
                      </span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-5 text-center bg-[#F6F5F1] rounded-xl border border-dashed border-[var(--border-strong)] space-y-1.5">
                  <Coins className="w-6 h-6 text-[var(--ink-muted)] mx-auto opacity-40" />
                  <div className="text-xs font-bold text-[var(--ink)]">
                    No quote requested yet
                  </div>
                  <p className="text-[11px] text-[var(--ink-muted)] max-w-xs mx-auto leading-relaxed">
                    Getting an estimate uploads the bounded sample CSV to Adaption Labs for quote analysis, but does not start the adaptation run or consume adaptation run quota.
                  </p>
                </div>
              )}
            </div>

            {/* Recent Activity Ledger Card */}
            <div className="p-5 rounded-2xl bg-white border border-[var(--border-subtle)] shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-[10px] font-bold uppercase tracking-wider text-[var(--ink-muted)] font-mono">
                    STEP 3 · RUN ACTIVITY
                  </div>
                  <h3 className="text-sm sm:text-base font-bold text-[var(--ink)] mt-0.5">
                    Recent pipeline runs ({jobs.length})
                  </h3>
                </div>

                <button
                  type="button"
                  onClick={handleRefreshJobs}
                  disabled={isLoadingJobs}
                  className="p-1.5 rounded-lg text-[var(--ink-muted)] hover:bg-[#F2F4F6] transition-colors cursor-pointer"
                  title="Refresh activity"
                >
                  <RotateCw className={`w-3.5 h-3.5 ${isLoadingJobs ? "animate-spin" : ""}`} />
                </button>
              </div>

              {jobs.length === 0 ? (
                <div className="p-5 text-center bg-[#F6F5F1] rounded-xl border border-dashed border-[var(--border-strong)] space-y-1">
                  <Cpu className="w-6 h-6 text-[var(--ink-muted)] mx-auto opacity-40" />
                  <div className="text-xs font-bold text-[var(--ink)]">
                    No runs recorded yet
                  </div>
                  <p className="text-[11px] text-[var(--ink-muted)]">
                    Launch an estimate or pipeline run to see tracking records here.
                  </p>
                </div>
              ) : (
                <div className="space-y-2 max-h-[340px] overflow-y-auto pr-1">
                  {jobs.slice(0, 5).map((job) => {
                    const isSuccess = job.status === "succeeded";
                    const isRunning = job.status === "running";
                    const isEstimate = job.operation_type === "estimate";

                    return (
                      <div
                        key={job.id}
                        onClick={() => setSelectedJob(job)}
                        className="p-3 rounded-xl bg-[#F6F5F1] hover:bg-[#EDEBE5] border border-[var(--border-subtle)] space-y-1.5 cursor-pointer transition-all group"
                      >
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-mono font-bold text-[var(--ink)]">
                            #{job.id}
                          </span>
                          <span
                            className={`inline-flex items-center gap-1 text-[10px] font-bold font-mono px-2 py-0.5 rounded-full border ${
                              isSuccess
                                ? isEstimate
                                  ? "bg-sky-50 text-sky-700 border-sky-200"
                                  : "bg-emerald-50 text-emerald-700 border-emerald-200"
                                : isRunning
                                ? "bg-blue-50 text-blue-700 border-blue-200 animate-pulse"
                                : "bg-red-50 text-red-700 border-red-200"
                            }`}
                          >
                            {isRunning && <RotateCw className="w-2.5 h-2.5 animate-spin" />}
                            {formatJobStatus(job.status, job.operation_type)}
                          </span>
                        </div>

                        <div className="flex items-center justify-between text-[11px] text-[var(--ink-muted)]">
                          <span className="font-mono">
                            {job.operation_type === "adapt" ? "Adaptation Run" : "Cost Estimate"}
                            {job.job_specification?.max_rows ? ` · ${job.job_specification.max_rows} rows` : ""}
                          </span>
                          <span className="font-mono font-medium text-[var(--ink)]">
                            {job.estimated_credits !== null && job.estimated_credits !== undefined
                              ? `${job.estimated_credits.toFixed(1)} cr`
                              : "—"}
                          </span>
                        </div>

                        <div className="pt-1 border-t border-[var(--border-subtle)] flex items-center justify-between text-[11px]">
                          <span className="text-[var(--ink-muted)] font-mono text-[10px]">
                            {new Date(job.created_at).toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>

                          <div className="flex items-center gap-2">
                            {job.operation_type === "adapt" && isSuccess && job.output_download_available && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDownloadOutput(job.id);
                                }}
                                disabled={downloadingJobId === job.id}
                                className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-[#E8F3EE] hover:bg-[#D5EAE0] text-[#2E7D68] text-[10px] font-bold font-mono transition-colors"
                              >
                                <Download className="w-3 h-3" />
                                <span>{downloadingJobId === job.id ? "Downloading..." : "Download CSV"}</span>
                              </button>
                            )}
                            <span className="text-[var(--brand)] font-semibold group-hover:underline flex items-center gap-0.5">
                              Details →
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* =========================================================================
          CONFIRMATION MODAL FOR ACTUAL ADAPTION RUN
          ========================================================================= */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true">
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-xs transition-opacity"
            onClick={() => setShowConfirmModal(false)}
          />

          <div className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl p-6 sm:p-7 space-y-5 z-10 border border-[var(--border-subtle)] animate-in fade-in zoom-in-95 duration-200">
            <div className="w-12 h-12 rounded-2xl bg-[var(--brand-soft)] text-[var(--brand)] flex items-center justify-center mx-auto">
              <Sparkles className="w-6 h-6" />
            </div>

            <div className="text-center space-y-1.5">
              <h3 className="text-base font-bold text-[var(--ink)]">
                Launch Adaption Pipeline Run?
              </h3>
              <p className="text-xs text-[var(--ink-secondary)] leading-relaxed">
                This will submit a bounded extraction ({maxRows} rows maximum) to Adaption Labs for processing.
              </p>
            </div>

            <div className="p-3.5 bg-[#F6F5F1] rounded-2xl border border-[var(--border-subtle)] space-y-1.5 text-xs">
              <div className="flex justify-between">
                <span className="text-[var(--ink-muted)]">Target Dataset:</span>
                <span className="font-bold text-[var(--ink)] truncate max-w-[200px]">
                  {selectedDataset?.name || selectedDatasetId}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-[var(--ink-muted)]">Safety Row Cap:</span>
                <span className="font-mono font-bold text-[var(--brand)]">{maxRows} rows</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[var(--ink-muted)]">Estimated Usage:</span>
                <span className="font-mono text-[var(--ink)]">
                  {estimateResult?.estimated_credits !== undefined && estimateResult?.estimated_credits !== null
                    ? `${estimateResult.estimated_credits.toFixed(1)} cr`
                    : "Standard run"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-[var(--ink-muted)]">Daily Runs Remaining:</span>
                <span className="font-mono font-bold text-[#2E7D68]">
                  {statusInfo?.daily_runs_remaining ?? 3} / {statusInfo?.daily_runs_limit ?? 3}
                </span>
              </div>
            </div>

            <p className="text-[11px] text-amber-900 bg-[#FAF5E8] p-3 rounded-xl border border-amber-200 leading-relaxed">
              This action transmits selected data to Adaption Labs and consumes provider compute credits.
            </p>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setShowConfirmModal(false)}
                className="flex-1 py-2.5 bg-[#F6F5F1] hover:bg-[#EAE8E2] text-[var(--ink)] text-xs font-semibold rounded-xl transition-colors focus-visible-ring cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleStartRun}
                className="flex-1 py-2.5 bg-[var(--brand)] hover:bg-[var(--brand-hover)] text-white text-xs font-bold rounded-xl shadow-sm transition-colors focus-visible-ring cursor-pointer"
              >
                Confirm &amp; Launch
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          SLIDE-OVER JOB DOSSIER INSPECTION DRAWER
          ========================================================================= */}
      {selectedJob && (
        <div className="fixed inset-0 z-50 flex justify-end" role="dialog" aria-modal="true">
          <div
            className="fixed inset-0 bg-black/40 backdrop-blur-xs transition-opacity"
            onClick={() => setSelectedJob(null)}
          />

          <div className="relative w-full max-w-md bg-white h-full shadow-2xl p-6 sm:p-8 flex flex-col justify-between z-10 animate-in slide-in-from-right duration-250">
            <div className="space-y-5 overflow-y-auto pr-1">
              <div className="flex items-center justify-between pb-4 border-b border-[var(--border-subtle)]">
                <div>
                  <div className="text-[10px] font-bold uppercase tracking-wider text-[var(--ink-muted)] font-mono">
                    Adaption Job Details
                  </div>
                  <h3 className="text-base font-extrabold text-[var(--ink)] font-mono">
                    #{selectedJob.id}
                  </h3>
                </div>
                <button
                  onClick={() => setSelectedJob(null)}
                  className="w-8 h-8 rounded-full bg-[#F6F5F1] hover:bg-[#EAE8E2] text-[var(--ink)] flex items-center justify-center font-bold text-sm cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-3">
                <div className="p-3.5 bg-[#F6F5F1] rounded-2xl border border-[var(--border-subtle)] space-y-1">
                  <div className="text-[10px] font-bold uppercase font-mono text-[var(--ink-muted)]">
                    Operation &amp; Status
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold uppercase text-[var(--ink)]">
                      {selectedJob.operation_type === "adapt" ? "Adaptation Pipeline Run" : "Cost & Time Estimate"}
                    </span>
                    <span className="font-mono text-xs font-bold text-[var(--brand)]">
                      {formatJobStatus(selectedJob.status, selectedJob.operation_type)}
                    </span>
                  </div>
                </div>

                <div className="p-3.5 bg-[#F6F5F1] rounded-2xl border border-[var(--border-subtle)] space-y-1">
                  <div className="text-[10px] font-bold uppercase font-mono text-[var(--ink-muted)]">
                    Resource Forecast
                  </div>
                  <div className="text-xs font-mono space-y-1 text-[var(--ink)]">
                    <div>Estimated Credits: {selectedJob.estimated_credits !== null && selectedJob.estimated_credits !== undefined ? selectedJob.estimated_credits.toFixed(1) : "N/A"}</div>
                    <div>Estimated Minutes: {selectedJob.estimated_minutes !== null && selectedJob.estimated_minutes !== undefined ? selectedJob.estimated_minutes.toFixed(1) : "N/A"}</div>
                  </div>
                </div>

                {selectedJob.operation_type === "estimate" && selectedJob.status === "succeeded" && (
                  <div className="p-3.5 bg-sky-50 rounded-2xl border border-sky-200/80 space-y-1">
                    <div className="text-xs font-bold text-sky-900 flex items-center gap-1.5">
                      <Coins className="w-4 h-4 text-sky-600" />
                      <span>Quote Forecast Received</span>
                    </div>
                    <p className="text-[10px] text-sky-800 leading-snug">
                      This job generated a pre-flight compute estimate. No dataset adaptation run was initiated.
                    </p>
                  </div>
                )}

                {selectedJob.operation_type === "adapt" && selectedJob.output_download_available && (
                  <div className="p-3.5 bg-[#E8F3EE] rounded-2xl border border-[#2E7D68]/30 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-[#166534] flex items-center gap-1.5">
                        <CheckCircle2 className="w-4 h-4 text-[#16a34a]" />
                        Adapted Output Ready
                      </span>
                      <button
                        type="button"
                        onClick={() => handleDownloadOutput(selectedJob.id)}
                        disabled={downloadingJobId === selectedJob.id}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#2E7D68] text-white text-xs font-bold hover:bg-[#256856] transition-colors cursor-pointer"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>{downloadingJobId === selectedJob.id ? "Downloading..." : "Download CSV"}</span>
                      </button>
                    </div>
                    <p className="text-[10px] text-[#2E7D68]">
                      Processed dataset available for download.
                    </p>
                  </div>
                )}

                {selectedJob.error_message && (
                  <div className="p-3.5 bg-red-50 rounded-2xl border border-red-200 text-xs text-red-700 space-y-1">
                    <strong className="block text-red-800 font-bold">Execution Error:</strong>
                    <div className="font-mono text-[11px] leading-relaxed break-words">
                      {selectedJob.error_message}
                    </div>
                  </div>
                )}

                {/* Collapsible Technical Details for Troubleshooting */}
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={() => setShowTechnicalDetails(!showTechnicalDetails)}
                    className="w-full flex items-center justify-between text-xs text-[var(--ink-muted)] font-semibold p-2 hover:bg-[#F6F5F1] rounded-xl transition-colors cursor-pointer"
                  >
                    <span>Technical Details (IDs &amp; Mappings)</span>
                    {showTechnicalDetails ? (
                      <ChevronDown className="w-4 h-4" />
                    ) : (
                      <ChevronRight className="w-4 h-4" />
                    )}
                  </button>

                  {showTechnicalDetails && (
                    <div className="p-3 bg-[#F6F5F1] rounded-2xl border border-[var(--border-subtle)] space-y-2 mt-2 text-xs">
                      <div className="font-mono text-[11px] space-y-1 text-[var(--ink)]">
                        <div>Adaption Dataset ID: {selectedJob.adaption_dataset_id || "None"}</div>
                        <div>Adaption Run ID: {selectedJob.adaption_run_id || "None"}</div>
                      </div>
                      <div className="pt-1 border-t border-[var(--border-subtle)]">
                        <span className="text-[10px] font-bold uppercase font-mono text-[var(--ink-muted)] block">
                          Column Mapping:
                        </span>
                        <pre className="text-[10px] font-mono text-[var(--ink-secondary)] overflow-x-auto mt-1">
                          {JSON.stringify(selectedJob.column_mapping, null, 2)}
                        </pre>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-[var(--border-subtle)]">
              <button
                type="button"
                onClick={() => setSelectedJob(null)}
                className="w-full py-2.5 bg-[#F6F5F1] hover:bg-[#EAE8E2] text-[var(--ink)] text-xs font-semibold rounded-xl transition-colors cursor-pointer"
              >
                Close Details
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
