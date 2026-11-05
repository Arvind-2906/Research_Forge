"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { reportService } from "../../../services/reportService";

export default function ReportsPage() {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadReports() {
      try {
        const data = await reportService.list();
        if (Array.isArray(data) && data.length > 0) {
          setReports(data);
        } else {
          setReports([
            {
              id: "REP-2024-0892",
              runId: "run-03",
              title:
                "Autonomous Diagnostic Systems & FDA Regulatory Precedents (2024–2028): A Triangulated Synthesis",
              domain: "BIO-INFORMATICS & FDA LAW",
              status: "CANONICAL",
              confidence: 98.4,
              sourcesCount: 86,
              publishedAt: "Nov 18, 2024",
              author: "Dr. David Ross, Principal Lead",
            },
            {
              id: "REP-2024-0741",
              runId: "run-01",
              title: "Climate Policy Trends 2025: Global Carbon Border Adjustments (CBAM) Compliance",
              domain: "Macro Climate & Trade",
              status: "VERIFIED",
              confidence: 99.2,
              sourcesCount: 42,
              publishedAt: "Nov 15, 2024",
              author: "PolicyBot-Core",
            },
            {
              id: "REP-2024-0612",
              runId: "run-02",
              title: "Quantum Computing Advances in High-Pressure Superconductors & Coherence Times",
              domain: "Quantum Physics",
              status: "VERIFIED",
              confidence: 84.0,
              sourcesCount: 67,
              publishedAt: "Nov 12, 2024",
              author: "ArxivDeep-Agent",
            },
            {
              id: "REP-2024-0550",
              runId: "run-04",
              title: "Global EV Solid-State Battery Supply Chain Bottlenecks (2025–2030)",
              domain: "Industrial Supply",
              status: "ARCHIVED",
              confidence: 96.5,
              sourcesCount: 53,
              publishedAt: "Nov 08, 2024",
              author: "MarketAgent",
            },
          ]);
        }
      } catch (err) {
        console.warn("Reports list fetch error:", err);
      } finally {
        setLoading(false);
      }
    }

    loadReports();
  }, []);

  return (
    <div className="flex flex-col w-full space-y-space-lg">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-space-md pb-space-md border-b border-surface-container-highest/60">
        <div>
          <div className="flex items-center gap-2 text-mono-meta font-mono-meta uppercase tracking-wider text-outline mb-1">
            <Link href="/dashboard" className="hover:text-primary">
              Workspace
            </Link>
            <span>/</span>
            <span className="text-secondary font-semibold">Reports</span>
          </div>
          <h1 className="font-headline-lg text-headline-lg text-primary tracking-tight">
            Synthesized Research Dossiers
          </h1>
          <p className="font-body-md text-body-md text-on-surface-variant max-w-2xl mt-1">
            Archival repository of finalized multi-agent syntheses, claim-level consensus graphs, and validated
            epistemic proofs.
          </p>
        </div>
        <Link
          href="/research/new"
          className="flex items-center gap-1.5 px-space-md py-2 rounded bg-primary text-on-primary hover:bg-primary-container transition-all font-body-sm text-body-sm font-semibold shadow-sm shrink-0"
        >
          <span className="material-symbols-outlined text-[18px]">add</span>
          <span>New Synthesis</span>
        </Link>
      </div>

      {/* Reports Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-space-lg">
        {reports.map((rep) => (
          <div
            key={rep.id}
            className="bg-surface-container-lowest p-space-lg rounded-xl border border-outline-variant/50 shadow-sm hover:border-secondary transition-all flex flex-col justify-between group"
          >
            <div>
              <div className="flex items-center justify-between gap-2 mb-2">
                <span className="px-2 py-0.5 rounded bg-secondary-container/40 text-on-secondary-container font-mono-meta text-[10px] font-semibold uppercase">
                  {rep.status}
                </span>
                <span className="font-mono-meta text-mono-meta text-outline">{rep.publishedAt}</span>
              </div>
              <h3 className="font-headline-md text-headline-md text-on-surface font-medium group-hover:text-secondary transition-colors line-clamp-2">
                <Link href={`/reports/${rep.id}`}>{rep.title}</Link>
              </h3>
              <div className="flex items-center gap-2 mt-2 font-mono-meta text-mono-meta text-on-surface-variant">
                <span>Domain: {rep.domain}</span>
                <span>·</span>
                <span className="text-secondary font-semibold">Confidence: {rep.confidence}%</span>
              </div>
            </div>

            <div className="pt-space-md border-t border-outline-variant/30 mt-space-md flex items-center justify-between">
              <span className="font-mono-meta text-mono-meta text-outline">
                {rep.sourcesCount} citations verified
              </span>
              <div className="flex items-center gap-2">
                <Link
                  href={`/reports/${rep.id}`}
                  className="px-3 py-1.5 rounded bg-primary text-on-primary font-label-md text-label-md transition-colors"
                >
                  Read Dossier →
                </Link>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

