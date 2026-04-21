import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ChevronLeft, Sparkles } from 'lucide-react';
import { useCreateAgent } from '../hooks/useAgents';
const models = [
    { provider: 'claude', name: 'claude-opus-4-6', label: 'Claude Opus 4.6' },
    { provider: 'claude', name: 'claude-sonnet-4-6', label: 'Claude Sonnet 4.6' },
    { provider: 'openai', name: 'gpt-4o', label: 'GPT-4o' },
    { provider: 'openai', name: 'gpt-4o-mini', label: 'GPT-4o Mini' },
    { provider: 'ollama', name: 'llama3.2', label: 'Llama 3.2 (local)' },
    { provider: 'openrouter', name: 'openrouter/auto', label: 'OpenRouter Auto' },
];
const DEFAULT_SOUL = `You are a helpful AI assistant. You are thoughtful, accurate, and clear in your responses.`;
export default function AgentNew() {
    const navigate = useNavigate();
    const createAgent = useCreateAgent();
    const [name, setName] = useState('');
    const [selectedModel, setSelectedModel] = useState(models[0]);
    const [customModel, setCustomModel] = useState('');
    const [soulMd, setSoulMd] = useState(DEFAULT_SOUL);
    async function handleSubmit(e) {
        e.preventDefault();
        const modelName = customModel.trim() || selectedModel.name;
        const agent = await createAgent.mutateAsync({ name: name.trim(), modelProvider: selectedModel.provider, modelName, soulMd });
        navigate(`/agents/${agent.id}`);
    }
    return (_jsxs("div", { className: "p-6 lg:p-8 max-w-2xl mx-auto", children: [_jsxs(Link, { to: "/dashboard", className: "inline-flex items-center gap-1.5 text-sm text-gray-500 dark:text-zinc-500 hover:text-gray-700 dark:hover:text-zinc-300 transition-colors mb-6", children: [_jsx(ChevronLeft, { size: 15 }), " Back"] }), _jsx("h1", { className: "text-2xl font-semibold text-gray-900 dark:text-white tracking-tight mb-1", children: "New Agent" }), _jsx("p", { className: "text-sm text-gray-500 dark:text-zinc-500 mb-8", children: "Configure your AI agent's identity and model." }), _jsxs("form", { onSubmit: handleSubmit, className: "space-y-6", children: [_jsxs("div", { className: "space-y-1.5", children: [_jsx("label", { className: "text-xs font-medium text-gray-500 dark:text-zinc-400 uppercase tracking-wider", children: "Agent Name" }), _jsx("input", { type: "text", value: name, onChange: (e) => setName(e.target.value), placeholder: "e.g. Research Assistant", required: true, className: "w-full px-3 py-2.5 bg-white dark:bg-zinc-900 border border-gray-200 dark:border-white/[0.08] rounded-lg text-sm text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-zinc-600 focus:outline-none focus:border-violet-400 dark:focus:border-violet-500/50 focus:ring-1 focus:ring-violet-400/20 dark:focus:ring-violet-500/20 transition-all" })] }), _jsxs("div", { className: "space-y-1.5", children: [_jsx("label", { className: "text-xs font-medium text-gray-500 dark:text-zinc-400 uppercase tracking-wider", children: "Model" }), _jsx("div", { className: "grid grid-cols-2 gap-2 sm:grid-cols-3", children: models.map((m) => (_jsx("button", { type: "button", onClick: () => setSelectedModel(m), className: `px-3 py-2.5 rounded-lg text-xs font-medium border text-left transition-all ${selectedModel.name === m.name
                                        ? 'bg-violet-600/15 border-violet-500/30 text-violet-600 dark:text-violet-300'
                                        : 'bg-white dark:bg-zinc-900 border-gray-200 dark:border-white/[0.08] text-gray-500 dark:text-zinc-400 hover:border-gray-300 dark:hover:border-white/[0.2] hover:text-gray-800 dark:hover:text-zinc-200'}`, children: m.label }, m.name))) }), _jsx("input", { type: "text", value: customModel, onChange: (e) => setCustomModel(e.target.value), placeholder: "Or enter a custom model name\u2026", className: "w-full px-3 py-2 bg-white dark:bg-zinc-900 border border-gray-200 dark:border-white/[0.06] rounded-lg text-xs text-gray-500 dark:text-zinc-400 placeholder-gray-300 dark:placeholder-zinc-700 focus:outline-none focus:border-violet-400 dark:focus:border-violet-500/50 transition-all mt-2" })] }), _jsxs("div", { className: "space-y-1.5", children: [_jsxs("label", { className: "text-xs font-medium text-gray-500 dark:text-zinc-400 uppercase tracking-wider", children: ["SOUL.md ", _jsx("span", { className: "ml-2 text-gray-400 dark:text-zinc-600 normal-case font-normal", children: "Agent identity & instructions" })] }), _jsx("textarea", { value: soulMd, onChange: (e) => setSoulMd(e.target.value), rows: 8, className: "w-full px-3 py-2.5 bg-white dark:bg-zinc-900 border border-gray-200 dark:border-white/[0.08] rounded-lg text-sm text-gray-800 dark:text-zinc-300 font-mono focus:outline-none focus:border-violet-400 dark:focus:border-violet-500/50 focus:ring-1 focus:ring-violet-400/20 dark:focus:ring-violet-500/20 transition-all resize-none leading-relaxed" })] }), _jsx("button", { type: "submit", disabled: createAgent.isPending, className: "w-full flex items-center justify-center gap-2 py-2.5 bg-violet-600 hover:bg-violet-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium rounded-lg transition-colors shadow-lg shadow-violet-900/30", children: createAgent.isPending
                            ? _jsx("span", { className: "w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" })
                            : _jsxs(_Fragment, { children: [_jsx(Sparkles, { size: 14 }), " Create Agent"] }) })] })] }));
}
