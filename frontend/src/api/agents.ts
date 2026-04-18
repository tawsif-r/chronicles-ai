import { apiClient } from './client';
import type {
  Agent,
  AgentChannel,
  AgentStatusResponse,
  CreateAgentDto,
  CreateChannelDto,
  MemoryResponse,
  UpdateAgentDto,
} from '@chronicles/shared';

export const agentsApi = {
  list: () => apiClient.get<Agent[]>('/agents').then((r) => r.data),
  get: (id: string) => apiClient.get<Agent>(`/agents/${id}`).then((r) => r.data),
  create: (dto: CreateAgentDto) =>
    apiClient.post<Agent>('/agents', dto).then((r) => r.data),
  update: (id: string, dto: UpdateAgentDto) =>
    apiClient.patch<Agent>(`/agents/${id}`, dto).then((r) => r.data),
  remove: (id: string) => apiClient.delete(`/agents/${id}`),

  start: (id: string) => apiClient.post(`/agents/${id}/start`),
  stop: (id: string) => apiClient.post(`/agents/${id}/stop`),
  restart: (id: string) => apiClient.post(`/agents/${id}/restart`),
  status: (id: string) =>
    apiClient.get<AgentStatusResponse>(`/agents/${id}/status`).then((r) => r.data),

  getMemory: (id: string) =>
    apiClient.get<MemoryResponse>(`/agents/${id}/memory`).then((r) => r.data),
  setMemory: (id: string, content: string) =>
    apiClient.patch(`/agents/${id}/memory`, { content }),

  addChannel: (id: string, dto: CreateChannelDto) =>
    apiClient.post<AgentChannel>(`/agents/${id}/channels`, dto).then((r) => r.data),
  removeChannel: (id: string, channelId: string) =>
    apiClient.delete(`/agents/${id}/channels/${channelId}`),
};
