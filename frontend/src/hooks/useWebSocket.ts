/**
 * Spec10x — useWebSocket Hook
 *
 * Connects to the backend WebSocket endpoint for real-time
 * processing status updates during file upload/analysis.
 */

'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from './useAuth';
import { api } from '@/lib/api';

export interface ProcessingUpdate {
    interview_id: string;
    status: 'queued' | 'transcribing' | 'analyzing' | 'done' | 'error';
    message?: string;
    progress?: number;
}

interface UseWebSocketReturn {
    isConnected: boolean;
    messages: ProcessingUpdate[];
    lastMessage: ProcessingUpdate | null;
    clearMessages: () => void;
}

const WS_BASE_URL = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000')
    .replace('http://', 'ws://')
    .replace('https://', 'wss://');

export function useWebSocket(enabled = true): UseWebSocketReturn {
    const { token } = useAuth();
    const [isConnected, setIsConnected] = useState(false);
    const [messages, setMessages] = useState<ProcessingUpdate[]>([]);
    const [lastMessage, setLastMessage] = useState<ProcessingUpdate | null>(null);
    const wsRef = useRef<WebSocket | null>(null);
    const reconnectTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
    // Reconnects go through a ref so the onclose closure always calls the
    // latest connect (with current token/enabled) instead of a stale one.
    const connectRef = useRef<(() => Promise<void>) | null>(null);
    // Bumped on every cleanup so an in-flight connect can tell it is stale.
    const generationRef = useRef(0);

    const connect = useCallback(async () => {
        if (!enabled || !token) return;

        // The session token in state can be older than an hour; reconnects
        // must authenticate with a current one.
        const generation = generationRef.current;
        const authToken = await api.resolveToken(token);
        // The effect was cleaned up while we awaited: do not open a socket.
        if (!authToken || generation !== generationRef.current) return;

        try {
            const ws = new WebSocket(
                `${WS_BASE_URL}/ws/processing?token=${encodeURIComponent(authToken)}`
            );

            ws.onopen = () => {
                setIsConnected(true);
            };

            ws.onmessage = (event) => {
                try {
                    const data: ProcessingUpdate = JSON.parse(event.data);
                    setMessages((prev) => [...prev, data]);
                    setLastMessage(data);
                } catch {
                    // Ignore non-JSON messages
                }
            };

            ws.onclose = () => {
                setIsConnected(false);
                // Auto-reconnect after 3 seconds
                reconnectTimer.current = setTimeout(() => {
                    void connectRef.current?.();
                }, 3000);
            };

            ws.onerror = () => {
                ws.close();
            };

            wsRef.current = ws;
        } catch {
            // WebSocket connection failed
        }
    }, [enabled, token]);

    useEffect(() => {
        connectRef.current = connect;
        void connect();
        return () => {
            generationRef.current += 1;
            if (reconnectTimer.current) clearTimeout(reconnectTimer.current);
            const ws = wsRef.current;
            wsRef.current = null;
            if (ws) {
                // Intentional close (unmount, token refresh, disable): detach
                // the handlers first, or onclose would schedule a reconnect
                // that leaks a socket after cleanup has already run.
                ws.onclose = null;
                ws.onerror = null;
                ws.onmessage = null;
                ws.close();
            }
            setIsConnected(false);
        };
    }, [connect]);

    const clearMessages = useCallback(() => {
        setMessages([]);
        setLastMessage(null);
    }, []);

    return { isConnected, messages, lastMessage, clearMessages };
}
