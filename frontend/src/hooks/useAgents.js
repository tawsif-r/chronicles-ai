import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { agentsApi } from '../api/agents';
import { useAuth } from '../contexts/AuthContext';
export function useAgents() {
    const { user } = useAuth();
    return useQuery({
        queryKey: ['agents', user?.workspaceId],
        queryFn: agentsApi.list,
        enabled: !!user,
    });
}
export function useAgent(id) {
    return useQuery({
        queryKey: ['agents', id],
        queryFn: () => agentsApi.get(id),
        enabled: !!id,
    });
}
export function useCreateAgent() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (dto) => agentsApi.create(dto),
        onSuccess: () => qc.invalidateQueries({ queryKey: ['agents'] }),
    });
}
export function useUpdateAgent(id) {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (dto) => agentsApi.update(id, dto),
        onSuccess: () => qc.invalidateQueries({ queryKey: ['agents', id] }),
    });
}
export function useStartAgent(id) {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: () => agentsApi.start(id),
        onSuccess: () => qc.invalidateQueries({ queryKey: ['agents', id] }),
    });
}
export function useStopAgent(id) {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: () => agentsApi.stop(id),
        onSuccess: () => qc.invalidateQueries({ queryKey: ['agents', id] }),
    });
}
export function useAddChannel(agentId) {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (dto) => agentsApi.addChannel(agentId, dto),
        onSuccess: () => qc.invalidateQueries({ queryKey: ['agents', agentId] }),
    });
}
export function useRemoveChannel(agentId) {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (channelId) => agentsApi.removeChannel(agentId, channelId),
        onSuccess: () => qc.invalidateQueries({ queryKey: ['agents', agentId] }),
    });
}
export function useUpdateChannel(agentId) {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: ({ channelId, dto }) => agentsApi.updateChannel(agentId, channelId, dto),
        onSuccess: () => qc.invalidateQueries({ queryKey: ['agents', agentId] }),
    });
}
export function useDeleteAgent() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (id) => agentsApi.remove(id),
        onSuccess: () => qc.invalidateQueries({ queryKey: ['agents'] }),
    });
}
