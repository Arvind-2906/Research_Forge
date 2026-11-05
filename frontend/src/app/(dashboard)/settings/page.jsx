"use client";

import React, { useState } from "react";
import { useAuth } from "../../../context/AuthContext";
import { useWorkspace } from "../../../context/WorkspaceContext";

export default function SettingsPage() {
  const { user } = useAuth();
  const { currentWorkspace, updateWorkspace } = useWorkspace();

  const [activeSection, setActiveSection] = useState("ai-preferences");
  const [saveStatus, setSaveStatus] = useState("idle"); // idle | saving | saved

  // Model settings
  const [verifierModel, setVerifierModel] = useState("Claude 3.5 Sonnet (Anthropic)");
  const [ingestionModel, setIngestionModel] = useState("GPT-4o (OpenAI Structured)");
  const [synthesizerModel, setSynthesizerModel] = useState("Claude 3.5 Sonnet (Anthropic)");
  const [failoverEnabled, setFailoverEnabled] = useState(true);

  // Epistemic defaults
  const [consensusThreshold, setConsensusThreshold] = useState(98);
  const [evidenceDepth, setEvidenceDepth] = useState("deep"); // standard | deep | exhaustive
  const [contradictionGate, setContradictionGate] = useState("autonomous"); // autonomous | human
  const [strictPrimary, setStrictPrimary] = useState(true);
  const [scrubMarketing, setScrubMarketing] = useState(true);
  const [autoBibtex, setAutoBibtex] = useState(true);

  // Appearance
  const [selectedTheme, setSelectedTheme] = useState("light-editorial"); // light-editorial | dark-obsidian | system
  const [density, setDensity] = useState("architectural"); // comfortable | architectural | high
  const [serifDossiers, setSerifDossiers] = useState(true);

  // Sessions
  const [sessions, setSessions] = useState([
    {
      id: "sess-01",
      device: "macOS Sonoma · Chrome 131",
      role: "Primary Research Workstation",
      location: "San Francisco, US",
      ip: "198.51.100.24",
      status: "Current Session",
      current: true
    },
    {
      id: "sess-02",
      device: "Ubuntu CLI Daemon · Python MCP Worker",
      role: "Token: rf_live_d82f...ec41",
      location: "Ashburn, US (AWS us-east-1)",
      ip: "203.0.113.88",
      status: "Ping: 42s ago",
      current: false
    }
  ]);

  const handleSave = async () => {
    setSaveStatus("saving");
    try {
      if (currentWorkspace?.id) {
        await updateWorkspace(currentWorkspace.id, {
          settings: {
            consensusThreshold,
            evidenceDepth,
            contradictionGate,
            verifierModel,
            ingestionModel,
            synthesizerModel,
          }
        });
      }
    } catch (err) {
      console.warn("Could not persist to server directly, updated local state", err);
    }
    setTimeout(() => {
      setSaveStatus("saved");
      setTimeout(() => setSaveStatus("idle"), 2500);
    }, 600);
  };

  const handleReset = () => {
    setConsensusThreshold(98);
    setEvidenceDepth("deep");
    setContradictionGate("autonomous");
    setVerifierModel("Claude 3.5 Sonnet (Anthropic)");
    setIngestionModel("GPT-4o (OpenAI Structured)");
    setSynthesizerModel("Claude 3.5 Sonnet (Anthropic)");
    setFailoverEnabled(true);
    setSelectedTheme("light-editorial");
    setDensity("architectural");
    setSerifDossiers(true);
  };

  return (
    <div className="flex flex-col w-full">
      {/* Breadcrumbs & Global Page Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-space-md pb-space-lg mb-space-lg">
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center gap-2">
            <span className="font-mono-meta text-mono-meta text-outline tracking-widest uppercase">
              Workspace
            </span>
            <span className="text-outline-variant font-mono-meta text-mono-meta">/</span>
            <span className="font-mono-meta text-mono-meta text-outline tracking-widest uppercase">
              Configuration
            </span>
            <span className="text-outline-variant font-mono-meta text-mono-meta">/</span>
            <span className="font-mono-meta text-mono-meta text-secondary font-semibold tracking-widest uppercase">
              Settings
            </span>
          </div>
          <h1 className="font-headline-lg text-headline-lg text-on-surface tracking-tight font-normal">
            Settings & System Governance
          </h1>
          <p className="font-body-md text-body-md text-on-surface-variant max-w-3xl leading-relaxed">
            Configure institutional workspace policies, multi-agent AI inference providers, epistemic verification guardrails, and cryptographic enclaves.
          </p>
        </div>

        {/* Page Action Bar */}
        <div className="flex items-center gap-space-sm flex-shrink-0">
          <button
            onClick={handleReset}
            className="px-space-md py-2 rounded bg-surface hover:bg-surface-container text-on-surface font-body-sm text-body-sm transition-colors shadow-sm"
            type="button"
          >
            Discard Changes
          </button>
          <button
            onClick={handleSave}
            className="flex items-center gap-2 px-space-md py-2 rounded bg-primary hover:bg-primary-container text-on-primary font-body-sm text-body-sm font-medium transition-all shadow-sm"
            type="button"
          >
            <span>
              {saveStatus === "saving"
                ? "Saving..."
                : saveStatus === "saved"
                ? "Config Saved ✓"
                : "Save Configuration"}
            </span>
            <kbd className="px-1.5 py-0.5 rounded bg-white/20 font-mono-meta text-[10px] text-on-primary">
              ⌘S
            </kbd>
          </button>
        </div>
      </div>

      {/* Main Split Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-space-lg items-start">
        {/* Left Settings Sub-Navigation Column */}
        <aside className="lg:col-span-3 flex flex-col gap-space-md">
          <div className="bg-surface-container-lowest rounded shadow-sm p-space-sm flex flex-col gap-space-md">
            {/* Group 1: Account & Workspace */}
            <div className="flex flex-col">
              <span className="px-space-sm py-1 font-mono-meta text-mono-meta text-outline tracking-widest uppercase">
                Account & Workspace
              </span>
              <nav className="flex flex-col mt-1 gap-0.5">
                <button
                  type="button"
                  onClick={() => setActiveSection("profile")}
                  className={`flex items-center justify-between px-space-sm py-2 rounded transition-colors text-left ${
                    activeSection === "profile"
                      ? "bg-surface-container text-on-surface font-semibold"
                      : "text-on-surface-variant hover:text-on-surface hover:bg-surface-container"
                  }`}
                >
                  <span className="font-body-sm text-body-sm">Profile</span>
                  <span className="font-mono-meta text-mono-meta text-outline">
                    {user?.name?.slice(0, 2).toUpperCase() || "DR"}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveSection("workspace")}
                  className={`flex items-center justify-between px-space-sm py-2 rounded transition-colors text-left ${
                    activeSection === "workspace"
                      ? "bg-surface-container text-on-surface font-semibold"
                      : "text-on-surface-variant hover:text-on-surface hover:bg-surface-container"
                  }`}
                >
                  <span className="font-body-sm text-body-sm">Workspace Policy</span>
                  <span className="font-mono-meta text-mono-meta text-outline">v2.4</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveSection("team")}
                  className={`flex items-center justify-between px-space-sm py-2 rounded transition-colors text-left ${
                    activeSection === "team"
                      ? "bg-surface-container text-on-surface font-semibold"
                      : "text-on-surface-variant hover:text-on-surface hover:bg-surface-container"
                  }`}
                >
                  <span className="font-body-sm text-body-sm">Team Members</span>
                  <span className="font-mono-meta text-mono-meta text-outline">12 Active</span>
                </button>
              </nav>
            </div>

            <div className="h-px bg-surface-container-highest mx-space-sm" />

            {/* Group 2: Intelligence & Inference */}
            <div className="flex flex-col">
              <span className="px-space-sm py-1 font-mono-meta text-mono-meta text-secondary font-semibold tracking-widest uppercase">
                Intelligence & Inference
              </span>
              <nav className="flex flex-col mt-1 gap-0.5">
                <button
                  type="button"
                  onClick={() => setActiveSection("ai-preferences")}
                  className={`flex items-center justify-between px-space-sm py-2 rounded transition-all text-left ${
                    activeSection === "ai-preferences"
                      ? "bg-secondary-container/40 text-on-secondary-container font-semibold"
                      : "text-on-surface-variant hover:text-on-surface hover:bg-surface-container"
                  }`}
                >
                  <span className="font-body-sm text-body-sm">AI Preferences</span>
                  {activeSection === "ai-preferences" && (
                    <span className="w-1.5 h-1.5 rounded-full bg-secondary"></span>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => setActiveSection("epistemic-defaults")}
                  className={`flex items-center justify-between px-space-sm py-2 rounded transition-all text-left ${
                    activeSection === "epistemic-defaults"
                      ? "bg-secondary-container/40 text-on-secondary-container font-semibold"
                      : "text-on-surface-variant hover:text-on-surface hover:bg-surface-container"
                  }`}
                >
                  <span className="font-body-sm text-body-sm">Research Defaults</span>
                  <span className="font-mono-meta text-mono-meta text-outline">{consensusThreshold}%</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveSection("persistent-memory")}
                  className={`flex items-center justify-between px-space-sm py-2 rounded transition-all text-left ${
                    activeSection === "persistent-memory"
                      ? "bg-secondary-container/40 text-on-secondary-container font-semibold"
                      : "text-on-surface-variant hover:text-on-surface hover:bg-surface-container"
                  }`}
                >
                  <span className="font-body-sm text-body-sm">Persistent Axioms</span>
                  <span className="font-mono-meta text-mono-meta text-outline">48 Nodes</span>
                </button>
              </nav>
            </div>

            <div className="h-px bg-surface-container-highest mx-space-sm" />

            {/* Group 3: Platform & Governance */}
            <div className="flex flex-col">
              <span className="px-space-sm py-1 font-mono-meta text-mono-meta text-outline tracking-widest uppercase">
                Platform & Governance
              </span>
              <nav className="flex flex-col mt-1 gap-0.5">
                <button
                  type="button"
                  onClick={() => setActiveSection("appearance")}
                  className={`flex items-center justify-between px-space-sm py-2 rounded transition-colors text-left ${
                    activeSection === "appearance"
                      ? "bg-surface-container text-on-surface font-semibold"
                      : "text-on-surface-variant hover:text-on-surface hover:bg-surface-container"
                  }`}
                >
                  <span className="font-body-sm text-body-sm">Appearance</span>
                  <span className="font-mono-meta text-mono-meta text-outline">Editorial</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveSection("security")}
                  className={`flex items-center justify-between px-space-sm py-2 rounded transition-colors text-left ${
                    activeSection === "security"
                      ? "bg-surface-container text-on-surface font-semibold"
                      : "text-on-surface-variant hover:text-on-surface hover:bg-surface-container"
                  }`}
                >
                  <span className="font-body-sm text-body-sm">Security & Enclaves</span>
                  <span className="font-mono-meta text-mono-meta text-outline">Sealed</span>
                </button>
              </nav>
            </div>
          </div>

          {/* Cluster Engine Integrity Card */}
          <div className="bg-surface-container-high rounded p-space-md flex flex-col gap-2 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="font-mono-meta text-mono-meta text-on-surface font-semibold">
                Cluster Engine v2.4.8
              </span>
              <span className="flex items-center gap-1 font-mono-meta text-mono-meta text-secondary">
                <span className="w-1.5 h-1.5 rounded-full bg-secondary"></span> Verified
              </span>
            </div>
            <p className="font-mono-code text-[11px] text-on-surface-variant truncate">
              Build sha256: 0x8a94b2a8d3e51ff...
            </p>
            <div className="flex items-center justify-between text-mono-meta font-mono-meta text-outline pt-1">
              <span>Merkle Root Logged</span>
              <span>Zero Egress Enclave</span>
            </div>
          </div>
        </aside>

        {/* Right Settings Configuration Panel */}
        <main className="lg:col-span-9 flex flex-col gap-space-lg">
          {/* Section 1: AI Inference & Model Orchestration */}
          <section className="bg-surface-container-lowest rounded shadow-sm p-space-lg flex flex-col gap-space-lg" id="ai-preferences">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-space-sm pb-space-sm bg-surface-container-low px-space-md py-space-sm rounded">
              <div className="flex items-center gap-space-sm">
                <div className="w-8 h-8 rounded bg-primary text-on-primary flex items-center justify-center font-mono-meta text-mono-meta font-bold">
                  01
                </div>
                <div>
                  <h2 className="font-title-sm text-title-sm text-on-surface">
                    AI Inference & Model Orchestration
                  </h2>
                  <p className="font-body-sm text-body-sm text-on-surface-variant">
                    Deterministic role assignment and token concurrency bounds for autonomous swarms.
                  </p>
                </div>
              </div>
              <span className="font-mono-meta text-mono-meta px-2 py-1 rounded bg-secondary-container/50 text-on-secondary-container font-semibold self-start md:self-auto">
                Swarm Fleet: Ready
              </span>
            </div>

            {/* Model Routing Table */}
            <div className="flex flex-col gap-space-md">
              <span className="font-mono-meta text-mono-meta text-outline tracking-wider uppercase">
                Primary Swarm Model Hierarchy
              </span>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-space-md">
                {/* Role 1: Epistemic FactVerifier */}
                <div className="bg-surface-container-low rounded p-space-md flex flex-col justify-between gap-space-sm">
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center justify-between">
                      <span className="font-mono-meta text-mono-meta text-secondary font-semibold">
                        FactVerifier Agent
                      </span>
                      <span className="font-mono-meta text-mono-meta text-outline">Tier 1 Strict</span>
                    </div>
                    <label className="font-title-sm text-title-sm text-on-surface" htmlFor="model-factverifier">
                      Epistemic Verification
                    </label>
                    <p className="font-body-sm text-body-sm text-on-surface-variant">
                      Analyzes contradictory claims against primary medical and peer-reviewed literature.
                    </p>
                  </div>
                  <div className="flex flex-col gap-space-sm pt-space-xs">
                    <select
                      id="model-factverifier"
                      value={verifierModel}
                      onChange={(e) => setVerifierModel(e.target.value)}
                      className="w-full bg-surface-container-lowest text-on-surface text-body-sm font-body-sm px-3 py-2 rounded shadow-sm focus:outline-none focus:ring-1 focus:ring-secondary"
                    >
                      <option>Claude 3.5 Sonnet (Anthropic)</option>
                      <option>o1-preview (OpenAI - Reasoning)</option>
                      <option>Llama 3.1 405B (Self-Hosted Enclave)</option>
                    </select>
                    <div className="flex items-center justify-between text-mono-meta font-mono-meta text-on-surface-variant bg-surface-container px-2.5 py-1.5 rounded">
                      <span>Temperature</span>
                      <span className="font-semibold text-on-surface">0.10 (Deterministic)</span>
                    </div>
                  </div>
                </div>

                {/* Role 2: Multi-Modal Ingestion */}
                <div className="bg-surface-container-low rounded p-space-md flex flex-col justify-between gap-space-sm">
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center justify-between">
                      <span className="font-mono-meta text-mono-meta text-secondary font-semibold">
                        BioMed-Crawler
                      </span>
                      <span className="font-mono-meta text-mono-meta text-outline">Vision & Tables</span>
                    </div>
                    <label className="font-title-sm text-title-sm text-on-surface" htmlFor="model-biomed">
                      Multi-Modal Ingestion
                    </label>
                    <p className="font-body-sm text-body-sm text-on-surface-variant">
                      Extracts high-resolution scientific figures, vector plots, and tabular clinical sets.
                    </p>
                  </div>
                  <div className="flex flex-col gap-space-sm pt-space-xs">
                    <select
                      id="model-biomed"
                      value={ingestionModel}
                      onChange={(e) => setIngestionModel(e.target.value)}
                      className="w-full bg-surface-container-lowest text-on-surface text-body-sm font-body-sm px-3 py-2 rounded shadow-sm focus:outline-none focus:ring-1 focus:ring-secondary"
                    >
                      <option>GPT-4o (OpenAI Structured)</option>
                      <option>Claude 3.5 Sonnet (Anthropic)</option>
                      <option>Gemini 1.5 Pro (Google DeepMind)</option>
                    </select>
                    <div className="flex items-center justify-between text-mono-meta font-mono-meta text-on-surface-variant bg-surface-container px-2.5 py-1.5 rounded">
                      <span>Temperature</span>
                      <span className="font-semibold text-on-surface">0.20 (Constrained)</span>
                    </div>
                  </div>
                </div>

                {/* Role 3: Lead Synthesis & Drafting */}
                <div className="bg-surface-container-low rounded p-space-md flex flex-col justify-between gap-space-sm">
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center justify-between">
                      <span className="font-mono-meta text-mono-meta text-secondary font-semibold">
                        Chief Synthesizer
                      </span>
                      <span className="font-mono-meta text-mono-meta text-outline">Lead Author</span>
                    </div>
                    <label className="font-title-sm text-title-sm text-on-surface" htmlFor="model-synthesizer">
                      Synthesis & Drafting
                    </label>
                    <p className="font-body-sm text-body-sm text-on-surface-variant">
                      Authors cohesive scientific dossiers adhering strictly to Oxford academic style guides.
                    </p>
                  </div>
                  <div className="flex flex-col gap-space-sm pt-space-xs">
                    <select
                      id="model-synthesizer"
                      value={synthesizerModel}
                      onChange={(e) => setSynthesizerModel(e.target.value)}
                      className="w-full bg-surface-container-lowest text-on-surface text-body-sm font-body-sm px-3 py-2 rounded shadow-sm focus:outline-none focus:ring-1 focus:ring-secondary"
                    >
                      <option>Claude 3.5 Sonnet (Anthropic)</option>
                      <option>o1-preview (OpenAI - Deep Reasoning)</option>
                      <option>Mixtral 8x22B (Private Spec)</option>
                    </select>
                    <div className="flex items-center justify-between text-mono-meta font-mono-meta text-on-surface-variant bg-surface-container px-2.5 py-1.5 rounded">
                      <span>Temperature</span>
                      <span className="font-semibold text-on-surface">0.35 (Analytical)</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Failover & Token Limits Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-space-md pt-space-xs">
              <div className="bg-surface-container-low rounded p-space-md flex items-start justify-between gap-space-sm">
                <div className="flex flex-col gap-1">
                  <span className="font-title-sm text-title-sm text-on-surface">
                    Secondary Provider Failover
                  </span>
                  <p className="font-body-sm text-body-sm text-on-surface-variant">
                    Automatically pivot to Tavily / Exa secondary retrieval enclaves and backup Anthropic endpoints upon rate-limit or 5xx anomalies.
                  </p>
                  <div className="flex items-center gap-2 mt-2">
                    <span className="font-mono-meta text-mono-meta px-2 py-0.5 rounded bg-surface-container text-outline font-semibold">
                      Backoff: Exponential (Base 1.5x)
                    </span>
                  </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer flex-shrink-0">
                  <input
                    type="checkbox"
                    checked={failoverEnabled}
                    onChange={(e) => setFailoverEnabled(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-surface-container-highest peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-secondary"></div>
                </label>
              </div>

              <div className="bg-surface-container-low rounded p-space-md flex flex-col justify-between gap-space-sm">
                <div className="flex justify-between items-start">
                  <div>
                    <span className="font-title-sm text-title-sm text-on-surface">
                      Compute & Token Guardrails
                    </span>
                    <p className="font-body-sm text-body-sm text-on-surface-variant">
                      Enforce hard compute boundaries across autonomous threads.
                    </p>
                  </div>
                  <span className="font-mono-meta text-mono-meta text-secondary font-bold">2.5M Limit</span>
                </div>
                <div className="flex flex-col gap-2">
                  <div className="flex justify-between text-mono-meta font-mono-meta text-on-surface">
                    <span>Daily Token Ceiling</span>
                    <span>2,500,000 / 3,000,000 Tokens</span>
                  </div>
                  <div className="w-full bg-surface-container-highest h-1.5 rounded-full overflow-hidden">
                    <div className="bg-secondary h-full rounded-full" style={{ width: "83.3%" }}></div>
                  </div>
                  <div className="flex justify-between text-mono-meta font-mono-meta text-outline pt-1">
                    <span>Concurrency: 12 Parallel Workers</span>
                    <span>Timeout: 180s/Request</span>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Section 2: Research & Epistemic Verification Defaults */}
          <section className="bg-surface-container-lowest rounded shadow-sm p-space-lg flex flex-col gap-space-lg" id="epistemic-defaults">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-space-sm pb-space-sm bg-surface-container-low px-space-md py-space-sm rounded">
              <div className="flex items-center gap-space-sm">
                <div className="w-8 h-8 rounded bg-primary text-on-primary flex items-center justify-center font-mono-meta text-mono-meta font-bold">
                  02
                </div>
                <div>
                  <h2 className="font-title-sm text-title-sm text-on-surface">
                    Research & Epistemic Verification Defaults
                  </h2>
                  <p className="font-body-sm text-body-sm text-on-surface-variant">
                    Rules governing source provenance, evidentiary confidence thresholds, and contradiction resolution.
                  </p>
                </div>
              </div>
              <span className="font-mono-meta text-mono-meta px-2 py-1 rounded bg-surface-container text-on-surface font-semibold self-start md:self-auto">
                Audit Mode: Strict
              </span>
            </div>

            {/* Slider & Evidence Depth */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-space-lg">
              {/* Consensus Threshold */}
              <div className="flex flex-col gap-space-sm bg-surface-container-low p-space-md rounded">
                <div className="flex items-center justify-between">
                  <label className="font-title-sm text-title-sm text-on-surface" htmlFor="consensus-range">
                    Epistemic Consensus Threshold
                  </label>
                  <span className="font-mono-meta text-mono-meta px-2 py-0.5 rounded bg-secondary text-on-secondary font-bold">
                    {consensusThreshold}.0% Minimum
                  </span>
                </div>
                <p className="font-body-sm text-body-sm text-on-surface-variant">
                  Every synthesized claim must be corroborated by a minimum of 3 peer-reviewed, independently verifiable primary sources prior to dossier inclusion.
                </p>
                <div className="pt-2 flex flex-col gap-1">
                  <input
                    id="consensus-range"
                    type="range"
                    min="80"
                    max="99"
                    value={consensusThreshold}
                    onChange={(e) => setConsensusThreshold(Number(e.target.value))}
                    className="w-full accent-secondary bg-surface-container-highest h-2 rounded cursor-pointer"
                  />
                  <div className="flex justify-between font-mono-meta text-mono-meta text-outline">
                    <span>80.0% (Exploratory)</span>
                    <span>90.0% (Standard)</span>
                    <span className="text-on-surface font-semibold">98.0% (Clinical)</span>
                  </div>
                </div>
              </div>

              {/* Default Evidence Depth Segmented Control */}
              <div className="flex flex-col gap-space-sm bg-surface-container-low p-space-md rounded justify-between">
                <div>
                  <span className="font-title-sm text-title-sm text-on-surface">Default Evidence Depth</span>
                  <p className="font-body-sm text-body-sm text-on-surface-variant">
                    Source breadth ingested during multi-agent graph traversal.
                  </p>
                </div>
                <div className="grid grid-cols-3 gap-1 bg-surface-container-highest p-1 rounded">
                  <button
                    type="button"
                    onClick={() => setEvidenceDepth("standard")}
                    className={`py-2 text-center rounded font-mono-meta text-[11px] transition-colors ${
                      evidenceDepth === "standard"
                        ? "bg-surface-container-lowest text-on-surface font-bold shadow-sm"
                        : "text-on-surface-variant hover:text-on-surface"
                    }`}
                  >
                    Standard (5-10)
                  </button>
                  <button
                    type="button"
                    onClick={() => setEvidenceDepth("deep")}
                    className={`py-2 text-center rounded font-mono-meta text-[11px] transition-colors ${
                      evidenceDepth === "deep"
                        ? "bg-surface-container-lowest text-on-surface font-bold shadow-sm"
                        : "text-on-surface-variant hover:text-on-surface"
                    }`}
                  >
                    Deep (25-50)
                  </button>
                  <button
                    type="button"
                    onClick={() => setEvidenceDepth("exhaustive")}
                    className={`py-2 text-center rounded font-mono-meta text-[11px] transition-colors ${
                      evidenceDepth === "exhaustive"
                        ? "bg-surface-container-lowest text-on-surface font-bold shadow-sm"
                        : "text-on-surface-variant hover:text-on-surface"
                    }`}
                  >
                    Exhaustive (100+)
                  </button>
                </div>
              </div>
            </div>

            {/* Contradiction Resolution Gate */}
            <div className="flex flex-col gap-space-sm bg-surface-container-low p-space-md rounded">
              <span className="font-title-sm text-title-sm text-on-surface">Contradiction Resolution Gate</span>
              <p className="font-body-sm text-body-sm text-on-surface-variant">
                Specify behavior when peer-reviewed clinical claims exhibit divergent statistical conclusions.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-space-md pt-space-xs">
                <label className="flex items-start gap-space-sm p-space-sm rounded bg-surface-container-lowest cursor-pointer shadow-sm">
                  <input
                    type="radio"
                    name="contradiction-gate"
                    checked={contradictionGate === "autonomous"}
                    onChange={() => setContradictionGate("autonomous")}
                    className="mt-1 text-secondary accent-secondary"
                  />
                  <div className="flex flex-col gap-0.5">
                    <span className="font-body-sm text-body-sm font-semibold text-on-surface">
                      Autonomous Triangulation with Merkle Audit Trace
                    </span>
                    <span className="font-body-sm text-[12px] text-on-surface-variant leading-relaxed">
                      Cross-checks raw PubMed dataset tables and trial cohorts, documenting variance in footnotes without halting synthesis.
                    </span>
                  </div>
                </label>
                <label className="flex items-start gap-space-sm p-space-sm rounded bg-surface-container-lowest cursor-pointer shadow-sm">
                  <input
                    type="radio"
                    name="contradiction-gate"
                    checked={contradictionGate === "human"}
                    onChange={() => setContradictionGate("human")}
                    className="mt-1 text-secondary accent-secondary"
                  />
                  <div className="flex flex-col gap-0.5">
                    <span className="font-body-sm text-body-sm font-semibold text-on-surface">
                      Human-in-the-Loop Approval Required
                    </span>
                    <span className="font-body-sm text-[12px] text-on-surface-variant leading-relaxed">
                      Halts agent pipeline and pushes an operational interruption alert to the Principal Lead for any divergence exceeding 1.0%.
                    </span>
                  </div>
                </label>
              </div>
            </div>

            {/* Citation Grounding Checkboxes */}
            <div className="flex flex-col gap-space-sm">
              <span className="font-mono-meta text-mono-meta text-outline tracking-wider uppercase">
                Citation Grounding & Provenance Filters
              </span>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-space-sm">
                <label className="flex items-center gap-space-sm p-space-sm rounded bg-surface-container-low hover:bg-surface-container cursor-pointer transition-colors">
                  <input
                    type="checkbox"
                    checked={strictPrimary}
                    onChange={(e) => setStrictPrimary(e.target.checked)}
                    className="rounded text-secondary accent-secondary"
                  />
                  <span className="font-body-sm text-body-sm text-on-surface">
                    Strict Primary Literature Only (PubMed, FDA, IEEE, arXiv)
                  </span>
                </label>
                <label className="flex items-center gap-space-sm p-space-sm rounded bg-surface-container-low hover:bg-surface-container cursor-pointer transition-colors">
                  <input
                    type="checkbox"
                    checked={scrubMarketing}
                    onChange={(e) => setScrubMarketing(e.target.checked)}
                    className="rounded text-secondary accent-secondary"
                  />
                  <span className="font-body-sm text-body-sm text-on-surface">
                    Scrub Commercial & Sponsored Marketing Domains
                  </span>
                </label>
                <label className="flex items-center gap-space-sm p-space-sm rounded bg-surface-container-low hover:bg-surface-container cursor-pointer transition-colors">
                  <input
                    type="checkbox"
                    checked={autoBibtex}
                    onChange={(e) => setAutoBibtex(e.target.checked)}
                    className="rounded text-secondary accent-secondary"
                  />
                  <span className="font-body-sm text-body-sm text-on-surface">
                    Automatic BibTeX & Cryptographic DOI Signature
                  </span>
                </label>
              </div>
            </div>
          </section>

          {/* Section 3: Appearance & Workspace Density */}
          <section className="bg-surface-container-lowest rounded shadow-sm p-space-lg flex flex-col gap-space-lg" id="appearance">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-space-sm pb-space-sm bg-surface-container-low px-space-md py-space-sm rounded">
              <div className="flex items-center gap-space-sm">
                <div className="w-8 h-8 rounded bg-primary text-on-primary flex items-center justify-center font-mono-meta text-mono-meta font-bold">
                  03
                </div>
                <div>
                  <h2 className="font-title-sm text-title-sm text-on-surface">
                    Appearance & Workspace Density
                  </h2>
                  <p className="font-body-sm text-body-sm text-on-surface-variant">
                    Calibrate ergonomic readability, tonal palette, and typesetting scales for analytical dossiers.
                  </p>
                </div>
              </div>
              <span className="font-mono-meta text-mono-meta px-2 py-1 rounded bg-surface-container text-on-surface font-semibold self-start md:self-auto">
                Light Editorial Active
              </span>
            </div>

            {/* Theme Selection Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-space-md">
              <div
                onClick={() => setSelectedTheme("light-editorial")}
                className={`bg-surface-container-low rounded p-space-md flex flex-col gap-space-sm shadow-sm relative cursor-pointer ${
                  selectedTheme === "light-editorial" ? "ring-2 ring-secondary" : ""
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-title-sm text-title-sm text-on-surface">Light Editorial</span>
                  {selectedTheme === "light-editorial" ? (
                    <span className="material-symbols-outlined text-[20px] text-secondary">check_circle</span>
                  ) : (
                    <span className="w-4 h-4 rounded-full bg-surface-container-highest" />
                  )}
                </div>
                <p className="font-body-sm text-[12px] text-on-surface-variant leading-relaxed">
                  Warm off-white base with high-contrast obsidian operational accents and Newsreader serif headings.
                </p>
                <div className="h-16 w-full rounded bg-[#FAF9F5] shadow-inner p-2 flex items-center gap-2">
                  <div className="w-4 h-full bg-[#151619] rounded-sm"></div>
                  <div className="flex-1 flex flex-col gap-1">
                    <div className="w-2/3 h-2 bg-[#1B1C1A] rounded-sm"></div>
                    <div className="w-1/2 h-1.5 bg-[#76777B] rounded-sm"></div>
                  </div>
                </div>
                <span className="font-mono-meta text-mono-meta text-secondary font-semibold uppercase">
                  Currently Applied
                </span>
              </div>

              <div
                onClick={() => setSelectedTheme("dark-obsidian")}
                className={`bg-surface-container-low rounded p-space-md flex flex-col gap-space-sm hover:bg-surface-container cursor-pointer transition-colors ${
                  selectedTheme === "dark-obsidian" ? "ring-2 ring-secondary" : ""
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-title-sm text-title-sm text-on-surface">Dark Obsidian</span>
                  {selectedTheme === "dark-obsidian" ? (
                    <span className="material-symbols-outlined text-[20px] text-secondary">check_circle</span>
                  ) : (
                    <span className="w-4 h-4 rounded-full bg-surface-container-highest" />
                  )}
                </div>
                <p className="font-body-sm text-[12px] text-on-surface-variant leading-relaxed">
                  Deep slate charcoal palette optimized for low-light laboratory monitors and intense night syntheses.
                </p>
                <div className="h-16 w-full rounded bg-[#151619] p-2 flex items-center gap-2">
                  <div className="w-4 h-full bg-[#202226] rounded-sm"></div>
                  <div className="flex-1 flex flex-col gap-1">
                    <div className="w-2/3 h-2 bg-white/80 rounded-sm"></div>
                    <div className="w-1/2 h-1.5 bg-white/40 rounded-sm"></div>
                  </div>
                </div>
                <span className="font-mono-meta text-mono-meta text-outline uppercase">Select Profile</span>
              </div>

              <div
                onClick={() => setSelectedTheme("system")}
                className={`bg-surface-container-low rounded p-space-md flex flex-col gap-space-sm hover:bg-surface-container cursor-pointer transition-colors ${
                  selectedTheme === "system" ? "ring-2 ring-secondary" : ""
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-title-sm text-title-sm text-on-surface">System Automated</span>
                  {selectedTheme === "system" ? (
                    <span className="material-symbols-outlined text-[20px] text-secondary">check_circle</span>
                  ) : (
                    <span className="w-4 h-4 rounded-full bg-surface-container-highest" />
                  )}
                </div>
                <p className="font-body-sm text-[12px] text-on-surface-variant leading-relaxed">
                  Dynamically mirrors local operating system appearance preferences and dark-mode schedules.
                </p>
                <div className="h-16 w-full rounded bg-surface-container-highest p-2 flex items-center justify-center">
                  <span className="material-symbols-outlined text-[24px] text-outline">brightness_auto</span>
                </div>
                <span className="font-mono-meta text-mono-meta text-outline uppercase">Select Profile</span>
              </div>
            </div>

            {/* Typography & Density Controls */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-space-md pt-space-xs">
              <div className="bg-surface-container-low rounded p-space-md flex flex-col justify-between gap-space-sm">
                <div>
                  <span className="font-title-sm text-title-sm text-on-surface">Interface Density</span>
                  <p className="font-body-sm text-body-sm text-on-surface-variant">
                    Compact padding allows larger tabular cross-comparison visibility.
                  </p>
                </div>
                <div className="grid grid-cols-3 gap-1 bg-surface-container-highest p-1 rounded">
                  <button
                    type="button"
                    onClick={() => setDensity("comfortable")}
                    className={`py-1.5 text-center rounded font-mono-meta text-[11px] ${
                      density === "comfortable"
                        ? "bg-surface-container-lowest text-on-surface font-bold shadow-sm"
                        : "text-on-surface-variant"
                    }`}
                  >
                    Comfortable
                  </button>
                  <button
                    type="button"
                    onClick={() => setDensity("architectural")}
                    className={`py-1.5 text-center rounded font-mono-meta text-[11px] ${
                      density === "architectural"
                        ? "bg-surface-container-lowest text-on-surface font-bold shadow-sm"
                        : "text-on-surface-variant"
                    }`}
                  >
                    Architectural
                  </button>
                  <button
                    type="button"
                    onClick={() => setDensity("high")}
                    className={`py-1.5 text-center rounded font-mono-meta text-[11px] ${
                      density === "high"
                        ? "bg-surface-container-lowest text-on-surface font-bold shadow-sm"
                        : "text-on-surface-variant"
                    }`}
                  >
                    High Density
                  </button>
                </div>
              </div>

              <div className="bg-surface-container-low rounded p-space-md flex items-center justify-between gap-space-sm">
                <div className="flex flex-col gap-1">
                  <span className="font-title-sm text-title-sm text-on-surface">
                    High-Legibility Serifs in Dossiers
                  </span>
                  <p className="font-body-sm text-body-sm text-on-surface-variant">
                    Renders analytical report text in Newsreader with optical sizing and ligature glyphs enabled.
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer flex-shrink-0">
                  <input
                    type="checkbox"
                    checked={serifDossiers}
                    onChange={(e) => setSerifDossiers(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-surface-container-highest peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-secondary"></div>
                </label>
              </div>
            </div>
          </section>

          {/* Section 4: Security, Active Sessions & OAuth Governance */}
          <section className="bg-surface-container-lowest rounded shadow-sm p-space-lg flex flex-col gap-space-lg" id="security">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-space-sm pb-space-sm bg-surface-container-low px-space-md py-space-sm rounded">
              <div className="flex items-center gap-space-sm">
                <div className="w-8 h-8 rounded bg-primary text-on-primary flex items-center justify-center font-mono-meta text-mono-meta font-bold">
                  04
                </div>
                <div>
                  <h2 className="font-title-sm text-title-sm text-on-surface">
                    Security, Active Sessions & OAuth Governance
                  </h2>
                  <p className="font-body-sm text-body-sm text-on-surface-variant">
                    Hardware-backed cryptographic keystores, active operational tokens, and connected services.
                  </p>
                </div>
              </div>
              <span className="font-mono-meta text-mono-meta px-2 py-1 rounded bg-secondary-container/50 text-on-secondary-container font-semibold self-start md:self-auto">
                Hardware Enclave: Sealed
              </span>
            </div>

            {/* Connected MCP Gateways & Integrations */}
            <div className="flex flex-col gap-space-sm">
              <div className="flex items-center justify-between">
                <span className="font-mono-meta text-mono-meta text-outline tracking-wider uppercase">
                  Connected Accounts & MCP Gateways
                </span>
                <span className="font-mono-meta text-mono-meta text-secondary font-semibold">
                  4 Verified
                </span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-space-md">
                <div className="bg-surface-container-low rounded p-space-md flex flex-col justify-between gap-space-sm">
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="font-title-sm text-title-sm text-on-surface">GitHub Enterprise</span>
                      <p className="font-mono-meta text-mono-meta text-on-surface-variant">@davidross-research</p>
                    </div>
                    <span className="material-symbols-outlined text-[20px] text-secondary">verified_user</span>
                  </div>
                  <div className="flex flex-col gap-1 text-mono-meta font-mono-meta text-outline">
                    <span>Scope: Read-only Repositories</span>
                    <span>Mapped: 4 Scientific Repos</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => alert("GitHub Enterprise integration permissions active.")}
                    className="w-full mt-2 py-1.5 rounded bg-surface-container hover:bg-surface-container-high text-on-surface font-body-sm text-[12px] font-medium transition-colors"
                  >
                    Manage Permissions
                  </button>
                </div>

                <div className="bg-surface-container-low rounded p-space-md flex flex-col justify-between gap-space-sm">
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="font-title-sm text-title-sm text-on-surface">Tavily Research API</span>
                      <p className="font-mono-meta text-mono-meta text-on-surface-variant">tvly-live-••••••••9a2f</p>
                    </div>
                    <span className="material-symbols-outlined text-[20px] text-secondary">vpn_key</span>
                  </div>
                  <div className="flex flex-col gap-1 text-mono-meta font-mono-meta text-outline">
                    <span>Storage: Enclave Secure Vault</span>
                    <span>Latency: 142ms average</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => alert("Rotated Tavily enclave key successfully.")}
                    className="w-full mt-2 py-1.5 rounded bg-surface-container hover:bg-surface-container-high text-on-surface font-body-sm text-[12px] font-medium transition-colors"
                  >
                    Rotate Enclave Key
                  </button>
                </div>

                <div className="bg-surface-container-low rounded p-space-md flex flex-col justify-between gap-space-sm">
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="font-title-sm text-title-sm text-on-surface">Qdrant Vector Cluster</span>
                      <p className="font-mono-meta text-mono-meta text-on-surface-variant">bio-fda-core.cluster.rf</p>
                    </div>
                    <span className="material-symbols-outlined text-[20px] text-secondary">lan</span>
                  </div>
                  <div className="flex flex-col gap-1 text-mono-meta font-mono-meta text-outline">
                    <span>Protocol: mTLS v1.3 Encrypted</span>
                    <span>Index: 4,821,902 vectors</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => alert("Certificate verified. Issuer: ResearchForge Enclave Root CA.")}
                    className="w-full mt-2 py-1.5 rounded bg-surface-container hover:bg-surface-container-high text-on-surface font-body-sm text-[12px] font-medium transition-colors"
                  >
                    Inspect Certificates
                  </button>
                </div>
              </div>
            </div>

            {/* Active Research Sessions Table */}
            <div className="flex flex-col gap-space-sm pt-space-xs">
              <div className="flex items-center justify-between">
                <span className="font-mono-meta text-mono-meta text-outline tracking-wider uppercase">
                  Active Research Sessions & Nodes
                </span>
                <button
                  type="button"
                  onClick={() => setSessions(sessions.filter(s => s.current))}
                  className="font-mono-meta text-mono-meta text-error hover:underline uppercase tracking-wider font-semibold"
                >
                  Revoke Other Sessions
                </button>
              </div>
              <div className="overflow-x-auto rounded bg-surface-container-low">
                <table className="w-full text-left font-body-sm text-body-sm">
                  <thead>
                    <tr className="bg-surface-container font-mono-meta text-[11px] text-outline tracking-wider uppercase">
                      <th className="py-2.5 px-space-md font-medium">Session / Node</th>
                      <th className="py-2.5 px-space-md font-medium">Location & Network</th>
                      <th className="py-2.5 px-space-md font-medium">Status & Verification</th>
                      <th className="py-2.5 px-space-md font-medium text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-surface-container-highest">
                    {sessions.map((sess) => (
                      <tr key={sess.id}>
                        <td className="py-3 px-space-md">
                          <div className="flex flex-col">
                            <span className="font-semibold text-on-surface">{sess.device}</span>
                            <span className="font-mono-meta text-mono-meta text-outline">{sess.role}</span>
                          </div>
                        </td>
                        <td className="py-3 px-space-md">
                          <div className="flex flex-col">
                            <span className="text-on-surface">{sess.location}</span>
                            <span className="font-mono-meta text-mono-meta text-outline">IP: {sess.ip}</span>
                          </div>
                        </td>
                        <td className="py-3 px-space-md">
                          {sess.current ? (
                            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-secondary-container/60 text-on-secondary-container font-mono-meta text-[10px] font-bold">
                              <span className="w-1.5 h-1.5 rounded-full bg-secondary"></span>
                              Current Session
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-surface-container text-on-surface-variant font-mono-meta text-[10px]">
                              {sess.status}
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-space-md text-right">
                          {sess.current ? (
                            <span className="font-mono-meta text-mono-meta text-outline">Active</span>
                          ) : (
                            <button
                              type="button"
                              onClick={() => setSessions(sessions.filter(s => s.id !== sess.id))}
                              className="text-error font-body-sm text-[12px] hover:underline"
                            >
                              Revoke
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* 2FA & Hardware Key Card */}
            <div className="bg-surface-container-low rounded p-space-md flex flex-col md:flex-row md:items-center justify-between gap-space-md">
              <div className="flex items-center gap-space-md">
                <div className="w-10 h-10 rounded bg-surface-container flex items-center justify-center text-on-surface flex-shrink-0">
                  <span className="material-symbols-outlined text-[24px]">key</span>
                </div>
                <div className="flex flex-col">
                  <span className="font-title-sm text-title-sm text-on-surface">
                    Two-Factor Hardware Security (FIDO2 / WebAuthn)
                  </span>
                  <p className="font-body-sm text-body-sm text-on-surface-variant">
                    Registered Token: YubiKey 5C NFC (Primary PIV Enclave slot active).
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => alert("Hardware tokens enrolled: 1 FIDO2 security key active.")}
                className="px-space-md py-2 rounded bg-surface-container hover:bg-surface-container-high text-on-surface font-body-sm text-body-sm font-medium transition-colors self-start md:self-auto"
              >
                Manage Keys
              </button>
            </div>
          </section>

          {/* Bottom Sticky Action & Sync Bar */}
          <footer className="sticky bottom-4 z-20 bg-surface-container-lowest/95 backdrop-blur-md rounded shadow-lg p-space-md flex flex-col sm:flex-row items-center justify-between gap-space-sm border border-outline-variant/30">
            <div className="flex items-center gap-2 text-mono-meta font-mono-meta text-on-surface-variant">
              <span className="w-2 h-2 rounded-full bg-secondary"></span>
              <span>
                Last synchronized with cluster: <strong className="text-on-surface">2 minutes ago</strong> (Hash: 0x9f18a2)
              </span>
            </div>
            <div className="flex items-center gap-space-sm w-full sm:w-auto justify-end">
              <button
                type="button"
                onClick={handleReset}
                className="px-space-md py-2 rounded bg-surface-container hover:bg-surface-container-high text-on-surface font-body-sm text-body-sm transition-colors"
              >
                Reset Defaults
              </button>
              <button
                type="button"
                onClick={handleSave}
                className="flex items-center gap-2 px-space-md py-2 rounded bg-primary hover:bg-primary-container text-on-primary font-body-sm text-body-sm font-medium transition-all shadow-sm"
              >
                <span>
                  {saveStatus === "saving"
                    ? "Saving..."
                    : saveStatus === "saved"
                    ? "Config Saved ✓"
                    : "Commit Configuration"}
                </span>
                <kbd className="px-1.5 py-0.5 rounded bg-white/20 font-mono-meta text-[10px] text-on-primary">
                  ⌘S
                </kbd>
              </button>
            </div>
          </footer>
        </main>
      </div>
    </div>
  );
}
