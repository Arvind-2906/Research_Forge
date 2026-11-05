import { api, subscribeToSSE } from "../lib/api/client";

export const researchService = {
  async createRun(payload) {
    const res = await api.post("/research/runs", payload);
    return res.data;
  },

  async listRuns(params = {}) {
    const searchParams = new URLSearchParams();
    if (params.projectId) searchParams.set("projectId", params.projectId);
    if (params.status) searchParams.set("status", params.status);
    if (params.page) searchParams.set("page", params.page);
    if (params.limit) searchParams.set("limit", params.limit);

    const qs = searchParams.toString();
    const res = await api.get(`/research/runs${qs ? `?${qs}` : ""}`);
    return res;
  },

  async getRun(runId) {
    const res = await api.get(`/research/runs/${runId}`);
    return res.data;
  },

  async startRun(runId) {
    const res = await api.post(`/research/runs/${runId}/start`);
    return res.data;
  },

  async pauseRun(runId) {
    const res = await api.post(`/research/runs/${runId}/pause`);
    return res.data;
  },

  async resumeRun(runId) {
    const res = await api.post(`/research/runs/${runId}/resume`);
    return res.data;
  },

  async cancelRun(runId) {
    const res = await api.post(`/research/runs/${runId}/cancel`);
    return res.data;
  },

  async getEvents(runId, limit = 100) {
    const res = await api.get(`/research/runs/${runId}/events?limit=${limit}`);
    return res.data || [];
  },

  async getTasks(runId) {
    const res = await api.get(`/research/runs/${runId}/tasks`);
    return res.data || [];
  },

  async getAgents(runId) {
    const res = await api.get(`/research/runs/${runId}/agents`);
    return res.data || [];
  },

  async getSources(runId) {
    const res = await api.get(`/research/runs/${runId}/sources`);
    return res.data || [];
  },

  async getEvidence(runId) {
    const res = await api.get(`/research/runs/${runId}/evidence`);
    return res.data || [];
  },

  async getPlan(runId) {
    try {
      const res = await api.get(`/plans/${runId}`);
      return res.data;
    } catch {
      return null;
    }
  },

  async approvePlan(planId, feedback = "") {
    const res = await api.post(`/plans/${planId}/approve`, { feedback });
    return res.data;
  },

  async rejectPlan(planId, reason = "") {
    const res = await api.post(`/plans/${planId}/reject`, { reason });
    return res.data;
  },

  subscribeToRunStream(runId, onMessage, onError) {
    return subscribeToSSE(`/research/runs/${runId}/events/stream`, onMessage, onError);
  },
};

