import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { agentsApi } from '../api/agents';

export default function AgentMemory() {
  const { id } = useParams<{ id: string }>();
  const [content, setContent] = useState('');
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    agentsApi.getMemory(id!).then(({ content }) => setContent(content));
  }, [id]);

  async function handleSave() {
    await agentsApi.setMemory(id!, content);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  return (
    <div>
      <h1>MEMORY.md</h1>
      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        rows={30}
        style={{ width: '100%', fontFamily: 'monospace' }}
      />
      <button onClick={handleSave}>Save</button>
      {saved && <span>Saved!</span>}
    </div>
  );
}
