import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useRef, useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ChevronLeft, Send, Bot, User, AlertCircle, RefreshCw } from 'lucide-react';
import { useAgent } from '../hooks/useAgents';
import { useChatHistory, useSendMessage } from '../hooks/useChat';
import StatusBadge from '../components/StatusBadge';
export default function AgentChat() {
    const { id } = useParams();
    const { data: agent } = useAgent(id);
    const { data: history, isLoading } = useChatHistory(id);
    const sendMessage = useSendMessage(id);
    const [input, setInput] = useState('');
    const [optimisticMsg, setOptimisticMsg] = useState(null);
    const [chatError, setChatError] = useState(null);
    const bottomRef = useRef(null);
    const textareaRef = useRef(null);
    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [history, sendMessage.isPending, optimisticMsg]);
    async function handleSend() {
        const msg = input.trim();
        if (!msg || sendMessage.isPending)
            return;
        setInput('');
        setChatError(null);
        setOptimisticMsg(msg);
        if (textareaRef.current)
            textareaRef.current.style.height = 'auto';
        try {
            await sendMessage.mutateAsync(msg);
            setOptimisticMsg(null); // history refetch will now include the real message
        }
        catch (err) {
            setOptimisticMsg(null);
            const axiosError = err;
            const detail = axiosError?.response?.data?.message ?? axiosError?.message ?? 'Request failed';
            setChatError(detail);
        }
    }
    function handleKeyDown(e) {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    }
    function autoResize(e) {
        setInput(e.target.value);
        e.target.style.height = 'auto';
        e.target.style.height = Math.min(e.target.scrollHeight, 160) + 'px';
    }
    const isAgentRunning = agent?.status === 'running';
    const hasMessages = (history?.length ?? 0) > 0 || optimisticMsg !== null;
    return (_jsxs("div", { className: "flex flex-col h-full bg-gray-50 dark:bg-zinc-950", children: [_jsxs("div", { className: "flex items-center gap-3 px-4 lg:px-6 h-14 border-b border-gray-200 dark:border-white/[0.06] shrink-0 bg-white dark:bg-zinc-950", children: [_jsx(Link, { to: `/agents/${id}`, className: "text-gray-400 dark:text-zinc-500 hover:text-gray-700 dark:hover:text-zinc-300 transition-colors", children: _jsx(ChevronLeft, { size: 18 }) }), _jsxs("div", { className: "flex items-center gap-2.5 flex-1 min-w-0", children: [_jsx("div", { className: "w-7 h-7 rounded-full bg-violet-600/20 border border-violet-500/30 flex items-center justify-center shrink-0", children: _jsx(Bot, { size: 13, className: "text-violet-500 dark:text-violet-400" }) }), _jsx("p", { className: "text-sm font-medium text-gray-900 dark:text-white truncate", children: agent?.name ?? '…' })] }), agent && _jsx(StatusBadge, { status: agent.status })] }), _jsx("div", { className: "shrink-0 flex items-center gap-1 px-4 lg:px-6 h-9 border-b border-gray-200 dark:border-white/[0.06] bg-white dark:bg-zinc-950", children: [
                    { label: 'Overview', to: `/agents/${id}` },
                    { label: 'Chat', to: `/agents/${id}/chat` },
                    { label: 'Logs', to: `/agents/${id}/logs` },
                    { label: 'Memory', to: `/agents/${id}/memory` },
                ].map(({ label, to }) => (_jsx(Link, { to: to, className: `px-3 py-1 rounded-md text-xs font-medium transition-colors ${label === 'Chat'
                        ? 'bg-violet-600/10 text-violet-600 dark:text-violet-400'
                        : 'text-gray-500 dark:text-zinc-500 hover:text-gray-800 dark:hover:text-zinc-300'}`, children: label }, label))) }), _jsxs("div", { className: "flex-1 overflow-y-auto px-4 py-6 space-y-6", children: [isLoading && (_jsx("div", { className: "flex justify-center", children: _jsx("span", { className: "w-5 h-5 border-2 border-gray-300 dark:border-zinc-700 border-t-violet-500 rounded-full animate-spin" }) })), !isLoading && !hasMessages && (_jsxs("div", { className: "flex flex-col items-center justify-center h-full py-16 text-center", children: [_jsx("div", { className: "w-12 h-12 rounded-full bg-violet-600/10 border border-violet-500/20 flex items-center justify-center mb-4", children: _jsx(Bot, { size: 20, className: "text-violet-500 dark:text-violet-400" }) }), _jsxs("p", { className: "text-sm font-medium text-gray-500 dark:text-zinc-400", children: [agent?.name, " is ready"] }), _jsx("p", { className: "text-xs text-gray-400 dark:text-zinc-600 mt-1", children: "Send a message to start the conversation" })] })), history?.map((msg) => (_jsxs("div", { className: `flex items-start gap-3 max-w-3xl ${msg.role === 'user' ? 'ml-auto flex-row-reverse' : 'mr-auto'}`, children: [_jsx("div", { className: `w-7 h-7 rounded-full shrink-0 flex items-center justify-center ${msg.role === 'user' ? 'bg-gray-100 dark:bg-zinc-800 border border-gray-200 dark:border-white/[0.08]' : 'bg-violet-600/20 border border-violet-500/30'}`, children: msg.role === 'user'
                                    ? _jsx(User, { size: 13, className: "text-gray-500 dark:text-zinc-400" })
                                    : _jsx(Bot, { size: 13, className: "text-violet-500 dark:text-violet-400" }) }), _jsx("div", { className: `px-4 py-3 rounded-2xl text-sm leading-relaxed max-w-[calc(100%-3rem)] ${msg.role === 'user' ? 'bg-violet-600 text-white rounded-tr-sm' : 'bg-white dark:bg-zinc-900 border border-gray-200 dark:border-white/[0.08] text-gray-800 dark:text-zinc-200 rounded-tl-sm'}`, children: _jsx("p", { className: "whitespace-pre-wrap break-words", children: msg.content }) })] }, msg.id))), optimisticMsg && (_jsxs("div", { className: "flex items-start gap-3 max-w-3xl ml-auto flex-row-reverse", children: [_jsx("div", { className: "w-7 h-7 rounded-full shrink-0 flex items-center justify-center bg-gray-100 dark:bg-zinc-800 border border-gray-200 dark:border-white/[0.08]", children: _jsx(User, { size: 13, className: "text-gray-500 dark:text-zinc-400" }) }), _jsx("div", { className: "px-4 py-3 rounded-2xl rounded-tr-sm text-sm leading-relaxed max-w-[calc(100%-3rem)] bg-violet-600 text-white opacity-80", children: _jsx("p", { className: "whitespace-pre-wrap break-words", children: optimisticMsg }) })] })), sendMessage.isPending && (_jsxs("div", { className: "flex items-start gap-3 max-w-3xl mr-auto", children: [_jsx("div", { className: "w-7 h-7 rounded-full bg-violet-600/20 border border-violet-500/30 flex items-center justify-center shrink-0", children: _jsx(Bot, { size: 13, className: "text-violet-400" }) }), _jsx("div", { className: "px-4 py-3.5 rounded-2xl rounded-tl-sm bg-white dark:bg-zinc-900 border border-gray-200 dark:border-white/[0.08]", children: _jsx("span", { className: "flex gap-1", children: [0, 1, 2].map((i) => (_jsx("span", { className: "w-1.5 h-1.5 bg-gray-400 dark:bg-zinc-500 rounded-full animate-bounce", style: { animationDelay: `${i * 0.15}s` } }, i))) }) })] })), chatError && (_jsxs("div", { className: "flex items-start gap-2.5 px-4 py-3 rounded-xl bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 max-w-3xl mr-auto", children: [_jsx(AlertCircle, { size: 14, className: "text-red-500 dark:text-red-400 shrink-0 mt-0.5" }), _jsxs("div", { className: "flex-1 min-w-0", children: [_jsx("p", { className: "text-xs font-medium text-red-700 dark:text-red-400", children: "Message failed" }), _jsx("p", { className: "text-xs text-red-600 dark:text-red-500 mt-0.5 break-words", children: chatError })] }), _jsx("button", { onClick: () => setChatError(null), className: "shrink-0 text-red-400 dark:text-red-500 hover:text-red-600 dark:hover:text-red-300 transition-colors", children: _jsx(RefreshCw, { size: 12 }) })] })), _jsx("div", { ref: bottomRef })] }), _jsxs("div", { className: "shrink-0 px-4 pb-4", children: [!isAgentRunning && agent && (_jsxs("div", { className: "flex items-center gap-2 mb-2 px-3 py-2 rounded-lg bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20", children: [_jsx(AlertCircle, { size: 13, className: "text-amber-500 dark:text-amber-400 shrink-0" }), _jsxs("p", { className: "text-xs text-amber-700 dark:text-amber-400", children: ["Agent is ", agent.status, ". Start it from the", ' ', _jsx(Link, { to: `/agents/${id}`, className: "underline hover:text-amber-600 dark:hover:text-amber-300", children: "detail page" }), " to chat."] })] })), _jsxs("div", { className: "flex items-end gap-3 bg-white dark:bg-zinc-900 border border-gray-200 dark:border-white/[0.08] rounded-2xl px-4 py-3 focus-within:border-violet-400 dark:focus-within:border-violet-500/30 transition-colors", children: [_jsx("textarea", { ref: textareaRef, value: input, onChange: autoResize, onKeyDown: handleKeyDown, placeholder: isAgentRunning ? 'Message…' : 'Start the agent to chat', disabled: !isAgentRunning || sendMessage.isPending, rows: 1, className: "flex-1 bg-transparent text-sm text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-zinc-600 resize-none focus:outline-none leading-relaxed disabled:opacity-40", style: { maxHeight: '160px' } }), _jsx("button", { onClick: handleSend, disabled: !input.trim() || !isAgentRunning || sendMessage.isPending, className: "shrink-0 w-8 h-8 rounded-xl bg-violet-600 hover:bg-violet-500 disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center transition-colors", children: _jsx(Send, { size: 13, className: "text-white" }) })] }), _jsx("p", { className: "text-center text-xs text-gray-400 dark:text-zinc-700 mt-2", children: "Enter to send \u00B7 Shift+Enter for new line" })] })] }));
}
