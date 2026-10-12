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
  Clock,
  Coins,
  Cpu,
  Layers,
  CheckCircle2,
  AlertTriangle,
  Play,
  RotateCw,
  Terminal,
  HelpCircle,
  FileCode,
  Download,
  Info,
  Lock,
  X,
} from "lucide-react";

type StatusState =
  | "checking"
  | "ready"
  | "key_missing"
  | "operations_disabled"
  | "unreachable";

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
        if (st.api_key_set && st.public_operations_enabled) {
          setStatusState("ready");
        } else if (!st.api_key_set) {
          setStatusState("key_missing");
        } else {
          setStatusState("operations_disabled");
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

    let pollInterval = 6000; // 6s initial
    let active = true;

    const pollActiveJobs = async () => {
      try {
        const updated = await Promise.all(
          runningJobs.map(async (job) => {
            try {
              return await adaptionApi.getJob(job.id);
            } catch {
              return job; // retain prior state on transient error
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

        // Check if any are still running
        const stillRunning = updated.some((j) => j.status === "running");
        if (stillRunning && active) {
          pollInterval = Math.min(pollInterval + 2000, 15000); // backoff up to 15s
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
      // Refresh jobs list to show estimate record and updated quota
      fetchStatusAndJobs();
    } catch (err: any) {
      console.error("Estimate failed:", err);
      setErrorMessage(
        err?.message ||
          "Estimate failed. If public daily demo quotas are reached or operations are disabled, see notice below."
      );
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

      setSuccessMessage(`Adaptive Data pipeline job launched: ID ${job.id}. Polling live status...`);
      // Refresh status to update quota remaining
      fetchStatusAndJobs();
    } catch (err: any) {
      console.error("Start run failed:", err);
      setErrorMessage(
        err?.message ||
          "Could not launch Adaption pipeline. Check cloud guardrails and daily demo quota."
      );
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
    try {
      await adaptionApi.downloadJobOutput(jobId, `insightflow_adapted_${jobId}.csv`, "csv");
      setSuccessMessage(`Dataset for job #${jobId} downloaded successfully.`);
    } catch (err: any) {
      setErrorMessage(err?.message || "Failed to download adapted dataset artifact.");
    } finally {
      setDownloadingJobId(null);
    }
  };

  const isOperationsReady = statusState === "ready";

  return (
    <div className="flex flex-col min-h-screen bg-[var(--canvas)]">
      <AppHeader
        title="Adaption Lab"
        subtitle="Adaptive Data Ingestion, Distillation & LLM Alignment via Adaption Labs"
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

      <div className="p-4 sm:p-8 max-w-7xl mx-auto w-full space-y-8">
        {/* =========================================================================
            ZONE 1: HERO STRATEGIC BRIEF
            ========================================================================= */}
        <div className="signal-panel rounded-3xl p-6 sm:p-8 relative overflow-hidden bg-[#172033] border border-[#2E3D5C]">
          <div className="absolute top-0 right-0 w-96 h-96 bg-[var(--brand)]/20 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 right-1/4 w-64 h-64 bg-[#7C3AED]/15 rounded-full blur-2xl pointer-events-none" />

          <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
            <div className="lg:col-span-8 space-y-3.5">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 border border-white/15 text-[11px] font-mono text-[#9EB4FA]">
                <Sparkles className="w-3.5 h-3.5 text-[#9EB4FA]" />
                <span>ADAPTION LABS API • ADAPTIVE DATA WORKFLOW</span>
              </div>

              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[#F7F9FC] leading-snug">
                Transform Customer Feedback into High-Precision Model Training Data
              </h1>

              <p className="text-xs sm:text-sm text-[#B8C2D5] leading-relaxed max-w-2xl">
                While baseline analytics isolates sentiment and repetitive friction, <strong>Adaption Labs</strong> executes <em>Adaptive Data</em> distillation: mapping raw unstructured reviews into prompt-completion instruction pairs for customer support alignment, producing audit-ready datasets for domain fine-tuning.
              </p>

              <div className="flex flex-wrap items-center gap-3 pt-2">
                <a
                  href="#configuration-section"
                  className="px-4 py-2 bg-[var(--brand)] hover:bg-[var(--brand-hover)] text-white text-xs font-bold rounded-xl shadow-md transition-all focus-visible-ring inline-flex items-center gap-1.5"
                >
                  <Cpu className="w-3.5 h-3.5" />
                  <span>Configure Adaptive Run ↓</span>
                </a>
                <a
                  href="#architecture-section"
                  className="px-4 py-2 bg-white/10 hover:bg-white/15 text-[#F7F9FC] border border-white/15 text-xs font-semibold rounded-xl transition-colors focus-visible-ring inline-flex items-center gap-1.5"
                >
                  <HelpCircle className="w-3.5 h-3.5" />
                  <span>Workflow Architecture</span>
                </a>
              </div>
            </div>

            {/* Quick Status Pill */}
            <div className="lg:col-span-4 bg-[#202C43]/90 border border-[#2E3D5C] rounded-2xl p-5 backdrop-blur-md space-y-3">
              <div className="text-[10px] uppercase font-bold tracking-wider text-[#B8C2D5] flex items-center justify-between">
                <span>SDK Integration Telemetry</span>
                <span className="font-mono text-[9px] px-2 py-0.5 rounded-full bg-white/10 text-white">
                  {statusInfo?.sdk_version ? `v${statusInfo.sdk_version}` : "Status Pending"}
                </span>
              </div>

              <div className="space-y-2.5 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-[#B8C2D5]">Integration State:</span>
                  <span className="font-mono font-bold">
                    {statusState === "checking" && (
                      <span className="text-amber-300 flex items-center gap-1">
                        <RotateCw className="w-3 h-3 animate-spin" /> Checking
                      </span>
                    )}
                    {statusState === "ready" && (
                      <span className="text-emerald-400 flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Ready (Owner-Funded)
                      </span>
                    )}
                    {statusState === "key_missing" && (
                      <span className="text-amber-300 flex items-center gap-1">
                        <AlertTriangle className="w-3.5 h-3.5" /> Key Not Configured
                      </span>
                    )}
                    {statusState === "operations_disabled" && (
                      <span className="text-amber-300 flex items-center gap-1">
                        <Lock className="w-3.5 h-3.5" /> Operations Disabled
                      </span>
                    )}
                    {statusState === "unreachable" && (
                      <span className="text-rose-400 flex items-center gap-1">
                        <ShieldAlert className="w-3.5 h-3.5" /> Backend Unreachable
                      </span>
                    )}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-[#B8C2D5]">API Key:</span>
                  <span className="font-mono text-white">
                    {statusInfo?.api_key_set ? (
                      <span className="text-emerald-400 font-bold">Configured on Backend</span>
                    ) : statusState === "checking" ? (
                      <span className="text-slate-400">Querying...</span>
                    ) : (
                      <span className="text-amber-300">Not configured</span>
                    )}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-[#B8C2D5]">Daily Demo Quotas:</span>
                  <span className="font-mono text-white text-[11px]">
                    {statusInfo?.daily_runs_remaining !== undefined && statusInfo?.daily_runs_remaining !== null ? (
                      <span className="text-[#9EB4FA]">
                        {statusInfo.daily_runs_remaining}/{statusInfo.daily_runs_limit ?? 3} runs · {statusInfo.daily_estimates_remaining ?? 0}/{statusInfo.daily_estimates_limit ?? 10} est
                      </span>
                    ) : (
                      <span className="text-slate-400">Active UTC Quotas</span>
                    )}
                  </span>
                </div>
              </div>

              <div className="pt-2 border-t border-white/10 text-[10px] text-[#A2AEBD] font-mono leading-relaxed">
                Server Clamp: Max 1,000 rows · Judge Key Entry Never Required
              </div>
            </div>
          </div>
        </div>

        {/* =========================================================================
            ZONE 2: HONEST INTEGRATION & DEMO STATUS BADGE
            ========================================================================= */}
        <div className="solid-data rounded-2xl p-5 space-y-3">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3">
              <div
                className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                  isOperationsReady
                    ? "bg-emerald-50 text-emerald-600 border border-emerald-200"
                    : statusState === "unreachable"
                    ? "bg-rose-50 text-rose-600 border border-rose-200"
                    : "bg-amber-50 text-amber-700 border border-amber-200"
                }`}
              >
                {isOperationsReady ? (
                  <ShieldCheck className="w-5 h-5" />
                ) : (
                  <ShieldAlert className="w-5 h-5" />
                )}
              </div>
              <div>
                <h3 className="text-sm font-bold text-[var(--ink)]">
                  {statusState === "ready" && "Adaption Labs Engine Ready (Owner-Configured Demo)"}
                  {statusState === "checking" && "Checking Adaption Engine Status..."}
                  {statusState === "key_missing" && "Adaption API Key Not Configured on Backend"}
                  {statusState === "operations_disabled" && "Public Demo Operations Disabled by Policy"}
                  {statusState === "unreachable" && "Backend Engine Unreachable"}
                </h3>
                <p className="text-xs text-[var(--ink-secondary)] mt-1 leading-relaxed">
                  {statusInfo?.message ||
                    (statusState === "unreachable"
                      ? "Could not connect to backend service. Check network or server status."
                      : "Querying authoritative status from backend...")}
                </p>
              </div>
            </div>

            <div className="shrink-0 text-right">
              <span
                className={`text-[11px] font-mono font-bold px-2.5 py-1 rounded-full border ${
                  isOperationsReady
                    ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                    : statusState === "unreachable"
                    ? "bg-rose-50 text-rose-800 border-rose-200"
                    : "bg-amber-50 text-amber-800 border-amber-200"
                }`}
              >
                {statusState === "ready" && "DEMO INTEGRATION: READY"}
                {statusState === "checking" && "CHECKING STATUS"}
                {statusState === "key_missing" && "KEY REQUIRED ON RENDER"}
                {statusState === "operations_disabled" && "GUARDRAIL ACTIVE"}
                {statusState === "unreachable" && "BACKEND OFFLINE"}
              </span>
            </div>
          </div>

          {!isOperationsReady && statusState !== "checking" && (
            <div className="p-3.5 bg-[#F6F5F1] rounded-xl border border-[var(--border-subtle)] text-xs text-[var(--ink-secondary)] space-y-1.5 font-mono">
              <div className="font-bold text-[var(--ink)] flex items-center gap-1.5">
                <Info className="w-3.5 h-3.5 text-[var(--brand)]" />
                <span>Notice for Judges &amp; Evaluators:</span>
              </div>
              <p className="text-[11px] leading-relaxed">
                {statusState === "key_missing"
                  ? "Judges never need to supply an API key. The project owner configures ADAPTION_API_KEY as a secret in the backend Render environment."
                  : statusState === "operations_disabled"
                  ? "The owner-configured demo kill switch (ENABLE_PUBLIC_ADAPTION_OPERATIONS) is currently false to safeguard credits."
                  : "Unable to reach backend /api/v1/adaption/status. Ensure the backend engine is running."}
              </p>
            </div>
          )}
        </div>

        {/* Global Feedback Banners */}
        {errorMessage && (
          <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700 flex items-start gap-2.5">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-red-600" />
            <div>
              <strong>Action Notice: </strong> {errorMessage}
            </div>
          </div>
        )}

        {successMessage && (
          <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 flex items-start gap-2.5">
            <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-emerald-600" />
            <div>{successMessage}</div>
          </div>
        )}

        {/* =========================================================================
            ZONE 3: ADAPTIVE DATA RUN CONFIGURATION & ESTIMATION
            ========================================================================= */}
        <div id="configuration-section" className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left 7 Columns: Pipeline Controls */}
          <div className="lg:col-span-7 solid-data rounded-3xl p-6 sm:p-7 space-y-6">
            <div>
              <div className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-[var(--brand)] font-mono">
                <Layers className="w-3 h-3" />
                <span>PIPELINE SPECIFICATION</span>
              </div>
              <h2 className="text-base font-bold text-[var(--ink)] mt-1">
                Configure Dataset Distillation
              </h2>
              <p className="text-xs text-[var(--ink-muted)] mt-0.5">
                Task blueprint: Empathetic customer support resolution training pairs
              </p>
            </div>

            {/* Target Dataset Preview */}
            <div className="p-4 bg-[#F6F5F1] rounded-2xl border border-[var(--border-subtle)] space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-[var(--ink)]">Source Dataset:</span>
                <span className="font-mono text-[var(--ink-muted)] text-[11px]">
                  ID: {selectedDatasetId || "None selected"}
                </span>
              </div>
              {selectedDataset ? (
                <div className="text-xs text-[var(--ink-secondary)]">
                  <strong>{selectedDataset.name}</strong> • {selectedDataset.row_count.toLocaleString()} valid rows ingested
                </div>
              ) : (
                <div className="text-xs text-amber-600">
                  No active dataset selected. Please choose one in the top header.
                </div>
              )}
            </div>

            {/* Task Blueprint & Column Mapping Preview */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-[var(--ink)] uppercase tracking-wider">
                  Adaptive Data Column Mapping
                </label>
                <span className="text-[10px] text-[var(--ink-muted)] font-mono">
                  Task: Support Assistant Alignment
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-3 bg-white rounded-xl border border-[var(--border-subtle)]">
                  <span className="text-[10px] font-bold uppercase font-mono text-[var(--brand)] block">
                    prompt / instruction
                  </span>
                  <div className="text-xs font-semibold text-[var(--ink)] mt-1">
                    Empathetic Response Instruction
                  </div>
                  <span className="text-[10px] text-[var(--ink-muted)] block mt-0.5">
                    "Write a concise, empathetic customer-support resolution"
                  </span>
                </div>

                <div className="p-3 bg-white rounded-xl border border-[var(--border-subtle)]">
                  <span className="text-[10px] font-bold uppercase font-mono text-[#7C3AED] block">
                    context / input
                  </span>
                  <div className="text-xs font-semibold text-[var(--ink)] mt-1">
                    Verbatim Review &amp; Category
                  </div>
                  <span className="text-[10px] text-[var(--ink-muted)] block mt-0.5">
                    Original customer voice + issue taxonomy
                  </span>
                </div>
              </div>
            </div>

            {/* Bounded Row Cap Selector */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <label className="font-bold text-[var(--ink)]">
                  Row Cap Safety Bound:
                </label>
                <span className="font-mono text-[var(--brand)] font-bold">
                  {maxRows} Rows Max
                </span>
              </div>

              <div className="grid grid-cols-4 gap-2">
                {[100, 250, 500, 1000].map((rows) => (
                  <button
                    key={rows}
                    type="button"
                    onClick={() => setMaxRows(rows)}
                    className={`py-2 px-3 rounded-xl text-xs font-mono font-bold transition-all focus-visible-ring cursor-pointer ${
                      maxRows === rows
                        ? "bg-[var(--brand)] text-white shadow-xs"
                        : "bg-[#F6F5F1] text-[var(--ink)] hover:bg-[#EAE8E2] border border-[var(--border-subtle)]"
                    }`}
                  >
                    {rows} rows
                  </button>
                ))}
              </div>
              <p className="text-[11px] text-[var(--ink-muted)]">
                Server clamps requests to a maximum of 1,000 rows to safeguard owner compute credits.
              </p>
            </div>

            {/* Data-Sharing & Credit Disclosure Notice (MANDATORY REQUIREMENT) */}
            <div className="p-4 bg-[#FAF5E8] rounded-2xl border border-amber-200/80 space-y-3">
              <div className="flex items-start gap-2.5">
                <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                <div className="space-y-1 text-xs text-amber-900 leading-relaxed">
                  <div className="font-bold text-amber-950">
                    External Data Transfer &amp; Credit Usage Disclosure
                  </div>
                  <ul className="list-disc pl-4 space-y-1 text-[11px] text-amber-800">
                    <li>
                      <strong>External Transmission:</strong> Bounded feedback rows (up to {maxRows}) are uploaded to the external Adaption Labs API.
                    </li>
                    <li>
                      <strong>Estimates Transmit Data:</strong> Calculating an estimate uploads a temporary CSV to Adaption Labs to quote costs; it does not start a run.
                    </li>
                    <li>
                      <strong>Credit Consumption:</strong> Starting an adaptation run consumes real compute credits from the owner's account.
                    </li>
                    <li>
                      <strong>Public Workspace Notice:</strong> Do not upload sensitive or personal customer information. Use sample/anonymized datasets only.
                    </li>
                  </ul>
                </div>
              </div>

              <label className="flex items-start gap-2.5 pt-2 border-t border-amber-200 text-xs text-amber-950 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={hasConsented}
                  onChange={(e) => setHasConsented(e.target.checked)}
                  className="mt-0.5 h-4 w-4 rounded border-amber-300 text-[var(--brand)] focus:ring-[var(--brand)]"
                />
                <span className="text-[11px] font-medium leading-tight">
                  I understand bounded feedback rows will be uploaded to Adaption Labs for estimation/processing under the {maxRows}-row cap.
                </span>
              </label>
            </div>

            {/* Action Buttons */}
            <div className="pt-2 flex flex-col sm:flex-row gap-3">
              <button
                type="button"
                onClick={handleEstimate}
                disabled={isEstimating || !selectedDatasetId || !hasConsented || !isOperationsReady}
                className="flex-1 py-3 px-4 bg-white border border-[var(--border-strong)] hover:border-[var(--brand)] text-[var(--ink)] text-xs font-bold rounded-xl transition-all shadow-xs flex items-center justify-center gap-2 focus-visible-ring disabled:opacity-50 cursor-pointer"
              >
                {isEstimating ? (
                  <>
                    <RotateCw className="w-4 h-4 animate-spin text-[var(--brand)]" />
                    <span>Querying Adaption Estimate...</span>
                  </>
                ) : (
                  <>
                    <Coins className="w-4 h-4 text-[var(--brand)]" />
                    <span>Estimate Cost &amp; Time</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() => setShowConfirmModal(true)}
                disabled={isStartingJob || !selectedDatasetId || !hasConsented || !isOperationsReady}
                className="flex-1 py-3 px-4 bg-[var(--brand)] hover:bg-[var(--brand-hover)] text-white text-xs font-bold rounded-xl transition-all shadow-md flex items-center justify-center gap-2 focus-visible-ring disabled:opacity-50 cursor-pointer"
              >
                {isStartingJob ? (
                  <>
                    <RotateCw className="w-4 h-4 animate-spin" />
                    <span>Launching Pipeline...</span>
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4 fill-current" />
                    <span>Run Adaption Pipeline</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Right 5 Columns: Estimation Results Box */}
          <div className="lg:col-span-5 space-y-6">
            <div className="solid-data rounded-3xl p-6 sm:p-7 space-y-5">
              <div>
                <div className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-[var(--ink-muted)] font-mono">
                  <Clock className="w-3 h-3" />
                  <span>COMPUTATION FORECAST</span>
                </div>
                <h3 className="text-base font-bold text-[var(--ink)] mt-1">
                  Engine Estimate Summary
                </h3>
                <p className="text-xs text-[var(--ink-muted)] mt-0.5">
                  Pre-flight quote computed directly by Adaption Labs
                </p>
              </div>

              {estimateResult ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-4 rounded-2xl bg-[#E9EDFC] border border-[var(--brand)]/20">
                      <span className="text-[10px] font-bold uppercase font-mono text-[var(--brand)] block">
                        Estimated Credits
                      </span>
                      <div className="text-2xl font-extrabold text-[var(--brand)] mt-1 font-mono">
                        {estimateResult.estimated_credits !== null && estimateResult.estimated_credits !== undefined
                          ? estimateResult.estimated_credits.toFixed(1)
                          : "N/A"}
                      </div>
                      <span className="text-[10px] text-[var(--ink-muted)]">
                        Adaption compute units
                      </span>
                    </div>

                    <div className="p-4 rounded-2xl bg-[#FAF5E8] border border-amber-200">
                      <span className="text-[10px] font-bold uppercase font-mono text-amber-800 block">
                        Estimated Minutes
                      </span>
                      <div className="text-2xl font-extrabold text-amber-900 mt-1 font-mono">
                        {estimateResult.estimated_minutes !== null && estimateResult.estimated_minutes !== undefined
                          ? `~${estimateResult.estimated_minutes.toFixed(1)}m`
                          : "N/A"}
                      </div>
                      <span className="text-[10px] text-[var(--ink-muted)]">
                        Distillation runtime
                      </span>
                    </div>
                  </div>

                  <div className="p-4 rounded-2xl bg-[#F6F5F1] border border-[var(--border-subtle)] space-y-2 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-[var(--ink-muted)]">Local Tracking ID:</span>
                      <span className="font-mono font-bold text-[var(--ink)]">
                        {estimateResult.local_job_id}
                      </span>
                    </div>
                    {estimateResult.adaption_dataset_id && (
                      <div className="flex items-center justify-between">
                        <span className="text-[var(--ink-muted)]">Adaption Dataset ID:</span>
                        <span className="font-mono text-[var(--brand)] truncate max-w-[180px]">
                          {estimateResult.adaption_dataset_id}
                        </span>
                      </div>
                    )}
                    <div className="pt-2 border-t border-[var(--border-subtle)] text-[11px] text-[var(--ink-secondary)]">
                      {estimateResult.message}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-8 text-center bg-[#F6F5F1] rounded-2xl border border-dashed border-[var(--border-strong)] space-y-2">
                  <Coins className="w-8 h-8 text-[var(--ink-muted)] mx-auto opacity-50" />
                  <div className="text-xs font-bold text-[var(--ink)]">
                    No Active Estimate
                  </div>
                  <p className="text-[11px] text-[var(--ink-muted)] max-w-xs mx-auto leading-relaxed">
                    Select a dataset and row cap, check the data disclosure box, and click "Estimate Cost &amp; Time" to receive live quote figures.
                  </p>
                </div>
              )}

              <div className="p-3.5 bg-[#F6F5F1] rounded-xl border border-[var(--border-subtle)] text-[11px] text-[var(--ink-muted)] flex items-start gap-2">
                <HelpCircle className="w-3.5 h-3.5 text-[var(--brand)] shrink-0 mt-0.5" />
                <span>
                  Estimates analyze row lengths, token count distributions, and synthesis passes without committing compute charges.
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* =========================================================================
            ZONE 4: PIPELINE JOBS & RUN HISTORY TABLE
            ========================================================================= */}
        <div className="solid-data rounded-3xl p-6 sm:p-7 space-y-5">
          <div className="flex items-center justify-between">
            <div>
              <div className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-[var(--brand)] font-mono">
                <Terminal className="w-3.5 h-3.5" />
                <span>EXECUTION LEDGER</span>
              </div>
              <h2 className="text-base font-bold text-[var(--ink)] mt-0.5">
                Adaption Labs Pipeline Runs ({jobs.length})
              </h2>
            </div>

            <button
              type="button"
              onClick={handleRefreshJobs}
              disabled={isLoadingJobs}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-[var(--border-subtle)] text-xs font-semibold rounded-xl text-[var(--ink)] hover:bg-[#F2F4F6] transition-colors focus-visible-ring cursor-pointer"
            >
              <RotateCw className={`w-3.5 h-3.5 ${isLoadingJobs ? "animate-spin" : ""}`} />
              <span>Refresh Ledger</span>
            </button>
          </div>

          {jobs.length === 0 ? (
            <div className="p-10 text-center bg-[#F6F5F1] rounded-2xl border border-dashed border-[var(--border-strong)] space-y-2">
              <p className="text-xs font-bold text-[var(--ink)]">
                No Adaption jobs recorded yet in this workspace.
              </p>
              <p className="text-[11px] text-[var(--ink-muted)]">
                Run an estimate or launch an Adaptive Data pipeline above to see tracking logs.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-[var(--border-subtle)] text-[10px] font-bold text-[var(--ink-muted)] uppercase tracking-wider font-mono">
                    <th className="py-3 px-3">Job ID</th>
                    <th className="py-3 px-3">Type</th>
                    <th className="py-3 px-3">Status</th>
                    <th className="py-3 px-3">Est. Credits</th>
                    <th className="py-3 px-3">Est. Time</th>
                    <th className="py-3 px-3">Created</th>
                    <th className="py-3 px-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border-subtle)]">
                  {jobs.map((job) => {
                    const isSuccess = job.status === "succeeded";
                    const isRunning = job.status === "running";

                    return (
                      <tr
                        key={job.id}
                        className="hover:bg-[#F6F5F1]/80 transition-colors cursor-pointer group"
                        onClick={() => setSelectedJob(job)}
                      >
                        <td className="py-3 px-3 font-mono font-bold text-[var(--ink)]">
                          {job.id}
                        </td>
                        <td className="py-3 px-3 font-mono uppercase text-[10px] text-[var(--ink-secondary)]">
                          {job.operation_type}
                        </td>
                        <td className="py-3 px-3">
                          <span
                            className={`inline-flex items-center gap-1 text-[10px] font-bold font-mono px-2 py-0.5 rounded-full border ${
                              isSuccess
                                ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                : isRunning
                                ? "bg-blue-50 text-blue-700 border-blue-200 animate-pulse"
                                : "bg-red-50 text-red-700 border-red-200"
                            }`}
                          >
                            {isRunning && <RotateCw className="w-2.5 h-2.5 animate-spin" />}
                            {job.status.toUpperCase()}
                          </span>
                        </td>
                        <td className="py-3 px-3 font-mono">
                          {job.estimated_credits !== null && job.estimated_credits !== undefined
                            ? `${job.estimated_credits.toFixed(1)} cr`
                            : "—"}
                        </td>
                        <td className="py-3 px-3 font-mono text-[var(--ink-muted)]">
                          {job.estimated_minutes !== null && job.estimated_minutes !== undefined
                            ? `~${job.estimated_minutes.toFixed(1)}m`
                            : "—"}
                        </td>
                        <td className="py-3 px-3 text-[var(--ink-muted)] font-mono text-[11px]">
                          {new Date(job.created_at).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                            second: "2-digit",
                          })}
                        </td>
                        <td className="py-3 px-3 text-right">
                          <div className="flex items-center justify-end gap-2">
                            {job.operation_type === "adapt" && job.status === "succeeded" && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDownloadOutput(job.id);
                                }}
                                disabled={downloadingJobId === job.id}
                                className="inline-flex items-center gap-1 px-2 py-1 rounded bg-[#E8F3EE] hover:bg-[#D5EAE0] text-[#2E7D68] text-[10px] font-bold font-mono transition-colors"
                              >
                                <Download className="w-3 h-3" />
                                <span>{downloadingJobId === job.id ? "Downloading..." : "Download CSV"}</span>
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedJob(job);
                              }}
                              className="text-[11px] font-semibold text-[var(--brand)] group-hover:underline"
                            >
                              Inspect Dossier →
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* =========================================================================
            ZONE 5: ARCHITECTURAL DEEP DIVE FOR JUDGES
            ========================================================================= */}
        <div id="architecture-section" className="solid-data rounded-3xl p-6 sm:p-8 space-y-6">
          <div className="border-b border-[var(--border-subtle)] pb-4">
            <div className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-[var(--brand)] font-mono">
              <FileCode className="w-3.5 h-3.5" />
              <span>SYSTEM ARCHITECTURE FOR JUDGES</span>
            </div>
            <h2 className="text-base sm:text-lg font-bold text-[var(--ink)] mt-1">
              Why InsightFlow Integrates Adaption Labs
            </h2>
            <p className="text-xs text-[var(--ink-secondary)] mt-1 leading-relaxed">
              Standard feedback dashboards stop at sentiment and word counts. InsightFlow bridges the gap between customer feedback telemetry and production LLM operations.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Column A: Baseline Sentiment Limitations */}
            <div className="p-5 rounded-2xl bg-[#F6F5F1] border border-[var(--border-subtle)] space-y-3">
              <span className="text-[10px] font-bold uppercase font-mono text-[var(--ink-muted)] block">
                Standard Feedback Dashboards
              </span>
              <h3 className="text-sm font-bold text-[var(--ink)]">
                Rule-Based Lexicon Sentiment
              </h3>
              <ul className="space-y-2 text-xs text-[var(--ink-secondary)] list-disc pl-4 leading-relaxed">
                <li>Scores polarity (-1.0 to +1.0) using word lists.</li>
                <li>Provides static metrics for quarterly reviews.</li>
                <li>Cannot align models: output cannot be used for fine-tuning.</li>
                <li>Conflates message duplication with customer volume.</li>
              </ul>
            </div>

            {/* Column B: Adaptive Data Advantage */}
            <div className="p-5 rounded-2xl bg-[#E9EDFC] border border-[var(--brand)]/30 space-y-3">
              <span className="text-[10px] font-bold uppercase font-mono text-[var(--brand)] block">
                Adaption Labs Ingestion
              </span>
              <h3 className="text-sm font-bold text-[var(--ink)]">
                Adaptive Data Pipeline
              </h3>
              <ul className="space-y-2 text-xs text-[var(--ink-secondary)] list-disc pl-4 leading-relaxed">
                <li>Transforms uncurated feedback into aligned instruction pairs.</li>
                <li>Applies domain task blueprint (empathetic customer support responses).</li>
                <li>Curates high-signal fine-tuning splits for domain models.</li>
                <li>Produces benchmark datasets for continuous evaluation.</li>
              </ul>
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
                This will submit a bounded extraction ({maxRows} rows maximum) to Adaption Labs for Adaptive Data distillation.
              </p>
            </div>

            <div className="p-3.5 bg-[#F6F5F1] rounded-xl border border-[var(--border-subtle)] space-y-1.5 text-xs">
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
                    : "Live execution quote"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-[var(--ink-muted)]">Daily Runs Remaining:</span>
                <span className="font-mono font-bold text-[#2E7D68]">
                  {statusInfo?.daily_runs_remaining ?? 3} / {statusInfo?.daily_runs_limit ?? 3}
                </span>
              </div>
            </div>

            <p className="text-[11px] text-amber-800 bg-amber-50 p-2.5 rounded-lg border border-amber-200 leading-relaxed">
              This action transmits bounded data to Adaption Labs and consumes demo credits configured on the backend.
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
                    Adaption Job Dossier
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
                <div className="p-3 bg-[#F6F5F1] rounded-xl border border-[var(--border-subtle)] space-y-1">
                  <div className="text-[10px] font-bold uppercase font-mono text-[var(--ink-muted)]">
                    Status &amp; Operation
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold uppercase text-[var(--ink)]">
                      {selectedJob.operation_type}
                    </span>
                    <span className="font-mono text-xs font-bold capitalize">
                      {selectedJob.status}
                    </span>
                  </div>
                </div>

                <div className="p-3 bg-[#F6F5F1] rounded-xl border border-[var(--border-subtle)] space-y-1">
                  <div className="text-[10px] font-bold uppercase font-mono text-[var(--ink-muted)]">
                    External Adaption Identifiers
                  </div>
                  <div className="text-xs font-mono space-y-1 text-[var(--ink)]">
                    <div>Dataset: {selectedJob.adaption_dataset_id || "None"}</div>
                    <div>Run: {selectedJob.adaption_run_id || "None"}</div>
                  </div>
                </div>

                <div className="p-3 bg-[#F6F5F1] rounded-xl border border-[var(--border-subtle)] space-y-1">
                  <div className="text-[10px] font-bold uppercase font-mono text-[var(--ink-muted)]">
                    Resource Consumption
                  </div>
                  <div className="text-xs font-mono space-y-1 text-[var(--ink)]">
                    <div>Estimated Credits: {selectedJob.estimated_credits ?? "N/A"}</div>
                    <div>Estimated Minutes: {selectedJob.estimated_minutes ?? "N/A"}</div>
                  </div>
                </div>

                {selectedJob.output_download_available && (
                  <div className="p-3.5 bg-[#E8F3EE] rounded-xl border border-[#2E7D68]/30 space-y-2">
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
                      Streamed directly from the backend via the Adaption Labs datasets download API.
                    </p>
                  </div>
                )}

                {selectedJob.error_message && (
                  <div className="p-3.5 bg-red-50 rounded-xl border border-red-200 text-xs text-red-700 space-y-1">
                    <strong className="block text-red-800 font-bold">Execution Error:</strong>
                    <div className="font-mono text-[11px] leading-relaxed break-words">
                      {selectedJob.error_message}
                    </div>
                  </div>
                )}

                <div className="p-3 bg-[#F6F5F1] rounded-xl border border-[var(--border-subtle)] space-y-1">
                  <div className="text-[10px] font-bold uppercase font-mono text-[var(--ink-muted)]">
                    Column Mapping Used
                  </div>
                  <pre className="text-[11px] font-mono text-[var(--ink-secondary)] overflow-x-auto">
                    {JSON.stringify(selectedJob.column_mapping, null, 2)}
                  </pre>
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-[var(--border-subtle)]">
              <button
                type="button"
                onClick={() => setSelectedJob(null)}
                className="w-full py-2.5 bg-[#F6F5F1] hover:bg-[#EAE8E2] text-[var(--ink)] text-xs font-semibold rounded-xl transition-colors cursor-pointer"
              >
                Close Dossier
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
