import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { chatApi } from '../api/chat';

export function useChatHistory(agentId: string) {
  return useQuery({
    queryKey: ['chat', agentId],
    queryFn: () => chatApi.history(agentId, 1, 200),
    enabled: !!agentId,
  });
}

export function useSendMessage(agentId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (message: string) => chatApi.send(agentId, message),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['chat', agentId] }),
  });
}
