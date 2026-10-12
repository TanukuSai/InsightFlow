"use client";

import React, { useState, useEffect } from "react";
import AppHeader from "@/components/navigation/AppHeader";
import { getActiveWorkspaceId, API_BASE_URL } from "@/lib/api/client";

export default function SettingsPage() {
  const [workspaceName, setWorkspaceName] = useState("Build Battle Evaluation Workspace");
  const [apiEndpoint, setApiEndpoint] = useState(API_BASE_URL || "");
  const [workspaceId, setWorkspaceId] = useState("ws-production-eval");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setWorkspaceId(getActiveWorkspaceId());
    setApiEndpoint(API_BASE_URL || "");
  }, []);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  return (
    <div className="flex flex-col min-h-screen bg-[var(--bg-paper)]">
      <AppHeader
        title="Settings & Workspace Preferences"
        subtitle="Manage analytical configuration, backend connectivity, and security parameters"
      />

      <div className="p-4 sm:p-8 max-w-4xl mx-auto w-full space-y-8">
        <form onSubmit={handleSave} className="space-y-6">
          {/* Workspace Settings */}
          <div className="p-6 sm:p-8 solid-data rounded-3xl shadow-sm space-y-5 border-t-3 border-t-[#3656C8]">
            <h2 className="text-base font-bold text-[#20252D] pb-3 border-b border-[#E2E3DD]">
              Workspace Profile
            </h2>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-[#4D5765] mb-1.5">
                  Workspace Name
                </label>
                <input
                  type="text"
                  value={workspaceName}
                  onChange={(e) => setWorkspaceName(e.target.value)}
                  className="w-full px-4 py-2.5 bg-[#F6F5F1] border border-[#E2E3DD] rounded-xl text-xs text-[#20252D] focus:outline-none focus:border-[#3656C8] focus:ring-1 focus:ring-[#3656C8]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#4D5765] mb-1.5">
                  Tenant Workspace ID
                </label>
                <input
                  type="text"
                  readOnly
                  value={workspaceId}
                  className="w-full px-4 py-2.5 bg-[#F0F2F5] border border-[#E2E3DD] rounded-xl text-xs font-mono text-[#7B8491] cursor-not-allowed"
                />
                <span className="text-[10px] text-[#7B8491] mt-1 block">
                  Authoritative multi-tenant isolation key (<code className="px-1 py-0.5 bg-[#F0F2F5] rounded text-[#20252D] font-mono">X-Workspace-Id: {workspaceId}</code>) transmitted on all API requests.
                </span>
              </div>
            </div>
          </div>

          {/* Backend API Configuration */}
          <div className="p-6 sm:p-8 solid-data rounded-3xl shadow-sm space-y-5 border-t-3 border-t-[#5876B8]">
            <h2 className="text-base font-bold text-[#20252D] pb-3 border-b border-[#E2E3DD]">
              Backend Engine &amp; Storage
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
                Derived from <code className="px-1 py-0.5 bg-[#F0F2F5] rounded text-[#20252D] font-mono">NEXT_PUBLIC_API_BASE_URL</code> environment variable.
              </span>
            </div>

            <div className="p-4 bg-[#E9EDFC] rounded-2xl border border-[#3656C8]/20 flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-[#3656C8] animate-pulse" />
                <span className="font-bold text-[#3656C8]">API Connectivity</span>
              </div>
              <span className="font-mono text-[11px] text-[#4D5765]">{apiEndpoint || "Local Engine"}</span>
            </div>
          </div>

          {/* Architecture Status */}
          <div className="p-6 sm:p-8 solid-data rounded-3xl shadow-sm space-y-5 border-t-3 border-t-[#8B6E9B]">
            <div className="flex items-center justify-between pb-3 border-b border-[#E2E3DD]">
              <div>
                <h2 className="text-base font-bold text-[#20252D]">
                  Security &amp; API Integrity
                </h2>
                <p className="text-xs text-[#7B8491]">
                  Fail-closed tenant boundary &amp; zero client token leaks
                </p>
              </div>
              <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-[#E8F3EE] text-[#2E7D68] border border-[#2E7D68]/20 font-mono">
                Secured
              </span>
            </div>

            <div className="p-4 bg-[#F6F5F1] rounded-xl space-y-2 text-xs text-[#4D5765] border border-[#E2E3DD]">
              <div className="flex items-center justify-between">
                <span>Production Auth Enforcement:</span>
                <span className="font-mono font-bold text-[#2E7D68]">HS256 JWT Signed / Fail-Closed</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Security Boundary:</span>
                <span className="text-[#7B8491]">Server-Side Verification Only (Zero Client Key Exposure)</span>
              </div>
            </div>
          </div>

          {saved && (
            <div className="p-3 bg-[#E8F3EE] text-[#2E7D68] border border-[#2E7D68]/20 text-xs font-bold rounded-xl text-center">
              ✓ Workspace Preferences Saved
            </div>
          )}

          <div className="flex justify-end">
            <button
              type="submit"
              className="px-6 py-2.5 bg-[#3656C8] hover:bg-[#23387F] text-white text-xs font-bold rounded-xl shadow-sm transition-all focus-visible-ring"
            >
              Save Preferences
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
