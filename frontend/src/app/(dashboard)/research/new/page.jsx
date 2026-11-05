"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { researchService } from "../../../../services/researchService";
import { projectService } from "../../../../services/projectService";
import { useWorkspace } from "../../../../context/WorkspaceContext";

function NewResearchContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { currentWorkspace } = useWorkspace();

  const initialTopic = searchParams.get("topic") || "";
  const initialMode = searchParams.get("mode") || "Deep Research";

  // Form State
  const [inquiry, setInquiry] = useState(initialTopic);
  const [depth, setDepth] = useState("deep"); // quick | standard | deep | comprehensive
  const [selectedDomains, setSelectedDomains] = useState(["Academic & Scientific"]);
  const [projectId, setProjectId] = useState("");
  const [projects, setProjects] = useState([]);
  const [outputFormat, setOutputFormat] = useState("Executive Briefing");
  const [strictVerification, setStrictVerification] = useState(true);
  const [contradictionFlagging, setContradictionFlagging] = useState(true);
  const [requirePlanApproval, setRequirePlanApproval] = useState(true);
  const [hypothesisBranching, setHypothesisBranching] = useState(true);
  const [temperature, setTemperature] = useState(0.2);
  const [recursionDepth, setRecursionDepth] = useState(4);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [activeMcpEngines, setActiveMcpEngines] = useState({
    tavily: true,
    exa: true,
    pubmed: true,
    github: true,
    firecrawl: false,
  });

  useEffect(() => {
    async function fetchProjects() {
      try {
        const data = await projectService.list(currentWorkspace?.id);
        if (Array.isArray(data) && data.length > 0) {
          setProjects(data);
          setProjectId(data[0].id);
        }
      } catch (err) {
        console.warn("Failed to load projects:", err);
      }
    }
    fetchProjects();
  }, [currentWorkspace?.id]);

  const toggleDomain = (domain) => {
    if (selectedDomains.includes(domain)) {
      if (selectedDomains.length > 1) {
        setSelectedDomains(selectedDomains.filter((d) => d !== domain));
      }
    } else {
      setSelectedDomains([...selectedDomains, domain]);
    }
  };

  const toggleMcp = (key) => {
    setActiveMcpEngines((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const applyTemplate = (prompt) => {
    setInquiry(prompt);
  };

  const handleLaunch = async (e) => {
    if (e) e.preventDefault();
    if (!inquiry.trim()) {
      setError("Please provide a research inquiry statement.");
      return;
    }

    setError("");
    setLoading(true);

    try {
      const payload = {
        title: inquiry.slice(0, 100),
        query: inquiry,
        projectId: projectId || undefined,
        workspaceId: currentWorkspace?.id,
        depth: depth.toUpperCase(), // QUICK, STANDARD, DEEP, COMPREHENSIVE
        domains: selectedDomains,
        requirePlanApproval,
        strictVerification,
        contradictionFlagging,
        format: outputFormat,
        temperature,
        maxDepth: recursionDepth,
        enabledMcp: Object.keys(activeMcpEngines).filter((k) => activeMcpEngines[k]),
      };

      const run = await researchService.createRun(payload);
      if (run && run.id) {
        router.push(`/research/${run.id}`);
      } else {
        router.push(`/research/run_demo_01`);
      }
    } catch (err) {
      console.warn("Launch run fallback:", err);
      // Fallback for seamless developer preview
      router.push(`/research/run_demo_01`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col w-full">
      {/* Breadcrumb & Workspace Header */}
      <div className="flex flex-col gap-space-xs mb-space-lg">
        <div className="flex items-center gap-2 text-mono-meta font-mono-meta tracking-wider text-outline uppercase">
          <span className="hover:text-on-surface transition-colors cursor-pointer">Workspace</span>
          <span>/</span>
          <span className="text-secondary font-semibold">New Research</span>
        </div>
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-space-md pt-space-xs">
          <div className="max-w-3xl">
            <h1 className="font-headline-lg text-headline-lg text-on-surface tracking-tight">
              Start a new research. <span className="italic font-normal text-secondary">Chart the unknown.</span>
            </h1>
            <p className="font-body-md text-body-md text-on-surface-variant mt-2 max-w-2xl leading-relaxed">
              Configure multi-agent autonomous inquiry parameters. ResearchForge deploys recursive agent swarms to
              discover, cross-examine, and synthesize multi-modal evidence into verifiable intelligence dossiers.
            </p>
          </div>
          {/* Quick Session Indicator */}
          <div className="flex items-center gap-3 bg-surface-container-lowest px-space-md py-2 rounded shadow-sm self-start md:self-auto border border-outline-variant/40">
            <div className="w-2 h-2 rounded-full bg-secondary animate-pulse" />
            <div className="flex flex-col">
              <span className="font-mono-meta text-mono-meta text-outline uppercase tracking-wider">
                Swarm Engine
              </span>
              <span className="font-body-sm text-body-sm font-semibold text-on-surface">
                Cluster 04-Omega (Ready)
              </span>
            </div>
          </div>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-3 rounded bg-error-container text-on-error-container text-body-sm border border-error/20 flex items-center gap-2">
          <span className="material-symbols-outlined text-[18px]">error</span>
          <span>{error}</span>
        </div>
      )}

      {/* Primary Asymmetric Workspace Architecture */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-space-lg items-start">
        {/* LEFT COLUMN: Main Research Configuration Form */}
        <form onSubmit={handleLaunch} className="lg:col-span-8 flex flex-col gap-space-lg">
          {/* SECTION 1: Primary Inquiry Statement */}
          <div className="bg-surface-container-lowest p-space-lg rounded shadow-sm border border-outline-variant/40 flex flex-col gap-space-md">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="font-mono-meta text-mono-meta px-1.5 py-0.5 rounded bg-surface-container-high text-on-surface font-semibold">
                  01
                </span>
                <label className="font-title-sm text-title-sm text-on-surface" htmlFor="researchInquiry">
                  Primary Inquiry Statement
                </label>
              </div>
              <span className="font-mono-meta text-mono-meta text-outline uppercase">
                Natural Language Prompt
              </span>
            </div>
            <div className="relative flex flex-col">
              <textarea
                id="researchInquiry"
                value={inquiry}
                onChange={(e) => setInquiry(e.target.value)}
                className="w-full p-space-md rounded bg-surface font-body-md text-body-md text-on-surface placeholder:text-outline border border-outline-variant/60 focus:outline-none focus:border-secondary transition-all resize-y shadow-inner"
                placeholder="What would you like to investigate? (e.g., Comparative analysis of solid-state sodium-ion electrolytes vs. silicon anode durability in commercial EV fleet cycles under severe cold-weather degradation curves...)"
                rows={5}
                required
              />
              <div className="flex items-center justify-between pt-2 px-1 text-mono-meta font-mono-meta text-outline">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-[15px] text-secondary">psychology</span>
                  <span className="text-on-surface-variant">Autonomous prompt decomposition enabled</span>
                </div>
                <div className="tracking-tight text-on-surface-variant font-medium">
                  {inquiry.length} / 2,000 characters · ~{Math.round(inquiry.length / 4)} context tokens
                </div>
              </div>
            </div>

            {/* Prompt Suggestions / Templates */}
            <div className="flex flex-col gap-2 pt-space-xs">
              <span className="font-mono-meta text-mono-meta text-outline uppercase tracking-wider">
                Suggested Exploration Templates:
              </span>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() =>
                    applyTemplate(
                      "FDA 510(k) Precedents for autonomous AI diagnostic radiology software: systematic audit of predicate devices and clinical validation efficacy gap analysis."
                    )
                  }
                  className="px-2.5 py-1.5 rounded bg-surface-container hover:bg-surface-container-high text-on-surface text-body-sm font-body-sm transition-colors text-left flex items-center gap-1.5 border border-outline-variant/30"
                >
                  <span className="material-symbols-outlined text-[15px] text-outline">add_circle</span>
                  <span>FDA 510(k) Precedents</span>
                </button>
                <button
                  type="button"
                  onClick={() =>
                    applyTemplate(
                      "EU Carbon Border Adjustment Mechanism (CBAM) impact on metallurgical supply chains: predictive compliance costs & synthetic fuel replacement timelines."
                    )
                  }
                  className="px-2.5 py-1.5 rounded bg-surface-container hover:bg-surface-container-high text-on-surface text-body-sm font-body-sm transition-colors text-left flex items-center gap-1.5 border border-outline-variant/30"
                >
                  <span className="material-symbols-outlined text-[15px] text-outline">add_circle</span>
                  <span>EU Carbon Border Adjustment</span>
                </button>
                <button
                  type="button"
                  onClick={() =>
                    applyTemplate(
                      "Post-Quantum Cryptography (PQC) lattice benchmarks: Kyber-1024 vs. Dilithium throughput penalties on edge microcontrollers (ARM Cortex-M4)."
                    )
                  }
                  className="px-2.5 py-1.5 rounded bg-surface-container hover:bg-surface-container-high text-on-surface text-body-sm font-body-sm transition-colors text-left flex items-center gap-1.5 border border-outline-variant/30"
                >
                  <span className="material-symbols-outlined text-[15px] text-outline">add_circle</span>
                  <span>Post-Quantum Cryptography</span>
                </button>
              </div>
            </div>
          </div>

          {/* SECTION 2: Research Depth Matrix */}
          <div className="bg-surface-container-lowest p-space-lg rounded shadow-sm border border-outline-variant/40 flex flex-col gap-space-md">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="font-mono-meta text-mono-meta px-1.5 py-0.5 rounded bg-surface-container-high text-on-surface font-semibold">
                  02
                </span>
                <h2 className="font-title-sm text-title-sm text-on-surface">Research Depth Matrix</h2>
              </div>
              <span className="font-mono-meta text-mono-meta text-outline uppercase">
                Swarm Convergence Engine
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-space-sm">
              {/* Depth 1: Quick */}
              <div
                onClick={() => setDepth("quick")}
                className={`p-space-md rounded cursor-pointer transition-all flex flex-col justify-between border ${
                  depth === "quick"
                    ? "bg-secondary/10 border-secondary shadow-sm"
                    : "bg-surface-container-low hover:bg-surface-container border-outline-variant/40"
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="font-body-sm text-body-sm font-bold text-on-surface">Quick Research</span>
                  <span className="font-mono-meta text-mono-meta px-1.5 py-0.5 rounded bg-surface text-outline font-semibold">
                    ~3 MINS
                  </span>
                </div>
                <p className="font-body-sm text-body-sm text-on-surface-variant leading-relaxed mb-4">
                  Rapid multi-source scanning for preliminary briefings and rapid fact verification.
                </p>
                <div className="flex items-center justify-between pt-2 text-mono-meta font-mono-meta text-outline">
                  <span className="flex items-center gap-1">
                    <span className="material-symbols-outlined text-[14px]">dataset</span> 10–15 sources
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="material-symbols-outlined text-[14px]">smart_toy</span> 2 agents
                  </span>
                </div>
              </div>

              {/* Depth 2: Standard */}
              <div
                onClick={() => setDepth("standard")}
                className={`p-space-md rounded cursor-pointer transition-all flex flex-col justify-between border ${
                  depth === "standard"
                    ? "bg-secondary/10 border-secondary shadow-sm"
                    : "bg-surface-container-low hover:bg-surface-container border-outline-variant/40"
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="font-body-sm text-body-sm font-bold text-on-surface">Standard Research</span>
                  <span className="font-mono-meta text-mono-meta px-1.5 py-0.5 rounded bg-surface text-outline font-semibold">
                    ~8 MINS
                  </span>
                </div>
                <p className="font-body-sm text-body-sm text-on-surface-variant leading-relaxed mb-4">
                  Comprehensive literature evaluation with balanced cross-citation checks and summary.
                </p>
                <div className="flex items-center justify-between pt-2 text-mono-meta font-mono-meta text-outline">
                  <span className="flex items-center gap-1">
                    <span className="material-symbols-outlined text-[14px]">dataset</span> 25–40 sources
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="material-symbols-outlined text-[14px]">smart_toy</span> 4 agents
                  </span>
                </div>
              </div>

              {/* Depth 3: Deep (RECOMMENDED) */}
              <div
                onClick={() => setDepth("deep")}
                className={`p-space-md rounded cursor-pointer transition-all flex flex-col justify-between border ${
                  depth === "deep"
                    ? "bg-secondary/10 border-secondary shadow-sm"
                    : "bg-surface-container-low hover:bg-surface-container border-outline-variant/40"
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="font-body-sm text-body-sm font-bold text-on-surface">Deep Research</span>
                    <span className="px-1.5 py-0.2 rounded bg-secondary text-on-secondary text-[10px] font-mono-meta tracking-wider uppercase font-semibold">
                      RECOMMENDED
                    </span>
                  </div>
                  <span className="font-mono-meta text-mono-meta px-1.5 py-0.5 rounded bg-surface-container-lowest text-secondary font-bold">
                    ~18 MINS
                  </span>
                </div>
                <p className="font-body-sm text-body-sm text-on-surface-variant leading-relaxed mb-4">
                  High-intensity swarm cross-triangulation, patent &amp; preprint recursive deconstruction.
                </p>
                <div className="flex items-center justify-between pt-2 text-mono-meta font-mono-meta text-on-secondary-container font-medium">
                  <span className="flex items-center gap-1">
                    <span className="material-symbols-outlined text-[14px]">dataset</span> 60–100 sources
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="material-symbols-outlined text-[14px]">smart_toy</span> 6 agents
                  </span>
                </div>
              </div>

              {/* Depth 4: Comprehensive */}
              <div
                onClick={() => setDepth("comprehensive")}
                className={`p-space-md rounded cursor-pointer transition-all flex flex-col justify-between border ${
                  depth === "comprehensive"
                    ? "bg-secondary/10 border-secondary shadow-sm"
                    : "bg-surface-container-low hover:bg-surface-container border-outline-variant/40"
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="font-body-sm text-body-sm font-bold text-on-surface">
                    Comprehensive Swarm
                  </span>
                  <span className="font-mono-meta text-mono-meta px-1.5 py-0.5 rounded bg-surface text-outline font-semibold">
                    ~45 MINS
                  </span>
                </div>
                <p className="font-body-sm text-body-sm text-on-surface-variant leading-relaxed mb-4">
                  Full epistemic consensus graph, contradictory node arbitration, and forensic audit.
                </p>
                <div className="flex items-center justify-between pt-2 text-mono-meta font-mono-meta text-outline">
                  <span className="flex items-center gap-1">
                    <span className="material-symbols-outlined text-[14px]">dataset</span> 150+ sources
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="material-symbols-outlined text-[14px]">smart_toy</span> 10 agents
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* SECTION 3: Research Domain & Methodology */}
          <div className="bg-surface-container-lowest p-space-lg rounded shadow-sm border border-outline-variant/40 flex flex-col gap-space-md">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="font-mono-meta text-mono-meta px-1.5 py-0.5 rounded bg-surface-container-high text-on-surface font-semibold">
                  03
                </span>
                <h2 className="font-title-sm text-title-sm text-on-surface">
                  Domain &amp; Investigation Methodology
                </h2>
              </div>
              <span className="font-mono-meta text-mono-meta text-outline uppercase">Index Biasing</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-space-xs">
              {[
                {
                  id: "Academic & Scientific",
                  sub: "arXiv, PubMed, Nature, DOI",
                  icon: "science",
                },
                {
                  id: "Technical & Engineering",
                  sub: "Patents, GitHub Sci, Specs",
                  icon: "terminal",
                },
                {
                  id: "Market & Financial",
                  sub: "SEC 10-K, Alpha Vantage, CapIQ",
                  icon: "trending_up",
                },
                {
                  id: "Competitor & Moats",
                  sub: "Pricing structures, IP landscape",
                  icon: "shield",
                },
                {
                  id: "Regulatory & Legal",
                  sub: "Federal Register, EUR-Lex",
                  icon: "policy",
                },
                {
                  id: "General Exploratory",
                  sub: "Unconstrained Web Indexing",
                  icon: "travel_explore",
                },
              ].map((domain) => {
                const selected = selectedDomains.includes(domain.id);
                return (
                  <button
                    key={domain.id}
                    type="button"
                    onClick={() => toggleDomain(domain.id)}
                    className={`p-space-sm rounded text-left transition-all flex items-start gap-space-sm border ${
                      selected
                        ? "bg-primary text-on-primary border-primary"
                        : "bg-surface-container-low hover:bg-surface-container text-on-surface border-outline-variant/30"
                    }`}
                  >
                    <span
                      className={`material-symbols-outlined text-[20px] mt-0.5 ${
                        selected ? "text-secondary-fixed" : "text-on-surface-variant"
                      }`}
                    >
                      {domain.icon}
                    </span>
                    <div className="flex flex-col min-w-0">
                      <span className="font-body-sm text-body-sm font-bold truncate">{domain.id}</span>
                      <span
                        className={`font-mono-meta text-mono-meta truncate ${
                          selected ? "opacity-75" : "text-outline"
                        }`}
                      >
                        {domain.sub}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* SECTION 4: Project Allocation */}
          <div className="bg-surface-container-lowest p-space-lg rounded shadow-sm border border-outline-variant/40 flex flex-col gap-space-md">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="font-mono-meta text-mono-meta px-1.5 py-0.5 rounded bg-surface-container-high text-on-surface font-semibold">
                  04
                </span>
                <h2 className="font-title-sm text-title-sm text-on-surface">
                  Project Allocation &amp; Context Assets
                </h2>
              </div>
              <span className="font-mono-meta text-mono-meta text-outline uppercase">Repository Scope</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-space-md items-start">
              <div className="flex flex-col gap-2">
                <label className="font-mono-meta text-mono-meta text-outline uppercase tracking-wider">
                  Assign to Research Project
                </label>
                <div className="relative">
                  <select
                    value={projectId}
                    onChange={(e) => setProjectId(e.target.value)}
                    className="w-full appearance-none px-space-md py-2.5 rounded bg-surface font-body-sm text-body-sm text-on-surface font-medium cursor-pointer border border-outline-variant/60 focus:outline-none pr-10 shadow-inner"
                  >
                    {projects.length > 0 ? (
                      projects.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name}
                        </option>
                      ))
                    ) : (
                      <>
                        <option value="">Quantum &amp; AI Systems Lab / Core Dossiers</option>
                        <option value="p2">Biosynthetic Catalyst Consortium / Phase II</option>
                        <option value="p3">Autonomous Grid Infrastructure / Horizon 2030</option>
                      </>
                    )}
                  </select>
                  <span className="material-symbols-outlined absolute right-3 top-3 text-[18px] text-outline pointer-events-none">
                    unfold_more
                  </span>
                </div>
                <p className="font-mono-meta text-mono-meta text-outline">
                  Synthesized nodes will automatically index into this team project&apos;s knowledge vector store.
                </p>
              </div>

              {/* Reference Dropzone */}
              <div className="flex flex-col gap-2">
                <label className="font-mono-meta text-mono-meta text-outline uppercase tracking-wider">
                  Supporting Reference Files
                </label>
                <div className="p-space-md rounded bg-surface-container-low hover:bg-surface-container transition-colors flex flex-col items-center justify-center text-center cursor-pointer group border border-dashed border-outline-variant/60">
                  <span className="material-symbols-outlined text-[28px] text-secondary mb-1 group-hover:scale-110 transition-transform">
                    cloud_upload
                  </span>
                  <span className="font-body-sm text-body-sm font-semibold text-on-surface">
                    Drop documents, PDFs, or research notes
                  </span>
                  <span className="font-mono-meta text-mono-meta text-outline mt-1">
                    PDF, DOCX, CSV, BibTeX up to 100MB
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* SECTION 5: MCP Tools Swarm */}
          <div className="bg-surface-container-lowest p-space-lg rounded shadow-sm border border-outline-variant/40 flex flex-col gap-space-md">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="font-mono-meta text-mono-meta px-1.5 py-0.5 rounded bg-surface-container-high text-on-surface font-semibold">
                  05
                </span>
                <h2 className="font-title-sm text-title-sm text-on-surface">
                  MCP Search Providers &amp; Tool Swarm
                </h2>
              </div>
              <span className="font-mono-meta text-mono-meta text-secondary font-bold uppercase">
                {Object.values(activeMcpEngines).filter(Boolean).length} Engines Configured
              </span>
            </div>
            <p className="font-body-sm text-body-sm text-on-surface-variant">
              Agents leverage Model Context Protocol (MCP) clients to query external indexes and run code
              execution sandboxes synchronously.
            </p>
            <div className="flex flex-wrap gap-2">
              {[
                { id: "tavily", label: "Tavily Deep Search v1.2" },
                { id: "exa", label: "Exa Semantic Neural Engine" },
                { id: "pubmed", label: "PubMed / CrossRef DOI Resolver" },
                { id: "github", label: "GitHub Scientific AST Parser" },
                { id: "firecrawl", label: "Firecrawl Async Headless DOM" },
              ].map((engine) => {
                const active = activeMcpEngines[engine.id];
                return (
                  <button
                    key={engine.id}
                    type="button"
                    onClick={() => toggleMcp(engine.id)}
                    className={`px-3 py-2 rounded font-mono-meta text-mono-meta flex items-center gap-2 transition-all font-semibold border ${
                      active
                        ? "bg-surface-container-highest text-on-surface border-secondary/40"
                        : "bg-surface-container-low hover:bg-surface-container text-outline border-outline-variant/30"
                    }`}
                  >
                    <span
                      className={`w-2 h-2 rounded-full ${active ? "bg-secondary" : "bg-outline-variant"}`}
                    />
                    <span>{engine.label}</span>
                    <span className={active ? "text-secondary font-bold" : "text-outline"}>
                      {active ? "ACTIVE" : "STANDBY"}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* SECTION 6: Target Format & Epistemic Gates */}
          <div className="bg-surface-container-lowest p-space-lg rounded shadow-sm border border-outline-variant/40 flex flex-col gap-space-md">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="font-mono-meta text-mono-meta px-1.5 py-0.5 rounded bg-surface-container-high text-on-surface font-semibold">
                  06
                </span>
                <h2 className="font-title-sm text-title-sm text-on-surface">
                  Target Synthesis Format &amp; Verification Gates
                </h2>
              </div>
              <span className="font-mono-meta text-mono-meta text-outline uppercase">
                Epistemic Governance
              </span>
            </div>

            {/* Format Selector Tabs */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 bg-surface-container-low p-1.5 rounded">
              {["Executive Briefing", "Exhaustive Dossier", "Knowledge Graph", "BibTeX & Citations"].map(
                (fmt) => (
                  <button
                    key={fmt}
                    type="button"
                    onClick={() => setOutputFormat(fmt)}
                    className={`py-2 px-3 rounded font-body-sm text-body-sm text-center transition-all ${
                      outputFormat === fmt
                        ? "bg-surface-container-lowest text-on-surface font-semibold shadow-xs"
                        : "text-on-surface-variant hover:text-on-surface"
                    }`}
                  >
                    {fmt}
                  </button>
                )
              )}
            </div>

            {/* Rigor Toggles */}
            <div className="flex flex-col gap-space-sm pt-2">
              <label className="flex items-start gap-space-md p-space-sm rounded hover:bg-surface-container-low cursor-pointer transition-colors">
                <input
                  type="checkbox"
                  checked={requirePlanApproval}
                  onChange={(e) => setRequirePlanApproval(e.target.checked)}
                  className="mt-1 w-4 h-4 accent-secondary rounded cursor-pointer"
                />
                <div className="flex flex-col">
                  <span className="font-body-sm text-body-sm font-bold text-on-surface">
                    Human-in-the-Loop Plan Approval
                  </span>
                  <span className="font-body-sm text-body-sm text-on-surface-variant">
                    Pause before execution to inspect and refine the task DAG, search queries, and agent assignments.
                  </span>
                </div>
              </label>

              <label className="flex items-start gap-space-md p-space-sm rounded hover:bg-surface-container-low cursor-pointer transition-colors">
                <input
                  type="checkbox"
                  checked={strictVerification}
                  onChange={(e) => setStrictVerification(e.target.checked)}
                  className="mt-1 w-4 h-4 accent-secondary rounded cursor-pointer"
                />
                <div className="flex flex-col">
                  <span className="font-body-sm text-body-sm font-bold text-on-surface">
                    Strict Immutable Citation Verification
                  </span>
                  <span className="font-body-sm text-body-sm text-on-surface-variant">
                    Require active DOI resolver or live cryptographic archive snapshots for every affirmative factual assertion.
                  </span>
                </div>
              </label>

              <label className="flex items-start gap-space-md p-space-sm rounded hover:bg-surface-container-low cursor-pointer transition-colors">
                <input
                  type="checkbox"
                  checked={contradictionFlagging}
                  onChange={(e) => setContradictionFlagging(e.target.checked)}
                  className="mt-1 w-4 h-4 accent-secondary rounded cursor-pointer"
                />
                <div className="flex flex-col">
                  <span className="font-body-sm text-body-sm font-bold text-on-surface">
                    Contradiction Detection &amp; Epistemic Discrepancy Flagging
                  </span>
                  <span className="font-body-sm text-body-sm text-on-surface-variant">
                    Explicitly highlights divergent empirical findings between authors rather than averaging opinions into misleading consensus.
                  </span>
                </div>
              </label>

              <label className="flex items-start gap-space-md p-space-sm rounded hover:bg-surface-container-low cursor-pointer transition-colors">
                <input
                  type="checkbox"
                  checked={hypothesisBranching}
                  onChange={(e) => setHypothesisBranching(e.target.checked)}
                  className="mt-1 w-4 h-4 accent-secondary rounded cursor-pointer"
                />
                <div className="flex flex-col">
                  <span className="font-body-sm text-body-sm font-bold text-on-surface">
                    Autonomous Hypothesis Branching
                  </span>
                  <span className="font-body-sm text-body-sm text-on-surface-variant">
                    Allows specialist agents to autonomously spawn recursive sub-inquiries when unexplained statistical anomalies appear during scraping.
                  </span>
                </div>
              </label>
            </div>
          </div>

          {/* SECTION 7: Collapsible Advanced Hyperparameters */}
          <details className="bg-surface-container-lowest p-space-lg rounded shadow-sm border border-outline-variant/40 group">
            <summary className="flex items-center justify-between cursor-pointer list-none select-none">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[20px] text-outline group-open:rotate-90 transition-transform">
                  chevron_right
                </span>
                <span className="font-title-sm text-title-sm text-on-surface">
                  Advanced Swarm &amp; Recursion Hyperparameters
                </span>
              </div>
              <span className="font-mono-meta text-mono-meta text-outline uppercase tracking-wider">
                Fine Tuning
              </span>
            </summary>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-space-md pt-space-lg">
              <div className="flex flex-col gap-1.5">
                <label className="font-mono-meta text-mono-meta text-outline uppercase">
                  Synthesis Temperature:{" "}
                  <span className="text-on-surface font-bold">
                    {temperature} {temperature <= 0.3 ? "(Strict Precision)" : "(Exploratory Creative)"}
                  </span>
                </label>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={temperature}
                  onChange={(e) => setTemperature(parseFloat(e.target.value))}
                  className="w-full accent-secondary cursor-pointer"
                />
                <span className="font-mono-meta text-mono-meta text-outline">
                  Lower temperatures enforce deterministic factual synthesis.
                </span>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="font-mono-meta text-mono-meta text-outline uppercase">
                  Recursion Depth Cap
                </label>
                <select
                  value={recursionDepth}
                  onChange={(e) => setRecursionDepth(parseInt(e.target.value, 10))}
                  className="w-full appearance-none px-space-md py-2 rounded bg-surface font-body-sm text-body-sm text-on-surface border border-outline-variant/60 focus:outline-none"
                >
                  <option value={2}>Level 2: Surface Search &amp; Verify</option>
                  <option value={3}>Level 3: Multi-hop Cross-Examination</option>
                  <option value={4}>Level 4: Deep Autonomous Tree-of-Thought (Default)</option>
                  <option value={5}>Level 5: Forensic Exhaustive (High Token Consumption)</option>
                </select>
              </div>
            </div>
          </details>

          {/* SECTION 8: Launch Controls & Sticky Footer */}
          <div className="bg-surface-container-lowest p-space-md sm:p-space-lg rounded shadow-md border border-outline-variant/40 flex flex-col sm:flex-row sm:items-center justify-between gap-space-md sticky bottom-4 z-30">
            <div className="flex items-center gap-space-md">
              <button
                type="submit"
                disabled={loading}
                className="px-space-lg py-3 rounded bg-primary text-on-primary font-body-sm text-body-sm font-semibold flex items-center gap-2 hover:bg-primary-container hover:text-secondary-fixed transition-all shadow-sm"
              >
                {loading ? (
                  <>
                    <span className="material-symbols-outlined text-[18px] animate-spin">autorenew</span>
                    <span>Dispatching Swarm...</span>
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined text-[18px]">rocket_launch</span>
                    <span>Launch Autonomous Research</span>
                  </>
                )}
              </button>
              <button
                type="button"
                className="px-space-md py-3 rounded bg-surface-container-high hover:bg-surface-container-highest text-on-surface font-body-sm text-body-sm font-medium transition-colors"
              >
                Save Draft
              </button>
            </div>
            <div className="flex items-center gap-space-md text-mono-meta font-mono-meta text-right">
              <div className="flex flex-col">
                <span className="text-on-surface font-bold">Est. 3.2 Credits · ~18 mins</span>
                <span className="text-outline">Balance after run: 4,816.8 Credits</span>
              </div>
              <span className="material-symbols-outlined text-secondary text-[22px]">verified</span>
            </div>
          </div>
        </form>

        {/* RIGHT COLUMN: Research Lifecycle & Fleet Telemetry Pane */}
        <div className="lg:col-span-4 flex flex-col gap-space-lg sticky top-20">
          <div className="bg-primary-container text-on-primary p-space-lg rounded shadow-md border border-white/10 flex flex-col gap-space-md">
            <div className="flex items-center justify-between pb-space-xs">
              <div className="flex flex-col">
                <span className="font-mono-meta text-mono-meta text-secondary-fixed uppercase tracking-widest font-semibold">
                  Operational Blueprint
                </span>
                <h3 className="font-headline-md text-headline-md text-on-primary">Research Lifecycle</h3>
              </div>
              <span className="material-symbols-outlined text-secondary-fixed text-[24px]">account_tree</span>
            </div>
            <p className="font-body-sm text-body-sm text-on-primary-container leading-relaxed">
              How your prompt flows through ResearchForge&apos;s recursive agent architecture:
            </p>

            {/* 6-Stage Timeline */}
            <div className="flex flex-col gap-space-md relative pl-2">
              {[
                {
                  step: "01",
                  title: "Understand & Deconstruct",
                  desc: "Deconstruct prompt into core epistemological claims, defining null hypotheses and bounding search horizons.",
                },
                {
                  step: "02",
                  title: "Plan & Dispatch Swarm",
                  desc: "Formulate 6–8 targeted search queries; assign specialist reader, crawler, and math verification roles.",
                },
                {
                  step: "03",
                  title: "Discover & Ingest",
                  desc: "Execute concurrent MCP queries across academic repositories, patents, and live regulatory filings.",
                },
                {
                  step: "04",
                  title: "Extract & Fact-Check",
                  desc: "Cross-reference assertions, evaluate statistical significance, and flag epistemic contradictions.",
                },
                {
                  step: "05",
                  title: "Synthesize & Verify",
                  desc: "Construct consensus graph, build claim-by-claim citations, and finalize executive dossier.",
                },
                {
                  step: "06",
                  title: "Publish Dossier",
                  desc: "Export verified PDF, DOCX, Markdown, or HTML with interactive citation inspector.",
                },
              ].map((stage) => (
                <div key={stage.step} className="flex items-start gap-space-sm relative">
                  <div className="w-6 h-6 rounded bg-white/10 flex items-center justify-center font-mono-meta text-mono-meta text-secondary-fixed font-bold flex-shrink-0">
                    {stage.step}
                  </div>
                  <div className="flex flex-col">
                    <span className="font-body-sm text-body-sm font-bold text-on-primary">
                      {stage.title}
                    </span>
                    <span className="font-body-sm text-body-sm text-on-primary-container text-[12px] leading-snug">
                      {stage.desc}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function NewResearchPage() {
  return (
    <Suspense fallback={<div className="p-8 font-mono-meta text-outline">Loading research formulation...</div>}>
      <NewResearchContent />
    </Suspense>
  );
}
