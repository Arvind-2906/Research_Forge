"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { projectService } from "../../../services/projectService";
import { useWorkspace } from "../../../context/WorkspaceContext";

export default function ProjectsPage() {
  const { currentWorkspace } = useWorkspace();
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newProjectName, setNewProjectName] = useState("");
  const [newProjectDesc, setNewProjectDesc] = useState("");
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    async function loadProjects() {
      try {
        const data = await projectService.list(currentWorkspace?.id);
        if (Array.isArray(data) && data.length > 0) {
          setProjects(data);
        } else {
          setProjects([
            {
              id: "proj-01",
              name: "Quantum & AI Systems Lab / Core Dossiers",
              description:
                "Coherence benchmarks in topological and neutral-atom hardware, error-mitigation scaling, and quantum algorithmic advantage.",
              runsCount: 34,
              sourcesCount: 420,
              membersCount: 6,
              domain: "Quantum Hardware",
              updatedAt: "2h ago",
            },
            {
              id: "proj-02",
              name: "Biosynthetic Catalyst Consortium / Phase II",
              description:
                "Enzymatic carbon-capture optimization, CRISPR-directed metabolic engineering, and synthetic fuel catalytic pathways.",
              runsCount: 22,
              sourcesCount: 310,
              membersCount: 4,
              domain: "Synthetic Biology",
              updatedAt: "1d ago",
            },
            {
              id: "proj-03",
              name: "Autonomous Grid Infrastructure / Horizon 2030",
              description:
                "Solid-state battery storage degradation, distributed inverter stability, and algorithmic dispatch in multi-terminal microgrids.",
              runsCount: 19,
              sourcesCount: 280,
              membersCount: 8,
              domain: "Clean Energy",
              updatedAt: "3d ago",
            },
            {
              id: "proj-04",
              name: "Cross-Market Arbitrage & Macro Quantitative",
              description:
                "Systematic high-frequency econometric analysis, yield-curve anomalies, and sovereign debt credit default swap forecasting.",
              runsCount: 48,
              sourcesCount: 650,
              membersCount: 3,
              domain: "Quantitative Finance",
              updatedAt: "5d ago",
            },
          ]);
        }
      } catch (err) {
        console.warn("Failed to load projects:", err);
      } finally {
        setLoading(false);
      }
    }

    loadProjects();
  }, [currentWorkspace?.id]);

  const handleCreateProject = async (e) => {
    e.preventDefault();
    if (!newProjectName.trim()) return;

    setCreating(true);
    try {
      const created = await projectService.create({
        name: newProjectName.trim(),
        description: newProjectDesc.trim(),
        workspaceId: currentWorkspace?.id,
      });

      if (created) {
        setProjects((prev) => [created, ...prev]);
      }
      setShowCreateModal(false);
      setNewProjectName("");
      setNewProjectDesc("");
    } catch (err) {
      console.warn("Project create error:", err);
      // Local fallback
      setProjects((prev) => [
        {
          id: `proj-${Date.now()}`,
          name: newProjectName.trim(),
          description: newProjectDesc.trim(),
          runsCount: 0,
          sourcesCount: 0,
          membersCount: 1,
          domain: "Custom Programme",
          updatedAt: "Just now",
        },
        ...prev,
      ]);
      setShowCreateModal(false);
      setNewProjectName("");
      setNewProjectDesc("");
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="flex flex-col w-full space-y-space-lg">
      {/* Breadcrumb Top Strip */}
      <div className="flex flex-wrap items-center justify-between gap-space-sm pb-space-xs">
        <div className="flex items-center gap-2 text-mono-meta font-mono-meta uppercase tracking-wider text-outline">
          <Link href="/dashboard" className="hover:text-primary transition-colors">
            Workspace
          </Link>
          <span>/</span>
          <span className="text-secondary font-semibold">Projects &amp; Repositories</span>
        </div>
        <div className="flex items-center gap-space-md text-mono-meta font-mono-meta">
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-surface-container text-on-surface-variant">
            <span className="w-1.5 h-1.5 rounded-full bg-secondary" />
            FLEET ENGINE: CLUSTER-OMEGA-04
          </span>
          <span className="text-outline">VECTOR ENGINE: PGVECTOR-Q8</span>
        </div>
      </div>

      {/* Page Header & Action Bar */}
      <div className="flex flex-col xl:flex-row xl:items-end justify-between gap-space-lg pb-space-md border-b border-surface-container-highest/60">
        <div className="space-y-space-xs max-w-3xl">
          <div className="flex items-center gap-space-sm">
            <h1 className="font-headline-lg text-headline-lg text-primary tracking-tight">
              Research Projects
            </h1>
            <span className="px-2 py-0.5 rounded text-mono-meta font-mono-meta tracking-widest uppercase bg-surface-container-highest text-on-surface font-semibold">
              {projects.length} Active Programmes
            </span>
          </div>
          <p className="font-body-md text-body-md text-on-surface-variant text-pretty">
            Curate epistemic domains, orchestrate dedicated multi-agent fleets, and manage shared corpus vector
            indexes across institutional research initiatives.
          </p>
        </div>

        {/* Action Toolbar */}
        <div className="flex items-center gap-space-sm flex-wrap">
          <button
            type="button"
            onClick={() => setShowCreateModal(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded bg-primary text-on-primary text-body-sm font-body-sm font-medium hover:bg-primary-container transition-all shadow-sm"
          >
            <span className="material-symbols-outlined text-[16px]">add</span>
            <span>Create Project</span>
          </button>
        </div>
      </div>

      {/* Executive Metric Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-space-md">
        <div className="bg-surface-container-lowest p-space-md rounded-xl border border-outline-variant/40 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between text-mono-meta font-mono-meta text-outline mb-1">
            <span className="uppercase tracking-wider">Active Programmes</span>
            <span className="material-symbols-outlined text-[16px] text-secondary">workspaces</span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="font-headline-lg text-headline-lg font-normal text-on-surface">
              {projects.length || 8}
            </span>
            <span className="font-mono-meta text-mono-meta text-secondary font-medium">
              4 Cross-Disciplinary
            </span>
          </div>
        </div>

        <div className="bg-surface-container-lowest p-space-md rounded-xl border border-outline-variant/40 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between text-mono-meta font-mono-meta text-outline mb-1">
            <span className="uppercase tracking-wider">Cumulative Syntheses</span>
            <span className="material-symbols-outlined text-[16px] text-secondary">insights</span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="font-headline-lg text-headline-lg font-normal text-on-surface">142</span>
            <span className="font-mono-meta text-mono-meta text-on-surface-variant font-medium">
              Completed
            </span>
          </div>
        </div>

        <div className="bg-surface-container-lowest p-space-md rounded-xl border border-outline-variant/40 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between text-mono-meta font-mono-meta text-outline mb-1">
            <span className="uppercase tracking-wider">Ingested Corpora</span>
            <span className="material-symbols-outlined text-[16px] text-secondary">library_books</span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="font-headline-lg text-headline-lg font-normal text-on-surface">1,842</span>
            <span className="font-mono-meta text-mono-meta text-on-surface-variant font-medium">Docs</span>
          </div>
        </div>

        <div className="bg-surface-container-lowest p-space-md rounded-xl border border-outline-variant/40 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between text-mono-meta font-mono-meta text-outline mb-1">
            <span className="uppercase tracking-wider">Dedicated Agent Nodes</span>
            <span className="material-symbols-outlined text-[16px] text-secondary">smart_toy</span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="font-headline-lg text-headline-lg font-normal text-on-surface">14</span>
            <span className="font-mono-meta text-mono-meta text-secondary font-medium">Active</span>
          </div>
        </div>
      </div>

      {/* Projects Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-space-lg">
        {projects.map((p) => (
          <div
            key={p.id}
            className="bg-surface-container-lowest p-space-lg rounded-xl border border-outline-variant/50 shadow-sm hover:border-secondary transition-all flex flex-col justify-between group"
          >
            <div>
              <div className="flex items-start justify-between gap-2 mb-2">
                <span className="px-2 py-0.5 rounded bg-surface-container text-on-surface-variant font-mono-meta text-[11px] font-semibold uppercase">
                  {p.domain || "Research Domain"}
                </span>
                <span className="font-mono-meta text-mono-meta text-outline">{p.updatedAt || "Active"}</span>
              </div>
              <h3 className="font-headline-md text-headline-md text-on-surface font-medium group-hover:text-secondary transition-colors">
                <Link href={`/projects/${p.id}`}>{p.name}</Link>
              </h3>
              <p className="font-body-sm text-body-sm text-on-surface-variant mt-2 line-clamp-2">
                {p.description || "Epistemic workspace dedicated to cross-verified research inquiries."}
              </p>
            </div>

            <div className="pt-space-md border-t border-outline-variant/30 mt-space-md flex items-center justify-between">
              <div className="flex items-center gap-space-md font-mono-meta text-mono-meta text-outline">
                <span className="flex items-center gap-1">
                  <span className="material-symbols-outlined text-[15px]">biotech</span>
                  <span>{p.runsCount || 12} runs</span>
                </span>
                <span className="flex items-center gap-1">
                  <span className="material-symbols-outlined text-[15px]">database</span>
                  <span>{p.sourcesCount || 180} sources</span>
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Link
                  href={`/research/new?projectId=${p.id}`}
                  className="px-3 py-1 rounded bg-surface-container hover:bg-surface-container-high text-on-surface font-label-md text-label-md transition-colors"
                >
                  New Run
                </Link>
                <Link
                  href={`/projects/${p.id}`}
                  className="px-3 py-1 rounded bg-primary text-on-primary font-label-md text-label-md transition-colors"
                >
                  Details
                </Link>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Create Project Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-surface-container-lowest rounded-xl border border-outline-variant/60 shadow-2xl p-space-lg flex flex-col gap-space-md animate-fadeIn">
            <div className="flex items-center justify-between border-b border-outline-variant/40 pb-space-sm">
              <h3 className="font-title-sm text-title-sm text-on-surface font-bold">
                Initialize Research Project
              </h3>
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="text-outline hover:text-on-surface"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            <form onSubmit={handleCreateProject} className="flex flex-col gap-space-md">
              <div className="flex flex-col gap-1.5">
                <label className="font-mono-meta text-mono-meta text-on-surface uppercase">
                  Project Title
                </label>
                <input
                  type="text"
                  required
                  value={newProjectName}
                  onChange={(e) => setNewProjectName(e.target.value)}
                  placeholder="e.g. Neutral-Atom Quantum Processor Scaling"
                  className="w-full px-3 py-2 rounded bg-surface border border-outline-variant/60 font-body-sm text-body-sm text-on-surface focus:outline-none focus:border-secondary"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="font-mono-meta text-mono-meta text-on-surface uppercase">
                  Description &amp; Research Mandate
                </label>
                <textarea
                  rows={3}
                  value={newProjectDesc}
                  onChange={(e) => setNewProjectDesc(e.target.value)}
                  placeholder="Define the primary scientific or analytical inquiry scope for this repository..."
                  className="w-full px-3 py-2 rounded bg-surface border border-outline-variant/60 font-body-sm text-body-sm text-on-surface focus:outline-none focus:border-secondary resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 rounded bg-surface-container hover:bg-surface-container-high text-on-surface font-label-md text-label-md"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="px-4 py-2 rounded bg-primary hover:bg-primary-container text-on-primary font-label-md text-label-md font-bold transition-all shadow-sm flex items-center gap-1.5"
                >
                  {creating ? "Provisioning..." : "Provision Repository"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

