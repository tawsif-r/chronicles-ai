import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCreateAgent } from '../hooks/useAgents';
import type { ModelProvider } from '@chronicles/shared';

export default function AgentNew() {
  const navigate = useNavigate();
  const createAgent = useCreateAgent();
  const [name, setName] = useState('');
  const [modelProvider, setModelProvider] = useState<ModelProvider>('claude');
  const [modelName, setModelName] = useState('claude-opus-4-6');
  const [soulMd, setSoulMd] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const agent = await createAgent.mutateAsync({ name, modelProvider, modelName, soulMd });
    navigate(`/agents/${agent.id}`);
  }

  return (
    <form onSubmit={handleSubmit}>
      <h1>New Agent</h1>
      <input
        placeholder="Agent name"
        value={name}
        onChange={(e) => setName(e.target.value)}
        required
      />
      <select
        value={modelProvider}
        onChange={(e) => setModelProvider(e.target.value as ModelProvider)}
      >
        <option value="claude">Claude (Anthropic)</option>
        <option value="openai">OpenAI</option>
        <option value="ollama">Ollama (local)</option>
      </select>
      <input
        placeholder="Model name (e.g. claude-opus-4-6)"
        value={modelName}
        onChange={(e) => setModelName(e.target.value)}
        required
      />
      <textarea
        placeholder="SOUL.md — agent identity and instructions"
        value={soulMd}
        onChange={(e) => setSoulMd(e.target.value)}
        rows={10}
      />
      <button type="submit" disabled={createAgent.isPending}>
        Create Agent
      </button>
    </form>
  );
}
