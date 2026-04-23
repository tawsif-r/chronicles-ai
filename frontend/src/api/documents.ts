import { apiClient } from './client';
import type { Document, SearchResult } from '@chronicles/shared';

export const documentsApi = {
  list: (status?: string) =>
    apiClient
      .get<Document[]>('/documents', { params: status ? { status } : undefined })
      .then((r) => r.data),

  get: (id: string) => apiClient.get<Document>(`/documents/${id}`).then((r) => r.data),

  upload: (file: File, onProgress?: (pct: number) => void) => {
    const form = new FormData();
    form.append('file', file);
    return apiClient
      .post<Document>('/documents/upload', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (e) =>
          onProgress?.(Math.round(((e.loaded ?? 0) * 100) / (e.total ?? 1))),
      })
      .then((r) => r.data);
  },

  remove: (id: string) => apiClient.delete(`/documents/${id}`),

  search: (query: string, limit = 5, documentIds?: string[]) =>
    apiClient
      .post<SearchResult[]>('/documents/search', { query, limit, documentIds })
      .then((r) => r.data),
};
