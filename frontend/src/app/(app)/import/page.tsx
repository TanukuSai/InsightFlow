"use client";

import React, { useState } from "react";
import Link from "next/link";
import AppHeader from "@/components/navigation/AppHeader";
import { datasetsApi } from "@/lib/api/client";
import { ImportSummary } from "@/lib/api/types";
import { useDataset } from "@/lib/context/DatasetContext";

export default function CsvImportPage() {
  const { setSelectedDatasetId, refreshDatasets } = useDataset();
  const [file, setFile] = useState<File | null>(null);
  const [datasetName, setDatasetName] = useState("");
  const [previewRows, setPreviewRows] = useState<string[][]>([]);
  const [headers, setHeaders] = useState<string[]>([]);

  const [uploading, setUploading] = useState(false);
  const [summary, setSummary] = useState<ImportSummary | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (!selected) return;

    setFile(selected);
    setError(null);
    setSummary(null);
    if (!datasetName) {
      setDatasetName(selected.name.replace(".csv", ""));
    }

    // Parse preview of first 5 rows in browser
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      const lines = text.split("\n").filter((l) => l.trim().length > 0);
      if (lines.length > 0) {
        const parsedHeaders = lines[0].split(",").map((h) => h.trim().replace(/^"|"$/g, ""));
        setHeaders(parsedHeaders);
        const rows = lines.slice(1, 6).map((line) =>
          line.split(",").map((c) => c.trim().replace(/^"|"$/g, ""))
        );
        setPreviewRows(rows);
      }
    };
    reader.readAsText(selected.slice(0, 8192));
  };

  const handleImportSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return;

    try {
      setUploading(true);
      setError(null);
      const res = await datasetsApi.importCsv(file, datasetName);
      setSummary(res);
      if (res?.dataset_id) {
        setSelectedDatasetId(res.dataset_id);
        refreshDatasets();
      }
    } catch (err: any) {
      console.error("CSV Import error:", err);
      setError(err?.message || "Failed to process CSV file");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-[var(--bg-paper)]">
      <AppHeader
        title="Import feedback"
        subtitle="Upload a CSV of customer comments to analyze them in InsightFlow."
      />

      <div className="p-4 sm:p-8 max-w-5xl mx-auto w-full space-y-8">
        {/* Data Privacy Notice */}
        <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-start gap-3 shadow-2xs">
          <span className="text-base leading-none">⚠️</span>
          <div>
            <strong className="font-bold">Data privacy: </strong>
            Upload customer feedback you have permission to use. Remove any personal or sensitive information before importing.
          </div>
        </div>

        {summary ? (
          /* Success Screen */
          <div className="p-8 solid-data rounded-3xl shadow-sm space-y-6 border-t-3 border-t-[#3656C8]">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-[#E9EDFC] text-[#3656C8] border border-[#3656C8]/20 flex items-center justify-center font-bold text-2xl">
                ✓
              </div>
              <div>
                <h2 className="text-lg font-bold text-[#20252D]">
                  Feedback imported successfully
                </h2>
                <p className="text-xs text-[#4D5765]">
                  {summary.valid_rows.toLocaleString()} comments added to your workspace.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-2">
              <div className="p-4 bg-[#F6F5F1] rounded-2xl border border-[#E2E3DD]">
                <div className="text-[10px] uppercase tracking-wider font-bold text-[#7B8491]">
                  Total rows
                </div>
                <div className="text-2xl font-extrabold text-[#20252D] mt-1 font-mono">
                  {summary.total_rows.toLocaleString()}
                </div>
              </div>
              <div className="p-4 bg-[#F6F5F1] rounded-2xl border border-[#E2E3DD]">
                <div className="text-[10px] uppercase tracking-wider font-bold text-[#7B8491]">
                  Valid comments
                </div>
                <div className="text-2xl font-extrabold text-[#2E7D68] mt-1 font-mono">
                  {summary.valid_rows.toLocaleString()}
                </div>
              </div>
              <div className="p-4 bg-[#F6F5F1] rounded-2xl border border-[#E2E3DD]">
                <div className="text-[10px] uppercase tracking-wider font-bold text-[#7B8491]">
                  Unique comments
                </div>
                <div className="text-2xl font-extrabold text-[#5876B8] mt-1 font-mono">
                  {summary.unique_exact_statements.toLocaleString()}
                </div>
              </div>
              <div className="p-4 bg-[#F6F5F1] rounded-2xl border border-[#E2E3DD]">
                <div className="text-[10px] uppercase tracking-wider font-bold text-[#7B8491]">
                  Repeated comments
                </div>
                <div className="text-2xl font-extrabold text-[#C6534D] mt-1 font-mono">
                  {summary.repeated_statements.toLocaleString()}
                </div>
              </div>
            </div>

            <div className="p-4 bg-[#E9EDFC] rounded-2xl border border-[#3656C8]/20 text-xs text-[#4D5765]">
              <strong className="text-[#20252D]">Detected Categories: </strong>
              {summary.detected_categories?.join(", ") || "None"}
            </div>

            <div className="pt-2 flex flex-wrap gap-3">
              <Link
                href={`/dashboard?dataset_id=${encodeURIComponent(summary.dataset_id)}`}
                className="px-6 py-2.5 bg-[#3656C8] hover:bg-[#23387F] text-white text-xs font-bold rounded-xl shadow-sm transition-colors focus-visible-ring"
              >
                Go to dashboard →
              </Link>
              <Link
                href={`/feedback?dataset_id=${encodeURIComponent(summary.dataset_id)}`}
                className="px-5 py-2.5 bg-[#F0F2F5] text-[#20252D] text-xs font-semibold rounded-xl hover:bg-[#E2E3DD] transition-colors focus-visible-ring"
              >
                View customer feedback
              </Link>
              <button
                onClick={() => {
                  setSummary(null);
                  setFile(null);
                }}
                className="px-4 py-2.5 text-xs text-[#7B8491] hover:text-[#20252D] hover:underline"
              >
                Upload another file
              </button>
            </div>
          </div>
        ) : (
          /* Upload Form */
          <form onSubmit={handleImportSubmit} className="space-y-6">
            <div className="p-8 solid-data rounded-3xl shadow-sm space-y-6 border-t-3 border-t-[#3656C8]">
              <div className="space-y-1">
                <h2 className="text-base font-bold text-[#20252D]">
                  Upload a CSV file
                </h2>
                <p className="text-xs text-[#4D5765]">
                  Your file must include the columns <code className="px-1.5 py-0.5 bg-[#F0F2F5] rounded text-[#20252D] font-mono">review</code> and <code className="px-1.5 py-0.5 bg-[#F0F2F5] rounded text-[#20252D] font-mono">category</code> (spelled exactly this way).
                </p>
              </div>

              {/* Drag & Drop Area */}
              <div className="border-2 border-dashed border-[#E2E3DD] hover:border-[#3656C8] rounded-2xl p-8 text-center bg-[#F6F5F1] hover:bg-[#E9EDFC]/30 transition-colors cursor-pointer relative group">
                <input
                  type="file"
                  accept=".csv"
                  onChange={handleFileChange}
                  className="absolute inset-0 opacity-0 cursor-pointer"
                />
                <div className="space-y-2 pointer-events-none">
                  <div className="text-3xl text-[#3656C8]">📥</div>
                  <div className="text-xs font-bold text-[#20252D] group-hover:text-[#3656C8] transition-colors">
                    {file ? file.name : "Click or drag a CSV file here"}
                  </div>
                  <div className="text-[11px] text-[#7B8491]">
                    {file
                      ? `${(file.size / 1024).toFixed(1)} KB selected`
                      : "Upload files up to 50 MB"}
                  </div>
                </div>
              </div>

              {/* Dataset Name Input */}
              <div>
                <label className="block text-xs font-bold text-[#4D5765] mb-1.5">
                  Dataset Name
                </label>
                <input
                  type="text"
                  required
                  value={datasetName}
                  onChange={(e) => setDatasetName(e.target.value)}
                  placeholder="e.g. Q1 Customer Feedback Batch"
                  className="w-full px-4 py-2.5 bg-[#F6F5F1] border border-[#E2E3DD] rounded-xl text-xs text-[#20252D] focus:outline-none focus:border-[#3656C8] focus:ring-1 focus:ring-[#3656C8]"
                />
              </div>

              {/* Data Preview Table */}
              {previewRows.length > 0 && (
                <div className="space-y-2 pt-2">
                  <div className="text-xs font-bold text-[#4D5765]">
                    File preview (first 5 rows)
                  </div>
                  <div className="border border-[#E2E3DD] rounded-xl overflow-x-auto bg-white">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-[#F6F5F1] border-b border-[#E2E3DD] text-[10px] uppercase tracking-wider font-bold text-[#7B8491]">
                        <tr>
                          {headers.map((h, i) => (
                            <th key={i} className="py-2.5 px-3">
                              {h}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#E2E3DD]">
                        {previewRows.map((r, i) => (
                          <tr key={i} className="hover:bg-[#F6F5F1]/50">
                            {r.map((c, j) => (
                              <td key={j} className="py-2.5 px-3 max-w-xs truncate text-[#20252D]">
                                {c}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {error && (
                <div className="p-4 bg-[#FAECEB] border border-[#C6534D]/30 rounded-xl text-xs text-[#C6534D]">
                  {error}
                </div>
              )}

              <div className="pt-2 flex justify-end">
                <button
                  type="submit"
                  disabled={!file || uploading}
                  className="px-6 py-3 bg-[#3656C8] hover:bg-[#23387F] text-white text-xs font-bold rounded-xl shadow-sm transition-all disabled:opacity-50 flex items-center gap-2 focus-visible-ring"
                >
                  {uploading ? (
                    <>
                      <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Importing feedback…</span>
                    </>
                  ) : (
                    <span>Import CSV</span>
                  )}
                </button>
              </div>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
