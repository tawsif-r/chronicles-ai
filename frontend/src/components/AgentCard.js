import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { Link } from 'react-router-dom';
import { MessageSquare, Activity, Play, Square, Trash2 } from 'lucide-react';
import StatusBadge from './StatusBadge';
import { useStartAgent, useStopAgent, useDeleteAgent } from '../hooks/useAgents';
const providerLabel = {
    claude: 'Claude', openai: 'OpenAI', ollama: 'Ollama',
};
export default function AgentCard({ agent }) {
    const start = useStartAgent(agent.id);
    const stop = useStopAgent(agent.id);
    const del = useDeleteAgent();
    const isRunning = agent.status === 'running';
    const isTransitioning = agent.status === 'starting';
    return (_jsxs("div", { className: "group relative bg-white dark:bg-zinc-900 border border-gray-200 dark:border-white/[0.08] rounded-xl p-5 hover:border-violet-300 dark:hover:border-white/[0.15] transition-all duration-200 hover:shadow-lg dark:hover:shadow-[0_0_40px_rgba(139,92,246,0.06)]", children: [_jsxs("div", { className: "flex items-start justify-between mb-4", children: [_jsxs("div", { className: "flex-1 min-w-0", children: [_jsx(Link, { to: `/agents/${agent.id}`, className: "text-base font-semibold text-gray-900 dark:text-white hover:text-violet-600 dark:hover:text-violet-300 transition-colors truncate block", children: agent.name }), _jsxs("p", { className: "text-xs text-gray-400 dark:text-zinc-500 mt-0.5 truncate", children: [providerLabel[agent.modelProvider] ?? agent.modelProvider, " \u00B7 ", agent.modelName] })] }), _jsx(StatusBadge, { status: agent.status })] }), _jsxs("div", { className: "flex items-center gap-2", children: [_jsxs(Link, { to: `/agents/${agent.id}/chat`, className: "flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-violet-600 hover:bg-violet-500 text-white transition-colors", children: [_jsx(MessageSquare, { size: 12 }), " Chat"] }), _jsxs(Link, { to: `/agents/${agent.id}/logs`, className: "flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-gray-100 dark:bg-white/[0.06] hover:bg-gray-200 dark:hover:bg-white/[0.1] text-gray-700 dark:text-zinc-300 transition-colors border border-gray-200 dark:border-white/[0.08]", children: [_jsx(Activity, { size: 12 }), " Logs"] }), _jsx("button", { onClick: () => isRunning ? stop.mutate() : start.mutate(), disabled: isTransitioning, className: "ml-auto flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-gray-100 dark:bg-white/[0.06] hover:bg-gray-200 dark:hover:bg-white/[0.1] text-gray-700 dark:text-zinc-300 transition-colors border border-gray-200 dark:border-white/[0.08] disabled:opacity-40 disabled:cursor-not-allowed", children: isRunning
                            ? _jsxs(_Fragment, { children: [_jsx(Square, { size: 11, className: "text-red-500 dark:text-red-400" }), " Stop"] })
                            : _jsxs(_Fragment, { children: [_jsx(Play, { size: 11, className: "text-emerald-500 dark:text-emerald-400" }), " Start"] }) }), _jsxs("button", { onClick: () => {
                            if (window.confirm(`Delete "${agent.name}"? This cannot be undone.`)) {
                                del.mutate(agent.id);
                            }
                        }, disabled: del.isPending, className: "flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-gray-100 dark:bg-white/[0.06] hover:bg-red-100 dark:hover:bg-red-500/10 text-gray-700 dark:text-zinc-300 hover:text-red-600 dark:hover:text-red-400 transition-colors border border-gray-200 dark:border-white/[0.08] disabled:opacity-40 disabled:cursor-not-allowed", children: [_jsx(Trash2, { size: 11 }), " Delete"] })] })] }));
}
