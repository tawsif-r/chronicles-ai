import { useEffect, useState } from 'react';
import { apiClient } from '../api/client';
import type { ApiKey } from '@chronicles/shared';

export default function Settings() {
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [provider, setProvider] = useState('anthropic');
  const [key, setKey] = useState('');

  useEffect(() => {
    apiClient.get<ApiKey[]>('/api-keys').then((r) => setKeys(r.data));
  }, []);

  async function handleStore(e: React.FormEvent) {
    e.preventDefault();
    await apiClient.post('/api-keys', { provider, key });
    setKey('');
    const r = await apiClient.get<ApiKey[]>('/api-keys');
    setKeys(r.data);
  }

  async function handleDelete(id: string) {
    await apiClient.delete(`/api-keys/${id}`);
    setKeys((prev) => prev.filter((k) => k.id !== id));
  }

  return (
    <div>
      <h1>Settings</h1>
      <h2>API Keys</h2>
      <ul>
        {keys.map((k) => (
          <li key={k.id}>
            {k.provider} (added {new Date(k.createdAt).toLocaleDateString()})
            {' '}
            <button onClick={() => handleDelete(k.id)}>Remove</button>
          </li>
        ))}
      </ul>
      <form onSubmit={handleStore}>
        <select value={provider} onChange={(e) => setProvider(e.target.value)}>
          <option value="anthropic">Anthropic</option>
          <option value="openai">OpenAI</option>
          <option value="ollama">Ollama</option>
        </select>
        <input
          type="password"
          placeholder="API key"
          value={key}
          onChange={(e) => setKey(e.target.value)}
          required
        />
        <button type="submit">Save Key</button>
      </form>
    </div>
  );
}
