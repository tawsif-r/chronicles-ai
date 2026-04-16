import { useEffect, useState } from 'react';
import { Key, Trash2, Plus, ShieldCheck } from 'lucide-react';
import { apiClient } from '../api/client';
import type { ApiKey } from '@chronicles/shared';

const providerInfo: Record<string, { label: string; hint: string }> = {
  anthropic: { label: 'Anthropic', hint: 'sk-ant-...' },
  openai:    { label: 'OpenAI',    hint: 'sk-...'     },
  ollama:    { label: 'Ollama',    hint: 'http://localhost:11434' },
  openrouter: { label: 'OpenRouter', hint: 'sk-or-v1-...' },
};

export default function Settings() {
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [provider, setProvider] = useState('anthropic');
  const [keyValue, setKeyValue] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => { apiClient.get<ApiKey[]>('/api-keys').then((r) => setKeys(r.data)); }, []);

  async function handleStore(e: React.FormEvent) {
    e.preventDefault(); setError(''); setSaving(true);
    try {
      await apiClient.post('/api-keys', { provider, key: keyValue });
      setKeyValue('');
      const r = await apiClient.get<ApiKey[]>('/api-keys');
      setKeys(r.data);
    } catch { setError('Failed to save key.'); }
    finally { setSaving(false); }
  }

  async function handleDelete(id: string) {
    await apiClient.delete(`/api-keys/${id}`);
    setKeys((prev) => prev.filter((k) => k.id !== id));
  }

  return (
    <div className="p-6 lg:p-8 max-w-2xl mx-auto">
      <h1 className="text-2xl font-semibold text-gray-900 dark:text-white tracking-tight mb-1">Settings</h1>
      <p className="text-sm text-gray-500 dark:text-zinc-500 mb-8">Manage your API keys and workspace configuration.</p>

      <section>
        <div className="flex items-center gap-2 mb-4">
          <ShieldCheck size={15} className="text-gray-400 dark:text-zinc-500" />
          <h2 className="text-sm font-semibold text-gray-700 dark:text-zinc-300 uppercase tracking-wider">API Keys</h2>
        </div>
        <p className="text-xs text-gray-400 dark:text-zinc-600 mb-4 leading-relaxed">
          Keys are encrypted with AES-256-GCM before storage and injected as environment variables when an agent starts.
        </p>

        {keys.length > 0 && (
          <div className="space-y-2 mb-6">
            {keys.map((k) => (
              <div key={k.id} className="flex items-center justify-between px-4 py-3 bg-white dark:bg-zinc-900 border border-gray-200 dark:border-white/[0.08] rounded-xl">
                <div className="flex items-center gap-3">
                  <div className="w-7 h-7 rounded-lg bg-gray-100 dark:bg-zinc-800 flex items-center justify-center">
                    <Key size={12} className="text-gray-500 dark:text-zinc-400" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-zinc-200">{providerInfo[k.provider]?.label ?? k.provider}</p>
                    <p className="text-xs text-gray-400 dark:text-zinc-600">Added {new Date(k.createdAt).toLocaleDateString()}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-300 dark:text-zinc-700 font-mono">••••••••</span>
                  <button onClick={() => handleDelete(k.id)} className="p-1.5 rounded-lg text-gray-400 dark:text-zinc-600 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/[0.08] transition-all">
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-white/[0.08] rounded-xl p-5">
          <p className="text-xs font-medium text-gray-600 dark:text-zinc-400 mb-4 flex items-center gap-1.5">
            <Plus size={12} /> Add API Key
          </p>
          <form onSubmit={handleStore} className="space-y-3">
            {error && (
              <div className="px-3 py-2 rounded-lg bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 text-xs text-red-600 dark:text-red-400">{error}</div>
            )}
            <div className="grid grid-cols-3 gap-2">
              {Object.entries(providerInfo).map(([p, { label }]) => (
                <button key={p} type="button" onClick={() => setProvider(p)} className={`py-2 rounded-lg text-xs font-medium border transition-all ${provider === p ? 'bg-violet-600/15 border-violet-500/30 text-violet-600 dark:text-violet-300' : 'bg-gray-50 dark:bg-zinc-950 border-gray-200 dark:border-white/[0.08] text-gray-500 dark:text-zinc-500 hover:text-gray-900 dark:hover:text-zinc-300 hover:border-gray-300 dark:hover:border-white/[0.15]'}`}>
                  {label}
                </button>
              ))}
            </div>
            <input
              type="password"
              value={keyValue}
              onChange={(e) => setKeyValue(e.target.value)}
              placeholder={providerInfo[provider]?.hint ?? 'API key'}
              required
              className="w-full px-3 py-2.5 bg-gray-50 dark:bg-zinc-950 border border-gray-200 dark:border-white/[0.08] rounded-lg text-sm text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-zinc-600 font-mono focus:outline-none focus:border-violet-400 dark:focus:border-violet-500/50 focus:ring-1 focus:ring-violet-400/20 dark:focus:ring-violet-500/20 transition-all"
            />
            <button type="submit" disabled={saving} className="w-full flex items-center justify-center gap-2 py-2.5 bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors">
              {saving ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : 'Save Key'}
            </button>
          </form>
        </div>
      </section>
    </div>
  );
}
