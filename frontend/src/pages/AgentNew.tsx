import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ChevronLeft, Sparkles } from 'lucide-react';
import { useCreateAgent } from '../hooks/useAgents';
import type { ModelProvider } from '@chronicles/shared';

const models: { provider: ModelProvider; name: string; label: string }[] = [
  { provider: 'claude', name: 'claude-opus-4-6',   label: 'Claude Opus 4.6'   },
  { provider: 'claude', name: 'claude-sonnet-4-6', label: 'Claude Sonnet 4.6' },
  { provider: 'openai', name: 'gpt-4o',            label: 'GPT-4o'            },
  { provider: 'openai', name: 'gpt-4o-mini',       label: 'GPT-4o Mini'       },
  { provider: 'ollama', name: 'llama3.2',           label: 'Llama 3.2 (local)' },
];

const DEFAULT_SOUL = `You are a helpful AI assistant. You are thoughtful, accurate, and clear in your responses.`;

export default function AgentNew() {
  const navigate = useNavigate();
  const createAgent = useCreateAgent();
  const [name, setName] = useState('');
  const [selectedModel, setSelectedModel] = useState(models[0]);
  const [customModel, setCustomModel] = useState('');
  const [soulMd, setSoulMd] = useState(DEFAULT_SOUL);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const modelName = customModel.trim() || selectedModel.name;
    const agent = await createAgent.mutateAsync({
      name: name.trim(),
      modelProvider: selectedModel.provider,
      modelName,
      soulMd,
    });
    navigate(`/agents/${agent.id}`);
  }

  return (
    <div className="p-8 max-w-2xl mx-auto">
      {/* Back */}
      <Link
        to="/dashboard"
        className="inline-flex items-center gap-1.5 text-sm text-zinc-500 hover:text-zinc-300 transition-colors mb-6"
      >
        <ChevronLeft size={15} />
        Back
      </Link>

      <h1 className="text-2xl font-semibold text-white tracking-tight mb-1">New Agent</h1>
      <p className="text-sm text-zinc-500 mb-8">Configure your AI agent's identity and model.</p>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Name */}
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-zinc-400 uppercase tracking-wider">Agent Name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Research Assistant"
            required
            className="w-full px-3 py-2.5 bg-zinc-900 border border-white/[0.08] rounded-lg text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-violet-500/50 focus:ring-1 focus:ring-violet-500/20 transition-all"
          />
        </div>

        {/* Model */}
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-zinc-400 uppercase tracking-wider">Model</label>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {models.map((m) => (
              <button
                key={m.name}
                type="button"
                onClick={() => setSelectedModel(m)}
                className={`px-3 py-2.5 rounded-lg text-xs font-medium border text-left transition-all ${
                  selectedModel.name === m.name
                    ? 'bg-violet-600/15 border-violet-500/30 text-violet-300'
                    : 'bg-zinc-900 border-white/[0.08] text-zinc-400 hover:border-white/[0.2] hover:text-zinc-200'
                }`}
              >
                {m.label}
              </button>
            ))}
          </div>
          <input
            type="text"
            value={customModel}
            onChange={(e) => setCustomModel(e.target.value)}
            placeholder="Or enter a custom model name…"
            className="w-full px-3 py-2 bg-zinc-900 border border-white/[0.06] rounded-lg text-xs text-zinc-400 placeholder-zinc-700 focus:outline-none focus:border-violet-500/50 transition-all mt-2"
          />
        </div>

        {/* SOUL.md */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="text-xs font-medium text-zinc-400 uppercase tracking-wider">
              SOUL.md
              <span className="ml-2 text-zinc-600 normal-case">Agent identity & instructions</span>
            </label>
          </div>
          <textarea
            value={soulMd}
            onChange={(e) => setSoulMd(e.target.value)}
            rows={8}
            className="w-full px-3 py-2.5 bg-zinc-900 border border-white/[0.08] rounded-lg text-sm text-zinc-300 placeholder-zinc-600 font-mono focus:outline-none focus:border-violet-500/50 focus:ring-1 focus:ring-violet-500/20 transition-all resize-none leading-relaxed"
          />
        </div>

        <button
          type="submit"
          disabled={createAgent.isPending}
          className="w-full flex items-center justify-center gap-2 py-2.5 bg-violet-600 hover:bg-violet-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium rounded-lg transition-colors shadow-lg shadow-violet-900/30"
        >
          {createAgent.isPending ? (
            <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : (
            <><Sparkles size={14} /> Create Agent</>
          )}
        </button>
      </form>
    </div>
  );
}
