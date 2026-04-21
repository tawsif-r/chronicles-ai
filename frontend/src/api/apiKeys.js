import { apiClient } from './client';
export const apiKeysApi = {
    store: (provider, key) => apiClient.post('/api-keys', { provider, key }).then((r) => r.data),
};
