"use client";

import React, { useEffect, useState } from "react";
import AppHeader from "@/components/navigation/AppHeader";
import { recommendationsApi } from "@/lib/api/client";
import { Recommendation } from "@/lib/api/types";

export default function RecommendationsPage() {
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const datasetId = "ds-796d15b9a096";

  const fetchRecommendations = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await recommendationsApi.list({ datasetId });
      setRecommendations(res || []);
    } catch (err: any) {
      console.error("Failed to load recommendations:", err);
      setError(err?.message || "Failed to load recommendations");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRecommendations();
  }, []);

  const handleToggleTrack = async (recId: string, currentTracked: boolean) => {
    try {
      setUpdatingId(recId);
      const updated = await recommendationsApi.update(recId, { is_tracked: !currentTracked });
      setRecommendations((prev) =>
        prev.map((r) => (r.id === recId ? { ...r, is_tracked: updated.is_tracked } : r))
      );
    } catch (err: any) {
      alert("Failed to update tracking: " + err?.message);
    } finally {
      setUpdatingId(null);
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-[var(--bg-paper)]">
      <AppHeader
        title="Recommendations"
        subtitle="10 Actionable Fix Specifications Grounded in Feedback Evidence"
      />

      <div className="p-4 sm:p-8 max-w-7xl mx-auto w-full space-y-6">
        {loading ? (
          <div className="p-12 text-center solid-data rounded-2xl">
            <div className="w-8 h-8 rounded-full border-2 border-[#3656C8] border-t-transparent animate-spin mx-auto mb-3" />
            <div className="text-xs text-[#7B8491]">Loading recommendations from telemetry database...</div>
          </div>
        ) : error ? (
          <div className="p-8 text-center solid-data rounded-2xl border border-[#C6534D]/30">
            <div className="text-sm font-bold text-[#C6534D] mb-1">Error Loading Recommendations</div>
            <p className="text-xs text-[#7B8491] mb-4">{error}</p>
            <button
              onClick={fetchRecommendations}
              className="px-4 py-2 bg-[#3656C8] text-white text-xs font-bold rounded-xl"
            >
              Retry
            </button>
          </div>
        ) : recommendations.length === 0 ? (
          <div className="p-12 text-center solid-data rounded-2xl">
            <div className="text-sm font-bold text-[#20252D]">No recommendations generated yet</div>
            <p className="text-xs text-[#7B8491] mt-1">Run an analysis job to generate recommendations from feedback.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {recommendations.map((rec) => (
              <div
                key={rec.id}
                className="p-6 solid-data rounded-3xl flex flex-col justify-between space-y-4 shadow-xs border-t-3 border-t-[#3656C8]"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span
                      className={`text-[10px] font-bold px-2.5 py-1 rounded-full border ${
                        rec.priority === "Critical"
                          ? "bg-[#FAECEB] text-[#B83D42] border-[#B83D42]/30"
                          : rec.priority === "High"
                          ? "bg-[#FAF5E8] text-[#966C28] border-[#B58A43]/30"
                          : "bg-[#E9EDFC] text-[#3656C8] border-[#3656C8]/30"
                      }`}
                    >
                      {rec.priority || "Medium"} Priority
                    </span>
                    <button
                      onClick={() => handleToggleTrack(rec.id, rec.is_tracked)}
                      disabled={updatingId === rec.id}
                      className={`text-xs font-bold px-3 py-1 rounded-xl border transition-all focus-visible-ring ${
                        rec.is_tracked
                          ? "bg-[#3656C8] text-white border-[#3656C8]"
                          : "bg-[#F6F5F1] text-[#4D5765] border-[#E2E3DD] hover:bg-[#F0F2F5]"
                      }`}
                    >
                      {rec.is_tracked ? "✓ Tracked in Sprint" : "+ Track Action"}
                    </button>
                  </div>

                  <h3 className="font-bold text-base text-[#20252D]">
                    {rec.title}
                  </h3>

                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[#7B8491] block mb-1">
                      Problem Addressed:
                    </span>
                    <p className="text-xs text-[#4D5765] leading-relaxed">
                      {rec.problem_statement}
                    </p>
                  </div>

                  <div className="p-3.5 bg-[#F6F5F1] rounded-2xl border border-[#E2E3DD]">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[#3656C8] block mb-1">
                      Proposed Engineering Action:
                    </span>
                    <p className="text-xs font-semibold text-[#20252D] leading-relaxed">
                      {rec.proposed_action}
                    </p>
                  </div>

                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[#7B8491] block mb-1">
                      Evidence Rationale:
                    </span>
                    <p className="text-xs text-[#4D5765] leading-relaxed italic">
                      {rec.rationale}
                    </p>
                  </div>
                </div>

                <div className="pt-3 border-t border-[#E2E3DD] flex items-center justify-between text-[11px] text-[#7B8491]">
                  <span>Status: <strong className="text-[#20252D] capitalize">{rec.status}</strong></span>
                  <span className="font-mono">#{rec.id.slice(-6)}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
