import { useState } from 'react';
import { FileText, Image, File, Trash2, AlertCircle, Clock, CheckCircle2, Loader2 } from 'lucide-react';
import { useDocuments, useDeleteDocument } from '../hooks/useDocuments';
import DocumentUpload from '../components/DocumentUpload';
import type { Document } from '@chronicles/shared';

const SEARCH_TOOL_JSON = JSON.stringify(
  [
    {
      name: 'search_documents',
      description: 'Semantically search uploaded documents in the workspace vault.',
      input_schema: {
        type: 'object',
        properties: {
          query: { type: 'string', description: 'What to search for' },
          limit: { type: 'number', description: 'Max chunks to return (default 5, max 20)' },
          documentIds: {
            type: 'array',
            items: { type: 'string' },
            description: 'Optional: restrict search to specific document IDs',
          },
        },
        required: ['query'],
      },
    },
  ],
  null,
  2,
);

type StatusFilter = 'all' | 'ready' | 'processing' | 'error';

function fileIcon(mimeType: string) {
  if (mimeType.startsWith('image/')) return Image;
  if (mimeType === 'application/pdf' || mimeType.includes('word')) return FileText;
  return File;
}

function StatusBadge({ status }: { status: Document['status'] }) {
  const map = {
    pending: { label: 'Pending', icon: Clock, cls: 'text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-400/10' },
    processing: { label: 'Processing', icon: Loader2, cls: 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-400/10' },
    ready: { label: 'Ready', icon: CheckCircle2, cls: 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-400/10' },
    error: { label: 'Error', icon: AlertCircle, cls: 'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-400/10' },
  };
  const { label, icon: Icon, cls } = map[status];
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${cls}`}>
      <Icon size={11} className={status === 'processing' ? 'animate-spin' : ''} />
      {label}
    </span>
  );
}

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

const STATUS_FILTERS: { key: StatusFilter; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'ready', label: 'Ready' },
  { key: 'processing', label: 'Processing' },
  { key: 'error', label: 'Error' },
];

export default function DocumentsPage() {
  const [filter, setFilter] = useState<StatusFilter>('all');
  const [copied, setCopied] = useState(false);
  const { data: documents, isLoading } = useDocuments(filter === 'all' ? undefined : filter);
  const { mutate: deleteDoc, isPending: isDeleting } = useDeleteDocument();

  const readyCount = documents?.filter((d) => d.status === 'ready').length ?? 0;
  const totalCount = documents?.length ?? 0;

  function copyToolJson() {
    navigator.clipboard.writeText(SEARCH_TOOL_JSON).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  function handleDelete(id: string) {
    if (!confirm('Delete this document? This cannot be undone.')) return;
    deleteDoc(id);
  }

  return (
    <div className="p-6 lg:p-8 max-w-5xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-white tracking-tight">
          Document Vault
        </h1>
        <p className="text-sm text-gray-500 dark:text-zinc-500 mt-0.5">
          {isLoading ? '—' : `${readyCount} ready · ${totalCount} total`}
        </p>
      </div>

      {/* Upload */}
      <DocumentUpload />

      {/* Filter tabs */}
      <div className="flex gap-1 mb-4 p-1 bg-gray-100 dark:bg-zinc-900 rounded-lg w-fit">
        {STATUS_FILTERS.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setFilter(key)}
            className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
              filter === key
                ? 'bg-white dark:bg-zinc-800 text-gray-900 dark:text-white shadow-sm'
                : 'text-gray-500 dark:text-zinc-500 hover:text-gray-700 dark:hover:text-zinc-300'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Document list */}
      {isLoading ? (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div
              key={i}
              className="h-20 rounded-xl bg-gray-100 dark:bg-zinc-900 border border-gray-200 dark:border-white/[0.06] animate-pulse"
            />
          ))}
        </div>
      ) : !documents || documents.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-14 h-14 rounded-2xl bg-gray-100 dark:bg-zinc-900 border border-gray-200 dark:border-white/[0.08] flex items-center justify-center mb-4">
            <FileText size={24} className="text-gray-400 dark:text-zinc-600" />
          </div>
          <p className="text-base font-medium text-gray-500 dark:text-zinc-400">No documents yet</p>
          <p className="text-sm text-gray-400 dark:text-zinc-600 mt-1 mb-8">
            Upload a PDF, Word doc, or text file to get started
          </p>

          {/* Tool JSON snippet */}
          <div className="w-full max-w-lg text-left">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-medium text-gray-500 dark:text-zinc-400">
                Add this to your agent&apos;s Tools (JSON) to enable document search:
              </p>
              <button
                onClick={copyToolJson}
                className="text-xs text-violet-600 dark:text-violet-400 hover:underline"
              >
                {copied ? 'Copied!' : 'Copy'}
              </button>
            </div>
            <pre className="text-xs bg-gray-100 dark:bg-zinc-900 border border-gray-200 dark:border-white/[0.06] rounded-lg p-3 overflow-x-auto text-gray-600 dark:text-zinc-400">
              {SEARCH_TOOL_JSON}
            </pre>
          </div>
        </div>
      ) : (
        <>
          <div className="space-y-3">
            {documents.map((doc) => {
              const Icon = fileIcon(doc.mimeType);
              return (
                <div
                  key={doc.id}
                  className="flex items-center gap-4 p-4 rounded-xl bg-white dark:bg-zinc-950 border border-gray-200 dark:border-white/[0.06]"
                >
                  <div className="w-10 h-10 rounded-lg bg-gray-100 dark:bg-zinc-900 flex items-center justify-center shrink-0">
                    <Icon size={18} className="text-gray-500 dark:text-zinc-400" />
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                      {doc.title ?? doc.filename}
                    </p>
                    {doc.title && (
                      <p className="text-xs text-gray-400 dark:text-zinc-600 truncate">{doc.filename}</p>
                    )}
                    <div className="flex items-center gap-3 mt-1 flex-wrap">
                      <StatusBadge status={doc.status} />
                      {doc.status === 'ready' && (
                        <span className="text-xs text-gray-400 dark:text-zinc-600">
                          {doc.chunkCount} chunks
                        </span>
                      )}
                      <span className="text-xs text-gray-400 dark:text-zinc-600">
                        {formatSize(Number(doc.sizeBytes))}
                      </span>
                      <span className="text-xs text-gray-400 dark:text-zinc-600">
                        {formatDate(doc.createdAt)}
                      </span>
                      {doc.status === 'error' && doc.errorMessage && (
                        <span className="text-xs text-red-500 dark:text-red-400 truncate max-w-xs">
                          {doc.errorMessage}
                        </span>
                      )}
                    </div>
                  </div>

                  <button
                    onClick={() => handleDelete(doc.id)}
                    disabled={isDeleting}
                    className="p-2 rounded-lg text-gray-400 dark:text-zinc-600 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/[0.06] transition-colors disabled:opacity-50"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              );
            })}
          </div>

          {/* Tool JSON snippet (below list) */}
          <div className="mt-8 p-4 rounded-xl bg-gray-50 dark:bg-zinc-900 border border-gray-200 dark:border-white/[0.06]">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-medium text-gray-600 dark:text-zinc-400">
                Add this to your agent&apos;s Tools (JSON) to enable document search:
              </p>
              <button
                onClick={copyToolJson}
                className="text-xs text-violet-600 dark:text-violet-400 hover:underline"
              >
                {copied ? 'Copied!' : 'Copy'}
              </button>
            </div>
            <pre className="text-xs text-gray-600 dark:text-zinc-400 overflow-x-auto">
              {SEARCH_TOOL_JSON}
            </pre>
          </div>
        </>
      )}
    </div>
  );
}
