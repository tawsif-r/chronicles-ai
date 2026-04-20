import { useRef, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ChevronLeft, Terminal } from 'lucide-react';
import { useLiveLogs } from '../hooks/useLiveLogs';

const levelColor: Record<string, string> = {
  info:  'text-gray-600 dark:text-zinc-400',
  warn:  'text-amber-600 dark:text-amber-400',
  error: 'text-red-600 dark:text-red-400',
  debug: 'text-cyan-600 dark:text-cyan-500',
};
const levelBg: Record<string, string> = {
  info:  'text-gray-400 dark:text-zinc-600',
  warn:  'text-amber-500 dark:text-amber-600',
  error: 'text-red-500 dark:text-red-600',
  debug: 'text-cyan-500 dark:text-cyan-700',
};

export default function AgentLogs() {
  const { id } = useParams<{ id: string }>();
  const lines = useLiveLogs(id!);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [lines]);

  return (
    <div className="flex flex-col h-full bg-gray-50 dark:bg-zinc-950">
      <div className="flex items-center gap-3 px-4 lg:px-6 h-14 border-b border-gray-200 dark:border-white/[0.06] shrink-0 bg-white dark:bg-zinc-950">
        <Link to={`/agents/${id}`} className="text-gray-400 dark:text-zinc-500 hover:text-gray-700 dark:hover:text-zinc-300 transition-colors">
          <ChevronLeft size={18} />
        </Link>
        <Terminal size={15} className="text-gray-400 dark:text-zinc-500" />
        <span className="text-sm font-medium text-gray-900 dark:text-zinc-300">Live Logs</span>
        <span className="ml-auto text-xs text-gray-400 dark:text-zinc-600">{lines.length} lines</span>
      </div>

      {/* Sub-nav */}
      <div className="shrink-0 flex items-center gap-1 px-4 lg:px-6 h-9 border-b border-gray-200 dark:border-white/[0.06] bg-white dark:bg-zinc-950">
        {[
          { label: 'Overview', to: `/agents/${id}` },
          { label: 'Chat',     to: `/agents/${id}/chat` },
          { label: 'Logs',     to: `/agents/${id}/logs` },
          { label: 'Memory',   to: `/agents/${id}/memory` },
        ].map(({ label, to }) => (
          <Link
            key={label}
            to={to}
            className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
              label === 'Logs'
                ? 'bg-violet-600/10 text-violet-600 dark:text-violet-400'
                : 'text-gray-500 dark:text-zinc-500 hover:text-gray-800 dark:hover:text-zinc-300'
            }`}
          >
            {label}
          </Link>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto p-4 lg:p-6 font-mono text-xs leading-relaxed">
        {lines.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center py-16">
            <Terminal size={24} className="text-gray-300 dark:text-zinc-700 mb-3" />
            <p className="text-gray-400 dark:text-zinc-600">Waiting for logs…</p>
            <p className="text-gray-300 dark:text-zinc-700 text-xs mt-1">Start the agent to see output here</p>
          </div>
        ) : (
          lines.map((line, i) => (
            <div key={i} className="flex items-start gap-3 hover:bg-gray-100 dark:hover:bg-white/[0.02] px-2 py-0.5 rounded group">
              <span className="text-gray-300 dark:text-zinc-700 shrink-0 select-none w-6 text-right">{i + 1}</span>
              <span className={`shrink-0 uppercase tracking-wider text-[10px] font-bold w-10 ${levelBg[line.level] ?? 'text-gray-400 dark:text-zinc-600'}`}>{line.level}</span>
              <span className={levelColor[line.level] ?? 'text-gray-600 dark:text-zinc-400'}>{line.message}</span>
              <span className="ml-auto text-gray-300 dark:text-zinc-700 shrink-0 text-[10px] opacity-0 group-hover:opacity-100 transition-opacity">
                {new Date(line.timestamp).toLocaleTimeString()}
              </span>
            </div>
          ))
        )}
        <div ref={bottomRef} />
      </div>
    </div>
  );
}
