import { apiClient } from './client';
export const agentsApi = {
    list: () => apiClient.get('/agents').then((r) => r.data),
    get: (id) => apiClient.get(`/agents/${id}`).then((r) => r.data),
    create: (dto) => apiClient.post('/agents', dto).then((r) => r.data),
    update: (id, dto) => apiClient.patch(`/agents/${id}`, dto).then((r) => r.data),
    remove: (id) => apiClient.delete(`/agents/${id}`),
    start: (id) => apiClient.post(`/agents/${id}/start`),
    stop: (id) => apiClient.post(`/agents/${id}/stop`),
    restart: (id) => apiClient.post(`/agents/${id}/restart`),
    status: (id) => apiClient.get(`/agents/${id}/status`).then((r) => r.data),
    getMemory: (id) => apiClient.get(`/agents/${id}/memory`).then((r) => r.data),
    setMemory: (id, content) => apiClient.patch(`/agents/${id}/memory`, { content }),
    addChannel: (id, dto) => apiClient.post(`/agents/${id}/channels`, dto).then((r) => r.data),
    updateChannel: (id, channelId, dto) => apiClient.patch(`/agents/${id}/channels/${channelId}`, dto).then((r) => r.data),
    removeChannel: (id, channelId) => apiClient.delete(`/agents/${id}/channels/${channelId}`),
};
