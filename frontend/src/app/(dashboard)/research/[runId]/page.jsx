"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { researchService } from "../../../../services/researchService";

export default function LiveExecutionPage() {
  const params = useParams();
  const router = useRouter();
  const runId = params?.runId || "run-demo-01";

  const [run, setRun] = useState(null);
  const [events, setEvents] = useState([]);
  const [sources, setSources] = useState([]);
  const [evidence, setEvidence] = useState([]);
  const [plan, setPlan] = useState(null);
  const [activeTab, setActiveTab] = useState("overview"); // overview | plan | swarm | sources | evidence | logs
  const [eventFilter, setEventFilter] = useState("all"); // all | agent | tool | contradiction | citation
  const [isPaused, setIsPaused] = useState(false);
  const [isAutoScroll, setIsAutoScroll] = useState(true);
  const [approvalFeedback, setApprovalFeedback] = useState("");
  const [approving, setApproving] = useState(false);
  const [secondsElapsed, setSecondsElapsed] = useState(272);

  const logContainerRef = useRef(null);

  // Initial Data Fetch
  useEffect(() => {
    async function loadRunData() {
      try {
        const [runData, eventsData, sourcesData, evidenceData, planData] =
          await Promise.allSettled([
            researchService.getRun(runId),
            researchService.getEvents(runId),
            researchService.getSources(runId),
            researchService.getEvidence(runId),
            researchService.getPlan(runId),
          ]);

        if (runData.status === "fulfilled" && runData.value) {
          setRun(runData.value);
        } else {
          // Fallback state
          setRun({
            id: runId,
            title:
              "The Future of AI in Healthcare: Autonomous Diagnostic Systems & FDA Regulatory Precedents (2024–2028)",
            status: "RUNNING",
            depth: "DEEP",
            sourcesCount: 38,
            claimsCount: 42,
            confidence: 94.8,
            createdAt: new Date().toISOString(),
          });
        }

        if (eventsData.status === "fulfilled" && Array.isArray(eventsData.value)) {
          setEvents(eventsData.value);
        } else {
          setEvents([
            {
              id: "ev-1",
              timestamp: "14:42:38",
              agent: "Evidence Extractor",
              type: "agent_thought",
              message:
                "Synthesized efficacy metrics table from 4 clinical trial cohorts. Corroborated cross-device variance of 14% in MRI scans.",
              tag: "TRIAL_DATASET_v4",
            },
            {
              id: "ev-2",
              timestamp: "14:42:10",
              agent: "Contradiction Detector",
              type: "error",
              isContradiction: true,
              message:
                "Flagged potential contradiction in JAMA Oncology preprint (DOI: 10.1001/jama.2024.1102) regarding specificity claims vs FDA predicate device benchmark.",
              tag: "CONTRADICTION DETECTED",
            },
            {
              id: "ev-3",
              timestamp: "14:41:05",
              agent: "Source Extractor",
              type: "agent_thought",
              message:
                "Extracted 18 peer-reviewed clinical trial benchmarks from PubMed Central database. Normalized efficacy metrics table.",
              tag: "18 PREPRINTS",
            },
            {
              id: "ev-4",
              timestamp: "14:39:48",
              agent: "BioMed-Crawler",
              type: "tool_call",
              message:
                "Indexed 24 FDA 510(k) clearances database records for AI-enabled diagnostic radiology software. Parsed predicate device chains.",
              tag: "FDA_510K",
            },
            {
              id: "ev-5",
              timestamp: "14:38:12",
              agent: "Lead Orchestrator",
              type: "agent_thought",
              message:
                "Hypothesis roadmap approved. Deployed 4 sub-agents with 15k token context limit per research leaf.",
              tag: "INIT_COMPLETE",
            },
          ]);
        }

        if (sourcesData.status === "fulfilled" && Array.isArray(sourcesData.value)) {
          setSources(sourcesData.value);
        }

        if (evidenceData.status === "fulfilled" && Array.isArray(evidenceData.value)) {
          setEvidence(evidenceData.value);
        }

        if (planData.status === "fulfilled" && planData.value) {
          setPlan(planData.value);
        }
      } catch (err) {
        console.warn("Live execution init err:", err);
      }
    }

    loadRunData();

    // SSE Stream Subscription
    const unsubscribe = researchService.subscribeToRunStream(
      runId,
      (event) => {
        if (!event) return;
        setEvents((prev) => [
          {
            id: event.id || `ev-${Date.now()}`,
            timestamp: new Date().toLocaleTimeString(),
            agent: event.agent || "Worker Swarm",
            type: event.type || "agent_thought",
            message: event.message || JSON.stringify(event.payload || {}),
            tag: event.type?.toUpperCase() || "UPDATE",
          },
          ...prev,
        ]);

        if (event.type === "run_status_changed" && event.payload?.status) {
          setRun((r) => (r ? { ...r, status: event.payload.status } : null));
        }
      },
      (err) => {
        console.warn("SSE stream notice:", err);
      }
    );

    // Elapsed timer ticking
    const timer = setInterval(() => {
      setSecondsElapsed((prev) => prev + 1);
    }, 1000);

    return () => {
      unsubscribe();
      clearInterval(timer);
    };
  }, [runId]);

  // Auto-scroll log stream
  useEffect(() => {
    if (isAutoScroll && logContainerRef.current) {
      logContainerRef.current.scrollTop = 0;
    }
  }, [events, isAutoScroll]);

  const handlePauseToggle = async () => {
    try {
      if (isPaused) {
        await researchService.resumeRun(runId);
        setIsPaused(false);
      } else {
        await researchService.pauseRun(runId);
        setIsPaused(true);
      }
    } catch {
      setIsPaused(!isPaused);
    }
  };

  const handleCancelRun = async () => {
    if (confirm("Are you sure you want to terminate this autonomous research run?")) {
      try {
        await researchService.cancelRun(runId);
        setRun((r) => (r ? { ...r, status: "CANCELLED" } : null));
      } catch {
        setRun((r) => (r ? { ...r, status: "CANCELLED" } : null));
      }
    }
  };

  const handleApprovePlan = async () => {
    setApproving(true);
    try {
      if (plan?.id) {
        await researchService.approvePlan(plan.id, approvalFeedback);
      }
      setRun((r) => (r ? { ...r, status: "RUNNING" } : null));
    } catch (err) {
      console.warn("Approve plan error:", err);
      setRun((r) => (r ? { ...r, status: "RUNNING" } : null));
    } finally {
      setApproving(false);
    }
  };

  const formatElapsed = (sec) => {
    const mins = String(Math.floor(sec / 60)).padStart(2, "0");
    const s = String(sec % 60).padStart(2, "0");
    return `${mins}m ${s}s`;
  };

  const filteredEvents = events.filter((ev) => {
    if (eventFilter === "all") return true;
    if (eventFilter === "agent") return ev.type === "agent_thought";
    if (eventFilter === "tool") return ev.type === "tool_call";
    if (eventFilter === "contradiction") return ev.isContradiction || ev.type === "error";
    if (eventFilter === "citation") return ev.tag?.includes("PREPRINT") || ev.tag?.includes("DATASET");
    return true;
  });

  const isWaitingApproval = run?.status === "WAITING_FOR_APPROVAL";

  return (
    <div className="flex flex-col w-full gap-space-md">
      {/* Top Level Metadata Header Bar */}
      <header className="bg-surface-container-lowest p-space-md shadow-sm rounded-lg border border-outline-variant/40 flex flex-col gap-space-sm">
        <div className="flex flex-wrap items-center justify-between gap-space-sm">
          <div className="flex items-center gap-space-xs font-mono-meta text-mono-meta text-on-surface-variant uppercase tracking-wider">
            <Link className="hover:text-primary transition-colors" href="/dashboard">
              Workspace
            </Link>
            <span className="text-outline-variant">/</span>
            <Link className="hover:text-primary transition-colors" href="/history">
              Active Runs
            </Link>
            <span className="text-outline-variant">/</span>
            <span className="text-primary font-semibold">#{runId.slice(0, 8)}</span>
          </div>

          {/* Action Controls Group */}
          <div className="flex items-center gap-space-xs">
            <button
              type="button"
              onClick={handlePauseToggle}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-surface-container hover:bg-surface-container-high transition-colors font-label-md text-label-md text-on-surface border border-outline-variant/30"
            >
              <span className="material-symbols-outlined text-[16px]">
                {isPaused ? "play_arrow" : "pause"}
              </span>
              <span>{isPaused ? "Resume Swarm" : "Pause Swarm"}</span>
            </button>
            <button
              type="button"
              onClick={handleCancelRun}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-surface-container hover:bg-error-container hover:text-on-error-container transition-colors font-label-md text-label-md text-on-surface-variant border border-outline-variant/30"
            >
              <span className="material-symbols-outlined text-[16px]">cancel</span>
              <span>Cancel Run</span>
            </button>
            <Link
              href={`/reports/${runId}`}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-primary text-on-primary hover:bg-primary-container transition-all font-label-md text-label-md font-semibold shadow-sm"
            >
              <span className="material-symbols-outlined text-[16px]">article</span>
              <span>Dossier Live Draft</span>
            </Link>
          </div>
        </div>

        {/* Title & Status Line */}
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-space-md">
          <div className="flex flex-col gap-1 max-w-4xl">
            <h1 className="font-headline-md text-headline-md text-primary tracking-tight">
              {run?.title || run?.query || "The Future of AI in Healthcare: Autonomous Diagnostic Systems"}
            </h1>
            <div className="flex flex-wrap items-center gap-x-space-md gap-y-1 font-mono-meta text-mono-meta text-on-surface-variant">
              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-secondary-container/40 text-on-secondary-container font-semibold border border-secondary/30">
                <span className="w-1.5 h-1.5 rounded-full bg-secondary animate-pulse" />
                {run?.status || "RUNNING"}
              </span>
              <span className="flex items-center gap-1">
                <span className="text-outline">RUN:</span>
                <span className="text-primary font-medium">#{runId.slice(0, 8)}</span>
              </span>
              <span className="flex items-center gap-1">
                <span className="text-outline">ORIGIN:</span>
                <span>
                  Elapsed <span className="text-primary font-medium">{formatElapsed(secondsElapsed)}</span>
                </span>
              </span>
              <span className="flex items-center gap-1">
                <span className="text-outline">TARGET:</span>
                <span className="text-primary">14-page Executive Dossier &amp; BibTeX Graph</span>
              </span>
            </div>
          </div>

          {/* Quick Metrics Strip */}
          <div className="flex items-center gap-space-sm bg-surface-container-low px-space-md py-2 rounded border border-outline-variant/30">
            <div className="flex flex-col">
              <span className="font-mono-meta text-mono-meta text-outline uppercase">Triangulation Rate</span>
              <span className="font-title-sm text-title-sm text-primary font-bold">
                14.2 <span className="font-mono-meta text-mono-meta font-normal text-on-surface-variant">pages/sec</span>
              </span>
            </div>
            <div className="h-6 w-px bg-outline-variant/60" />
            <div className="flex flex-col">
              <span className="font-mono-meta text-mono-meta text-outline uppercase">Synthesis Depth</span>
              <span className="font-title-sm text-title-sm text-secondary font-bold">
                Tier-IV <span className="font-mono-meta text-mono-meta font-normal text-on-surface-variant">(Precedent)</span>
              </span>
            </div>
          </div>
        </div>

        {/* Navigation Tabs Bar */}
        <nav aria-label="Run Subsections" className="flex items-center gap-space-xs mt-2 overflow-x-auto">
          {[
            { id: "overview", label: "Overview" },
            { id: "plan", label: "Execution Plan" },
            { id: "swarm", label: "Agent Swarm", count: 9 },
            { id: "sources", label: "Sources Discovered", count: sources.length || 38 },
            { id: "evidence", label: "Evidence & Claims", count: evidence.length || 14 },
            { id: "logs", label: "Raw Telemetry & Logs" },
          ].map((tab) => {
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-1 px-space-md py-2 rounded font-label-md text-label-md transition-all ${
                  active
                    ? "bg-surface-container text-primary font-bold shadow-xs"
                    : "hover:bg-surface-container-high text-on-surface-variant"
                }`}
              >
                <span>{tab.label}</span>
                {tab.count !== undefined && (
                  <span className="px-1.5 py-0.2 rounded bg-surface-container-highest text-on-surface text-[10px] font-mono-meta">
                    {tab.count}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </header>

      {/* Human-in-the-Loop Plan Review Banner (shown when WAITING_FOR_APPROVAL or in Plan tab) */}
      {(isWaitingApproval || activeTab === "plan") && (
        <section className="bg-secondary/10 border-2 border-secondary rounded-lg p-space-md shadow-md flex flex-col gap-space-sm animate-fadeIn">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-secondary text-[24px]">rule</span>
              <h3 className="font-title-sm text-title-sm text-on-surface font-bold">
                Human-in-the-Loop Plan Review Required
              </h3>
            </div>
            <span className="px-2 py-0.5 rounded bg-secondary text-on-secondary font-mono-meta text-[10px] uppercase font-bold">
              GATE ACTIVE
            </span>
          </div>
          <p className="font-body-sm text-body-sm text-on-surface-variant">
            The Planner Agent has decomposed your research goal into 6 concurrent task leaves. Review the task
            parameters below, append guidance or modifications, and authorize execution.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-2 py-1">
            <div className="p-2.5 rounded bg-surface-container-lowest border border-outline-variant/50">
              <span className="font-mono-meta text-[10px] text-secondary font-bold uppercase">Task 1 · arXiv</span>
              <p className="font-body-sm text-[12px] text-on-surface mt-1">
                Retrieve 2024–2026 preprints on neutral-atom &amp; qubit coherence benchmarks.
              </p>
            </div>
            <div className="p-2.5 rounded bg-surface-container-lowest border border-outline-variant/50">
              <span className="font-mono-meta text-[10px] text-secondary font-bold uppercase">Task 2 · FDA 510(k)</span>
              <p className="font-body-sm text-[12px] text-on-surface mt-1">
                Audit predicate device clearance logs for diagnostic radiology algorithms.
              </p>
            </div>
            <div className="p-2.5 rounded bg-surface-container-lowest border border-outline-variant/50">
              <span className="font-mono-meta text-[10px] text-secondary font-bold uppercase">Task 3 · Verification</span>
              <p className="font-body-sm text-[12px] text-on-surface mt-1">
                Cross-corroborate empirical specificity metrics against JAMA clinical trial cohort.
              </p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-2 pt-2">
            <input
              type="text"
              value={approvalFeedback}
              onChange={(e) => setApprovalFeedback(e.target.value)}
              placeholder="Add optional researcher guidance (e.g. Prioritize clinical trials with n > 1,000)..."
              className="flex-1 px-space-md py-2 bg-surface rounded border border-outline-variant/60 font-body-sm text-body-sm text-on-surface focus:outline-none focus:border-secondary"
            />
            <button
              type="button"
              disabled={approving}
              onClick={handleApprovePlan}
              className="w-full sm:w-auto px-space-lg py-2 rounded bg-secondary hover:bg-secondary-container text-primary font-label-md text-label-md font-bold transition-all shadow-sm flex items-center justify-center gap-1.5"
            >
              <span className="material-symbols-outlined text-[16px]">check</span>
              <span>{approving ? "Authorizing..." : "Approve Plan & Dispatch"}</span>
            </button>
          </div>
        </section>
      )}

      {/* Tripartite Technical Operations Workspace */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-space-md">
        {/* LEFT PANEL: Specialized Agent Execution Swarm */}
        <section className="xl:col-span-3 flex flex-col gap-space-sm bg-surface-container-lowest p-space-md rounded-lg shadow-sm border border-outline-variant/40">
          <div className="flex items-center justify-between pb-space-xs">
            <div className="flex flex-col">
              <span className="font-mono-meta text-mono-meta text-primary uppercase font-bold tracking-wider">
                Active Agent Roster
              </span>
              <span className="font-mono-meta text-mono-meta text-outline">4 Executing · 5 Standby</span>
            </div>
            <span className="px-2 py-0.5 rounded bg-secondary-container/40 text-on-secondary-container font-mono-meta text-mono-meta font-bold">
              9 INSTANCES
            </span>
          </div>

          <div className="flex flex-col gap-1.5 overflow-y-auto max-h-[700px] pr-1">
            {[
              {
                id: "01",
                name: "Research Planner",
                status: "COMPLETE",
                desc: "Formulated 6 core scientific hypotheses",
                meta: "Runtime: 00m 18s · Output: 6 Hypotheses",
              },
              {
                id: "02",
                name: "Coordinator Lead",
                status: "ACTIVE",
                desc: "Routing asynchronous search batches to 3 sub-agents",
                meta: "Elapsed: 04m 32s · MCP Router v1",
                active: true,
              },
              {
                id: "03",
                name: "Web Researcher",
                status: "ACTIVE",
                desc: "Deep-querying PubMed Central API & Exa Neural Search",
                meta: "Elapsed: 03m 44s · PubMed + Exa",
                active: true,
              },
              {
                id: "04",
                name: "Source Extractor",
                status: "ACTIVE",
                desc: "Deconstructing 18 clinical trial preprint PDF dossiers",
                meta: "Elapsed: 02m 15s · PyMuPDF-WASM",
                active: true,
              },
              {
                id: "05",
                name: "Evidence Extractor",
                status: "ACTIVE",
                desc: "Extracting 510(k) clearance metrics & predicate device IDs",
                meta: "Elapsed: 01m 50s · FDA openFDA",
                active: true,
              },
              {
                id: "06",
                name: "Claim Verifier",
                status: "QUEUED",
                desc: "Awaiting evidence batch #3 commit",
                meta: "Buffer: 14 claims · Idle",
              },
              {
                id: "07",
                name: "Contradiction Detector",
                status: "STANDBY",
                desc: "Triggers automatically on cross-source semantic variance",
                meta: "Divergence hook · Ready",
              },
              {
                id: "08",
                name: "Gap Analyst",
                status: "STANDBY",
                desc: "Scheduled for Phase 3 topological inspection",
                meta: "Phase 3 Pipeline",
              },
              {
                id: "09",
                name: "Lead Synthesis Writer",
                status: "STANDBY",
                desc: "Awaiting consensus closure & graph export",
                meta: "Dossier Synthesizer",
              },
            ].map((agent) => (
              <article
                key={agent.id}
                className={`p-2.5 rounded transition-all border ${
                  agent.active
                    ? "bg-surface-container border-secondary/40 shadow-xs"
                    : "bg-surface-container-low hover:bg-surface-container border-outline-variant/30"
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-1.5">
                    {agent.active && <span className="w-2 h-2 rounded-full bg-secondary animate-pulse" />}
                    <span className="font-title-sm text-body-sm font-bold text-primary">
                      {agent.id}. {agent.name}
                    </span>
                  </div>
                  <span
                    className={`font-mono-meta text-[10px] px-1.5 py-0.5 rounded font-semibold ${
                      agent.status === "ACTIVE"
                        ? "bg-secondary-container text-on-secondary-container"
                        : agent.status === "COMPLETE"
                        ? "bg-surface-container-high text-on-surface-variant"
                        : "bg-surface-container-high text-outline"
                    }`}
                  >
                    {agent.status}
                  </span>
                </div>
                <p className="font-body-sm text-body-sm text-on-surface truncate">{agent.desc}</p>
                <div className="mt-2 flex items-center justify-between font-mono-meta text-mono-meta text-outline">
                  <span>{agent.meta}</span>
                </div>
              </article>
            ))}
          </div>
        </section>

        {/* CENTER PANEL: Pipeline Workflow & Graph Visualization */}
        <main className="xl:col-span-6 flex flex-col gap-space-md">
          {/* Workflow Graph Canvas */}
          <section className="bg-surface-container-lowest p-space-md rounded-lg shadow-sm border border-outline-variant/40 flex flex-col gap-space-md">
            <div className="flex items-center justify-between pb-space-xs">
              <div className="flex flex-col">
                <span className="font-mono-meta text-mono-meta text-primary font-bold uppercase tracking-wider">
                  Recursive Workflow Graph — Pipeline Orchestration
                </span>
                <span className="font-body-sm text-body-sm text-on-surface-variant">
                  Deterministic state-machine transitions across multi-agent runtime
                </span>
              </div>
              <div className="flex items-center gap-1 font-mono-meta text-mono-meta text-outline">
                <span>STAGE:</span>
                <span className="text-secondary font-bold">4 / 10 ACTIVE</span>
              </div>
            </div>

            {/* Visual Flow Graph */}
            <div className="p-space-md bg-surface-container-low rounded border border-outline-variant/30 flex flex-col gap-space-md overflow-x-auto">
              {/* Row 1: Stages 1 to 5 */}
              <div className="flex items-center justify-between min-w-[560px] gap-2">
                <div className="flex flex-col items-center flex-1">
                  <div className="w-8 h-8 rounded-full bg-primary text-on-primary flex items-center justify-center font-mono-meta text-[12px] font-bold shadow-sm">
                    <span className="material-symbols-outlined text-[16px]">check</span>
                  </div>
                  <span className="mt-1.5 font-label-md text-[11px] text-primary text-center">User Prompt</span>
                  <span className="font-mono-meta text-[10px] text-outline">14:38:12</span>
                </div>
                <div className="h-0.5 flex-1 bg-primary" />

                <div className="flex flex-col items-center flex-1">
                  <div className="w-8 h-8 rounded-full bg-primary text-on-primary flex items-center justify-center font-mono-meta text-[12px] font-bold shadow-sm">
                    <span className="material-symbols-outlined text-[16px]">check</span>
                  </div>
                  <span className="mt-1.5 font-label-md text-[11px] text-primary text-center">Hypotheses</span>
                  <span className="font-mono-meta text-[10px] text-outline">6 nodes</span>
                </div>
                <div className="h-0.5 flex-1 bg-primary" />

                <div className="flex flex-col items-center flex-1">
                  <div className="w-8 h-8 rounded-full bg-primary text-on-primary flex items-center justify-center font-mono-meta text-[12px] font-bold shadow-sm">
                    <span className="material-symbols-outlined text-[16px]">check</span>
                  </div>
                  <span className="mt-1.5 font-label-md text-[11px] text-primary text-center">Discovery</span>
                  <span className="font-mono-meta text-[10px] text-outline">38 sources</span>
                </div>
                <div className="h-0.5 flex-1 bg-secondary animate-pulse" />

                {/* Node 4: Extraction (ACTIVE) */}
                <div className="flex flex-col items-center flex-1">
                  <div className="relative w-8 h-8 rounded-full bg-surface-container-lowest text-secondary flex items-center justify-center font-mono-meta text-[12px] font-bold shadow-md border-2 border-secondary">
                    <span className="w-2.5 h-2.5 rounded-full bg-secondary" />
                    <span className="absolute inset-0 rounded-full animate-ping opacity-30 bg-secondary" />
                  </div>
                  <span className="mt-1.5 font-label-md text-[11px] text-secondary font-bold text-center">
                    Extraction
                  </span>
                  <span className="font-mono-meta text-[10px] text-secondary">ACTIVE</span>
                </div>
                <div className="h-0.5 flex-1 bg-surface-container-highest" />

                <div className="flex flex-col items-center flex-1 opacity-70">
                  <div className="w-8 h-8 rounded-full bg-surface-container text-on-surface-variant flex items-center justify-center font-mono-meta text-[12px] border border-outline-variant/60">
                    05
                  </div>
                  <span className="mt-1.5 font-label-md text-[11px] text-on-surface-variant text-center">
                    Evidence
                  </span>
                  <span className="font-mono-meta text-[10px] text-outline">Batch #3</span>
                </div>
              </div>

              {/* Row 2: Stages 6 to 10 */}
              <div className="flex items-center justify-between min-w-[560px] gap-2 pt-space-xs">
                <div className="flex flex-col items-center flex-1 opacity-50">
                  <div className="w-8 h-8 rounded-full bg-surface-container text-outline flex items-center justify-center font-mono-meta text-[12px] border border-outline-variant/60">
                    06
                  </div>
                  <span className="mt-1.5 font-label-md text-[11px] text-outline text-center">Triangulation</span>
                  <span className="font-mono-meta text-[10px] text-outline">Pending</span>
                </div>
                <div className="h-0.5 flex-1 bg-surface-container-highest" />

                <div className="flex flex-col items-center flex-1 opacity-50">
                  <div className="w-8 h-8 rounded-full bg-surface-container text-outline flex items-center justify-center font-mono-meta text-[12px] border border-outline-variant/60">
                    07
                  </div>
                  <span className="mt-1.5 font-label-md text-[11px] text-outline text-center">Gap Analysis</span>
                  <span className="font-mono-meta text-[10px] text-outline">Pending</span>
                </div>
                <div className="h-0.5 flex-1 bg-surface-container-highest" />

                <div className="flex flex-col items-center flex-1 opacity-50">
                  <div className="w-8 h-8 rounded-full bg-surface-container text-outline flex items-center justify-center font-mono-meta text-[12px] border border-outline-variant/60">
                    08
                  </div>
                  <span className="mt-1.5 font-label-md text-[11px] text-outline text-center">Synthesis</span>
                  <span className="font-mono-meta text-[10px] text-outline">Pending</span>
                </div>
                <div className="h-0.5 flex-1 bg-surface-container-highest" />

                <div className="flex flex-col items-center flex-1 opacity-50">
                  <div className="w-8 h-8 rounded-full bg-surface-container text-outline flex items-center justify-center font-mono-meta text-[12px] border border-outline-variant/60">
                    09
                  </div>
                  <span className="mt-1.5 font-label-md text-[11px] text-outline text-center">Citation Check</span>
                  <span className="font-mono-meta text-[10px] text-outline">BibTeX</span>
                </div>
                <div className="h-0.5 flex-1 bg-surface-container-highest" />

                <div className="flex flex-col items-center flex-1 opacity-50">
                  <div className="w-8 h-8 rounded-full bg-surface-container text-outline flex items-center justify-center font-mono-meta text-[12px] border border-outline-variant/60">
                    10
                  </div>
                  <span className="mt-1.5 font-label-md text-[11px] text-outline text-center">Final Dossier</span>
                  <span className="font-mono-meta text-[10px] text-outline">Export</span>
                </div>
              </div>
            </div>

            {/* Subgraph Semantic Connectivity SVG */}
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <span className="font-mono-meta text-mono-meta text-primary font-bold uppercase tracking-wider">
                  Live Topological Consensus Sub-Graph
                </span>
                <span className="font-mono-meta text-mono-meta text-outline">
                  Triangulating Node Entailment (8 entities)
                </span>
              </div>
              <div className="w-full bg-surface-container-low rounded p-space-md flex flex-col items-center justify-center relative overflow-hidden border border-outline-variant/30">
                <svg className="w-full h-48" fill="none" viewBox="0 0 600 200" xmlns="http://www.w3.org/2000/svg">
                  <line stroke="#c6c6cb" strokeDasharray="4 3" strokeWidth="1.5" x1="120" x2="280" y1="100" y2="50" />
                  <line stroke="#006972" strokeWidth="2" x1="120" x2="280" y1="100" y2="150" />
                  <line stroke="#006972" strokeWidth="2" x1="280" x2="460" y1="50" y2="100" />
                  <line stroke="#c6c6cb" strokeWidth="1.5" x1="280" x2="460" y1="150" y2="100" />
                  <line stroke="#c6c6cb" strokeDasharray="2 2" strokeWidth="1" x1="280" x2="280" y1="50" y2="150" />

                  {/* Left Node */}
                  <g className="cursor-pointer">
                    <circle cx="120" cy="100" fill="#1a1c20" r="28" />
                    <circle cx="120" cy="100" r="33" stroke="#83f0fd" strokeOpacity="0.4" strokeWidth="1" />
                    <text fill="#ffffff" fontFamily="JetBrains Mono" fontSize="9" fontWeight="bold" textAnchor="middle" x="120" y="97">
                      FDA 510(k)
                    </text>
                    <text fill="#83f0fd" fontFamily="JetBrains Mono" fontSize="7" textAnchor="middle" x="120" y="108">
                      K231459
                    </text>
                  </g>

                  {/* Center Top Node */}
                  <g className="cursor-pointer">
                    <circle cx="280" cy="50" fill="#ffffff" r="24" stroke="#c6c6cb" strokeWidth="2" />
                    <text fill="#1b1c1a" fontFamily="Hanken Grotesk" fontSize="9" fontWeight="600" textAnchor="middle" x="280" y="48">
                      Mayo Cohort
                    </text>
                    <text fill="#76777b" fontFamily="JetBrains Mono" fontSize="7" textAnchor="middle" x="280" y="58">
                      n=4,290
                    </text>
                  </g>

                  {/* Center Bottom Node */}
                  <g className="cursor-pointer">
                    <circle cx="280" cy="150" fill="#83f0fd" fillOpacity="0.25" r="26" stroke="#006972" strokeWidth="2" />
                    <text fill="#006d77" fontFamily="Hanken Grotesk" fontSize="9" fontWeight="bold" textAnchor="middle" x="280" y="148">
                      Specificity
                    </text>
                    <text fill="#006d77" fontFamily="JetBrains Mono" fontSize="7" textAnchor="middle" x="280" y="159">
                      97.4% ±0.3
                    </text>
                  </g>

                  {/* Right Node */}
                  <g className="cursor-pointer">
                    <circle cx="460" cy="100" fill="#1a1c20" r="30" />
                    <circle cx="460" cy="100" r="36" stroke="#006972" strokeDasharray="3 3" strokeWidth="1.5" />
                    <text fill="#ffffff" fontFamily="JetBrains Mono" fontSize="9" fontWeight="bold" textAnchor="middle" x="460" y="97">
                      Consensus
                    </text>
                    <text fill="#67d6e3" fontFamily="JetBrains Mono" fontSize="7" textAnchor="middle" x="460" y="108">
                      Score 0.948
                    </text>
                  </g>

                  <rect fill="#efeeea" height="14" rx="2" width="46" x="180" y="128" />
                  <text fill="#45474b" fontFamily="JetBrains Mono" fontSize="7" textAnchor="middle" x="203" y="138">
                    VERIFIES
                  </text>
                  <rect fill="#efeeea" height="14" rx="2" width="42" x="350" y="68" />
                  <text fill="#45474b" fontFamily="JetBrains Mono" fontSize="7" textAnchor="middle" x="371" y="78">
                    BOUNDS
                  </text>
                </svg>

                <div className="w-full flex items-center justify-between pt-2 px-space-xs font-mono-meta text-mono-meta text-on-surface-variant">
                  <span className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-secondary" />
                    <span>Active Graph Density: 0.78</span>
                  </span>
                  <span>Triangulation Confidence: 94.8% (Target: &gt;90.0%)</span>
                  <Link href="/knowledge-base" className="text-secondary hover:underline font-semibold">
                    Inspect Full Topology →
                  </Link>
                </div>
              </div>
            </div>
          </section>

          {/* Mini Research Summary Snapshot */}
          <section className="bg-surface-container-lowest p-space-md rounded-lg shadow-sm border border-outline-variant/40 flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <span className="font-mono-meta text-mono-meta text-primary font-bold uppercase tracking-wider">
                Live Epistemic Claim Synthesis
              </span>
              <span className="px-2 py-0.5 rounded bg-surface-container font-mono-meta text-mono-meta text-outline">
                CLAIM #14-B
              </span>
            </div>
            <p className="font-body-lg text-body-lg text-primary italic">
              &ldquo;Autonomous radiological diagnostic tools cleared under 510(k) pathway demonstrate equivalent
              sensitivity (AUC 0.96) to board-certified radiologists, but display a 14% false-positive delta across
              multi-vendor MRI scanners unless fed normalized raw k-space representations.&rdquo;
            </p>
            <div className="flex flex-wrap items-center gap-space-sm pt-1 font-mono-meta text-mono-meta text-outline">
              <span className="px-1.5 py-0.5 rounded bg-surface-container-high text-on-surface font-semibold">
                4 Citations Corroborated
              </span>
              <span>·</span>
              <span>FDA Predicate Match: K231459</span>
              <span>·</span>
              <span className="text-secondary font-medium">Confidence: High (p &lt; 0.001)</span>
            </div>
          </section>
        </main>

        {/* RIGHT PANEL: Stage Context Inspector */}
        <aside className="xl:col-span-3 flex flex-col gap-space-sm bg-surface-container-lowest p-space-md rounded-lg shadow-sm border border-outline-variant/40">
          <div className="flex items-center justify-between pb-space-xs">
            <div className="flex flex-col">
              <span className="font-mono-meta text-mono-meta text-primary uppercase font-bold tracking-wider">
                Stage Inspector
              </span>
              <span className="font-mono-meta text-mono-meta text-outline">Extraction &amp; Evidence</span>
            </div>
            <span className="w-2 h-2 rounded-full bg-secondary animate-ping" />
          </div>

          {/* Current Task Card */}
          <div className="p-space-sm bg-surface-container-low rounded border border-outline-variant/30 flex flex-col gap-1.5">
            <span className="font-mono-meta text-mono-meta text-outline uppercase">Active Research Target</span>
            <p className="font-body-sm text-body-sm text-primary font-medium">
              Evaluating sensitivity &amp; specificity boundaries in 2024 AI oncology diagnostics vs. legacy
              clinical benchmarks.
            </p>
            <div className="flex items-center gap-1 font-mono-meta text-mono-meta text-on-surface-variant pt-1">
              <span className="text-outline">Provider:</span>
              <span className="text-secondary font-semibold">Tavily Deep + CrossRef DOI</span>
            </div>
          </div>

          {/* Metric Telemetry Grid */}
          <div className="grid grid-cols-2 gap-2">
            <div className="p-2.5 rounded bg-surface-container-low border border-outline-variant/30 flex flex-col">
              <span className="font-mono-meta text-mono-meta text-outline uppercase">Sources Found</span>
              <span className="font-title-sm text-title-sm text-primary font-bold mt-1">38</span>
              <span className="font-mono-meta text-[10px] text-on-surface-variant">22 PubMed · 8 SEC</span>
            </div>
            <div className="p-2.5 rounded bg-surface-container-low border border-outline-variant/30 flex flex-col">
              <span className="font-mono-meta text-mono-meta text-outline uppercase">Claims Extracted</span>
              <span className="font-title-sm text-title-sm text-primary font-bold mt-1">42</span>
              <span className="font-mono-meta text-[10px] text-on-surface-variant">14 verified in graph</span>
            </div>
            <div className="p-2.5 rounded bg-surface-container-low border border-outline-variant/30 flex flex-col">
              <span className="font-mono-meta text-mono-meta text-outline uppercase">Contradictions</span>
              <span className="font-title-sm text-title-sm text-error font-bold mt-1">2 Flagged</span>
              <span className="font-mono-meta text-[10px] text-on-error-container">Variance alert</span>
            </div>
            <div className="p-2.5 rounded bg-surface-container-low border border-outline-variant/30 flex flex-col">
              <span className="font-mono-meta text-mono-meta text-outline uppercase">Confidence</span>
              <span className="font-title-sm text-title-sm text-secondary font-bold mt-1">94.8%</span>
              <span className="font-mono-meta text-[10px] text-on-surface-variant">Epistemic bound</span>
            </div>
          </div>

          {/* Live Tool Call Terminal */}
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <span className="font-mono-meta text-mono-meta text-primary font-bold uppercase tracking-wider">
                Live Tool Calls
              </span>
              <span className="font-mono-meta text-[10px] text-outline">STDOUT / JSON</span>
            </div>
            <div className="bg-primary-container p-space-sm rounded font-mono-code text-[11px] text-on-primary-container flex flex-col gap-1.5 overflow-x-auto border border-white/5">
              <div className="flex items-start gap-1.5">
                <span className="text-secondary-fixed">›</span>
                <span className="text-on-primary font-mono-meta">pubmed.fetch_doi(&quot;10.1001/jama.2024.1102&quot;)</span>
              </div>
              <div className="text-outline pl-3 font-mono-meta">↳ Status: 200 OK · Payload: 148kb</div>
              <div className="flex items-start gap-1.5 pt-1">
                <span className="text-secondary-fixed">›</span>
                <span className="text-on-primary font-mono-meta">
                  exa.semantic_crawl(domain=&quot;fda.gov&quot;, q=&quot;510k AI radiology&quot;)
                </span>
              </div>
              <div className="text-outline pl-3 font-mono-meta">↳ Resolved: 14 docs matched · Latency: 480ms</div>
            </div>
          </div>

          {/* Anomaly Alert Card */}
          <div className="p-space-sm rounded bg-error-container/40 border border-error/30 flex flex-col gap-1">
            <div className="flex items-center gap-1 text-on-error-container font-mono-meta text-mono-meta font-bold uppercase">
              <span className="material-symbols-outlined text-[14px]">warning</span>
              <span>Divergence Warning</span>
            </div>
            <p className="font-body-sm text-body-sm text-on-surface">
              Semantic divergence detected between JAMA Oncology preprint and FDA predicate clearance K231459
              regarding specific threshold specificity metrics.
            </p>
          </div>
        </aside>
      </div>

      {/* BOTTOM SECTION: Live Event Stream & Activity Timeline */}
      <section className="bg-surface-container-lowest p-space-md rounded-lg shadow-sm border border-outline-variant/40 flex flex-col gap-space-sm">
        <div className="flex flex-wrap items-center justify-between gap-space-sm pb-space-xs">
          <div className="flex items-center gap-space-sm">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-secondary animate-ping" />
              <span className="font-mono-meta text-mono-meta text-primary font-bold uppercase tracking-wider">
                Live Event Stream &amp; Activity Timeline
              </span>
            </div>
            <span className="font-mono-meta text-mono-meta text-outline">SSE / Stream Active</span>
          </div>

          {/* Filter Chips */}
          <div className="flex items-center gap-space-xs flex-wrap">
            <div className="flex items-center gap-1 bg-surface-container-low p-0.5 rounded border border-outline-variant/30">
              {[
                { id: "all", label: "All Events" },
                { id: "agent", label: "Agent Actions" },
                { id: "tool", label: "Tool Calls" },
                { id: "contradiction", label: "Contradictions" },
                { id: "citation", label: "Citations" },
              ].map((f) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setEventFilter(f.id)}
                  className={`px-2.5 py-1 rounded font-label-md text-label-md transition-all ${
                    eventFilter === f.id
                      ? "bg-surface-container text-primary font-bold shadow-xs"
                      : "text-on-surface-variant hover:bg-surface-container"
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={() => setIsAutoScroll(!isAutoScroll)}
              className={`flex items-center gap-1 px-2.5 py-1 rounded font-mono-meta text-mono-meta font-medium border border-outline-variant/30 ${
                isAutoScroll ? "bg-secondary-container text-on-secondary-container" : "bg-surface-container text-on-surface"
              }`}
            >
              <span className="material-symbols-outlined text-[14px]">sync</span>
              <span>Auto-Scroll: {isAutoScroll ? "ON" : "OFF"}</span>
            </button>
          </div>
        </div>

        {/* Timeline Stream */}
        <div
          ref={logContainerRef}
          className="flex flex-col gap-2 max-h-60 overflow-y-auto pr-2 font-mono-meta text-body-sm"
        >
          {filteredEvents.map((ev) => (
            <div
              key={ev.id}
              className={`flex items-start gap-space-md p-2 rounded transition-colors ${
                ev.isContradiction
                  ? "bg-error-container/20 border border-error/20"
                  : "hover:bg-surface-container-low"
              }`}
            >
              <span className="text-outline shrink-0 font-mono-meta text-mono-meta">{ev.timestamp}</span>
              <div className="flex items-center gap-1.5 shrink-0">
                <span
                  className={`w-1.5 h-1.5 rounded-full ${
                    ev.isContradiction ? "bg-error" : "bg-secondary"
                  }`}
                />
                <span
                  className={`font-bold font-label-md text-label-md ${
                    ev.isContradiction ? "text-error" : "text-primary"
                  }`}
                >
                  [{ev.agent}]
                </span>
              </div>
              <p className="text-on-surface flex-1">{ev.message}</p>
              {ev.tag && (
                <span
                  className={`px-1.5 py-0.5 rounded font-mono-meta text-[10px] ${
                    ev.isContradiction
                      ? "bg-error-container text-on-error-container font-bold"
                      : "bg-surface-container text-on-surface-variant"
                  }`}
                >
                  {ev.tag}
                </span>
              )}
            </div>
          ))}
        </div>

        {/* Swarm Resource Strip */}
        <div className="flex flex-wrap items-center justify-between gap-space-sm pt-space-xs font-mono-meta text-mono-meta text-on-surface-variant bg-surface-container-low px-space-md py-2 rounded border border-outline-variant/30">
          <div className="flex items-center gap-space-md">
            <span className="flex items-center gap-1">
              <span className="text-outline">SWARM MEMORY:</span>
              <span className="text-primary font-semibold">1.84 GB / 8.00 GB</span>
            </span>
            <span className="text-outline-variant">·</span>
            <span className="flex items-center gap-1">
              <span className="text-outline">CONTEXT TOKENS:</span>
              <span className="text-primary font-semibold">142,480 / 500,000</span>
            </span>
            <span className="text-outline-variant">·</span>
            <span className="flex items-center gap-1">
              <span className="text-outline">EST. RUN COST:</span>
              <span className="text-secondary font-bold">$0.48 USD</span>
            </span>
          </div>
          <div className="flex items-center gap-space-xs">
            <span className="w-2 h-2 rounded-full bg-secondary" />
            <span className="text-primary font-medium">Cluster Health: Nominal (0 failures)</span>
          </div>
        </div>
      </section>
    </div>
  );
}
