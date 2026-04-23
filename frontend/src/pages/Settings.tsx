import { useEffect, useState } from 'react';
import { Key, Trash2, Plus, ShieldCheck, Mail, CheckCircle2, XCircle, ChevronDown, ChevronRight, ClipboardCopy } from 'lucide-react';
import { apiClient } from '../api/client';
import type { ApiKey } from '@chronicles/shared';

const providerInfo: Record<string, { label: string; hint: string }> = {
  anthropic: { label: 'Anthropic', hint: 'sk-ant-...' },
  openai:    { label: 'OpenAI',    hint: 'sk-...'     },
  ollama:    { label: 'Ollama',    hint: 'http://localhost:11434' },
  openrouter: { label: 'OpenRouter', hint: 'sk-or-v1-...' },
};

type GmailStatus = { connected: boolean; email?: string };

const TOOL_JSON = JSON.stringify([{
  name: 'read_emails',
  description: 'Read recent emails from the connected Gmail account',
  input_schema: {
    type: 'object',
    properties: {
      maxResults: { type: 'number', description: 'Max emails to return (default 10, max 25)' },
      query: { type: 'string', description: "Gmail search query e.g. 'is:unread', 'from:boss@company.com'" },
    },
  },
}], null, 2);

export default function Settings() {
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [provider, setProvider] = useState('anthropic');
  const [keyValue, setKeyValue] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [gmailStatus, setGmailStatus] = useState<GmailStatus>({ connected: false });
  const [gmailLoading, setGmailLoading] = useState(false);
  const [showSetup, setShowSetup] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => { apiClient.get<ApiKey[]>('/api-keys').then((r) => setKeys(r.data)); }, []);

  useEffect(() => {
    apiClient.get<GmailStatus>('/gmail/status').then((r) => setGmailStatus(r.data)).catch(() => {});
    const params = new URLSearchParams(window.location.search);
    if (params.get('gmail') === 'connected') {
      apiClient.get<GmailStatus>('/gmail/status').then((r) => setGmailStatus(r.data)).catch(() => {});
      window.history.replaceState({}, '', '/settings');
    }
  }, []);

  async function handleConnectGmail() {
    setGmailLoading(true);
    const r = await apiClient.get<{ url: string }>('/gmail/auth');
    window.location.href = r.data.url;
  }

  async function handleDisconnectGmail() {
    setGmailLoading(true);
    try {
      await apiClient.delete('/gmail/disconnect');
      setGmailStatus({ connected: false });
    } finally { setGmailLoading(false); }
  }

  function copyToolJson() {
    navigator.clipboard.writeText(TOOL_JSON);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

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

      <section className="mb-10">
        <div className="flex items-center gap-2 mb-4">
          <Mail size={15} className="text-gray-400 dark:text-zinc-500" />
          <h2 className="text-sm font-semibold text-gray-700 dark:text-zinc-300 uppercase tracking-wider">Gmail Integration</h2>
        </div>
        <p className="text-xs text-gray-400 dark:text-zinc-600 mb-4 leading-relaxed">
          Connect Gmail so your agents can read and summarize emails using the <code className="font-mono text-violet-400">read_emails</code> tool.
        </p>
        <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-white/[0.08] rounded-xl p-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {gmailStatus.connected ? (
              <CheckCircle2 size={18} className="text-green-500" />
            ) : (
              <XCircle size={18} className="text-gray-400 dark:text-zinc-600" />
            )}
            <div>
              <p className="text-sm font-medium text-gray-900 dark:text-zinc-200">
                {gmailStatus.connected ? 'Connected' : 'Not connected'}
              </p>
              {gmailStatus.email && (
                <p className="text-xs text-gray-400 dark:text-zinc-500 font-mono">{gmailStatus.email}</p>
              )}
            </div>
          </div>
          {gmailStatus.connected ? (
            <button
              onClick={handleDisconnectGmail}
              disabled={gmailLoading}
              className="px-3 py-1.5 text-xs font-medium text-red-500 border border-red-200 dark:border-red-500/20 rounded-lg hover:bg-red-50 dark:hover:bg-red-500/10 transition-all disabled:opacity-50"
            >
              Disconnect
            </button>
          ) : (
            <button
              onClick={handleConnectGmail}
              disabled={gmailLoading}
              className="px-3 py-1.5 text-xs font-medium text-white bg-violet-600 hover:bg-violet-500 rounded-lg transition-colors disabled:opacity-50 flex items-center gap-1.5"
            >
              {gmailLoading && <span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
              Connect Gmail
            </button>
          )}
        </div>

        <button
          onClick={() => setShowSetup((v) => !v)}
          className="mt-3 flex items-center gap-1.5 text-xs text-gray-400 dark:text-zinc-500 hover:text-gray-600 dark:hover:text-zinc-300 transition-colors"
        >
          {showSetup ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
          {showSetup ? 'Hide' : 'Show'} setup instructions
        </button>

        {showSetup && (
          <div className="mt-3 bg-gray-50 dark:bg-zinc-950 border border-gray-200 dark:border-white/[0.06] rounded-xl p-5 space-y-5 text-xs text-gray-600 dark:text-zinc-400">
            <div>
              <p className="font-semibold text-gray-700 dark:text-zinc-300 mb-2">Before clicking "Connect Gmail" you need a Google Cloud project:</p>
              <ol className="space-y-1.5 list-decimal list-inside leading-relaxed">
                <li>Go to <span className="font-mono text-violet-400">console.cloud.google.com</span> → create a new project</li>
                <li>Search for <strong className="text-gray-700 dark:text-zinc-300">Gmail API</strong> → Enable it</li>
                <li>Go to <strong className="text-gray-700 dark:text-zinc-300">OAuth consent screen</strong> → External → fill in app name → add scope <span className="font-mono text-violet-400">.../auth/gmail.readonly</span></li>
                <li>Go to <strong className="text-gray-700 dark:text-zinc-300">Credentials</strong> → Create → OAuth 2.0 Client ID → Web application</li>
                <li>Add authorised redirect URI: <span className="font-mono text-violet-400">http://localhost:3000/api/gmail/callback</span></li>
                <li>Copy the <strong className="text-gray-700 dark:text-zinc-300">Client ID</strong> and <strong className="text-gray-700 dark:text-zinc-300">Client Secret</strong></li>
              </ol>
            </div>

            <div>
              <p className="font-semibold text-gray-700 dark:text-zinc-300 mb-2">Add to <span className="font-mono">backend/.env</span>:</p>
              <pre className="bg-zinc-900 dark:bg-black text-zinc-300 rounded-lg p-3 text-[11px] leading-relaxed overflow-x-auto">{`GOOGLE_CLIENT_ID=your-client-id-here
GOOGLE_CLIENT_SECRET=your-secret-here
GOOGLE_REDIRECT_URI=http://localhost:3000/api/gmail/callback`}</pre>
            </div>

            <div>
              <p className="font-semibold text-gray-700 dark:text-zinc-300 mb-1">Restart the backend, then click "Connect Gmail" above.</p>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <p className="font-semibold text-gray-700 dark:text-zinc-300">Add this to your agent's <span className="font-mono">Tools (JSON)</span> field:</p>
                <button
                  onClick={copyToolJson}
                  className="flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] text-gray-500 dark:text-zinc-500 hover:text-gray-700 dark:hover:text-zinc-300 border border-gray-200 dark:border-white/[0.08] hover:border-gray-300 dark:hover:border-white/[0.15] transition-all"
                >
                  <ClipboardCopy size={11} />
                  {copied ? 'Copied!' : 'Copy'}
                </button>
              </div>
              <pre className="bg-zinc-900 dark:bg-black text-violet-300 rounded-lg p-3 text-[11px] leading-relaxed overflow-x-auto">{TOOL_JSON}</pre>
              <p className="mt-2 text-gray-400 dark:text-zinc-600 leading-relaxed">
                Tip: add this to your agent's system prompt to get essential/non-essential grouping: <em className="text-zinc-500">"When asked about emails, use read_emails, then group results into Essential (action required, deadlines) and Non-essential (newsletters, FYIs)."</em>
              </p>
            </div>
          </div>
        )}
      </section>

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
