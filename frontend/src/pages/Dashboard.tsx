import { Link } from 'react-router-dom';
import { Plus, Bot } from 'lucide-react';
import { useAgents } from '../hooks/useAgents';
import AgentCard from '../components/AgentCard';

export default function Dashboard() {
  const { data: agents, isLoading } = useAgents();

  const running = agents?.filter((a) => a.status === 'running').length ?? 0;
  const total = agents?.length ?? 0;

  return (
    <div className="p-8 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-semibold text-white tracking-tight">Agents</h1>
          <p className="text-sm text-zinc-500 mt-0.5">
            {isLoading ? '—' : `${running} running · ${total} total`}
          </p>
        </div>
        <Link
          to="/agents/new"
          className="flex items-center gap-2 px-4 py-2 bg-violet-600 hover:bg-violet-500 text-white text-sm font-medium rounded-lg transition-colors shadow-lg shadow-violet-900/30"
        >
          <Plus size={15} />
          New Agent
        </Link>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-36 rounded-xl bg-zinc-900 border border-white/[0.06] animate-pulse" />
          ))}
        </div>
      ) : agents?.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <div className="w-14 h-14 rounded-2xl bg-zinc-900 border border-white/[0.08] flex items-center justify-center mb-4">
            <Bot size={24} className="text-zinc-600" />
          </div>
          <p className="text-base font-medium text-zinc-400">No agents yet</p>
          <p className="text-sm text-zinc-600 mt-1 mb-6">Create your first agent to get started</p>
          <Link
            to="/agents/new"
            className="flex items-center gap-2 px-4 py-2 bg-violet-600 hover:bg-violet-500 text-white text-sm font-medium rounded-lg transition-colors"
          >
            <Plus size={14} />
            Create Agent
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {agents!.map((agent) => (
            <AgentCard key={agent.id} agent={agent} />
          ))}
        </div>
      )}
    </div>
  );
}
