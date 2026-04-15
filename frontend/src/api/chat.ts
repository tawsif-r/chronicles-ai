import { apiClient } from './client';
import type { ChatMessage, SendMessageResponse } from '@chronicles/shared';

export const chatApi = {
  send: (agentId: string, message: string) =>
    apiClient
      .post<SendMessageResponse>(`/agents/${agentId}/chat`, { message })
      .then((r) => r.data),

  history: (agentId: string, page = 1, limit = 50) =>
    apiClient
      .get<ChatMessage[]>(`/agents/${agentId}/chat/history`, {
        params: { page, limit },
      })
      .then((r) => r.data),
};
