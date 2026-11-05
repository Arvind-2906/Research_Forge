"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { projectService } from "../../../../services/projectService";
import { researchService } from "../../../../services/researchService";

export default function ProjectDetailsPage() {
  const params = useParams();
  const projectId = params?.projectId || "proj-01";

  const [project, setProject] = useState(null);
  const [runs, setRuns] = useState([]);
  const [activeTab, setActiveTab] = useState("overview"); // overview | runs | docs | dossiers | graph
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadProjectDetails() {
      try {
        const [projRes, runsRes] = await Promise.allSettled([
          projectService.getById(projectId),
          researchService.listRuns({ projectId }),
        ]);

        if (projRes.status === "fulfilled" && projRes.value) {
          setProject(projRes.value);
        } else {
          setProject({
            id: projectId,
            name: "AI in Healthcare & Clinical Precedents",
            domain: "BIO-INFORMATICS & FDA LAW",
            description:
              "Autonomous extraction and triangulation of 510(k) clearances, clinical trial cohort efficacy, and SaMD adaptive software regulation across peer-reviewed and FDA corpora.",
            lead: "Dr. David Ross, Principal Lead",
            vectorPartition: "/bio-fda-core (14.2 GB / 412 Docs)",
            trustScore: "96.4% Verified Consensus",
            createdAt: "Oct 14, 2024",
            runsCount: 34,
            corpusCount: 412,
            dossiersCount: 8,
          });
        }

        if (runsRes.status === "fulfilled" && Array.isArray(runsRes.value?.data)) {
          setRuns(runsRes.value.data);
        } else {
          setRuns([
            {
              id: "run-01",
              title: "FDA 510(k) Precedents for Autonomous Diagnostic Radiology Software",
              status: "COMPLETED",
              sourcesCount: 42,
              claimsCount: 88,
              confidence: 99.2,
              timeAgo: "2h ago",
            },
            {
              id: "run-02",
              title: "SaMD Machine Learning Validation Gaps across Multi-Vendor MRI Scanners",
              status: "COMPLETED",
              sourcesCount: 38,
              claimsCount: 64,
              confidence: 94.8,
              timeAgo: "Yesterday",
            },
            {
              id: "run-03",
              title: "Clinical Cohort Discrepancy Audit: Mayo vs Memorial Sloan Kettering",
              status: "RUNNING",
              sourcesCount: 29,
              claimsCount: 41,
              confidence: 96.1,
              timeAgo: "Active",
            },
          ]);
        }
      } catch (err) {
        console.warn("Failed to load project details:", err);
      } finally {
        setLoading(false);
      }
    }

    loadProjectDetails();
  }, [projectId]);

  return (
    <div className="flex flex-col w-full gap-space-lg">
      {/* Top Breadcrumb & Telemetry */}
      <div className="flex flex-wrap items-center justify-between gap-space-sm pb-space-sm border-b border-outline-variant/30">
        <div className="flex items-center gap-2 min-w-0">
          <Link href="/dashboard" className="font-mono-meta text-mono-meta uppercase tracking-wider text-outline hover:text-primary">
            Workspace
          </Link>
          <span className="font-mono-meta text-mono-meta text-outline-variant">/</span>
          <Link href="/projects" className="font-mono-meta text-mono-meta uppercase tracking-wider text-outline hover:text-primary">
            Projects
          </Link>
          <span className="font-mono-meta text-mono-meta text-outline-variant">/</span>
          <span className="font-mono-meta text-mono-meta uppercase tracking-wider text-secondary font-semibold">
            #{projectId.slice(0, 8)}
          </span>
          <span className="font-mono-meta text-mono-meta text-outline-variant">/</span>
          <span className="font-mono-meta text-mono-meta uppercase tracking-widest text-on-surface font-semibold truncate">
            {project?.name || "Clinical Precedents"}
          </span>
        </div>
        <div className="flex items-center gap-space-md">
          <div className="flex items-center gap-2 px-space-sm py-1 rounded bg-surface border border-outline-variant/40">
            <span className="material-symbols-outlined text-[14px] text-secondary">dns</span>
            <span className="font-mono-meta text-mono-meta text-on-surface-variant font-medium">Cluster-Omega-04</span>
            <span className="font-mono-meta text-mono-meta text-outline">·</span>
            <span className="font-mono-meta text-mono-meta text-secondary font-bold">14.2 GB VEC</span>
          </div>
          <div className="flex items-center gap-1.5 px-space-sm py-1 rounded bg-secondary-container/20 border border-secondary/30">
            <span className="w-1.5 h-1.5 rounded-full bg-secondary animate-pulse" />
            <span className="font-mono-meta text-mono-meta text-on-secondary-container font-semibold uppercase">
              Swarm Sync · Online
            </span>
          </div>
        </div>
      </div>

      {/* Editorial Project Header */}
      <header className="bg-surface-container-lowest p-space-lg rounded-xl border border-outline-variant/50 relative overflow-hidden shadow-sm">
        <div className="absolute -right-16 -top-16 w-80 h-80 rounded-full bg-secondary/5 blur-3xl pointer-events-none" />
        <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-space-lg relative z-10">
          <div className="flex flex-col gap-space-xs max-w-4xl">
            <div className="flex flex-wrap items-center gap-space-xs">
              <span className="px-2 py-0.5 rounded bg-surface-container border border-outline-variant/60 font-mono-meta text-mono-meta text-on-surface uppercase tracking-wider font-medium">
                {project?.domain || "BIO-INFORMATICS & FDA LAW"}
              </span>
              <span className="flex items-center gap-1.5 px-2.5 py-0.5 rounded bg-secondary-container/30 border border-secondary/40 font-mono-meta text-mono-meta text-on-secondary-container font-semibold uppercase">
                <span className="w-1.5 h-1.5 rounded-full bg-secondary" />
                ACTIVE SWARM
              </span>
              <span className="font-mono-meta text-mono-meta text-outline uppercase tracking-wider">
                ID: #{projectId.slice(0, 8)}
              </span>
            </div>

            <h1 className="font-headline-lg text-headline-lg text-on-surface font-normal tracking-tight pt-1">
              {project?.name || "AI in Healthcare & Clinical Precedents"}
            </h1>

            <p className="font-body-md text-body-md text-on-surface-variant max-w-3xl leading-relaxed">
              {project?.description ||
                "Autonomous extraction and triangulation of 510(k) clearances, clinical trial cohort efficacy, and SaMD adaptive software regulation across peer-reviewed and FDA corpora."}
            </p>

            <div className="flex flex-wrap items-center gap-y-2 gap-x-space-lg pt-space-sm font-mono-meta text-mono-meta text-on-surface-variant border-t border-outline-variant/20 mt-space-xs">
              <div className="flex items-center gap-1.5">
                <span className="text-outline uppercase">Lead:</span>
                <span className="text-on-surface font-medium">{project?.lead || "Dr. David Ross"}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-outline uppercase">Vector Partition:</span>
                <span className="text-on-surface font-medium">
                  {project?.vectorPartition || "/bio-fda-core (14.2 GB / 412 Docs)"}
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-outline uppercase">SLA Trust:</span>
                <span className="text-secondary font-semibold">
                  {project?.trustScore || "96.4% Verified Consensus"}
                </span>
              </div>
            </div>
          </div>

          {/* Action Suite */}
          <div className="flex flex-wrap lg:flex-col items-stretch justify-start gap-space-xs shrink-0 pt-1">
            <Link
              href={`/research/new?projectId=${projectId}`}
              className="flex items-center justify-center gap-2 px-space-md py-2 rounded bg-primary text-on-primary hover:bg-primary-container font-body-sm text-body-sm font-semibold transition-all shadow-sm"
            >
              <span className="material-symbols-outlined text-[16px]">add_circle</span>
              <span>Launch New Research</span>
            </Link>
            <Link
              href="/knowledge-base"
              className="flex items-center justify-center gap-2 px-space-md py-2 rounded bg-surface border border-outline-variant/60 text-on-surface hover:bg-surface-container font-body-sm text-body-sm font-medium transition-all"
            >
              <span className="material-symbols-outlined text-[16px] text-outline">schema</span>
              <span>Explore Graph</span>
            </Link>
          </div>
        </div>
      </header>

      {/* Tabs */}
      <nav className="flex items-center overflow-x-auto border-b border-outline-variant/50 gap-space-xs select-none">
        {[
          { id: "overview", label: "Overview" },
          { id: "runs", label: "Research Runs", count: runs.length },
          { id: "docs", label: "Corpus Documents", count: project?.corpusCount || 412 },
          { id: "dossiers", label: "Synthesized Dossiers", count: project?.dossiersCount || 8 },
        ].map((tab) => {
          const active = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`px-space-md py-2.5 font-body-sm text-body-sm transition-colors border-b-2 flex items-center gap-1.5 whitespace-nowrap ${
                active
                  ? "border-secondary text-on-surface font-semibold bg-surface-container-lowest/60"
                  : "border-transparent text-outline hover:text-on-surface"
              }`}
            >
              <span>{tab.label}</span>
              {tab.count !== undefined && (
                <span className="px-1.5 py-0.2 rounded bg-surface-container text-mono-meta font-mono-meta text-on-surface-variant font-medium">
                  {tab.count}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Runs under project */}
      <div className="bg-surface-container-lowest rounded-xl border border-outline-variant/60 shadow-sm overflow-hidden">
        <div className="p-space-md border-b border-outline-variant/40 flex items-center justify-between">
          <h3 className="font-title-sm text-title-sm text-on-surface">Associated Research Runs</h3>
          <Link
            href={`/research/new?projectId=${projectId}`}
            className="text-secondary font-label-md text-label-md hover:underline flex items-center gap-1"
          >
            <span>+ New Run in this Project</span>
          </Link>
        </div>
        <div className="divide-y divide-outline-variant/30">
          {runs.map((r) => (
            <div
              key={r.id}
              className="p-space-md hover:bg-surface-container-low transition-colors flex flex-col md:flex-row md:items-center justify-between gap-space-sm"
            >
              <div className="min-w-0">
                <Link
                  href={r.status === "RUNNING" ? `/research/${r.id}` : `/reports/${r.id}`}
                  className="font-body-md text-body-md font-medium text-on-surface hover:text-secondary truncate block"
                >
                  {r.title || r.query}
                </Link>
                <div className="flex items-center gap-3 mt-1 font-mono-meta text-mono-meta text-outline">
                  <span>{r.sourcesCount || 38} sources</span>
                  <span>·</span>
                  <span>{r.claimsCount || 42} claims</span>
                  <span>·</span>
                  <span>Confidence: {r.confidence || 95.0}%</span>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span
                  className={`px-2 py-0.5 rounded font-mono-meta text-[10px] uppercase font-bold border ${
                    r.status === "COMPLETED"
                      ? "bg-secondary/15 text-secondary border-secondary/30"
                      : "bg-secondary-container/50 text-on-secondary-container border-secondary/40"
                  }`}
                >
                  {r.status}
                </span>
                <Link
                  href={`/reports/${r.id}`}
                  className="px-3 py-1 rounded bg-surface-container hover:bg-surface-container-high text-on-surface font-label-md text-label-md transition-colors"
                >
                  Dossier
                </Link>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

