import { apiClient } from './client';

export const apiKeysApi = {
  store: (provider: string, key: string) =>
    apiClient.post('/api-keys', { provider, key }).then((r) => r.data),
};
