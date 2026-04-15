import { useRef, useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ChevronLeft, Send, Bot, User, AlertCircle } from 'lucide-react';
import { useAgent } from '../hooks/useAgents';
import { useChatHistory, useSendMessage } from '../hooks/useChat';
import StatusBadge from '../components/StatusBadge';

export default function AgentChat() {
  const { id } = useParams<{ id: string }>();
  const { data: agent } = useAgent(id!);
  const { data: history, isLoading } = useChatHistory(id!);
  const sendMessage = useSendMessage(id!);
  const [input, setInput] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [history, sendMessage.isPending]);

  async function handleSend() {
    const msg = input.trim();
    if (!msg || sendMessage.isPending) return;
    setInput('');
    if (textareaRef.current) textareaRef.current.style.height = 'auto';
    await sendMessage.mutateAsync(msg);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  function autoResize(e: React.ChangeEvent<HTMLTextAreaElement>) {
    setInput(e.target.value);
    e.target.style.height = 'auto';
    e.target.style.height = Math.min(e.target.scrollHeight, 160) + 'px';
  }

  const isAgentRunning = agent?.status === 'running';

  return (
    <div className="flex flex-col h-full bg-[#09090b]">
      {/* Header */}
      <div className="flex items-center gap-3 px-6 h-14 border-b border-white/[0.06] shrink-0">
        <Link to={`/agents/${id}`} className="text-zinc-500 hover:text-zinc-300 transition-colors">
          <ChevronLeft size={18} />
        </Link>
        <div className="flex items-center gap-2.5 flex-1 min-w-0">
          <div className="w-7 h-7 rounded-full bg-violet-600/20 border border-violet-500/30 flex items-center justify-center shrink-0">
            <Bot size={13} className="text-violet-400" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium text-white truncate">{agent?.name ?? '…'}</p>
          </div>
        </div>
        {agent && <StatusBadge status={agent.status} />}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-6 space-y-6">
        {isLoading && (
          <div className="flex justify-center">
            <span className="w-5 h-5 border-2 border-zinc-700 border-t-violet-500 rounded-full animate-spin" />
          </div>
        )}

        {!isLoading && history?.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full py-16 text-center">
            <div className="w-12 h-12 rounded-full bg-violet-600/10 border border-violet-500/20 flex items-center justify-center mb-4">
              <Bot size={20} className="text-violet-400" />
            </div>
            <p className="text-sm font-medium text-zinc-400">{agent?.name} is ready</p>
            <p className="text-xs text-zinc-600 mt-1">Send a message to start the conversation</p>
          </div>
        )}

        {history?.map((msg) => (
          <div
            key={msg.id}
            className={`flex items-start gap-3 max-w-3xl ${
              msg.role === 'user' ? 'ml-auto flex-row-reverse' : 'mr-auto'
            }`}
          >
            {/* Avatar */}
            <div className={`w-7 h-7 rounded-full shrink-0 flex items-center justify-center ${
              msg.role === 'user'
                ? 'bg-zinc-800 border border-white/[0.08]'
                : 'bg-violet-600/20 border border-violet-500/30'
            }`}>
              {msg.role === 'user'
                ? <User size={13} className="text-zinc-400" />
                : <Bot size={13} className="text-violet-400" />
              }
            </div>

            {/* Bubble */}
            <div className={`px-4 py-3 rounded-2xl text-sm leading-relaxed max-w-[calc(100%-3rem)] ${
              msg.role === 'user'
                ? 'bg-violet-600 text-white rounded-tr-sm'
                : 'bg-zinc-900 border border-white/[0.08] text-zinc-200 rounded-tl-sm'
            }`}>
              <p className="whitespace-pre-wrap break-words">{msg.content}</p>
            </div>
          </div>
        ))}

        {sendMessage.isPending && (
          <div className="flex items-start gap-3 max-w-3xl mr-auto">
            <div className="w-7 h-7 rounded-full bg-violet-600/20 border border-violet-500/30 flex items-center justify-center shrink-0">
              <Bot size={13} className="text-violet-400" />
            </div>
            <div className="px-4 py-3.5 rounded-2xl rounded-tl-sm bg-zinc-900 border border-white/[0.08]">
              <span className="flex gap-1">
                {[0, 1, 2].map((i) => (
                  <span
                    key={i}
                    className="w-1.5 h-1.5 bg-zinc-500 rounded-full animate-bounce"
                    style={{ animationDelay: `${i * 0.15}s` }}
                  />
                ))}
              </span>
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="shrink-0 px-4 pb-4">
        {!isAgentRunning && agent && (
          <div className="flex items-center gap-2 mb-2 px-3 py-2 rounded-lg bg-amber-500/10 border border-amber-500/20">
            <AlertCircle size={13} className="text-amber-400 shrink-0" />
            <p className="text-xs text-amber-400">
              Agent is {agent.status}. Start it from the{' '}
              <Link to={`/agents/${id}`} className="underline hover:text-amber-300">detail page</Link>{' '}
              to chat.
            </p>
          </div>
        )}
        <div className="flex items-end gap-3 bg-zinc-900 border border-white/[0.08] rounded-2xl px-4 py-3 focus-within:border-violet-500/30 transition-colors">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={autoResize}
            onKeyDown={handleKeyDown}
            placeholder={isAgentRunning ? 'Message…' : 'Start the agent to chat'}
            disabled={!isAgentRunning || sendMessage.isPending}
            rows={1}
            className="flex-1 bg-transparent text-sm text-white placeholder-zinc-600 resize-none focus:outline-none leading-relaxed disabled:opacity-40"
            style={{ maxHeight: '160px' }}
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || !isAgentRunning || sendMessage.isPending}
            className="shrink-0 w-8 h-8 rounded-xl bg-violet-600 hover:bg-violet-500 disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center transition-colors"
          >
            <Send size={13} className="text-white" />
          </button>
        </div>
        <p className="text-center text-xs text-zinc-700 mt-2">
          Enter to send · Shift+Enter for new line
        </p>
      </div>
    </div>
  );
}
