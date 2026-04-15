import { useParams, Link } from 'react-router-dom';
import { useAgent, useStartAgent, useStopAgent, useUpdateAgent } from '../hooks/useAgents';

export default function AgentDetail() {
  const { id } = useParams<{ id: string }>();
  const { data: agent, isLoading } = useAgent(id!);
  const start = useStartAgent(id!);
  const stop = useStopAgent(id!);

  if (isLoading || !agent) return <p>Loading...</p>;

  return (
    <div>
      <h1>{agent.name}</h1>
      <p>Status: {agent.status}</p>
      <p>Model: {agent.modelProvider} / {agent.modelName}</p>

      {agent.status === 'stopped' || agent.status === 'error' ? (
        <button onClick={() => start.mutate()}>Start</button>
      ) : (
        <button onClick={() => stop.mutate()}>Stop</button>
      )}

      <Link to={`/agents/${id}/chat`}>Chat</Link>
      <Link to={`/agents/${id}/logs`}>Logs</Link>
      <Link to={`/agents/${id}/memory`}>Memory</Link>

      <h2>SOUL.md</h2>
      <pre>{agent.soulMd}</pre>
    </div>
  );
}
