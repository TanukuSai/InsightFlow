"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useDataset } from "@/lib/context/DatasetContext";

interface AppSidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
}

export default function AppSidebar({ isOpen = true, onClose }: AppSidebarProps) {
  const pathname = usePathname();
  const { selectedDataset, loading: datasetLoading } = useDataset();

  const navItems = [
    { label: "Dashboard", href: "/dashboard", icon: "✦" },
    { label: "Feedback", href: "/feedback", icon: "💬" },
    { label: "Issues", href: "/issues", icon: "⚠️" },
    { label: "Recommendations", href: "/recommendations", icon: "💡" },
    { label: "Reports & Export", href: "/reports", icon: "📄" },
    { label: "Import CSV", href: "/import", icon: "📥" },
    { label: "Settings", href: "/settings", icon: "⚙️" },
  ];

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/25 backdrop-blur-xs z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={`fixed top-0 bottom-0 left-0 w-60 bg-white border-r border-[var(--border-subtle)] flex flex-col z-50 transition-transform duration-300 ease-in-out lg:translate-x-0 ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Brand Header */}
        <div className="h-16 flex items-center justify-between px-5 border-b border-[var(--border-subtle)]">
          <Link href="/dashboard" className="flex items-center gap-2.5 focus-visible-ring rounded-lg p-1">
            <div className="w-7 h-7 rounded-lg bg-[var(--brand)] text-white flex items-center justify-center font-bold text-xs shadow-xs">
              ✦
            </div>
            <div>
              <span className="font-extrabold text-sm tracking-tight text-[var(--ink)] block">
                InsightFlow
              </span>
              <span className="block text-[9px] uppercase font-mono tracking-wider text-[var(--ink-muted)]">
                Customer Voice
              </span>
            </div>
          </Link>

          {onClose && (
            <button
              onClick={onClose}
              className="lg:hidden p-1.5 rounded-lg text-[var(--ink-muted)] hover:bg-[#F2F4F6]"
              aria-label="Close menu"
            >
              ✕
            </button>
          )}
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 py-4 px-3 space-y-0.5 overflow-y-auto">
          {navItems.map((item) => {
            const isActive = pathname === item.href || pathname?.startsWith(`${item.href}/`);
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onClose}
                className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs transition-all focus-visible-ring ${
                  isActive
                    ? "bg-[#E9EDFC] text-[var(--brand)] font-bold shadow-2xs border-l-3 border-[var(--brand)]"
                    : "text-[var(--ink-secondary)] hover:bg-[#F2F4F6] hover:text-[var(--ink)] font-medium"
                }`}
              >
                <span className="text-sm opacity-90">{item.icon}</span>
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Dataset Context Widget */}
        <div className="p-4 border-t border-[var(--border-subtle)] bg-[#F6F5F1]">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--ink-muted)] font-mono">
              Active Dataset
            </span>
            <span className={`w-2 h-2 rounded-full ${selectedDataset ? "bg-[#2E7D68]" : "bg-amber-400"}`} />
          </div>
          {datasetLoading ? (
            <div className="text-xs text-[var(--ink-muted)] italic">Loading dataset...</div>
          ) : selectedDataset ? (
            <>
              <div className="text-xs font-bold text-[var(--ink)] truncate" title={selectedDataset.name}>
                {selectedDataset.name}
              </div>
              <div className="text-[11px] text-[var(--ink-muted)] mt-0.5 font-mono">
                {selectedDataset.row_count?.toLocaleString() || 0} Source Rows
              </div>
            </>
          ) : (
            <div className="text-xs text-[var(--ink-muted)]">No active dataset</div>
          )}

          <div className="mt-3 pt-2.5 border-t border-[var(--border-subtle)] flex items-center justify-between">
            <Link
              href="/"
              className="text-[11px] font-semibold text-[var(--brand)] hover:underline focus-visible-ring"
            >
              Public Demo ↗
            </Link>
            <span className="text-[10px] text-[var(--ink-muted)] font-mono">v2.1</span>
          </div>
        </div>
      </aside>
    </>
  );
}
