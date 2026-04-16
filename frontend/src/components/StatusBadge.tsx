import type { AgentStatus } from '@chronicles/shared';

const config: Record<AgentStatus, { dot: string; text: string; label: string }> = {
  running:  { dot: 'bg-emerald-500', text: 'text-emerald-600 dark:text-emerald-400', label: 'Running'  },
  starting: { dot: 'bg-amber-500 animate-pulse', text: 'text-amber-600 dark:text-amber-400', label: 'Starting' },
  stopped:  { dot: 'bg-gray-400 dark:bg-zinc-500', text: 'text-gray-500 dark:text-zinc-400', label: 'Stopped'  },
  error:    { dot: 'bg-red-500',    text: 'text-red-600 dark:text-red-400',    label: 'Error'     },
};

export default function StatusBadge({ status }: { status: AgentStatus }) {
  const c = config[status];
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-white/[0.08] text-xs font-medium">
      <span className={`w-1.5 h-1.5 rounded-full ${c.dot}`} />
      <span className={c.text}>{c.label}</span>
    </span>
  );
}
