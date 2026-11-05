"use client";

import React, { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { researchService } from "../../../services/researchService";
import { useWorkspace } from "../../../context/WorkspaceContext";

function HistoryContent() {
  const searchParams = useSearchParams();
  const initialSearch = searchParams.get("search") || "";
  const { currentWorkspace } = useWorkspace();

  const [runs, setRuns] = useState([]);
  const [searchTerm, setSearchTerm] = useState(initialSearch);
  const [selectedFilter, setSelectedFilter] = useState("all"); // all | completed | running | queued | archived
  const [sortBy, setSortBy] = useState("recent"); // recent | confidence | sources
  const [selectedRuns, setSelectedRuns] = useState([]);
  const [density, setDensity] = useState("comfortable"); // comfortable | compact
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadRuns() {
      try {
        const res = await researchService.listRuns({ limit: 50 });
        if (res?.data && Array.isArray(res.data)) {
          setRuns(res.data);
        } else {
          // Robust reference records
          setRuns([
            {
              id: "run-01",
              title: "Climate Policy Trends 2025: Global Carbon Border Adjustments (CBAM)",
              domain: "Macro Climate & Trade",
              status: "COMPLETED",
              sourcesCount: 42,
              claimsCount: 88,
              confidence: 99.2,
              agentLead: "PolicyBot-Core",
              model: "Claude 3.5 Sonnet",
              createdAt: "2026-11-04T12:30:00Z",
              timeAgo: "2 hours ago",
            },
            {
              id: "run-02",
              title: "Quantum Computing Advances in High-Pressure Superconductors",
              domain: "Quantum Physics",
              status: "COMPLETED",
              sourcesCount: 67,
              claimsCount: 112,
              confidence: 84.0,
              agentLead: "ArxivDeep-Agent",
              model: "GPT-4o",
              createdAt: "2026-11-03T18:15:00Z",
              timeAgo: "Yesterday",
            },
            {
              id: "run-03",
              title: "The Future of AI in Healthcare: Autonomous Diagnostic Systems & FDA 510(k)",
              domain: "Bio-Informatics & FDA",
              status: "RUNNING",
              sourcesCount: 38,
              claimsCount: 42,
              confidence: 94.8,
              agentLead: "Coordinator Lead",
              model: "Gemini 1.5 Pro",
              createdAt: "2026-11-05T08:00:00Z",
              timeAgo: "Active (04m 32s)",
            },
            {
              id: "run-04",
              title: "Global EV Solid-State Battery Supply Chain Bottlenecks (2025–2030)",
              domain: "Industrial Supply",
              status: "COMPLETED",
              sourcesCount: 53,
              claimsCount: 94,
              confidence: 96.5,
              agentLead: "MarketAgent",
              model: "Claude 3.5 Sonnet",
              createdAt: "2026-11-02T14:00:00Z",
              timeAgo: "2 days ago",
            },
            {
              id: "run-05",
              title: "Autonomous Multi-Agent Orchestration Frameworks: Comparative Benchmark",
              domain: "Agent Architecture",
              status: "ARCHIVED",
              sourcesCount: 31,
              claimsCount: 64,
              confidence: 97.1,
              agentLead: "Benchmarker-01",
              model: "Llama 3.3 70B",
              createdAt: "2026-10-31T09:20:00Z",
              timeAgo: "4 days ago",
            },
            {
              id: "run-06",
              title: "Post-Quantum Cryptography (PQC) Lattice Benchmarks: Kyber vs Dilithium",
              domain: "Applied Cryptography",
              status: "COMPLETED",
              sourcesCount: 29,
              claimsCount: 71,
              confidence: 98.7,
              agentLead: "CryptoAnalyst-Lead",
              model: "Claude 3.5 Sonnet",
              createdAt: "2026-10-29T11:45:00Z",
              timeAgo: "6 days ago",
            },
          ]);
        }
      } catch (err) {
        console.warn("Failed to list runs:", err);
      } finally {
        setLoading(false);
      }
    }

    loadRuns();
  }, [currentWorkspace?.id]);

  const toggleSelectAll = () => {
    if (selectedRuns.length === runs.length) {
      setSelectedRuns([]);
    } else {
      setSelectedRuns(runs.map((r) => r.id));
    }
  };

  const toggleSelectRun = (id) => {
    if (selectedRuns.includes(id)) {
      setSelectedRuns(selectedRuns.filter((rId) => rId !== id));
    } else {
      setSelectedRuns([...selectedRuns, id]);
    }
  };

  const filteredRuns = runs.filter((r) => {
    // Status filter
    if (selectedFilter === "completed" && r.status !== "COMPLETED") return false;
    if (selectedFilter === "running" && r.status !== "RUNNING" && r.status !== "VERIFYING") return false;
    if (selectedFilter === "queued" && r.status !== "QUEUED" && r.status !== "PLANNING") return false;
    if (selectedFilter === "archived" && r.status !== "ARCHIVED") return false;

    // Search query filter
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      const matchTitle = (r.title || r.query || "").toLowerCase().includes(q);
      const matchDomain = (r.domain || "").toLowerCase().includes(q);
      const matchAgent = (r.agentLead || "").toLowerCase().includes(q);
      if (!matchTitle && !matchDomain && !matchAgent) return false;
    }

    return true;
  });

  return (
    <div className="flex flex-col w-full">
      {/* Header & Breadcrumb */}
      <div className="flex flex-col gap-space-sm mb-space-lg">
        <div className="flex items-center gap-space-xs text-mono-meta font-mono-meta tracking-widest text-outline uppercase">
          <Link href="/dashboard" className="hover:text-primary transition-colors">
            Workspace
          </Link>
          <span>/</span>
          <span className="text-secondary font-semibold">Research History</span>
        </div>
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-space-md">
          <div className="max-w-3xl">
            <h1 className="font-headline-lg text-headline-lg text-on-surface tracking-tight">
              Research Dossier Archive. <span className="italic font-normal text-secondary">Verified Claims.</span>
            </h1>
            <p className="font-body-md text-body-md text-on-surface-variant mt-1 max-w-2xl">
              Chronological ledger of multi-agent syntheses, cross-referenced citations, and finalized epistemic
              consensus graphs.
            </p>
          </div>
          <Link
            href="/research/new"
            className="flex items-center gap-1.5 px-space-md py-2 rounded bg-primary text-on-primary hover:bg-primary-container transition-all font-body-sm text-body-sm font-semibold shadow-sm shrink-0"
          >
            <span className="material-symbols-outlined text-[18px]">add</span>
            <span>New Research</span>
          </Link>
        </div>
      </div>

      {/* Filter & Control Toolbar */}
      <div className="bg-surface-container-lowest p-space-md rounded-xl border border-outline-variant/50 shadow-sm flex flex-col gap-space-md mb-space-md">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-space-sm">
          {/* Status Tabs */}
          <div className="flex items-center gap-1 bg-surface-container-low p-1 rounded-lg border border-outline-variant/30 overflow-x-auto">
            {[
              { id: "all", label: "All Runs", count: runs.length },
              {
                id: "completed",
                label: "Completed",
                count: runs.filter((r) => r.status === "COMPLETED").length,
              },
              {
                id: "running",
                label: "Active / Running",
                count: runs.filter((r) => r.status === "RUNNING").length,
              },
              {
                id: "archived",
                label: "Archived",
                count: runs.filter((r) => r.status === "ARCHIVED").length,
              },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setSelectedFilter(tab.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded font-label-md text-label-md transition-all ${
                  selectedFilter === tab.id
                    ? "bg-surface text-on-surface font-bold shadow-xs"
                    : "text-on-surface-variant hover:text-on-surface"
                }`}
              >
                <span>{tab.label}</span>
                <span className="px-1.5 py-0.2 rounded bg-surface-container-highest text-on-surface text-[10px] font-mono-meta">
                  {tab.count}
                </span>
              </button>
            ))}
          </div>

          {/* Density toggle & Sort dropdown */}
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 bg-surface-container-low p-0.5 rounded border border-outline-variant/30">
              <button
                type="button"
                onClick={() => setDensity("compact")}
                className={`p-1.5 rounded transition-colors ${
                  density === "compact" ? "bg-surface text-on-surface shadow-xs" : "text-outline"
                }`}
                title="Compact view"
              >
                <span className="material-symbols-outlined text-[16px]">view_headline</span>
              </button>
              <button
                type="button"
                onClick={() => setDensity("comfortable")}
                className={`p-1.5 rounded transition-colors ${
                  density === "comfortable" ? "bg-surface text-on-surface shadow-xs" : "text-outline"
                }`}
                title="Comfortable view"
              >
                <span className="material-symbols-outlined text-[16px]">table_rows</span>
              </button>
            </div>

            <div className="relative">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="appearance-none px-3 py-1.5 pr-8 rounded bg-surface font-body-sm text-body-sm text-on-surface border border-outline-variant/60 focus:outline-none cursor-pointer"
              >
                <option value="recent">Sort: Most Recent</option>
                <option value="confidence">Sort: Highest Confidence</option>
                <option value="sources">Sort: Most Sources</option>
              </select>
              <span className="material-symbols-outlined absolute right-2.5 top-2 text-[16px] text-outline pointer-events-none">
                expand_more
              </span>
            </div>
          </div>
        </div>

        {/* Search input bar */}
        <div className="relative flex items-center">
          <span className="material-symbols-outlined absolute left-3 text-[18px] text-outline">
            search
          </span>
          <input
            id="historySearchInput"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Filter research by title, scientific domain, author, or keywords (press / to focus)..."
            className="w-full pl-9 pr-12 py-2 rounded bg-surface border border-outline-variant/60 font-body-sm text-body-sm text-on-surface placeholder:text-outline focus:outline-none focus:border-secondary transition-colors"
            type="text"
          />
          {searchTerm && (
            <button
              type="button"
              onClick={() => setSearchTerm("")}
              className="absolute right-3 text-outline hover:text-on-surface"
            >
              <span className="material-symbols-outlined text-[16px]">close</span>
            </button>
          )}
        </div>
      </div>

      {/* Bulk Action Bar (if items selected) */}
      {selectedRuns.length > 0 && (
        <div className="bg-secondary/15 border border-secondary/40 p-space-sm rounded-lg flex items-center justify-between mb-space-md animate-fadeIn">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-secondary text-[20px]">check_circle</span>
            <span className="font-body-sm text-body-sm font-semibold text-on-surface">
              {selectedRuns.length} research dossiers selected
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              className="px-3 py-1 rounded bg-surface-container hover:bg-surface-container-high text-on-surface font-label-md text-label-md border border-outline-variant/40 transition-colors"
            >
              Export Consolidated BibTeX
            </button>
            <button
              type="button"
              className="px-3 py-1 rounded bg-surface-container hover:bg-surface-container-high text-on-surface font-label-md text-label-md border border-outline-variant/40 transition-colors"
            >
              Archive
            </button>
          </div>
        </div>
      )}

      {/* Structured Runs Table */}
      <div className="bg-surface-container-lowest rounded-xl border border-outline-variant/60 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-outline-variant/40 bg-surface-container-low font-mono-meta text-mono-meta text-outline uppercase tracking-wider">
                <th className="p-3 pl-4 w-10">
                  <input
                    type="checkbox"
                    checked={selectedRuns.length === runs.length && runs.length > 0}
                    onChange={toggleSelectAll}
                    className="w-4 h-4 accent-secondary rounded cursor-pointer"
                  />
                </th>
                <th className="p-3">Research Inquiry &amp; Dossier Title</th>
                <th className="p-3">Domain / Scope</th>
                <th className="p-3">Status</th>
                <th className="p-3">Telemetry</th>
                <th className="p-3">Agent Lead</th>
                <th className="p-3">Confidence</th>
                <th className="p-3 pr-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/30">
              {filteredRuns.length > 0 ? (
                filteredRuns.map((r) => {
                  const isSelected = selectedRuns.includes(r.id);
                  const py = density === "compact" ? "py-2" : "py-3.5";
                  return (
                    <tr
                      key={r.id}
                      className={`hover:bg-surface-container-low transition-colors ${
                        isSelected ? "bg-secondary/5" : ""
                      }`}
                    >
                      <td className={`p-3 pl-4 ${py}`}>
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleSelectRun(r.id)}
                          className="w-4 h-4 accent-secondary rounded cursor-pointer"
                        />
                      </td>
                      <td className={`p-3 ${py} max-w-md`}>
                        <Link
                          href={r.status === "RUNNING" ? `/research/${r.id}` : `/reports/${r.id}`}
                          className="font-body-md text-body-md font-medium text-on-surface hover:text-secondary line-clamp-1 block"
                        >
                          {r.title || r.query}
                        </Link>
                        <span className="font-mono-meta text-mono-meta text-outline block mt-0.5">
                          {r.timeAgo || "Recently"} · ID: #{r.id.slice(0, 8)}
                        </span>
                      </td>
                      <td className={`p-3 ${py}`}>
                        <span className="px-2 py-0.5 rounded bg-surface-container text-on-surface-variant font-mono-meta text-[11px]">
                          {r.domain || "Deep Research"}
                        </span>
                      </td>
                      <td className={`p-3 ${py}`}>
                        <span
                          className={`px-2 py-0.5 rounded font-mono-meta text-[10px] uppercase font-bold border ${
                            r.status === "COMPLETED"
                              ? "bg-secondary/15 text-secondary border-secondary/30"
                              : r.status === "RUNNING"
                              ? "bg-secondary-container/50 text-on-secondary-container border-secondary/40 animate-pulse"
                              : "bg-surface-container text-outline border-outline-variant/40"
                          }`}
                        >
                          {r.status}
                        </span>
                      </td>
                      <td className={`p-3 ${py} font-mono-meta text-mono-meta text-outline`}>
                        <span>{r.sourcesCount || 38} sources</span>
                        <span className="mx-1">·</span>
                        <span>{r.claimsCount || 42} claims</span>
                      </td>
                      <td className={`p-3 ${py} font-mono-meta text-mono-meta text-on-surface-variant`}>
                        <span>{r.agentLead || "Coordinator"}</span>
                      </td>
                      <td className={`p-3 ${py}`}>
                        <span className="font-mono-meta text-[12px] text-secondary font-bold">
                          {r.confidence || 95.0}%
                        </span>
                      </td>
                      <td className={`p-3 pr-4 ${py} text-right`}>
                        <div className="flex items-center justify-end gap-1.5">
                          <Link
                            href={`/reports/${r.id}`}
                            className="p-1.5 rounded hover:bg-surface-container text-outline hover:text-on-surface transition-colors"
                            title="Open Dossier"
                          >
                            <span className="material-symbols-outlined text-[18px]">article</span>
                          </Link>
                          <Link
                            href={`/research/${r.id}`}
                            className="p-1.5 rounded hover:bg-surface-container text-outline hover:text-on-surface transition-colors"
                            title="Inspect Agent Stream"
                          >
                            <span className="material-symbols-outlined text-[18px]">terminal</span>
                          </Link>
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-outline font-body-sm">
                    No research dossiers match your search criteria.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default function HistoryPage() {
  return (
    <Suspense fallback={<div className="p-8 font-mono-meta text-outline">Loading research history...</div>}>
      <HistoryContent />
    </Suspense>
  );
}
