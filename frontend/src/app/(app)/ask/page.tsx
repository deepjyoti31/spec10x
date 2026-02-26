'use client';

import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import styles from './ask.module.css';
import { useAuth } from '@/hooks/useAuth';
import { useAsk } from '@/hooks/useAsk';
import type { ChatMessage } from '@/hooks/useAsk';
import type { AskCitation } from '@/lib/api';

const STARTER_QUESTIONS = [
    'What are the top pain points?',
    'What do users love about the product?',
    'What features are most requested?',
    "What's the overall sentiment?",
];

export default function AskPage() {
    const { token } = useAuth();
    const { messages, loading, error, sendQuestion, startNewChat } = useAsk(token);
    const [input, setInput] = useState('');
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLTextAreaElement>(null);

    // Auto-scroll to bottom when new messages arrive
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, loading]);

    // Auto-focus input
    useEffect(() => {
        inputRef.current?.focus();
    }, []);

    const handleSend = () => {
        if (!input.trim() || loading) return;
        sendQuestion(input.trim());
        setInput('');
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    const handleStarterClick = (question: string) => {
        sendQuestion(question);
    };

    const handleFollowUp = (question: string) => {
        sendQuestion(question);
    };

    // Get last assistant message for follow-ups
    const lastAssistantMsg = [...messages].reverse().find((m) => m.role === 'assistant');

    return (
        <div className={styles.container}>
            {/* Chat header */}
            <div className={styles.chatHeader}>
                <div className={styles.chatHeaderLeft}>
                    <h1>Ask Your Interviews ✨</h1>
                    <p>Answers are grounded in your interview data</p>
                </div>
                <button className={styles.newChatBtn} onClick={startNewChat}>
                    + New Chat
                </button>
            </div>

            {/* Messages area */}
            {messages.length === 0 && !loading ? (
                <div className={styles.emptyState}>
                    <div className={styles.emptyIcon}>✨</div>
                    <h2>Ask anything about your interviews</h2>
                    <p>
                        Get AI-powered answers grounded in your actual customer data. Every
                        answer includes citations.
                    </p>
                    <div className={styles.starterGrid}>
                        {STARTER_QUESTIONS.map((q) => (
                            <button
                                key={q}
                                className={styles.starterCard}
                                onClick={() => handleStarterClick(q)}
                            >
                                {q}
                            </button>
                        ))}
                    </div>
                </div>
            ) : (
                <div className={styles.messagesArea}>
                    {messages.map((msg) => (
                        <MessageBubble
                            key={msg.id}
                            message={msg}
                            onFollowUp={handleFollowUp}
                            isLast={msg === lastAssistantMsg}
                        />
                    ))}

                    {loading && (
                        <div className={styles.loadingDots}>
                            <div className={styles.loadingBubble}>Thinking…</div>
                        </div>
                    )}

                    {error && <div className={styles.errorMsg}>{error}</div>}

                    <div ref={messagesEndRef} />
                </div>
            )}

            {/* Input bar */}
            <div className={styles.inputBar}>
                <div className={styles.inputWrapper}>
                    <textarea
                        ref={inputRef}
                        className={styles.chatInput}
                        placeholder="Ask a question about your interviews…"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={handleKeyDown}
                        rows={1}
                    />
                    <button
                        className={styles.sendBtn}
                        onClick={handleSend}
                        disabled={!input.trim() || loading}
                    >
                        ↑
                    </button>
                </div>
                <div className={styles.disclaimer}>
                    Responses are grounded in your interview data. Citations link to source
                    material.
                </div>
            </div>
        </div>
    );
}

// --- Message bubble component ---

function MessageBubble({
    message,
    onFollowUp,
    isLast,
}: {
    message: ChatMessage;
    onFollowUp: (q: string) => void;
    isLast: boolean;
}) {
    if (message.role === 'user') {
        return (
            <div className={styles.userMessage}>
                <div className={styles.userBubble}>{message.content}</div>
            </div>
        );
    }

    return (
        <div className={styles.aiMessage}>
            <div className={styles.aiCard}>
                {/* Render content with basic markdown-like formatting */}
                <div
                    dangerouslySetInnerHTML={{
                        __html: formatAnswer(message.content),
                    }}
                />

                {/* Citations */}
                {message.citations && message.citations.length > 0 && (
                    <>
                        <div className={styles.citations}>
                            {message.citations.map((citation, idx) => (
                                <Link
                                    key={idx}
                                    href={`/interview/${citation.interview_id}`}
                                    className={styles.citationBadge}
                                >
                                    {citation.filename}
                                </Link>
                            ))}
                        </div>
                        <div className={styles.sourceFooter}>
                            📎 Sources: {message.citations.length} interview
                            {message.citations.length !== 1 ? 's' : ''}
                        </div>
                    </>
                )}

                {/* Follow-up suggestions (only on last message) */}
                {isLast && message.suggested_followups && message.suggested_followups.length > 0 && (
                    <div className={styles.followUps}>
                        {message.suggested_followups.map((q, idx) => (
                            <button
                                key={idx}
                                className={styles.followUpPill}
                                onClick={() => onFollowUp(q)}
                            >
                                {q}
                            </button>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}

// Simple markdown-like formatter for AI responses
function formatAnswer(text: string): string {
    return text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/\n\n/g, '</p><p>')
        .replace(/\n- /g, '</p><ul><li>')
        .replace(/\n/g, '<br/>')
        .replace(/<\/p><ul>/g, '</p><ul>')
        .replace(/<li>(.*?)(?=<li>|<\/p>|$)/g, '<li>$1</li>')
        .replace(/<ul>([\s\S]*?)<\/p>/g, '<ul>$1</ul>')
        .replace(/^/, '<p>')
        .replace(/$/, '</p>');
}
