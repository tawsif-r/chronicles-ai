import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { documentsApi } from '../api/documents';
import type { Document } from '@chronicles/shared';

export function useDocuments(status?: string) {
  return useQuery<Document[]>({
    queryKey: ['documents', status],
    queryFn: () => documentsApi.list(status),
    refetchInterval: (query) => {
      const data = query.state.data;
      const hasInFlight = data?.some(
        (d) => d.status === 'pending' || d.status === 'processing',
      );
      return hasInFlight ? 3000 : false;
    },
  });
}

export function useUploadDocument() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      file,
      onProgress,
    }: {
      file: File;
      onProgress?: (pct: number) => void;
    }) => documentsApi.upload(file, onProgress),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['documents'] }),
  });
}

export function useDeleteDocument() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => documentsApi.remove(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['documents'] }),
  });
}
