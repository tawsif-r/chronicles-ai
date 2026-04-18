import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { agentsApi } from '../api/agents';
import type { CreateAgentDto, CreateChannelDto, UpdateAgentDto, UpdateChannelDto } from '@chronicles/shared';

export function useAgents() {
  return useQuery({ queryKey: ['agents'], queryFn: agentsApi.list });
}

export function useAgent(id: string) {
  return useQuery({
    queryKey: ['agents', id],
    queryFn: () => agentsApi.get(id),
    enabled: !!id,
  });
}

export function useCreateAgent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (dto: CreateAgentDto) => agentsApi.create(dto),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['agents'] }),
  });
}

export function useUpdateAgent(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (dto: UpdateAgentDto) => agentsApi.update(id, dto),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['agents', id] }),
  });
}

export function useStartAgent(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => agentsApi.start(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['agents', id] }),
  });
}

export function useStopAgent(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => agentsApi.stop(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['agents', id] }),
  });
}

export function useAddChannel(agentId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (dto: CreateChannelDto) => agentsApi.addChannel(agentId, dto),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['agents', agentId] }),
  });
}

export function useRemoveChannel(agentId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (channelId: string) => agentsApi.removeChannel(agentId, channelId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['agents', agentId] }),
  });
}

export function useUpdateChannel(agentId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ channelId, dto }: { channelId: string; dto: UpdateChannelDto }) =>
      agentsApi.updateChannel(agentId, channelId, dto),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['agents', agentId] }),
  });
}

export function useDeleteAgent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => agentsApi.remove(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['agents'] }),
  });
}
