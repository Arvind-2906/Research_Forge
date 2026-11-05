import { api } from "../lib/api/client";

export const projectService = {
  async list(workspaceId) {
    const query = workspaceId ? `?workspaceId=${encodeURIComponent(workspaceId)}` : "";
    const res = await api.get(`/projects${query}`);
    return res.data || [];
  },

  async getById(projectId) {
    const res = await api.get(`/projects/${projectId}`);
    return res.data;
  },

  async create(data) {
    const res = await api.post("/projects", data);
    return res.data;
  },

  async update(projectId, data) {
    const res = await api.patch(`/projects/${projectId}`, data);
    return res.data;
  },

  async delete(projectId) {
    const res = await api.delete(`/projects/${projectId}`);
    return res.data;
  },
};

