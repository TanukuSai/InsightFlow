"use client";

import React, { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { Menu, Plus, AlertCircle, LogOut, ChevronDown } from "lucide-react";
import { useDataset } from "@/lib/context/DatasetContext";
import { useAuth } from "@/lib/context/AuthContext";

interface AppHeaderProps {
  title: string;
  subtitle?: string;
  onOpenMobileSidebar?: () => void;
  actions?: React.ReactNode;
}

export default function AppHeader({
  title,
  subtitle,
  onOpenMobileSidebar,
  actions,
}: AppHeaderProps) {
  const { datasets, selectedDatasetId, setSelectedDatasetId, loading } = useDataset();
  const { user, logout } = useAuth();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    }
    if (dropdownOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [dropdownOpen]);

  const initials = user?.full_name
    ? user.full_name
        .split(" ")
        .filter(Boolean)
        .map((n) => n[0])
        .join("")
        .slice(0, 2)
        .toUpperCase()
    : user?.email
    ? user.email.slice(0, 2).toUpperCase()
    : "IF";

  return (
    <header className="sticky top-0 z-30 h-16 glass-nav-bar px-4 sm:px-8 flex items-center justify-between gap-4">
      <div className="flex items-center gap-3 min-w-0">
        {onOpenMobileSidebar && (
          <button
            onClick={onOpenMobileSidebar}
            className="lg:hidden p-2 rounded-xl text-[var(--ink-muted)] hover:bg-[#F2F4F6] focus-visible-ring shrink-0"
            aria-label="Open navigation menu"
          >
            <Menu className="w-5 h-5 text-[var(--ink)]" />
          </button>
        )}
        <div className="min-w-0">
          <h1 className="text-base sm:text-lg font-bold text-[var(--ink)] tracking-tight truncate">
            {title}
          </h1>
          {subtitle && (
            <p className="text-[11px] text-[var(--ink-muted)] hidden sm:block truncate">
              {subtitle}
            </p>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2.5 shrink-0">
        {/* Dynamic Dataset Selector */}
        {datasets.length > 0 ? (
          <div className="hidden md:flex items-center gap-1.5 px-2.5 py-1 bg-white border border-[#DDE2E9] rounded-xl text-xs shadow-2xs">
            <span className="text-[10px] font-bold text-[#7B8491] uppercase tracking-wider font-mono">
              Dataset:
            </span>
            <select
              value={selectedDatasetId || ""}
              onChange={(e) => setSelectedDatasetId(e.target.value)}
              aria-label="Active Dataset Selector"
              className="bg-transparent text-xs font-semibold text-[#20252D] focus:outline-none cursor-pointer max-w-[200px] truncate"
            >
              {datasets.map((ds) => (
                <option key={ds.id} value={ds.id}>
                  {ds.name} ({ds.row_count.toLocaleString()} rows)
                </option>
              ))}
            </select>
          </div>
        ) : !loading ? (
          <Link
            href="/import"
            className="hidden md:inline-flex items-center gap-1.5 px-2.5 py-1 bg-[#FFF1F0] border border-[#FF6B61]/30 text-[#C6534D] text-[11px] font-bold rounded-xl"
          >
            <AlertCircle className="w-3.5 h-3.5 text-[#C6534D]" />
            <span>No feedback imported yet — Import feedback</span>
          </Link>
        ) : null}

        {actions}

        <Link
          href="/import"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[var(--brand)] hover:bg-[var(--brand-hover)] text-white text-xs font-bold rounded-xl shadow-xs transition-all focus-visible-ring"
        >
          <Plus className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Import feedback</span>
        </Link>

        {/* User / Workspace Profile Popover */}
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="flex items-center gap-1.5 p-1 rounded-xl hover:bg-[#F2F4F6] transition-colors focus-visible-ring"
            aria-label="User Account Menu"
            aria-expanded={dropdownOpen}
          >
            <div className="w-8 h-8 rounded-full bg-[#172033] border border-[var(--border-subtle)] flex items-center justify-center text-xs font-bold text-[#F7F8FA] shadow-2xs font-mono">
              {initials}
            </div>
            <ChevronDown className="w-3 h-3 text-[#727B86] hidden sm:block" />
          </button>

          {dropdownOpen && (
            <div className="absolute right-0 mt-2 w-64 bg-white border border-[#E2E3DD] rounded-xl shadow-lg p-3 z-50 text-xs">
              <div className="pb-2.5 border-b border-[#E2E3DD]">
                <div className="font-bold text-[#20252D] truncate">
                  {user?.full_name || "Workspace User"}
                </div>
                <div className="text-[11px] text-[#727B86] truncate mt-0.5 font-mono">
                  {user?.email}
                </div>
                <div className="mt-1.5 inline-flex items-center px-2 py-0.5 bg-[#F6F5F1] text-[#505966] text-[10px] font-mono rounded">
                  WS: {user?.workspace_id?.slice(0, 14)}...
                </div>
              </div>

              <div className="pt-2">
                <button
                  onClick={async () => {
                    setDropdownOpen(false);
                    await logout();
                  }}
                  className="w-full flex items-center gap-2 px-2.5 py-2 text-[#C6534D] hover:bg-[#FFF1F0] rounded-lg font-semibold transition-colors text-left"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Sign out</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
