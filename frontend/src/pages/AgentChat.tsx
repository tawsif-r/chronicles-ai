import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useChatHistory, useSendMessage } from '../hooks/useChat';

export default function AgentChat() {
  const { id } = useParams<{ id: string }>();
  const { data: history, isLoading } = useChatHistory(id!);
  const sendMessage = useSendMessage(id!);
  const [input, setInput] = useState('');

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim()) return;
    setInput('');
    await sendMessage.mutateAsync(input.trim());
  }

  if (isLoading) return <p>Loading...</p>;

  return (
    <div>
      <h1>Chat</h1>
      <div>
        {history?.map((msg) => (
          <div key={msg.id} style={{ textAlign: msg.role === 'user' ? 'right' : 'left' }}>
            <strong>{msg.role}:</strong> {msg.content}
          </div>
        ))}
        {sendMessage.isPending && <p>Thinking...</p>}
      </div>
      <form onSubmit={handleSend}>
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Type a message..."
          disabled={sendMessage.isPending}
        />
        <button type="submit" disabled={sendMessage.isPending}>
          Send
        </button>
      </form>
    </div>
  );
}
