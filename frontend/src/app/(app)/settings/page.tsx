"use client";

import React, { useState, useEffect, useCallback } from "react";
import AppHeader from "@/components/navigation/AppHeader";
import { healthApi } from "@/lib/api/client";
import { useAuth } from "@/lib/context/AuthContext";
import { RefreshCw, CheckCircle2, XCircle, AlertCircle, Server } from "lucide-react";

export default function SettingsPage() {
  const { user } = useAuth();
  const workspaceName = user?.full_name ? `${user.full_name}'s Workspace` : "InsightFlow Workspace";
  const workspaceId = user?.workspace_id || "Active Workspace";
  const apiEndpoint = "/api/proxy (Same-Origin BFF Gateway)";

  const [healthStatus, setHealthStatus] = useState<"checking" | "reachable" | "unreachable" | "not_configured">("checking");
  const [healthDetails, setHealthDetails] = useState<{ status?: string; database?: string; app?: string; environment?: string } | null>(null);
  const [lastChecked, setLastChecked] = useState<Date | null>(null);
  const [isPinging, setIsPinging] = useState(false);

  const checkConnection = useCallback(async () => {
    setIsPinging(true);
    setHealthStatus("checking");
    try {
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
  }, []);

  useEffect(() => {
    checkConnection();
  }, [checkConnection]);

  return (
    <div className="flex flex-col min-h-screen bg-[var(--bg-paper)]">
      <AppHeader
        title="Settings"
        subtitle="Workspace details and connection status."
      />

      <div className="p-4 sm:p-8 max-w-4xl mx-auto w-full space-y-8">
        {/* Workspace Settings */}
        <div className="p-6 sm:p-8 solid-data rounded-3xl shadow-sm space-y-5 border-t-3 border-t-[#3656C8]">
          <div className="flex items-center justify-between pb-3 border-b border-[#E2E3DD]">
            <h2 className="text-base font-bold text-[#20252D]">
              Workspace details
            </h2>
            <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-[#E8F3EE] text-[#2E7D68] border border-[#2E7D68]/20 font-mono">
              Active
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
                Workspace ID
              </label>
              <input
                type="text"
                readOnly
                value={workspaceId}
                className="w-full px-4 py-2.5 bg-[#F0F2F5] border border-[#E2E3DD] rounded-xl text-xs font-mono text-[#7B8491] cursor-not-allowed"
              />
              <span className="text-[10px] text-[#7B8491] mt-1 block">
                Feedback data and reports in this workspace are linked to this ID.
              </span>
            </div>
          </div>
        </div>

        {/* API Connection Configuration */}
        <div className="p-6 sm:p-8 solid-data rounded-3xl shadow-sm space-y-5 border-t-3 border-t-[#5876B8]">
          <h2 className="text-base font-bold text-[#20252D] pb-3 border-b border-[#E2E3DD]">
            Connection &amp; Service Status
          </h2>

          <div>
            <label className="block text-xs font-bold text-[#4D5765] mb-1.5">
              API service URL
            </label>
            <input
              type="text"
              readOnly
              value={apiEndpoint || "Configured via environment settings"}
              className="w-full px-4 py-2.5 bg-[#F0F2F5] border border-[#E2E3DD] rounded-xl text-xs font-mono text-[#20252D] cursor-not-allowed"
            />
            <span className="text-[10px] text-[#7B8491] mt-1 block">
              Configured via environment settings.
            </span>
          </div>

          {/* Connection status check */}
          <div className="p-5 bg-[#F6F5F1] rounded-2xl border border-[#E2E3DD] space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <Server className="w-4 h-4 text-[#4D5765]" />
                <span className="font-bold text-xs text-[#20252D]">Service status</span>
                {healthStatus === "checking" && (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-[#FEF3C7] text-[#92400E] border border-[#FDE68A]">
                    <span className="w-2 h-2 rounded-full bg-[#D97706] animate-pulse" />
                    Checking…
                  </span>
                )}
                {healthStatus === "reachable" && (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-[#DCFCE7] text-[#166534] border border-[#BBF7D0]">
                    <CheckCircle2 className="w-3.5 h-3.5 text-[#16a34a]" />
                    Connected
                  </span>
                )}
                {healthStatus === "unreachable" && (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-[#FEE2E2] text-[#991B1B] border border-[#FECACA]">
                    <XCircle className="w-3.5 h-3.5 text-[#DC2626]" />
                    Disconnected
                  </span>
                )}
                {healthStatus === "not_configured" && (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-[#F1F5F9] text-[#475569] border border-[#E2E8F0]">
                    <AlertCircle className="w-3.5 h-3.5 text-[#64748B]" />
                    Not configured
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
                <span>{isPinging ? "Checking…" : "Check connection"}</span>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs pt-1 border-t border-[#E2E3DD]">
              <div className="bg-white p-3 rounded-xl border border-[#E2E3DD]">
                <div className="text-[10px] text-[#7B8491] font-medium uppercase tracking-wider">Service status</div>
                <div className="font-mono text-xs font-semibold text-[#20252D] mt-0.5">
                  {healthDetails?.status ? (
                    <span className="text-[#166534]">Available</span>
                  ) : healthStatus === "checking" ? (
                    "Checking…"
                  ) : (
                    "Unavailable"
                  )}
                </div>
              </div>

              <div className="bg-white p-3 rounded-xl border border-[#E2E3DD]">
                <div className="text-[10px] text-[#7B8491] font-medium uppercase tracking-wider">Database status</div>
                <div className="font-mono text-xs font-semibold text-[#20252D] mt-0.5">
                  {healthDetails?.database ? (
                    <span className="text-[#166534]">Available</span>
                  ) : healthStatus === "checking" ? (
                    "Checking…"
                  ) : (
                    "Unavailable"
                  )}
                </div>
              </div>

              <div className="bg-white p-3 rounded-xl border border-[#E2E3DD]">
                <div className="text-[10px] text-[#7B8491] font-medium uppercase tracking-wider">Last checked</div>
                <div className="text-xs text-[#4D5765] mt-0.5">
                  {lastChecked ? lastChecked.toLocaleTimeString() : "Never"}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* System Details */}
        <div className="p-6 sm:p-8 solid-data rounded-3xl shadow-sm space-y-5 border-t-3 border-t-[#8B6E9B]">
          <div className="flex items-center justify-between pb-3 border-b border-[#E2E3DD]">
            <div>
              <h2 className="text-base font-bold text-[#20252D]">
                About InsightFlow
              </h2>
              <p className="text-xs text-[#7B8491]">
                Workspace version and features
              </p>
            </div>
            <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-[#E9EDFC] text-[#3656C8] border border-[#3656C8]/20 font-mono">
              InsightFlow v2.2
            </span>
          </div>

          <div className="p-4 bg-[#F6F5F1] rounded-xl space-y-2.5 text-xs text-[#4D5765] border border-[#E2E3DD]">
            <div className="flex items-center justify-between">
              <span className="font-medium">Access mode:</span>
              <span className="font-mono font-bold text-[#20252D]">Single-tenant workspace</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="font-medium">Data import:</span>
              <span className="text-[#20252D]">CSV upload and manual comment entry</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="font-medium">Feedback storage:</span>
              <span className="text-[#20252D]">Original customer comment text</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
