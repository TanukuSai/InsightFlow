"use client";

import React, { useEffect, useState } from "react";
import AppHeader from "@/components/navigation/AppHeader";
import { reportsApi } from "@/lib/api/client";
import { Report } from "@/lib/api/types";

export default function ReportsPage() {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Form states
  const [title, setTitle] = useState("Build Battle 2026 Executive Intelligence Briefing");
  const [format, setFormat] = useState<"pdf" | "json" | "csv">("pdf");
  const [generating, setGenerating] = useState(false);

  const datasetId = "ds-796d15b9a096";

  const fetchReports = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await reportsApi.list(datasetId);
      setReports(res || []);
    } catch (err: any) {
      console.error("Failed to load reports:", err);
      setError(err?.message || "Failed to load reports");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, []);

  const handleGenerateReport = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setGenerating(true);
      const newReport = await reportsApi.generate({
        dataset_id: datasetId,
        title: title.trim() || "Customer Feedback Intelligence Briefing",
        format,
      });

      // Add to list and trigger download
      setReports((prev) => [newReport, ...prev]);

      // Download file directly
      const downloadUrl = reportsApi.getExportUrl(newReport.id);
      window.open(downloadUrl, "_blank");
    } catch (err: any) {
      alert("Failed to generate report: " + (err?.message || "Unknown error"));
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-[var(--bg-paper)]">
      <AppHeader
        title="Reports & Executive Exports"
        subtitle="Server-Side PDF, JSON, and CSV Export Engine"
      />

      <div className="p-4 sm:p-8 max-w-7xl mx-auto w-full space-y-8">
        {/* Report Builder Form Card */}
        <div className="p-6 sm:p-8 solid-data rounded-3xl space-y-6 shadow-xs border-t-3 border-t-[#3656C8]">
          <div className="flex items-center gap-3 pb-4 border-b border-[#E2E3DD]">
            <div className="w-10 h-10 rounded-xl bg-[#E9EDFC] text-[#3656C8] flex items-center justify-center font-bold text-lg">
              📄
            </div>
            <div>
              <h2 className="text-base font-bold text-[#20252D]">
                Generate Executive Intelligence Briefing
              </h2>
              <p className="text-xs text-[#7B8491]">
                Generates a board-ready report from verified database issues, evidence quotes, and category counts.
              </p>
            </div>
          </div>

          <form onSubmit={handleGenerateReport} className="grid grid-cols-1 md:grid-cols-12 gap-5 items-end">
            <div className="md:col-span-6 space-y-1.5">
              <label className="block text-xs font-bold text-[#4D5765]">
                Report Title
              </label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Enter report title..."
                className="w-full px-4 py-2.5 bg-[#F6F5F1] border border-[#E2E3DD] rounded-xl text-xs text-[#20252D] focus:outline-none focus:border-[#3656C8] focus-visible-ring"
              />
            </div>

            <div className="md:col-span-3 space-y-1.5">
              <label className="block text-xs font-bold text-[#4D5765]">
                Format
              </label>
              <select
                value={format}
                onChange={(e) => setFormat(e.target.value as "pdf" | "json" | "csv")}
                className="w-full px-3 py-2.5 bg-[#F6F5F1] border border-[#E2E3DD] rounded-xl text-xs text-[#20252D] focus:outline-none focus:border-[#3656C8] focus-visible-ring"
              >
                <option value="pdf">PDF Document (.pdf)</option>
                <option value="json">Structured JSON (.json)</option>
                <option value="csv">Summarized CSV (.csv)</option>
              </select>
            </div>

            <div className="md:col-span-3">
              <button
                type="submit"
                disabled={generating}
                className="w-full py-2.5 bg-[#3656C8] hover:bg-[#23387F] text-white text-xs font-bold rounded-xl shadow-xs transition-colors disabled:opacity-50 flex items-center justify-center gap-2 focus-visible-ring"
              >
                {generating ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Compiling...</span>
                  </>
                ) : (
                  <>
                    <span>Generate &amp; Download</span>
                    <span>↓</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>

        {/* Existing Reports History */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#7B8491]">
              Generated Reports Archive ({reports.length})
            </h3>
            <span className="text-[11px] text-[#7B8491] font-mono">
              Live server exports
            </span>
          </div>

          {loading ? (
            <div className="p-8 text-center solid-data rounded-2xl">
              <div className="w-6 h-6 border-2 border-[#3656C8] border-t-transparent rounded-full animate-spin mx-auto mb-2" />
              <div className="text-xs text-[#7B8491]">Loading reports...</div>
            </div>
          ) : error ? (
            <div className="p-6 text-center solid-data rounded-2xl border border-[#C6534D]/30">
              <div className="text-xs font-bold text-[#C6534D]">{error}</div>
            </div>
          ) : reports.length === 0 ? (
            <div className="p-10 text-center solid-data rounded-2xl text-xs text-[#7B8491]">
              No reports generated yet. Click Generate above to create your first executive export.
            </div>
          ) : (
            <div className="space-y-3">
              {reports.map((rep) => (
                <div
                  key={rep.id}
                  className="p-5 solid-data rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 hover:border-[#3656C8]/40 transition-colors shadow-xs"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2.5">
                      <h4 className="text-sm font-bold text-[#20252D]">
                        {rep.title}
                      </h4>
                      <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-[#E9EDFC] text-[#3656C8] border border-[#3656C8]/30 font-mono">
                        {rep.format}
                      </span>
                    </div>
                    <div className="text-[11px] text-[#7B8491] font-mono">
                      Report ID: {rep.id} • Created: {new Date(rep.created_at).toLocaleDateString()}
                    </div>
                  </div>

                  <a
                    href={reportsApi.getExportUrl(rep.id)}
                    target="_blank"
                    rel="noreferrer"
                    className="px-4 py-2 bg-[#F0F2F5] hover:bg-[#E9EDFC] text-[#3656C8] text-xs font-bold rounded-xl border border-[#E2E3DD] transition-colors flex items-center gap-1.5 focus-visible-ring"
                  >
                    <span>Download {rep.format.toUpperCase()}</span>
                    <span>↓</span>
                  </a>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
