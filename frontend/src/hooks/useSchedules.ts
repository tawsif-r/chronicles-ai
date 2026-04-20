import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { schedulesApi } from '../api/schedules';
import type { CreateScheduleDto, UpdateScheduleDto } from '@chronicles/shared';

export function useSchedules(agentId: string) {
  return useQuery({
    queryKey: ['schedules', agentId],
    queryFn: () => schedulesApi.list(agentId),
    enabled: !!agentId,
  });
}

export function useCreateSchedule(agentId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (dto: CreateScheduleDto) => schedulesApi.create(agentId, dto),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['schedules', agentId] }),
  });
}

export function useUpdateSchedule(agentId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ scheduleId, dto }: { scheduleId: string; dto: UpdateScheduleDto }) =>
      schedulesApi.update(agentId, scheduleId, dto),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['schedules', agentId] }),
  });
}

export function useDeleteSchedule(agentId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (scheduleId: string) => schedulesApi.remove(agentId, scheduleId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['schedules', agentId] }),
  });
}
