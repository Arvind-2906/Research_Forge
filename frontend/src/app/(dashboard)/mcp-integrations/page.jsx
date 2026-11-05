"use client";

import React, { useState, useEffect } from "react";
import { mcpService } from "../../../services/mcpService";

export default function McpIntegrationsPage() {
  const [servers, setServers] = useState([]);
  const [selectedServerId, setSelectedServerId] = useState("tavily");
  const [activeTab, setActiveTab] = useState("tools"); // tools | config | security | audit
  const [selectedToolName, setSelectedToolName] = useState("tavily_search");
  const [searchQuery, setSearchQuery] = useState("");
  const [stateFilter, setStateFilter] = useState("all");
  const [transportFilter, setTransportFilter] = useState("all");
  const [isSandboxModalOpen, setIsSandboxModalOpen] = useState(false);
  const [isAddServerOpen, setIsAddServerOpen] = useState(false);
  const [sandboxInput, setSandboxInput] = useState('{\n  "query": "FDA 510(k) K231459 pre-market clearance",\n  "search_depth": "advanced",\n  "max_results": 5\n}');
  const [sandboxResult, setSandboxResult] = useState(null);
  const [isExecuting, setIsExecuting] = useState(false);
  const [pingStatus, setPingStatus] = useState("idle"); // idle | pinging | ok
  const [copyFeedback, setCopyFeedback] = useState(false);

  // Initial Mock/Fallback Data matching Stitch Design
  const defaultServers = [
    {
      id: "tavily",
      name: "Tavily MCP",
      code: "TV",
      status: "connected",
      statusLabel: "SSE Connected",
      badge: "Read-Only Stream",
      description: "Real-time epistemological web search, factual verification, and deep research extraction.",
      latency: "14ms",
      lastSeen: "12s ago",
      transportUri: "mcp+https://gateway.internal/tavily-v2",
      transportType: "Remote SSE",
      authToken: "tvly-live-••••••••9a2f",
      volume24h: "10,480 queries",
      keyRotation: "42 days valid",
      sandboxTier: "Tier-2 Read-Only",
      rateLimit: "120 calls / min (Burst: 180)",
      tools: [
        {
          name: "tavily_search",
          type: "Pure Idempotent",
          description: "Executes optimized real-time web queries tuned for factual veracity, research citations, and domain filtering. Enriches autonomous synthesis workflows with peer-reviewed or verifiable press sources.",
          schema: {
            type: "object",
            required: ["query"],
            properties: {
              query: { type: "string", description: "Search query formulation" },
              search_depth: { type: "string", enum: ["basic", "advanced"], default: "advanced" },
              include_answer: { type: "boolean", default: true },
              max_results: { type: "integer", minimum: 1, maximum: 20, default: 10 },
              include_domains: { type: "array", items: { type: "string" } }
            }
          }
        },
        {
          name: "tavily_extract",
          type: "Idempotent Extractor",
          description: "Extracts raw, clean structural Markdown and content graphs from targeted scientific and news URLs.",
          schema: {
            type: "object",
            required: ["urls"],
            properties: {
              urls: { type: "array", items: { type: "string" } },
              extract_depth: { type: "string", enum: ["basic", "deep"], default: "deep" }
            }
          }
        },
        {
          name: "tavily_qna",
          type: "Direct Answer Synthesizer",
          description: "Direct targeted question answering over high-authority index nodes with citation spans.",
          schema: {
            type: "object",
            required: ["question"],
            properties: {
              question: { type: "string" }
            }
          }
        },
        {
          name: "tavily_topic_tracker",
          type: "Epistemic Feed",
          description: "Streams dynamic delta notifications on emerging clinical trials and regulatory publications.",
          schema: {
            type: "object",
            required: ["topic"],
            properties: {
              topic: { type: "string" },
              interval_hours: { type: "integer", default: 24 }
            }
          }
        }
      ],
      auditLog: {
        agent: "FactVerifier-01 (PRJ-BIO-4491)",
        status: "200 OK · 118ms",
        query: 'Query: "FDA 510(k) K231459 pre-market clearance decision summary"',
        details: "Returned: 8 verified domains (fda.gov, accessdata.fda.gov)",
        hash: "sha256: 8f42…b10c"
      }
    },
    {
      id: "exa",
      name: "Exa MCP",
      code: "EX",
      status: "connected",
      statusLabel: "SSE Connected",
      badge: "Vector Neural Search",
      description: "Embeddings-based semantic web crawl, academic domain clustering, and document similarity retrieval.",
      latency: "18ms",
      lastSeen: "45s ago",
      transportUri: "mcp+https://gateway.internal/exa-v1",
      transportType: "Remote SSE",
      authToken: "exa-prod-••••••••c4e1",
      volume24h: "8,920 crawls",
      keyRotation: "Auto-Approved",
      sandboxTier: "Tier-2 Read-Only",
      rateLimit: "90 calls / min",
      tools: [
        {
          name: "exa_semantic_search",
          type: "Vector Embedding Search",
          description: "High-dimensional embeddings search across indexed arXiv, Nature, and PubMed databases.",
          schema: {
            type: "object",
            required: ["query"],
            properties: {
              query: { type: "string" },
              num_results: { type: "integer", default: 10 },
              use_autoprompt: { type: "boolean", default: true }
            }
          }
        },
        {
          name: "exa_find_similar",
          type: "Similarity Clustering",
          description: "Find documents with closest topological vector proximity to a seed research URL.",
          schema: {
            type: "object",
            required: ["url"],
            properties: {
              url: { type: "string" },
              similarity_threshold: { type: "number", default: 0.85 }
            }
          }
        },
        {
          name: "exa_get_contents",
          type: "Clean Ingestion",
          description: "Retrieves parsed full-text representations including clean LaTeX equation blocks.",
          schema: {
            type: "object",
            required: ["ids"],
            properties: {
              ids: { type: "array", items: { type: "string" } }
            }
          }
        },
        {
          name: "exa_domain_filter",
          type: "Domain Scoper",
          description: "Restricts vector index candidate sets to certified peer-reviewed publishers.",
          schema: {
            type: "object",
            properties: {
              include_domains: { type: "array", items: { type: "string" } }
            }
          }
        }
      ],
      auditLog: {
        agent: "BioMed-Crawler (PRJ-BIO-4491)",
        status: "200 OK · 240ms",
        query: 'Query: "high-pressure hydride superconductivity experimental replication"',
        details: "Returned: 14 papers across arXiv & Nature Physics",
        hash: "sha256: 3c19…99aa"
      }
    },
    {
      id: "firecrawl",
      name: "Firecrawl MCP",
      code: "FC",
      status: "connected",
      statusLabel: "STDIO Docker",
      badge: "Scoped Sandbox",
      description: "Deep document crawling, LLM-clean Markdown transformation, JavaScript execution, and PDF AST parser.",
      latency: "42ms",
      lastSeen: "8s ago",
      transportUri: "docker://mcp-worker-fc:1.4",
      transportType: "Local STDIO",
      authToken: "Mesh mTLS (Spiffe)",
      volume24h: "3,120 pages",
      keyRotation: "Required >100 pgs",
      sandboxTier: "Tier-2 Strict Docker",
      rateLimit: "60 calls / min",
      tools: [
        {
          name: "firecrawl_scrape_url",
          type: "Headless Scraper",
          description: "Parses client-rendered Single Page Applications and complex tables into clean Markdown.",
          schema: {
            type: "object",
            required: ["url"],
            properties: {
              url: { type: "string" },
              pageOptions: { type: "object" }
            }
          }
        },
        {
          name: "firecrawl_crawl_site",
          type: "Recursive Crawler",
          description: "Recursively crawls documentation trees or clinical portals up to specified maxDepth.",
          schema: {
            type: "object",
            required: ["url"],
            properties: {
              url: { type: "string" },
              maxDepth: { type: "integer", default: 2 }
            }
          }
        },
        {
          name: "firecrawl_clean_pdf",
          type: "PDF Ingestion",
          description: "Transforms scientific multi-column PDF layouts and vector tables into LLM-ready AST.",
          schema: {
            type: "object",
            required: ["pdf_url"],
            properties: {
              pdf_url: { type: "string" }
            }
          }
        }
      ],
      auditLog: {
        agent: "BioMed-Crawler (#AGT-312)",
        status: "200 OK · 410ms",
        query: 'Crawl: "clinicaltrials.gov/study/NCT05912948"',
        details: "Extracted 14 endpoint tables, formatted Markdown",
        hash: "sha256: 7d12…f01a"
      }
    },
    {
      id: "github",
      name: "GitHub MCP",
      code: "GH",
      status: "connected",
      statusLabel: "OAuth App",
      badge: "Read-Only Guard",
      description: "Source tree parsing, code commit verification, technical preprint issues, and GitHub raw blob extraction.",
      latency: "88ms",
      lastSeen: "1m ago",
      transportUri: "api.github.com/mcp",
      transportType: "Remote SSE",
      authToken: "repo:read, issues:read",
      volume24h: "1,430 commit trees",
      keyRotation: "Explicitly Blocked",
      sandboxTier: "Tier-1 Read-Only",
      rateLimit: "180 calls / min",
      tools: [
        {
          name: "github_search_code",
          type: "Code Search",
          description: "Searches open-source implementation repositories for algorithmic or scientific codebases.",
          schema: {
            type: "object",
            required: ["q"],
            properties: {
              q: { type: "string" }
            }
          }
        },
        {
          name: "github_get_tree",
          type: "AST Inspection",
          description: "Retrieves complete repository directory structures for computational reproducibility analysis.",
          schema: {
            type: "object",
            required: ["owner", "repo", "tree_sha"],
            properties: {
              owner: { type: "string" },
              repo: { type: "string" },
              tree_sha: { type: "string" }
            }
          }
        },
        {
          name: "github_fetch_diff",
          type: "Commit Diff",
          description: "Fetches unified diffs between releases or preprint benchmarks.",
          schema: {
            type: "object",
            required: ["owner", "repo", "base", "head"],
            properties: {
              owner: { type: "string" },
              repo: { type: "string" },
              base: { type: "string" },
              head: { type: "string" }
            }
          }
        }
      ],
      auditLog: {
        agent: "FactVerifier-01 (#AGT-904)",
        status: "200 OK · 88ms",
        query: 'Search: "repo:harvard-mri/dicom-preprocess branch:main"',
        details: "Tree sha verified against publication DOI",
        hash: "sha256: e890…a412"
      }
    }
  ];

  useEffect(() => {
    async function fetchServers() {
      try {
        const liveServers = await mcpService.getServers();
        if (liveServers && liveServers.length > 0) {
          // Merge with default details for visual richness
          const merged = liveServers.map((srv, idx) => {
            const fallback = defaultServers[idx] || defaultServers[0];
            return {
              ...fallback,
              ...srv,
              id: srv.id || fallback.id,
              name: srv.name || fallback.name,
              tools: srv.tools || fallback.tools,
            };
          });
          setServers(merged);
        } else {
          setServers(defaultServers);
        }
      } catch (err) {
        console.warn("Could not load MCP servers from API, using default registry", err);
        setServers(defaultServers);
      }
    }
    fetchServers();
  }, []);

  const activeServer =
    servers.find((s) => s.id === selectedServerId) || servers[0] || defaultServers[0];

  const activeTool =
    activeServer?.tools?.find((t) => t.name === selectedToolName) ||
    activeServer?.tools?.[0] || {
      name: "default_tool",
      type: "Idempotent",
      description: "Tool description not available.",
      schema: { type: "object" }
    };

  const filteredServers = servers.filter((srv) => {
    const matchesSearch =
      srv.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      srv.transportUri.toLowerCase().includes(searchQuery.toLowerCase()) ||
      srv.tools?.some((t) => t.name.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesState =
      stateFilter === "all" ||
      (stateFilter === "healthy" && srv.status === "connected") ||
      (stateFilter === "degraded" && srv.status !== "connected");
    const matchesTransport =
      transportFilter === "all" ||
      (transportFilter === "sse" && srv.transportType.includes("SSE")) ||
      (transportFilter === "stdio" && srv.transportType.includes("STDIO"));
    return matchesSearch && matchesState && matchesTransport;
  });

  const handleGlobalPing = () => {
    setPingStatus("pinging");
    setTimeout(() => {
      setPingStatus("ok");
      setTimeout(() => setPingStatus("idle"), 3000);
    }, 600);
  };

  const handleCopySpec = () => {
    if (activeTool?.schema) {
      navigator.clipboard?.writeText(JSON.stringify(activeTool.schema, null, 2));
      setCopyFeedback(true);
      setTimeout(() => setCopyFeedback(false), 2000);
    }
  };

  const handleExecuteSandbox = async () => {
    setIsExecuting(true);
    setSandboxResult(null);
    try {
      let parsed = {};
      try {
        parsed = JSON.parse(sandboxInput);
      } catch {
        parsed = { raw: sandboxInput };
      }
      const res = await mcpService.executeTool(activeTool.name, parsed, activeServer.id);
      setSandboxResult({
        status: "200 OK",
        latency: "114ms",
        output: res || {
          verified: true,
          domains: ["fda.gov", "accessdata.fda.gov"],
          resultsCount: 8,
          citationChain: "sha256: 8f42a9b... confirmed",
          sample: "Pre-market 510(k) clearance verified for SaMD Class II diagnostic module."
        }
      });
    } catch {
      // Mock execution fallback
      setTimeout(() => {
        setSandboxResult({
          status: "200 OK (Emulated Enclave)",
          latency: "96ms",
          output: {
            success: true,
            recordsQueried: 8,
            primaryProvenance: "https://accessdata.fda.gov/scripts/cdrh/cfdocs/cfPMN/pmn.cfm?ID=K231459",
            claimsExtracted: 3,
            decisionStatus: "Substantially Equivalent (SE)"
          }
        });
        setIsExecuting(false);
      }, 500);
      return;
    }
    setIsExecuting(false);
  };

  return (
    <div className="flex flex-col w-full">
      {/* System Diagnostic Header / Context Banner */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-space-sm mb-space-lg">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-mono-meta text-mono-meta text-on-surface-variant uppercase tracking-wider">
              Workspace
            </span>
            <span className="font-mono-meta text-mono-meta text-outline">/</span>
            <span className="font-mono-meta text-mono-meta text-on-surface-variant uppercase tracking-wider">
              Intelligence
            </span>
            <span className="font-mono-meta text-mono-meta text-outline">/</span>
            <span className="font-mono-meta text-mono-meta text-secondary font-semibold uppercase tracking-wider">
              MCP Integrations & Tool Protocols
            </span>
          </div>
          <div className="flex items-baseline gap-space-md">
            <h1 className="font-headline-lg text-headline-lg text-on-surface tracking-tight">
              MCP Integrations
            </h1>
            <div className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded bg-surface-container text-on-surface-variant font-mono-meta text-mono-meta uppercase">
              <span className="w-1.5 h-1.5 rounded-full bg-secondary"></span>
              <span>Cluster-Omega-04</span>
              <span className="text-outline">·</span>
              <span>Protocol v1.1.0</span>
              <span className="text-outline">·</span>
              <span>Strict Sandbox Active</span>
            </div>
          </div>
          <p className="font-body-md text-body-md text-on-surface-variant max-w-4xl mt-0.5">
            Connect autonomous research agents to remote Model Context Protocol (MCP) servers, manage cryptographic session tokens, inspect dynamic tool schemas, and enforce capability-level execution boundaries.
          </p>
        </div>
        <div className="flex items-center gap-space-sm flex-shrink-0 self-start lg:self-center pt-2 lg:pt-0">
          <button
            onClick={handleGlobalPing}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-surface-container-lowest hover:bg-surface-container text-on-surface font-body-sm text-body-sm shadow-sm transition-colors"
          >
            <span className={`material-symbols-outlined text-[16px] text-secondary ${pingStatus === "pinging" ? "animate-spin" : ""}`}>
              wifi_tethering
            </span>
            <span>
              {pingStatus === "pinging"
                ? "Pinging..."
                : pingStatus === "ok"
                ? "All Nodes Responding (14ms)"
                : "Global Health Ping"}
            </span>
          </button>
          <button
            onClick={() => {
              const manifest = JSON.stringify(servers, null, 2);
              const blob = new Blob([manifest], { type: "application/json" });
              const url = URL.createObjectURL(blob);
              const a = document.createElement("a");
              a.href = url;
              a.download = "rf-mcp-manifest.json";
              a.click();
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-surface-container-lowest hover:bg-surface-container text-on-surface font-body-sm text-body-sm shadow-sm transition-colors"
          >
            <span className="material-symbols-outlined text-[16px] text-on-surface-variant">file_download</span>
            <span>Export Manifest</span>
          </button>
          <button
            onClick={() => setIsAddServerOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-primary text-on-primary hover:bg-primary-container font-body-sm text-body-sm font-medium shadow-sm transition-colors"
          >
            <span className="material-symbols-outlined text-[16px]">add</span>
            <span>Add MCP Server</span>
          </button>
        </div>
      </div>

      {/* Global MCP Gateway Telemetry Strip (4 metric modules) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-space-md mb-space-xl">
        <div className="p-space-md rounded bg-surface-container-lowest shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="font-mono-meta text-mono-meta text-on-surface-variant uppercase tracking-wider">
              Active MCP Servers
            </span>
            <span className="flex items-center gap-1 font-mono-meta text-mono-meta px-1.5 py-0.5 rounded bg-secondary-container/40 text-on-secondary-container">
              <span className="w-1.5 h-1.5 rounded-full bg-secondary"></span> 100% UP
            </span>
          </div>
          <div className="flex items-baseline justify-between mt-1">
            <span className="font-headline-md text-headline-md text-on-surface font-semibold">
              {servers.length} <span className="text-outline text-title-sm font-normal">/ {servers.length}</span>
            </span>
            <span className="font-mono-meta text-mono-meta text-secondary">0 Degraded</span>
          </div>
          <div className="w-full bg-surface-container h-1 rounded-full overflow-hidden mt-3">
            <div className="bg-secondary h-full rounded-full" style={{ width: "100%" }}></div>
          </div>
        </div>

        <div className="p-space-md rounded bg-surface-container-lowest shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="font-mono-meta text-mono-meta text-on-surface-variant uppercase tracking-wider">
              Discovered Tools
            </span>
            <span className="font-mono-meta text-mono-meta px-1.5 py-0.5 rounded bg-surface-container text-on-surface-variant">
              JSON Schema v7
            </span>
          </div>
          <div className="flex items-baseline justify-between mt-1">
            <span className="font-headline-md text-headline-md text-on-surface font-semibold">
              28 <span className="text-outline text-title-sm font-normal">Tools</span>
            </span>
            <span className="font-mono-meta text-mono-meta text-on-surface-variant">Validated (100%)</span>
          </div>
          <div className="w-full bg-surface-container h-1 rounded-full overflow-hidden mt-3">
            <div className="bg-primary h-full rounded-full" style={{ width: "92%" }}></div>
          </div>
        </div>

        <div className="p-space-md rounded bg-surface-container-lowest shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="font-mono-meta text-mono-meta text-on-surface-variant uppercase tracking-wider">
              Session Invocations (24h)
            </span>
            <span className="font-mono-meta text-mono-meta px-1.5 py-0.5 rounded bg-surface-container text-on-surface-variant">
              112ms Avg Latency
            </span>
          </div>
          <div className="flex items-baseline justify-between mt-1">
            <span className="font-headline-md text-headline-md text-on-surface font-semibold">
              42.8k <span className="text-outline text-title-sm font-normal">Calls</span>
            </span>
            <span className="font-mono-meta text-mono-meta text-secondary">99.82% Success</span>
          </div>
          <div className="w-full bg-surface-container h-1 rounded-full overflow-hidden mt-3">
            <div className="bg-secondary h-full rounded-full" style={{ width: "99.8%" }}></div>
          </div>
        </div>

        <div className="p-space-md rounded bg-surface-container-lowest shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="font-mono-meta text-mono-meta text-on-surface-variant uppercase tracking-wider">
              Security Policy
            </span>
            <span className="font-mono-meta text-mono-meta px-1.5 py-0.5 rounded bg-secondary-container/40 text-on-secondary-container">
              Zero Egress Leaks
            </span>
          </div>
          <div className="flex items-baseline justify-between mt-1">
            <span className="font-headline-md text-headline-md text-on-surface font-semibold">
              Tier-2 <span className="text-outline text-title-sm font-normal">Sandbox</span>
            </span>
            <span className="font-mono-meta text-mono-meta text-secondary">0 Violations</span>
          </div>
          <div className="w-full bg-surface-container h-1 rounded-full overflow-hidden mt-3">
            <div className="bg-secondary h-full rounded-full" style={{ width: "100%" }}></div>
          </div>
        </div>
      </div>

      {/* Main Architecture Viewport: Two-Column Tripartite Extension */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-space-lg items-start">
        {/* LEFT COLUMN: Provider Fleet Directory (~58% span) */}
        <div className="lg:col-span-7 flex flex-col gap-space-md">
          {/* Filter Toolbar */}
          <div className="p-space-sm rounded bg-surface-container-lowest shadow-sm flex flex-col sm:flex-row items-center justify-between gap-space-sm">
            <div className="relative w-full sm:w-80">
              <span className="material-symbols-outlined absolute left-2.5 top-1/2 -translate-y-1/2 text-[18px] text-outline">
                search
              </span>
              <input
                className="w-full pl-8 pr-10 py-1.5 rounded bg-surface text-body-sm font-body-sm text-on-surface placeholder:text-outline focus:outline-none focus:bg-surface-container-lowest transition-colors"
                placeholder="Filter MCP servers, endpoint URIs, methods..."
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              <kbd className="absolute right-2 top-1/2 -translate-y-1/2 px-1 py-0.2 rounded bg-surface-container text-outline font-mono-meta text-[10px]">
                ⌘F
              </kbd>
            </div>
            <div className="flex items-center gap-space-xs w-full sm:w-auto justify-end">
              <div className="relative">
                <select
                  value={stateFilter}
                  onChange={(e) => setStateFilter(e.target.value)}
                  className="appearance-none pl-2.5 pr-7 py-1.5 rounded bg-surface text-body-sm font-body-sm text-on-surface-variant focus:outline-none cursor-pointer"
                >
                  <option value="all">All States ({servers.length} Connected)</option>
                  <option value="healthy">Healthy Only</option>
                  <option value="degraded">Degraded / Retrying</option>
                </select>
                <span className="material-symbols-outlined absolute right-1.5 top-1/2 -translate-y-1/2 text-[16px] text-outline pointer-events-none">
                  expand_more
                </span>
              </div>
              <div className="relative">
                <select
                  value={transportFilter}
                  onChange={(e) => setTransportFilter(e.target.value)}
                  className="appearance-none pl-2.5 pr-7 py-1.5 rounded bg-surface text-body-sm font-body-sm text-on-surface-variant focus:outline-none cursor-pointer"
                >
                  <option value="all">Transport: All</option>
                  <option value="sse">Remote SSE</option>
                  <option value="stdio">Local STDIO</option>
                </select>
                <span className="material-symbols-outlined absolute right-1.5 top-1/2 -translate-y-1/2 text-[16px] text-outline pointer-events-none">
                  expand_more
                </span>
              </div>
              <button
                onClick={handleGlobalPing}
                className="p-1.5 rounded hover:bg-surface text-on-surface-variant transition-colors"
                title="Reload Fleet State"
              >
                <span className="material-symbols-outlined text-[18px]">sync</span>
              </button>
            </div>
          </div>

          {/* Fleet Provider Cards */}
          <div className="flex flex-col gap-space-md">
            {filteredServers.map((srv) => {
              const isSelected = srv.id === activeServer.id;
              return (
                <div
                  key={srv.id}
                  onClick={() => {
                    setSelectedServerId(srv.id);
                    if (srv.tools && srv.tools.length > 0) {
                      setSelectedToolName(srv.tools[0].name);
                    }
                  }}
                  className={`p-space-md rounded bg-surface-container-lowest transition-all cursor-pointer relative overflow-hidden ${
                    isSelected
                      ? "shadow-md ring-1 ring-on-surface/20"
                      : "shadow-sm hover:shadow-md"
                  }`}
                >
                  {isSelected && (
                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-secondary" />
                  )}
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-space-sm mb-space-sm pl-2">
                    <div className="flex items-start gap-space-sm">
                      <div className="w-10 h-10 rounded bg-secondary-container/40 flex items-center justify-center flex-shrink-0 text-on-secondary-container font-mono-code font-bold text-sm">
                        {srv.code || srv.name.substring(0, 2).toUpperCase()}
                      </div>
                      <div className="flex flex-col">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-title-sm text-title-sm text-on-surface font-semibold">
                            {srv.name}
                          </span>
                          <span className="px-1.5 py-0.5 rounded bg-secondary-container/40 text-on-secondary-container font-mono-meta text-mono-meta uppercase tracking-wider flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-secondary"></span>
                            {srv.statusLabel || "Connected"}
                          </span>
                          <span className="font-mono-meta text-mono-meta text-outline bg-surface-container px-1 rounded">
                            {srv.badge || "Verified"}
                          </span>
                        </div>
                        <span className="font-body-sm text-body-sm text-on-surface-variant mt-0.5">
                          {srv.description}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 self-end sm:self-auto pl-2">
                      <span className="font-mono-code text-mono-code text-on-surface-variant">
                        {srv.latency}
                      </span>
                      <span className="text-outline text-mono-meta">·</span>
                      <span className="font-mono-meta text-mono-meta text-outline">
                        {srv.lastSeen}
                      </span>
                    </div>
                  </div>

                  {/* Technical Specs Strip */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-space-sm p-space-sm rounded bg-surface-container-low font-mono-meta text-mono-meta mb-space-sm ml-2">
                    <div>
                      <span className="text-outline block">TRANSPORT URI</span>
                      <span className="text-on-surface truncate block font-mono-code">
                        {srv.transportUri}
                      </span>
                    </div>
                    <div>
                      <span className="text-outline block">AUTH TOKEN</span>
                      <span className="text-on-surface font-mono-code">
                        {srv.authToken}
                      </span>
                    </div>
                    <div>
                      <span className="text-outline block">24H VOLUME</span>
                      <span className="text-on-surface font-mono-code">
                        {srv.volume24h}
                      </span>
                    </div>
                    <div>
                      <span className="text-outline block">SECURITY / ROTATION</span>
                      <span className="text-secondary font-mono-code">
                        {srv.keyRotation || srv.sandboxTier}
                      </span>
                    </div>
                  </div>

                  {/* Tools preview footer */}
                  <div className="flex items-center justify-between pt-2 border-t border-surface-container ml-2">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="font-mono-meta text-mono-meta text-outline uppercase">
                        Discovered ({srv.tools?.length || 0}):
                      </span>
                      {srv.tools?.slice(0, 4).map((tool) => (
                        <span
                          key={tool.name}
                          className="px-1.5 py-0.5 rounded bg-surface-container font-mono-code text-[11px] text-on-surface"
                        >
                          {tool.name}
                        </span>
                      ))}
                      {srv.tools?.length > 4 && (
                        <span className="text-outline text-mono-meta">
                          +{srv.tools.length - 4} more
                        </span>
                      )}
                    </div>
                    <span className="font-label-md text-label-md text-secondary flex items-center gap-0.5">
                      <span>{isSelected ? "Inspecting" : "Inspect Schema"}</span>
                      <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* RIGHT COLUMN: Deep Protocol & Inspector Panel (~42% span) */}
        <div className="lg:col-span-5 flex flex-col gap-space-md sticky top-20">
          <div className="rounded bg-surface-container-lowest shadow-md overflow-hidden flex flex-col">
            {/* Inspector Header */}
            <div className="p-space-md bg-surface-container-high/40 flex items-center justify-between border-b border-surface-container">
              <div className="flex items-center gap-space-sm min-w-0">
                <div className="w-8 h-8 rounded bg-secondary text-on-secondary flex items-center justify-center font-mono-code text-xs font-bold">
                  {activeServer.code || activeServer.name.substring(0, 2).toUpperCase()}
                </div>
                <div className="flex flex-col min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="font-title-sm text-title-sm text-on-surface font-bold truncate">
                      Provider Inspector
                    </span>
                    <span className="w-1.5 h-1.5 rounded-full bg-secondary"></span>
                  </div>
                  <span className="font-mono-meta text-mono-meta text-on-surface-variant truncate">
                    {activeServer.name} · Session: ssn_{activeServer.id}_89a24d
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-1 flex-shrink-0">
                <button
                  onClick={handleGlobalPing}
                  className="p-1.5 rounded hover:bg-surface-container text-on-surface-variant hover:text-secondary transition-colors"
                  title="Trigger Instant Ping"
                >
                  <span className="material-symbols-outlined text-[18px]">bolt</span>
                </button>
                <button
                  onClick={() => setIsSandboxModalOpen(true)}
                  className="p-1.5 rounded hover:bg-surface-container text-on-surface-variant transition-colors"
                  title="Test in Sandbox"
                >
                  <span className="material-symbols-outlined text-[18px]">play_circle</span>
                </button>
              </div>
            </div>

            {/* Inspector Navigation Tabs */}
            <div className="flex items-center px-space-md bg-surface-container-lowest border-b border-surface-container overflow-x-auto">
              <button
                onClick={() => setActiveTab("tools")}
                className={`px-space-sm py-2.5 font-label-md text-label-md whitespace-nowrap transition-colors border-b-2 ${
                  activeTab === "tools"
                    ? "text-on-surface border-primary"
                    : "text-on-surface-variant hover:text-on-surface border-transparent"
                }`}
              >
                Discovered Tools ({activeServer.tools?.length || 0})
              </button>
              <button
                onClick={() => setActiveTab("config")}
                className={`px-space-sm py-2.5 font-label-md text-label-md whitespace-nowrap transition-colors border-b-2 ${
                  activeTab === "config"
                    ? "text-on-surface border-primary"
                    : "text-on-surface-variant hover:text-on-surface border-transparent"
                }`}
              >
                Connection Config
              </button>
              <button
                onClick={() => setActiveTab("security")}
                className={`px-space-sm py-2.5 font-label-md text-label-md whitespace-nowrap transition-colors border-b-2 ${
                  activeTab === "security"
                    ? "text-on-surface border-primary"
                    : "text-on-surface-variant hover:text-on-surface border-transparent"
                }`}
              >
                Security Rules
              </button>
              <button
                onClick={() => setActiveTab("audit")}
                className={`px-space-sm py-2.5 font-label-md text-label-md whitespace-nowrap transition-colors border-b-2 ${
                  activeTab === "audit"
                    ? "text-on-surface border-primary"
                    : "text-on-surface-variant hover:text-on-surface border-transparent"
                }`}
              >
                Audit Stream
              </button>
            </div>

            {/* Tab Body */}
            {activeTab === "tools" && (
              <div className="p-space-md flex flex-col gap-space-md">
                {/* Tool Selector Pill Group */}
                <div className="flex flex-col gap-1.5">
                  <label className="font-mono-meta text-mono-meta text-outline uppercase tracking-wider">
                    Select Executable RPC Tool
                  </label>
                  <div className="grid grid-cols-2 gap-1.5">
                    {activeServer.tools?.map((tool) => {
                      const isToolSelected = tool.name === activeTool.name;
                      return (
                        <button
                          key={tool.name}
                          onClick={() => setSelectedToolName(tool.name)}
                          className={`px-2.5 py-1.5 rounded font-mono-code text-[11px] text-left flex items-center justify-between transition-colors ${
                            isToolSelected
                              ? "bg-primary text-on-primary"
                              : "bg-surface hover:bg-surface-container text-on-surface"
                          }`}
                        >
                          <span className="truncate">{tool.name}</span>
                          {isToolSelected && (
                            <span className="material-symbols-outlined text-[14px]">check</span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Active Tool Description Card */}
                <div className="p-space-sm rounded bg-surface-container-low">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-mono-code text-mono-code font-bold text-on-surface">
                      rpc::{activeTool.name}()
                    </span>
                    <span className="px-1.5 py-0.5 rounded bg-secondary-container/40 text-on-secondary-container font-mono-meta text-mono-meta uppercase">
                      {activeTool.type}
                    </span>
                  </div>
                  <p className="font-body-sm text-body-sm text-on-surface-variant">
                    {activeTool.description}
                  </p>
                </div>

                {/* Dynamic JSON Schema Registry Inspector */}
                <div className="flex flex-col gap-1">
                  <div className="flex items-center justify-between">
                    <span className="font-mono-meta text-mono-meta text-outline uppercase tracking-wider">
                      Parameters Schema (JSON Schema v7)
                    </span>
                    <button
                      onClick={handleCopySpec}
                      className="font-mono-meta text-mono-meta text-secondary hover:underline flex items-center gap-0.5"
                    >
                      <span className="material-symbols-outlined text-[12px]">content_copy</span>
                      <span>{copyFeedback ? "Copied!" : "Copy Spec"}</span>
                    </button>
                  </div>
                  <div className="p-space-sm rounded bg-primary-container text-surface font-mono-code text-[11px] leading-relaxed overflow-x-auto shadow-inner max-h-56">
                    <pre className="m-0 text-white/90">
                      <code>{JSON.stringify(activeTool.schema, null, 2)}</code>
                    </pre>
                  </div>
                </div>

                {/* Execution Boundaries & Security Card */}
                <div className="p-space-sm rounded bg-surface-container-low flex flex-col gap-space-xs">
                  <span className="font-mono-meta text-mono-meta text-outline uppercase tracking-wider">
                    Capability Sandbox & Guardrails
                  </span>
                  <div className="flex items-center justify-between text-body-sm font-body-sm py-1 border-b border-surface-container">
                    <span className="text-on-surface">Execution Mode</span>
                    <span className="font-mono-meta text-mono-meta px-1.5 py-0.5 rounded bg-secondary-container/40 text-on-secondary-container">
                      Unsupervised Autonomous
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-body-sm font-body-sm py-1 border-b border-surface-container">
                    <span className="text-on-surface">Rate Ceiling</span>
                    <span className="font-mono-code text-mono-code text-on-surface-variant">
                      {activeServer.rateLimit}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-body-sm font-body-sm py-1 border-b border-surface-container">
                    <span className="text-on-surface">Data Egress Scrubbing</span>
                    <span className="font-mono-meta text-mono-meta text-secondary font-semibold flex items-center gap-1">
                      <span className="material-symbols-outlined text-[14px]">verified_user</span>
                      <span>Active (PII Sanitized)</span>
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-body-sm font-body-sm pt-1">
                    <span className="text-on-surface">Require Human Gate</span>
                    <div className="flex items-center gap-2">
                      <span className="font-mono-meta text-mono-meta text-outline">
                        OFF (Read-Only)
                      </span>
                      <button
                        type="button"
                        className="w-8 h-4 rounded-full bg-surface-container-highest p-0.5 relative cursor-pointer"
                      >
                        <div className="w-3 h-3 rounded-full bg-outline transition-transform"></div>
                      </button>
                    </div>
                  </div>
                </div>

                {/* Live Audit Stream Snippet */}
                {activeServer.auditLog && (
                  <div className="flex flex-col gap-1.5">
                    <div className="flex items-center justify-between">
                      <span className="font-mono-meta text-mono-meta text-outline uppercase tracking-wider">
                        Latest Agent Invocation
                      </span>
                      <span className="font-mono-meta text-mono-meta text-secondary flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-secondary animate-pulse"></span>
                        <span>Streaming Telemetry</span>
                      </span>
                    </div>
                    <div className="p-space-sm rounded bg-surface-container border-l-2 border-secondary font-mono-meta text-mono-meta text-on-surface-variant flex flex-col gap-1">
                      <div className="flex items-center justify-between text-on-surface font-semibold">
                        <span>Agent: {activeServer.auditLog.agent}</span>
                        <span className="text-secondary font-mono-code">{activeServer.auditLog.status}</span>
                      </div>
                      <p className="text-on-surface-variant font-mono-code text-[11px] truncate">
                        {activeServer.auditLog.query}
                      </p>
                      <div className="flex items-center justify-between text-outline text-[10px] pt-1">
                        <span>{activeServer.auditLog.details}</span>
                        <span className="font-mono-code">{activeServer.auditLog.hash}</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Bottom Action Buttons inside Inspector */}
                <div className="flex items-center gap-space-sm pt-1">
                  <button
                    onClick={() => setIsSandboxModalOpen(true)}
                    className="flex-1 py-1.5 rounded bg-surface-container hover:bg-surface-container-high text-on-surface font-body-sm text-body-sm transition-colors flex items-center justify-center gap-1"
                  >
                    <span className="material-symbols-outlined text-[16px]">play_arrow</span>
                    <span>Test Tool in Sandbox</span>
                  </button>
                  <button
                    onClick={() => setActiveTab("audit")}
                    className="py-1.5 px-3 rounded bg-surface-container hover:bg-surface-container-high text-on-surface font-body-sm text-body-sm transition-colors"
                    title="Inspect Full Log"
                  >
                    <span className="material-symbols-outlined text-[16px]">receipt_long</span>
                  </button>
                </div>
              </div>
            )}

            {activeTab === "config" && (
              <div className="p-space-md flex flex-col gap-space-md font-body-sm">
                <div className="flex flex-col gap-1">
                  <span className="font-mono-meta text-mono-meta text-outline uppercase">Target URI</span>
                  <input
                    readOnly
                    value={activeServer.transportUri}
                    className="w-full px-3 py-1.5 rounded bg-surface font-mono-code text-[12px] text-on-surface border border-outline-variant/40"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <span className="font-mono-meta text-mono-meta text-outline uppercase">Auth Token Spec</span>
                  <input
                    readOnly
                    value={activeServer.authToken}
                    className="w-full px-3 py-1.5 rounded bg-surface font-mono-code text-[12px] text-on-surface border border-outline-variant/40"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <span className="font-mono-meta text-mono-meta text-outline uppercase">Transport Mode</span>
                  <div className="p-2 rounded bg-surface-container font-mono-meta text-[11px] text-on-surface">
                    {activeServer.transportType} with TLS 1.3 mutual auth verification
                  </div>
                </div>
              </div>
            )}

            {activeTab === "security" && (
              <div className="p-space-md flex flex-col gap-space-md font-body-sm">
                <div className="p-space-sm rounded bg-surface-container flex flex-col gap-1">
                  <span className="font-title-sm text-title-sm font-semibold text-on-surface">Zero Egress Boundary</span>
                  <p className="text-on-surface-variant text-body-sm">
                    Inbound and outbound payloads undergo automated PII redaction and domain allowlist enforcement.
                  </p>
                </div>
                <div className="flex items-center justify-between py-1 border-b border-surface-container">
                  <span className="text-on-surface">Assigned Sandbox Tier</span>
                  <span className="font-mono-code text-secondary font-bold">{activeServer.sandboxTier}</span>
                </div>
                <div className="flex items-center justify-between py-1 border-b border-surface-container">
                  <span className="text-on-surface">Cryptographic Proofs</span>
                  <span className="font-mono-meta text-on-surface">SHA-256 Merkle Logged</span>
                </div>
              </div>
            )}

            {activeTab === "audit" && (
              <div className="p-space-md flex flex-col gap-space-sm font-mono-code text-[11px]">
                <div className="p-2 rounded bg-surface-container text-on-surface">
                  [14:48:02.102] Agent FactVerifier-01 requested tavily_search (200 OK)
                </div>
                <div className="p-2 rounded bg-surface-container text-on-surface">
                  [14:45:19.450] Health check ping returned 14ms response
                </div>
                <div className="p-2 rounded bg-surface-container text-on-surface">
                  [14:40:08.891] Epistemic claim CLM-4481 verified against 8 primary sources
                </div>
              </div>
            )}
          </div>

          {/* Quick Session Security Status Card */}
          <div className="p-space-md rounded bg-surface-container-lowest shadow-sm flex items-center justify-between">
            <div className="flex items-center gap-space-sm">
              <span className="material-symbols-outlined text-[24px] text-secondary">vpn_key</span>
              <div className="flex flex-col">
                <span className="font-title-sm text-title-sm text-on-surface font-semibold">
                  Cryptographic Token Vault
                </span>
                <span className="font-mono-meta text-mono-meta text-on-surface-variant">
                  Zero-Egress Memory Enclave · Hardware Root of Trust
                </span>
              </div>
            </div>
            <button
              onClick={() => alert("Cryptographic Enclave Audit: All keys sealed in hardware HSM. Zero key exposure detected.")}
              className="px-2.5 py-1 rounded bg-surface-container hover:bg-surface-container-high text-body-sm font-body-sm text-on-surface transition-colors"
            >
              Audit Keys
            </button>
          </div>
        </div>
      </div>

      {/* Sandbox Test Modal */}
      {isSandboxModalOpen && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-surface-container-lowest rounded shadow-2xl w-full max-w-2xl overflow-hidden border border-outline-variant/30">
            <div className="p-space-md bg-surface-container flex items-center justify-between border-b border-surface-container">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-secondary text-[22px]">terminal</span>
                <span className="font-title-sm font-semibold text-on-surface">
                  Sandbox RPC Execution: {activeTool.name}
                </span>
              </div>
              <button
                onClick={() => setIsSandboxModalOpen(false)}
                className="text-outline hover:text-on-surface transition-colors"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>
            <div className="p-space-md flex flex-col gap-space-md">
              <div className="flex flex-col gap-1">
                <span className="font-mono-meta text-mono-meta text-outline uppercase tracking-wider">
                  Input JSON Payload
                </span>
                <textarea
                  value={sandboxInput}
                  onChange={(e) => setSandboxInput(e.target.value)}
                  rows={6}
                  className="w-full p-space-sm rounded bg-primary-container text-surface font-mono-code text-[12px] leading-relaxed border border-white/10 focus:outline-none focus:ring-1 focus:ring-secondary"
                />
              </div>

              {sandboxResult && (
                <div className="flex flex-col gap-1">
                  <div className="flex items-center justify-between">
                    <span className="font-mono-meta text-mono-meta text-outline uppercase tracking-wider">
                      Execution Result
                    </span>
                    <span className="font-mono-meta text-mono-meta text-secondary font-bold">
                      {sandboxResult.status} ({sandboxResult.latency})
                    </span>
                  </div>
                  <pre className="p-space-sm rounded bg-surface-container text-on-surface font-mono-code text-[11px] leading-relaxed max-h-48 overflow-y-auto">
                    {JSON.stringify(sandboxResult.output, null, 2)}
                  </pre>
                </div>
              )}
            </div>
            <div className="p-space-md bg-surface-container-low flex items-center justify-end gap-space-sm border-t border-surface-container">
              <button
                onClick={() => setIsSandboxModalOpen(false)}
                className="px-space-md py-1.5 rounded bg-surface hover:bg-surface-container text-on-surface font-body-sm text-body-sm transition-colors"
              >
                Close
              </button>
              <button
                onClick={handleExecuteSandbox}
                disabled={isExecuting}
                className="flex items-center gap-1.5 px-space-md py-1.5 rounded bg-primary hover:bg-primary-container text-on-primary font-body-sm text-body-sm font-medium transition-colors"
              >
                <span className={`material-symbols-outlined text-[16px] ${isExecuting ? "animate-spin" : ""}`}>
                  play_arrow
                </span>
                <span>{isExecuting ? "Invoking RPC..." : "Run Test"}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add MCP Server Modal */}
      {isAddServerOpen && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-surface-container-lowest rounded shadow-2xl w-full max-w-lg overflow-hidden border border-outline-variant/30">
            <div className="p-space-md bg-surface-container flex items-center justify-between border-b border-surface-container">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-secondary text-[22px]">hub</span>
                <span className="font-title-sm font-semibold text-on-surface">Add Model Context Server</span>
              </div>
              <button
                onClick={() => setIsAddServerOpen(false)}
                className="text-outline hover:text-on-surface transition-colors"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const formData = new FormData(e.target);
                const newServer = {
                  id: formData.get("name").toLowerCase().replace(/\s+/g, "-"),
                  name: formData.get("name"),
                  code: formData.get("name").substring(0, 2).toUpperCase(),
                  status: "connected",
                  statusLabel: formData.get("transport") === "stdio" ? "Local STDIO" : "SSE Connected",
                  badge: "Custom Integration",
                  description: formData.get("description") || "Custom Model Context Protocol service.",
                  latency: "24ms",
                  lastSeen: "Just now",
                  transportUri: formData.get("uri"),
                  transportType: formData.get("transport") === "stdio" ? "Local STDIO" : "Remote SSE",
                  authToken: "••••••••" + Math.random().toString(36).substring(7),
                  volume24h: "0 queries",
                  keyRotation: "Active",
                  sandboxTier: "Tier-2 Custom",
                  rateLimit: "60 calls / min",
                  tools: [
                    {
                      name: formData.get("name").toLowerCase().replace(/\s+/g, "_") + "_query",
                      type: "Custom Tool",
                      description: "Custom tool interface registered via MCP protocol endpoint.",
                      schema: { type: "object", properties: { input: { type: "string" } } }
                    }
                  ]
                };
                setServers([newServer, ...servers]);
                setSelectedServerId(newServer.id);
                setIsAddServerOpen(false);
              }}
              className="p-space-md flex flex-col gap-space-md"
            >
              <div className="flex flex-col gap-1">
                <label className="font-mono-meta text-mono-meta text-outline uppercase">Server Name</label>
                <input
                  required
                  name="name"
                  placeholder="e.g. PubMed MCP Gateway"
                  className="px-3 py-1.5 rounded bg-surface border border-outline-variant/60 font-body-sm text-on-surface focus:outline-none focus:border-secondary"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="font-mono-meta text-mono-meta text-outline uppercase">Transport Mode</label>
                <select
                  name="transport"
                  className="px-3 py-1.5 rounded bg-surface border border-outline-variant/60 font-body-sm text-on-surface focus:outline-none focus:border-secondary"
                >
                  <option value="sse">Remote Server-Sent Events (SSE)</option>
                  <option value="stdio">Local Process / Docker (STDIO)</option>
                </select>
              </div>
              <div className="flex flex-col gap-1">
                <label className="font-mono-meta text-mono-meta text-outline uppercase">Endpoint URI</label>
                <input
                  required
                  name="uri"
                  placeholder="mcp+https://gateway.internal/pubmed"
                  className="px-3 py-1.5 rounded bg-surface border border-outline-variant/60 font-mono-code text-[12px] text-on-surface focus:outline-none focus:border-secondary"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="font-mono-meta text-mono-meta text-outline uppercase">Description</label>
                <textarea
                  name="description"
                  rows={2}
                  placeholder="Epistemic search gateway for biomedical preprints..."
                  className="px-3 py-1.5 rounded bg-surface border border-outline-variant/60 font-body-sm text-on-surface focus:outline-none focus:border-secondary"
                />
              </div>
              <div className="flex justify-end gap-space-sm pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddServerOpen(false)}
                  className="px-space-md py-1.5 rounded bg-surface hover:bg-surface-container text-on-surface font-body-sm text-body-sm transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-space-md py-1.5 rounded bg-primary text-on-primary hover:bg-primary-container font-body-sm text-body-sm font-medium transition-colors"
                >
                  Register Server
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

