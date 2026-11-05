"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useWorkspace } from "../../context/WorkspaceContext";
import { useAuth } from "../../context/AuthContext";

export default function Header() {
  const router = useRouter();
  const { currentWorkspace, workspaces, selectWorkspace } = useWorkspace();
  const { user } = useAuth();
  const [showWorkspaceMenu, setShowWorkspaceMenu] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/history?search=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  return (
    <header className="fixed top-0 left-64 right-0 h-16 bg-surface-container-low/90 backdrop-blur-md z-40 border-b border-outline-variant/30 px-space-lg flex items-center justify-between">
      {/* Left: Workspace Selector */}
      <div className="flex items-center gap-space-md relative">
        <div
          onClick={() => setShowWorkspaceMenu(!showWorkspaceMenu)}
          className="flex items-center gap-1.5 px-space-sm py-1.5 rounded bg-surface border border-outline-variant/50 cursor-pointer hover:bg-surface-container transition-colors select-none"
        >
          <span className="font-mono-meta text-mono-meta text-on-surface-variant font-medium">
            {currentWorkspace?.name || "Quantum & AI Systems Lab"}
          </span>
          <span className="font-mono-meta text-mono-meta text-outline">/</span>
          <span className="font-mono-meta text-mono-meta text-on-surface font-semibold">
            {currentWorkspace?.version || "v2.4"}
          </span>
          <span className="material-symbols-outlined text-[16px] text-on-surface-variant">
            expand_more
          </span>
        </div>

        {/* Dropdown Menu for Workspaces */}
        {showWorkspaceMenu && (
          <div className="absolute top-12 left-0 w-64 bg-surface-container-lowest border border-outline-variant shadow-lg rounded-lg py-1 z-50">
            <div className="px-3 py-1.5 text-mono-meta uppercase tracking-wider text-outline border-b border-outline-variant/40">
              Workspaces
            </div>
            {workspaces.map((ws) => (
              <button
                key={ws.id}
                onClick={() => {
                  selectWorkspace(ws);
                  setShowWorkspaceMenu(false);
                }}
                className={`w-full text-left px-3 py-2 text-body-sm flex items-center justify-between hover:bg-surface-container transition-colors ${
                  ws.id === currentWorkspace?.id
                    ? "font-medium text-secondary"
                    : "text-on-surface"
                }`}
              >
                <span className="truncate">{ws.name}</span>
                {ws.id === currentWorkspace?.id && (
                  <span className="material-symbols-outlined text-[16px] text-secondary">
                    check
                  </span>
                )}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Middle: Universal Search Bar */}
      <div className="flex-1 max-w-lg mx-space-md">
        <form onSubmit={handleSearchSubmit} className="relative flex items-center">
          <span className="material-symbols-outlined absolute left-3 text-[18px] text-outline">
            search
          </span>
          <input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-12 py-1.5 rounded bg-surface border border-outline-variant/60 font-body-sm text-body-sm text-on-surface placeholder:text-outline focus:outline-none focus:border-secondary transition-colors"
            placeholder="Search research, synthesis, or claims (⌘K)"
            type="text"
          />
          <kbd className="absolute right-2.5 px-1.5 py-0.5 rounded bg-surface-container border border-outline-variant font-mono-meta text-[10px] text-outline select-none">
            ⌘K
          </kbd>
        </form>
      </div>

      {/* Right Actions & Status */}
      <div className="flex items-center gap-space-sm">
        {/* Swarm Fleet Indicator */}
        <div className="hidden xl:flex items-center gap-2 px-space-sm py-1 rounded bg-secondary-container/30 border border-secondary/30">
          <span className="w-2 h-2 rounded-full bg-secondary animate-pulse" />
          <span className="font-mono-meta text-mono-meta text-on-secondary-container font-medium">
            Fleet Online · 8 Idle, 3 Running
          </span>
        </div>

        {/* Notifications */}
        <button
          className="relative p-1.5 rounded text-on-surface-variant hover:bg-surface-container hover:text-on-surface transition-colors"
          title="Telemetry alerts"
        >
          <span className="material-symbols-outlined text-[20px]">notifications</span>
          <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-error" />
        </button>

        {/* Command shortcut */}
        <button
          className="p-1.5 rounded text-on-surface-variant hover:bg-surface-container hover:text-on-surface transition-colors font-mono-meta text-[11px] px-2 border border-outline-variant/40"
          title="Command Palette"
        >
          <span className="tracking-tight">⌘/</span>
        </button>

        {/* New Synthesis CTA */}
        <Link
          href="/research/new"
          className="flex items-center gap-1.5 px-space-md py-1.5 rounded bg-primary text-on-primary hover:bg-primary-container transition-all font-body-sm text-body-sm font-medium shadow-sm hover:shadow"
        >
          <span className="material-symbols-outlined text-[16px]">add</span>
          <span>New Synthesis</span>
        </Link>

        {/* User Avatar */}
        <Link
          href="/settings"
          className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-on-primary font-mono-meta text-[12px] font-bold"
          title={user?.name || "User profile"}
        >
          {user?.initials || "DR"}
        </Link>
      </div>
    </header>
  );
}

