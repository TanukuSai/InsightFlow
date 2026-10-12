"use client";

import React, { useState, useEffect } from "react";
import AppHeader from "@/components/navigation/AppHeader";
import { getActiveWorkspaceId, API_BASE_URL } from "@/lib/api/client";

export default function SettingsPage() {
  const [workspaceName] = useState("InsightFlow Hackathon Demo Workspace");
  const [apiEndpoint, setApiEndpoint] = useState(API_BASE_URL || "");
  const [workspaceId, setWorkspaceId] = useState("ws-production-eval");

  useEffect(() => {
    setWorkspaceId(getActiveWorkspaceId());
    setApiEndpoint(API_BASE_URL || "");
  }, []);

  return (
    <div className="flex flex-col min-h-screen bg-[var(--bg-paper)]">
      <AppHeader
        title="Settings & Workspace Information"
        subtitle="Public demonstration configuration, telemetry engine, and backend connectivity"
      />

      <div className="p-4 sm:p-8 max-w-4xl mx-auto w-full space-y-8">
        {/* Workspace Settings */}
        <div className="p-6 sm:p-8 solid-data rounded-3xl shadow-sm space-y-5 border-t-3 border-t-[#3656C8]">
          <div className="flex items-center justify-between pb-3 border-b border-[#E2E3DD]">
            <h2 className="text-base font-bold text-[#20252D]">
              Public Demo Workspace
            </h2>
            <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-[#E8F3EE] text-[#2E7D68] border border-[#2E7D68]/20 font-mono">
              Open Access
            </span>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-[#4D5765] mb-1.5">
                Workspace Name
              </label>
              <input
                type="text"
                readOnly
                value={workspaceName}
                className="w-full px-4 py-2.5 bg-[#F0F2F5] border border-[#E2E3DD] rounded-xl text-xs text-[#20252D] cursor-not-allowed"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-[#4D5765] mb-1.5">
                Authoritative Workspace Identifier
              </label>
              <input
                type="text"
                readOnly
                value={workspaceId}
                className="w-full px-4 py-2.5 bg-[#F0F2F5] border border-[#E2E3DD] rounded-xl text-xs font-mono text-[#7B8491] cursor-not-allowed"
              />
              <span className="text-[10px] text-[#7B8491] mt-1 block">
                InsightFlow operates as a single-workspace demonstration. All analytical pipelines bind server-side to <code className="px-1 py-0.5 bg-[#F0F2F5] rounded text-[#20252D] font-mono">{workspaceId}</code>.
              </span>
            </div>
          </div>
        </div>

        {/* Backend API Configuration */}
        <div className="p-6 sm:p-8 solid-data rounded-3xl shadow-sm space-y-5 border-t-3 border-t-[#5876B8]">
          <h2 className="text-base font-bold text-[#20252D] pb-3 border-b border-[#E2E3DD]">
            Backend Engine &amp; Connectivity
          </h2>

          <div>
            <label className="block text-xs font-bold text-[#4D5765] mb-1.5">
              Active Backend API URL
            </label>
            <input
              type="text"
              readOnly
              value={apiEndpoint || "Configured via NEXT_PUBLIC_API_BASE_URL"}
              className="w-full px-4 py-2.5 bg-[#F0F2F5] border border-[#E2E3DD] rounded-xl text-xs font-mono text-[#20252D] cursor-not-allowed"
            />
            <span className="text-[10px] text-[#7B8491] mt-1 block">
              Resolved from <code className="px-1 py-0.5 bg-[#F0F2F5] rounded text-[#20252D] font-mono">NEXT_PUBLIC_API_BASE_URL</code> environment variable.
            </span>
          </div>

          <div className="p-4 bg-[#E9EDFC] rounded-2xl border border-[#3656C8]/20 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-[#3656C8] animate-pulse" />
              <span className="font-bold text-[#3656C8]">API Connectivity</span>
            </div>
            <span className="font-mono text-[11px] text-[#4D5765]">{apiEndpoint || "Local Engine (http://127.0.0.1:8001)"}</span>
          </div>
        </div>

        {/* Architecture & Truthfulness */}
        <div className="p-6 sm:p-8 solid-data rounded-3xl shadow-sm space-y-5 border-t-3 border-t-[#8B6E9B]">
          <div className="flex items-center justify-between pb-3 border-b border-[#E2E3DD]">
            <div>
              <h2 className="text-base font-bold text-[#20252D]">
                Data Model &amp; Demo Specifications
              </h2>
              <p className="text-xs text-[#7B8491]">
                Zero-friction open evaluation with verified evidence traceability
              </p>
            </div>
            <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-[#E9EDFC] text-[#3656C8] border border-[#3656C8]/20 font-mono">
              Hackathon Demo
            </span>
          </div>

          <div className="p-4 bg-[#F6F5F1] rounded-xl space-y-2.5 text-xs text-[#4D5765] border border-[#E2E3DD]">
            <div className="flex items-center justify-between">
              <span className="font-medium">Authentication Model:</span>
              <span className="font-mono font-bold text-[#20252D]">Zero Auth / Direct Access</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="font-medium">Data Ingestion:</span>
              <span className="text-[#20252D]">CSV Upload &amp; Manual Feedback (Zero Scraping)</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="font-medium">Evidence Grounding:</span>
              <span className="text-[#20252D]">Verbatim Customer Quotes &amp; Strict Telemetry</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
