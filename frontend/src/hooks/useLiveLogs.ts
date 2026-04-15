import { useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import type { LogLine } from '@chronicles/shared';

export function useLiveLogs(agentId: string) {
  const [lines, setLines] = useState<LogLine[]>([]);
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    if (!agentId) return;

    const socket = io('/', { path: '/socket.io' });
    socketRef.current = socket;

    socket.on('connect', () => {
      socket.emit('subscribe-logs', { agentId });
    });

    socket.on('log-line', (line: LogLine) => {
      setLines((prev) => [...prev, line]);
    });

    return () => {
      socket.emit('unsubscribe-logs', { agentId });
      socket.disconnect();
    };
  }, [agentId]);

  return lines;
}
