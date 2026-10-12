"use client";

import React, { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import AppHeader from "@/components/navigation/AppHeader";
import { reportsApi } from "@/lib/api/client";
import { Report } from "@/lib/api/types";
import { useDataset } from "@/lib/context/DatasetContext";

export default function ReportsPage() {
  const { selectedDatasetId, selectedDataset, loading: datasetLoading } = useDataset();

  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Form states
  const [title, setTitle] = useState("Customer feedback report");
  const [format, setFormat] = useState<"pdf" | "json" | "csv">("pdf");
  const [generating, setGenerating] = useState(false);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  // Update title default when dataset loads
  useEffect(() => {
    if (selectedDataset?.name) {
      setTitle(`${selectedDataset.name} feedback report`);
    }
  }, [selectedDataset?.name]);

  const fetchReports = useCallback(async () => {
    if (!selectedDatasetId) {
      setReports([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const res = await reportsApi.list(selectedDatasetId);
      setReports(res || []);
    } catch (err: any) {
      console.error("Failed to load reports:", err);
      setError(err?.message || "Failed to load reports");
    } finally {
      setLoading(false);
    }
  }, [selectedDatasetId]);

  useEffect(() => {
    if (selectedDatasetId) {
      fetchReports();
    } else if (!datasetLoading) {
      setLoading(false);
      setReports([]);
    }
  }, [fetchReports, selectedDatasetId, datasetLoading]);

  const handleDownload = async (report: Report) => {
    try {
      setDownloadingId(report.id);
      const safeTitle = (report.title || "report").toLowerCase().replace(/[^a-z0-9]/g, "_");
      const filename = `${safeTitle}.${report.format}`;
      await reportsApi.download(report.id, filename);
    } catch (err: any) {
      console.error("Authenticated download failed:", err);
      alert("Failed to download report: " + (err?.message || "Unknown error"));
    } finally {
      setDownloadingId(null);
    }
  };

  const handleGenerateReport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDatasetId) {
      alert("Please select or import a dataset first.");
      return;
    }

    try {
      setGenerating(true);
      const newReport = await reportsApi.generate({
        dataset_id: selectedDatasetId,
        title: title.trim() || "Customer feedback report",
        format,
      });

      // Add to list and trigger download
      setReports((prev) => [newReport, ...prev]);
      await handleDownload(newReport);
    } catch (err: any) {
      alert("Failed to generate report: " + (err?.message || "Unknown error"));
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-[var(--bg-paper)]">
      <AppHeader
        title="Reports"
        subtitle="Create a report from your feedback and download it as PDF, CSV, or JSON."
      />

      <div className="p-4 sm:p-8 max-w-7xl mx-auto w-full space-y-8">
        {!selectedDatasetId && !datasetLoading ? (
          <div className="p-12 text-center solid-data rounded-2xl">
            <div className="text-2xl mb-2">📁</div>
            <div className="text-sm font-bold text-[#111827]">No dataset selected</div>
            <p className="text-xs text-[#687386] mt-1">Select an existing dataset or import a CSV file to create reports.</p>
            <Link
              href="/import"
              className="inline-block mt-4 px-4 py-2 bg-[#3656C8] text-white text-xs font-bold rounded-xl hover:bg-[#23387F] transition-colors"
            >
              Import feedback →
            </Link>
          </div>
        ) : (
          <>
            {/* Report Builder Form Card */}
            <div className="p-6 sm:p-8 solid-data rounded-3xl space-y-6 shadow-xs border-t-3 border-t-[#3656C8]">
              <div className="flex items-center gap-3 pb-4 border-b border-[#E2E3DD]">
                <div className="w-10 h-10 rounded-xl bg-[#E9EDFC] text-[#3656C8] flex items-center justify-center font-bold text-lg">
                  📄
                </div>
                <div>
                  <h2 className="text-base font-bold text-[#20252D]">
                    Create a report
                  </h2>
                  <p className="text-xs text-[#7B8491]">
                    Summarizes customer issues, recurring feedback, and category totals into a downloadable report.
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
                        <span>Creating report…</span>
                      </>
                    ) : (
                      <>
                        <span>Create report</span>
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
                  Previous reports ({reports.length})
                </h3>
                <span className="text-[11px] text-[#7B8491] font-mono">
                  Downloadable files
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
                  No reports created yet. Click "Create report" above to make your first report.
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
                          Created {new Date(rep.created_at).toLocaleDateString()}
                        </div>
                      </div>

                      <button
                        onClick={() => handleDownload(rep)}
                        disabled={downloadingId === rep.id}
                        className="px-4 py-2 bg-[#F0F2F5] hover:bg-[#E9EDFC] text-[#3656C8] text-xs font-bold rounded-xl border border-[#E2E3DD] transition-colors flex items-center gap-1.5 focus-visible-ring disabled:opacity-50"
                      >
                        {downloadingId === rep.id ? (
                          <>
                            <div className="w-3.5 h-3.5 border-2 border-[#3656C8] border-t-transparent rounded-full animate-spin" />
                            <span>Downloading...</span>
                          </>
                        ) : (
                          <>
                            <span>Download {rep.format.toUpperCase()}</span>
                            <span>↓</span>
                          </>
                        )}
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
