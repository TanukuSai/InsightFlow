"use client";

import React, { useState, useEffect } from "react";
import AppHeader from "@/components/navigation/AppHeader";
import { getActiveWorkspaceId, API_BASE_URL, healthApi } from "@/lib/api/client";
import { RefreshCw, CheckCircle2, XCircle, AlertCircle, Server } from "lucide-react";

export default function SettingsPage() {
  const [workspaceName] = useState("InsightFlow Hackathon Demo Workspace");
  const [apiEndpoint, setApiEndpoint] = useState(API_BASE_URL || "");
  const [workspaceId, setWorkspaceId] = useState("ws-production-eval");

  const [healthStatus, setHealthStatus] = useState<"checking" | "reachable" | "unreachable" | "not_configured">("checking");
  const [healthDetails, setHealthDetails] = useState<{ status?: string; database?: string; app?: string; environment?: string } | null>(null);
  const [lastChecked, setLastChecked] = useState<Date | null>(null);
  const [isPinging, setIsPinging] = useState(false);

  const checkConnection = async () => {
    setIsPinging(true);
    setHealthStatus("checking");
    try {
      if (typeof window !== "undefined" && !API_BASE_URL && process.env.NODE_ENV === "production") {
        setHealthStatus("not_configured");
        setHealthDetails(null);
        setLastChecked(new Date());
        setIsPinging(false);
        return;
      }
      const data = await healthApi.check();
      if (data && (data.status === "ok" || data.status === "degraded")) {
        setHealthStatus("reachable");
        setHealthDetails(data);
      } else {
        setHealthStatus("unreachable");
        setHealthDetails(null);
      }
    } catch {
      setHealthStatus("unreachable");
      setHealthDetails(null);
    } finally {
      setLastChecked(new Date());
      setIsPinging(false);
    }
  };

  useEffect(() => {
    setWorkspaceId(getActiveWorkspaceId());
    setApiEndpoint(API_BASE_URL || "");
    checkConnection();
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

          {/* Live /health connectivity check */}
          <div className="p-5 bg-[#F6F5F1] rounded-2xl border border-[#E2E3DD] space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <Server className="w-4 h-4 text-[#4D5765]" />
                <span className="font-bold text-xs text-[#20252D]">Backend Server Health</span>
                {healthStatus === "checking" && (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-[#FEF3C7] text-[#92400E] border border-[#FDE68A]">
                    <span className="w-2 h-2 rounded-full bg-[#D97706] animate-pulse" />
                    Checking...
                  </span>
                )}
                {healthStatus === "reachable" && (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-[#DCFCE7] text-[#166534] border border-[#BBF7D0]">
                    <CheckCircle2 className="w-3.5 h-3.5 text-[#16a34a]" />
                    Reachable
                  </span>
                )}
                {healthStatus === "unreachable" && (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-[#FEE2E2] text-[#991B1B] border border-[#FECACA]">
                    <XCircle className="w-3.5 h-3.5 text-[#DC2626]" />
                    Unreachable
                  </span>
                )}
                {healthStatus === "not_configured" && (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-[#F1F5F9] text-[#475569] border border-[#E2E8F0]">
                    <AlertCircle className="w-3.5 h-3.5 text-[#64748B]" />
                    Not Configured
                  </span>
                )}
              </div>

              <button
                type="button"
                onClick={checkConnection}
                disabled={isPinging}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-white border border-[#E2E3DD] text-[#20252D] hover:bg-[#F0F2F5] transition shadow-xs disabled:opacity-50 cursor-pointer self-start sm:self-auto"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isPinging ? "animate-spin text-[#3656C8]" : "text-[#7B8491]"}`} />
                <span>{isPinging ? "Testing..." : "Test Connection"}</span>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs pt-1 border-t border-[#E2E3DD]">
              <div className="bg-white p-3 rounded-xl border border-[#E2E3DD]">
                <div className="text-[10px] text-[#7B8491] font-medium uppercase tracking-wider">Engine Status</div>
                <div className="font-mono text-xs font-semibold text-[#20252D] mt-0.5">
                  {healthDetails?.status ? (
                    <span className="text-[#166534]">{healthDetails.status.toUpperCase()}</span>
                  ) : healthStatus === "checking" ? (
                    "Checking..."
                  ) : (
                    "Offline"
                  )}
                </div>
              </div>

              <div className="bg-white p-3 rounded-xl border border-[#E2E3DD]">
                <div className="text-[10px] text-[#7B8491] font-medium uppercase tracking-wider">Database Ping</div>
                <div className="font-mono text-xs font-semibold text-[#20252D] mt-0.5">
                  {healthDetails?.database ? (
                    <span className="text-[#166534]">{healthDetails.database}</span>
                  ) : healthStatus === "checking" ? (
                    "Checking..."
                  ) : (
                    "Unavailable"
                  )}
                </div>
              </div>

              <div className="bg-white p-3 rounded-xl border border-[#E2E3DD]">
                <div className="text-[10px] text-[#7B8491] font-medium uppercase tracking-wider">Last Verified</div>
                <div className="text-xs text-[#4D5765] mt-0.5">
                  {lastChecked ? lastChecked.toLocaleTimeString() : "Never"}
                </div>
              </div>
            </div>

            <p className="text-[11px] text-[#7B8491]">
              Live status query to backend endpoint <code className="px-1 py-0.5 bg-white rounded border border-[#E2E3DD] font-mono text-[#20252D]">/health</code>. Never shows fake continuous pulses.
            </p>
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
                Zero-friction open evaluation with verbatim evidence traceability
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
