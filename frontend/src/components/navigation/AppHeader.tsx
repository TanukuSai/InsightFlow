"use client";

import React from "react";
import Link from "next/link";

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
  return (
    <header className="sticky top-0 z-30 h-16 glass-nav-bar px-4 sm:px-8 flex items-center justify-between">
      <div className="flex items-center gap-3">
        {onOpenMobileSidebar && (
          <button
            onClick={onOpenMobileSidebar}
            className="lg:hidden p-2 rounded-xl text-[var(--ink-muted)] hover:bg-[#F2F4F6] focus-visible-ring"
            aria-label="Open navigation menu"
          >
            ☰
          </button>
        )}
        <div>
          <h1 className="text-base sm:text-lg font-bold text-[var(--ink)] tracking-tight">
            {title}
          </h1>
          {subtitle && (
            <p className="text-[11px] text-[var(--ink-muted)] hidden sm:block">
              {subtitle}
            </p>
          )}
        </div>
      </div>

      <div className="flex items-center gap-3">
        {actions}

        <Link
          href="/import"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[var(--brand)] hover:bg-[var(--brand-hover)] text-white text-xs font-bold rounded-xl shadow-xs transition-all focus-visible-ring"
        >
          <span>+</span>
          <span className="hidden sm:inline">Import CSV</span>
        </Link>

        {/* User Avatar */}
        <div className="w-8 h-8 rounded-full bg-[#172033] border border-[var(--border-subtle)] flex items-center justify-center text-xs font-bold text-[#F7F8FA] shadow-2xs font-mono">
          IF
        </div>
      </div>
    </header>
  );
}
