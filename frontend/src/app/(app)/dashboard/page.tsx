"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import AppHeader from "@/components/navigation/AppHeader";
import DataFieldCanvas from "@/components/background/DataFieldCanvas";
import { dashboardApi, issuesApi, feedbackApi, adaptionApi } from "@/lib/api/client";
import {
  DashboardData,
  Issue,
  Feedback,
  AdaptionJobResponse,
  AdaptionConfigStatus,
  RepeatedStatement,
} from "@/lib/api/types";
import { useDataset } from "@/lib/context/DatasetContext";
import {
  Sparkles,
  ArrowRight,
  Database,
  Cpu,
  CheckCircle2,
  MessageSquare,
  Layers,
  RotateCw,
  Clock,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  HelpCircle,
  X,
} from "lucide-react";

// Category palette tokens (strictly distinct from sentiment)
const CATEGORY_COLORS: Record<string, { bar: string; text: string; bg: string; border: string }> = {
  "Operational Issues": { bar: "#398779", text: "#398779", bg: "#EDF6F4", border: "#C6E2DC" },
  "Fraud and Scam": { bar: "#8B6E9B", text: "#6E4D7F", bg: "#F6F0F8", border: "#E0D2E5" },
  "Product Feedback": { bar: "#5876B8", text: "#3B5899", bg: "#EEF3FA", border: "#CCD8EE" },
  "Customer Service": { bar: "#B58A43", text: "#966C28", bg: "#FAF5E8", border: "#EDE0BF" },
};

