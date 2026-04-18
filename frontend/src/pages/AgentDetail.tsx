import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ChevronLeft, MessageSquare, Activity, Brain, Play, Square, Save } from 'lucide-react';
import { useAgent, useStartAgent, useStopAgent, useUpdateAgent } from '../hooks/useAgents';
import StatusBadge from '../components/StatusBadge';
import ChannelManager from '../components/ChannelManager';

type Tab = 'soul' | 'tools' | 'identity' | 'heartbeat' | 'channels';
const tabs: { id: Tab; label: string }[] = [
  { id: 'soul', label: 'SOUL.md' },
  { id: 'tools', label: 'TOOLS.md' },
  { id: 'identity', label: 'IDENTITY.md' },
  { id: 'heartbeat', label: 'HEARTBEAT.md' },
  { id: 'channels', label: 'Channels' },
];
const fieldMap: Record<string, 'soulMd' | 'toolsMd' | 'identityMd' | 'heartbeatMd'> = {
  soul: 'soulMd', tools: 'toolsMd', identity: 'identityMd', heartbeat: 'heartbeatMd',
};

export default function AgentDetail() {
  const { id } = useParams<{ id: string }>();
  const { data: agent, isLoading } = useAgent(id!);
  const start = useStartAgent(id!);
  const stop = useStopAgent(id!);
  const update = useUpdateAgent(id!);
  const [activeTab, setActiveTab] = useState<Tab>('soul');
  const [draft, setDraft] = useState<Record<string, string>>({});
  const [saved, setSaved] = useState(false);

  if (isLoading || !agent) {
    return (
      <div className="p-8">
        <div className="h-8 w-48 bg-gray-100 dark:bg-zinc-900 rounded-lg animate-pulse mb-4" />
        <div className="h-64 bg-gray-100 dark:bg-zinc-900 rounded-xl animate-pulse" />
      </div>
    );
  }

  const field = fieldMap[activeTab];
  const value = field ? (draft[field] ?? agent[field]) : '';
  const isDirty = !!field && field in draft && draft[field] !== agent[field];

  async function handleSave() {
    await update.mutateAsync({ [field]: value });
    setDraft((d) => { const n = { ...d }; delete n[field]; return n; });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  const isRunning = agent.status === 'running';

  return (
    <div className="flex flex-col h-full">
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 lg:px-8 h-16 border-b border-gray-200 dark:border-white/[0.06] shrink-0 bg-white dark:bg-transparent">
        <div className="flex items-center gap-3">
          <Link to="/dashboard" className="text-gray-400 dark:text-zinc-500 hover:text-gray-700 dark:hover:text-zinc-300 transition-colors">
            <ChevronLeft size={18} />
          </Link>
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-sm font-semibold text-gray-900 dark:text-white">{agent.name}</h1>
              <StatusBadge status={agent.status} />
            </div>
            <p className="text-xs text-gray-400 dark:text-zinc-600">{agent.modelProvider} · {agent.modelName}</p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Link to={`/agents/${id}/chat`} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-gray-100 dark:bg-white/[0.06] hover:bg-gray-200 dark:hover:bg-white/[0.1] text-gray-700 dark:text-zinc-300 border border-gray-200 dark:border-white/[0.08] transition-colors">
            <MessageSquare size={12} /> Chat
          </Link>
          <Link to={`/agents/${id}/logs`} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-gray-100 dark:bg-white/[0.06] hover:bg-gray-200 dark:hover:bg-white/[0.1] text-gray-700 dark:text-zinc-300 border border-gray-200 dark:border-white/[0.08] transition-colors">
            <Activity size={12} /> Logs
          </Link>
          <Link to={`/agents/${id}/memory`} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-gray-100 dark:bg-white/[0.06] hover:bg-gray-200 dark:hover:bg-white/[0.1] text-gray-700 dark:text-zinc-300 border border-gray-200 dark:border-white/[0.08] transition-colors">
            <Brain size={12} /> Memory
          </Link>
          {isRunning ? (
            <button onClick={() => stop.mutate()} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-red-50 dark:bg-red-500/10 hover:bg-red-100 dark:hover:bg-red-500/20 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-500/20 transition-colors">
              <Square size={11} /> Stop
            </button>
          ) : (
            <button onClick={() => start.mutate()} disabled={agent.status === 'starting'} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-emerald-50 dark:bg-emerald-500/10 hover:bg-emerald-100 dark:hover:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20 transition-colors disabled:opacity-40">
              <Play size={11} /> Start
            </button>
          )}
        </div>
      </div>

      {/* Tab bar */}
      <div className="flex items-center gap-1 px-4 lg:px-8 h-12 border-b border-gray-200 dark:border-white/[0.06] shrink-0 bg-white dark:bg-transparent overflow-x-auto">
        {tabs.map((t) => (
          <button key={t.id} onClick={() => setActiveTab(t.id)} className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${activeTab === t.id ? 'bg-violet-600/15 text-violet-600 dark:text-violet-300' : 'text-gray-500 dark:text-zinc-500 hover:text-gray-900 dark:hover:text-zinc-300 hover:bg-gray-100 dark:hover:bg-white/[0.04]'}`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Editor / Channel Manager */}
      <div className="flex-1 relative overflow-hidden overflow-y-auto">
        {activeTab === 'channels' ? (
          <ChannelManager agentId={id!} channels={agent.channels} />
        ) : (
          <textarea
            value={value}
            onChange={(e) => setDraft((d) => ({ ...d, [field!]: e.target.value }))}
            className="absolute inset-0 w-full h-full p-6 lg:p-8 bg-transparent text-sm text-gray-800 dark:text-zinc-300 font-mono leading-relaxed resize-none focus:outline-none placeholder-gray-300 dark:placeholder-zinc-700"
            placeholder={`# ${activeTab.toUpperCase()}.md\n\n...`}
            spellCheck={false}
          />
        )}
      </div>

      {/* Save bar */}
      {(isDirty || saved) && (
        <div className="shrink-0 flex items-center justify-between px-4 lg:px-8 h-12 bg-gray-50 dark:bg-zinc-900 border-t border-gray-200 dark:border-white/[0.06]">
          <span className="text-xs text-gray-500 dark:text-zinc-500">{saved ? '✓ Saved' : 'Unsaved changes'}</span>
          <button onClick={handleSave} disabled={update.isPending || !isDirty} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-violet-600 hover:bg-violet-500 text-white transition-colors disabled:opacity-50">
            <Save size={12} />
            {update.isPending ? 'Saving…' : 'Save'}
          </button>
        </div>
      )}
    </div>
  );
}
