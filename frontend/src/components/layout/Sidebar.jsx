"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "../../context/AuthContext";
import { useWorkspace } from "../../context/WorkspaceContext";

export default function Sidebar() {
  const pathname = usePathname();
  const { user } = useAuth();
  const { currentWorkspace } = useWorkspace();

  const workspaceNavItems = [
    { label: "Overview", href: "/dashboard", icon: "dashboard" },
    { label: "New Research", href: "/research/new", icon: "biotech" },
    { label: "Research History", href: "/history", icon: "history" },
    { label: "Projects", href: "/projects", icon: "folder" },
    { label: "Reports", href: "/reports", icon: "article" },
    { label: "Knowledge Base", href: "/knowledge-base", icon: "database" },
  ];

  const intelligenceNavItems = [
    {
      label: "Agent Activity",
      href: "/agent-activity",
      icon: "smart_toy",
      badge: "3 Active",
      badgeClass: "bg-secondary/20 text-secondary-fixed",
    },
    {
      label: "MCP Integrations",
      href: "/mcp-integrations",
      icon: "hub",
      badge: "4 Connd",
      badgeClass: "bg-white/10 text-on-primary-container",
    },
  ];

  const isActive = (href) => {
    if (href === "/dashboard") return pathname === "/dashboard" || pathname === "/";
    return pathname.startsWith(href);
  };

  const activeLinkClass =
    "bg-surface-container-highest/20 text-on-primary border-l-2 border-secondary font-medium";
  const inactiveLinkClass =
    "text-outline-variant hover:text-on-primary hover:bg-white/5 font-normal";

  const creditsPercent =
    currentWorkspace?.creditsTotal && currentWorkspace?.creditsUsed
      ? Math.round((currentWorkspace.creditsUsed / currentWorkspace.creditsTotal) * 100)
      : 96;

  return (
    <aside className="fixed left-0 top-0 h-screen w-64 bg-primary-container z-50 flex flex-col justify-between select-none shadow-[1px_0_0_rgba(255,255,255,0.08)]">
      <div className="flex flex-col flex-1 overflow-y-auto">
        {/* Brand Header */}
        <div className="h-16 px-space-md flex items-center gap-space-sm border-b border-white/10">
          <div className="w-8 h-8 rounded bg-gradient-to-tr from-secondary to-secondary-container flex items-center justify-center text-primary font-bold font-mono-code text-[14px]">
            RF
          </div>
          <div className="flex flex-col min-w-0">
            <span className="font-title-sm text-title-sm text-on-primary font-bold tracking-tight truncate">
              ResearchForge
            </span>
            <span className="font-mono-meta text-mono-meta text-outline uppercase tracking-wider truncate">
              Autonomous Workspace
            </span>
          </div>
        </div>

        {/* Section 1: Workspace */}
        <div className="px-space-md pt-space-md pb-space-xs">
          <span className="font-mono-meta text-mono-meta text-outline-variant uppercase tracking-widest block">
            Workspace
          </span>
        </div>

        <nav className="flex flex-col px-space-xs gap-0.5">
          {workspaceNavItems.map((item) => {
            const active = isActive(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-space-sm px-space-sm py-2 rounded transition-colors text-body-sm font-body-sm ${
                  active ? activeLinkClass : inactiveLinkClass
                }`}
              >
                <span className="material-symbols-outlined text-[18px]">
                  {item.icon}
                </span>
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="my-space-sm border-t border-white/10 mx-space-md" />

        {/* Section 2: Intelligence */}
        <div className="px-space-md pb-space-xs">
          <span className="font-mono-meta text-mono-meta text-outline-variant uppercase tracking-widest block">
            Intelligence
          </span>
        </div>

        <nav className="flex flex-col px-space-xs gap-0.5">
          {intelligenceNavItems.map((item) => {
            const active = isActive(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center justify-between px-space-sm py-2 rounded transition-colors text-body-sm font-body-sm ${
                  active ? activeLinkClass : inactiveLinkClass
                }`}
              >
                <div className="flex items-center gap-space-sm">
                  <span className="material-symbols-outlined text-[18px]">
                    {item.icon}
                  </span>
                  <span>{item.label}</span>
                </div>
                {item.badge && (
                  <span
                    className={`px-1.5 py-0.5 rounded text-[10px] font-mono-meta tracking-wider uppercase ${item.badgeClass}`}
                  >
                    {item.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Bottom Footer Section */}
      <div className="p-space-md border-t border-white/10 flex flex-col gap-space-sm bg-primary-container">
        {/* Research Credits Meter */}
        <div className="flex flex-col gap-1">
          <div className="flex justify-between items-center text-mono-meta font-mono-meta">
            <span className="text-outline">Research Credits</span>
            <span className="text-on-primary font-medium">
              {(currentWorkspace?.creditsUsed || 4820).toLocaleString()} /{" "}
              {(currentWorkspace?.creditsTotal || 5000).toLocaleString()}
            </span>
          </div>
          <div className="w-full bg-white/10 h-1.5 rounded-full overflow-hidden">
            <div
              className="bg-secondary-fixed h-full rounded-full transition-all duration-500"
              style={{ width: `${creditsPercent}%` }}
            />
          </div>
        </div>

        {/* Settings Navigation */}
        <nav className="pt-space-xs">
          <Link
            href="/settings"
            className={`flex items-center gap-space-sm px-space-sm py-1.5 rounded transition-colors text-body-sm font-body-sm ${
              isActive("/settings") ? activeLinkClass : inactiveLinkClass
            }`}
          >
            <span className="material-symbols-outlined text-[18px]">settings</span>
            <span>Settings</span>
          </Link>
        </nav>

        {/* User Profile Card */}
        <div className="flex items-center justify-between pt-space-xs border-t border-white/10">
          <div className="flex items-center gap-space-sm min-w-0">
            <div className="relative flex-shrink-0">
              <div className="w-8 h-8 rounded bg-surface-container-highest flex items-center justify-center text-primary font-mono-code text-[12px] font-bold">
                {user?.initials || "DR"}
              </div>
              <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-secondary ring-2 ring-primary-container" />
            </div>
            <div className="flex flex-col min-w-0">
              <span className="text-body-sm font-body-sm text-on-primary font-medium truncate">
                {user?.name || "Dr. David Ross"}
              </span>
              <span className="text-mono-meta font-mono-meta text-outline truncate">
                {user?.role || "Principal Lead"}
              </span>
            </div>
          </div>
          <Link
            href="/settings"
            className="text-outline hover:text-on-primary transition-colors p-1"
            title="Profile & Session Settings"
          >
            <span className="material-symbols-outlined text-[18px]">unfold_more</span>
          </Link>
        </div>
      </div>
    </aside>
  );
}

