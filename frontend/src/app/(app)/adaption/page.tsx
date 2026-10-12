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
  X,
  ChevronDown,
  ChevronRight,
  Database,
  Info,
  Clock,
  ArrowRight,
} from "lucide-react";

type StatusState =
  | "checking"
  | "ready"
  | "key_missing"
  | "operations_disabled"
  | "unreachable";

// Human-readable status mapping
const formatJobStatus = (status: string, operationType?: string) => {
  if (operationType === "estimate" && status?.toLowerCase() === "succeeded") {
    return "Quote received";
  }
  switch (status?.toLowerCase()) {
    case "succeeded":
      return "Completed";
    case "pending":
    case "queued":
      return "Queued";
    case "running":
      return "Processing";
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

  // UI disclosure states
  const [showDataDisclosure, setShowDataDisclosure] = useState(false);
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

  // Bounded polling for running jobs
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
      setErrorMessage("Please select a dataset before requesting an estimate.");
      return;
    }
    if (!hasConsented) {
      setErrorMessage("Please check the consent box in Step 1 before estimating.");
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
      setSuccessMessage("Cost and time quote received from Adaption Labs. Proceed to Step 3 to process.");
      fetchStatusAndJobs();
    } catch (err: any) {
      console.error("Estimate failed:", err);
      setErrorMessage(
        err?.message ||
          "Could not obtain estimate. Processing may be temporarily unavailable."
      );
      fetchStatusAndJobs();
    } finally {
      setIsEstimating(false);
    }
  };

  // Action: Start Actual Run
  const handleStartRun = async () => {
    if (!selectedDatasetId) {
      setErrorMessage("Please select a dataset first.");
      return;
    }
    if (!hasConsented) {
      setErrorMessage("Please check the consent box in Step 1 before processing.");
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

      setSuccessMessage(`Processing started for your ${maxRows}-row sample (Job #${job.id}). Tracking live progress below...`);
      fetchStatusAndJobs();
    } catch (err: any) {
      console.error("Start run failed:", err);
      setErrorMessage(
        err?.message ||
          "Could not start processing. Please check remaining quota and connection status."
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
      setErrorMessage(err?.message || "Failed to download adapted dataset.");
    } finally {
      setDownloadingJobId(null);
    }
  };

  // Derived readiness and action-specific availability
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

  // Find latest adapt job for selected dataset
  const activeDatasetJobs = jobs.filter((j) => j.dataset_id === selectedDatasetId);
  const latestAdaptJob = activeDatasetJobs.find((j) => j.operation_type === "adapt") || jobs.find((j) => j.operation_type === "adapt");

  const totalDatasetRows = selectedDataset?.row_count ?? 0;

  return (
    <div className="flex flex-col min-h-screen bg-[var(--canvas)]">
      <AppHeader
        title="Support training data"
        subtitle="Processing by Adaption Labs"
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

      <div className="p-4 sm:p-6 lg:py-5 lg:px-8 max-w-7xl mx-auto w-full space-y-5">
        {/* =========================================================================
            TOP VALUE PROPOSITION & SEPARATE CONNECTION / QUOTA STATUS BAR
            ========================================================================= */}
        <div className="p-4 sm:py-3.5 sm:px-5 rounded-2xl bg-white border border-[var(--border-subtle)] shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="space-y-0.5 max-w-2xl">
            <h1 className="text-base sm:text-lg font-extrabold text-[var(--ink)] tracking-tight">
              Turn customer feedback into support-assistant training data
            </h1>
            <p className="text-xs text-[var(--ink-secondary)] leading-relaxed">
              Choose a sample of customer comments, check estimated cost and time, process with Adaption Labs, and download the training dataset.
            </p>
          </div>

          <div className="flex flex-col items-start md:items-end gap-1 shrink-0 pt-1 md:pt-0 border-t md:border-t-0 border-[var(--border-subtle)]">
            <div className="flex items-center gap-2">
              <span
                className={`text-[11px] font-mono font-bold px-3 py-0.5 rounded-full border inline-flex items-center gap-1.5 ${
                  isOperationsReady
                    ? canEstimate && canRun
                      ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                      : "bg-amber-50 text-amber-800 border-amber-200"
                    : statusState === "unreachable"
                    ? "bg-rose-50 text-rose-800 border-rose-200"
                    : "bg-amber-50 text-amber-800 border-amber-200"
                }`}
              >
                {statusState === "ready" && canEstimate && canRun && (
                  <>
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Connection available</span>
                  </>
                )}
                {statusState === "ready" && (!canEstimate || !canRun) && (
                  <>
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                    <span>
                      {!canRun && canEstimate
                        ? "Estimates available · Run quota reached"
                        : canRun && !canEstimate
                        ? "Runs available · Estimate quota reached"
                        : "Daily quotas reached"}
                    </span>
                  </>
                )}
                {statusState === "checking" && (
                  <>
                    <RotateCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Checking connection…</span>
                  </>
                )}
                {(statusState === "key_missing" || statusState === "operations_disabled" || statusState === "unreachable") && (
                  <>
                    <ShieldAlert className="w-3.5 h-3.5 text-rose-600" />
                    <span>Processing temporarily unavailable</span>
                  </>
                )}
              </span>
            </div>

            <div className="text-[10px] font-mono text-[var(--ink-muted)]">
              {statusInfo?.daily_runs_remaining !== undefined && statusInfo?.daily_runs_remaining !== null ? (
                <span>
                  Remaining today: <strong className="text-[var(--ink)]">{statusInfo.daily_runs_remaining}/{statusInfo.daily_runs_limit ?? 3}</strong> runs · <strong className="text-[var(--ink)]">{statusInfo.daily_estimates_remaining ?? 0}/{statusInfo.daily_estimates_limit ?? 10}</strong> estimates
                </span>
              ) : (
                <span>Checking remaining usage…</span>
              )}
            </div>
          </div>
        </div>

        {/* Action feedback banners */}
        {errorMessage && (
          <div className="p-3.5 rounded-2xl bg-red-50 border border-red-200 text-xs text-red-700 flex items-start gap-2.5 shadow-xs">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-red-600" />
            <div className="space-y-0.5 flex-1">
              <strong className="block font-bold">Notice:</strong>
              <div>{errorMessage}</div>
            </div>
            <button
              onClick={() => setErrorMessage(null)}
              className="text-red-600 hover:text-red-800 p-0.5 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {successMessage && (
          <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 flex items-start gap-2.5 shadow-xs">
            <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-emerald-600" />
            <div className="flex-1">{successMessage}</div>
            <button
              onClick={() => setSuccessMessage(null)}
              className="text-emerald-700 hover:text-emerald-900 p-0.5 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* =========================================================================
            THE 3-STEP WORKFLOW GRID
            Step 1 (Choose Feedback) -> Step 2 (Estimate Cost) -> Step 3 (Process & Download)
            ========================================================================= */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 items-stretch">
          {/* ---------------------------------------------------------------------
              STEP 1: CHOOSE FEEDBACK
              --------------------------------------------------------------------- */}
          <div className="p-5 sm:p-5.5 rounded-2xl bg-white border border-[var(--border-subtle)] shadow-xs flex flex-col justify-between space-y-4">
            <div className="space-y-3.5">
              <div className="flex items-center justify-between pb-2 border-b border-[var(--border-subtle)]">
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-[var(--brand)] text-white text-xs font-bold flex items-center justify-center font-mono">
                    1
                  </span>
                  <h2 className="text-sm font-bold text-[var(--ink)]">
                    Choose feedback
                  </h2>
                </div>
                <span className="text-[10px] font-mono text-[var(--ink-muted)]">Feedback sample</span>
              </div>

              {/* Source dataset selection */}
              <div className="p-3 rounded-xl bg-[#F6F5F1] border border-[var(--border-subtle)] space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-[var(--ink)] flex items-center gap-1.5">
                    <Database className="w-3.5 h-3.5 text-[var(--brand)]" />
                    Selected feedback set:
                  </span>
                  <span className="font-mono text-[10px] text-[var(--ink-muted)] truncate max-w-[120px]">
                    {selectedDatasetId || "None"}
                  </span>
                </div>
                {selectedDataset ? (
                  <div className="text-xs text-[var(--ink-secondary)]">
                    <strong className="text-[var(--ink)]">{selectedDataset.name}</strong>
                    <div className="text-[11px] text-[var(--ink-muted)] mt-0.5">
                      {totalDatasetRows.toLocaleString()} comments available in workspace
                    </div>
                  </div>
                ) : (
                  <div className="text-xs text-amber-700">
                    No active dataset selected. Select one in the top workspace selector.
                  </div>
                )}
              </div>

              {/* Segmented row cap selector */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <label className="font-bold text-[var(--ink)]">
                    Sample limit:
                  </label>
                  <span className="font-mono text-[var(--brand)] font-bold text-[11px]">
                    Sample: {maxRows} of {totalDatasetRows > 0 ? totalDatasetRows.toLocaleString() : "—"} comments
                  </span>
                </div>

                <div className="grid grid-cols-4 gap-1.5">
                  {[100, 250, 500, 1000].map((rows) => (
                    <button
                      key={rows}
                      type="button"
                      onClick={() => setMaxRows(rows)}
                      className={`py-1.5 px-2 rounded-xl text-xs font-mono font-bold transition-all focus-visible-ring cursor-pointer text-center ${
                        maxRows === rows
                          ? "bg-[var(--brand)] text-white shadow-xs"
                          : "bg-[#F6F5F1] text-[var(--ink)] hover:bg-[#EAE8E2] border border-[var(--border-subtle)]"
                      }`}
                    >
                      {rows}
                    </button>
                  ))}
                </div>
                <p className="text-[11px] text-[var(--ink-muted)] leading-tight">
                  Start small to preview cost and processing.
                </p>
              </div>

              {/* Consent Checkbox & Expandable Disclosure */}
              <div className="p-3.5 rounded-xl bg-[#FAF5E8] border border-amber-200/80 space-y-2">
                <label className="flex items-start gap-2.5 text-xs text-amber-950 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={hasConsented}
                    onChange={(e) => setHasConsented(e.target.checked)}
                    className="mt-0.5 h-4 w-4 rounded border-amber-300 text-[var(--brand)] focus:ring-[var(--brand)] cursor-pointer shrink-0"
                  />
                  <span className="text-[11px] font-medium leading-relaxed">
                    I understand that up to {maxRows} feedback rows will be sent to Adaption Labs. An estimate uploads the sample for a quote; processing may use credits.
                  </span>
                </label>

                {/* Inline expandable disclosure */}
                <div className="pt-1 border-t border-amber-200/60">
                  <button
                    type="button"
                    onClick={() => setShowDataDisclosure(!showDataDisclosure)}
                    className="flex items-center gap-1 text-[10px] font-bold text-amber-900 hover:text-amber-950 cursor-pointer"
                  >
                    <Info className="w-3 h-3 text-amber-700" />
                    <span>What gets sent?</span>
                    {showDataDisclosure ? (
                      <ChevronDown className="w-3 h-3 text-amber-700" />
                    ) : (
                      <ChevronRight className="w-3 h-3 text-amber-700" />
                    )}
                  </button>

                  {showDataDisclosure && (
                    <div className="mt-1.5 p-2 bg-white/70 rounded-lg text-[10px] text-amber-900 space-y-1 leading-snug">
                      <p>
                        The feedback text and category label are transferred to generate support-assistant resolution pairs:
                      </p>
                      <ul className="list-disc list-inside pl-1 space-y-0.5 text-amber-800">
                        <li><strong>Prompt:</strong> "Write a concise, empathetic customer-support resolution"</li>
                        <li><strong>Context:</strong> Customer review quote + source category</li>
                      </ul>
                      <p className="text-[9px] text-amber-700 pt-0.5">
                        No customer personal details or payment data are included.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Step 1 Readiness Status */}
            <div className="pt-2 border-t border-[var(--border-subtle)] flex items-center justify-between text-[11px]">
              <span className="text-[var(--ink-muted)]">Step status:</span>
              {hasConsented ? (
                <span className="text-emerald-700 font-bold inline-flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  Ready for Step 2
                </span>
              ) : (
                <span className="text-amber-800 font-medium">Check consent box above</span>
              )}
            </div>
          </div>

          {/* ---------------------------------------------------------------------
              STEP 2: CHECK COST AND TIME
              --------------------------------------------------------------------- */}
          <div className="p-5 sm:p-5.5 rounded-2xl bg-white border border-[var(--border-subtle)] shadow-xs flex flex-col justify-between space-y-4">
            <div className="space-y-3.5">
              <div className="flex items-center justify-between pb-2 border-b border-[var(--border-subtle)]">
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-[var(--brand)] text-white text-xs font-bold flex items-center justify-center font-mono">
                    2
                  </span>
                  <h2 className="text-sm font-bold text-[var(--ink)]">
                    Check cost and time
                  </h2>
                </div>
                <span className="text-[10px] font-mono text-[var(--ink-muted)]">Estimate</span>
              </div>

              <p className="text-xs text-[var(--ink-secondary)] leading-relaxed">
                Uploads this sample to Adaption Labs to return a cost and time estimate. It does not start the full processing run.
              </p>

              {/* Estimate Primary Button */}
              <div className="space-y-1.5">
                <button
                  type="button"
                  onClick={handleEstimate}
                  disabled={isEstimating || !selectedDatasetId || !hasConsented || !canEstimate}
                  className="w-full py-2.5 px-4 bg-white border border-[var(--border-strong)] hover:border-[var(--brand)] text-[var(--ink)] text-xs font-bold rounded-xl transition-all shadow-xs flex items-center justify-center gap-2 focus-visible-ring disabled:opacity-50 cursor-pointer"
                >
                  {statusInfo?.daily_estimates_remaining === 0 ? (
                    <>
                      <Coins className="w-3.5 h-3.5 text-amber-600" />
                      <span>No estimates remaining today</span>
                    </>
                  ) : isEstimating ? (
                    <>
                      <RotateCw className="w-3.5 h-3.5 animate-spin text-[var(--brand)]" />
                      <span>Checking cost and time…</span>
                    </>
                  ) : (
                    <>
                      <Coins className="w-3.5 h-3.5 text-[var(--brand)]" />
                      <span>Check cost &amp; time</span>
                    </>
                  )}
                </button>

                {/* Clear explanation when disabled */}
                {!hasConsented && (
                  <p className="text-[10px] text-amber-800 text-center">
                    Check the consent box in Step 1 to enable estimation.
                  </p>
                )}
                {hasConsented && statusInfo?.daily_estimates_remaining === 0 && (
                  <p className="text-[10px] text-amber-800 text-center">
                    Daily estimate limit reached. Resets at 00:00 UTC.
                  </p>
                )}
                {hasConsented && !isOperationsReady && (
                  <p className="text-[10px] text-rose-800 text-center">
                    Processing is temporarily unavailable. Try again shortly.
                  </p>
                )}
              </div>

              {/* Estimate Result Display */}
              {estimateResult ? (
                <div className="p-3.5 rounded-xl bg-[#E9EDFC] border border-[var(--brand)]/20 space-y-2.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-[var(--brand)] flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Quote received
                    </span>
                    <span className="font-mono text-[10px] text-[var(--ink-muted)]">
                      {new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-center">
                    <div className="p-2.5 bg-white rounded-lg border border-[var(--border-subtle)]">
                      <span className="text-[9px] font-bold uppercase font-mono text-[var(--brand)] block">
                        Estimated Credits
                      </span>
                      <div className="text-lg font-extrabold text-[var(--brand)] font-mono mt-0.5">
                        {estimateResult.estimated_credits !== null && estimateResult.estimated_credits !== undefined
                          ? `${estimateResult.estimated_credits.toFixed(1)} cr`
                          : "Not provided"}
                      </div>
                    </div>

                    <div className="p-2.5 bg-white rounded-lg border border-[var(--border-subtle)]">
                      <span className="text-[9px] font-bold uppercase font-mono text-amber-800 block">
                        Estimated Time
                      </span>
                      <div className="text-lg font-extrabold text-amber-900 font-mono mt-0.5">
                        {estimateResult.estimated_minutes !== null && estimateResult.estimated_minutes !== undefined
                          ? `~${estimateResult.estimated_minutes.toFixed(1)}m`
                          : "Not provided"}
                      </div>
                    </div>
                  </div>

                  <p className="text-[10px] text-[var(--ink-secondary)] text-center leading-snug">
                    Sample of {maxRows} comments evaluated. Proceed to Step 3 to process.
                  </p>
                </div>
              ) : (
                <div className="p-4 text-center bg-[#F6F5F1] rounded-xl border border-dashed border-[var(--border-subtle)] space-y-1">
                  <Coins className="w-5 h-5 text-[var(--ink-muted)] mx-auto opacity-40" />
                  <div className="text-xs font-semibold text-[var(--ink)]">
                    No quote requested yet
                  </div>
                  <p className="text-[11px] text-[var(--ink-muted)] leading-tight">
                    Click "Check cost &amp; time" to check expected credits and runtime.
                  </p>
                </div>
              )}
            </div>

            {/* Step 2 Status */}
            <div className="pt-2 border-t border-[var(--border-subtle)] flex items-center justify-between text-[11px]">
              <span className="text-[var(--ink-muted)]">Step status:</span>
              {estimateResult ? (
                <span className="text-emerald-700 font-bold inline-flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  Quote ready
                </span>
              ) : (
                <span className="text-[var(--ink-muted)]">Optional before Step 3</span>
              )}
            </div>
          </div>

          {/* ---------------------------------------------------------------------
              STEP 3: PROCESS AND DOWNLOAD
              --------------------------------------------------------------------- */}
          <div className="p-5 sm:p-5.5 rounded-2xl bg-white border border-[var(--border-subtle)] shadow-xs flex flex-col justify-between space-y-4">
            <div className="space-y-3.5">
              <div className="flex items-center justify-between pb-2 border-b border-[var(--border-subtle)]">
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-[var(--brand)] text-white text-xs font-bold flex items-center justify-center font-mono">
                    3
                  </span>
                  <h2 className="text-sm font-bold text-[var(--ink)]">
                    Process and download
                  </h2>
                </div>
                <span className="text-[10px] font-mono text-[var(--ink-muted)]">Training data</span>
              </div>

              <p className="text-xs text-[var(--ink-secondary)] leading-relaxed">
                Sends your {maxRows}-row sample to Adaption Labs for processing into customer support training pairs. This operation may consume credits.
              </p>

              {/* Process Primary Button */}
              <div className="space-y-1.5">
                <button
                  type="button"
                  onClick={() => setShowConfirmModal(true)}
                  disabled={isStartingJob || !selectedDatasetId || !hasConsented || !canRun}
                  className="w-full py-2.5 px-4 bg-[var(--brand)] hover:bg-[var(--brand-hover)] text-white text-xs font-bold rounded-xl transition-all shadow-md flex items-center justify-center gap-2 focus-visible-ring disabled:opacity-50 cursor-pointer"
                >
                  {statusInfo?.daily_runs_remaining === 0 ? (
                    <>
                      <Play className="w-3.5 h-3.5 fill-current opacity-50" />
                      <span>No runs remaining today</span>
                    </>
                  ) : isStartingJob ? (
                    <>
                      <RotateCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Launching processing…</span>
                    </>
                  ) : (
                    <>
                      <Play className="w-3.5 h-3.5 fill-current" />
                      <span>Process sample</span>
                    </>
                  )}
                </button>

                {/* Clear explanation when disabled */}
                {!hasConsented && (
                  <p className="text-[10px] text-amber-800 text-center">
                    Check the consent box in Step 1 to enable processing.
                  </p>
                )}
                {hasConsented && statusInfo?.daily_runs_remaining === 0 && (
                  <p className="text-[10px] text-amber-800 text-center">
                    Daily processing limit reached. Resets at 00:00 UTC.
                  </p>
                )}
                {hasConsented && !isOperationsReady && (
                  <p className="text-[10px] text-rose-800 text-center">
                    Processing is temporarily unavailable. Try again shortly.
                  </p>
                )}
              </div>

              {/* Active / Latest Run Status & Download Box */}
              {latestAdaptJob ? (
                <div className={`p-3.5 rounded-xl border space-y-2.5 ${
                  latestAdaptJob.status === "succeeded"
                    ? "bg-[#E8F3EE] border-[#2E7D68]/30"
                    : latestAdaptJob.status === "running"
                    ? "bg-blue-50 border-blue-200"
                    : latestAdaptJob.status === "failed"
                    ? "bg-rose-50 border-rose-200"
                    : "bg-[#F6F5F1] border-[var(--border-subtle)]"
                }`}>
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold flex items-center gap-1.5 text-[var(--ink)]">
                      {latestAdaptJob.status === "succeeded" && <CheckCircle2 className="w-3.5 h-3.5 text-[#16a34a]" />}
                      {latestAdaptJob.status === "running" && <RotateCw className="w-3.5 h-3.5 animate-spin text-blue-600" />}
                      {latestAdaptJob.status === "failed" && <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />}
                      {latestAdaptJob.status === "pending" && <Clock className="w-3.5 h-3.5 text-[var(--ink-muted)]" />}
                      <span>Status: {formatJobStatus(latestAdaptJob.status, latestAdaptJob.operation_type)}</span>
                    </span>

                    <span className="font-mono text-[10px] text-[var(--ink-muted)]">
                      {latestAdaptJob.job_specification?.max_rows ?? maxRows} rows
                    </span>
                  </div>

                  {latestAdaptJob.status === "succeeded" && latestAdaptJob.output_download_available && (
                    <div className="space-y-2 pt-1">
                      <p className="text-[11px] text-[#2E7D68] leading-tight">
                        Processing complete! Your adapted training dataset is ready.
                      </p>
                      <button
                        type="button"
                        onClick={() => handleDownloadOutput(latestAdaptJob.id)}
                        disabled={downloadingJobId === latestAdaptJob.id}
                        className="w-full py-2 px-3 rounded-lg bg-[#2E7D68] hover:bg-[#256856] text-white text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>
                          {downloadingJobId === latestAdaptJob.id ? "Downloading..." : "Download training dataset (CSV)"}
                        </span>
                      </button>
                    </div>
                  )}

                  {latestAdaptJob.status === "running" && (
                    <p className="text-[11px] text-blue-800 leading-tight">
                      Adaption Labs is generating support training pairs… live tracking in progress.
                    </p>
                  )}

                  {latestAdaptJob.status === "failed" && (
                    <p className="text-[11px] text-rose-800 leading-tight">
                      Processing encountered an issue. You can retry with a smaller sample.
                    </p>
                  )}
                </div>
              ) : (
                <div className="p-4 text-center bg-[#F6F5F1] rounded-xl border border-dashed border-[var(--border-subtle)] space-y-1">
                  <Download className="w-5 h-5 text-[var(--ink-muted)] mx-auto opacity-40" />
                  <div className="text-xs font-semibold text-[var(--ink)]">
                    No dataset ready yet
                  </div>
                  <p className="text-[11px] text-[var(--ink-muted)] leading-tight">
                    Click "Process sample" above to generate and download your training dataset.
                  </p>
                </div>
              )}
            </div>

            {/* Step 3 Status */}
            <div className="pt-2 border-t border-[var(--border-subtle)] flex items-center justify-between text-[11px]">
              <span className="text-[var(--ink-muted)]">Step status:</span>
              {latestAdaptJob?.status === "succeeded" ? (
                <span className="text-emerald-700 font-bold inline-flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  Dataset ready
                </span>
              ) : latestAdaptJob?.status === "running" ? (
                <span className="text-blue-700 font-bold inline-flex items-center gap-1">
                  <RotateCw className="w-3.5 h-3.5 animate-spin" />
                  Processing…
                </span>
              ) : (
                <span className="text-[var(--ink-muted)]">Final deliverable</span>
              )}
            </div>
          </div>
        </div>

        {/* =========================================================================
            RECENT ACTIVITY (User-Facing Activity List replacing technical ledger)
            ========================================================================= */}
        <div className="p-5 sm:p-6 rounded-2xl bg-white border border-[var(--border-subtle)] shadow-xs space-y-3.5">
          <div className="flex items-center justify-between pb-2 border-b border-[var(--border-subtle)]">
            <div>
              <h3 className="text-sm sm:text-base font-bold text-[var(--ink)]">
                Recent activity
              </h3>
              <p className="text-[11px] text-[var(--ink-muted)]">
                History of estimates and processing runs for your workspace
              </p>
            </div>

            <button
              type="button"
              onClick={handleRefreshJobs}
              disabled={isLoadingJobs}
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium text-[var(--ink-secondary)] hover:bg-[#F2F4F6] transition-colors cursor-pointer border border-[var(--border-subtle)]"
              title="Refresh activity list"
            >
              <RotateCw className={`w-3 h-3 ${isLoadingJobs ? "animate-spin" : ""}`} />
              <span>Refresh</span>
            </button>
          </div>

          {jobs.length === 0 ? (
            <div className="p-6 text-center bg-[#F6F5F1] rounded-xl border border-dashed border-[var(--border-subtle)] space-y-1.5">
              <Cpu className="w-6 h-6 text-[var(--ink-muted)] mx-auto opacity-40" />
              <div className="text-xs font-bold text-[var(--ink)]">
                No activity yet
              </div>
              <p className="text-[11px] text-[var(--ink-muted)] max-w-sm mx-auto">
                Choose a sample and request an estimate to get started.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {jobs.slice(0, 5).map((job) => {
                const isSuccess = job.status === "succeeded";
                const isRunning = job.status === "running";
                const isEstimate = job.operation_type === "estimate";
                const isAdapt = job.operation_type === "adapt";

                return (
                  <div
                    key={job.id}
                    onClick={() => setSelectedJob(job)}
                    className="p-3.5 rounded-xl bg-[#F6F5F1] hover:bg-[#EAE8E2] border border-[var(--border-subtle)] flex flex-col sm:flex-row sm:items-center justify-between gap-3 cursor-pointer transition-all group"
                  >
                    <div className="flex items-start sm:items-center gap-3">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                        isAdapt ? "bg-[var(--brand-soft)] text-[var(--brand)]" : "bg-sky-100 text-sky-800"
                      }`}>
                        {isAdapt ? <Sparkles className="w-4 h-4" /> : <Coins className="w-4 h-4" />}
                      </div>

                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-[var(--ink)]">
                            {isAdapt ? "Training data processing" : "Cost estimate"}
                          </span>
                          <span
                            className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border ${
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

                        <div className="text-[11px] text-[var(--ink-muted)] flex flex-wrap items-center gap-x-2">
                          <span>
                            {job.job_specification?.max_rows ? `${job.job_specification.max_rows} rows sampled` : "Sampled data"}
                          </span>
                          <span>•</span>
                          <span>
                            {new Date(job.created_at).toLocaleDateString([], {
                              month: "short",
                              day: "numeric",
                            })}{" "}
                            at{" "}
                            {new Date(job.created_at).toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                          {job.estimated_credits !== null && job.estimated_credits !== undefined && (
                            <>
                              <span>•</span>
                              <span className="font-mono font-medium text-[var(--ink)]">
                                {job.estimated_credits.toFixed(1)} credits
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                      {isAdapt && isSuccess && job.output_download_available && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDownloadOutput(job.id);
                          }}
                          disabled={downloadingJobId === job.id}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#E8F3EE] hover:bg-[#D5EAE0] text-[#2E7D68] text-xs font-bold transition-colors cursor-pointer"
                        >
                          <Download className="w-3.5 h-3.5" />
                          <span>{downloadingJobId === job.id ? "Downloading..." : "Download CSV"}</span>
                        </button>
                      )}

                      <span className="text-xs text-[var(--brand)] font-semibold group-hover:underline inline-flex items-center gap-0.5">
                        <span>View details</span>
                        <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* =========================================================================
          CONFIRMATION MODAL FOR ACTUAL PROCESSING RUN
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
                Process sample with Adaption Labs?
              </h3>
              <p className="text-xs text-[var(--ink-secondary)] leading-relaxed">
                This will send your chosen sample of {maxRows} feedback rows to Adaption Labs to generate support-assistant training pairs.
              </p>
            </div>

            <div className="p-3.5 bg-[#F6F5F1] rounded-2xl border border-[var(--border-subtle)] space-y-1.5 text-xs">
              <div className="flex justify-between">
                <span className="text-[var(--ink-muted)]">Source Dataset:</span>
                <span className="font-bold text-[var(--ink)] truncate max-w-[200px]">
                  {selectedDataset?.name || selectedDatasetId}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-[var(--ink-muted)]">Sample Size:</span>
                <span className="font-mono font-bold text-[var(--brand)]">{maxRows} rows</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[var(--ink-muted)]">Estimated Cost:</span>
                <span className="font-mono text-[var(--ink)]">
                  {estimateResult?.estimated_credits !== undefined && estimateResult?.estimated_credits !== null
                    ? `${estimateResult.estimated_credits.toFixed(1)} credits`
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
              This action transmits selected feedback rows to Adaption Labs and consumes provider compute credits.
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
                Confirm &amp; Process
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          SLIDE-OVER JOB DETAILS DRAWER (AUDIT & RECOVERY)
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
                    Job Details
                  </div>
                  <h3 className="text-base font-extrabold text-[var(--ink)]">
                    {selectedJob.operation_type === "adapt" ? "Training Data Processing" : "Cost Estimate"}
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
                    <span className="font-bold text-[var(--ink)]">
                      {selectedJob.operation_type === "adapt" ? "Training Data Processing" : "Cost Estimate"}
                    </span>
                    <span className="font-mono text-xs font-bold text-[var(--brand)]">
                      {formatJobStatus(selectedJob.status, selectedJob.operation_type)}
                    </span>
                  </div>
                </div>

                <div className="p-3.5 bg-[#F6F5F1] rounded-2xl border border-[var(--border-subtle)] space-y-1">
                  <div className="text-[10px] font-bold uppercase font-mono text-[var(--ink-muted)]">
                    Usage Summary
                  </div>
                  <div className="text-xs space-y-1 text-[var(--ink)]">
                    <div className="flex justify-between">
                      <span className="text-[var(--ink-muted)]">Sample size:</span>
                      <span className="font-mono">{selectedJob.job_specification?.max_rows ?? "Standard"} rows</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[var(--ink-muted)]">Estimated credits:</span>
                      <span className="font-mono font-bold">
                        {selectedJob.estimated_credits !== null && selectedJob.estimated_credits !== undefined
                          ? `${selectedJob.estimated_credits.toFixed(1)} cr`
                          : "Not provided"}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[var(--ink-muted)]">Estimated duration:</span>
                      <span className="font-mono">
                        {selectedJob.estimated_minutes !== null && selectedJob.estimated_minutes !== undefined
                          ? `~${selectedJob.estimated_minutes.toFixed(1)}m`
                          : "Not provided"}
                      </span>
                    </div>
                  </div>
                </div>

                {selectedJob.operation_type === "estimate" && selectedJob.status === "succeeded" && (
                  <div className="p-3.5 bg-sky-50 rounded-2xl border border-sky-200/80 space-y-1">
                    <div className="text-xs font-bold text-sky-900 flex items-center gap-1.5">
                      <Coins className="w-4 h-4 text-sky-600" />
                      <span>Cost Quote Received</span>
                    </div>
                    <p className="text-[10px] text-sky-800 leading-snug">
                      This job generated a pre-flight compute estimate. It did not create a downloadable dataset.
                    </p>
                  </div>
                )}

                {selectedJob.operation_type === "adapt" && selectedJob.output_download_available && (
                  <div className="p-3.5 bg-[#E8F3EE] rounded-2xl border border-[#2E7D68]/30 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-[#166534] flex items-center gap-1.5">
                        <CheckCircle2 className="w-4 h-4 text-[#16a34a]" />
                        Adapted Dataset Ready
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
                      Formatted customer support training dataset is ready for use.
                    </p>
                  </div>
                )}

                {selectedJob.error_message && (
                  <div className="p-3.5 bg-red-50 rounded-2xl border border-red-200 text-xs text-red-700 space-y-1">
                    <strong className="block text-red-800 font-bold">Execution Error:</strong>
                    <div className="text-[11px] leading-relaxed break-words">
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
                    <span>Technical details</span>
                    {showTechnicalDetails ? (
                      <ChevronDown className="w-4 h-4" />
                    ) : (
                      <ChevronRight className="w-4 h-4" />
                    )}
                  </button>

                  {showTechnicalDetails && (
                    <div className="p-3 bg-[#F6F5F1] rounded-2xl border border-[var(--border-subtle)] space-y-2 mt-2 text-xs">
                      <div className="font-mono text-[10px] space-y-1 text-[var(--ink)]">
                        <div>Job ID: {selectedJob.id}</div>
                        <div>Upstream Dataset ID: {selectedJob.adaption_dataset_id || "None"}</div>
                        <div>Upstream Run ID: {selectedJob.adaption_run_id || "None"}</div>
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
