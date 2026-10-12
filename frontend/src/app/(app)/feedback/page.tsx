"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import AppHeader from "@/components/navigation/AppHeader";
import { feedbackApi } from "@/lib/api/client";
import { Feedback } from "@/lib/api/types";
import { useDataset } from "@/lib/context/DatasetContext";

// Signal Observatory Category Badges (Section 4 Tokens)
const CATEGORY_STYLES: Record<string, string> = {
  "Product Feedback": "bg-[#EEF3FA] text-[#3B5899] border-[#CCD8EE]",
  "Customer Service": "bg-[#FAF5E8] text-[#966C28] border-[#EDE0BF]",
  "Fraud and Scam": "bg-[#F6F0F8] text-[#6E4D7F] border-[#E0D2E5]",
  "Operational Issues": "bg-[#EDF6F4] text-[#398779] border-[#C6E2DC]",
};

export default function FeedbackExplorerPage() {
  const searchParams = useSearchParams();
  const initialSearch = searchParams.get("search") || "";

  const { selectedDatasetId, selectedDataset } = useDataset();
  const datasetId = selectedDatasetId || "ds-796d15b9a096";

  const [feedbacks, setFeedbacks] = useState<Feedback[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const pageSize = 15;

  // Filters
  const [search, setSearch] = useState(initialSearch);
  const [category, setCategory] = useState("");
  const [sentiment, setSentiment] = useState("");

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Detail drawer
  const [activeFeedback, setActiveFeedback] = useState<Feedback | null>(null);

  // Manual Add Feedback Modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [newText, setNewText] = useState("");
  const [newCategory, setNewCategory] = useState("Product Feedback");
  const [submitting, setSubmitting] = useState(false);

  const fetchFeedbacks = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const res = await feedbackApi.list({
        datasetId,
        page,
        pageSize,
        category: category || undefined,
        sentiment: sentiment || undefined,
        search: search.trim() || undefined,
      });

      setFeedbacks(res.items || []);
      setTotal(res.total || 0);
      setTotalPages(res.total_pages || 1);
    } catch (err: any) {
      console.error("Failed to load feedbacks:", err);
      setError(err?.message || "Failed to load feedbacks");
    } finally {
      setLoading(false);
    }
  }, [datasetId, page, pageSize, category, sentiment, search]);

  useEffect(() => {
    fetchFeedbacks();
  }, [fetchFeedbacks]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchFeedbacks();
  };

  const handleResetFilters = () => {
    setSearch("");
    setCategory("");
    setSentiment("");
    setPage(1);
  };

  const handleAddFeedback = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newText.trim()) return;

    try {
      setSubmitting(true);
      await feedbackApi.create({
        dataset_id: datasetId,
        original_text: newText.trim(),
        source_category: newCategory,
      });
      setShowAddModal(false);
      setNewText("");
      setPage(1);
      fetchFeedbacks();
    } catch (err: any) {
      alert("Error adding feedback: " + (err?.message || "Unknown error"));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-[var(--bg-paper)]">
      <AppHeader
        title="Feedback Stream"
        subtitle={`${selectedDataset?.name || "Dataset"} • ${total.toLocaleString()} Rows • Ingestion Order Provenance`}
        actions={
          <button
            onClick={() => setShowAddModal(true)}
            className="px-3.5 py-1.5 bg-[#3656C8] hover:bg-[#23387F] text-white text-xs font-bold rounded-xl shadow-xs transition-all focus-visible-ring"
          >
            + Add Feedback
          </button>
        }
      />

      <div className="p-4 sm:p-8 max-w-7xl mx-auto w-full space-y-6">
        {/* Filter & Search Bar */}
        <div className="p-5 solid-data rounded-2xl space-y-4">
          <form onSubmit={handleSearchSubmit} className="flex flex-wrap gap-3 items-center">
            {/* Search Input */}
            <div className="flex-1 min-w-[240px] relative">
              <input
                type="text"
                placeholder="Search feedback verbatim text, keyword, or complaint..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full px-4 py-2 pl-9 bg-[#F5F5F1] border border-[#DDE2E9] rounded-xl text-xs text-[#111827] focus:outline-none focus:border-[#3656C8] focus-visible-ring placeholder-[#687386]"
              />
              <span className="absolute left-3 top-2.5 text-xs text-[#687386]">🔍</span>
            </div>

            {/* Category Filter */}
            <select
              value={category}
              onChange={(e) => {
                setCategory(e.target.value);
                setPage(1);
              }}
              className="px-3 py-2 bg-[#F5F5F1] border border-[#DDE2E9] rounded-xl text-xs text-[#111827] focus:outline-none focus:border-[#3656C8] focus-visible-ring"
            >
              <option value="">All Categories</option>
              <option value="Operational Issues">Operational Issues</option>
              <option value="Fraud and Scam">Fraud and Scam</option>
              <option value="Product Feedback">Product Feedback</option>
              <option value="Customer Service">Customer Service</option>
            </select>

            {/* Sentiment Filter */}
            <select
              value={sentiment}
              onChange={(e) => {
                setSentiment(e.target.value);
                setPage(1);
              }}
              className="px-3 py-2 bg-[#F5F5F1] border border-[#DDE2E9] rounded-xl text-xs text-[#111827] focus:outline-none focus:border-[#3656C8] focus-visible-ring"
            >
              <option value="">All Sentiments</option>
              <option value="positive">Positive</option>
              <option value="neutral">Neutral</option>
              <option value="negative">Negative</option>
            </select>

            <button
              type="submit"
              className="px-4 py-2 bg-[#3656C8] text-white text-xs font-bold rounded-xl hover:bg-[#23387F] transition-colors focus-visible-ring"
            >
              Apply Filter
            </button>

            {(search || category || sentiment) && (
              <button
                type="button"
                onClick={handleResetFilters}
                className="px-3 py-2 bg-[#ECEFF3] text-[#394457] text-xs font-semibold rounded-xl hover:bg-[#DDE2E9] transition-colors focus-visible-ring"
              >
                Reset
              </button>
            )}
          </form>

          {/* Result Count and Active Filters */}
          <div className="flex items-center justify-between text-xs text-[#687386] pt-2 border-t border-[#DDE2E9]">
            <div>
              Showing <strong className="text-[#111827]">{feedbacks.length}</strong> of <strong className="text-[#111827]">{total.toLocaleString()}</strong> records
              {category && <span> in <em className="text-[#111827] font-semibold">{category}</em></span>}
            </div>
            <div className="text-[11px] text-[#687386] font-mono">
              Page {page} of {totalPages}
            </div>
          </div>
        </div>

        {/* Feedback Data Table */}
        {loading ? (
          <div className="p-12 text-center solid-data rounded-2xl">
            <div className="w-8 h-8 rounded-full border-2 border-[#4F63FF] border-t-transparent animate-spin mx-auto mb-3" />
            <div className="text-xs text-[#687386]">Loading verified records from telemetry database...</div>
          </div>
        ) : error ? (
          <div className="p-8 text-center solid-data rounded-2xl border border-[#FF6B61]/30">
            <div className="text-sm font-bold text-[#FF6B61] mb-1">Error Loading Feedback</div>
            <p className="text-xs text-[#687386] mb-4">{error}</p>
            <button
              onClick={fetchFeedbacks}
              className="px-4 py-2 bg-[#4F63FF] text-white text-xs font-bold rounded-xl"
            >
              Retry
            </button>
          </div>
        ) : feedbacks.length === 0 ? (
          <div className="p-12 text-center solid-data rounded-2xl">
            <div className="text-2xl mb-2">🔍</div>
            <div className="text-sm font-bold text-[#111827]">No matching feedback records</div>
            <p className="text-xs text-[#687386] mt-1">Try broadening your search keyword or clearing the active category filter.</p>
            <button
              onClick={handleResetFilters}
              className="mt-4 px-4 py-2 bg-[#ECEFF3] text-[#4F63FF] text-xs font-bold rounded-xl hover:bg-[#EEF2FF]"
            >
              Reset Filters
            </button>
          </div>
        ) : (
          <div className="solid-data rounded-2xl overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#F5F5F1] border-b border-[#DDE2E9] text-[#687386] font-bold uppercase text-[10px] tracking-wider">
                  <tr>
                    <th className="py-3 px-4 w-28">Source Row</th>
                    <th className="py-3 px-4">Verbatim Feedback Text</th>
                    <th className="py-3 px-4 w-44">Source Category</th>
                    <th className="py-3 px-4 w-28">Analysis Status</th>
                    <th className="py-3 px-4 w-24 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#DDE2E9]">
                  {feedbacks.map((fb) => {
                    const catStyle = CATEGORY_STYLES[fb.source_category || ""] || "bg-[#ECEFF3] text-[#687386]";
                    return (
                      <tr
                        key={fb.id}
                        onClick={() => setActiveFeedback(fb)}
                        className="hover:bg-[#F5F5F1]/80 cursor-pointer transition-colors"
                      >
                        <td className="py-3.5 px-4 font-mono font-bold text-[#687386]">
                          #{fb.id.slice(-6)}
                        </td>
                        <td className="py-3.5 px-4 text-[#111827] font-medium leading-relaxed max-w-md">
                          <span className="line-clamp-2 italic">"{fb.original_text}"</span>
                        </td>
                        <td className="py-3.5 px-4">
                          <span className={`inline-block px-2.5 py-1 rounded-full text-[11px] font-semibold border ${catStyle}`}>
                            {fb.source_category || "Uncategorized"}
                          </span>
                        </td>
                        <td className="py-3.5 px-4">
                          <span className="text-[11px] text-[#687386] capitalize font-medium">
                            {fb.analysis_status}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <span className="text-xs font-bold text-[#3656C8] hover:underline">
                            Inspect →
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            <div className="p-4 bg-[#F5F5F1] border-t border-[#DDE2E9] flex items-center justify-between text-xs">
              <button
                disabled={page <= 1}
                onClick={() => setPage(page - 1)}
                className="px-3.5 py-1.5 bg-white border border-[#DDE2E9] rounded-xl disabled:opacity-40 disabled:cursor-not-allowed hover:bg-[#ECEFF3] font-medium transition-colors focus-visible-ring"
              >
                ← Previous
              </button>
              <div className="text-[#687386] font-mono">
                Page {page} of {totalPages}
              </div>
              <button
                disabled={page >= totalPages}
                onClick={() => setPage(page + 1)}
                className="px-3.5 py-1.5 bg-white border border-[#DDE2E9] rounded-xl disabled:opacity-40 disabled:cursor-not-allowed hover:bg-[#ECEFF3] font-medium transition-colors focus-visible-ring"
              >
                Next →
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Slide-over Verbatim Evidence Drawer */}
      {activeFeedback && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div
            className="fixed inset-0 bg-black/40 backdrop-blur-xs transition-opacity"
            onClick={() => setActiveFeedback(null)}
          />
          <div className="relative w-full max-w-lg bg-white h-full shadow-2xl p-6 sm:p-8 flex flex-col justify-between overflow-y-auto z-10 animate-in slide-in-from-right duration-250">
            <div className="space-y-6">
              <div className="flex items-center justify-between pb-4 border-b border-[#DDE2E9]">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#687386] font-mono">
                    Verbatim Record Inspection
                  </span>
                  <h3 className="text-base font-bold text-[#111827] font-mono">
                    #{activeFeedback.id}
                  </h3>
                </div>
                <button
                  onClick={() => setActiveFeedback(null)}
                  className="w-8 h-8 rounded-full bg-[#ECEFF3] flex items-center justify-center text-sm font-bold text-[#394457] hover:bg-[#DDE2E9] focus-visible-ring"
                >
                  ✕
                </button>
              </div>

              <div>
                <span className="text-xs font-bold text-[#394457] block mb-2">
                  Unaltered Verbatim Source Text:
                </span>
                <div className="p-4 bg-[#F5F5F1] rounded-2xl border border-[#DDE2E9] text-xs text-[#111827] leading-relaxed italic font-serif">
                  "{activeFeedback.original_text}"
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 bg-[#F5F5F1] rounded-xl border border-[#DDE2E9]">
                  <div className="text-[10px] text-[#687386]">Source Category</div>
                  <div className="text-xs font-bold text-[#111827] mt-0.5">
                    {activeFeedback.source_category || "Uncategorized"}
                  </div>
                </div>
                <div className="p-3 bg-[#F5F5F1] rounded-xl border border-[#DDE2E9]">
                  <div className="text-[10px] text-[#687386]">Analysis Status</div>
                  <div className="text-xs font-bold text-[#4F63FF] mt-0.5 capitalize">
                    {activeFeedback.analysis_status}
                  </div>
                </div>
              </div>

              {activeFeedback.primary_topic && (
                <div className="p-3 bg-[#EEF2FF] rounded-xl border border-[#4F63FF]/30">
                  <div className="text-[10px] text-[#687386]">Primary Topic</div>
                  <div className="text-xs font-bold text-[#4F63FF] mt-0.5">
                    {activeFeedback.primary_topic}
                  </div>
                </div>
              )}

              <div className="p-4 bg-[#172033] text-white rounded-2xl text-[11px] leading-relaxed border border-[#2E3D5C]">
                <div className="text-[10px] uppercase font-bold text-[#9EB4FA] font-mono mb-1">
                  Provenance Guarantee
                </div>
                This verbatim quote is preserved verbatim from the ingested dataset without synthetic augmentation.
              </div>
            </div>

            <div className="pt-6 border-t border-[#DDE2E9] flex justify-end">
              <button
                onClick={() => setActiveFeedback(null)}
                className="px-5 py-2.5 bg-[#ECEFF3] hover:bg-[#DDE2E9] text-[#111827] text-xs font-semibold rounded-xl transition-colors focus-visible-ring"
              >
                Close Drawer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Manual Add Feedback Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-black/40 backdrop-blur-xs"
            onClick={() => setShowAddModal(false)}
          />
          <div className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl p-6 sm:p-8 space-y-5 z-10 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-[#DDE2E9]">
              <h3 className="text-sm font-bold text-[#111827]">Add Customer Feedback</h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-sm text-[#687386] hover:text-[#111827]"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddFeedback} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-[#394457] mb-1.5">
                  Verbatim Customer Comment
                </label>
                <textarea
                  required
                  rows={4}
                  value={newText}
                  onChange={(e) => setNewText(e.target.value)}
                  placeholder="Enter exact customer comment..."
                  className="w-full p-3 bg-[#F5F5F1] border border-[#DDE2E9] rounded-xl text-xs text-[#111827] focus:outline-none focus:border-[#4F63FF] focus-visible-ring"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#394457] mb-1.5">
                  Category
                </label>
                <select
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value)}
                  className="w-full p-2.5 bg-[#F5F5F1] border border-[#DDE2E9] rounded-xl text-xs text-[#111827] focus:outline-none focus:border-[#4F63FF] focus-visible-ring"
                >
                  <option value="Operational Issues">Operational Issues</option>
                  <option value="Fraud and Scam">Fraud and Scam</option>
                  <option value="Product Feedback">Product Feedback</option>
                  <option value="Customer Service">Customer Service</option>
                </select>
              </div>

              <div className="pt-3 flex gap-2 justify-end">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 bg-[#ECEFF3] text-xs font-semibold rounded-xl text-[#394457] hover:bg-[#DDE2E9] focus-visible-ring"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 bg-[#3656C8] hover:bg-[#23387F] text-white text-xs font-bold rounded-xl disabled:opacity-50 transition-colors focus-visible-ring"
                >
                  {submitting ? "Saving..." : "Add to Dataset"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
