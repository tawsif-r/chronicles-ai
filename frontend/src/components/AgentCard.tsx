import { Link } from 'react-router-dom';
import { MessageSquare, Activity, Play, Square } from 'lucide-react';
import type { Agent } from '@chronicles/shared';
import StatusBadge from './StatusBadge';
import { useStartAgent, useStopAgent } from '../hooks/useAgents';

const providerLabel: Record<string, string> = {
  claude: 'Claude', openai: 'OpenAI', ollama: 'Ollama',
};

export default function AgentCard({ agent }: { agent: Agent }) {
  const start = useStartAgent(agent.id);
  const stop = useStopAgent(agent.id);
  const isRunning = agent.status === 'running';
  const isTransitioning = agent.status === 'starting';

  return (
    <div className="group relative bg-white dark:bg-zinc-900 border border-gray-200 dark:border-white/[0.08] rounded-xl p-5 hover:border-violet-300 dark:hover:border-white/[0.15] transition-all duration-200 hover:shadow-lg dark:hover:shadow-[0_0_40px_rgba(139,92,246,0.06)]">
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1 min-w-0">
          <Link
            to={`/agents/${agent.id}`}
            className="text-base font-semibold text-gray-900 dark:text-white hover:text-violet-600 dark:hover:text-violet-300 transition-colors truncate block"
          >
            {agent.name}
          </Link>
          <p className="text-xs text-gray-400 dark:text-zinc-500 mt-0.5 truncate">
            {providerLabel[agent.modelProvider] ?? agent.modelProvider} · {agent.modelName}
          </p>
        </div>
        <StatusBadge status={agent.status} />
      </div>

      <div className="flex items-center gap-2">
        <Link
          to={`/agents/${agent.id}/chat`}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-violet-600 hover:bg-violet-500 text-white transition-colors"
        >
          <MessageSquare size={12} /> Chat
        </Link>
        <Link
          to={`/agents/${agent.id}/logs`}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-gray-100 dark:bg-white/[0.06] hover:bg-gray-200 dark:hover:bg-white/[0.1] text-gray-700 dark:text-zinc-300 transition-colors border border-gray-200 dark:border-white/[0.08]"
        >
          <Activity size={12} /> Logs
        </Link>
        <button
          onClick={() => isRunning ? stop.mutate() : start.mutate()}
          disabled={isTransitioning}
          className="ml-auto flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-gray-100 dark:bg-white/[0.06] hover:bg-gray-200 dark:hover:bg-white/[0.1] text-gray-700 dark:text-zinc-300 transition-colors border border-gray-200 dark:border-white/[0.08] disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {isRunning
            ? <><Square size={11} className="text-red-500 dark:text-red-400" /> Stop</>
            : <><Play size={11} className="text-emerald-500 dark:text-emerald-400" /> Start</>}
        </button>
      </div>
    </div>
  );
}
