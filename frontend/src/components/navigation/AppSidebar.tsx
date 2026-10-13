"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  MessageSquareText,
  AlertTriangle,
  Lightbulb,
  Sparkles,
  FileText,
  UploadCloud,
  Settings,
  X,
  Activity,
  Layers,
  LogOut,
} from "lucide-react";
import { useDataset } from "@/lib/context/DatasetContext";
import { useAuth } from "@/lib/context/AuthContext";

interface AppSidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
}

export default function AppSidebar({ isOpen = true, onClose }: AppSidebarProps) {
  const pathname = usePathname();
  const { selectedDataset, loading: datasetLoading } = useDataset();
  const { user, logout } = useAuth();

  const navItems = [
    { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
    { label: "Customer feedback", href: "/feedback", icon: MessageSquareText },
    { label: "Issues", href: "/issues", icon: AlertTriangle },
    { label: "Recommendations", href: "/recommendations", icon: Lightbulb },
    {
      label: "Support training",
      href: "/adaption",
      icon: Sparkles,
      highlight: true,
    },
    { label: "Reports", href: "/reports", icon: FileText },
    { label: "Import feedback", href: "/import", icon: UploadCloud },
    { label: "Settings", href: "/settings", icon: Settings },
  ];

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/30 backdrop-blur-xs z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={`fixed top-0 bottom-0 left-0 w-64 bg-white border-r border-[var(--border-subtle)] flex flex-col z-50 transition-transform duration-300 ease-in-out lg:translate-x-0 ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Brand Header */}
        <div className="h-16 flex items-center justify-between px-5 border-b border-[var(--border-subtle)]">
          <Link href="/dashboard" className="flex items-center gap-2.5 focus-visible-ring rounded-lg p-1 group">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[var(--brand)] to-[#1E3A8A] text-white flex items-center justify-center shadow-xs group-hover:scale-105 transition-transform">
              <Activity className="w-4 h-4 text-white" />
            </div>
            <div>
              <span className="font-extrabold text-sm tracking-tight text-[var(--ink)] block">
                InsightFlow
              </span>
              <span className="block text-[9px] uppercase font-mono tracking-wider text-[var(--ink-muted)]">
                Customer feedback insights
              </span>
            </div>
          </Link>

          {onClose && (
            <button
              onClick={onClose}
              className="lg:hidden p-1.5 rounded-lg text-[var(--ink-muted)] hover:bg-[#F2F4F6] transition-colors"
              aria-label="Close menu"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 py-4 px-3 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const isActive = pathname === item.href || pathname?.startsWith(`${item.href}/`);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onClose}
                className={`flex items-center justify-between px-3 py-2.5 rounded-xl text-xs transition-all focus-visible-ring ${
                  isActive
                    ? "bg-[#E9EDFC] text-[var(--brand)] font-bold shadow-2xs border-l-3 border-[var(--brand)]"
                    : "text-[var(--ink-secondary)] hover:bg-[#F2F4F6] hover:text-[var(--ink)] font-medium"
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <Icon
                    className={`w-4 h-4 shrink-0 ${
                      isActive
                        ? "text-[var(--brand)]"
                        : item.highlight
                        ? "text-[var(--brand)]"
                        : "text-[var(--ink-muted)]"
                    }`}
                  />
                  <span className="truncate">{item.label}</span>
                </div>
              </Link>
            );
          })}
        </nav>

        {/* Dataset Context Widget */}
        <div className="p-4 border-t border-[var(--border-subtle)] bg-[#F6F5F1]">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--ink-muted)] font-mono flex items-center gap-1.5">
              <Layers className="w-3 h-3" />
              Current dataset
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
                {selectedDataset.row_count?.toLocaleString() || 0} comments
              </div>
            </>
          ) : (
            <Link
              href="/import"
              className="text-xs text-[var(--brand)] hover:underline font-medium block"
            >
              No feedback imported yet — Import feedback
            </Link>
          )}

          {user && (
            <div className="mt-3 pt-2.5 border-t border-[var(--border-subtle)] flex items-center justify-between text-xs">
              <div className="min-w-0 pr-2">
                <div className="font-semibold text-[var(--ink)] truncate" title={user.full_name || user.email}>
                  {user.full_name || user.email}
                </div>
                <div className="text-[10px] text-[var(--ink-muted)] truncate font-mono">
                  {user.email}
                </div>
              </div>
              <button
                onClick={() => logout()}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-bold text-[#C6534D] bg-[#FFF1F0] hover:bg-[#FFE5E3] transition-colors shrink-0 cursor-pointer border border-[#FF6B61]/30 shadow-2xs"
                title="Sign out of workspace session"
                aria-label="Sign out"
              >
                <LogOut className="w-3.5 h-3.5 text-[#C6534D]" />
                <span>Sign out</span>
              </button>
            </div>
          )}

          <div className="mt-2.5 pt-2 border-t border-[var(--border-subtle)] flex items-center justify-between">
            <Link
              href="/"
              className="text-[11px] font-semibold text-[var(--brand)] hover:underline focus-visible-ring"
            >
              Overview ↗
            </Link>
            <span className="text-[10px] text-[var(--ink-muted)] font-mono">v2.2</span>
          </div>
        </div>
      </aside>
    </>
  );
}
