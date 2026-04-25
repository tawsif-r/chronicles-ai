import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Bot, Sparkles, MessageSquare, Plug, X, ArrowRight } from 'lucide-react';
import { useAgents } from '../hooks/useAgents';
import AgentCard from '../components/AgentCard';

const STEPS = [
  {
    icon: Bot,
    number: '1',
    title: 'Create an Agent',
    desc: 'Give your AI agent a name and a personality. Tell it what it knows and how it should behave.',
  },
  {
    icon: Plug,
    number: '2',
    title: 'Connect Channels',
    desc: 'Link it to Telegram, Slack, WhatsApp, or Discord so it can talk to your customers.',
  },
  {
    icon: MessageSquare,
    number: '3',
    title: 'Chat & Monitor',
    desc: 'Start a conversation with your agent and watch it respond in real time.',
  },
];

export default function Dashboard() {
  const { data: agents, isLoading } = useAgents();
  const [showWelcome, setShowWelcome] = useState(() => localStorage.getItem('welcomed') !== 'true');

  const running = agents?.filter((a) => a.status === 'running').length ?? 0;
  const total = agents?.length ?? 0;

  function dismiss() {
    localStorage.setItem('welcomed', 'true');
    setShowWelcome(false);
  }

  return (
    <div className="p-6 lg:p-8 max-w-6xl mx-auto">
      {showWelcome && (
        <div className="relative mb-8 rounded-2xl border border-violet-200 dark:border-violet-500/20 bg-violet-50 dark:bg-violet-950/30 p-6">
          <button
            onClick={dismiss}
            className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 dark:text-zinc-500 dark:hover:text-zinc-300 transition-colors"
            aria-label="Dismiss"
          >
            <X size={16} />
          </button>

          <div className="flex items-center gap-2 mb-1">
            <Sparkles size={16} className="text-violet-500" />
            <span className="text-sm font-semibold text-violet-600 dark:text-violet-400">Welcome to ChroniclesAI</span>
          </div>
          <p className="text-sm text-gray-600 dark:text-zinc-400 mb-6">
            Build AI-powered agents that talk to your customers on any messaging platform — no coding needed.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
            {STEPS.map((step, i) => (
              <div key={step.number} className="flex gap-3">
                <div className="flex-shrink-0 w-7 h-7 rounded-full bg-violet-600 text-white text-xs font-bold flex items-center justify-center">
                  {step.number}
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-800 dark:text-zinc-200">{step.title}</p>
                  <p className="text-xs text-gray-500 dark:text-zinc-500 mt-0.5 leading-relaxed">{step.desc}</p>
                </div>
                {i < STEPS.length - 1 && (
                  <ArrowRight size={14} className="hidden sm:block self-start mt-1 text-violet-300 dark:text-violet-700 flex-shrink-0" />
                )}
              </div>
            ))}
          </div>

          <div className="flex justify-end">
            <button
              onClick={dismiss}
              className="flex items-center gap-1.5 px-4 py-2 bg-violet-600 hover:bg-violet-500 text-white text-sm font-medium rounded-lg transition-colors"
            >
              Got it, let's go
              <ArrowRight size={14} />
            </button>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-white tracking-tight">Agents</h1>
          <p className="text-sm text-gray-500 dark:text-zinc-500 mt-0.5">
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

      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-36 rounded-xl bg-gray-100 dark:bg-zinc-900 border border-gray-200 dark:border-white/[0.06] animate-pulse" />
          ))}
        </div>
      ) : !agents || agents.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <div className="w-14 h-14 rounded-2xl bg-gray-100 dark:bg-zinc-900 border border-gray-200 dark:border-white/[0.08] flex items-center justify-center mb-4">
            <Bot size={24} className="text-gray-400 dark:text-zinc-600" />
          </div>
          <p className="text-base font-medium text-gray-500 dark:text-zinc-400">No agents yet</p>
          <p className="text-sm text-gray-400 dark:text-zinc-600 mt-1 mb-6">
            Hit <strong className="text-gray-500 dark:text-zinc-500">New Agent</strong> to create your first AI agent
          </p>
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
          {agents.map((agent) => (
            <AgentCard key={agent.id} agent={agent} />
          ))}
        </div>
      )}
    </div>
  );
}
