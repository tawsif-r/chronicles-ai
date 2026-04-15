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
      setContent(content);
      setOriginal(content);
      setLoading(false);
    });
  }, [id]);

  async function handleSave() {
    setSaving(true);
    await agentsApi.setMemory(id!, content);
    setOriginal(content);
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  }

  const isDirty = content !== original;

  return (
    <div className="flex flex-col h-full bg-[#09090b]">
      {/* Header */}
      <div className="flex items-center justify-between px-6 h-14 border-b border-white/[0.06] shrink-0">
        <div className="flex items-center gap-3">
          <Link to={`/agents/${id}`} className="text-zinc-500 hover:text-zinc-300 transition-colors">
            <ChevronLeft size={18} />
          </Link>
          <Brain size={15} className="text-zinc-500" />
          <span className="text-sm font-medium text-zinc-300">MEMORY.md</span>
          <span className="text-xs text-zinc-600">· read/write directly from disk</span>
        </div>

        <button
          onClick={handleSave}
          disabled={!isDirty || saving}
          className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-all ${
            saved
              ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/20'
              : isDirty
              ? 'bg-violet-600 hover:bg-violet-500 text-white shadow-lg shadow-violet-900/30'
              : 'bg-white/[0.04] text-zinc-600 border border-white/[0.06] cursor-not-allowed'
          }`}
        >
          {saved
            ? <><Check size={12} /> Saved</>
            : saving
            ? <span className="w-3 h-3 border border-white/30 border-t-white rounded-full animate-spin" />
            : <><Save size={12} /> Save</>
          }
        </button>
      </div>

      {/* Editor */}
      {loading ? (
        <div className="flex-1 flex items-center justify-center">
          <span className="w-5 h-5 border-2 border-zinc-700 border-t-violet-500 rounded-full animate-spin" />
        </div>
      ) : (
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          spellCheck={false}
          className="flex-1 p-8 bg-transparent text-sm text-zinc-300 font-mono leading-relaxed resize-none focus:outline-none placeholder-zinc-700"
          placeholder="# Memory&#10;&#10;This agent has no memory yet. Start a conversation to build context."
        />
      )}
    </div>
  );
}
