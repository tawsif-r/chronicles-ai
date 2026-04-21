import { useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';
import { apiClient } from '../api/client';
export function useLiveLogs(agentId) {
    const [lines, setLines] = useState([]);
    const socketRef = useRef(null);
    useEffect(() => {
        if (!agentId)
            return;
        let cancelled = false;
        // Load history first, then connect WebSocket
        apiClient
            .get(`/agents/${agentId}/logs`, { params: { limit: 200 } })
            .then((res) => {
            if (!cancelled)
                setLines([...res.data].reverse());
        })
            .catch(() => { });
        const socket = io('/', { path: '/socket.io' });
        socketRef.current = socket;
        socket.on('connect', () => {
            socket.emit('subscribe-logs', { agentId });
        });
        socket.on('log-line', (line) => {
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
