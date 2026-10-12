"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Activity } from "lucide-react";

export default function PublicNav() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header className="fixed top-4 left-0 right-0 z-50 px-4 sm:px-8 max-w-6xl mx-auto">
      <nav className="glass-nav rounded-full px-5 py-2.5 flex items-center justify-between shadow-xs">
        {/* Brand */}
        <Link href="/" className="flex items-center gap-2.5 focus-visible-ring rounded-lg p-1 group">
          <div className="w-7 h-7 rounded-lg bg-[var(--brand)] text-white flex items-center justify-center font-bold text-xs shadow-xs group-hover:scale-105 transition-transform">
            <Activity className="w-3.5 h-3.5 text-white" />
          </div>
          <span className="font-extrabold text-sm sm:text-base tracking-tight text-[#111827]">
            InsightFlow
          </span>
          <span className="hidden sm:inline-block text-[10px] uppercase font-mono tracking-widest text-[#687386] px-2 py-0.5 rounded-full bg-[#ECEFF3]">
            Observatory
          </span>
        </Link>

        {/* Desktop Links */}
        <div className="hidden md:flex items-center gap-6 text-xs font-semibold text-[#687386]">
          <a href="#how-it-works" className="hover:text-[#111827] transition-colors focus-visible-ring">
            How It Works
          </a>
          <a href="#capabilities" className="hover:text-[#111827] transition-colors focus-visible-ring">
            Capabilities
          </a>
          <a href="#evidence" className="hover:text-[#111827] transition-colors focus-visible-ring">
            Data Honesty
          </a>
          <Link href="/reports" className="hover:text-[#111827] transition-colors focus-visible-ring">
            Reports
          </Link>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2.5">
          <Link
            href="/dashboard"
            className="px-4 py-1.5 bg-[#4F63FF] hover:bg-[#3C4FE6] text-white text-xs font-bold rounded-full shadow-xs transition-all focus-visible-ring"
          >
            Launch Workspace →
          </Link>

          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-1.5 text-[#687386] hover:text-[#111827] focus-visible-ring rounded-lg"
            aria-label="Toggle navigation menu"
          >
            {mobileMenuOpen ? "✕" : "☰"}
          </button>
        </div>
      </nav>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden mt-2 p-4 bg-white/95 backdrop-blur-lg rounded-2xl border border-[#DDE2E9] shadow-xl flex flex-col gap-3 text-xs font-semibold text-[#394457]">
          <a
            href="#how-it-works"
            onClick={() => setMobileMenuOpen(false)}
            className="py-1.5 hover:text-[#111827]"
          >
            How It Works
          </a>
          <a
            href="#capabilities"
            onClick={() => setMobileMenuOpen(false)}
            className="py-1.5 hover:text-[#111827]"
          >
            Capabilities
          </a>
          <a
            href="#evidence"
            onClick={() => setMobileMenuOpen(false)}
            className="py-1.5 hover:text-[#111827]"
          >
            Data Honesty
          </a>
          <Link
            href="/dashboard"
            onClick={() => setMobileMenuOpen(false)}
            className="py-1.5 font-bold text-[#4F63FF]"
          >
            Enter Dashboard ↗
          </Link>
        </div>
      )}
    </header>
  );
}
