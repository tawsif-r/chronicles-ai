import { useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import type { LogLine } from '@chronicles/shared';
import { apiClient } from '../api/client';

export function useLiveLogs(agentId: string) {
  const [lines, setLines] = useState<LogLine[]>([]);
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    if (!agentId) return;

    let cancelled = false;

    // Load history first, then connect WebSocket
    apiClient
      .get<LogLine[]>(`/agents/${agentId}/logs`, { params: { limit: 200 } })
      .then((res) => {
        if (!cancelled) setLines([...res.data].reverse());
      })
      .catch(() => { /* history unavailable — live logs still work */ });

    const socket = io('/', { path: '/socket.io' });
    socketRef.current = socket;

    socket.on('connect', () => {
      socket.emit('subscribe-logs', { agentId });
    });

    socket.on('log-line', (line: LogLine) => {
      setLines((prev) => [...prev, line]);
    });

    return () => {
      cancelled = true;
      socket.emit('unsubscribe-logs', { agentId });
      socket.disconnect();
    };
  }, [agentId]);

  return lines;
}
