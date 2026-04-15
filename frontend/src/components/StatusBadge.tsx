import type { AgentStatus } from '@chronicles/shared';

const config: Record<AgentStatus, { dot: string; text: string; label: string }> = {
  running:  { dot: 'bg-emerald-400', text: 'text-emerald-400', label: 'Running'  },
  starting: { dot: 'bg-amber-400 animate-pulse', text: 'text-amber-400', label: 'Starting' },
  stopped:  { dot: 'bg-zinc-500',   text: 'text-zinc-400',   label: 'Stopped'  },
  error:    { dot: 'bg-red-500',    text: 'text-red-400',    label: 'Error'     },
};

export default function StatusBadge({ status }: { status: AgentStatus }) {
  const c = config[status];
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/5 border border-white/[0.08] text-xs font-medium">
      <span className={`w-1.5 h-1.5 rounded-full ${c.dot}`} />
      <span className={c.text}>{c.label}</span>
    </span>
  );
}
