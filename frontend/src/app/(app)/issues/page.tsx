"use client";

import React, { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import AppHeader from "@/components/navigation/AppHeader";
import { issuesApi } from "@/lib/api/client";
import { Issue } from "@/lib/api/types";
import { useDataset } from "@/lib/context/DatasetContext";
import { AlertCircle } from "lucide-react";

export default function IssuesTriagePage() {
  const { selectedDatasetId, loading: datasetLoading } = useDataset();

  const [issues, setIssues] = useState<Issue[]>([]);
  const [selectedIssue, setSelectedIssue] = useState<Issue | null>(null);
  const [priorityFilter, setPriorityFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const fetchIssues = useCallback(async () => {
    if (!selectedDatasetId) {
      setIssues([]);
      setSelectedIssue(null);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const res = await issuesApi.list({
        datasetId: selectedDatasetId,
        priority: priorityFilter || undefined,
        status: statusFilter || undefined,
      });
      setIssues(res || []);
      if (res && res.length > 0 && !selectedIssue) {
        setSelectedIssue(res[0]);
      }
    } catch (err: any) {
      console.error("Error fetching issues:", err);
      setError(err?.message || "Failed to load issues");
    } finally {
      setLoading(false);
    }
  }, [selectedDatasetId, priorityFilter, statusFilter, selectedIssue]);

  useEffect(() => {
    if (selectedDatasetId) {
      fetchIssues();
    } else if (!datasetLoading) {
      setLoading(false);
      setIssues([]);
      setSelectedIssue(null);
    }
  }, [fetchIssues, selectedDatasetId, datasetLoading]);

  const handleStatusChange = async (issueId: string, newStatus: string) => {
    try {
      setUpdatingId(issueId);
      const updated = await issuesApi.update(issueId, { status: newStatus });
      setIssues((prev) =>
        prev.map((it) => (it.id === issueId ? { ...it, status: updated.status } : it))
      );
      if (selectedIssue?.id === issueId) {
        setSelectedIssue((prev) => (prev ? { ...prev, status: updated.status } : null));
      }
    } catch (err: any) {
      alert("Failed to update issue status: " + err?.message);
    } finally {
      setUpdatingId(null);
    }
  };

  const handleToggleTrack = async (issueId: string, currentTracked: boolean) => {
    try {
      setUpdatingId(issueId);
      const updated = await issuesApi.update(issueId, { is_tracked: !currentTracked });
      setIssues((prev) =>
        prev.map((it) => (it.id === issueId ? { ...it, is_tracked: updated.is_tracked } : it))
      );
      if (selectedIssue?.id === issueId) {
        setSelectedIssue((prev) => (prev ? { ...prev, is_tracked: updated.is_tracked } : null));
      }
    } catch (err: any) {
      alert("Failed to toggle tracking: " + err?.message);
    } finally {
      setUpdatingId(null);
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-[var(--bg-paper)]">
      <AppHeader
        title="Issues Triage & Evidence"
        subtitle={`${issues.length > 0 ? issues.length : "Actionable"} Problem Clusters Prioritized by Customer Verbatim Evidence`}
      />

      <div className="p-4 sm:p-8 max-w-7xl mx-auto w-full space-y-6">
        {/* Filters */}
        <div className="p-4 solid-data rounded-2xl flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-xs font-bold text-[#687386]">Filter By:</span>
            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              className="px-3 py-1.5 bg-[#F5F5F1] border border-[#DDE2E9] rounded-xl text-xs font-semibold text-[#111827] focus-visible-ring"
            >
              <option value="">All Priorities</option>
              <option value="Critical">Critical</option>
              <option value="High">High</option>
              <option value="Medium">Medium</option>
              <option value="Low">Low</option>
            </select>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-1.5 bg-[#F5F5F1] border border-[#DDE2E9] rounded-xl text-xs font-semibold text-[#111827] focus-visible-ring"
            >
              <option value="">All Statuses</option>
              <option value="open">Open</option>
              <option value="investigating">Investigating</option>
              <option value="in_progress">In Progress</option>
              <option value="resolved">Resolved</option>
            </select>
          </div>

          <div className="text-xs font-bold text-[#3656C8] font-mono">
            {issues.length} Dossiers Listed
          </div>
        </div>

        {/* Master-Detail Split Grid */}
        {!selectedDatasetId && !datasetLoading ? (
          <div className="p-12 text-center solid-data rounded-2xl">
            <div className="text-2xl mb-2">📁</div>
            <div className="text-sm font-bold text-[#20252D]">No Dataset Selected</div>
            <p className="text-xs text-[#7B8491] mt-1">Please select an existing dataset or import a new CSV file to view issues.</p>
            <Link
              href="/import"
              className="inline-block mt-4 px-4 py-2 bg-[#3656C8] text-white text-xs font-bold rounded-xl hover:bg-[#23387F] transition-colors"
            >
              Import CSV Dataset →
            </Link>
          </div>
        ) : loading || datasetLoading ? (
          <div className="p-12 text-center solid-data rounded-2xl">
            <div className="w-8 h-8 rounded-full border-2 border-[#3656C8] border-t-transparent animate-spin mx-auto mb-3" />
            <div className="text-xs text-[#7B8491]">Loading issue dossiers from database...</div>
          </div>
        ) : error ? (
          <div className="p-8 text-center solid-data rounded-2xl border border-[#C6534D]/30">
            <div className="text-sm font-bold text-[#C6534D] mb-1">Failed to load issues</div>
            <p className="text-xs text-[#7B8491] mb-4">{error}</p>
            <button
              onClick={fetchIssues}
              className="px-4 py-2 bg-[#3656C8] text-white text-xs font-bold rounded-xl"
            >
              Retry
            </button>
          </div>
        ) : issues.length === 0 ? (
          <div className="p-12 text-center solid-data rounded-2xl space-y-2">
            <AlertCircle className="w-8 h-8 text-[var(--ink-muted)] mx-auto opacity-50" />
            <div className="text-sm font-bold text-[#20252D]">No issues matching selected filters</div>
            <button
              onClick={() => {
                setPriorityFilter("");
                setStatusFilter("");
              }}
              className="mt-3 px-4 py-2 bg-[#F0F2F5] text-[#3656C8] text-xs font-bold rounded-xl hover:bg-[#E9EDFC]"
            >
              Reset Filters
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Left Column: Issue List */}
            <div className="lg:col-span-5 space-y-3">
              {issues.map((iss) => {
                const isSelected = selectedIssue?.id === iss.id;
                return (
                  <div
                    key={iss.id}
                    onClick={() => setSelectedIssue(iss)}
                    className={`p-4 rounded-2xl cursor-pointer border transition-all ${
                      isSelected
                        ? "bg-white border-[#3656C8] shadow-md ring-1 ring-[#3656C8]"
                        : "solid-data hover:border-[#3656C8]/40"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span
                        className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${
                          iss.priority === "Critical"
                            ? "bg-[#FAECEB] text-[#B83D42] border-[#B83D42]/30"
                            : iss.priority === "High"
                            ? "bg-[#FAF5E8] text-[#966C28] border-[#B58A43]/30"
                            : "bg-[#E9EDFC] text-[#3656C8] border-[#3656C8]/30"
                        }`}
                      >
                        {iss.priority}
                      </span>
                      <span className="text-xs font-mono text-[#7B8491]">
                        {iss.supporting_count} reviews
                      </span>
                    </div>

                    <h4 className="font-bold text-sm text-[#20252D] mb-1">
                      {iss.title}
                    </h4>
                    <p className="text-xs text-[#4D5765] line-clamp-2 leading-relaxed">
                      {iss.summary}
                    </p>

                    <div className="mt-3 pt-2 border-t border-[#E2E3DD] flex items-center justify-between text-[11px]">
                      <span className="text-[#7B8491] font-medium">{iss.category}</span>
                      <span className="text-[#3656C8] font-bold capitalize">
                        {iss.status}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Right Column: Full Issue Dossier Detail */}
            <div className="lg:col-span-7">
              {selectedIssue ? (
                <div className="p-6 sm:p-8 solid-data rounded-3xl shadow-sm space-y-6 sticky top-24">
                  {/* Header */}
                  <div className="flex flex-wrap items-start justify-between gap-4 pb-4 border-b border-[#E2E3DD]">
                    <div>
                      <div className="flex items-center gap-2 mb-1.5">
                        <span
                          className={`text-xs font-bold px-2.5 py-0.5 rounded-full border ${
                            selectedIssue.priority === "Critical"
                              ? "bg-[#FAECEB] text-[#B83D42] border-[#B83D42]/30"
                              : selectedIssue.priority === "High"
                              ? "bg-[#FAF5E8] text-[#966C28] border-[#B58A43]/30"
                              : "bg-[#E9EDFC] text-[#3656C8] border-[#3656C8]/30"
                          }`}
                        >
                          {selectedIssue.priority} Priority
                        </span>
                        <span className="text-xs font-bold text-[#4D5765]">
                          {selectedIssue.category}
                        </span>
                      </div>
                      <h3 className="text-lg font-bold text-[#20252D]">
                        {selectedIssue.title}
                      </h3>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() =>
                          handleToggleTrack(selectedIssue.id, selectedIssue.is_tracked)
                        }
                        disabled={updatingId === selectedIssue.id}
                        className={`px-3 py-1.5 text-xs font-bold rounded-xl border transition-all focus-visible-ring ${
                          selectedIssue.is_tracked
                            ? "bg-[#3656C8] text-white border-[#3656C8]"
                            : "bg-[#F6F5F1] text-[#4D5765] border-[#E2E3DD] hover:bg-[#F0F2F5]"
                        }`}
                      >
                        {selectedIssue.is_tracked ? "✓ Tracked in Sprint" : "+ Track Issue"}
                      </button>
                    </div>
                  </div>

                  {/* Summary & Rationale */}
                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-[#687386] mb-1">
                      Problem Summary
                    </h4>
                    <p className="text-xs sm:text-sm text-[#111827] leading-relaxed">
                      {selectedIssue.summary}
                    </p>
                  </div>

                  <div className="p-4 bg-[#F6F5F1] rounded-2xl border border-[#E2E3DD] space-y-1.5">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-[#3656C8]">
                      Priority &amp; Evidence Rationale
                    </h4>
                    <p className="text-xs text-[#4D5765] leading-relaxed">
                      {selectedIssue.priority_explanation}
                    </p>
                  </div>

                  {/* Evidence Metrics */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 bg-[#F6F5F1] rounded-2xl border border-[#E2E3DD]">
                      <div className="text-[11px] text-[#7B8491] font-medium">
                        Total Supporting Quotes
                      </div>
                      <div className="text-xl font-extrabold text-[#20252D] mt-1 font-mono">
                        {selectedIssue.supporting_count}
                      </div>
                    </div>
                    <div className="p-4 bg-[#F6F5F1] rounded-2xl border border-[#E2E3DD]">
                      <div className="text-[11px] text-[#7B8491] font-medium">
                        Unique Exact Statements
                      </div>
                      <div className="text-xl font-extrabold text-[#5876B8] mt-1 font-mono">
                        {selectedIssue.unique_supporting_count}
                      </div>
                    </div>
                  </div>

                  {/* Status Lifecycle Controls */}
                  <div className="pt-4 border-t border-[#E2E3DD] flex items-center justify-between">
                    <span className="text-xs font-bold text-[#7B8491]">
                      Workflow Status:
                    </span>
                    <div className="flex gap-1.5">
                      {["open", "investigating", "resolved"].map((st) => (
                        <button
                          key={st}
                          onClick={() => handleStatusChange(selectedIssue.id, st)}
                          disabled={updatingId === selectedIssue.id}
                          className={`px-3 py-1 rounded-lg text-xs font-semibold capitalize transition-all focus-visible-ring ${
                            selectedIssue.status === st
                              ? "bg-[#172033] text-white font-bold"
                              : "bg-[#F0F2F5] text-[#4D5765] hover:bg-[#E2E3DD]"
                          }`}
                        >
                          {st}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
