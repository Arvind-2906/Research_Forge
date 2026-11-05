import { api } from "../lib/api/client";

export const analyticsService = {
  async getOverview() {
    const res = await api.get("/analytics/overview");
    return res.data;
  },

  async getUsage(timeRange = "30d") {
    const res = await api.get(`/analytics/usage?range=${timeRange}`);
    return res.data;
  },

  async getRuns() {
    const res = await api.get("/analytics/runs");
    return res.data;
  },

  async getAgents() {
    const res = await api.get("/analytics/agents");
    return res.data;
  },

  async getModels() {
    const res = await api.get("/analytics/models");
    return res.data;
  },

  async getMcp() {
    const res = await api.get("/analytics/mcp");
    return res.data;
  },
};

