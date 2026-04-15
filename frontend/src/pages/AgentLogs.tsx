import { useParams } from 'react-router-dom';
import { useLiveLogs } from '../hooks/useLiveLogs';

export default function AgentLogs() {
  const { id } = useParams<{ id: string }>();
  const lines = useLiveLogs(id!);

  return (
    <div>
      <h1>Logs</h1>
      <pre style={{ fontFamily: 'monospace', height: '80vh', overflowY: 'auto' }}>
        {lines.map((l, i) => (
          <div key={i}>
            [{l.timestamp}] [{l.level.toUpperCase()}] {l.message}
          </div>
        ))}
      </pre>
    </div>
  );
}
