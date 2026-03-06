/**
 * Spec10x — useWebSocket Hook
 *
 * Connects to the backend WebSocket endpoint for real-time
 * processing status updates during file upload/analysis.
 */

'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from './useAuth';

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

    const connect = useCallback(() => {
        if (!enabled || !token) return;

        try {
            const ws = new WebSocket(`${WS_BASE_URL}/ws/processing?token=${token}`);

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
                    connect();
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
        connect();
        return () => {
            if (reconnectTimer.current) clearTimeout(reconnectTimer.current);
            if (wsRef.current) wsRef.current.close();
        };
    }, [connect]);

    const clearMessages = useCallback(() => {
        setMessages([]);
        setLastMessage(null);
    }, []);

    return { isConnected, messages, lastMessage, clearMessages };
}
