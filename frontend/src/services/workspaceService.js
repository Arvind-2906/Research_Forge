import { api } from "../lib/api/client";

export const workspaceService = {
  async list() {
    const res = await api.get("/workspaces");
    return res.data || [];
  },

  async getById(workspaceId) {
    const res = await api.get(`/workspaces/${workspaceId}`);
    return res.data;
  },

  async create(data) {
    const res = await api.post("/workspaces", data);
    return res.data;
  },

  async update(workspaceId, data) {
    const res = await api.patch(`/workspaces/${workspaceId}`, data);
    return res.data;
  },

  async listMembers(workspaceId) {
    const res = await api.get(`/workspaces/${workspaceId}/members`);
    return res.data || [];
  },

  async addMember(workspaceId, memberData) {
    const res = await api.post(`/workspaces/${workspaceId}/members`, memberData);
    return res.data;
  },

  async updateMemberRole(workspaceId, memberId, role) {
    const res = await api.patch(`/workspaces/${workspaceId}/members/${memberId}`, { role });
    return res.data;
  },

  async removeMember(workspaceId, memberId) {
    const res = await api.delete(`/workspaces/${workspaceId}/members/${memberId}`);
    return res.data;
  },
};

