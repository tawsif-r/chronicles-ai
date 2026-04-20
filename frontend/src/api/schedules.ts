import { apiClient } from './client';
import type { AgentSchedule, CreateScheduleDto, UpdateScheduleDto } from '@chronicles/shared';

export const schedulesApi = {
  list: (agentId: string) =>
    apiClient.get<AgentSchedule[]>(`/agents/${agentId}/schedules`).then((r) => r.data),

  create: (agentId: string, dto: CreateScheduleDto) =>
    apiClient.post<AgentSchedule>(`/agents/${agentId}/schedules`, dto).then((r) => r.data),

  update: (agentId: string, scheduleId: string, dto: UpdateScheduleDto) =>
    apiClient.patch<AgentSchedule>(`/agents/${agentId}/schedules/${scheduleId}`, dto).then((r) => r.data),

  remove: (agentId: string, scheduleId: string) =>
    apiClient.delete(`/agents/${agentId}/schedules/${scheduleId}`),
};
