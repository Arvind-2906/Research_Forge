import { api } from "../lib/api/client";

export const reportService = {
  async list() {
    const res = await api.get("/reports");
    return res.data || [];
  },

  async getById(reportId) {
    const res = await api.get(`/reports/${reportId}`);
    return res.data;
  },

  async getByRunId(runId) {
    try {
      const res = await api.get(`/research/runs/${runId}/report`);
      return res.data;
    } catch {
      // Fallback to checking reports list
      const res = await api.get(`/reports`);
      const found = (res.data || []).find((r) => r.runId === runId);
      return found || null;
    }
  },

  async getCitations(reportId) {
    const res = await api.get(`/reports/${reportId}/citations`);
    return res.data || [];
  },

  async validateCitations(reportId) {
    const res = await api.post(`/reports/${reportId}/validate-citations`, {});
    return res.data;
  },

  async createExport(reportId, format = "PDF") {
    const res = await api.post(`/reports/${reportId}/exports`, { format });
    return res.data;
  },

  async getExports(reportId) {
    const res = await api.get(`/reports/${reportId}/exports`);
    return res.data || [];
  },
};

