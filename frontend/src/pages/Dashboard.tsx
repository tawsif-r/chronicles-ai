import { Link } from 'react-router-dom';
import { useAgents } from '../hooks/useAgents';

export default function Dashboard() {
  const { data: agents, isLoading } = useAgents();

  if (isLoading) return <p>Loading...</p>;

  return (
    <div>
      <h1>Dashboard</h1>
      <Link to="/agents/new">New Agent</Link>
      {agents?.length === 0 && <p>No agents yet. Create your first one.</p>}
      <ul>
        {agents?.map((agent) => (
          <li key={agent.id}>
            <Link to={`/agents/${agent.id}`}>{agent.name}</Link>
            {' — '}
            {agent.status}
            {' '}
            <Link to={`/agents/${agent.id}/chat`}>Chat</Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
