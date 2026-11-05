import { api } from "../lib/api/client";

export const knowledgeGraphService = {
  async getNodes(params = {}) {
    const searchParams = new URLSearchParams();
    if (params.type) searchParams.set("type", params.type);
    if (params.search) searchParams.set("search", params.search);
    const qs = searchParams.toString();
    const res = await api.get(`/knowledge-graph/nodes${qs ? `?${qs}` : ""}`);
    return res.data || [];
  },

  async getNode(nodeId) {
    const res = await api.get(`/knowledge-graph/nodes/${nodeId}`);
    return res.data;
  },

  async getNeighborhood(nodeId) {
    const res = await api.get(`/knowledge-graph/neighborhood/${nodeId}`);
    return res.data;
  },

  async search(query, limit = 20) {
    const res = await api.post("/knowledge-graph/search", { query, limit });
    return res.data || [];
  },

  async populateFromRun(runId) {
    const res = await api.post(`/knowledge-graph/populate-from-run/${runId}`, {});
    return res.data;
  },
};

