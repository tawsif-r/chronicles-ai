import { useRef, useState } from 'react';
import { Upload, X } from 'lucide-react';
import { useUploadDocument } from '../hooks/useDocuments';

const ACCEPTED = '.pdf,.txt,.md,.docx,.png,.jpg,.jpeg,.webp';
const MAX_MB = 50;

export default function DocumentUpload() {
  const [isDragging, setIsDragging] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const { mutate: upload, isPending } = useUploadDocument();

  function handleFile(file: File) {
    if (file.size > MAX_MB * 1024 * 1024) {
      setError(`File exceeds ${MAX_MB} MB limit`);
      return;
    }
    setError(null);
    setProgress(0);
    upload(
      { file, onProgress: setProgress },
      {
        onError: (err: unknown) => {
          const msg = err instanceof Error ? err.message : 'Upload failed';
          setError(msg);
        },
        onSuccess: () => setProgress(0),
      },
    );
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }

  function onInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
    e.target.value = '';
  }

  return (
    <div className="mb-6">
      <div
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={onDrop}
        onClick={() => !isPending && inputRef.current?.click()}
        className={`relative border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors duration-150 ${
          isDragging
            ? 'border-violet-500 bg-violet-500/5'
            : 'border-gray-200 dark:border-white/[0.1] hover:border-violet-400 dark:hover:border-violet-500/50 hover:bg-gray-50 dark:hover:bg-white/[0.02]'
        } ${isPending ? 'pointer-events-none opacity-60' : ''}`}
      >
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPTED}
          className="hidden"
          onChange={onInputChange}
        />
        <Upload size={24} className="mx-auto mb-3 text-gray-400 dark:text-zinc-500" />
        <p className="text-sm font-medium text-gray-700 dark:text-zinc-300">
          {isPending ? 'Uploading…' : 'Drop a file or click to browse'}
        </p>
        <p className="mt-1 text-xs text-gray-400 dark:text-zinc-500">
          PDF · DOCX · TXT · MD · PNG · JPG · WEBP &nbsp;·&nbsp; Max {MAX_MB} MB
        </p>

        {isPending && (
          <div className="mt-4 mx-auto max-w-xs">
            <div className="h-1.5 bg-gray-200 dark:bg-zinc-700 rounded-full overflow-hidden">
              <div
                className="h-full bg-violet-600 rounded-full transition-all duration-200"
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="mt-1 text-xs text-gray-400 dark:text-zinc-500">{progress}%</p>
          </div>
        )}
      </div>

      {error && (
        <div className="mt-2 flex items-center gap-2 text-sm text-red-500 dark:text-red-400">
          <X size={14} />
          {error}
        </div>
      )}
    </div>
  );
}
