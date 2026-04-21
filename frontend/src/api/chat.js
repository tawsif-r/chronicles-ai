import { apiClient } from './client';
export const chatApi = {
    send: (agentId, message) => apiClient
        .post(`/agents/${agentId}/chat`, { message })
        .then((r) => r.data),
    history: (agentId, page = 1, limit = 50) => apiClient
        .get(`/agents/${agentId}/chat/history`, {
        params: { page, limit },
    })
        .then((r) => r.data),
};
