import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ChevronLeft, Brain, Save, Check } from 'lucide-react';
import { agentsApi } from '../api/agents';

export default function AgentMemory() {
  const { id } = useParams<{ id: string }>();
  const [content, setContent] = useState('');
  const [original, setOriginal] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    agentsApi.getMemory(id!).then(({ content }) => {
      setContent(content); setOriginal(content); setLoading(false);
    });
  }, [id]);

  async function handleSave() {
    setSaving(true);
    await agentsApi.setMemory(id!, content);
    setOriginal(content); setSaving(false); setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  }

  const isDirty = content !== original;

  return (
    <div className="flex flex-col h-full bg-gray-50 dark:bg-zinc-950">
      <div className="flex items-center justify-between px-4 lg:px-6 h-14 border-b border-gray-200 dark:border-white/[0.06] shrink-0 bg-white dark:bg-zinc-950">
        <div className="flex items-center gap-3">
          <Link to={`/agents/${id}`} className="text-gray-400 dark:text-zinc-500 hover:text-gray-700 dark:hover:text-zinc-300 transition-colors">
            <ChevronLeft size={18} />
          </Link>
          <Brain size={15} className="text-gray-400 dark:text-zinc-500" />
          <span className="text-sm font-medium text-gray-900 dark:text-zinc-300">MEMORY.md</span>
          <span className="text-xs text-gray-400 dark:text-zinc-600 hidden sm:inline">· read/write directly from disk</span>
        </div>
        <button
          onClick={handleSave}
          disabled={!isDirty || saving}
          className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-all ${
            saved ? 'bg-emerald-50 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20'
            : isDirty ? 'bg-violet-600 hover:bg-violet-500 text-white shadow-lg shadow-violet-900/30'
            : 'bg-gray-100 dark:bg-white/[0.04] text-gray-400 dark:text-zinc-600 border border-gray-200 dark:border-white/[0.06] cursor-not-allowed'
          }`}
        >
          {saved ? <><Check size={12} /> Saved</>
           : saving ? <span className="w-3 h-3 border border-white/30 border-t-white rounded-full animate-spin" />
           : <><Save size={12} /> Save</>}
        </button>
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
              label === 'Memory'
                ? 'bg-violet-600/10 text-violet-600 dark:text-violet-400'
                : 'text-gray-500 dark:text-zinc-500 hover:text-gray-800 dark:hover:text-zinc-300'
            }`}
          >
            {label}
          </Link>
        ))}
      </div>

      {loading ? (
        <div className="flex-1 flex items-center justify-center">
          <span className="w-5 h-5 border-2 border-gray-300 dark:border-zinc-700 border-t-violet-500 rounded-full animate-spin" />
        </div>
      ) : (
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          spellCheck={false}
          className="flex-1 p-6 lg:p-8 bg-transparent text-sm text-gray-800 dark:text-zinc-300 font-mono leading-relaxed resize-none focus:outline-none placeholder-gray-300 dark:placeholder-zinc-700"
          placeholder={'# Memory\n\nThis agent has no memory yet.'}
        />
      )}
    </div>
  );
}
