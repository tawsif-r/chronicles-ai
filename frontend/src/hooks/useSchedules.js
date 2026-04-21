import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { schedulesApi } from '../api/schedules';
export function useSchedules(agentId) {
    return useQuery({
        queryKey: ['schedules', agentId],
        queryFn: () => schedulesApi.list(agentId),
        enabled: !!agentId,
    });
}
export function useCreateSchedule(agentId) {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (dto) => schedulesApi.create(agentId, dto),
        onSuccess: () => qc.invalidateQueries({ queryKey: ['schedules', agentId] }),
    });
}
export function useUpdateSchedule(agentId) {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: ({ scheduleId, dto }) => schedulesApi.update(agentId, scheduleId, dto),
        onSuccess: () => qc.invalidateQueries({ queryKey: ['schedules', agentId] }),
    });
}
export function useDeleteSchedule(agentId) {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (scheduleId) => schedulesApi.remove(agentId, scheduleId),
        onSuccess: () => qc.invalidateQueries({ queryKey: ['schedules', agentId] }),
    });
}
