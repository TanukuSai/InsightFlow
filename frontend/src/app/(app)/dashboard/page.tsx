"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import AppHeader from "@/components/navigation/AppHeader";
import DataFieldCanvas from "@/components/background/DataFieldCanvas";
import { dashboardApi, issuesApi, feedbackApi, adaptionApi } from "@/lib/api/client";
import { DashboardData, Issue, Feedback, AdaptionJobResponse, AdaptionConfigStatus } from "@/lib/api/types";

import { useDataset } from "@/lib/context/DatasetContext";
import { Sparkles, ArrowRight, Database, Cpu, CheckCircle2, MessageSquare, Layers, RotateCw, Clock, AlertCircle } from "lucide-react";

// Category colors for the Signal Observatory palette (strictly distinct from sentiment)
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
  const [flippedKpi, setFlippedKpi] = useState<number | null>(null);

  // Selected feedback for slide-over drawer
  const [selectedFeedback, setSelectedFeedback] = useState<Feedback | null>(null);

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
      setIssues(issueList);
      setRecentFeedbacks(fbList.items || []);

      // Non-blocking query for latest Adaption status and job filtered by current dataset
      adaptionApi
        .listJobs()
        .then((jobs) => {
          if (jobs && jobs.length > 0) {
            const datasetJobs = jobs.filter((j) => j.dataset_id === targetDatasetId);
            // Prefer real adapt operations, else fall back to estimate
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

  const handleKpiKeyDown = (e: React.KeyboardEvent, index: number) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      setFlippedKpi(flippedKpi === index ? null : index);
    }
  };

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
        <div className="p-8 max-w-xl mx-auto my-16 text-center bg-white rounded-3xl border border-[#DDE2E9] p-8 shadow-sm space-y-4">
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
        <div className="p-8 max-w-2xl mx-auto my-16 text-center bg-white rounded-3xl border border-[#FF6B61]/25 p-8 shadow-sm">
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

  const categoryEntries = Object.entries(data.source_category_distribution || {}).sort(
    (a, b) => b[1] - a[1]
  );
  const totalRows = data.total_source_rows || 0;
  const uniqueStatements = data.unique_exact_statements || 0;
  const repeatedRows = data.repeated_rows || 0;
  const repeatPct = totalRows > 0 ? ((repeatedRows / totalRows) * 100).toFixed(1) : "0.0";
  const uniquePct = totalRows > 0 ? ((uniqueStatements / totalRows) * 100).toFixed(1) : "0.0";
  const sentiment = data.sentiment_distribution;

  return (
    <div className="flex flex-col min-h-screen bg-[var(--bg-paper)]">
      {/* Zone A: Page Header */}
      <AppHeader
        title="Feedback overview"
        subtitle={`A summary of the feedback in ${data.dataset_name}`}
        actions={
          <div className="flex items-center gap-2">
            <Link
              href="/feedback"
              className="px-3.5 py-1.5 bg-white border border-[#DDE2E9] text-xs font-semibold rounded-xl text-[#20252D] hover:bg-[#ECEFF3] transition-colors focus-visible-ring"
            >
              Customer feedback
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
            ZONE B: FEEDBACK OVERVIEW HERO PANEL
            ========================================================================= */}
        <div className="signal-panel rounded-3xl p-6 sm:p-8 relative overflow-hidden bg-[#172033] border border-[#2E3D5C]">
          {/* Living Dots Constellation on Midnight Focal Surface */}
          <div className="absolute right-0 top-0 bottom-0 w-full sm:w-2/3 pointer-events-none opacity-50 z-0">
            <DataFieldCanvas mode="signal-brief" />
          </div>

          {/* Ambient Background Glows */}
          <div className="absolute top-0 right-0 w-96 h-96 bg-[#3656C8]/25 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 right-1/3 w-64 h-64 bg-[#5876B8]/20 rounded-full blur-2xl pointer-events-none" />

          <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
            {/* Left 8 Columns: Main Headline & Intro */}
            <div className="lg:col-span-8 space-y-3.5">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 border border-white/15 text-[11px] font-mono text-[#9EB4FA]">
                <Sparkles className="w-3 h-3 text-[#9EB4FA]" />
                <span>CUSTOMER FEEDBACK OVERVIEW</span>
              </div>

              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[#F7F9FC] leading-snug">
                What customers are telling you
              </h1>

              <p className="text-xs sm:text-sm text-[#B8C2D5] leading-relaxed max-w-2xl">
                Based on <strong className="text-[#F7F9FC]">{totalRows.toLocaleString()} customer comments</strong>, grouped into <strong className="text-[#F7F9FC]">{uniqueStatements.toLocaleString()} distinct comments</strong>. <strong className="text-[#FAECEB] font-bold underline decoration-[#C6534D]">{repeatPct}% of comments</strong> share identical wording with other reviews.
              </p>

              <div className="flex flex-wrap items-center gap-3 pt-2">
                <a
                  href="#repeated-statements"
                  className="px-4 py-2 bg-[#3656C8] hover:bg-[#23387F] text-white text-xs font-bold rounded-xl shadow-md transition-colors focus-visible-ring"
                >
                  View most repeated comments ↓
                </a>
                <Link
                  href="/feedback"
                  className="px-4 py-2 bg-white/10 hover:bg-white/15 text-[#F7F9FC] border border-white/15 text-xs font-semibold rounded-xl transition-colors focus-visible-ring"
                >
                  Browse feedback →
                </Link>
              </div>
            </div>

            {/* Right 4 Columns: Comment Summary Metric Box */}
            <div className="lg:col-span-4 bg-[#202C43]/90 border border-[#2E3D5C] rounded-2xl p-5 backdrop-blur-md space-y-3">
              <div className="text-[10px] uppercase font-bold tracking-wider text-[#B8C2D5]">
                Comment Summary
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-[#B8C2D5]">Total Comments</span>
                  <span className="font-mono font-bold text-[#F7F9FC]">{totalRows.toLocaleString()}</span>
                </div>
                <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
                  <div className="h-full bg-[#3656C8] w-full" />
                </div>

                <div className="flex items-center justify-between text-xs pt-1">
                  <span className="text-[#B8C2D5]">Distinct Comments</span>
                  <span className="font-mono font-bold text-[#9EB4FA]">{uniqueStatements.toLocaleString()} ({uniquePct}%)</span>
                </div>
                <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
                  <div className="h-full bg-[#5876B8]" style={{ width: `${uniquePct}%` }} />
                </div>

                <div className="flex items-center justify-between text-xs pt-1">
                  <span className="text-[#B8C2D5]">Repeated Comments</span>
                  <span className="font-mono font-bold text-[#C6534D]">{repeatedRows.toLocaleString()} ({repeatPct}%)</span>
                </div>
                <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
                  <div className="h-full bg-[#C6534D]" style={{ width: `${repeatPct}%` }} />
                </div>
              </div>

              <div className="text-[10px] text-[#A2AEBD] pt-2 border-t border-white/10">
                These counts compare comment text, not individual customers.
              </div>
            </div>
          </div>
        </div>

        {/* =========================================================================
            ZONE C: KEY METRICS ROW (4 Cards with Details Flip)
            ========================================================================= */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold tracking-wider uppercase text-[#687386]">
              Key metrics ({totalRows.toLocaleString()} total comments)
            </h3>
            <span className="text-[11px] text-[#687386]">
              Click card or press Enter to learn about these numbers
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {/* KPI Card 1: Feedback Rows */}
            <div className="perspective-1000 h-[155px]">
              <div
                tabIndex={0}
                role="button"
                aria-label="Feedback rows card. Press to view calculation details."
                onClick={() => setFlippedKpi(flippedKpi === 1 ? null : 1)}
                onKeyDown={(e) => handleKpiKeyDown(e, 1)}
                className={`card-flipper cursor-pointer rounded-2xl focus-visible-ring ${
                  flippedKpi === 1 ? "is-flipped" : ""
                }`}
              >
                {/* Front Face */}
                <div className="card-face-front p-5 solid-data rounded-2xl flex flex-col justify-between shadow-xs border-l-4 border-l-[#3656C8]">
                  <div>
                    <div className="flex items-center justify-between text-xs text-[#4D5765]">
                      <span className="font-bold text-[#20252D]">Feedback rows</span>
                      <span className="text-[10px] text-[#3656C8] font-mono">View details</span>
                    </div>
                    <div className="text-3xl font-extrabold text-[#20252D] mt-2 tracking-tight">
                      {data.total_source_rows.toLocaleString()}
                    </div>
                  </div>
                  <div className="text-[11px] text-[#7B8491] pt-2 border-t border-[#E2E3DD] flex items-center justify-between">
                    <span>{data.total_source_rows.toLocaleString()} comments imported</span>
                    <span className="text-[10px] text-[#3656C8] font-bold">Imported</span>
                  </div>
                </div>

                {/* Back Face */}
                <div className="card-face-back p-5 bg-[#172033] text-white rounded-2xl flex flex-col justify-between shadow-lg border border-[#2E3D5C]">
                  <div>
                    <div className="flex items-center justify-between text-[10px] uppercase font-bold text-[#9EB4FA]">
                      <span>Source data</span>
                      <span>Back</span>
                    </div>
                    <p className="text-xs text-[#B8C2D5] mt-2 leading-relaxed">
                      The total number of review rows imported from {data.dataset_name || "your CSV file"}.
                    </p>
                  </div>
                  <div className="text-[10px] font-mono text-[#A2AEBD] pt-1 border-t border-white/10">
                    Includes all imported review rows.
                  </div>
                </div>
              </div>
            </div>

            {/* KPI Card 2: Unique Comments */}
            <div className="perspective-1000 h-[155px]">
              <div
                tabIndex={0}
                role="button"
                aria-label="Unique comments card. Press to view calculation details."
                onClick={() => setFlippedKpi(flippedKpi === 2 ? null : 2)}
                onKeyDown={(e) => handleKpiKeyDown(e, 2)}
                className={`card-flipper cursor-pointer rounded-2xl focus-visible-ring ${
                  flippedKpi === 2 ? "is-flipped" : ""
                }`}
              >
                {/* Front Face */}
                <div className="card-face-front p-5 solid-data rounded-2xl flex flex-col justify-between shadow-xs">
                  <div>
                    <div className="flex items-center justify-between text-xs text-[#4D5765]">
                      <span className="font-bold text-[#20252D]">Unique comments</span>
                      <span className="text-[10px] text-[#4D5765] font-mono">View details</span>
                    </div>
                    <div className="text-3xl font-extrabold text-[#5876B8] mt-2 tracking-tight">
                      {uniqueStatements.toLocaleString()}
                    </div>
                  </div>
                  <div className="text-[11px] text-[#7B8491] pt-2 border-t border-[#E2E3DD] flex items-center justify-between">
                    <span>Distinct review texts</span>
                    <span className="text-[10px] text-[#3B5899] font-bold">{uniquePct}%</span>
                  </div>
                </div>

                {/* Back Face */}
                <div className="card-face-back p-5 bg-[#172033] text-white rounded-2xl flex flex-col justify-between shadow-lg border border-[#2E3D5C]">
                  <div>
                    <div className="flex items-center justify-between text-[10px] uppercase font-bold text-[#9EB4FA]">
                      <span>Distinct comments</span>
                      <span>Back</span>
                    </div>
                    <p className="text-xs text-[#B8C2D5] mt-2 leading-relaxed">
                      Comments with exactly matching text are grouped together to identify recurring topics.
                    </p>
                  </div>
                  <div className="text-[10px] font-mono text-[#A2AEBD] pt-1 border-t border-white/10">
                    Exact text matching.
                  </div>
                </div>
              </div>
            </div>

            {/* KPI Card 3: Repeated Comments */}
            <div className="perspective-1000 h-[155px]">
              <div
                tabIndex={0}
                role="button"
                aria-label="Repeated comments card. Press to view calculation details."
                onClick={() => setFlippedKpi(flippedKpi === 3 ? null : 3)}
                onKeyDown={(e) => handleKpiKeyDown(e, 3)}
                className={`card-flipper cursor-pointer rounded-2xl focus-visible-ring ${
                  flippedKpi === 3 ? "is-flipped" : ""
                }`}
              >
                {/* Front Face */}
                <div className="card-face-front p-5 solid-data rounded-2xl flex flex-col justify-between shadow-xs">
                  <div>
                    <div className="flex items-center justify-between text-xs text-[#4D5765]">
                      <span className="font-bold text-[#20252D]">Repeated comments</span>
                      <span className="text-[10px] text-[#4D5765] font-mono">View details</span>
                    </div>
                    <div className="text-3xl font-extrabold text-[#C6534D] mt-2 tracking-tight">
                      {repeatedRows.toLocaleString()}
                    </div>
                  </div>
                  <div className="text-[11px] text-[#7B8491] pt-2 border-t border-[#E2E3DD] flex items-center justify-between">
                    <span>Identical comment text</span>
                    <span className="text-[10px] text-[#C6534D] font-bold">{repeatPct}%</span>
                  </div>
                </div>

                {/* Back Face */}
                <div className="card-face-back p-5 bg-[#172033] text-white rounded-2xl flex flex-col justify-between shadow-lg border border-[#C6534D]/30">
                  <div>
                    <div className="flex items-center justify-between text-[10px] uppercase font-bold text-[#C6534D]">
                      <span>Repeated comments</span>
                      <span>Back</span>
                    </div>
                    <p className="text-xs text-[#B8C2D5] mt-2 leading-relaxed">
                      Reviews that repeat the same text as another review. Note: this counts repeated comment text, not unique customers.
                    </p>
                  </div>
                  <div className="text-[10px] font-mono text-[#A2AEBD] pt-1 border-t border-white/10">
                    Compares text, not unique customers.
                  </div>
                </div>
              </div>
            </div>

            {/* KPI Card 4: Issues to Review */}
            <div className="perspective-1000 h-[155px]">
              <div
                tabIndex={0}
                role="button"
                aria-label="Issues to review card. Press to view calculation details."
                onClick={() => setFlippedKpi(flippedKpi === 4 ? null : 4)}
                onKeyDown={(e) => handleKpiKeyDown(e, 4)}
                className={`card-flipper cursor-pointer rounded-2xl focus-visible-ring ${
                  flippedKpi === 4 ? "is-flipped" : ""
                }`}
              >
                {/* Front Face */}
                <div className="card-face-front p-5 solid-data rounded-2xl flex flex-col justify-between shadow-xs">
                  <div>
                    <div className="flex items-center justify-between text-xs text-[#4D5765]">
                      <span className="font-bold text-[#20252D]">Issues to review</span>
                      <span className="text-[10px] text-[#4D5765] font-mono">View details</span>
                    </div>
                    <div className="text-3xl font-extrabold text-[#3656C8] mt-2 tracking-tight">
                      {issues.length}
                    </div>
                  </div>
                  <div className="text-[11px] text-[#7B8491] pt-2 border-t border-[#E2E3DD] flex items-center justify-between">
                    <span>Recurring customer problems</span>
                    <span className="text-[10px] text-[#3656C8] font-bold">Priority</span>
                  </div>
                </div>

                {/* Back Face */}
                <div className="card-face-back p-5 bg-[#172033] text-white rounded-2xl flex flex-col justify-between shadow-lg border border-[#2E3D5C]">
                  <div>
                    <div className="flex items-center justify-between text-[10px] uppercase font-bold text-[#9EB4FA]">
                      <span>Issues to review</span>
                      <span>Back</span>
                    </div>
                    <p className="text-xs text-[#B8C2D5] mt-2 leading-relaxed">
                      Recurring problems identified from repeated customer comments and feedback patterns.
                    </p>
                  </div>
                  <div className="text-[10px] font-mono text-[#A2AEBD] pt-1 border-t border-white/10">
                    Select an issue below to inspect comments.
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* =========================================================================
            ZONE D: ASYMMETRICAL ANALYTICAL GRID (12 Columns)
            Left: 5 Cols (Category Distribution & Sentiment)
            Right: 7 Cols (Pareto Most Repeated Statements)
            ========================================================================= */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left 5 Columns: Source Category Distribution & Polarity */}
          <div className="lg:col-span-5 space-y-6">
            {/* Category Distribution Card */}
            <div className="p-6 solid-data rounded-3xl space-y-5">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-sm font-bold text-[#111827] uppercase tracking-wider">
                    Feedback by category
                  </h3>
                  <p className="text-xs text-[#687386] mt-0.5">
                    Breakdown across {categoryEntries.length} categories ({totalRows.toLocaleString()} comments)
                  </p>
                </div>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-[#ECEFF3] text-[#394457]">
                  Categories
                </span>
              </div>

              <div className="space-y-4 pt-1">
                {categoryEntries.map(([category, count]) => {
                  const pct = ((count / totalRows) * 100).toFixed(1);
                  const style = CATEGORY_COLORS[category] || {
                    bar: "#687386",
                    text: "#111827",
                    bg: "#ECEFF3",
                    border: "#DDE2E9",
                  };

                  return (
                    <div key={category} className="space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                          <span
                            className="w-2.5 h-2.5 rounded-full"
                            style={{ backgroundColor: style.bar }}
                          />
                          <span className="font-bold text-[#111827]">{category}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-[#111827]">
                            {count.toLocaleString()}
                          </span>
                          <span className="text-[11px] text-[#687386] font-mono">
                            ({pct}%)
                          </span>
                        </div>
                      </div>

                      <div className="w-full h-2 bg-[#ECEFF3] rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{
                            width: `${pct}%`,
                            backgroundColor: style.bar,
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="pt-3 border-t border-[#DDE2E9] flex items-center justify-between text-[11px] text-[#687386]">
                <span>Categories from imported feedback</span>
                <span className="font-mono font-bold text-[#111827]">Total: {totalRows.toLocaleString()}</span>
              </div>
            </div>

            {/* Derived Sentiment Polarity Card */}
            <div className="p-6 solid-data rounded-3xl space-y-4">
              {(() => {
                const posCount = sentiment?.positive || 0;
                const neuCount = sentiment?.neutral || 0;
                const negCount = sentiment?.negative || 0;
                const mixedCount = sentiment?.mixed || 0;
                const unknownCount = sentiment?.unknown || 0;
                const sentimentTotal = posCount + neuCount + negCount + mixedCount + unknownCount;

                const posPct = sentimentTotal > 0 ? ((posCount / sentimentTotal) * 100).toFixed(1) : "0.0";
                const neuPct = sentimentTotal > 0 ? ((neuCount / sentimentTotal) * 100).toFixed(1) : "0.0";
                const negPct = sentimentTotal > 0 ? ((negCount / sentimentTotal) * 100).toFixed(1) : "0.0";
                const mixedPct = sentimentTotal > 0 ? ((mixedCount / sentimentTotal) * 100).toFixed(1) : "0.0";
                const unknownPct = sentimentTotal > 0 ? ((unknownCount / sentimentTotal) * 100).toFixed(1) : "0.0";
                const analyzedPct = totalRows > 0 ? ((sentimentTotal / totalRows) * 100).toFixed(1) : "0.0";

                return (
                  <>
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-sm font-bold text-[#20252D] uppercase tracking-wider">
                          Sentiment overview
                        </h3>
                        <p className="text-xs text-[#7B8491] mt-0.5">
                          Estimated tone across {sentimentTotal.toLocaleString()} comments
                        </p>
                      </div>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                        sentimentTotal > 0 ? "bg-[#E8F3EE] text-[#2E7D68] border-[#2E7D68]/20" : "bg-[#F0F2F5] text-[#7B8491] border-[#E2E3DD]"
                      }`}>
                        {sentimentTotal > 0 ? `${analyzedPct}% Analyzed` : "Not analyzed"}
                      </span>
                    </div>

                    {sentiment && sentimentTotal > 0 ? (
                      <div className="space-y-3">
                        {/* Segmented Linear Polarity Bar */}
                        <div className="w-full h-3 rounded-full overflow-hidden flex bg-[#ECEFF3]">
                          <div
                            className="bg-[#2E7D68] h-full"
                            style={{ width: `${posPct}%` }}
                            title={`Positive: ${posCount.toLocaleString()} (${posPct}%)`}
                          />
                          <div
                            className="bg-[#6C7786] h-full"
                            style={{ width: `${neuPct}%` }}
                            title={`Neutral: ${neuCount.toLocaleString()} (${neuPct}%)`}
                          />
                          <div
                            className="bg-[#C6534D] h-full"
                            style={{ width: `${negPct}%` }}
                            title={`Negative: ${negCount.toLocaleString()} (${negPct}%)`}
                          />
                          {mixedCount > 0 && (
                            <div
                              className="bg-[#8B6E9B] h-full"
                              style={{ width: `${mixedPct}%` }}
                              title={`Mixed: ${mixedCount.toLocaleString()} (${mixedPct}%)`}
                            />
                          )}
                          {unknownCount > 0 && (
                            <div
                              className="bg-[#B0B7C3] h-full"
                              style={{ width: `${unknownPct}%` }}
                              title={`Unknown: ${unknownCount.toLocaleString()} (${unknownPct}%)`}
                            />
                          )}
                        </div>

                        {/* Taxonomy Pillars */}
                        <div className="grid grid-cols-3 sm:grid-cols-5 gap-2 pt-1">
                          <div className="p-2.5 rounded-xl bg-[#E8F3EE] border border-[#2E7D68]/20 text-center">
                            <div className="text-[10px] font-bold uppercase text-[#2E7D68]">Positive</div>
                            <div className="text-base font-extrabold text-[#20252D]">
                              {posCount.toLocaleString()}
                            </div>
                            <div className="text-[10px] text-[#2E7D68] font-mono">{posPct}%</div>
                          </div>
                          <div className="p-2.5 rounded-xl bg-[#F0F2F5] border border-[#E2E3DD] text-center">
                            <div className="text-[10px] font-bold uppercase text-[#6C7786]">Neutral</div>
                            <div className="text-base font-extrabold text-[#20252D]">
                              {neuCount.toLocaleString()}
                            </div>
                            <div className="text-[10px] text-[#4D5765] font-mono">{neuPct}%</div>
                          </div>
                          <div className="p-2.5 rounded-xl bg-[#FAECEB] border border-[#C6534D]/20 text-center">
                            <div className="text-[10px] font-bold uppercase text-[#C6534D]">Negative</div>
                            <div className="text-base font-extrabold text-[#20252D]">
                              {negCount.toLocaleString()}
                            </div>
                            <div className="text-[10px] text-[#C6534D] font-mono">{negPct}%</div>
                          </div>
                          <div className="p-2.5 rounded-xl bg-[#F6F0F8] border border-[#8B6E9B]/20 text-center">
                            <div className="text-[10px] font-bold uppercase text-[#8B6E9B]">Mixed</div>
                            <div className="text-base font-extrabold text-[#20252D]">
                              {mixedCount.toLocaleString()}
                            </div>
                            <div className="text-[10px] text-[#8B6E9B] font-mono">{mixedPct}%</div>
                          </div>
                          <div className="p-2.5 rounded-xl bg-[#F0F2F5] border border-[#CCD0D7] text-center">
                            <div className="text-[10px] font-bold uppercase text-[#687386]">Unknown</div>
                            <div className="text-base font-extrabold text-[#20252D]">
                              {unknownCount.toLocaleString()}
                            </div>
                            <div className="text-[10px] text-[#687386] font-mono">{unknownPct}%</div>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="p-4 rounded-xl bg-[#F6F5F1] border border-dashed border-[#CCD0D7] text-center text-xs text-[#687386]">
                        Sentiment analysis pending or not yet computed for this dataset.
                      </div>
                    )}
                  </>
                );
              })()}
            </div>
          </div>

          {/* Right 7 Columns: Most Repeated Statements */}
          <div id="repeated-statements" className="lg:col-span-7 space-y-6">
            <div className="p-6 solid-data rounded-3xl space-y-5">
              {(() => {
                const topStatements = data.top_repeated_statements || [];
                const topCountSum = topStatements.reduce((acc, s) => acc + s.count, 0);
                const maxStatementCount = topStatements.length > 0 ? Math.max(...topStatements.map((s) => s.count)) : 1;

                return (
                  <>
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="text-sm font-bold text-[#20252D] uppercase tracking-wider mt-0.5">
                          Most repeated comments
                        </h3>
                        <p className="text-xs text-[#7B8491] mt-0.5">
                          Phrases that appear most frequently across {totalRows.toLocaleString()} comments.{topStatements.length > 0 ? ` Top ${topStatements.length} phrases account for ${topCountSum.toLocaleString()} occurrences.` : ""}
                        </p>
                      </div>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-[#172033] text-white">
                        Repeated comments
                      </span>
                    </div>

                    {/* Repeated Statements Ranking List */}
                    <div className="space-y-3">
                      {topStatements.length === 0 ? (
                        <div className="p-6 text-center bg-[#F6F5F1] rounded-2xl border border-dashed border-[#CCD0D7]">
                          <p className="text-xs font-semibold text-[#687386]">
                            No repeated comments found in this dataset.
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

                          return (
                            <div
                              key={idx}
                              className="p-4 rounded-2xl bg-[#F6F5F1] border border-[#E2E3DD] hover:border-[#3656C8] hover:bg-white transition-all space-y-2 group cursor-pointer"
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
                                router.push(`/feedback?dataset_id=${encodeURIComponent(selectedDatasetId || "")}&search=${encodeURIComponent(item.statement.slice(0, 40))}`);
                              }}
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
                                    {item.count} repeats
                                  </span>
                                  <span className="text-[11px] text-[#3656C8] group-hover:underline font-semibold">
                                    View comments →
                                  </span>
                                </div>
                              </div>

                              <p className="text-xs text-[#20252D] italic font-serif leading-relaxed line-clamp-2">
                                "{item.statement}"
                              </p>

                              <div className="w-full h-1.5 bg-[#E2E3DD] rounded-full overflow-hidden">
                                <div
                                  className="h-full rounded-full"
                                  style={{
                                    width: `${Math.min(100, (item.count / maxStatementCount) * 100)}%`,
                                    backgroundColor: categoryStyle.bar,
                                  }}
                                />
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </>
                );
              })()}

              {/* Data Limitation Callout */}
              <div className="p-3.5 bg-[#FAF5E8] rounded-xl border border-[#B58A43]/30 text-xs text-[#966C28] leading-relaxed">
                <strong>Note: </strong>
                Repeated phrases highlight common friction points, but do not indicate how many unique individuals were affected since the CSV lacks customer IDs.
              </div>
            </div>
          </div>
        </div>

        {/* =========================================================================
            ZONE D.5: SUPPORT TRAINING WORKFLOW CALLOUT
            ========================================================================= */}
        <div className="p-6 sm:p-7 rounded-3xl bg-white border border-[#E2E3DD] shadow-xs space-y-6">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 pb-5 border-b border-[#E2E3DD]">
            <div className="space-y-1.5 max-w-2xl">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#E9EDFC] text-[10px] font-mono font-bold text-[#3656C8]">
                <Sparkles className="w-3 h-3 text-[#3656C8]" />
                <span>SUPPORT TRAINING DATA</span>
              </div>
              <h3 className="text-base sm:text-lg font-extrabold text-[#20252D] tracking-tight">
                Prepare support-training data
              </h3>
              <p className="text-xs text-[#4D5765] leading-relaxed">
                Turn customer feedback into training data for a support assistant using Adaption Labs.
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

          {/* Three-step visual sequence + live dataset context */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 bg-[#F6F5F1] rounded-2xl border border-[#E2E3DD] space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase font-mono text-[#7B8491]">1. Feedback sample</span>
                <MessageSquare className="w-3.5 h-3.5 text-[#3656C8]" />
              </div>
              <div className="text-xs font-bold text-[#20252D]">
                Customer reviews
              </div>
              <p className="text-[11px] text-[#4D5765] leading-relaxed">
                Source: <strong>{data?.dataset_name || "Active Dataset"}</strong> ({totalRows.toLocaleString()} comments available · 100–1,000 sample size).
              </p>
            </div>

            <div className="p-4 bg-[#F6F5F1] rounded-2xl border border-[#E2E3DD] space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase font-mono text-[#7B8491]">2. Support pairs</span>
                <Layers className="w-3.5 h-3.5 text-[#7C3AED]" />
              </div>
              <div className="text-xs font-bold text-[#20252D]">
                Prompt + context formatting
              </div>
              <p className="text-[11px] text-[#4D5765] leading-relaxed">
                Formats customer feedback and categories into support resolution pairs.
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
                    const status = latestAdaptionJob.status?.toLowerCase();
                    const labelPrefix = isAdapt ? "Latest run: " : "Latest estimate: ";

                    if (status === "succeeded") {
                      return (
                        <span className="inline-flex items-center gap-1.5 text-emerald-700">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600 shrink-0" />
                          <span>{labelPrefix}{isAdapt ? "Completed" : "Quote received"}</span>
                        </span>
                      );
                    }
                    if (status === "running") {
                      return (
                        <span className="inline-flex items-center gap-1.5 text-blue-700">
                          <RotateCw className="w-3 h-3 text-blue-600 animate-spin shrink-0" />
                          <span>{labelPrefix}Running</span>
                        </span>
                      );
                    }
                    if (status === "pending" || status === "queued") {
                      return (
                        <span className="inline-flex items-center gap-1.5 text-[#4D5765]">
                          <Clock className="w-3 h-3 text-[#7B8491] shrink-0" />
                          <span>{labelPrefix}Queued</span>
                        </span>
                      );
                    }
                    if (status === "failed") {
                      return (
                        <span className="inline-flex items-center gap-1.5 text-rose-700">
                          <AlertCircle className="w-3 h-3 text-rose-600 shrink-0" />
                          <span>{labelPrefix}Failed</span>
                        </span>
                      );
                    }
                    return (
                      <span className="inline-flex items-center gap-1.5 text-[#4D5765]">
                        <Clock className="w-3 h-3 text-[#7B8491] shrink-0" />
                        <span>{labelPrefix}{latestAdaptionJob.status}</span>
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
        </div>

        {/* =========================================================================
            ZONE E: ISSUES REQUIRING REVIEW
            ========================================================================= */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xs font-bold tracking-wider uppercase text-[#7B8491]">
                Priority issues requiring review ({issues.length})
              </h3>
              <p className="text-xs text-[#7B8491] mt-0.5">
                Recurring customer problems sorted by priority
              </p>
            </div>
            <Link
              href="/issues"
              className="text-xs font-bold text-[#3656C8] hover:underline"
            >
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
                    {issue.supporting_count} supporting comments
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
                    className="text-xs font-bold text-[#3656C8] hover:underline"
                  >
                    View issue details →
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* =========================================================================
            DATA NOTE: TIMELINE TRENDS WITHHELD
            ========================================================================= */}
        <div className="p-4 sm:p-5 rounded-2xl bg-white border border-[#E2E3DD] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#2E7D68]" />
              <h4 className="text-xs font-bold text-[#20252D] uppercase tracking-wider">
                Timeline trends not available
              </h4>
            </div>
            <p className="text-xs text-[#7B8491]">
              This dataset contains review text and category labels without timestamps, so time-based trends are not shown.
            </p>
          </div>
          <div className="text-xs font-mono text-[#7B8491] shrink-0">
            Dataset note
          </div>
        </div>

        {/* =========================================================================
            ZONE F: RECENT CUSTOMER COMMENTS
            ========================================================================= */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xs font-bold tracking-wider uppercase text-[#7B8491]">
                Recent customer comments
              </h3>
              <p className="text-xs text-[#7B8491] mt-0.5">
                Latest comments from this dataset
              </p>
            </div>
            <Link
              href="/feedback"
              className="text-xs font-bold text-[#3656C8] hover:underline"
            >
              View all comments ({totalRows.toLocaleString()}) →
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {recentFeedbacks.map((fb) => (
              <div
                key={fb.id}
                onClick={() => setSelectedFeedback(fb)}
                className="p-4 solid-data rounded-2xl space-y-2.5 hover:border-[#3656C8] transition-all cursor-pointer group"
              >
                <div className="flex items-center justify-between text-xs">
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#F0F2F5] text-[#20252D]">
                    {fb.source_category}
                  </span>
                  <span className="font-mono text-[10px] text-[#7B8491]">
                    #{fb.id.slice(0, 6)}
                  </span>
                </div>
                <p className="text-xs text-[#20252D] line-clamp-3 italic leading-relaxed">
                  "{fb.original_text}"
                </p>
                <div className="text-[11px] text-[#3656C8] font-semibold group-hover:underline pt-1">
                  View details →
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* =========================================================================
          SLIDE-OVER EVIDENCE INSPECTION DRAWER
          ========================================================================= */}
      {selectedFeedback && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div
            className="fixed inset-0 bg-black/40 backdrop-blur-sm transition-opacity"
            onClick={() => setSelectedFeedback(null)}
          />

          <div className="relative w-full max-w-md bg-white h-full shadow-2xl p-6 sm:p-8 flex flex-col justify-between z-10 animate-in slide-in-from-right duration-250">
            <div className="space-y-6">
              <div className="flex items-center justify-between pb-4 border-b border-[#E2E3DD]">
                <div>
                  <div className="text-[10px] font-bold uppercase tracking-wider text-[#7B8491]">
                    Comment details
                  </div>
                  <h3 className="text-base font-extrabold text-[#20252D] font-mono">
                    #{selectedFeedback.id}
                  </h3>
                </div>
                <button
                  onClick={() => setSelectedFeedback(null)}
                  className="w-8 h-8 rounded-full bg-[#F0F2F5] hover:bg-[#E2E3DD] text-[#20252D] flex items-center justify-center font-bold text-sm"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-2">
                <div className="text-xs font-bold text-[#20252D]">
                  Customer comment:
                </div>
                <div className="p-4 bg-[#F6F5F1] rounded-2xl border border-[#E2E3DD] text-xs font-serif italic text-[#20252D] leading-relaxed">
                  "{selectedFeedback.original_text}"
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-[#F6F5F1] rounded-xl border border-[#E2E3DD]">
                  <div className="text-[10px] font-bold text-[#7B8491] uppercase">
                    Category
                  </div>
                  <div className="text-xs font-bold text-[#20252D] mt-0.5">
                    {selectedFeedback.source_category}
                  </div>
                </div>
                <div className="p-3 bg-[#F6F5F1] rounded-xl border border-[#E2E3DD]">
                  <div className="text-[10px] font-bold text-[#7B8491] uppercase">
                    Status
                  </div>
                  <div className="text-xs font-bold text-[#2E7D68] mt-0.5 capitalize">
                    {selectedFeedback.analysis_status}
                  </div>
                </div>
              </div>

              <div className="p-4 bg-[#F6F5F1] rounded-2xl border border-[#E2E3DD] space-y-1">
                <div className="text-xs font-bold text-[#20252D]">
                  Original feedback:
                </div>
                <p className="text-[11px] text-[#4D5765] leading-relaxed">
                  This comment is preserved exactly as imported from your CSV file.
                </p>
              </div>
            </div>

            <div className="pt-4 border-t border-[#E2E3DD] flex gap-3">
              <Link
                href="/feedback"
                className="flex-1 py-2.5 bg-[#3656C8] hover:bg-[#23387F] text-white text-xs font-bold rounded-xl text-center shadow-sm transition-colors"
              >
                Inspect in customer feedback →
              </Link>
              <button
                onClick={() => setSelectedFeedback(null)}
                className="px-4 py-2.5 bg-[#F0F2F5] text-[#20252D] text-xs font-semibold rounded-xl hover:bg-[#E2E3DD] transition-colors"
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
