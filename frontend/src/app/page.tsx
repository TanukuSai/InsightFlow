"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import PublicNav from "@/components/navigation/PublicNav";
import DataFieldCanvas, { DotFieldStage } from "@/components/background/DataFieldCanvas";
import { useAuth } from "@/lib/context/AuthContext";

export default function MarketingLandingPage() {
  const { user } = useAuth();
  const [scrollProgress, setScrollProgress] = useState<number>(1.0);
  const [activeStage, setActiveStage] = useState<DotFieldStage>(1);

  const storyStages = [
    {
      id: 1,
      badge: "Stage 01 • Ingestion",
      title: "Scattered Customer Feedback",
      desc: "Raw feedback records imported via CSV or manual entry, containing varying lengths and exact text repetitions.",
      metric: "7,000 Source Rows",
      metricLabel: "Dataset scale",
      accent: "#3656C8",
      border: "border-[#3656C8]",
    },
    {
      id: 2,
      badge: "Stage 02 • Exact Repeats",
      title: "Identifying Repeated Statements",
      desc: "Deterministic text normalization isolates identical repetitive statements without conflating duplicate text with unique customer counts.",
      metric: "320 Unique Statements",
      metricLabel: "6,680 exact duplicate instances",
      accent: "#5876B8",
      border: "border-[#5876B8]",
    },
    {
      id: 3,
      badge: "Stage 03 • Categorization",
      title: "Taxonomy & Domain Routing",
      desc: "Feedback organizes into four core business operational categories: Operational Issues, Product Feedback, Fraud and Scam, and Customer Service.",
      metric: "4 Core Domains",
      metricLabel: "Operational routing",
      accent: "#B58A43",
      border: "border-[#B58A43]",
    },
    {
      id: 4,
      badge: "Stage 04 • Actionable Evidence",
      title: "Traceable Issues & Recommendations",
      desc: "High-priority problem areas emerge backed by verbatim customer quotes, forming defensible recommendations.",
      metric: "10 Issue Dossiers",
      metricLabel: "Evidence-backed backlog",
      accent: "#B83D42",
      border: "border-[#B83D42]",
    },
  ];

  // Continuous, Reversible Scroll Tracker (Deterministic mathematical mapping)
  useEffect(() => {
    let ticking = false;

    const handleScroll = () => {
      if (ticking) return;
      ticking = true;

      requestAnimationFrame(() => {
        ticking = false;

        const scrollY = window.scrollY;
        const howItWorksEl = document.getElementById("how-it-works");

        if (!howItWorksEl) return;

        const howItWorksTop = howItWorksEl.offsetTop;
        const howItWorksHeight = howItWorksEl.offsetHeight;

        // Stage 1: In Hero section
        if (scrollY < howItWorksTop - 180) {
          const progress = 1.0 + Math.max(0, (scrollY / Math.max(1, howItWorksTop - 180)) * 0.2);
          setScrollProgress(progress);
          setActiveStage(1);
          return;
        }

        // Within How It Works & Stages: map relative scroll directly to stages 1.0 -> 4.0
        const relativeScroll = scrollY - (howItWorksTop - 150);
        const scrollFraction = Math.max(0, Math.min(1, relativeScroll / Math.max(1, howItWorksHeight + 100)));

        const computedProgress = 1.0 + scrollFraction * 3.0;
        setScrollProgress(computedProgress);

        // Derive active stage for tabs indicator
        if (computedProgress < 1.67) {
          setActiveStage(1);
        } else if (computedProgress < 2.5) {
          setActiveStage(2);
        } else if (computedProgress < 3.33) {
          setActiveStage(3);
        } else {
          setActiveStage(4);
        }
      });
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();

    return () => {
      window.removeEventListener("scroll", handleScroll);
    };
  }, []);

  const handleStageSelect = (stageId: DotFieldStage) => {
    setActiveStage(stageId);
    setScrollProgress(stageId);

    const howItWorksEl = document.getElementById("how-it-works");
    if (howItWorksEl) {
      const howItWorksTop = howItWorksEl.offsetTop;
      const howItWorksHeight = howItWorksEl.offsetHeight;
      const fraction = (stageId - 1.0) / 3.0;
      const targetScrollY = stageId === 1
        ? Math.max(0, howItWorksTop - 180)
        : Math.round(howItWorksTop - 150 + (howItWorksHeight + 100) * fraction);

      const prefersReducedMotion = typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      window.scrollTo({
        top: targetScrollY,
        behavior: prefersReducedMotion ? "auto" : "smooth",
      });
    }
  };

  return (
    <div className="min-h-screen bg-[var(--canvas)] text-[var(--ink)] relative overflow-hidden">
      {/* Living Data Dots Background Canvas (Continuous Scroll Driven) */}
      <DataFieldCanvas isBackground scrollProgress={scrollProgress} />

      {/* Floating Glass Navigation */}
      <PublicNav />

      {/* =========================================================================
          HERO SECTION (EDITORIAL SPLIT: CONFIDENT TYPOGRAPHY ON LEFT, OPEN DOT FIELD ON RIGHT)
          ========================================================================= */}
      <section className="relative pt-32 pb-20 px-6 sm:px-10 max-w-7xl mx-auto min-h-[84vh] flex items-center z-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center w-full">
          {/* Left Column: Editorial Headline & Actions */}
          <div className="lg:col-span-7 space-y-6">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#172033] border border-white/10 text-xs font-mono font-bold text-[#F7F8FA] shadow-xs">
              <span className="w-2 h-2 rounded-full bg-[#3656C8] animate-pulse" />
              <span>CUSTOMER VOICE EDITORIAL • 7,000 SOURCE ROWS</span>
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-[var(--ink)] leading-[1.12]">
              Find the signal in what your{" "}
              <span className="text-[var(--brand)] underline decoration-[var(--brand)]/30 decoration-wavy">
                customers say.
              </span>
            </h1>

            <p className="text-base sm:text-lg text-[var(--ink-secondary)] max-w-xl leading-relaxed font-normal">
              Turn repeated feedback into clear evidence, focused priorities, and
              decisions your team can defend. Grounded in deterministic text deduplication
              and verbatim audit trails.
            </p>

            {/* Evidence Proof Strip */}
            <div className="grid grid-cols-3 gap-3 pt-2 max-w-lg">
              <div className="p-3.5 solid-data rounded-2xl shadow-xs border-l-3 border-l-[#3656C8]">
                <div className="text-xl font-extrabold text-[var(--ink)] font-mono">7,000</div>
                <div className="text-[11px] text-[var(--ink-muted)] font-medium">Source Rows</div>
              </div>
              <div className="p-3.5 solid-data rounded-2xl shadow-xs border-l-3 border-l-[#5876B8]">
                <div className="text-xl font-extrabold text-[#3656C8] font-mono">320</div>
                <div className="text-[11px] text-[var(--ink-muted)] font-medium">Unique Statements</div>
              </div>
              <div className="p-3.5 solid-data rounded-2xl shadow-xs border-l-3 border-l-[#B83D42]">
                <div className="text-xl font-extrabold text-[#B83D42] font-mono">0</div>
                <div className="text-[11px] text-[var(--ink-muted)] font-medium">Fake Timestamps</div>
              </div>
            </div>

            {/* CTAs */}
            <div className="flex flex-wrap items-center gap-3 pt-2">
              <Link
                href={user ? "/dashboard" : "/login?returnUrl=/dashboard"}
                className="px-6 py-3 bg-[var(--brand)] hover:bg-[var(--brand-hover)] text-white text-sm font-bold rounded-xl shadow-md transition-all flex items-center gap-2 focus-visible-ring"
              >
                <span>Explore Workspace</span>
                <span>→</span>
              </Link>
              <a
                href="#how-it-works"
                className="px-5 py-3 bg-white hover:bg-[#F2F4F6] text-[var(--ink)] text-sm font-semibold rounded-xl border border-[var(--border-subtle)] shadow-xs transition-all focus-visible-ring"
              >
                See how it works ↓
              </a>
            </div>
          </div>

          {/* Right Column: Signal Observatory Midnight HUD Preview Card */}
          <div className="lg:col-span-5 h-[380px] sm:h-[440px] rounded-3xl relative pointer-events-none flex items-center justify-center">
            <div className="absolute inset-4 sm:inset-6 bg-[#172033]/95 border border-white/12 rounded-3xl p-6 backdrop-blur-md shadow-2xl flex flex-col justify-between pointer-events-auto overflow-hidden">
              <div className="absolute -top-12 -right-12 w-48 h-48 bg-[#3656C8]/25 rounded-full blur-2xl pointer-events-none" />
              <div className="absolute -bottom-8 -left-8 w-40 h-40 bg-[#5876B8]/20 rounded-full blur-2xl pointer-events-none" />

              <div className="relative z-10 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] uppercase font-bold tracking-widest text-[#F7F8FA] font-mono">
                    Deterministic Signal Pipeline
                  </span>
                  <span className="w-2 h-2 rounded-full bg-[#5876B8] animate-ping" />
                </div>
                <h3 className="text-lg font-bold text-[#F7F8FA]">
                  Signal Observatory Engine
                </h3>
                <p className="text-xs text-[#C5CCD7] leading-relaxed">
                  Aggregates imported feedback to isolate 320 unique exact feedback statements from 7,000 benchmark rows, identifying 6,680 repeated statement instances (95.4% exact duplicate rate in the benchmark dataset).
                </p>
              </div>

              {/* Micro Metric Preview */}
              <div className="relative z-10 space-y-2 pt-4 border-t border-white/10">
                <div className="text-[10px] uppercase font-bold text-[#9EB4FA] font-mono mb-1">
                  Benchmark Dataset (N=7,000 Rows)
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-[#C5CCD7]">Operational Issues</span>
                  <span className="font-mono font-bold text-[#398779]">1,800 (25.7%)</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-[#C5CCD7]">Fraud &amp; Scam Alerts</span>
                  <span className="font-mono font-bold text-[#8B6E9B]">1,755 (25.1%)</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-[#C5CCD7]">Product Feedback</span>
                  <span className="font-mono font-bold text-[#5876B8]">1,738 (24.8%)</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-[#C5CCD7]">Customer Service</span>
                  <span className="font-mono font-bold text-[#B58A43]">1,707 (24.4%)</span>
                </div>
              </div>

              <div className="relative z-10 pt-2">
                <Link
                  href={user ? "/dashboard" : "/login?returnUrl=/dashboard"}
                  className="w-full block text-center py-2 bg-white/10 hover:bg-white/15 text-[#F7F8FA] text-xs font-bold rounded-xl border border-white/12 transition-colors"
                >
                  Enter Workspace Dashboard →
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================================
          INTERACTIVE SCROLL-DRIVEN STORY: FROM FEEDBACK TO ACTION
          ========================================================================= */}
      <section id="how-it-works" className="py-24 px-6 sm:px-10 max-w-6xl mx-auto relative z-10">
        <div className="text-center max-w-2xl mx-auto mb-14">
          <div className="text-xs font-bold uppercase tracking-wider text-[var(--brand)] mb-2 font-mono">
            Scroll-Driven Transformation
          </div>
          <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-[var(--ink)]">
            From Feedback to Action
          </h2>
          <p className="text-sm text-[var(--ink-secondary)] mt-3">
            Scroll down or select stages below to watch the living dots transform continuously from noisy incoming feedback into clustered repetitions, domain channels, and decision constellations:
          </p>

          {/* Stage Controller Tabs */}
          <div className="inline-flex flex-wrap justify-center gap-2 mt-6 p-1.5 bg-white border border-[var(--border-subtle)] rounded-full shadow-xs">
            {storyStages.map((st) => (
              <button
                key={st.id}
                onClick={() => handleStageSelect(st.id as DotFieldStage)}
                className={`px-4 py-2 rounded-full text-xs font-bold transition-all focus-visible-ring ${
                  activeStage === st.id
                    ? "bg-[#172033] text-white shadow-xs"
                    : "text-[var(--ink-muted)] hover:bg-[#F2F4F6] hover:text-[var(--ink)]"
                }`}
              >
                {st.id}. {st.title.split(" ")[0]}
              </button>
            ))}
          </div>
        </div>

        {/* 4 Interactive Stage Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {storyStages.map((st) => {
            const isSelected = activeStage === st.id;
            return (
              <div
                key={st.id}
                id={`stage-${st.id}`}
                onClick={() => handleStageSelect(st.id as DotFieldStage)}
                className={`p-6 rounded-2xl cursor-pointer transition-all ${
                  isSelected
                    ? "bg-white border-2 border-[var(--brand)] shadow-lg -translate-y-1"
                    : "solid-data hover:bg-white shadow-xs"
                }`}
              >
                <div className="flex items-center justify-between mb-3">
                  <span
                    className={`text-[11px] font-bold px-2.5 py-1 rounded-full ${
                      isSelected
                        ? "bg-[#E9EDFC] text-[var(--brand)]"
                        : "bg-[#EFEEE8] text-[var(--ink-muted)]"
                    }`}
                  >
                    {st.badge}
                  </span>
                  <span className="text-xs font-mono font-bold text-[var(--ink-muted)]">
                    0{st.id}
                  </span>
                </div>
                <h3 className="font-bold text-base text-[var(--ink)] mb-2">
                  {st.title}
                </h3>
                <p className="text-xs text-[var(--ink-secondary)] leading-relaxed mb-4">
                  {st.desc}
                </p>
                <div className="pt-3 border-t border-[var(--border-subtle)]">
                  <div
                    className="text-sm font-extrabold font-mono"
                    style={{ color: st.accent }}
                  >
                    {st.metric}
                  </div>
                  <div className="text-[10px] text-[var(--ink-muted)]">
                    {st.metricLabel}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* =========================================================================
          DATA HONESTY & TRANSPARENCY SECTION
          ========================================================================= */}
      <section id="evidence" className="py-20 px-6 sm:px-10 bg-white border-y border-[var(--border-subtle)] relative z-10">
        <div className="max-w-6xl mx-auto">
          <div className="max-w-2xl mb-12">
            <span className="text-xs font-bold uppercase tracking-wider text-[var(--brand)] font-mono">
              Integrity Standards
            </span>
            <h2 className="text-3xl font-extrabold tracking-tight text-[var(--ink)] mt-2">
              Data Honesty and Verifiable Provenance
            </h2>
            <p className="text-sm text-[var(--ink-secondary)] mt-2">
              Most platforms invent synthetic trendlines when timestamps are missing. InsightFlow adheres to strict data transparency:
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="p-6 bg-[#F6F5F1] rounded-2xl border border-[var(--border-subtle)] shadow-xs space-y-3">
              <div className="w-10 h-10 rounded-xl bg-white text-[var(--brand)] flex items-center justify-center font-bold text-base shadow-xs">
                ⏳
              </div>
              <h3 className="font-bold text-sm text-[var(--ink)]">
                No Fabricated Timestamps
              </h3>
              <p className="text-xs text-[var(--ink-secondary)] leading-relaxed">
                When a dataset lacks date columns, we explicitly state that temporal trendlines are withheld rather than inventing fictitious 30-day graphs.
              </p>
            </div>

            <div className="p-6 bg-[#F6F5F1] rounded-2xl border border-[var(--border-subtle)] shadow-xs space-y-3">
              <div className="w-10 h-10 rounded-xl bg-white text-[#5876B8] flex items-center justify-center font-bold text-base shadow-xs">
                🔍
              </div>
              <h3 className="font-bold text-sm text-[var(--ink)]">
                Verbatim Evidence Linking
              </h3>
              <p className="text-xs text-[var(--ink-secondary)] leading-relaxed">
                Every generated issue and recommendation links directly to the unaltered source customer quotes in the database via the verbatim inspection drawer.
              </p>
            </div>

            <div className="p-6 bg-[#F6F5F1] rounded-2xl border border-[var(--border-subtle)] shadow-xs space-y-3">
              <div className="w-10 h-10 rounded-xl bg-white text-[#B83D42] flex items-center justify-center font-bold text-base shadow-xs">
                📊
              </div>
              <h3 className="font-bold text-sm text-[var(--ink)]">
                Repeat Deduplication Integrity
              </h3>
              <p className="text-xs text-[var(--ink-secondary)] leading-relaxed">
                Exact text repetitions are reported separately from root-cause severity so duplicate submissions never falsely inflate customer counts.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================================
          CORE CAPABILITIES / PRODUCT WORKFLOWS
          ========================================================================= */}
      <section id="capabilities" className="py-24 px-6 sm:px-10 max-w-6xl mx-auto relative z-10">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <span className="text-xs font-bold uppercase tracking-wider text-[var(--brand)] font-mono">
            Modular Platform
          </span>
          <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-[var(--ink)] mt-2">
            Integrated Decision Workspaces
          </h2>
          <p className="text-sm text-[var(--ink-secondary)] mt-3">
            Everything your team needs to ingest raw feedback, triage root causes, and export executive briefings:
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="p-8 solid-data rounded-3xl flex flex-col justify-between shadow-xs border-t-4 border-t-[#3656C8]">
            <div>
              <div className="text-xs font-bold uppercase text-[var(--brand)] mb-1 font-mono">
                Workspace 01
              </div>
              <h3 className="text-xl font-bold text-[var(--ink)] mb-2">
                Executive Cockpit &amp; KPIs
              </h3>
              <p className="text-xs text-[var(--ink-secondary)] leading-relaxed mb-6">
                Real-time visibility into total rows, unique exact statements, category breakdown, and prioritized risk issues.
              </p>
            </div>
            <Link
              href={user ? "/dashboard" : "/login?returnUrl=/dashboard"}
              className="text-xs font-bold text-[var(--brand)] hover:underline inline-flex items-center gap-1 focus-visible-ring"
            >
              Open Dashboard View →
            </Link>
          </div>

          <div className="p-8 solid-data rounded-3xl flex flex-col justify-between shadow-xs border-t-4 border-t-[#5876B8]">
            <div>
              <div className="text-xs font-bold uppercase text-[#5876B8] mb-1 font-mono">
                Workspace 02
              </div>
              <h3 className="text-xl font-bold text-[var(--ink)] mb-2">
                Feedback Table &amp; Evidence Drawer
              </h3>
              <p className="text-xs text-[var(--ink-secondary)] leading-relaxed mb-6">
                Filter by category, search text, inspect verbatim quotes in a sliding drawer, and view analysis status.
              </p>
            </div>
            <Link
              href={user ? "/feedback" : "/login?returnUrl=/feedback"}
              className="text-xs font-bold text-[#5876B8] hover:underline inline-flex items-center gap-1 focus-visible-ring"
            >
              Explore Feedback Stream →
            </Link>
          </div>

          <div className="p-8 solid-data rounded-3xl flex flex-col justify-between shadow-xs border-t-4 border-t-[#8B6E9B]">
            <div>
              <div className="text-xs font-bold uppercase text-[#8B6E9B] mb-1 font-mono">
                Workspace 03
              </div>
              <h3 className="text-xl font-bold text-[var(--ink)] mb-2">
                Issues Triage &amp; Evidence Dossiers
              </h3>
              <p className="text-xs text-[var(--ink-secondary)] leading-relaxed mb-6">
                Traceable problem clusters prioritized by supporting evidence volume, severity, and customer sentiment signals.
              </p>
            </div>
            <Link
              href={user ? "/issues" : "/login?returnUrl=/issues"}
              className="text-xs font-bold text-[#8B6E9B] hover:underline inline-flex items-center gap-1 focus-visible-ring"
            >
              Review Issue Dossiers →
            </Link>
          </div>

          <div className="p-8 solid-data rounded-3xl flex flex-col justify-between shadow-xs border-t-4 border-t-[#B58A43]">
            <div>
              <div className="text-xs font-bold uppercase text-[#B58A43] mb-1 font-mono">
                Workspace 04
              </div>
              <h3 className="text-xl font-bold text-[var(--ink)] mb-2">
                Executive Reports &amp; Real File Exports
              </h3>
              <p className="text-xs text-[var(--ink-secondary)] leading-relaxed mb-6">
                Generate real server-side executive summary reports with instant downloads in PDF, JSON, and CSV formats.
              </p>
            </div>
            <Link
              href={user ? "/reports" : "/login?returnUrl=/reports"}
              className="text-xs font-bold text-[#B58A43] hover:underline inline-flex items-center gap-1 focus-visible-ring"
            >
              Generate Reports →
            </Link>
          </div>
        </div>
      </section>

      {/* =========================================================================
          FINAL CTA & FOOTER
          ========================================================================= */}
      <section className="py-20 px-6 sm:px-10 max-w-5xl mx-auto text-center relative z-10">
        <div className="p-10 sm:p-14 bg-[#172033] text-white rounded-3xl shadow-xl space-y-6 relative overflow-hidden border border-white/10">
          <div className="absolute top-0 right-0 w-80 h-80 bg-[#3656C8]/20 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-80 h-80 bg-[#5876B8]/15 rounded-full blur-3xl pointer-events-none" />

          <div className="relative z-10 space-y-4">
            <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-[#F7F8FA]">
              Ready to turn customer feedback into action?
            </h2>
            <p className="text-sm sm:text-base text-[#C5CCD7] max-w-lg mx-auto leading-relaxed">
              Experience InsightFlow with the preloaded customer feedback dataset, or ingest your custom records via CSV.
            </p>
            <div className="pt-2">
              <Link
                href={user ? "/dashboard" : "/login?returnUrl=/dashboard"}
                className="px-8 py-3.5 bg-[var(--brand)] hover:bg-[var(--brand-hover)] text-white text-sm font-bold rounded-xl shadow-lg transition-all inline-block focus-visible-ring"
              >
                Launch Live Workspace →
              </Link>
            </div>
          </div>
        </div>
      </section>

      <footer className="py-10 px-6 border-t border-[var(--border-subtle)] bg-white text-center text-xs text-[var(--ink-muted)]">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="font-bold text-[var(--ink)]">InsightFlow</span>
            <span>— Customer Voice Editorial Platform</span>
          </div>
          <div className="flex items-center gap-6">
            <Link href="/dashboard" className="hover:text-[var(--ink)]">
              Dashboard
            </Link>
            <Link href="/feedback" className="hover:text-[var(--ink)]">
              Feedback
            </Link>
            <Link href="/issues" className="hover:text-[var(--ink)]">
              Issues
            </Link>
            <Link href="/reports" className="hover:text-[var(--ink)]">
              Reports
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
