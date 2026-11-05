import { api } from "../lib/api/client";

export const mcpService = {
  async getServers() {
    const res = await api.get("/mcp/servers");
    return res.data || [];
  },

  async getTools(serverId) {
    const query = serverId ? `?serverId=${encodeURIComponent(serverId)}` : "";
    const res = await api.get(`/mcp/tools${query}`);
    return res.data || [];
  },

  async executeTool(toolName, parameters = {}, serverId) {
    const res = await api.post("/mcp/execute", {
      toolName,
      parameters,
      serverId,
    });
    return res.data;
  },

  async getCalls(params = {}) {
    const searchParams = new URLSearchParams();
    if (params.toolName) searchParams.set("toolName", params.toolName);
    if (params.status) searchParams.set("status", params.status);
    if (params.limit) searchParams.set("limit", params.limit);
    const qs = searchParams.toString();
    const res = await api.get(`/mcp/calls${qs ? `?${qs}` : ""}`);
    return res.data || [];
  },
};

