"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { knowledgeGraphService } from "../../../services/knowledgeGraphService";
import { useWorkspace } from "../../../context/WorkspaceContext";

export default function KnowledgeBasePage() {
  const { currentWorkspace } = useWorkspace();

  const [filterType, setFilterType] = useState("all"); // all | CONCEPTS | SOURCES | CLAIMS | ENTITIES
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedNode, setSelectedNode] = useState({
    id: "node_pccp_01",
    label: "Predetermined Change Control Plan (PCCP)",
    type: "REGULATORY_ENTITY",
    section: "21 U.S.C. 360e · FDA CDRH",
    description:
      "A binding protocol cleared under 510(k) or PMA granting device sponsors pre-authorized parameter bounds for machine learning retraining without recurring supplemental clearances.",
    properties: {
      "Statutory Authority": "Section 515C FD&C Act",
      "Epistemic Weight": "0.982 (Merkle Sealed)",
      "Corroborating Filings": "K231459, K240192",
      "Triangulated Nodes": "14 Connected Entities",
    },
    edges: [
      { relation: "governs update loop", target: "Adaptive Deep Learning Radiomics", type: "CONCEPT" },
      { relation: "established by", target: "FDA 510(k) Pre-Market Notification", type: "SOURCE" },
      { relation: "bounded claim", target: "MRI Coil Variance 14% ROC Deviation", type: "CLAIM" },
      { relation: "mandates threshold", target: "Non-Inferiority AUC ≥ 0.950", type: "CLAIM" },
    ],
  });

  const [nodes, setNodes] = useState([]);
  const [documents, setDocuments] = useState([
    {
      id: "doc-01",
      name: "FDA-K231459-Summary.pdf",
      category: "Regulatory",
      size: "4.2 MB",
      claims: 142,
      edges: 18,
      verified: true,
    },
    {
      id: "doc-02",
      name: "JAMA-Oncol-2024-RadAI.pdf",
      category: "Clinical",
      size: "2.8 MB",
      claims: 86,
      edges: 14,
      verified: true,
    },
    {
      id: "doc-03",
      name: "ClinicalTrials-NCT05912.json",
      category: "Protocol",
      size: "1.1 MB",
      claims: 34,
      edges: 9,
      verified: true,
    },
    {
      id: "doc-04",
      name: "EU-AI-Act-Annex-III.pdf",
      category: "Regulatory",
      size: "8.4 MB",
      claims: 98,
      edges: 12,
      parsing: true,
    },
    {
      id: "doc-05",
      name: "Siemens-Magnetom-Specs.pdf",
      category: "Hardware Specs",
      size: "3.5 MB",
      claims: 19,
      edges: 4,
      verified: true,
    },
  ]);

  useEffect(() => {
    async function loadGraph() {
      try {
        const fetchedNodes = await knowledgeGraphService.getNodes({
          type: filterType !== "all" ? filterType : undefined,
        });
        if (Array.isArray(fetchedNodes) && fetchedNodes.length > 0) {
          setNodes(fetchedNodes);
        }
      } catch (err) {
        console.warn("Knowledge graph nodes fetch notice:", err);
      }
    }
    loadGraph();
  }, [filterType, currentWorkspace?.id]);

  const handleNodeClick = (nodeData) => {
    setSelectedNode(nodeData);
  };

  return (
    <div className="flex flex-col w-full gap-space-lg">
      {/* Header & Metrics */}
      <div className="flex flex-col gap-space-sm">
        <div className="flex items-center gap-2 text-mono-meta font-mono-meta text-on-surface-variant tracking-wider uppercase">
          <Link href="/dashboard" className="hover:text-primary">
            Workspace
          </Link>
          <span className="text-outline">/</span>
          <span>Repositories &amp; Corpus</span>
          <span className="text-outline">/</span>
          <span className="text-on-surface font-semibold">Knowledge Base</span>
        </div>

        <div className="flex flex-col xl:flex-row xl:items-end justify-between gap-space-md pt-1">
          <div className="max-w-3xl">
            <h1 className="font-headline-lg text-headline-lg text-on-surface tracking-tight font-serif">
              Knowledge Base
            </h1>
            <p className="font-body-md text-body-md text-on-surface-variant mt-1.5 leading-relaxed">
              Institutional vector repositories, multi-modal evidence ingestion, and topological epistemic graph
              connecting concepts, claims, entities, and research precedents.
            </p>
          </div>

          {/* Action Cluster */}
          <div className="flex flex-wrap items-center gap-space-sm">
            <div className="flex items-center gap-3 px-space-sm py-1.5 rounded bg-surface border border-outline-variant/40 shadow-sm text-mono-meta font-mono-meta">
              <div className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-secondary" />
                <span className="text-on-surface font-semibold">1,842</span>
                <span className="text-outline">Docs Indexed</span>
              </div>
              <span className="text-outline-variant">|</span>
              <div className="flex items-center gap-1.5">
                <span className="text-on-surface font-semibold">4,290</span>
                <span className="text-outline">Nodes</span>
              </div>
              <span className="text-outline-variant">|</span>
              <div className="flex items-center gap-1.5">
                <span className="text-secondary font-bold">99.1%</span>
                <span className="text-outline">Merkle Verified</span>
              </div>
            </div>
            <button
              type="button"
              className="px-space-md py-1.5 rounded bg-surface hover:bg-surface-container text-on-surface font-body-sm text-body-sm font-medium border border-outline-variant/60 shadow-sm transition-colors flex items-center gap-1.5"
            >
              <span className="material-symbols-outlined text-[16px] text-on-surface-variant">sync</span>
              <span>Batch Re-Index</span>
            </button>
            <button
              type="button"
              className="px-space-md py-1.5 rounded bg-primary text-on-primary hover:bg-primary-container font-body-sm text-body-sm font-semibold shadow-sm transition-all flex items-center gap-1.5"
            >
              <span className="material-symbols-outlined text-[16px]">upload_file</span>
              <span>+ Upload Document</span>
            </button>
          </div>
        </div>
      </div>

      {/* Tripartite Workbench Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-space-md items-start">
        {/* LEFT PANEL: Document Corpus (Col 1-3) */}
        <div className="lg:col-span-3 flex flex-col gap-space-sm">
          <div className="bg-surface rounded-xl border border-outline-variant/50 shadow-sm overflow-hidden flex flex-col">
            <div className="px-space-md py-space-sm border-b border-outline-variant/30 bg-surface-container-low flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[18px] text-secondary">folder_open</span>
                <span className="font-title-sm text-[0.875rem] font-semibold text-on-surface">
                  Document Corpus
                </span>
              </div>
              <span className="font-mono-meta text-mono-meta text-on-surface-variant uppercase">
                Shards [12/12]
              </span>
            </div>

            {/* Document Search */}
            <div className="p-space-sm border-b border-outline-variant/30 bg-surface">
              <div className="relative flex items-center">
                <span className="material-symbols-outlined absolute left-2.5 text-[16px] text-outline">
                  search
                </span>
                <input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-8 pr-7 py-1.5 rounded text-body-sm font-body-sm bg-surface-container-low border border-outline-variant/50 text-on-surface placeholder:text-outline focus:outline-none focus:border-secondary transition-colors"
                  placeholder="Search corpus or hashes..."
                  type="text"
                />
              </div>
            </div>

            {/* Vector Partition Bar */}
            <div className="px-space-md py-2 bg-surface-container-high/40 border-b border-outline-variant/30 flex items-center justify-between text-mono-meta font-mono-meta">
              <div className="flex items-center gap-1.5 truncate">
                <span className="text-outline">PARTITION:</span>
                <span className="text-on-surface font-semibold truncate">/bio-fda-core</span>
              </div>
              <span className="text-on-surface-variant shrink-0">14.2 GB</span>
            </div>

            {/* Document Items */}
            <div className="divide-y divide-outline-variant/20 max-h-[520px] overflow-y-auto">
              {documents
                .filter(
                  (d) =>
                    !searchQuery ||
                    d.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                    d.category.toLowerCase().includes(searchQuery.toLowerCase())
                )
                .map((doc) => (
                  <div
                    key={doc.id}
                    className="p-space-sm hover:bg-surface-container-low cursor-pointer transition-colors flex flex-col gap-1"
                  >
                    <div className="flex items-start justify-between gap-1">
                      <span className="font-body-sm text-body-sm font-semibold text-on-surface truncate">
                        {doc.name}
                      </span>
                      {doc.parsing ? (
                        <span className="w-2 h-2 rounded-full bg-secondary animate-ping shrink-0 mt-1" />
                      ) : (
                        <span className="w-2 h-2 rounded-full bg-secondary shrink-0 mt-1" />
                      )}
                    </div>
                    <div className="flex items-center gap-2 font-mono-meta text-mono-meta text-on-surface-variant">
                      <span>{doc.category}</span>
                      <span className="text-outline">·</span>
                      <span>{doc.size}</span>
                    </div>
                    <div className="flex items-center justify-between mt-1 text-mono-meta text-[10px]">
                      <span className="px-1.5 py-0.5 rounded bg-surface border border-outline-variant/40 text-on-surface">
                        {doc.claims} claims
                      </span>
                      <span className="text-outline">{doc.edges} Graph Edges</span>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        </div>

        {/* CENTER PANEL: Epistemic Graph Visualization (Col 4-8) */}
        <div className="lg:col-span-6 flex flex-col gap-space-sm">
          <div className="bg-surface rounded-xl border border-outline-variant/50 shadow-sm flex flex-col overflow-hidden">
            {/* Filter pills & controls */}
            <div className="p-space-sm border-b border-outline-variant/30 bg-surface flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-1 overflow-x-auto pb-0.5">
                {[
                  { id: "all", label: "All Nodes", count: "4,290" },
                  { id: "CONCEPTS", label: "Concepts", count: "812" },
                  { id: "SOURCES", label: "Sources", count: "1,842" },
                  { id: "CLAIMS", label: "Claims", count: "1,240" },
                  { id: "ENTITIES", label: "Entities", count: "316" },
                ].map((pill) => (
                  <button
                    key={pill.id}
                    type="button"
                    onClick={() => setFilterType(pill.id)}
                    className={`px-2.5 py-1 rounded text-mono-meta font-mono-meta transition-all flex items-center gap-1 ${
                      filterType === pill.id
                        ? "bg-primary text-on-primary font-bold shadow-xs"
                        : "bg-surface-container hover:bg-surface-container-high text-on-surface-variant"
                    }`}
                  >
                    <span>{pill.label}</span>
                    <span className="opacity-70 text-[10px]">({pill.count})</span>
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-1 text-mono-meta font-mono-meta">
                <span className="px-2 py-1 rounded bg-surface-container text-on-surface flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-secondary" />
                  <span>Physics: Stable</span>
                </span>
              </div>
            </div>

            {/* Interactive Topological Graph Canvas */}
            <div className="relative w-full h-[620px] bg-[#FAF9F5] overflow-hidden select-none">
              <div className="absolute inset-0 opacity-[0.035] bg-[radial-gradient(#1B1C1A_1px,transparent_1px)] [background-size:24px_24px]" />

              {/* SVG Edges */}
              <svg className="absolute inset-0 w-full h-full pointer-events-none" xmlns="http://www.w3.org/2000/svg">
                <defs>
                  <marker
                    id="arrow-c"
                    markerHeight="6"
                    markerWidth="6"
                    orient="auto-start-reverse"
                    refX="18"
                    refY="5"
                    viewBox="0 0 10 10"
                  >
                    <path d="M 0 1 L 9 5 L 0 9 z" fill="#006972" opacity="0.8" />
                  </marker>
                </defs>
                <path
                  d="M 320 280 Q 210 180 150 140"
                  fill="none"
                  markerEnd="url(#arrow-c)"
                  stroke="#006972"
                  strokeDasharray="4 2"
                  strokeWidth="1.8"
                />
                <text x="210" y="190" fill="#006972" fontSize="9" textAnchor="middle">
                  governs update loop
                </text>

                <path
                  d="M 320 280 L 160 400"
                  fill="none"
                  markerEnd="url(#arrow-c)"
                  stroke="#76777B"
                  strokeWidth="1.2"
                />
                <text x="220" y="360" fill="#76777B" fontSize="9" textAnchor="middle">
                  established by
                </text>

                <path
                  d="M 320 280 Q 420 180 480 150"
                  fill="none"
                  markerEnd="url(#arrow-c)"
                  stroke="#76777B"
                  strokeWidth="1.4"
                />
                <text x="420" y="210" fill="#76777B" fontSize="9" textAnchor="middle">
                  bounded claim
                </text>

                <path
                  d="M 320 280 L 480 380"
                  fill="none"
                  markerEnd="url(#arrow-c)"
                  stroke="#006972"
                  strokeWidth="1.6"
                />
                <text x="420" y="340" fill="#006972" fontSize="9" textAnchor="middle">
                  mandates threshold
                </text>
              </svg>

              {/* Central Node: PCCP */}
              <div
                onClick={() =>
                  handleNodeClick({
                    id: "node_pccp_01",
                    label: "Predetermined Change Control Plan (PCCP)",
                    type: "REGULATORY_ENTITY",
                    section: "21 U.S.C. 360e · FDA CDRH",
                    description:
                      "A binding protocol cleared under 510(k) or PMA granting device sponsors pre-authorized parameter bounds for machine learning retraining without recurring supplemental clearances.",
                    properties: {
                      "Statutory Authority": "Section 515C FD&C Act",
                      "Epistemic Weight": "0.982 (Merkle Sealed)",
                      "Corroborating Filings": "K231459, K240192",
                      "Triangulated Nodes": "14 Connected Entities",
                    },
                    edges: [
                      { relation: "governs update loop", target: "Adaptive Deep Learning Radiomics", type: "CONCEPT" },
                      { relation: "established by", target: "FDA 510(k) Pre-Market Notification", type: "SOURCE" },
                      { relation: "bounded claim", target: "MRI Coil Variance 14% ROC Deviation", type: "CLAIM" },
                      { relation: "mandates threshold", target: "Non-Inferiority AUC ≥ 0.950", type: "CLAIM" },
                    ],
                  })
                }
                className="absolute left-[320px] top-[280px] -translate-x-1/2 -translate-y-1/2 z-20 cursor-pointer"
              >
                <div className="px-3.5 py-2.5 rounded bg-surface border-2 border-secondary shadow-md ring-4 ring-secondary/20 flex flex-col items-center gap-1 transition-transform hover:scale-105">
                  <span className="px-1.5 py-0.2 rounded bg-secondary/15 text-secondary font-mono-meta text-[9px] uppercase font-bold tracking-wider">
                    Regulatory Entity · Active Focus
                  </span>
                  <span className="font-title-sm text-[0.875rem] font-bold text-on-surface text-center whitespace-nowrap">
                    Predetermined Change Control Plan (PCCP)
                  </span>
                  <span className="font-mono-meta text-[10px] text-on-surface-variant">
                    21 U.S.C. 360e · FDA CDRH
                  </span>
                </div>
              </div>

              {/* Node: Adaptive Radiomics */}
              <div
                onClick={() =>
                  handleNodeClick({
                    id: "node_radiomics",
                    label: "Adaptive Deep Learning Radiomics",
                    type: "CONCEPT",
                    section: "Machine Learning Segmentation",
                    description:
                      "Autonomous image segmentation and feature extraction model executing real-time DICOM slice analysis.",
                    properties: {
                      "Inference Framework": "PyTorch + TensorRT",
                      "Sensitivity AUC": "0.964 ± 0.012",
                      "Training Corpus": "4,200 Cohorts",
                    },
                    edges: [
                      { relation: "governed by", target: "Predetermined Change Control Plan (PCCP)" },
                    ],
                  })
                }
                className="absolute left-[150px] top-[140px] -translate-x-1/2 -translate-y-1/2 z-10 cursor-pointer"
              >
                <div className="px-3 py-1.5 rounded bg-surface border border-outline-variant/70 shadow-sm hover:border-secondary transition-all flex flex-col gap-0.5">
                  <span className="font-mono-meta text-[9px] text-secondary font-semibold uppercase">
                    Concept Node
                  </span>
                  <span className="font-body-sm text-body-sm font-semibold text-on-surface whitespace-nowrap">
                    Adaptive Deep Learning Radiomics
                  </span>
                  <span className="font-mono-meta text-[9px] text-outline">Weight: 0.942 · 18 Citations</span>
                </div>
              </div>

              {/* Node: MRI Coil Variance */}
              <div
                onClick={() =>
                  handleNodeClick({
                    id: "node_variance",
                    label: "MRI Coil Variance 14% ROC Deviation",
                    type: "CLAIM",
                    section: "Clinical Observation",
                    description:
                      "Empirical sensitivity divergence discovered across secondary vendor radiofrequency coils.",
                    properties: {
                      "Hardware Divergence": "Philips dStream Coils",
                      "Status": "RESOLVED BY FIRMWARE PATCH",
                      "Confidence Score": "98.4%",
                    },
                    edges: [
                      { relation: "bounded by", target: "Predetermined Change Control Plan (PCCP)" },
                    ],
                  })
                }
                className="absolute left-[480px] top-[150px] -translate-x-1/2 -translate-y-1/2 z-10 cursor-pointer"
              >
                <div className="px-3 py-1.5 rounded bg-surface border border-outline-variant/70 shadow-sm hover:border-secondary transition-all flex flex-col gap-0.5">
                  <span className="font-mono-meta text-[9px] text-on-secondary-container font-semibold uppercase">
                    Claim Node
                  </span>
                  <span className="font-body-sm text-body-sm font-semibold text-on-surface whitespace-nowrap">
                    MRI Coil Variance 14% ROC Deviation
                  </span>
                  <span className="font-mono-meta text-[9px] text-outline">Mayo &amp; Karolinska Cohorts</span>
                </div>
              </div>

              {/* Node: FDA 510(k) Source */}
              <div
                onClick={() =>
                  handleNodeClick({
                    id: "node_fda_510k",
                    label: "FDA 510(k) Pre-Market Notification",
                    type: "SOURCE",
                    section: "Regulatory Clearance",
                    description:
                      "Landmark FDA pre-market notification establishing predicate non-inferiority bound.",
                    properties: {
                      "Filing ID": "K231459",
                      "Cleared Date": "Aug 14, 2024",
                      "Predicate Match": "Substantial Equivalence",
                    },
                    edges: [
                      { relation: "establishes", target: "Predetermined Change Control Plan (PCCP)" },
                    ],
                  })
                }
                className="absolute left-[160px] top-[400px] -translate-x-1/2 -translate-y-1/2 z-10 cursor-pointer"
              >
                <div className="px-3 py-1.5 rounded bg-surface border border-outline-variant/70 shadow-sm hover:border-secondary transition-all flex flex-col gap-0.5">
                  <span className="font-mono-meta text-[9px] text-secondary font-semibold uppercase">
                    Source Node
                  </span>
                  <span className="font-body-sm text-body-sm font-semibold text-on-surface whitespace-nowrap">
                    FDA 510(k) Pre-Market K231459
                  </span>
                  <span className="font-mono-meta text-[9px] text-outline">CDRH Regulatory Filing</span>
                </div>
              </div>

              {/* Node: Non-Inferiority AUC */}
              <div
                onClick={() =>
                  handleNodeClick({
                    id: "node_auc",
                    label: "Non-Inferiority AUC ≥ 0.950",
                    type: "CLAIM",
                    section: "Statistical Invariant",
                    description:
                      "Predicate compliance requirement enforcing non-inferiority bound across all validated inference leaves.",
                    properties: {
                      "Confidence Interval": "95% Tabular",
                      "Standard": "CDRH Guidance Table 3-C",
                    },
                    edges: [
                      { relation: "mandated by", target: "Predetermined Change Control Plan (PCCP)" },
                    ],
                  })
                }
                className="absolute left-[480px] top-[380px] -translate-x-1/2 -translate-y-1/2 z-10 cursor-pointer"
              >
                <div className="px-3 py-1.5 rounded bg-surface border border-outline-variant/70 shadow-sm hover:border-secondary transition-all flex flex-col gap-0.5">
                  <span className="font-mono-meta text-[9px] text-secondary font-semibold uppercase">
                    Statistical Invariant
                  </span>
                  <span className="font-body-sm text-body-sm font-semibold text-on-surface whitespace-nowrap">
                    Non-Inferiority AUC ≥ 0.950
                  </span>
                  <span className="font-mono-meta text-[9px] text-outline">Verified Consensus</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT PANEL: Entity Inspector & Semantic Neighborhood (Col 10-12) */}
        <div className="lg:col-span-3 flex flex-col gap-space-sm">
          {selectedNode ? (
            <div className="bg-surface rounded-xl border border-outline-variant/50 shadow-sm p-space-md flex flex-col gap-space-sm">
              <div className="flex items-center justify-between pb-space-xs border-b border-outline-variant/30">
                <span className="font-mono-meta text-mono-meta text-secondary font-bold uppercase tracking-wider">
                  Entity Inspector
                </span>
                <span className="px-2 py-0.5 rounded bg-surface-container font-mono-meta text-[10px] text-on-surface-variant font-semibold">
                  {selectedNode.type}
                </span>
              </div>

              <div className="flex flex-col gap-1">
                <h3 className="font-title-sm text-title-sm font-bold text-on-surface leading-snug">
                  {selectedNode.label}
                </h3>
                <span className="font-mono-meta text-mono-meta text-outline">{selectedNode.section}</span>
              </div>

              <p className="font-body-sm text-body-sm text-on-surface-variant leading-relaxed">
                {selectedNode.description}
              </p>

              {/* Properties */}
              <div className="flex flex-col gap-1.5 pt-2 border-t border-outline-variant/30">
                <span className="font-mono-meta text-mono-meta text-outline uppercase tracking-wider">
                  Attributed Properties
                </span>
                <div className="divide-y divide-outline-variant/20 bg-surface-container-low p-2 rounded border border-outline-variant/30">
                  {Object.entries(selectedNode.properties || {}).map(([k, v]) => (
                    <div key={k} className="py-1 flex justify-between items-center text-mono-meta text-[11px]">
                      <span className="text-outline">{k}:</span>
                      <span className="text-on-surface font-medium truncate max-w-[150px]">{v}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Neighborhood Edges */}
              {selectedNode.edges && selectedNode.edges.length > 0 && (
                <div className="flex flex-col gap-1.5 pt-2 border-t border-outline-variant/30">
                  <span className="font-mono-meta text-mono-meta text-outline uppercase tracking-wider">
                    Semantic Neighborhood ({selectedNode.edges.length})
                  </span>
                  <div className="flex flex-col gap-1.5">
                    {selectedNode.edges.map((e, idx) => (
                      <div
                        key={idx}
                        className="p-2 rounded bg-surface-container-low border border-outline-variant/30 flex flex-col gap-0.5"
                      >
                        <span className="font-mono-meta text-[10px] text-secondary font-semibold uppercase">
                          {e.relation}
                        </span>
                        <span className="font-body-sm text-body-sm font-medium text-on-surface truncate">
                          {e.target}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="p-8 text-center text-outline bg-surface rounded-xl border border-outline-variant/40">
              Click on any node in the graph to inspect its semantic topology and properties.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

