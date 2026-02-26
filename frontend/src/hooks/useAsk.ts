'use client';

import { useState, useCallback } from 'react';
import { api } from '@/lib/api';
import type { AskResponse, AskCitation } from '@/lib/api';

export interface ChatMessage {
    id: string;
    role: 'user' | 'assistant';
    content: string;
    citations?: AskCitation[];
    suggested_followups?: string[];
}

export function useAsk(token: string | null) {
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [loading, setLoading] = useState(false);
    const [conversationId, setConversationId] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    const sendQuestion = useCallback(
        async (question: string) => {
            if (!token || !question.trim()) return;

            // Add user message
            const userMsg: ChatMessage = {
                id: `user-${Date.now()}`,
                role: 'user',
                content: question,
            };
            setMessages((prev) => [...prev, userMsg]);
            setLoading(true);
            setError(null);

            try {
                const response: AskResponse = await api.askQuestion(
                    token,
                    question,
                    conversationId || undefined
                );

                // Set conversation ID for follow-ups
                if (response.conversation_id) {
                    setConversationId(response.conversation_id);
                }

                // Add assistant message
                const assistantMsg: ChatMessage = {
                    id: response.message_id || `assistant-${Date.now()}`,
                    role: 'assistant',
                    content: response.answer,
                    citations: response.citations,
                    suggested_followups: response.suggested_followups,
                };
                setMessages((prev) => [...prev, assistantMsg]);
            } catch (err) {
                setError(err instanceof Error ? err.message : 'Failed to get a response');
            } finally {
                setLoading(false);
            }
        },
        [token, conversationId]
    );

    const startNewChat = useCallback(() => {
        setMessages([]);
        setConversationId(null);
        setError(null);
    }, []);

    return {
        messages,
        loading,
        error,
        conversationId,
        sendQuestion,
        startNewChat,
    };
}
