"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { workspaceService } from "../services/workspaceService";

const WorkspaceContext = createContext(null);

const DEFAULT_WORKSPACE = {
  id: "ws_default_01",
  name: "Quantum & AI Systems Lab",
  version: "v2.4",
  slug: "quantum-ai-systems",
  role: "OWNER",
  creditsUsed: 4820,
  creditsTotal: 5000,
};

export function WorkspaceProvider({ children }) {
  const [workspaces, setWorkspaces] = useState([DEFAULT_WORKSPACE]);
  const [currentWorkspace, setCurrentWorkspace] = useState(DEFAULT_WORKSPACE);
  const [loading, setLoading] = useState(true);

  const refreshWorkspaces = async () => {
    try {
      const data = await workspaceService.list();
      if (Array.isArray(data) && data.length > 0) {
        setWorkspaces(data);
        const savedId = typeof window !== "undefined" ? localStorage.getItem("rf_workspace_id") : null;
        const matched = savedId ? data.find((w) => w.id === savedId) : null;
        const selected = matched || data[0];
        setCurrentWorkspace(selected);
        if (typeof window !== "undefined") {
          localStorage.setItem("rf_workspace_id", selected.id);
        }
      } else {
        setWorkspaces([DEFAULT_WORKSPACE]);
        setCurrentWorkspace(DEFAULT_WORKSPACE);
        if (typeof window !== "undefined") {
          localStorage.setItem("rf_workspace_id", DEFAULT_WORKSPACE.id);
        }
      }
    } catch {
      setWorkspaces([DEFAULT_WORKSPACE]);
      setCurrentWorkspace(DEFAULT_WORKSPACE);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshWorkspaces();
  }, []);

  const selectWorkspace = (workspace) => {
    setCurrentWorkspace(workspace);
    if (typeof window !== "undefined") {
      localStorage.setItem("rf_workspace_id", workspace.id);
    }
  };

  return (
    <WorkspaceContext.Provider
      value={{
        workspaces,
        currentWorkspace,
        selectWorkspace,
        refreshWorkspaces,
        loading,
      }}
    >
      {children}
    </WorkspaceContext.Provider>
  );
}

export function useWorkspace() {
  const context = useContext(WorkspaceContext);
  if (!context) {
    throw new Error("useWorkspace must be used within a WorkspaceProvider");
  }
  return context;
}