export default function DashboardPage() {
  const router = useRouter();
  const { selectedDatasetId, loading: datasetLoading } = useDataset();

  const [data, setData] = useState<DashboardData | null>(null);
  const [issues, setIssues] = useState<Issue[]>([]);
  const [recentFeedbacks, setRecentFeedbacks] = useState<Feedback[]>([]);
  const [latestAdaptionJob, setLatestAdaptionJob] = useState<AdaptionJobResponse | null>(null);
  const [adaptionStatus, setAdaptionStatus] = useState<AdaptionConfigStatus | null>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Accessible inline calculation disclosure states for KPIs and charts
  const [openDisclosures, setOpenDisclosures] = useState<Record<string, boolean>>({});

  // Slide-over drawer feedback record inspection
  const [selectedFeedback, setSelectedFeedback] = useState<Feedback | null>(null);

  const toggleDisclosure = (key: string) => {
    setOpenDisclosures((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const loadDashboard = async (targetDatasetId: string) => {
    try {
      setLoading(true);
      setError(null);

      const [dashRes, issueList, fbList] = await Promise.all([
        dashboardApi.get(targetDatasetId),
        issuesApi.list({ datasetId: targetDatasetId }),
        feedbackApi.list({ datasetId: targetDatasetId, page: 1, pageSize: 6 }),
      ]);

      setData(dashRes);
      setIssues(issueList || []);
      setRecentFeedbacks(fbList?.items || []);

      // Non-blocking query for latest Adaption status and job filtered by current dataset
      adaptionApi
        .listJobs()
        .then((jobs) => {
          if (jobs && jobs.length > 0) {
            const datasetJobs = jobs.filter((j) => j.dataset_id === targetDatasetId);
            const adaptJob = datasetJobs.find((j) => j.operation_type === "adapt");
            const estimateJob = datasetJobs.find((j) => j.operation_type === "estimate");
            setLatestAdaptionJob(adaptJob || estimateJob || null);
          } else {
            setLatestAdaptionJob(null);
          }
        })
        .catch(() => setLatestAdaptionJob(null));

      adaptionApi
        .getStatus()
        .then((st) => setAdaptionStatus(st))
        .catch(() => setAdaptionStatus(null));
    } catch (err: any) {
      console.error("Dashboard load failed:", err);
      setError(err?.message || "Failed to load dashboard data from API");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedDatasetId) {
      loadDashboard(selectedDatasetId);
    } else if (!datasetLoading) {
      setLoading(false);
    }
  }, [selectedDatasetId, datasetLoading]);

  // Derived mathematically strict metrics
  const totalSourceRows = data?.total_source_rows || 0;
  const validRows = data?.valid_rows ?? (totalSourceRows > 0 ? totalSourceRows : 0);
  const invalidRows = data?.invalid_rows ?? Math.max(0, totalSourceRows - validRows);
  const uniqueStatements = data?.unique_exact_statements || 0;
  const extraDuplicates = data?.extra_duplicate_occurrences ?? (data?.repeated_rows || 0);
  const rowsInRepeatedGroups = data?.rows_in_repeated_groups ?? extraDuplicates;

  const usabilityPct = totalSourceRows > 0 ? ((validRows / totalSourceRows) * 100).toFixed(1) : "0.0";
  const uniquePct = validRows > 0 ? ((uniqueStatements / validRows) * 100).toFixed(1) : "0.0";
  const extraDupsPct = validRows > 0 ? ((extraDuplicates / validRows) * 100).toFixed(1) : "0.0";

  // Categories calculated strictly against valid categorized feedback records
  const categoryEntries = Object.entries(data?.source_category_distribution || {}).sort((a, b) => b[1] - a[1]);

  const totalCategorizedRows =
    data?.total_categorized_rows && data.total_categorized_rows > 0
      ? data.total_categorized_rows
      : (() => {
          const sum = categoryEntries.reduce((acc, [, cnt]) => acc + cnt, 0);
          return sum > 0 ? sum : validRows;
        })();

  const topCategory = categoryEntries.length > 0 ? categoryEntries[0] : null;
  const topCategorySharePct =
    topCategory && totalCategorizedRows > 0
      ? ((topCategory[1] / totalCategorizedRows) * 100).toFixed(1)
      : "0.0";

  // Sentiment derived counts and coverage
  const sentiment = data?.sentiment_distribution;
  const posCount = sentiment?.positive || 0;
  const neuCount = sentiment?.neutral || 0;
  const negCount = sentiment?.negative || 0;
  const mixedCount = sentiment?.mixed || 0;
  const unknownCount = sentiment?.unknown || 0;

  const sentimentTotal =
    sentiment?.total_analyzed && sentiment.total_analyzed > 0
      ? sentiment.total_analyzed
      : posCount + neuCount + negCount + mixedCount + unknownCount;

  const sentimentCoveragePct = validRows > 0 ? ((sentimentTotal / validRows) * 100).toFixed(1) : "0.0";

  const posPct = sentimentTotal > 0 ? ((posCount / sentimentTotal) * 100).toFixed(1) : "0.0";
  const neuPct = sentimentTotal > 0 ? ((neuCount / sentimentTotal) * 100).toFixed(1) : "0.0";
  const negPct = sentimentTotal > 0 ? ((negCount / sentimentTotal) * 100).toFixed(1) : "0.0";
  const mixedPct = sentimentTotal > 0 ? ((mixedCount / sentimentTotal) * 100).toFixed(1) : "0.0";
  const unknownPct = sentimentTotal > 0 ? ((unknownCount / sentimentTotal) * 100).toFixed(1) : "0.0";

  // Repeated statements
  const topStatements: RepeatedStatement[] = data?.top_repeated_statements || [];
  const maxStatementCount = topStatements.length > 0 ? Math.max(...topStatements.map((s) => s.count)) : 1;

  // Issue priority counts
  const criticalCount = issues.filter((i) => i.priority === "Critical").length;
  const highCount = issues.filter((i) => i.priority === "High").length;

  if (loading) {
    return (
      <div className="flex flex-col min-h-screen bg-[var(--bg-paper)]">
        <AppHeader title="Feedback overview" subtitle="A summary of customer feedback in this dataset" />
        <div className="p-6 sm:p-8 max-w-7xl mx-auto w-full space-y-6">
          <div className="h-44 w-full bg-[#11182A]/10 animate-pulse rounded-2xl" />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-36 bg-black/5 animate-pulse rounded-2xl" />
            ))}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            <div className="lg:col-span-5 h-96 bg-black/5 animate-pulse rounded-2xl" />
            <div className="lg:col-span-7 h-96 bg-black/5 animate-pulse rounded-2xl" />
          </div>
        </div>
      </div>
    );
  }

  if (!selectedDatasetId && !datasetLoading) {
    return (
      <div className="flex flex-col min-h-screen bg-[var(--bg-paper)]">
        <AppHeader title="Feedback overview" subtitle="A summary of customer feedback in this dataset" />
        <div className="p-8 max-w-xl mx-auto my-16 text-center bg-white rounded-3xl border border-[#DDE2E9] shadow-sm space-y-4">
          <div className="w-12 h-12 mx-auto rounded-2xl bg-[#E9EDFC] text-[#3656C8] flex items-center justify-center">
            <Database className="w-6 h-6 text-[#3656C8]" />
          </div>
          <h2 className="text-base font-bold text-[#111827]">No dataset selected</h2>
          <p className="text-xs text-[#687386] leading-relaxed">
            Import a feedback CSV file or select a dataset from the header to view customer feedback.
          </p>
          <Link
            href="/import"
            className="inline-block px-5 py-2.5 bg-[#3656C8] text-white text-xs font-bold rounded-xl shadow-sm hover:bg-[#23387F] transition-colors focus-visible-ring"
          >
            Import feedback
          </Link>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex flex-col min-h-screen bg-[var(--bg-paper)]">
        <AppHeader title="Feedback overview" subtitle="A summary of customer feedback in this dataset" />
        <div className="p-8 max-w-2xl mx-auto my-16 text-center bg-white rounded-3xl border border-[#FF6B61]/25 shadow-sm">
          <div className="w-12 h-12 mx-auto mb-4 rounded-2xl bg-[#FFF1F0] text-[#FF6B61] flex items-center justify-center text-2xl font-bold">
            !
          </div>
          <h2 className="text-lg font-bold text-[#111827] mb-2">Unable to load dashboard data</h2>
          <p className="text-xs text-[#687386] mb-6 leading-relaxed">{error || "Dataset could not be loaded."}</p>
          <button
            onClick={() => selectedDatasetId && loadDashboard(selectedDatasetId)}
            className="px-5 py-2.5 bg-[#3656C8] text-white text-xs font-bold rounded-xl shadow-sm hover:bg-[#23387F] transition-colors focus-visible-ring"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-[var(--bg-paper)]">
      {/* Page Header */}
      <AppHeader
        title="Executive overview"
        subtitle={`Evidence-based summary for ${data.dataset_name}`}
        actions={
          <div className="flex items-center gap-2">
            <Link
              href="/feedback"
              className="px-3.5 py-1.5 bg-white border border-[#DDE2E9] text-xs font-semibold rounded-xl text-[#20252D] hover:bg-[#ECEFF3] transition-colors focus-visible-ring"
            >
              Browse feedback
            </Link>
            <Link
              href="/reports"
              className="px-3.5 py-1.5 bg-[#3656C8] text-white text-xs font-bold rounded-xl hover:bg-[#23387F] shadow-sm transition-colors focus-visible-ring"
            >
              Create report
            </Link>
          </div>
        }
      />

      <div className="p-4 sm:p-8 max-w-7xl mx-auto w-full space-y-8">
        {/* =========================================================================
            SECTION 1: EXECUTIVE READOUT (DETERMINISTIC EVIDENCE FINDINGS)
            ========================================================================= */}
        <section aria-labelledby="executive-readout-title" className="signal-panel rounded-3xl p-6 sm:p-8 relative overflow-hidden bg-[#172033] border border-[#2E3D5C] text-[#F7F9FC]">
          <div className="absolute right-0 top-0 bottom-0 w-full sm:w-2/3 pointer-events-none opacity-40 z-0">
            <DataFieldCanvas mode="signal-brief" />
          </div>
          <div className="absolute top-0 right-0 w-96 h-96 bg-[#3656C8]/20 rounded-full blur-3xl pointer-events-none" />

          <div className="relative z-10 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/10 pb-4">
              <div>
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 border border-white/15 text-[11px] font-mono text-[#9EB4FA]">
                  <Sparkles className="w-3.5 h-3.5 text-[#9EB4FA]" />
                  <span>EXECUTIVE READOUT</span>
                </div>
                <h1 id="executive-readout-title" className="text-xl sm:text-2xl font-extrabold tracking-tight mt-2 text-white">
                  Dataset evidence and key observations
                </h1>
              </div>
              <div className="text-left sm:text-right text-xs text-[#B8C2D5]">
                Scope: <strong className="text-white">{data.dataset_name}</strong>
                <div className="text-[11px] text-[#8C9BB5] font-mono">
                  {validRows.toLocaleString()} usable feedback records
                </div>
              </div>
            </div>

            {/* 4 Deterministic Evidence Findings Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Finding 1: Usability & Duplication */}
              <div className="p-4 rounded-2xl bg-[#202C43]/90 border border-[#2E3D5C] backdrop-blur-md flex flex-col justify-between space-y-3">
                <div className="space-y-1.5">
                  <div className="text-[10px] font-mono uppercase tracking-wider text-[#9EB4FA] font-bold">
                    1. Data Usability
                  </div>
                  <p className="text-xs text-[#E2E8F0] leading-relaxed">
                    <strong className="text-white">{validRows.toLocaleString()}</strong> of{" "}
                    <strong className="text-white">{totalSourceRows.toLocaleString()}</strong> source rows ({usabilityPct}%) contain usable feedback.
                  </p>
                  <p className="text-[11px] text-[#A2AEBD] leading-relaxed">
                    Includes {uniqueStatements.toLocaleString()} distinct exact comment texts and {extraDuplicates.toLocaleString()} extra duplicate occurrences.
                  </p>
                </div>
                <div className="pt-2 border-t border-white/10">
                  <Link
                    href="/feedback"
                    className="text-[11px] text-[#9EB4FA] hover:text-white font-semibold inline-flex items-center gap-1 group focus-visible-ring"
                  >
                    <span>Inspect feedback records</span>
                    <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                  </Link>
                </div>
              </div>

              {/* Finding 2: Category Concentration */}
              <div className="p-4 rounded-2xl bg-[#202C43]/90 border border-[#2E3D5C] backdrop-blur-md flex flex-col justify-between space-y-3">
                <div className="space-y-1.5">
                  <div className="text-[10px] font-mono uppercase tracking-wider text-[#9EB4FA] font-bold">
                    2. Primary Category
                  </div>
                  {topCategory ? (
                    <>
                      <p className="text-xs text-[#E2E8F0] leading-relaxed">
                        <strong className="text-white">{topCategory[0]}</strong> represents{" "}
                        <strong className="text-white">{topCategorySharePct}%</strong> of valid categorized feedback ({topCategory[1].toLocaleString()} records).
                      </p>
                      <p className="text-[11px] text-[#A2AEBD] leading-relaxed">
                        Indicates high inbound ticket volume; does not establish severity or customer-level prevalence.
                      </p>
                    </>
                  ) : (
                    <p className="text-xs text-[#A2AEBD]">No category tags found in source file.</p>
                  )}
                </div>
                <div className="pt-2 border-t border-white/10">
                  {topCategory ? (
                    <Link
                      href={`/feedback?category=${encodeURIComponent(topCategory[0])}`}
                      className="text-[11px] text-[#9EB4FA] hover:text-white font-semibold inline-flex items-center gap-1 group focus-visible-ring"
                    >
                      <span>Filter by {topCategory[0]}</span>
                      <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                    </Link>
                  ) : (
                    <span className="text-[11px] text-[#8C9BB5]">No category filter</span>
                  )}
                </div>
              </div>

              {/* Finding 3: Tone Cues Scan */}
              <div className="p-4 rounded-2xl bg-[#202C43]/90 border border-[#2E3D5C] backdrop-blur-md flex flex-col justify-between space-y-3">
                <div className="space-y-1.5">
                  <div className="text-[10px] font-mono uppercase tracking-wider text-[#9EB4FA] font-bold">
                    3. Tone Heuristic
                  </div>
                  {sentiment && sentimentTotal > 0 ? (
                    <>
                      <p className="text-xs text-[#E2E8F0] leading-relaxed">
                        Analyzed {sentimentTotal.toLocaleString()} records ({sentimentCoveragePct}% coverage):{" "}
                        <strong className="text-[#FF8080]">{negPct}% negative</strong> vs{" "}
                        <strong className="text-[#6EE7B7]">{posPct}% positive</strong>.
                      </p>
                      <p className="text-[11px] text-[#A2AEBD] leading-relaxed">
                        Rule-based keyword scan for triage cues; not a calibrated satisfaction probability or NPS.
                      </p>
                    </>
                  ) : (
                    <p className="text-xs text-[#A2AEBD] leading-relaxed">
                      Tone analysis has not yet been computed for this dataset.
                    </p>
                  )}
                </div>
                <div className="pt-2 border-t border-white/10">
                  {sentiment && sentimentTotal > 0 ? (
                    <Link
                      href="/feedback?sentiment=negative"
                      className="text-[11px] text-[#9EB4FA] hover:text-white font-semibold inline-flex items-center gap-1 group focus-visible-ring"
                    >
                      <span>Inspect negative tone records</span>
                      <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                    </Link>
                  ) : (
                    <Link
                      href="/feedback"
                      className="text-[11px] text-[#9EB4FA] hover:text-white font-semibold inline-flex items-center gap-1 group focus-visible-ring"
                    >
                      <span>Browse feedback stream</span>
                      <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                    </Link>
                  )}
                </div>
              </div>

              {/* Finding 4: Rule-based Triage Issues */}
              <div className="p-4 rounded-2xl bg-[#202C43]/90 border border-[#2E3D5C] backdrop-blur-md flex flex-col justify-between space-y-3">
                <div className="space-y-1.5">
                  <div className="text-[10px] font-mono uppercase tracking-wider text-[#9EB4FA] font-bold">
                    4. Operational Triage
                  </div>
                  <p className="text-xs text-[#E2E8F0] leading-relaxed">
                    <strong className="text-white">{criticalCount} critical</strong> and{" "}
                    <strong className="text-white">{highCount} high-priority</strong> clusters classified by keyword triage rules.
                  </p>
                  <p className="text-[11px] text-[#A2AEBD] leading-relaxed">
                    {issues.length} total issue clusters organized by topic keywords to accelerate manual verification.
                  </p>
                </div>
                <div className="pt-2 border-t border-white/10">
                  <Link
                    href="/issues"
                    className="text-[11px] text-[#9EB4FA] hover:text-white font-semibold inline-flex items-center gap-1 group focus-visible-ring"
                  >
                    <span>Review prioritized issues</span>
                    <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* =========================================================================
            SECTION 2: DECISION-RELEVANT METRIC CARDS (ACCESSIBLE INLINE EXPLANATIONS)
            ========================================================================= */}
        <section aria-labelledby="kpis-title" className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 id="kpis-title" className="text-xs font-bold tracking-wider uppercase text-[#687386]">
              Decision-relevant metrics
            </h2>
            <span className="text-[11px] text-[#687386]">
              Click &quot;How this is calculated&quot; on any card to view formulas &amp; denominators
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {/* KPI 1: Source & Usability */}
            <div className="solid-data rounded-2xl p-5 shadow-xs flex flex-col justify-between border-l-4 border-l-[#3656C8] space-y-3">
              <div>
                <div className="flex items-center justify-between text-xs text-[#4D5765]">
                  <span className="font-bold text-[#20252D]">Source rows &amp; usability</span>
                  <button
                    onClick={() => toggleDisclosure("kpi-source")}
                    className="text-[11px] text-[#3656C8] hover:underline inline-flex items-center gap-1 focus-visible-ring rounded"
                    aria-expanded={!!openDisclosures["kpi-source"]}
                    aria-label="Toggle calculation details for Source rows"
                  >
                    <HelpCircle className="w-3.5 h-3.5" />
                    <span>How it&apos;s calculated</span>
                  </button>
                </div>
                <div className="text-3xl font-extrabold text-[#20252D] mt-2 tracking-tight">
                  {validRows.toLocaleString()}
                </div>
                <div className="text-xs text-[#4D5765] mt-1">
                  valid records ({usabilityPct}% of {totalSourceRows.toLocaleString()} source rows)
                </div>
              </div>

              {openDisclosures["kpi-source"] && (
                <div className="p-3 bg-[#F0F2F5] rounded-xl text-xs text-[#394457] space-y-1.5 border border-[#DDE2E9] animate-in fade-in duration-200">
                  <div className="font-bold text-[#20252D]">Calculation method:</div>
                  <p><strong>Formula:</strong> Valid feedback records = Total source rows - Blank/corrupted rows.</p>
                  <p><strong>Denominator:</strong> {totalSourceRows.toLocaleString()} non-header CSV rows read during import.</p>
                  <p><strong>Caveat:</strong> Excludes rows with empty feedback text ({invalidRows.toLocaleString()} excluded rows).</p>
                </div>
              )}

              <div className="pt-2 border-t border-[#E2E3DD] flex items-center justify-between text-[11px] text-[#7B8491]">
                <span>{invalidRows > 0 ? `${invalidRows.toLocaleString()} rows excluded` : "Zero rows excluded"}</span>
                <span className="font-mono font-bold text-[#3656C8]">{usabilityPct}% usable</span>
              </div>
            </div>

            {/* KPI 2: Distinct Comment Texts */}
            <div className="solid-data rounded-2xl p-5 shadow-xs flex flex-col justify-between space-y-3">
              <div>
                <div className="flex items-center justify-between text-xs text-[#4D5765]">
                  <span className="font-bold text-[#20252D]">Distinct comment texts</span>
                  <button
                    onClick={() => toggleDisclosure("kpi-distinct")}
                    className="text-[11px] text-[#3656C8] hover:underline inline-flex items-center gap-1 focus-visible-ring rounded"
                    aria-expanded={!!openDisclosures["kpi-distinct"]}
                    aria-label="Toggle calculation details for Distinct comments"
                  >
                    <HelpCircle className="w-3.5 h-3.5" />
                    <span>How it&apos;s calculated</span>
                  </button>
                </div>
                <div className="text-3xl font-extrabold text-[#5876B8] mt-2 tracking-tight">
                  {uniqueStatements.toLocaleString()}
                </div>
                <div className="text-xs text-[#4D5765] mt-1">
                  distinct texts ({uniquePct}% of valid feedback)
                </div>
              </div>

              {openDisclosures["kpi-distinct"] && (
                <div className="p-3 bg-[#F0F2F5] rounded-xl text-xs text-[#394457] space-y-1.5 border border-[#DDE2E9] animate-in fade-in duration-200">
                  <div className="font-bold text-[#20252D]">Calculation method:</div>
                  <p><strong>Formula:</strong> Count of unique feedback strings after whitespace trimming.</p>
                  <p><strong>Denominator:</strong> {validRows.toLocaleString()} valid feedback records.</p>
                  <p><strong>Caveat:</strong> Exact verbatim text uniqueness only. Does not measure semantic similarity or distinct customer counts.</p>
                </div>
              )}

              <div className="pt-2 border-t border-[#E2E3DD] flex items-center justify-between text-[11px] text-[#7B8491]">
                <span>Exact text uniqueness</span>
                <span className="font-mono font-bold text-[#3B5899]">{uniquePct}% distinct</span>
              </div>
            </div>

            {/* KPI 3: Extra Duplicate Occurrences */}
            <div className="solid-data rounded-2xl p-5 shadow-xs flex flex-col justify-between space-y-3">
              <div>
                <div className="flex items-center justify-between text-xs text-[#4D5765]">
                  <span className="font-bold text-[#20252D]">Extra duplicate occurrences</span>
                  <button
                    onClick={() => toggleDisclosure("kpi-duplicates")}
                    className="text-[11px] text-[#3656C8] hover:underline inline-flex items-center gap-1 focus-visible-ring rounded"
                    aria-expanded={!!openDisclosures["kpi-duplicates"]}
                    aria-label="Toggle calculation details for Extra duplicate occurrences"
                  >
                    <HelpCircle className="w-3.5 h-3.5" />
                    <span>How it&apos;s calculated</span>
                  </button>
                </div>
                <div className="text-3xl font-extrabold text-[#C6534D] mt-2 tracking-tight">
                  {extraDuplicates.toLocaleString()}
                </div>
                <div className="text-xs text-[#4D5765] mt-1">
                  extra occurrences ({extraDupsPct}% duplicate share)
                </div>
              </div>

              {openDisclosures["kpi-duplicates"] && (
                <div className="p-3 bg-[#F0F2F5] rounded-xl text-xs text-[#394457] space-y-1.5 border border-[#DDE2E9] animate-in fade-in duration-200">
                  <div className="font-bold text-[#20252D]">Calculation method:</div>
                  <p><strong>Formula:</strong> Sum of (occurrence_count - 1) across all text groups appearing &gt;1 time.</p>
                  <p><strong>Denominator:</strong> {validRows.toLocaleString()} valid feedback records.</p>
                  <p><strong>Context:</strong> {rowsInRepeatedGroups.toLocaleString()} total rows belong to repeated-text groups. Excludes the first copy of each text.</p>
                  <p><strong>Caveat:</strong> Identifies repetition in feedback text; does not infer distinct customer counts.</p>
                </div>
              )}

              <div className="pt-2 border-t border-[#E2E3DD] flex items-center justify-between text-[11px] text-[#7B8491]">
                <span>{rowsInRepeatedGroups.toLocaleString()} rows in repeated groups</span>
                <span className="font-mono font-bold text-[#C6534D]">{extraDupsPct}%</span>
              </div>
            </div>

            {/* KPI 4: Priority Issues to Review */}
            <div className="solid-data rounded-2xl p-5 shadow-xs flex flex-col justify-between space-y-3">
              <div>
                <div className="flex items-center justify-between text-xs text-[#4D5765]">
                  <span className="font-bold text-[#20252D]">Issues to review</span>
                  <button
                    onClick={() => toggleDisclosure("kpi-issues")}
                    className="text-[11px] text-[#3656C8] hover:underline inline-flex items-center gap-1 focus-visible-ring rounded"
                    aria-expanded={!!openDisclosures["kpi-issues"]}
                    aria-label="Toggle calculation details for Issues to review"
                  >
                    <HelpCircle className="w-3.5 h-3.5" />
                    <span>How it&apos;s calculated</span>
                  </button>
                </div>
                <div className="text-3xl font-extrabold text-[#3656C8] mt-2 tracking-tight">
                  {issues.length}
                </div>
                <div className="text-xs text-[#4D5765] mt-1">
                  {criticalCount + highCount} critical or high priority
                </div>
              </div>

              {openDisclosures["kpi-issues"] && (
                <div className="p-3 bg-[#F0F2F5] rounded-xl text-xs text-[#394457] space-y-1.5 border border-[#DDE2E9] animate-in fade-in duration-200">
                  <div className="font-bold text-[#20252D]">Calculation method:</div>
                  <p><strong>Formula:</strong> Feedback grouped by topic keywords into triage clusters.</p>
                  <p><strong>Priorities:</strong> Assigned by predefined rules (e.g., fraud keywords = Critical; fulfillment/crashes = High).</p>
                  <p><strong>Caveat:</strong> Triage classifications are rule-based operational cues, not quantified financial-risk scores.</p>
                </div>
              )}

              <div className="pt-2 border-t border-[#E2E3DD] flex items-center justify-between text-[11px] text-[#7B8491]">
                <span>Rule-based triage</span>
                <span className="font-mono font-bold text-[#3656C8]">{criticalCount} Critical</span>
              </div>
            </div>
          </div>
        </section>

        {/* =========================================================================
            SECTION 3: ANALYTICAL EVIDENCE GRID (12 COLUMNS)
            Left (5 cols): Feedback Categories & Tone Heuristic
            Right (7 cols): Top Repeated Comments (Normalized Comparison)
            ========================================================================= */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left 5 Columns: Categories & Sentiment */}
          <div className="lg:col-span-5 space-y-6">
            {/* 3.1: Feedback Categories Horizontal Bar Chart */}
            <div className="p-6 solid-data rounded-3xl space-y-5 shadow-xs">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-sm font-bold text-[#111827] uppercase tracking-wider">
                    Feedback categories
                  </h3>
                  <p className="text-xs text-[#687386] mt-0.5">
                    Distribution across {categoryEntries.length} categories ({totalCategorizedRows.toLocaleString()} valid categorized records)
                  </p>
                </div>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-[#ECEFF3] text-[#394457]">
                  Categorized
                </span>
              </div>

              {/* Category Horizontal Bars */}
              <div className="space-y-4 pt-1">
                {categoryEntries.length === 0 ? (
                  <div className="p-6 text-center text-xs text-[#687386] bg-[#F5F5F1] rounded-2xl border border-dashed border-[#CCD0D7]">
                    No category labels available in this dataset.
                  </div>
                ) : (
                  categoryEntries.map(([category, count]) => {
                    const pct = totalCategorizedRows > 0 ? ((count / totalCategorizedRows) * 100).toFixed(1) : "0.0";
                    const style = CATEGORY_COLORS[category] || {
                      bar: "#687386",
                      text: "#111827",
                      bg: "#ECEFF3",
                      border: "#DDE2E9",
                    };

                    return (
                      <Link
                        key={category}
                        href={`/feedback?category=${encodeURIComponent(category)}`}
                        className="block group focus-visible-ring rounded-xl p-2 -mx-2 hover:bg-[#F5F5F1] transition-colors"
                        title={`Click to inspect ${count.toLocaleString()} feedback records in ${category}`}
                      >
                        <div className="space-y-1.5">
                          <div className="flex items-center justify-between text-xs">
                            <div className="flex items-center gap-2">
                              <span
                                className="w-2.5 h-2.5 rounded-full shrink-0"
                                style={{ backgroundColor: style.bar }}
                              />
                              <span className="font-bold text-[#111827] group-hover:text-[#3656C8] transition-colors">
                                {category}
                              </span>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              <span className="font-mono font-bold text-[#111827]">
                                {count.toLocaleString()}
                              </span>
                              <span className="text-[11px] text-[#687386] font-mono">
                                ({pct}%)
                              </span>
                              <span className="text-[10px] text-[#3656C8] opacity-0 group-hover:opacity-100 transition-opacity">
                                →
                              </span>
                            </div>
                          </div>

                          <div className="w-full h-2.5 bg-[#ECEFF3] rounded-full overflow-hidden">
                            <div
                              className="h-full rounded-full transition-all duration-500"
                              style={{
                                width: `${pct}%`,
                                backgroundColor: style.bar,
                              }}
                            />
                          </div>
                        </div>
                      </Link>
                    );
                  })
                )}
              </div>

              {/* Standard Explanation Pattern Block */}
              <div className="pt-4 border-t border-[#DDE2E9] space-y-2 text-xs">
                {topCategory && (
                  <p className="text-[#394457] leading-relaxed">
                    <strong>What we observed: </strong>
                    {topCategory[0]} accounts for {topCategorySharePct}% of valid categorized feedback records ({topCategory[1].toLocaleString()} records).
                  </p>
                )}
                <p className="text-[#687386] leading-relaxed">
                  <strong>Why it matters: </strong>
                  Concentrates operational triage on the highest-volume incoming topic. Note that category counts include repeated texts and do not establish customer-level prevalence or severity.
                </p>

                <div className="flex flex-wrap items-center justify-between gap-2 pt-2">
                  {topCategory && (
                    <Link
                      href={`/feedback?category=${encodeURIComponent(topCategory[0])}`}
                      className="text-xs font-bold text-[#3656C8] hover:underline inline-flex items-center gap-1 focus-visible-ring"
                    >
                      <span>Inspect {topCategory[0]} comments ({topCategory[1].toLocaleString()})</span>
                      <ExternalLink className="w-3 h-3" />
                    </Link>
                  )}
                  <button
                    onClick={() => toggleDisclosure("calc-category")}
                    className="text-[11px] text-[#687386] hover:text-[#20252D] inline-flex items-center gap-1 focus-visible-ring"
                    aria-expanded={!!openDisclosures["calc-category"]}
                  >
                    <span>How it&apos;s calculated</span>
                    {openDisclosures["calc-category"] ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                  </button>
                </div>

                {openDisclosures["calc-category"] && (
                  <div className="p-3 bg-[#F0F2F5] rounded-xl text-[11px] text-[#4D5765] space-y-1 border border-[#DDE2E9] animate-in fade-in duration-200">
                    <p><strong>Formula:</strong> (Category count ÷ Valid categorized records) × 100.</p>
                    <p><strong>Denominator:</strong> {totalCategorizedRows.toLocaleString()} valid categorized rows (excludes invalid source rows).</p>
                    <p><strong>Caveat:</strong> Categories represent original tags in the imported file, not derived sentiment or measured business impact.</p>
                  </div>
                )}
              </div>
            </div>

            {/* 3.2: Tone Heuristic & Analysis Coverage */}
            <div className="p-6 solid-data rounded-3xl space-y-5 shadow-xs">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-sm font-bold text-[#111827] uppercase tracking-wider">
                    Tone distribution &amp; coverage
                  </h3>
                  <p className="text-xs text-[#687386] mt-0.5">
                    Estimated tone across {sentimentTotal.toLocaleString()} analyzed records
                  </p>
                </div>
                <span
                  className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${
                    sentimentTotal > 0
                      ? "bg-[#E8F3EE] text-[#2E7D68] border-[#2E7D68]/20"
                      : "bg-[#F0F2F5] text-[#7B8491] border-[#E2E3DD]"
                  }`}
                >
                  {sentimentTotal > 0 ? `${sentimentCoveragePct}% Coverage` : "Not analyzed"}
                </span>
              </div>

              {sentiment && sentimentTotal > 0 ? (
                <div className="space-y-4">
                  {/* Analysis Coverage Gauge */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-[11px] text-[#687386]">
                      <span>Analysis coverage: {sentimentTotal.toLocaleString()} of {validRows.toLocaleString()} valid feedback records</span>
                      <span className="font-mono font-bold text-[#20252D]">{sentimentCoveragePct}%</span>
                    </div>
                    <div className="w-full h-1.5 bg-[#ECEFF3] rounded-full overflow-hidden">
                      <div className="h-full bg-[#3656C8] rounded-full" style={{ width: `${sentimentCoveragePct}%` }} />
                    </div>
                  </div>

                  {/* 100% Stacked Horizontal Tone Distribution Bar */}
                  <div className="space-y-1.5">
                    <div className="text-[11px] font-bold text-[#4D5765]">Tone composition (100% of analyzed records):</div>
                    <div className="w-full h-4 rounded-full overflow-hidden flex bg-[#ECEFF3] border border-[#DDE2E9]" role="img" aria-label={`Sentiment breakdown: ${posPct}% Positive, ${neuPct}% Neutral, ${negPct}% Negative, ${mixedPct}% Mixed, ${unknownPct}% Unknown`}>
                      {posCount > 0 && (
                        <div
                          className="bg-[#2E7D68] h-full"
                          style={{ width: `${posPct}%` }}
                          title={`Positive: ${posCount.toLocaleString()} (${posPct}%)`}
                        />
                      )}
                      {neuCount > 0 && (
                        <div
                          className="bg-[#6C7786] h-full"
                          style={{ width: `${neuPct}%` }}
                          title={`Neutral: ${neuCount.toLocaleString()} (${neuPct}%)`}
                        />
                      )}
                      {negCount > 0 && (
                        <div
                          className="bg-[#C6534D] h-full"
                          style={{ width: `${negPct}%` }}
                          title={`Negative: ${negCount.toLocaleString()} (${negPct}%)`}
                        />
                      )}
                      {mixedCount > 0 && (
                        <div
                          className="bg-[#8B6E9B] h-full"
                          style={{ width: `${mixedPct}%` }}
                          title={`Mixed: ${mixedCount.toLocaleString()} (${mixedPct}%)`}
                        />
                      )}
                      {unknownCount > 0 && (
                        <div
                          className="bg-[#94A3B8] h-full"
                          style={{ width: `${unknownPct}%` }}
                          title={`Unknown: ${unknownCount.toLocaleString()} (${unknownPct}%)`}
                        />
                      )}
                    </div>
                  </div>

                  {/* Accessible Legend & Filter Links */}
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 pt-1">
                    <Link
                      href="/feedback?sentiment=positive"
                      className="p-2.5 rounded-xl bg-[#E8F3EE] border border-[#2E7D68]/20 text-center hover:border-[#2E7D68] transition-colors focus-visible-ring"
                      title="Filter feedback: Positive"
                    >
                      <div className="text-[10px] font-bold uppercase text-[#2E7D68]">Positive</div>
                      <div className="text-sm font-extrabold text-[#20252D]">{posCount.toLocaleString()}</div>
                      <div className="text-[10px] text-[#2E7D68] font-mono">{posPct}%</div>
                    </Link>

                    <Link
                      href="/feedback?sentiment=neutral"
                      className="p-2.5 rounded-xl bg-[#F0F2F5] border border-[#E2E3DD] text-center hover:border-[#6C7786] transition-colors focus-visible-ring"
                      title="Filter feedback: Neutral"
                    >
                      <div className="text-[10px] font-bold uppercase text-[#6C7786]">Neutral</div>
                      <div className="text-sm font-extrabold text-[#20252D]">{neuCount.toLocaleString()}</div>
                      <div className="text-[10px] text-[#4D5765] font-mono">{neuPct}%</div>
                    </Link>

                    <Link
                      href="/feedback?sentiment=negative"
                      className="p-2.5 rounded-xl bg-[#FAECEB] border border-[#C6534D]/20 text-center hover:border-[#C6534D] transition-colors focus-visible-ring"
                      title="Filter feedback: Negative"
                    >
                      <div className="text-[10px] font-bold uppercase text-[#C6534D]">Negative</div>
                      <div className="text-sm font-extrabold text-[#20252D]">{negCount.toLocaleString()}</div>
                      <div className="text-[10px] text-[#C6534D] font-mono">{negPct}%</div>
                    </Link>

                    <Link
                      href="/feedback?sentiment=mixed"
                      className="p-2.5 rounded-xl bg-[#F6F0F8] border border-[#8B6E9B]/20 text-center hover:border-[#8B6E9B] transition-colors focus-visible-ring"
                      title="Filter feedback: Mixed"
                    >
                      <div className="text-[10px] font-bold uppercase text-[#8B6E9B]">Mixed</div>
                      <div className="text-sm font-extrabold text-[#20252D]">{mixedCount.toLocaleString()}</div>
                      <div className="text-[10px] text-[#8B6E9B] font-mono">{mixedPct}%</div>
                    </Link>

                    <Link
                      href="/feedback?sentiment=unknown"
                      className="p-2.5 rounded-xl bg-[#F0F2F5] border border-[#CCD0D7] text-center hover:border-[#94A3B8] transition-colors focus-visible-ring"
                      title="Filter feedback: Unknown / Unclassified"
                    >
                      <div className="text-[10px] font-bold uppercase text-[#687386]">Unknown</div>
                      <div className="text-sm font-extrabold text-[#20252D]">{unknownCount.toLocaleString()}</div>
                      <div className="text-[10px] text-[#687386] font-mono">{unknownPct}%</div>
                    </Link>
                  </div>
                </div>
              ) : (
                <div className="p-6 rounded-2xl bg-[#F6F5F1] border border-dashed border-[#CCD0D7] text-center text-xs text-[#687386]">
                  Sentiment analysis pending or not yet computed for this dataset.
                </div>
              )}

              {/* Standard Explanation Pattern Block */}
              <div className="pt-4 border-t border-[#DDE2E9] space-y-2 text-xs">
                <p className="text-[#394457] leading-relaxed">
                  <strong>What we observed: </strong>
                  Tone is estimated using a rule-based text heuristic. Negative phrasing accounts for {negPct}% of analyzed rows, while positive phrasing represents {posPct}%.
                </p>
                <p className="text-[#687386] leading-relaxed">
                  <strong>Why it matters: </strong>
                  Provides a rapid scan for friction words to guide manual review. Note: &quot;Unknown&quot; is an analyzed row where the heuristic could not classify polarity.
                </p>

                <div className="flex flex-wrap items-center justify-between gap-2 pt-2">
                  <Link
                    href="/feedback?sentiment=negative"
                    className="text-xs font-bold text-[#3656C8] hover:underline inline-flex items-center gap-1 focus-visible-ring"
                  >
                    <span>Inspect negative comments ({negCount.toLocaleString()})</span>
                    <ExternalLink className="w-3 h-3" />
                  </Link>
                  <button
                    onClick={() => toggleDisclosure("calc-sentiment")}
                    className="text-[11px] text-[#687386] hover:text-[#20252D] inline-flex items-center gap-1 focus-visible-ring"
                    aria-expanded={!!openDisclosures["calc-sentiment"]}
                  >
                    <span>How it&apos;s calculated</span>
                    {openDisclosures["calc-sentiment"] ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                  </button>
                </div>

                {openDisclosures["calc-sentiment"] && (
                  <div className="p-3 bg-[#F0F2F5] rounded-xl text-[11px] text-[#4D5765] space-y-1 border border-[#DDE2E9] animate-in fade-in duration-200">
                    <p><strong>Method:</strong> Lexicon-based keyword match rules (<code className="text-[#111827]">lexicon-rules-v1.0</code>).</p>
                    <p><strong>Coverage:</strong> {sentimentTotal.toLocaleString()} of {validRows.toLocaleString()} valid feedback records ({sentimentCoveragePct}%).</p>
                    <p><strong>Caveat:</strong> The heuristic misses sarcasm, complex negation, and nuanced domain terms. Confidence is explicitly uncalibrated; treat results as review cues, not ground truth satisfaction scores or NPS.</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Right 7 Columns: Top Repeated Comments */}
          <div id="repeated-statements" className="lg:col-span-7 space-y-6">
            <div className="p-6 solid-data rounded-3xl space-y-5 shadow-xs">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-sm font-bold text-[#20252D] uppercase tracking-wider">
                    Top repeated comments
                  </h3>
                  <p className="text-xs text-[#7B8491] mt-0.5">
                    Highest-frequency exact text matches across {validRows.toLocaleString()} valid feedback records
                  </p>
                </div>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-[#172033] text-white">
                  Top 5 exact matches
                </span>
              </div>

              {/* Ranking List */}
              <div className="space-y-3">
                {topStatements.length === 0 ? (
                  <div className="p-8 text-center bg-[#F6F5F1] rounded-2xl border border-dashed border-[#CCD0D7]">
                    <p className="text-xs font-semibold text-[#687386]">
                      No repeated exact comments found in this dataset. Every feedback text appears only once.
                    </p>
                  </div>
                ) : (
                  topStatements.map((item, idx) => {
                    const categoryStyle = CATEGORY_COLORS[item.category] || {
                      bar: "#7B8491",
                      text: "#20252D",
                      bg: "#F0F2F5",
                      border: "#E2E3DD",
                    };
                    const extraDups = item.extra_duplicates ?? Math.max(0, item.count - 1);
                    const sharePct = validRows > 0 ? ((item.count / validRows) * 100).toFixed(1) : "0.0";
                    const barWidthPct = Math.min(100, Math.round((item.count / maxStatementCount) * 100));

                    return (
                      <div
                        key={idx}
                        className="p-4 rounded-2xl bg-[#F6F5F1] border border-[#E2E3DD] hover:border-[#3656C8] hover:bg-white transition-all space-y-2 group"
                      >
                        <div className="flex items-center justify-between text-xs">
                          <div className="flex items-center gap-2">
                            <span className="w-5 h-5 rounded-full bg-[#172033] text-white text-[10px] font-bold flex items-center justify-center font-mono">
                              {idx + 1}
                            </span>
                            <span
                              className="text-[10px] font-bold px-2 py-0.5 rounded-full border"
                              style={{
                                backgroundColor: categoryStyle.bg,
                                color: categoryStyle.text,
                                borderColor: categoryStyle.border,
                              }}
                            >
                              {item.category}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-extrabold text-[#20252D] text-xs">
                              appears {item.count} times
                            </span>
                            <span className="text-[11px] text-[#7B8491]">
                              ({extraDups} extra copies · {sharePct}% of valid records)
                            </span>
                          </div>
                        </div>

                        <p className="text-xs text-[#20252D] italic font-serif leading-relaxed line-clamp-2">
                          &quot;{item.statement}&quot;
                        </p>

                        {/* Comparative Visual Bar */}
                        <div className="w-full h-2 bg-[#E2E3DD] rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all duration-300"
                            style={{
                              width: `${barWidthPct}%`,
                              backgroundColor: categoryStyle.bar,
                            }}
                          />
                        </div>

                        <div className="pt-1 flex items-center justify-between text-[11px]">
                          <span className="text-[#7B8491]">Exact text match</span>
                          <button
                            onClick={async () => {
                              if (item.sample_feedback_ids && item.sample_feedback_ids.length > 0) {
                                try {
                                  const fb = await feedbackApi.get(item.sample_feedback_ids[0]);
                                  setSelectedFeedback(fb);
                                  return;
                                } catch (err) {
                                  console.error("Failed to load feedback record:", err);
                                }
                              }
                              router.push(
                                `/feedback?search=${encodeURIComponent(item.statement.slice(0, 40))}`
                              );
                            }}
                            className="text-[#3656C8] font-bold hover:underline inline-flex items-center gap-1 focus-visible-ring"
                          >
                            <span>View matching comments ({item.count}) →</span>
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Standard Explanation Pattern Block */}
              <div className="pt-4 border-t border-[#DDE2E9] space-y-2 text-xs">
                {topStatements.length > 0 && (
                  <p className="text-[#394457] leading-relaxed">
                    <strong>What we observed: </strong>
                    The most common exact wording appears {topStatements[0].count} times in this dataset (contributing {Math.max(0, topStatements[0].count - 1)} extra duplicate occurrences).
                  </p>
                )}
                <p className="text-[#687386] leading-relaxed">
                  <strong>Why it matters: </strong>
                  Repeated verbatim phrases often highlight scripted feedback, copy-pasted complaints, or standard user journey friction.
                </p>

                <div className="flex flex-wrap items-center justify-between gap-2 pt-2">
                  <Link
                    href="/feedback"
                    className="text-xs font-bold text-[#3656C8] hover:underline inline-flex items-center gap-1 focus-visible-ring"
                  >
                    <span>Inspect all feedback in explorer</span>
                    <ExternalLink className="w-3 h-3" />
                  </Link>
                  <button
                    onClick={() => toggleDisclosure("calc-repeated")}
                    className="text-[11px] text-[#687386] hover:text-[#20252D] inline-flex items-center gap-1 focus-visible-ring"
                    aria-expanded={!!openDisclosures["calc-repeated"]}
                  >
                    <span>How it&apos;s calculated</span>
                    {openDisclosures["calc-repeated"] ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                  </button>
                </div>

                {openDisclosures["calc-repeated"] && (
                  <div className="p-3 bg-[#F0F2F5] rounded-xl text-[11px] text-[#4D5765] space-y-1 border border-[#DDE2E9] animate-in fade-in duration-200">
                    <p><strong>Definition:</strong> &quot;Appears N times&quot; indicates the total occurrence count in the file.</p>
                    <p><strong>Denominator:</strong> {validRows.toLocaleString()} valid feedback records for percentage shares.</p>
                    <p><strong>Scope:</strong> Displays the top 5 highest-frequency exact text matches. It is not a complete Pareto distribution of all phrases.</p>
                    <p><strong>Caveat:</strong> Shows verbatim repetition in imported records; does not prove N unique individuals or verified prevalence of an underlying root cause.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* =========================================================================
            SECTION 4: SUPPORT TRAINING WORKFLOW CALLOUT (ADAPTION LAB)
            ========================================================================= */}
        <section aria-labelledby="adaption-workflow-title" className="p-6 sm:p-7 rounded-3xl bg-white border border-[#E2E3DD] shadow-xs space-y-6">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 pb-5 border-b border-[#E2E3DD]">
            <div className="space-y-1.5 max-w-2xl">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#E9EDFC] text-[10px] font-mono font-bold text-[#3656C8]">
                <Sparkles className="w-3 h-3 text-[#3656C8]" />
                <span>SUPPORT TRAINING DATA</span>
              </div>
              <h3 id="adaption-workflow-title" className="text-base sm:text-lg font-extrabold text-[#20252D] tracking-tight">
                Prepare support-training data
              </h3>
              <p className="text-xs text-[#4D5765] leading-relaxed">
                Transform customer feedback into structured prompt-resolution pairs for support assistant fine-tuning.
              </p>
            </div>

            <div className="flex items-center gap-3 shrink-0">
              <Link
                href="/adaption"
                className="px-5 py-2.5 bg-[#3656C8] hover:bg-[#23387F] text-white text-xs font-bold rounded-xl shadow-xs transition-all focus-visible-ring inline-flex items-center gap-2 group cursor-pointer"
              >
                <span>Prepare support data</span>
                <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
              </Link>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 bg-[#F6F5F1] rounded-2xl border border-[#E2E3DD] space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase font-mono text-[#7B8491]">1. Feedback sample</span>
                <MessageSquare className="w-3.5 h-3.5 text-[#3656C8]" />
              </div>
              <div className="text-xs font-bold text-[#20252D]">Customer feedback</div>
              <p className="text-[11px] text-[#4D5765] leading-relaxed">
                Source: <strong>{data.dataset_name}</strong> ({validRows.toLocaleString()} usable records available).
              </p>
            </div>

            <div className="p-4 bg-[#F6F5F1] rounded-2xl border border-[#E2E3DD] space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase font-mono text-[#7B8491]">2. Support pairs</span>
                <Layers className="w-3.5 h-3.5 text-[#7C3AED]" />
              </div>
              <div className="text-xs font-bold text-[#20252D]">Prompt + context formatting</div>
              <p className="text-[11px] text-[#4D5765] leading-relaxed">
                Formats raw feedback and categories into paired resolution scenarios.
              </p>
            </div>

            <div className="p-4 bg-[#F6F5F1] rounded-2xl border border-[#E2E3DD] space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase font-mono text-[#7B8491]">3. Processing &amp; download</span>
                <Cpu className="w-3.5 h-3.5 text-[#2E7D68]" />
              </div>
              <div className="text-xs font-bold text-[#20252D]">
                {latestAdaptionJob ? (
                  (() => {
                    const isAdapt = latestAdaptionJob.operation_type === "adapt";
                    const st = latestAdaptionJob.status?.toLowerCase();
                    const prefix = isAdapt ? "Latest run: " : "Latest estimate: ";

                    if (st === "succeeded") {
                      return (
                        <span className="inline-flex items-center gap-1.5 text-emerald-700">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600 shrink-0" />
                          <span>{prefix}{isAdapt ? "Completed" : "Quote received"}</span>
                        </span>
                      );
                    }
                    if (st === "running") {
                      return (
                        <span className="inline-flex items-center gap-1.5 text-blue-700">
                          <RotateCw className="w-3 h-3 text-blue-600 animate-spin shrink-0" />
                          <span>{prefix}Running</span>
                        </span>
                      );
                    }
                    if (st === "pending" || st === "queued") {
                      return (
                        <span className="inline-flex items-center gap-1.5 text-[#4D5765]">
                          <Clock className="w-3 h-3 text-[#7B8491] shrink-0" />
                          <span>{prefix}Queued</span>
                        </span>
                      );
                    }
                    if (st === "failed") {
                      return (
                        <span className="inline-flex items-center gap-1.5 text-rose-700">
                          <AlertCircle className="w-3 h-3 text-rose-600 shrink-0" />
                          <span>{prefix}Failed</span>
                        </span>
                      );
                    }
                    return (
                      <span className="inline-flex items-center gap-1.5 text-[#4D5765]">
                        <Clock className="w-3 h-3 text-[#7B8491] shrink-0" />
                        <span>{prefix}{latestAdaptionJob.status}</span>
                      </span>
                    );
                  })()
                ) : (
                  <span className="text-[#4D5765]">Ready to prepare</span>
                )}
              </div>
              <p className="text-[11px] text-[#4D5765] leading-relaxed">
                {adaptionStatus?.daily_runs_remaining !== undefined && adaptionStatus?.daily_runs_remaining !== null
                  ? `${adaptionStatus.daily_runs_remaining}/${adaptionStatus.daily_runs_limit ?? 3} runs remaining today (UTC).`
                  : "Estimate cost, process sample with Adaption Labs, and download dataset."}
              </p>
            </div>
          </div>
        </section>

        {/* =========================================================================
            SECTION 5: PRIORITY ISSUES REQUIRING REVIEW
            ========================================================================= */}
        <section aria-labelledby="issues-review-title" className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 id="issues-review-title" className="text-xs font-bold tracking-wider uppercase text-[#7B8491]">
                Priority issues requiring review ({issues.length})
              </h3>
              <p className="text-xs text-[#7B8491] mt-0.5">
                Rule-based complaint clusters sorted by priority
              </p>
            </div>
            <Link href="/issues" className="text-xs font-bold text-[#3656C8] hover:underline focus-visible-ring">
              View all {issues.length} issues →
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {issues.slice(0, 4).map((issue) => (
              <div
                key={issue.id}
                className="p-5 solid-data rounded-2xl space-y-3 hover:border-[#3656C8] transition-colors"
              >
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                        issue.priority === "Critical"
                          ? "bg-[#FAECEB] text-[#B83D42] border-[#B83D42]/30"
                          : issue.priority === "High"
                          ? "bg-[#FAF5E8] text-[#966C28] border-[#B58A43]/30"
                          : "bg-[#E9EDFC] text-[#3656C8] border-[#3656C8]/30"
                      }`}
                    >
                      {issue.priority ? issue.priority.toUpperCase() : "PROPOSED"}
                    </span>
                    <span className="text-xs text-[#4D5765]">{issue.category}</span>
                  </div>
                  <span className="text-[11px] font-mono text-[#7B8491]">
                    {issue.supporting_count} supporting records ({issue.unique_supporting_count} distinct texts)
                  </span>
                </div>

                <h4 className="text-sm font-bold text-[#20252D] leading-snug">
                  {issue.title}
                </h4>

                <p className="text-xs text-[#4D5765] leading-relaxed line-clamp-2">
                  {issue.summary}
                </p>

                <div className="pt-2 border-t border-[#E2E3DD] flex items-center justify-between text-xs">
                  <span className="text-[11px] text-[#7B8491]">
                    Status: <strong className="text-[#20252D] capitalize">{issue.status}</strong>
                  </span>
                  <Link
                    href={`/issues`}
                    className="text-xs font-bold text-[#3656C8] hover:underline focus-visible-ring"
                  >
                    View issue details →
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* =========================================================================
            SECTION 6: RESTRAINED TIMELINE DISCLOSURE (NO SYNTHETIC TRENDS)
            ========================================================================= */}
        <div className="p-4 sm:p-5 rounded-2xl bg-white border border-[#E2E3DD] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#2E7D68]" />
              <h4 className="text-xs font-bold text-[#20252D] uppercase tracking-wider">
                Timeline trends intentionally withheld
              </h4>
            </div>
            <p className="text-xs text-[#7B8491] leading-relaxed">
              This dataset lacks verified timestamp columns. InsightFlow does not fabricate synthetic dates or time series from file order. To view temporal trends, import a CSV containing an explicit <code className="text-[#20252D] bg-[#F5F5F1] px-1 py-0.5 rounded">timestamp</code> or <code className="text-[#20252D] bg-[#F5F5F1] px-1 py-0.5 rounded">date</code> field.
            </p>
          </div>
          <div className="text-xs font-mono text-[#7B8491] shrink-0">
            Temporal restraint
          </div>
        </div>

        {/* =========================================================================
            SECTION 7: RECENT CUSTOMER FEEDBACK SAMPLES
            ========================================================================= */}
        <section aria-labelledby="recent-feedback-title" className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 id="recent-feedback-title" className="text-xs font-bold tracking-wider uppercase text-[#7B8491]">
                Recent customer feedback records
              </h3>
              <p className="text-xs text-[#7B8491] mt-0.5">
                Sample records imported from {data.dataset_name}
              </p>
            </div>
            <Link
              href="/feedback"
              className="text-xs font-bold text-[#3656C8] hover:underline focus-visible-ring"
            >
              Browse all {validRows.toLocaleString()} records →
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {recentFeedbacks.map((fb) => (
              <div
                key={fb.id}
                onClick={() => setSelectedFeedback(fb)}
                className="p-4 solid-data rounded-2xl space-y-2.5 hover:border-[#3656C8] transition-all cursor-pointer group focus-visible-ring"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    setSelectedFeedback(fb);
                  }
                }}
              >
                <div className="flex items-center justify-between text-xs">
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#F0F2F5] text-[#20252D]">
                    {fb.source_category || "Uncategorized"}
                  </span>
                  <span className="font-mono text-[10px] text-[#7B8491]">
                    #{fb.id.slice(0, 6)}
                  </span>
                </div>
                <p className="text-xs text-[#20252D] line-clamp-3 italic leading-relaxed">
                  &quot;{fb.original_text}&quot;
                </p>
                <div className="text-[11px] text-[#3656C8] font-semibold group-hover:underline pt-1">
                  Inspect record details →
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>

      {/* =========================================================================
          SLIDE-OVER EVIDENCE INSPECTION DRAWER
          ========================================================================= */}
      {selectedFeedback && (
        <div className="fixed inset-0 z-50 flex justify-end" role="dialog" aria-modal="true" aria-labelledby="drawer-feedback-title">
          <div
            className="fixed inset-0 bg-black/40 backdrop-blur-sm transition-opacity"
            onClick={() => setSelectedFeedback(null)}
          />

          <div className="relative w-full max-w-md bg-white h-full shadow-2xl p-6 sm:p-8 flex flex-col justify-between z-10 animate-in slide-in-from-right duration-250">
            <div className="space-y-6">
              <div className="flex items-center justify-between pb-4 border-b border-[#E2E3DD]">
                <div>
                  <div className="text-[10px] font-bold uppercase tracking-wider text-[#7B8491]">
                    Evidence record inspection
                  </div>
                  <h3 id="drawer-feedback-title" className="text-base font-extrabold text-[#20252D] font-mono">
                    #{selectedFeedback.id}
                  </h3>
                </div>
                <button
                  onClick={() => setSelectedFeedback(null)}
                  className="w-8 h-8 rounded-full bg-[#F0F2F5] hover:bg-[#E2E3DD] text-[#20252D] flex items-center justify-center font-bold text-sm focus-visible-ring"
                  aria-label="Close drawer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-2">
                <div className="text-xs font-bold text-[#20252D]">
                  Exact feedback text:
                </div>
                <div className="p-4 bg-[#F6F5F1] rounded-2xl border border-[#E2E3DD] text-xs font-serif italic text-[#20252D] leading-relaxed">
                  &quot;{selectedFeedback.original_text}&quot;
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-[#F6F5F1] rounded-xl border border-[#E2E3DD]">
                  <div className="text-[10px] font-bold text-[#7B8491] uppercase">
                    Source category
                  </div>
                  <div className="text-xs font-bold text-[#20252D] mt-0.5">
                    {selectedFeedback.source_category || "Uncategorized"}
                  </div>
                </div>
                <div className="p-3 bg-[#F6F5F1] rounded-xl border border-[#E2E3DD]">
                  <div className="text-[10px] font-bold text-[#7B8491] uppercase">
                    Tone label
                  </div>
                  <div className="text-xs font-bold text-[#2E7D68] mt-0.5 capitalize">
                    {selectedFeedback.sentiment_label || "Unanalyzed"}
                  </div>
                </div>
              </div>

              <div className="p-4 bg-[#F6F5F1] rounded-2xl border border-[#E2E3DD] space-y-1">
                <div className="text-xs font-bold text-[#20252D]">
                  Evidence integrity:
                </div>
                <p className="text-[11px] text-[#4D5765] leading-relaxed">
                  This record is preserved verbatim from the original CSV import. Exact matching guarantees record fidelity.
                </p>
              </div>
            </div>

            <div className="pt-4 border-t border-[#E2E3DD] flex gap-3">
              <Link
                href={`/feedback?id=${encodeURIComponent(selectedFeedback.id)}`}
                className="flex-1 py-2.5 bg-[#3656C8] hover:bg-[#23387F] text-white text-xs font-bold rounded-xl text-center shadow-sm transition-colors focus-visible-ring"
              >
                Inspect in feedback stream →
              </Link>
              <button
                onClick={() => setSelectedFeedback(null)}
                className="px-4 py-2.5 bg-[#F0F2F5] text-[#20252D] text-xs font-semibold rounded-xl hover:bg-[#E2E3DD] transition-colors focus-visible-ring"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
