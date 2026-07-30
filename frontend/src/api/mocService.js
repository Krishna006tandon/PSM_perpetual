import axios from 'axios';

const API_BASE_URL = 'http://localhost:5000/api';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const mocService = {
  // --- MOC Tickets ---
  getAllMOCs: async () => {
    const response = await apiClient.get('/mocs');
    return response.data;
  },

  getMOCById: async (id) => {
    const response = await apiClient.get(`/mocs/${id}`);
    return response.data;
  },

  createMOC: async (data) => {
    const response = await apiClient.post('/mocs', data);
    return response.data;
  },

  advanceStage: async (id, data) => {
    const response = await apiClient.patch(`/mocs/${id}/advance`, data);
    return response.data;
  },

  rejectMOC: async (id, data) => {
    const response = await apiClient.patch(`/mocs/${id}/reject`, data);
    return response.data;
  },

  addQuery: async (id, data) => {
    const response = await apiClient.patch(`/mocs/${id}/query`, data);
    return response.data;
  },

  submitChecklist: async (id, data) => {
    const response = await apiClient.patch(`/mocs/${id}/checklist`, data);
    return response.data;
  },

  submitCostEstimation: async (id, data) => {
    const response = await apiClient.patch(`/mocs/${id}/cost`, data);
    return response.data;
  },

  assignPM: async (id, data) => {
    const response = await apiClient.patch(`/mocs/${id}/assign-pm`, data);
    return response.data;
  },

  closeMOC: async (id, data) => {
    const response = await apiClient.patch(`/mocs/${id}/close`, data);
    return response.data;
  },

  archiveMOC: async (id, data) => {
    const response = await apiClient.patch(`/mocs/${id}/archive`, data);
    return response.data;
  },

  unarchiveMOC: async (id, data) => {
    const response = await apiClient.patch(`/mocs/${id}/unarchive`, data);
    return response.data;
  },

  // --- Checklist Templates (Dynamic Builder) ---
  getAllTemplates: async () => {
    const response = await apiClient.get('/checklist-templates');
    return response.data;
  },

  getTemplateByDept: async (deptId) => {
    const response = await apiClient.get(`/checklist-templates/${deptId}`);
    return response.data;
  },

  upsertTemplate: async (deptId, data) => {
    const response = await apiClient.put(`/checklist-templates/${deptId}`, data);
    return response.data;
  },

  addQuestion: async (deptId, data) => {
    const response = await apiClient.post(`/checklist-templates/${deptId}/questions`, data);
    return response.data;
  },

  removeQuestion: async (deptId, index) => {
    const response = await apiClient.delete(`/checklist-templates/${deptId}/questions/${index}`);
    return response.data;
  }
};
