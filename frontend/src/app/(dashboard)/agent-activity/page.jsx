"use client";

import React, { useState, useEffect } from "react";
import { analyticsService } from "../../../services/analyticsService";

export default function AgentActivityPage() {
  const [selectedAgentId, setSelectedAgentId] = useState("AGT-904");
  const [viewMode, setViewMode] = useState("traces"); // traces | swarm
  const [searchFilter, setSearchFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [isDeployModalOpen, setIsDeployModalOpen] = useState(false);
  const [activeWorkersPaused, setActiveWorkersPaused] = useState(false);
  const [exportNotice, setExportNotice] = useState(false);
  const [terminalLogs, setTerminalLogs] = useState([
    { time: "14:42:01.042", tag: "INIT", text: "Worker spawned on node-omega-04", color: "text-secondary font-semibold" },
    { time: "14:42:04.118", tag: "RPC", text: "Tavily query executed · 8 gov domains", color: "text-secondary font-semibold" },
    { time: "14:42:06.820", tag: "VEC", text: "Cosine match 0.942 on FDA CDRH Guidance", color: "text-secondary font-semibold" },
    { time: "14:42:09.104", tag: "AUDIT", text: "Variance isolated: RF coil calibration", color: "text-secondary-fixed font-semibold" },
    { time: "14:42:11.450", tag: "OK", text: "Axiom 01 locked in PRJ-BIO-4491 memory", color: "text-secondary font-semibold" },
  ]);

  // Comprehensive mock / fallback agent fleet
  const [agents, setAgents] = useState([
    {
      id: "AGT-904",
      name: "FactVerifier-01",
      role: "Epistemic Verifier",
      status: "RUNNING",
      progress: 78,
      statusBadge: "RUNNING · 78%",
      statusColor: "bg-secondary text-on-secondary",
      task: "Triangulating Predicate K231459 non-inferiority claims across Mayo & Karolinska DICOM cohorts",
      runId: "#RF-8924",
      runTitle: "AI in Healthcare",
      model: "claude-3-5-sonnet (t:0.1)",
      lastAction: "Invoked tavily_search (4s ago)",
      duration: "04m 12s",
      mandate: "Autonomously verify factual claims extracted by BioMed-Crawler against primary FDA 510(k) registry filings and published peer-reviewed journals. Flag divergences exceeding ±1.5%.",
      sandbox: "Tier-2 Read-Only Network · Zero Local Egress",
      activeInput: "FDA-K231459-Summary.pdf",
      inputSubtext: "14 SaMD PCCP claims under review",
      outputStatus: "12 Verified (99.8%)",
      outputSubtext: "1 divergence flagged",
      toolCalls: [
        { name: 'tavily_search({"query": "FDA 510(k)..."})', latency: "118ms", note: "Status: 200 OK · 8 matches found" },
        { name: 'mcp::qdrant_vector_match("/bio-fda-core")', latency: "14ms", note: "Cosine match: 0.942 · Guidance 2022-D" },
        { name: 'merkle_sign_claim({"id": "CLM-4481"})', latency: "0x8a94b2...", note: "Hash confirmed & stored to local chain" }
      ]
    },
    {
      id: "AGT-312",
      name: "BioMed-Crawler",
      role: "Multi-Modal Ingestion",
      status: "RUNNING",
      progress: 42,
      statusBadge: "STREAMING · 42%",
      statusColor: "bg-secondary-container/40 text-on-secondary-container",
      task: "Parsing clinical trial endpoint tables in NCT05912948 PDF annex",
      runId: "#RF-8924",
      runTitle: "AI in Healthcare",
      model: "gpt-4o (structured outputs)",
      lastAction: "Token chunk 12,400 (18s ago)",
      duration: "02m 45s",
      mandate: "High-density multi-column PDF table extraction, figure OCR, and statistical cohort segmentation into structured JSON trees.",
      sandbox: "Tier-2 Strict Docker Container",
      activeInput: "NCT05912948_Protocol_Annex_C.pdf",
      inputSubtext: "38 pages, 14 tabular matrix blocks",
      outputStatus: "8 Tables Extracted",
      outputSubtext: "2 OCR corrections applied",
      toolCalls: [
        { name: 'firecrawl_clean_pdf({"pdf_url": "..."})', latency: "410ms", note: "Clean markdown AST produced" },
        { name: 'mcp::table_to_parquet()', latency: "32ms", note: "Cohort matrix serialized" }
      ]
    },
    {
      id: "AGT-108",
      name: "Synthesizer-03",
      role: "Lead Epistemic Synthesizer",
      status: "RUNNING",
      progress: 64,
      statusBadge: "SYNTHESIZING · 64%",
      statusColor: "bg-tertiary-fixed text-on-tertiary-fixed",
      task: "Drafting Section 4: Cross-Vendor Coil Sensitivity & Invariant Axiom 01",
      runId: "#RF-8924",
      runTitle: "AI in Healthcare",
      model: "claude-3-5-sonnet",
      lastAction: "Merkle tree update (32s ago)",
      duration: "08m 10s",
      mandate: "Orchestrates multi-source synthesis, resolves cross-evidence tensions, and drafts peer-reviewed standard dossiers.",
      sandbox: "Tier-1 Strict Epistemic Memory Enclave",
      activeInput: "Triangulated Claims Cache #CLM-4400-4481",
      inputSubtext: "14 verified claims ready for prose composition",
      outputStatus: "Section 4 Draft (1,480 words)",
      outputSubtext: "9 inline citations linked",
      toolCalls: [
        { name: 'dossier_section_commit({"sec": 4})', latency: "88ms", note: "Section draft signed & cached" },
        { name: 'citation_grounding_audit()', latency: "210ms", note: "100% provenance validation passed" }
      ]
    },
    {
      id: "AGT-441",
      name: "ArxivDeep-Agent",
      role: "Physics Specialist",
      status: "COMPLETED",
      progress: 100,
      statusBadge: "COMPLETED",
      statusColor: "bg-surface-container text-on-surface",
      task: "Extracted 42 claims on LK-99 ambient superconductor replication preprints",
      runId: "#RF-8840",
      runTitle: "Emerging Quantum",
      model: "o1-preview (tokens: 8,400)",
      lastAction: "Completed 12m ago",
      duration: "14m 20s",
      mandate: "Deep theoretical and experimental preprint analysis across condensed matter physics and material sciences.",
      sandbox: "Tier-2 Read-Only",
      activeInput: "arXiv:2307.12008 & 14 replication preprints",
      inputSubtext: "Full preprint corpus ingested",
      outputStatus: "42 Claims Structured",
      outputSubtext: "Consensus level: Low/Contradictory",
      toolCalls: [
        { name: 'exa_semantic_search({"query": "LK-99 replication"})', latency: "142ms", note: "18 preprints clustered" }
      ]
    },
    {
      id: "AGT-619",
      name: "LexIndica-AST",
      role: "Legal Precedents Parser",
      status: "COMPLETED",
      progress: 100,
      statusBadge: "COMPLETED",
      statusColor: "bg-surface-container text-on-surface",
      task: "Parsed 9-judge bench ruling in K.S. Puttaswamy (Privacy) paragraphs 120-240",
      runId: "#RF-8702",
      runTitle: "Indian Constitutional Law",
      model: "claude-3-5-sonnet",
      lastAction: "Completed 28m ago",
      duration: "06m 08s",
      mandate: "Judicial ratio decidendi extraction, obiter dicta classification, and legal citation graph construction.",
      sandbox: "Tier-1 Read-Only Legal Enclave",
      activeInput: "Puttaswamy_v_Union_of_India_2017.pdf",
      inputSubtext: "Judgement text (paras 120-240)",
      outputStatus: "Ratio Decidendi Extracted",
      outputSubtext: "Proportionality test mapped",
      toolCalls: [
        { name: 'legal_cite_graph_builder()', latency: "180ms", note: "12 precedent citations logged" }
      ]
    },
    {
      id: "AGT-882",
      name: "Firecrawl-Daemon",
      role: "Scraper Sandbox",
      status: "DEGRADED",
      progress: 25,
      statusBadge: "RETRY 2/3 · BACKOFF 15s",
      statusColor: "bg-error-container text-on-error-container",
      task: "Recursive crawl on DG CLIMA official portal hit rate ceiling",
      runId: "#RF-8910",
      runTitle: "Climate Policy CBAM",
      model: "firecrawl-v1 / sonnet",
      lastAction: "429 RateLimit handled (1m ago)",
      duration: "01m 18s",
      mandate: "High-volume governmental portal spidering with autonomous backoff and CAPTCHA avoidance.",
      sandbox: "Tier-2 Strict Docker Sandbox",
      activeInput: "ec.europa.eu/clima/policies/cbam_en",
      inputSubtext: "Target URL tree depth 3",
      outputStatus: "14 Pages Cached",
      outputSubtext: "Exponential backoff active",
      toolCalls: [
        { name: 'firecrawl_crawl_site({"url": "..."})', latency: "1,240ms", note: "HTTP 429 received, backing off" }
      ]
    }
  ]);

  useEffect(() => {
    async function loadTelemetry() {
      try {
        const liveAgents = await analyticsService.getAgents();
        if (liveAgents && Array.isArray(liveAgents) && liveAgents.length > 0) {
          // Merge with detailed attributes
          const merged = liveAgents.map((ag, i) => {
            const fallback = agents[i] || agents[0];
            return {
              ...fallback,
              ...ag,
              id: ag.id || fallback.id,
              name: ag.name || fallback.name,
              status: ag.status || fallback.status,
            };
          });
          setAgents(merged);
        }
      } catch (err) {
        console.warn("Analytics service unavailable, using full telemetry roster", err);
      }
    }
    loadTelemetry();
  }, []);

  // Filtered agent list
  const filteredAgents = agents.filter((ag) => {
    const matchesSearch =
      ag.name.toLowerCase().includes(searchFilter.toLowerCase()) ||
      ag.task.toLowerCase().includes(searchFilter.toLowerCase()) ||
      ag.id.toLowerCase().includes(searchFilter.toLowerCase());
    const matchesStatus =
      statusFilter === "all" ||
      (statusFilter === "running" && ag.status === "RUNNING") ||
      (statusFilter === "completed" && ag.status === "COMPLETED") ||
      (statusFilter === "degraded" && ag.status === "DEGRADED");
    const matchesType =
      typeFilter === "all" || ag.role.toLowerCase().includes(typeFilter.toLowerCase());
    return matchesSearch && matchesStatus && matchesType;
  });

  const activeAgent =
    agents.find((a) => a.id === selectedAgentId) || agents[0];

  const handlePauseWorkers = () => {
    setActiveWorkersPaused(!activeWorkersPaused);
  };

  const handleExportLogs = () => {
    const jsonStr = JSON.stringify(agents, null, 2);
    const blob = new Blob([jsonStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `agent-telemetry-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    setExportNotice(true);
    setTimeout(() => setExportNotice(false), 3000);
  };

  return (
    <div className="flex flex-col w-full">
      {/* Breadcrumbs & Context Bar */}
      <div className="w-full flex flex-col xl:flex-row xl:items-center justify-between pb-space-md gap-space-sm">
        <div className="flex flex-wrap items-center gap-space-sm min-w-0">
          <div className="flex items-center gap-1.5 font-mono-meta text-mono-meta text-outline">
            <span>WORKSPACE</span>
            <span>/</span>
            <span>INTELLIGENCE</span>
            <span>/</span>
            <span className="text-on-surface font-semibold">AGENT OPERATIONS & TELEMETRY</span>
          </div>
          <div className="hidden md:flex items-center gap-2 pl-space-xs">
            <span className="px-2 py-0.5 rounded bg-surface-container text-on-surface-variant font-mono-meta text-[11px] tracking-tight">
              SWARM: <span className="font-semibold text-on-surface">OMEGA-04</span> (11 NODES)
            </span>
            <span className="px-2 py-0.5 rounded bg-surface-container text-on-surface-variant font-mono-meta text-[11px] tracking-tight">
              LATENCY: <span className="font-semibold text-secondary">24ms</span>
            </span>
            <span className="px-2 py-0.5 rounded bg-secondary-container/20 text-on-secondary-container font-mono-meta text-[11px] font-medium tracking-tight">
              SANDBOX: TIER-2 STRICT
            </span>
          </div>
        </div>
        <div className="flex items-center gap-space-sm self-start xl:self-auto">
          <button
            onClick={handlePauseWorkers}
            className={`px-space-md py-1.5 rounded font-body-sm text-body-sm font-medium transition-colors shadow-sm flex items-center gap-1.5 ${
              activeWorkersPaused
                ? "bg-secondary text-on-secondary"
                : "bg-surface-container-lowest text-on-surface hover:bg-surface-container"
            }`}
          >
            <span className="material-symbols-outlined text-[16px] text-outline">
              {activeWorkersPaused ? "play_circle" : "pause_circle"}
            </span>
            <span>{activeWorkersPaused ? "Resume Workers" : "Pause All Workers"}</span>
          </button>
          <button
            onClick={() => setIsDeployModalOpen(true)}
            className="px-space-md py-1.5 rounded bg-primary text-on-primary hover:bg-primary-container text-body-sm font-body-sm font-medium transition-all shadow-sm flex items-center gap-1.5"
          >
            <span className="material-symbols-outlined text-[16px]">add</span>
            <span>Deploy Agent Daemon</span>
          </button>
        </div>
      </div>

      {/* Editorial Page Header */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between pt-space-xs pb-space-lg gap-space-md">
        <div className="max-w-3xl">
          <h1 className="font-headline-lg text-headline-lg text-on-surface tracking-tight">
            Agent Activity
          </h1>
          <p className="font-body-md text-body-md text-on-surface-variant pt-1 max-w-2xl">
            Real-time supervisory telemetry, state inspection, and execution traces across distributed autonomous research swarms and verification workers.
          </p>
        </div>
        <div className="flex items-center gap-space-sm flex-shrink-0">
          <button
            onClick={handleExportLogs}
            className="px-space-sm py-1.5 rounded bg-surface-container text-on-surface-variant hover:text-on-surface text-body-sm font-body-sm transition-colors flex items-center gap-1.5"
          >
            <span className="material-symbols-outlined text-[16px]">terminal</span>
            <span className="font-mono-meta text-[12px]">
              {exportNotice ? "Manifest Exported!" : "Export Telemetry Log"}
            </span>
          </button>
          <button
            onClick={() => {
              setAgents(agents.map(a => a.status === "DEGRADED" ? { ...a, status: "RUNNING", statusBadge: "RETRYING · 10%", statusColor: "bg-secondary text-on-secondary" } : a));
            }}
            className="px-space-sm py-1.5 rounded bg-surface-container text-on-surface-variant hover:text-on-surface text-body-sm font-body-sm transition-colors flex items-center gap-1.5"
          >
            <span className="material-symbols-outlined text-[16px]">restart_alt</span>
            <span className="font-mono-meta text-[12px]">Flush Staged Retries</span>
          </button>
        </div>
      </div>

      {/* Executive Metrics Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-space-sm pb-space-lg">
        {/* Card 1 */}
        <div className="bg-surface-container-lowest rounded p-space-md flex flex-col justify-between shadow-sm">
          <div className="flex items-center justify-between text-mono-meta font-mono-meta text-outline pb-space-xs">
            <span>TOTAL AGENT RUNS</span>
            <span className="text-on-surface-variant font-medium">100% AUDIT</span>
          </div>
          <div className="flex items-baseline gap-space-sm pt-1">
            <span className="font-headline-md text-headline-md font-semibold text-on-surface tabular-nums">
              18,420
            </span>
            <span className="font-mono-meta text-[11px] text-secondary font-medium">
              +1,240 past 24h
            </span>
          </div>
          <div className="pt-space-xs text-body-sm font-body-sm text-outline flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-secondary"></span>
            <span>Cryptographically verified logs</span>
          </div>
        </div>

        {/* Card 2 */}
        <div className="bg-surface-container-lowest rounded p-space-md flex flex-col justify-between shadow-sm">
          <div className="flex items-center justify-between text-mono-meta font-mono-meta text-outline pb-space-xs">
            <span>ACTIVE SWARM AGENTS</span>
            <span className="flex items-center gap-1 text-secondary font-semibold">
              <span className="w-2 h-2 rounded-full bg-secondary animate-pulse"></span>
              ONLINE
            </span>
          </div>
          <div className="flex items-baseline gap-space-sm pt-1">
            <span className="font-headline-md text-headline-md font-semibold text-on-surface tabular-nums">
              3
            </span>
            <span className="font-mono-meta text-[11px] text-outline">
              / 11 max node capacity
            </span>
          </div>
          <div className="pt-space-xs font-mono-meta text-[11px] text-on-surface-variant truncate">
            Dr. Search, FactVerifier-01, Synthesizer-03
          </div>
        </div>

        {/* Card 3 */}
        <div className="bg-surface-container-lowest rounded p-space-md flex flex-col justify-between shadow-sm">
          <div className="flex items-center justify-between text-mono-meta font-mono-meta text-outline pb-space-xs">
            <span>COMPLETED TASKS</span>
            <span className="text-secondary font-medium">99.31% RATIO</span>
          </div>
          <div className="flex items-baseline gap-space-sm pt-1">
            <span className="font-headline-md text-headline-md font-semibold text-on-surface tabular-nums">
              18,294
            </span>
            <span className="font-mono-meta text-[11px] text-on-surface-variant">
              Avg runtime 4.2m
            </span>
          </div>
          <div className="pt-space-xs text-body-sm font-body-sm text-outline flex items-center gap-1">
            <span className="material-symbols-outlined text-[14px] text-secondary">check_circle</span>
            <span>Zero consensus divergence</span>
          </div>
        </div>

        {/* Card 4 */}
        <div className="bg-surface-container-lowest rounded p-space-md flex flex-col justify-between shadow-sm">
          <div className="flex items-center justify-between text-mono-meta font-mono-meta text-outline pb-space-xs">
            <span>FAILED / DEGRADED</span>
            <span className="text-outline font-medium">0.69% ERROR</span>
          </div>
          <div className="flex items-baseline gap-space-sm pt-1">
            <span className="font-headline-md text-headline-md font-semibold text-on-surface tabular-nums">
              126
            </span>
            <span className="font-mono-meta text-[11px] text-outline-variant">
              12 Auto-Recovered
            </span>
          </div>
          <div className="pt-space-xs font-mono-meta text-[11px] text-on-surface-variant flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-secondary"></span>
            <span>0 unhandled exceptions staged</span>
          </div>
        </div>
      </div>

      {/* Dense Filter & Control Toolbar */}
      <div className="bg-surface-container-lowest rounded p-space-sm shadow-sm mb-space-md flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-space-sm">
        <div className="flex items-center flex-1 max-w-md bg-surface-container-low rounded px-3 py-1.5">
          <span className="material-symbols-outlined text-[18px] text-outline mr-2">search</span>
          <input
            className="bg-transparent border-0 outline-none text-body-sm font-body-sm text-on-surface placeholder:text-outline w-full"
            placeholder="Filter agent traces, run IDs, or tool calls... [/]"
            type="text"
            value={searchFilter}
            onChange={(e) => setSearchFilter(e.target.value)}
          />
          <kbd className="font-mono-meta text-[10px] text-outline bg-surface-container px-1 rounded">
            ⌘F
          </kbd>
        </div>
        <div className="flex flex-wrap items-center gap-space-xs">
          <div className="relative">
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="appearance-none px-space-sm py-1.5 pr-7 rounded bg-surface-container-low hover:bg-surface-container text-body-sm font-body-sm text-on-surface cursor-pointer border-0 outline-none"
            >
              <option value="all">TYPE: All Agents (8)</option>
              <option value="verifier">Epistemic Verifiers</option>
              <option value="crawler">Multi-Modal Ingestion</option>
              <option value="synthesizer">Synthesizers</option>
              <option value="specialist">Specialists</option>
            </select>
            <span className="material-symbols-outlined absolute right-1.5 top-1/2 -translate-y-1/2 text-[16px] text-outline pointer-events-none">
              expand_more
            </span>
          </div>

          <div className="relative">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="appearance-none px-space-sm py-1.5 pr-7 rounded bg-surface-container-low hover:bg-surface-container text-body-sm font-body-sm text-on-surface cursor-pointer border-0 outline-none"
            >
              <option value="all">STATUS: All States</option>
              <option value="running">Running / Streaming</option>
              <option value="completed">Completed</option>
              <option value="degraded">Degraded / Retrying</option>
            </select>
            <span className="material-symbols-outlined absolute right-1.5 top-1/2 -translate-y-1/2 text-[16px] text-outline pointer-events-none">
              expand_more
            </span>
          </div>

          <div className="h-6 w-px bg-surface-container mx-1 hidden sm:block"></div>

          {/* Live Stream Indicator */}
          <div className="flex items-center gap-1.5 px-space-sm py-1 rounded bg-secondary-container/20 text-on-secondary-container">
            <span className="w-2 h-2 rounded-full bg-secondary animate-ping"></span>
            <span className="font-mono-meta text-mono-meta font-semibold">STREAM: 1s</span>
          </div>

          {/* View Selector */}
          <div className="flex items-center bg-surface-container-low rounded p-0.5">
            <button
              onClick={() => setViewMode("traces")}
              className={`px-space-sm py-1 rounded font-mono-meta text-[11px] transition-all ${
                viewMode === "traces"
                  ? "bg-surface-container-lowest text-on-surface font-semibold shadow-sm"
                  : "text-outline hover:text-on-surface"
              }`}
            >
              Traces
            </button>
            <button
              onClick={() => setViewMode("swarm")}
              className={`px-space-sm py-1 rounded font-mono-meta text-[11px] transition-all ${
                viewMode === "swarm"
                  ? "bg-surface-container-lowest text-on-surface font-semibold shadow-sm"
                  : "text-outline hover:text-on-surface"
              }`}
            >
              Swarm Graph
            </button>
          </div>
        </div>
      </div>

      {/* Main Monitoring Viewport */}
      {viewMode === "traces" ? (
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-space-md items-start">
          {/* LEFT COLUMN: Agent Execution Stream & Table (7 cols / ~58%) */}
          <div className="xl:col-span-7 flex flex-col gap-space-sm">
            <div className="bg-surface-container-lowest rounded shadow-sm overflow-hidden">
              {/* Table Header */}
              <div className="px-space-md py-space-sm bg-surface-container flex items-center justify-between text-mono-meta font-mono-meta text-outline uppercase tracking-wider">
                <div className="w-48">Agent / Role</div>
                <div className="flex-1 px-space-sm">Execution Task & Target</div>
                <div className="w-24 text-right">Duration</div>
                <div className="w-28 text-right">Status</div>
              </div>

              {/* Rows */}
              {filteredAgents.map((ag, idx) => {
                const isSelected = ag.id === activeAgent.id;
                return (
                  <React.Fragment key={ag.id}>
                    <div
                      onClick={() => setSelectedAgentId(ag.id)}
                      className={`p-space-md transition-colors flex flex-col gap-space-xs cursor-pointer ${
                        isSelected
                          ? "bg-surface-container-high/40"
                          : "hover:bg-surface-container-low"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-space-sm min-w-0">
                          <span
                            className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${
                              ag.status === "RUNNING"
                                ? "bg-secondary animate-pulse"
                                : ag.status === "DEGRADED"
                                ? "bg-error"
                                : "bg-outline-variant"
                            }`}
                          ></span>
                          <div className="flex items-center gap-1.5">
                            <span className="font-title-sm text-body-md font-bold text-on-surface">
                              {ag.name}
                            </span>
                            <span className="px-1.5 py-0.5 rounded bg-surface-container text-on-surface font-mono-meta text-[10px]">
                              #{ag.id}
                            </span>
                          </div>
                          <span className="hidden sm:inline font-mono-meta text-[11px] text-outline">
                            · {ag.role}
                          </span>
                        </div>
                        <div className="flex items-center gap-space-xs">
                          <span
                            className={`px-2 py-0.5 rounded font-mono-meta text-[11px] font-semibold uppercase ${ag.statusColor}`}
                          >
                            {ag.statusBadge}
                          </span>
                        </div>
                      </div>

                      <div className="font-body-sm text-body-sm text-on-surface line-clamp-2 pt-0.5 pl-5">
                        &quot;{ag.task}&quot;
                      </div>

                      <div className="flex flex-wrap items-center justify-between pt-space-xs pl-5 font-mono-meta text-[11px] text-outline">
                        <div className="flex items-center gap-space-sm">
                          <span className="text-on-surface-variant font-medium">
                            Run: {ag.runId} · {ag.runTitle}
                          </span>
                          <span>•</span>
                          <span>{ag.model}</span>
                        </div>
                        <div className="flex items-center gap-space-sm">
                          <span className={ag.status === "RUNNING" ? "text-secondary font-medium" : ""}>
                            {ag.lastAction}
                          </span>
                          <span>•</span>
                          <span className="tabular-nums text-on-surface">{ag.duration}</span>
                        </div>
                      </div>
                    </div>
                    {idx < filteredAgents.length - 1 && <div className="h-px bg-surface-container" />}
                  </React.Fragment>
                );
              })}
            </div>

            {/* Architectural Pagination Footer */}
            <div className="flex items-center justify-between px-space-xs py-space-xs text-mono-meta font-mono-meta text-outline">
              <div>
                Showing 1 to {filteredAgents.length} of 18,420 agent executions · Shard pool 12/12
              </div>
              <div className="flex items-center gap-space-xs">
                <button className="px-2 py-1 rounded bg-surface-container hover:bg-surface-container-high text-on-surface transition-colors">
                  Prev
                </button>
                <span className="px-2 text-on-surface font-semibold">1</span>
                <button className="px-2 py-1 rounded bg-surface-container hover:bg-surface-container-high text-on-surface transition-colors">
                  Next
                </button>
              </div>
            </div>
          </div>

          {/* RIGHT COLUMN: Deep-Dive Agent Inspector (5 cols / ~42%) */}
          <div className="xl:col-span-5 flex flex-col gap-space-md sticky top-20">
            <div className="bg-surface-container-lowest rounded shadow-sm p-space-md flex flex-col gap-space-md">
              {/* Inspector Header */}
              <div className="flex items-start justify-between pb-space-xs">
                <div className="flex flex-col">
                  <div className="flex items-center gap-2">
                    <span
                      className={`w-3 h-3 rounded-full ${
                        activeAgent.status === "RUNNING"
                          ? "bg-secondary animate-pulse"
                          : activeAgent.status === "DEGRADED"
                          ? "bg-error"
                          : "bg-outline"
                      }`}
                    ></span>
                    <h2 className="font-title-sm text-title-sm font-bold text-on-surface">
                      {activeAgent.name}
                    </h2>
                    <span className="font-mono-meta text-mono-meta text-outline">
                      #{activeAgent.id}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 pt-1 font-mono-meta text-[11px] text-on-surface-variant">
                    <span className="px-1.5 py-0.5 rounded bg-surface-container text-on-surface font-semibold">
                      {activeAgent.model}
                    </span>
                    <span>•</span>
                    <span>Assigned to {activeAgent.runId}</span>
                  </div>
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => {
                      alert(`Agent ${activeAgent.name} execution paused.`);
                    }}
                    className="p-1 rounded bg-surface-container hover:bg-surface-container-high text-on-surface transition-colors"
                    title="Pause Agent"
                  >
                    <span className="material-symbols-outlined text-[18px]">pause</span>
                  </button>
                  <button
                    onClick={() => {
                      setAgents(agents.filter(a => a.id !== activeAgent.id));
                    }}
                    className="p-1 rounded bg-surface-container hover:bg-surface-container-high text-error transition-colors"
                    title="Terminate Worker"
                  >
                    <span className="material-symbols-outlined text-[18px]">stop</span>
                  </button>
                  <button
                    onClick={() => {
                      const newLog = {
                        time: new Date().toTimeString().slice(0, 8) + ".012",
                        tag: "INSPECT",
                        text: `Manual probe on ${activeAgent.name}`,
                        color: "text-secondary font-semibold"
                      };
                      setTerminalLogs([...terminalLogs, newLog]);
                    }}
                    className="p-1 rounded bg-surface-container hover:bg-surface-container-high text-outline transition-colors"
                    title="Probe Worker State"
                  >
                    <span className="material-symbols-outlined text-[18px]">open_in_new</span>
                  </button>
                </div>
              </div>

              {/* Role & Epistemic Mandate */}
              <div className="bg-surface-container-low rounded p-space-sm flex flex-col gap-1">
                <div className="font-mono-meta text-[10px] text-outline font-semibold uppercase tracking-wider">
                  Epistemic Mandate & Boundary
                </div>
                <div className="font-body-sm text-body-sm text-on-surface font-medium">
                  {activeAgent.role}
                </div>
                <div className="font-body-sm text-body-sm text-on-surface-variant text-[12px] leading-relaxed pt-0.5">
                  {activeAgent.mandate}
                </div>
                <div className="flex items-center gap-2 pt-1 font-mono-meta text-[10px] text-secondary">
                  <span className="material-symbols-outlined text-[12px]">security</span>
                  <span>Bound Sandbox: {activeAgent.sandbox}</span>
                </div>
              </div>

              {/* Current Target & Output Split */}
              <div className="grid grid-cols-2 gap-space-sm">
                <div className="bg-surface-container-low rounded p-space-sm flex flex-col gap-1">
                  <div className="font-mono-meta text-[10px] text-outline uppercase">Active Input</div>
                  <div className="font-mono-meta text-[12px] text-on-surface font-semibold truncate">
                    {activeAgent.activeInput}
                  </div>
                  <div className="font-body-sm text-[12px] text-on-surface-variant">
                    {activeAgent.inputSubtext}
                  </div>
                </div>
                <div className="bg-surface-container-low rounded p-space-sm flex flex-col gap-1">
                  <div className="font-mono-meta text-[10px] text-outline uppercase">Output Status</div>
                  <div className="font-mono-meta text-[12px] text-secondary font-semibold">
                    {activeAgent.outputStatus}
                  </div>
                  <div className="font-body-sm text-[12px] text-error">
                    {activeAgent.outputSubtext}
                  </div>
                </div>
              </div>

              {/* Tool Calls & Sandbox RPC Invocations */}
              <div className="flex flex-col gap-space-xs">
                <div className="flex items-center justify-between font-mono-meta text-mono-meta text-outline uppercase">
                  <span>Recent Sandbox RPC Calls</span>
                  <span>{activeAgent.toolCalls?.length || 0} executed</span>
                </div>
                <div className="flex flex-col gap-1.5 font-mono-code text-[11px]">
                  {activeAgent.toolCalls?.map((call, idx) => (
                    <div key={idx} className="bg-surface-container-low rounded p-2 flex flex-col gap-0.5">
                      <div className="flex items-center justify-between text-on-surface">
                        <span className="text-secondary font-medium truncate">{call.name}</span>
                        <span className="text-outline text-[10px] tabular-nums">{call.latency}</span>
                      </div>
                      <span className="text-outline text-[10px]">{call.note}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Live Execution Console Logs (Dark Elevated Panel) */}
              <div className="flex flex-col gap-space-xs">
                <div className="flex items-center justify-between font-mono-meta text-mono-meta text-outline uppercase">
                  <span>Live Terminal Stream</span>
                  <span className="flex items-center gap-1 text-secondary">
                    <span className="w-1.5 h-1.5 rounded-full bg-secondary animate-pulse"></span>
                    <span>TAIL -F</span>
                  </span>
                </div>
                <div className="bg-[#151619] rounded p-space-sm font-mono-code text-[11px] leading-relaxed flex flex-col gap-1 text-outline-variant overflow-x-hidden max-h-48 overflow-y-auto">
                  {terminalLogs.map((log, i) => (
                    <div key={i} className="flex gap-2">
                      <span className="text-outline select-none">[{log.time}]</span>
                      <span className="text-white">
                        <span className={log.color}>{log.tag}:</span> {log.text}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Resilience & Errors Ledger */}
              <div className="flex items-center justify-between bg-surface-container-low rounded px-space-sm py-2 text-mono-meta font-mono-meta">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-[16px] text-secondary">verified_user</span>
                  <span className="text-on-surface">0 fatal faults · 1 soft retry backoff resolved</span>
                </div>
                <span className="text-outline">Tavily SSE 14:38</span>
              </div>

              {/* Quick Actions Footer */}
              <div className="grid grid-cols-3 gap-space-xs pt-space-xs">
                <button
                  onClick={() => alert(`Merkle trace: Root hash for ${activeAgent.id} logged in immutable ledger.`)}
                  className="px-2 py-1.5 rounded bg-surface-container hover:bg-surface-container-high text-on-surface font-mono-meta text-[11px] font-medium transition-colors text-center"
                >
                  Merkle Trace
                </button>
                <button
                  onClick={() => alert(`Memory state for ${activeAgent.name}: 12 Axioms, 8 Vectors retained.`)}
                  className="px-2 py-1.5 rounded bg-surface-container hover:bg-surface-container-high text-on-surface font-mono-meta text-[11px] font-medium transition-colors text-center"
                >
                  Memory State
                </button>
                <button
                  onClick={() => {
                    const line = {
                      time: new Date().toTimeString().slice(0, 8) + ".190",
                      tag: "SSH",
                      text: `Connected to enclave container for ${activeAgent.id}`,
                      color: "text-secondary font-semibold"
                    };
                    setTerminalLogs([...terminalLogs, line]);
                  }}
                  className="px-2 py-1.5 rounded bg-primary text-on-primary hover:bg-primary-container font-mono-meta text-[11px] font-medium transition-colors text-center"
                >
                  SSH Shell
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* SWARM GRAPH VIEW */
        <div className="w-full bg-surface-container-lowest rounded shadow-sm p-space-lg flex flex-col gap-space-md">
          <div className="flex items-center justify-between border-b border-surface-container pb-space-sm">
            <div className="flex flex-col">
              <span className="font-title-sm text-title-sm font-semibold text-on-surface">
                Autonomous Epistemic Swarm Topology (Cluster-Omega-04)
              </span>
              <span className="text-body-sm text-on-surface-variant">
                Live inter-agent message bus, Merkle verification gates, and consensus coordination.
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="flex items-center gap-1 font-mono-meta text-mono-meta text-secondary px-2 py-0.5 rounded bg-secondary-container/40">
                <span className="w-2 h-2 rounded-full bg-secondary animate-pulse"></span>
                <span>Active Consensus Ring</span>
              </span>
            </div>
          </div>

          {/* SVG Swarm Topological Canvas */}
          <div className="relative w-full h-[520px] bg-primary-container rounded border border-white/10 overflow-hidden flex items-center justify-center p-4">
            <svg className="w-full h-full" viewBox="0 0 900 480" fill="none" xmlns="http://www.w3.org/2000/svg">
              {/* Background Graph Grid */}
              <defs>
                <pattern id="swarmGrid" width="40" height="40" patternUnits="userSpaceOnUse">
                  <path d="M 40 0 L 0 0 0 40" fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth="1" />
                </pattern>
                <linearGradient id="cyanLine" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#006972" stopOpacity="0.8" />
                  <stop offset="100%" stopColor="#83f0fd" stopOpacity="0.8" />
                </linearGradient>
              </defs>
              <rect width="100%" height="100%" fill="url(#swarmGrid)" />

              {/* Connections between nodes */}
              {/* Coordinator -> Planner */}
              <path d="M 220 240 L 450 140" stroke="url(#cyanLine)" strokeWidth="2" strokeDasharray="4 4" />
              {/* Coordinator -> Crawler */}
              <path d="M 220 240 L 450 240" stroke="url(#cyanLine)" strokeWidth="2.5" />
              {/* Coordinator -> FactVerifier */}
              <path d="M 220 240 L 450 340" stroke="url(#cyanLine)" strokeWidth="2.5" />
              {/* Crawler -> Synthesizer */}
              <path d="M 450 240 L 720 240" stroke="url(#cyanLine)" strokeWidth="2" strokeDasharray="4 4" />
              {/* FactVerifier -> Synthesizer */}
              <path d="M 450 340 L 720 240" stroke="url(#cyanLine)" strokeWidth="2.5" />
              {/* Planner -> Synthesizer */}
              <path d="M 450 140 L 720 240" stroke="url(#cyanLine)" strokeWidth="1.5" strokeDasharray="4 4" />

              {/* Node 1: Coordinator */}
              <g transform="translate(140, 200)" className="cursor-pointer">
                <circle cx="40" cy="40" r="36" fill="#151619" stroke="#83f0fd" strokeWidth="2" />
                <circle cx="40" cy="40" r="44" fill="none" stroke="#83f0fd" strokeWidth="1" opacity="0.3" />
                <text x="40" y="36" fill="#ffffff" fontSize="12" fontWeight="bold" fontFamily="sans-serif" textAnchor="middle">
                  Orchestrator
                </text>
                <text x="40" y="52" fill="#83f0fd" fontSize="10" fontFamily="monospace" textAnchor="middle">
                  #AGT-001
                </text>
              </g>

              {/* Node 2: Planner */}
              <g transform="translate(410, 100)" className="cursor-pointer">
                <circle cx="40" cy="40" r="32" fill="#151619" stroke="#c6c6cb" strokeWidth="2" />
                <text x="40" y="36" fill="#ffffff" fontSize="12" fontWeight="bold" fontFamily="sans-serif" textAnchor="middle">
                  Planner
                </text>
                <text x="40" y="52" fill="#c6c6cb" fontSize="10" fontFamily="monospace" textAnchor="middle">
                  #AGT-102
                </text>
              </g>

              {/* Node 3: BioMed-Crawler */}
              <g transform="translate(410, 200)" className="cursor-pointer" onClick={() => setSelectedAgentId("AGT-312")}>
                <circle cx="40" cy="40" r="36" fill="#151619" stroke="#83f0fd" strokeWidth="2" />
                <text x="40" y="36" fill="#ffffff" fontSize="12" fontWeight="bold" fontFamily="sans-serif" textAnchor="middle">
                  BioCrawler
                </text>
                <text x="40" y="52" fill="#83f0fd" fontSize="10" fontFamily="monospace" textAnchor="middle">
                  #AGT-312
                </text>
              </g>

              {/* Node 4: FactVerifier-01 */}
              <g transform="translate(410, 300)" className="cursor-pointer" onClick={() => setSelectedAgentId("AGT-904")}>
                <circle cx="40" cy="40" r="38" fill="#151619" stroke="#83f0fd" strokeWidth="2.5" />
                <circle cx="40" cy="40" r="46" fill="none" stroke="#83f0fd" strokeWidth="1.5" opacity="0.5" className="animate-ping" />
                <text x="40" y="36" fill="#ffffff" fontSize="12" fontWeight="bold" fontFamily="sans-serif" textAnchor="middle">
                  FactVerifier
                </text>
                <text x="40" y="52" fill="#83f0fd" fontSize="10" fontFamily="monospace" textAnchor="middle">
                  #AGT-904
                </text>
              </g>

              {/* Node 5: Synthesizer-03 */}
              <g transform="translate(680, 200)" className="cursor-pointer" onClick={() => setSelectedAgentId("AGT-108")}>
                <circle cx="40" cy="40" r="38" fill="#151619" stroke="#dae2ff" strokeWidth="2.5" />
                <text x="40" y="36" fill="#ffffff" fontSize="12" fontWeight="bold" fontFamily="sans-serif" textAnchor="middle">
                  Synthesizer
                </text>
                <text x="40" y="52" fill="#dae2ff" fontSize="10" fontFamily="monospace" textAnchor="middle">
                  #AGT-108
                </text>
              </g>
            </svg>
          </div>
        </div>
      )}

      {/* Deploy Agent Daemon Modal */}
      {isDeployModalOpen && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-surface-container-lowest rounded shadow-2xl w-full max-w-lg overflow-hidden border border-outline-variant/30">
            <div className="p-space-md bg-surface-container flex items-center justify-between border-b border-surface-container">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-secondary text-[22px]">smart_toy</span>
                <span className="font-title-sm font-semibold text-on-surface">Deploy Autonomous Agent Daemon</span>
              </div>
              <button
                onClick={() => setIsDeployModalOpen(false)}
                className="text-outline hover:text-on-surface transition-colors"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const formData = new FormData(e.target);
                const newAgent = {
                  id: "AGT-" + Math.floor(100 + Math.random() * 900),
                  name: formData.get("name"),
                  role: formData.get("role"),
                  status: "RUNNING",
                  progress: 10,
                  statusBadge: "STARTING · 10%",
                  statusColor: "bg-secondary text-on-secondary",
                  task: formData.get("mandate"),
                  runId: "#RF-8924",
                  runTitle: "AI in Healthcare",
                  model: formData.get("model"),
                  lastAction: "Worker spawned (just now)",
                  duration: "00m 05s",
                  mandate: formData.get("mandate"),
                  sandbox: "Tier-2 Read-Only Network",
                  activeInput: "Initial Research Packet",
                  inputSubtext: "Pending ingestion stream",
                  outputStatus: "Initializing",
                  outputSubtext: "Enclave established",
                  toolCalls: []
                };
                setAgents([newAgent, ...agents]);
                setSelectedAgentId(newAgent.id);
                setIsDeployModalOpen(false);
              }}
              className="p-space-md flex flex-col gap-space-md"
            >
              <div className="flex flex-col gap-1">
                <label className="font-mono-meta text-mono-meta text-outline uppercase">Agent Identifier</label>
                <input
                  required
                  name="name"
                  placeholder="e.g. ClinicalTrials-Verifier"
                  className="px-3 py-1.5 rounded bg-surface border border-outline-variant/60 font-body-sm text-on-surface focus:outline-none focus:border-secondary"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="font-mono-meta text-mono-meta text-outline uppercase">Agent Role</label>
                <select
                  name="role"
                  className="px-3 py-1.5 rounded bg-surface border border-outline-variant/60 font-body-sm text-on-surface focus:outline-none focus:border-secondary"
                >
                  <option value="Epistemic Verifier">Epistemic Verifier</option>
                  <option value="Multi-Modal Ingestion">Multi-Modal Ingestion</option>
                  <option value="Literature Crawler">Literature Crawler</option>
                  <option value="Lead Synthesizer">Lead Synthesizer</option>
                </select>
              </div>
              <div className="flex flex-col gap-1">
                <label className="font-mono-meta text-mono-meta text-outline uppercase">Inference Model</label>
                <select
                  name="model"
                  className="px-3 py-1.5 rounded bg-surface border border-outline-variant/60 font-body-sm text-on-surface focus:outline-none focus:border-secondary"
                >
                  <option value="claude-3-5-sonnet">Claude 3.5 Sonnet (Deterministic)</option>
                  <option value="gpt-4o">GPT-4o (Structured Outputs)</option>
                  <option value="o1-preview">o1-preview (Deep Reasoning)</option>
                </select>
              </div>
              <div className="flex flex-col gap-1">
                <label className="font-mono-meta text-mono-meta text-outline uppercase">Epistemic Mandate</label>
                <textarea
                  name="mandate"
                  rows={3}
                  required
                  placeholder="Analyze cross-referenced clinical trials and extract statistical variance..."
                  className="px-3 py-1.5 rounded bg-surface border border-outline-variant/60 font-body-sm text-on-surface focus:outline-none focus:border-secondary"
                />
              </div>
              <div className="flex justify-end gap-space-sm pt-2">
                <button
                  type="button"
                  onClick={() => setIsDeployModalOpen(false)}
                  className="px-space-md py-1.5 rounded bg-surface hover:bg-surface-container text-on-surface font-body-sm text-body-sm transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-space-md py-1.5 rounded bg-primary text-on-primary hover:bg-primary-container font-body-sm text-body-sm font-medium transition-colors"
                >
                  Deploy Daemon
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

