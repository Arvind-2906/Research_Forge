"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { researchService } from "../../../services/researchService";
import { analyticsService } from "../../../services/analyticsService";
import { useWorkspace } from "../../../context/WorkspaceContext";

export default function DashboardPage() {
  const router = useRouter();
  const { currentWorkspace } = useWorkspace();

  const [queryInput, setQueryInput] = useState("");
  const [selectedMode, setSelectedMode] = useState("Deep Research");
  const [runs, setRuns] = useState([]);
  const [activeRun, setActiveRun] = useState(null);
  const [overview, setOverview] = useState(null);
  const [loading, setLoading] = useState(true);

  const modes = [
    { label: "Deep Research", icon: "✦" },
    { label: "Market Intelligence", icon: "trending_up" },
    { label: "Tech Trends & Patents", icon: "psychology" },
    { label: "Competitor Matrix", icon: "grid_view" },
    { label: "Peer-Review Synthesis", icon: "menu_book" },
    { label: "Regulatory Precedent", icon: "gavel" },
  ];

  useEffect(() => {
    async function loadDashboardData() {
      try {
        const [runsRes, analyticsRes] = await Promise.allSettled([
          researchService.listRuns({ limit: 10 }),
          analyticsService.getOverview(),
        ]);

        if (runsRes.status === "fulfilled" && runsRes.value?.data) {
          const fetchedRuns = Array.isArray(runsRes.value.data) ? runsRes.value.data : [];
          setRuns(fetchedRuns);
          const running = fetchedRuns.find(
            (r) => r.status === "RUNNING" || r.status === "VERIFYING" || r.status === "PLANNING"
          );
          setActiveRun(running || null);
        }

        if (analyticsRes.status === "fulfilled" && analyticsRes.value) {
          setOverview(analyticsRes.value);
        }
      } catch (err) {
        console.warn("Dashboard data fetch fallback:", err);
      } finally {
        setLoading(false);
      }
    }

    loadDashboardData();
  }, [currentWorkspace?.id]);

  const handleQuerySubmit = (e) => {
    e.preventDefault();
    if (!queryInput.trim()) return;
    router.push(
      `/research/new?topic=${encodeURIComponent(queryInput.trim())}&mode=${encodeURIComponent(selectedMode)}`
    );
  };

  return (
    <div className="flex flex-col w-full">
      {/* Top Hero & Query Formulation */}
      <section className="grid grid-cols-1 xl:grid-cols-12 gap-space-lg mb-space-xl">
        {/* Left Hero Column: Brand Statement & Autonomous Input */}
        <div className="xl:col-span-8 flex flex-col justify-between">
          <div className="space-y-space-xs">
            <div className="flex items-center gap-2">
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-secondary" />
              <span className="font-mono-meta text-mono-meta text-outline uppercase tracking-widest">
                Autonomous Research Workspace
              </span>
              <span className="text-outline text-mono-meta">·</span>
              <span className="font-mono-meta text-mono-meta text-secondary uppercase">
                Cluster US-East Node 04
              </span>
            </div>
            <h1 className="font-headline-lg text-headline-lg text-on-surface tracking-tight font-normal">
              Research deeper. <span className="italic font-light text-on-surface-variant">Think clearer.</span>
            </h1>
            <p className="font-body-md text-body-md text-on-surface-variant max-w-2xl">
              Turn multifaceted scientific and market inquiries into structured syntheses, cross-verified
              consensus graphs, and executable dossiers.
            </p>
          </div>

          {/* Architectural Research Input Module */}
          <div className="mt-space-lg">
            <form
              onSubmit={handleQuerySubmit}
              className="group relative flex flex-col sm:flex-row items-stretch sm:items-center bg-surface-container-lowest rounded-xl shadow-sm border border-outline-variant/50 hover:border-outline focus-within:border-secondary transition-all p-1.5 gap-2"
            >
              <div className="flex items-center flex-1 pl-3 gap-space-sm min-w-0">
                <span className="material-symbols-outlined text-outline group-focus-within:text-secondary text-[22px] transition-colors">
                  explore
                </span>
                <input
                  value={queryInput}
                  onChange={(e) => setQueryInput(e.target.value)}
                  className="w-full bg-transparent font-body-md text-body-md text-on-surface placeholder:text-outline focus:outline-none py-2"
                  placeholder="Ask anything... e.g. Evaluate emerging solid-state battery electrolytes for grid storage"
                  type="text"
                />
              </div>
              <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-center pr-1">
                <div className="hidden md:flex items-center gap-1 px-2.5 py-1 rounded bg-secondary/10 text-secondary border border-secondary/20">
                  <span className="w-1.5 h-1.5 rounded-full bg-secondary" />
                  <span className="font-mono-meta text-mono-meta uppercase tracking-wider">
                    Deep Autonomous L4
                  </span>
                </div>
                <button
                  type="submit"
                  className="h-10 px-4 bg-primary text-on-primary hover:bg-primary-container rounded-lg flex items-center justify-center gap-1.5 font-label-md text-label-md transition-colors"
                  title="Initialize Autonomous Agent Pipeline"
                >
                  <span>Execute</span>
                  <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
                </button>
              </div>
            </form>

            {/* Topic Scope Chips */}
            <div className="flex items-center gap-2 mt-space-sm overflow-x-auto pb-1 select-none">
              <span className="font-mono-meta text-mono-meta text-outline uppercase tracking-wider shrink-0 mr-1">
                Modes:
              </span>
              {modes.map((m) => {
                const active = selectedMode === m.label;
                return (
                  <button
                    key={m.label}
                    type="button"
                    onClick={() => setSelectedMode(m.label)}
                    className={`shrink-0 flex items-center gap-1.5 px-2.5 py-1 rounded-full font-label-md text-label-md transition-colors ${
                      active
                        ? "bg-secondary/15 border border-secondary text-on-surface font-semibold"
                        : "bg-surface-container-lowest border border-outline-variant/60 hover:bg-surface-container text-on-surface-variant"
                    }`}
                  >
                    <span className="text-secondary text-[11px]">{m.icon}</span>
                    <span>{m.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right Hero Column: Telemetry & Workspace Impact Metric Grid */}
        <div className="xl:col-span-4 flex flex-col justify-between">
          <div className="h-full bg-surface-container-lowest rounded-xl border border-outline-variant/60 p-space-md shadow-sm flex flex-col justify-between">
            <div className="flex items-center justify-between border-b border-outline-variant/30 pb-space-sm mb-space-sm">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[16px] text-outline">analytics</span>
                <span className="font-mono-meta text-mono-meta text-outline uppercase tracking-wider">
                  Workspace Telemetry
                </span>
              </div>
              <span className="font-mono-meta text-mono-meta px-2 py-0.5 rounded bg-surface-container text-on-surface-variant">
                Last 30 Days
              </span>
            </div>

            <div className="grid grid-cols-2 gap-space-md py-1">
              {/* Metric 1 */}
              <div className="flex flex-col">
                <span className="font-mono-meta text-mono-meta text-outline uppercase tracking-wider">
                  Research Runs
                </span>
                <div className="flex items-baseline gap-2 mt-1">
                  <span className="font-headline-md text-headline-md font-normal text-on-surface">
                    {overview?.totalRuns || 142}
                  </span>
                  <span className="font-mono-meta text-[11px] text-secondary font-semibold">+18%</span>
                </div>
                <span className="font-mono-code text-[11px] text-on-surface-variant mt-0.5">
                  8 concurrent max
                </span>
              </div>

              {/* Metric 2 */}
              <div className="flex flex-col">
                <span className="font-mono-meta text-mono-meta text-outline uppercase tracking-wider">
                  Sources Scraped
                </span>
                <div className="flex items-baseline gap-2 mt-1">
                  <span className="font-headline-md text-headline-md font-normal text-on-surface">
                    {overview?.totalSourcesDiscovered
                      ? overview.totalSourcesDiscovered.toLocaleString()
                      : "8,419"}
                  </span>
                  <span className="font-mono-meta text-[11px] text-secondary font-semibold">99.4%</span>
                </div>
                <span className="font-mono-code text-[11px] text-on-surface-variant mt-0.5">
                  DOI/ArXiv verified
                </span>
              </div>

              {/* Metric 3 */}
              <div className="flex flex-col">
                <span className="font-mono-meta text-mono-meta text-outline uppercase tracking-wider">
                  Verified Claims
                </span>
                <div className="flex items-baseline gap-2 mt-1">
                  <span className="font-headline-md text-headline-md font-normal text-on-surface">
                    {overview?.totalClaimsVerified
                      ? overview.totalClaimsVerified.toLocaleString()
                      : "3,280"}
                  </span>
                  <span className="font-mono-meta text-[11px] text-on-surface-variant font-medium">
                    94.8%
                  </span>
                </div>
                <span className="font-mono-code text-[11px] text-on-surface-variant mt-0.5">
                  Consensus locked
                </span>
              </div>

              {/* Metric 4 */}
              <div className="flex flex-col">
                <div className="flex items-center justify-between">
                  <span className="font-mono-meta text-mono-meta text-outline uppercase tracking-wider">
                    Synthesis Avg
                  </span>
                  <span className="text-secondary font-mono-meta text-[11px]">Rank 1</span>
                </div>
                <div className="flex items-baseline gap-2 mt-1">
                  <span className="font-headline-md text-headline-md font-normal text-on-surface">
                    9.8<span className="text-outline text-title-sm">/10</span>
                  </span>
                </div>
                <span className="font-mono-code text-[11px] text-on-surface-variant mt-0.5">
                  84 reports exported
                </span>
              </div>
            </div>

            {/* Telemetry Progress Strip */}
            <div className="pt-space-sm border-t border-outline-variant/30 flex items-center justify-between text-mono-meta font-mono-meta text-outline">
              <span>Credit Efficiency Rate</span>
              <span className="text-on-surface font-medium">0.42 credits / claim</span>
            </div>
          </div>
        </div>
      </section>

      {/* Main Multi-Column Split Workbench */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-space-lg items-start">
        {/* LEFT PANE: Active Telemetry + Historical Dossiers (62%) */}
        <div className="lg:col-span-7 xl:col-span-8 flex flex-col gap-space-lg">
          {/* A. Active Autonomous Execution Stage */}
          <div className="rounded-xl bg-primary-container text-on-primary p-space-lg shadow-md border border-white/10 relative overflow-hidden">
            <div className="absolute -right-12 -top-12 w-64 h-64 bg-secondary/10 rounded-full blur-3xl pointer-events-none" />

            {/* Panel Header */}
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 pb-space-sm mb-space-md">
              <div className="flex items-center gap-2">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-secondary-fixed opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-secondary" />
                </span>
                <span className="font-mono-meta text-mono-meta text-secondary-fixed uppercase tracking-widest font-semibold">
                  Active Agent Run
                </span>
                <span className="text-white/20">|</span>
                <span className="font-mono-meta text-mono-meta text-outline-variant font-medium">
                  {activeRun ? `ID #${activeRun.id.slice(0, 8)}` : "ID #RF-8924"}
                </span>
              </div>
              <div className="flex items-center gap-3 font-mono-meta text-mono-meta text-outline-variant">
                <span className="flex items-center gap-1">
                  <span className="material-symbols-outlined text-[14px] text-secondary">timer</span>
                  <span>Est. 2m 45s remaining</span>
                </span>
                <span className="px-1.5 py-0.5 rounded bg-white/10 text-white font-mono-code text-[10px]">
                  Tier L4 Deep
                </span>
              </div>
            </div>

            {/* Research Query Dossier Title */}
            <div className="mb-space-md">
              <h2 className="font-headline-md text-headline-md font-normal text-white leading-tight">
                {activeRun?.query ||
                  "The Future of AI in Healthcare: Autonomous Diagnostic Systems & FDA Regulatory Precedents (2024–2028)"}
              </h2>
              <div className="flex items-center gap-3 mt-2 font-mono-meta text-mono-meta text-outline-variant">
                <span>Domain: Bio-Informatics &amp; Medical Jurisprudence</span>
                <span>·</span>
                <span>Target Output: 14-page Executive Dossier</span>
              </div>
            </div>

            {/* Pipeline Workflow Stage Nodes */}
            <div className="bg-black/30 rounded-lg p-space-md border border-white/5 mb-space-md">
              <div className="flex items-center justify-between text-mono-meta font-mono-meta text-outline-variant mb-3">
                <span>EXECUTION PIPELINE</span>
                <span className="text-secondary-fixed">Phase 2 of 4 (58% Total Weight)</span>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 relative">
                {/* Node 1: Planning */}
                <div className="flex flex-col gap-1 p-2 rounded bg-white/5 border border-white/10">
                  <div className="flex items-center justify-between">
                    <span className="font-label-md text-label-md text-white">01. Planning</span>
                    <span className="material-symbols-outlined text-[16px] text-secondary">
                      check_circle
                    </span>
                  </div>
                  <span className="font-mono-code text-[11px] text-secondary">6 Hypotheses Locked</span>
                </div>

                {/* Node 2: Deep Research */}
                <div className="flex flex-col gap-1 p-2 rounded bg-secondary/10 border border-secondary/40 shadow-sm relative overflow-hidden">
                  <div className="flex items-center justify-between">
                    <span className="font-label-md text-label-md text-white font-bold">02. Deep Research</span>
                    <span className="material-symbols-outlined text-[16px] text-secondary-fixed animate-spin">
                      autorenew
                    </span>
                  </div>
                  <span className="font-mono-code text-[11px] text-secondary-fixed font-medium">
                    38 Papers Parsing
                  </span>
                  <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-white/10">
                    <div className="h-full bg-secondary animate-pulse" style={{ width: "72%" }} />
                  </div>
                </div>

                {/* Node 3: Triangulation */}
                <div className="flex flex-col gap-1 p-2 rounded bg-white/[0.02] border border-white/5 opacity-60">
                  <div className="flex items-center justify-between">
                    <span className="font-label-md text-label-md text-outline-variant">03. Triangulation</span>
                    <span className="material-symbols-outlined text-[16px] text-outline">pending</span>
                  </div>
                  <span className="font-mono-code text-[11px] text-outline">Queued (14 claims)</span>
                </div>

                {/* Node 4: Synthesis */}
                <div className="flex flex-col gap-1 p-2 rounded bg-white/[0.02] border border-white/5 opacity-60">
                  <div className="flex items-center justify-between">
                    <span className="font-label-md text-label-md text-outline-variant">04. Synthesis &amp; Pub</span>
                    <span className="material-symbols-outlined text-[16px] text-outline">
                      hourglass_empty
                    </span>
                  </div>
                  <span className="font-mono-code text-[11px] text-outline">Awaiting Phase 3</span>
                </div>
              </div>
            </div>

            {/* Agent Telemetry Sub-Dock */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-space-sm mb-space-md text-mono-code text-[12px] text-outline-variant">
              <div className="flex flex-col gap-1">
                <span className="font-mono-meta text-mono-meta uppercase tracking-wider text-outline">
                  Active Worker Sub-Agents (4 Online)
                </span>
                <div className="flex flex-wrap gap-1.5 pt-0.5">
                  <span className="px-2 py-0.5 rounded bg-white/10 text-white font-mono-meta text-[10px]">
                    Dr. Search (Exa)
                  </span>
                  <span className="px-2 py-0.5 rounded bg-white/10 text-white font-mono-meta text-[10px]">
                    Synthesizer-03
                  </span>
                  <span className="px-2 py-0.5 rounded bg-white/10 text-white font-mono-meta text-[10px]">
                    FactVerifier-α
                  </span>
                  <span className="px-2 py-0.5 rounded bg-white/10 text-white font-mono-meta text-[10px]">
                    BioMed-Crawler
                  </span>
                </div>
              </div>
              <div className="flex flex-col gap-1 md:items-end">
                <span className="font-mono-meta text-mono-meta uppercase tracking-wider text-outline">
                  Verification Pulse
                </span>
                <div className="flex items-center gap-3 text-white font-mono-meta text-[11px] pt-1">
                  <span>38 Sources Discovered</span>
                  <span className="text-white/20">·</span>
                  <span className="text-secondary-fixed">14 Contradictions Evaluated</span>
                </div>
              </div>
            </div>

            {/* Terminal Action Control Bar */}
            <div className="flex items-center justify-between pt-space-sm border-t border-white/10">
              <div className="flex items-center gap-2">
                <Link
                  href={activeRun ? `/research/${activeRun.id}` : "/research/run_demo_01"}
                  className="px-3 py-1.5 rounded bg-white/5 hover:bg-white/10 border border-white/20 hover:border-secondary transition-colors text-white font-label-md text-label-md flex items-center gap-1.5"
                >
                  <span className="material-symbols-outlined text-[16px]">terminal</span>
                  <span>Inspect Live Stream</span>
                </Link>
                <button
                  type="button"
                  className="px-3 py-1.5 rounded bg-white/5 hover:bg-white/10 border border-white/10 text-outline-variant hover:text-white transition-colors font-label-md text-label-md"
                >
                  Pause Run
                </button>
              </div>
              <Link
                href={activeRun ? `/research/${activeRun.id}` : "/research/run_demo_01"}
                className="px-4 py-1.5 rounded bg-secondary text-primary font-label-md text-label-md font-semibold hover:bg-secondary-container transition-colors flex items-center gap-1"
              >
                <span>Stage Inspector</span>
                <span className="material-symbols-outlined text-[16px]">arrow_outward</span>
              </Link>
            </div>
          </div>

          {/* B. Recent Research Runs */}
          <div className="bg-surface-container-lowest rounded-xl border border-outline-variant/60 shadow-sm overflow-hidden">
            <div className="p-space-md border-b border-outline-variant/40 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <h3 className="font-title-sm text-title-sm text-on-surface">Recent Research Runs</h3>
                <span className="px-2 py-0.5 rounded-full bg-surface-container text-on-surface-variant font-mono-meta text-mono-meta">
                  {runs.length > 0 ? `${runs.length} Syntheses` : "142 Completed"}
                </span>
              </div>
              <Link
                href="/history"
                className="font-label-md text-label-md text-secondary hover:underline flex items-center gap-0.5"
              >
                <span>View All Runs</span>
                <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
              </Link>
            </div>

            {/* Structured Item Rows */}
            <div className="divide-y divide-outline-variant/30">
              {(runs.length > 0
                ? runs.slice(0, 5)
                : [
                    {
                      id: "run-01",
                      query: "Climate Policy Trends 2025: Global Carbon Border Adjustments (CBAM)",
                      status: "COMPLETED",
                      sourcesCount: 42,
                      agent: "PolicyBot-Core",
                      confidence: 99.2,
                      timeAgo: "2h ago",
                    },
                    {
                      id: "run-02",
                      query: "Quantum Computing Advances in High-Pressure Superconductors",
                      status: "COMPLETED",
                      sourcesCount: 67,
                      agent: "ArxivDeep-Agent",
                      confidence: 84.0,
                      timeAgo: "Yesterday",
                    },
                    {
                      id: "run-03",
                      query: "Global EV Solid-State Battery Supply Chain Bottlenecks (2025–2030)",
                      status: "SYNTHESIZED",
                      sourcesCount: 53,
                      agent: "MarketAgent",
                      confidence: 96.5,
                      timeAgo: "2 days ago",
                    },
                    {
                      id: "run-04",
                      query: "Autonomous Multi-Agent Orchestration Frameworks: Comparative Benchmark",
                      status: "ARCHIVED",
                      sourcesCount: 31,
                      agent: "Benchmarker-01",
                      confidence: 97.1,
                      timeAgo: "4 days ago",
                    },
                  ]
              ).map((run) => (
                <div
                  key={run.id}
                  className="p-space-md hover:bg-surface-container-low transition-colors flex flex-col md:flex-row md:items-center justify-between gap-space-sm"
                >
                  <div className="flex items-start gap-3 min-w-0">
                    <div className="w-8 h-8 rounded bg-surface-container flex items-center justify-center shrink-0 mt-0.5">
                      <span className="material-symbols-outlined text-secondary text-[18px]">policy</span>
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Link
                          href={`/reports/${run.id}`}
                          className="font-body-md text-body-md font-medium text-on-surface hover:text-secondary truncate"
                        >
                          {run.query || run.title}
                        </Link>
                        <span className="px-2 py-0.5 rounded bg-secondary/10 text-secondary border border-secondary/20 font-mono-meta text-[10px] uppercase font-semibold">
                          {run.status}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 mt-1 font-mono-meta text-mono-meta text-outline">
                        <span>{run.sourcesCount || 38} sources synthesized</span>
                        <span>·</span>
                        <span>{run.timeAgo || "Recently"}</span>
                        <span>·</span>
                        <span>Confidence: {run.confidence || 98.4}%</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0 self-end md:self-center">
                    <Link
                      href={`/reports/${run.id}`}
                      className="p-1.5 rounded hover:bg-surface-container text-outline hover:text-on-surface transition-colors"
                      title="Download Report"
                    >
                      <span className="material-symbols-outlined text-[18px]">download</span>
                    </Link>
                    <Link
                      href="/knowledge-base"
                      className="p-1.5 rounded hover:bg-surface-container text-outline hover:text-on-surface transition-colors"
                      title="Export Citation Graph"
                    >
                      <span className="material-symbols-outlined text-[18px]">share</span>
                    </Link>
                    <Link
                      href={`/reports/${run.id}`}
                      className="px-2.5 py-1 rounded bg-surface-container border border-outline-variant/40 hover:bg-surface-container-high text-on-surface font-label-md text-label-md transition-colors"
                    >
                      Dossier
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* RIGHT PANE: Real-time Agent Log Stream & Knowledge Graph (38%) */}
        <div className="lg:col-span-5 xl:col-span-4 flex flex-col gap-space-lg">
          {/* C. Live Activity Stream */}
          <div className="bg-surface-container-lowest rounded-xl border border-outline-variant/60 shadow-sm p-space-md flex flex-col">
            <div className="flex items-center justify-between border-b border-outline-variant/40 pb-space-sm mb-space-md">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[18px] text-secondary">alt_route</span>
                <h3 className="font-title-sm text-title-sm text-on-surface">Agent Stream</h3>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-secondary animate-pulse" />
                <span className="font-mono-meta text-mono-meta text-outline uppercase tracking-wider">
                  WS Live
                </span>
              </div>
            </div>

            {/* Vertical Chronological Activity Feed */}
            <div className="relative pl-5 space-y-space-md before:absolute before:left-2 before:top-2 before:bottom-2 before:w-[1px] before:bg-outline-variant/60">
              {/* Event 1 */}
              <div className="relative group">
                <div className="absolute -left-[17px] top-1 w-2.5 h-2.5 rounded-full bg-secondary ring-4 ring-surface-container-lowest" />
                <div className="flex items-baseline justify-between mb-0.5">
                  <span className="font-mono-meta text-mono-meta text-secondary font-semibold">14:42:10</span>
                  <span className="font-mono-meta text-[10px] text-outline">FactVerifier-α</span>
                </div>
                <p className="font-body-sm text-body-sm text-on-surface leading-snug">
                  Flagged potential contradiction in{" "}
                  <span className="font-mono-code text-[11px] underline text-on-surface font-medium">
                    JAMA Oncology
                  </span>{" "}
                  paper (DOI: 10.1001/jama.2024.1102) regarding specificity claims.
                </p>
                <div className="mt-1 flex items-center gap-2">
                  <span className="px-1.5 py-0.5 rounded bg-secondary/15 text-secondary border border-secondary/30 font-mono-meta text-[9px] uppercase">
                    Contradiction Detected
                  </span>
                </div>
              </div>

              {/* Event 2 */}
              <div className="relative group">
                <div className="absolute -left-[17px] top-1 w-2.5 h-2.5 rounded-full bg-outline-variant ring-4 ring-surface-container-lowest" />
                <div className="flex items-baseline justify-between mb-0.5">
                  <span className="font-mono-meta text-mono-meta text-outline font-semibold">14:41:05</span>
                  <span className="font-mono-meta text-[10px] text-outline">Synthesizer-03</span>
                </div>
                <p className="font-body-sm text-body-sm text-on-surface-variant leading-snug">
                  Extracted 18 peer-reviewed clinical trial benchmarks from PubMed Central database. Normalized
                  efficacy metrics.
                </p>
              </div>

              {/* Event 3 */}
              <div className="relative group">
                <div className="absolute -left-[17px] top-1 w-2.5 h-2.5 rounded-full bg-outline-variant ring-4 ring-surface-container-lowest" />
                <div className="flex items-baseline justify-between mb-0.5">
                  <span className="font-mono-meta text-mono-meta text-outline font-semibold">14:39:48</span>
                  <span className="font-mono-meta text-[10px] text-outline">BioMed-Crawler</span>
                </div>
                <p className="font-body-sm text-body-sm text-on-surface-variant leading-snug">
                  Indexed 24 FDA 510(k) clearances database records for AI-enabled diagnostic radiology software.
                </p>
              </div>

              {/* Event 4 */}
              <div className="relative group">
                <div className="absolute -left-[17px] top-1 w-2.5 h-2.5 rounded-full bg-outline-variant ring-4 ring-surface-container-lowest" />
                <div className="flex items-baseline justify-between mb-0.5">
                  <span className="font-mono-meta text-mono-meta text-outline font-semibold">14:38:12</span>
                  <span className="font-mono-meta text-[10px] text-outline">Lead Orchestrator</span>
                </div>
                <p className="font-body-sm text-body-sm text-on-surface-variant leading-snug">
                  Hypothesis roadmap approved. Deployed 4 sub-agents with 15k token context limit per research leaf.
                </p>
              </div>
            </div>

            <div className="mt-space-md pt-space-sm border-t border-outline-variant/40 flex items-center justify-between">
              <Link
                href="/agent-activity"
                className="font-label-md text-label-md text-secondary hover:underline flex items-center gap-1"
              >
                <span className="material-symbols-outlined text-[14px]">history</span>
                <span>Complete Log Stream (218 events)</span>
              </Link>
              <button
                type="button"
                className="font-mono-meta text-mono-meta text-outline hover:text-on-surface"
              >
                Auto-scroll: ON
              </button>
            </div>
          </div>

          {/* D. Knowledge Graph Preview */}
          <div className="bg-surface-container-lowest rounded-xl border border-outline-variant/60 shadow-sm p-space-md flex flex-col gap-space-md">
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[16px] text-outline">schema</span>
                  <span className="font-mono-meta text-mono-meta text-outline uppercase tracking-wider">
                    Topological Consensus Graph
                  </span>
                </div>
                <span className="font-mono-meta text-mono-meta text-secondary font-medium">Cluster Alpha</span>
              </div>

              {/* SVG Visual Representation */}
              <Link
                href="/knowledge-base"
                className="w-full h-40 bg-surface-container-low rounded-lg border border-outline-variant/40 relative overflow-hidden flex items-center justify-center p-2 hover:border-secondary transition-colors group block"
              >
                <svg
                  className="w-full h-full text-outline/30 group-hover:text-secondary/40 transition-colors"
                  fill="none"
                  viewBox="0 0 340 140"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path d="M70 70 L140 35" stroke="currentColor" strokeDasharray="3 3" strokeWidth="1.5" />
                  <path d="M140 35 L220 50" stroke="currentColor" strokeWidth="1.5" />
                  <path d="M140 35 L160 105" stroke="currentColor" strokeWidth="1.5" />
                  <path d="M220 50 L270 95" stroke="currentColor" strokeDasharray="3 3" strokeWidth="1.5" />
                  <path d="M160 105 L270 95" stroke="currentColor" strokeWidth="1.5" />
                  <circle cx="70" cy="70" r="14" fill="#efeeea" stroke="#76777b" strokeWidth="1.5" />
                  <circle cx="140" cy="35" r="18" fill="#83f0fd" stroke="#006972" strokeWidth="2" />
                  <circle cx="220" cy="50" r="15" fill="#efeeea" stroke="#76777b" strokeWidth="1.5" />
                  <circle cx="160" cy="105" r="12" fill="#efeeea" stroke="#76777b" strokeWidth="1.5" />
                  <circle cx="270" cy="95" r="16" fill="#1a1c20" stroke="#000000" strokeWidth="1.5" />
                  <text x="140" y="39" textAnchor="middle" fill="#001f23" fontSize="9" fontWeight="600">
                    Qubit 4K
                  </text>
                  <text x="270" y="99" textAnchor="middle" fill="#ffffff" fontSize="9" fontWeight="500">
                    Majorana
                  </text>
                </svg>
                <div className="absolute bottom-2 right-2 px-2 py-0.5 rounded bg-surface-container-highest/80 text-[10px] font-mono-meta text-on-surface">
                  Click to Explore Graph
                </div>
              </Link>
            </div>

            {/* Quick stats */}
            <div className="flex items-center justify-between text-mono-meta font-mono-meta text-outline pt-2 border-t border-outline-variant/30">
              <span>Nodes: 342 · Edges: 891</span>
              <Link href="/knowledge-base" className="text-secondary hover:underline">
                Open 3D Explorer →
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
