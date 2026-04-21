import { apiClient } from './client';
export const schedulesApi = {
    list: (agentId) => apiClient.get(`/agents/${agentId}/schedules`).then((r) => r.data),
    create: (agentId, dto) => apiClient.post(`/agents/${agentId}/schedules`, dto).then((r) => r.data),
    update: (agentId, scheduleId, dto) => apiClient.patch(`/agents/${agentId}/schedules/${scheduleId}`, dto).then((r) => r.data),
    remove: (agentId, scheduleId) => apiClient.delete(`/agents/${agentId}/schedules/${scheduleId}`),
};
