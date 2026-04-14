'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { useSearchParams } from 'next/navigation';

import { useAuth } from '@/hooks/useAuth';
import { useAsk, ChatMessage } from '@/hooks/useAsk';
import { api, AskCitation, AskConversation } from '@/lib/api';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const AVATAR_PALETTE = [
    { bg: '#354873', color: '#a4b8e9' },
    { bg: '#d87802', color: '#432100' },
    { bg: '#282a30', color: '#c2c6d6' },
    { bg: '#1a3d2b', color: '#34d399' },
];

function citationToQuote(citation: AskCitation, index: number) {
    const { bg, color } = AVATAR_PALETTE[index % AVATAR_PALETTE.length];
    const baseName = citation.filename.replace(/\.[^/.]+$/, '');
    const initials = baseName.slice(0, 2).toUpperCase();
    return {
        initials,
        avatarBg: bg,
        avatarColor: color,
        name: citation.filename,
        match: index === 0 ? 'Top match' : 'Evidence',
        matchHighlight: index === 0,
        quote: citation.quote,
    };
}

function groupConversations(convs: AskConversation[]) {
    const now = new Date();
    const today: AskConversation[] = [];
    const yesterday: AskConversation[] = [];
    const older: AskConversation[] = [];
    for (const c of convs) {
        const d = new Date(c.created_at);
        const diffDays = Math.floor((now.getTime() - d.getTime()) / 86_400_000);
        if (diffDays === 0) today.push(c);
        else if (diffDays === 1) yesterday.push(c);
        else older.push(c);
    }
    return { today, yesterday, older };
}

// ---------------------------------------------------------------------------
// History sidebar
// ---------------------------------------------------------------------------

interface HistoryPanelProps {
    today: AskConversation[];
    yesterday: AskConversation[];
    older: AskConversation[];
    activeId: string | null;
    loading: boolean;
    onNewChat: () => void;
    onSelect: (id: string) => void;
}

function HistoryPanel({ today, yesterday, older, activeId, loading, onNewChat, onSelect }: HistoryPanelProps) {
    const [search, setSearch] = React.useState('');

    const filter = (convs: AskConversation[]) =>
        search.trim()
            ? convs.filter(c => (c.title || '').toLowerCase().includes(search.toLowerCase()))
            : convs;

    const filteredToday = filter(today);
    const filteredYesterday = filter(yesterday);
    const filteredOlder = filter(older);
    const hasAny = filteredToday.length > 0 || filteredYesterday.length > 0 || filteredOlder.length > 0;

    return (
        <section
            className="flex flex-col h-full border-r flex-shrink-0"
            style={{ width: 260, backgroundColor: '#0C0D12', borderColor: 'rgba(66,71,83,0.05)' }}
        >
            {/* New chat button */}
            <div className="p-4 pb-2">
                <button
                    onClick={onNewChat}
                    className="w-full py-2.5 px-4 rounded-xl text-sm flex items-center justify-center gap-2 transition-all"
                    style={{ border: '1px dashed rgba(66,71,83,0.3)', color: '#c2c6d6' }}
                    onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#191b22')}
                    onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}
                >
                    <span className="material-symbols-outlined" style={{ fontSize: 16 }}>add</span>
                    New Chat
                </button>
            </div>

            {/* Search input */}
            <div className="px-4 pb-3">
                <div
                    className="flex items-center gap-2 rounded-lg px-3 py-1.5"
                    style={{ backgroundColor: '#191b22', border: '1px solid rgba(66,71,83,0.1)' }}
                >
                    <span className="material-symbols-outlined flex-shrink-0" style={{ fontSize: 15, color: '#5A5C66' }}>search</span>
                    <input
                        type="text"
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        placeholder="Search conversations…"
                        className="bg-transparent border-none outline-none text-[12px] flex-1"
                        style={{ color: '#c2c6d6' }}
                    />
                    {search && (
                        <button onClick={() => setSearch('')} style={{ color: '#5A5C66' }}>
                            <span className="material-symbols-outlined" style={{ fontSize: 14 }}>close</span>
                        </button>
                    )}
                </div>
            </div>

            {/* Chat history list */}
            <div className="flex-1 overflow-y-auto px-2 pb-6">
                {loading ? (
                    <div className="mt-4 px-1 space-y-1">
                        {[0, 1, 2].map(i => (
                            <div key={i} className="h-9 rounded-lg animate-pulse" style={{ backgroundColor: '#191b22' }} />
                        ))}
                    </div>
                ) : (
                    <>
                        {/* Today */}
                        {filteredToday.length > 0 && (
                            <>
                                <div className="mt-3 px-3 mb-2">
                                    <h3 className="text-[10px] uppercase tracking-widest font-bold" style={{ color: '#8c909f' }}>
                                        Today
                                    </h3>
                                </div>
                                <div className="space-y-0.5">
                                    {filteredToday.map(chat => (
                                        <ConvButton key={chat.id} chat={chat} activeId={activeId} icon="chat_bubble" onSelect={onSelect} />
                                    ))}
                                </div>
                            </>
                        )}

                        {/* Yesterday */}
                        {filteredYesterday.length > 0 && (
                            <>
                                <div className="mt-6 px-3 mb-2">
                                    <h3 className="text-[10px] uppercase tracking-widest font-bold" style={{ color: '#8c909f' }}>
                                        Yesterday
                                    </h3>
                                </div>
                                <div className="space-y-0.5">
                                    {filteredYesterday.map(chat => (
                                        <ConvButton key={chat.id} chat={chat} activeId={activeId} icon="chat_bubble" onSelect={onSelect} />
                                    ))}
                                </div>
                            </>
                        )}

                        {/* Older */}
                        {filteredOlder.length > 0 && (
                            <>
                                <div className="mt-6 px-3 mb-2">
                                    <h3 className="text-[10px] uppercase tracking-widest font-bold" style={{ color: '#8c909f' }}>
                                        Older
                                    </h3>
                                </div>
                                <div className="space-y-0.5">
                                    {filteredOlder.map(chat => (
                                        <ConvButton key={chat.id} chat={chat} activeId={activeId} icon="history" onSelect={onSelect} />
                                    ))}
                                </div>
                            </>
                        )}

                        {/* Empty state */}
                        {!hasAny && (
                            <p className="mt-8 px-3 text-xs" style={{ color: '#5A5C66' }}>
                                {search ? 'No conversations match your search.' : 'No conversations yet. Start a new chat above.'}
                            </p>
                        )}
                    </>
                )}
            </div>
        </section>
    );
}

function ConvButton({
    chat,
    activeId,
    icon,
    onSelect,
}: {
    chat: AskConversation;
    activeId: string | null;
    icon: string;
    onSelect: (id: string) => void;
}) {
    const isActive = chat.id === activeId;
    return (
        <button
            onClick={() => onSelect(chat.id)}
            className="w-full text-left px-3 py-2.5 rounded-lg text-[13px] flex items-center gap-3 transition-colors"
            style={{
                backgroundColor: isActive ? 'rgba(175,198,255,0.08)' : 'transparent',
                color: isActive ? '#F0F0F3' : '#c2c6d6',
                fontWeight: isActive ? 500 : 400,
            }}
            onMouseEnter={e => { if (!isActive) (e.currentTarget as HTMLElement).style.backgroundColor = '#191b22'; }}
            onMouseLeave={e => { if (!isActive) (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent'; }}
        >
            <span
                className="material-symbols-outlined flex-shrink-0"
                style={{ fontSize: 18, color: isActive ? '#afc6ff' : 'rgba(194,198,214,0.4)' }}
            >
                {icon}
            </span>
            <span className="truncate">{chat.title || 'Untitled'}</span>
        </button>
    );
}

// ---------------------------------------------------------------------------
// Message: user bubble
// ---------------------------------------------------------------------------

function UserMessage({ text }: { text: string }) {
    return (
        <div className="flex flex-col items-end gap-2">
            <div
                className="px-5 py-3.5 rounded-2xl rounded-tr-none text-sm max-w-[85%]"
                style={{ backgroundColor: '#161820', color: '#e2e2eb', border: '1px solid rgba(66,71,83,0.1)' }}
            >
                {text}
            </div>
        </div>
    );
}

// ---------------------------------------------------------------------------
// Message: AI response header
// ---------------------------------------------------------------------------

function AILabel() {
    return (
        <div className="flex items-center gap-2 font-semibold text-[13px]" style={{ color: '#afc6ff' }}>
            <span className="material-symbols-outlined" style={{ fontSize: 18, fontVariationSettings: "'FILL' 1" }}>
                auto_awesome
            </span>
            Spec10x AI
        </div>
    );
}

// ---------------------------------------------------------------------------
// Typing indicator
// ---------------------------------------------------------------------------

function TypingIndicator() {
    return (
        <div className="flex flex-col gap-4">
            <AILabel />
            <div className="flex items-center gap-1.5">
                {[0, 150, 300].map(delay => (
                    <span
                        key={delay}
                        className="w-1.5 h-1.5 rounded-full animate-bounce"
                        style={{ backgroundColor: '#afc6ff', opacity: 0.6, animationDelay: `${delay}ms` }}
                    />
                ))}
            </div>
        </div>
    );
}

// ---------------------------------------------------------------------------
// Quote card (citations)
// ---------------------------------------------------------------------------

function QuoteCard({ q }: {
    q: {
        initials: string;
        avatarBg: string;
        avatarColor: string;
        name: string;
        match: string;
        matchHighlight: boolean;
        quote: string;
    }
}) {
    return (
        <div
            className="p-5 rounded-xl transition-all"
            style={{ backgroundColor: '#161820', border: '1px solid rgba(66,71,83,0.05)' }}
            onMouseEnter={e => (e.currentTarget.style.borderColor = 'rgba(175,198,255,0.2)')}
            onMouseLeave={e => (e.currentTarget.style.borderColor = 'rgba(66,71,83,0.05)')}
        >
            <div className="flex justify-between items-start mb-3">
                <div className="flex items-center gap-2">
                    <div
                        className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0"
                        style={{ backgroundColor: q.avatarBg, color: q.avatarColor }}
                    >
                        {q.initials}
                    </div>
                    <span className="text-[12px] font-medium text-[#e2e2eb]">{q.name}</span>
                </div>
                <span
                    className="px-2 py-0.5 rounded-full text-[10px] font-bold flex-shrink-0"
                    style={
                        q.matchHighlight
                            ? { backgroundColor: 'rgba(175,198,255,0.1)', color: '#afc6ff' }
                            : { backgroundColor: '#33343b', color: '#8c909f' }
                    }
                >
                    {q.match}
                </span>
            </div>
            <p className="text-[14px] italic leading-relaxed" style={{ color: '#c2c6d6' }}>
                &ldquo;{q.quote}&rdquo;
            </p>
        </div>
    );
}

// ---------------------------------------------------------------------------
// AI message renderer
// ---------------------------------------------------------------------------

function AIMessage({ message }: { message: ChatMessage }) {
    return (
        <div className="flex flex-col gap-4">
            <AILabel />
            <div className="text-[15px] leading-relaxed" style={{ color: '#e2e2eb' }}>
                <ReactMarkdown
                    components={{
                        p: ({ children }) => <p className="mb-3 last:mb-0">{children}</p>,
                        strong: ({ children }) => <strong className="font-semibold" style={{ color: '#F0F0F3' }}>{children}</strong>,
                        em: ({ children }) => <em className="italic">{children}</em>,
                        ul: ({ children }) => <ul className="list-disc pl-5 mb-3 space-y-1">{children}</ul>,
                        ol: ({ children }) => <ol className="list-decimal pl-5 mb-3 space-y-1">{children}</ol>,
                        li: ({ children }) => <li className="leading-relaxed">{children}</li>,
                        h1: ({ children }) => <h1 className="text-lg font-bold mb-2 mt-4" style={{ color: '#F0F0F3' }}>{children}</h1>,
                        h2: ({ children }) => <h2 className="text-base font-bold mb-2 mt-4" style={{ color: '#F0F0F3' }}>{children}</h2>,
                        h3: ({ children }) => <h3 className="text-sm font-semibold mb-1 mt-3" style={{ color: '#F0F0F3' }}>{children}</h3>,
                        blockquote: ({ children }) => (
                            <blockquote className="pl-4 my-2 italic" style={{ borderLeft: '2px solid rgba(175,198,255,0.3)', color: '#c2c6d6' }}>{children}</blockquote>
                        ),
                        code: ({ children }) => (
                            <code className="px-1.5 py-0.5 rounded text-[13px]" style={{ backgroundColor: '#1e1f26', color: '#afc6ff' }}>{children}</code>
                        ),
                    }}
                >
                    {message.content}
                </ReactMarkdown>
            </div>
            {message.citations && message.citations.length > 0 && (
                <div className="grid grid-cols-1 gap-3 pt-2">
                    {message.citations.map((c, i) => (
                        <QuoteCard key={`${c.interview_id}-${i}`} q={citationToQuote(c, i)} />
                    ))}
                </div>
            )}
        </div>
    );
}

// ---------------------------------------------------------------------------
// Chat area
// ---------------------------------------------------------------------------

interface ChatAreaProps {
    conversationTitle: string;
    messages: ChatMessage[];
    starters: string[];
    sending: boolean;
    error: string | null;
    inputValue: string;
    onInputChange: (v: string) => void;
    onSend: () => void;
}

function ChatArea({
    conversationTitle,
    messages,
    starters,
    sending,
    error,
    inputValue,
    onInputChange,
    onSend,
}: ChatAreaProps) {
    const messagesEndRef = useRef<HTMLDivElement>(null);

    // Auto-scroll to bottom on new messages
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, sending]);

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            onSend();
        }
    };

    // Show suggestion chips: last AI message's followups, or starters
    const lastAiMsg = [...messages].reverse().find(m => m.role === 'assistant');
    const chips: string[] = lastAiMsg?.suggested_followups?.length
        ? lastAiMsg.suggested_followups
        : starters;

    return (
        <section
            className="flex-1 flex flex-col relative overflow-hidden"
            style={{ backgroundColor: '#0F1117' }}
        >
            {/* Chat header */}
            <header
                className="h-16 px-8 flex items-center justify-between flex-shrink-0 z-10"
                style={{
                    borderBottom: '1px solid rgba(66,71,83,0.05)',
                    background: 'rgba(17,19,25,0.8)',
                    backdropFilter: 'blur(12px)',
                }}
            >
                <div className="flex flex-col">
                    <h1 className="text-[#F0F0F3] text-base font-semibold leading-tight">
                        {conversationTitle || 'Ask Spec10x AI'}
                    </h1>
                    <div className="flex items-center gap-1 mt-0.5">
                        <span className="text-[11px] flex items-center gap-1" style={{ color: '#5A5C66' }}>
                            <span className="material-symbols-outlined" style={{ fontSize: 12 }}>database</span>
                            Scope: All interviews &amp; signals
                        </span>
                    </div>
                </div>
                <div className="flex items-center gap-4">
                    {['share', 'more_vert'].map(icon => (
                        <button
                            key={icon}
                            className="transition-colors"
                            style={{ color: '#c2c6d6' }}
                            onMouseEnter={e => (e.currentTarget.style.color = 'white')}
                            onMouseLeave={e => (e.currentTarget.style.color = '#c2c6d6')}
                        >
                            <span className="material-symbols-outlined" style={{ fontSize: 20 }}>{icon}</span>
                        </button>
                    ))}
                </div>
            </header>

            {/* Messages stream */}
            <div className="flex-1 overflow-y-auto py-8">
                <div className="w-full px-6 flex flex-col gap-10">

                    {messages.map(msg => (
                        msg.role === 'user'
                            ? <UserMessage key={msg.id} text={msg.content} />
                            : <AIMessage key={msg.id} message={msg} />
                    ))}

                    {/* Typing indicator while waiting */}
                    {sending && <TypingIndicator />}

                    {/* Error */}
                    {error && !sending && (
                        <div className="flex flex-col gap-4">
                            <AILabel />
                            <div
                                className="text-sm px-4 py-3 rounded-lg"
                                style={{ backgroundColor: 'rgba(248,113,113,0.08)', color: '#F87171', border: '1px solid rgba(248,113,113,0.15)' }}
                            >
                                {error}
                            </div>
                        </div>
                    )}

                    {/* Scroll anchor */}
                    <div ref={messagesEndRef} className="pb-40" />
                </div>
            </div>

            {/* Floating input area */}
            <div
                className="absolute bottom-0 left-0 right-0 pb-8 px-6"
                style={{ background: 'linear-gradient(to top, #0F1117 60%, rgba(15,17,23,0.95) 80%, transparent 100%)' }}
            >
                <div className="w-full flex flex-col gap-4">

                    {/* Suggestion chips */}
                    {chips.length > 0 && (
                        <div className="flex flex-row gap-2">
                            {chips.slice(0, 1).map(chip => (
                                <button
                                    key={chip}
                                    onClick={() => { onInputChange(chip); }}
                                    className="px-3 py-1.5 rounded-full text-[12px] flex items-center gap-1.5 transition-all whitespace-nowrap flex-shrink-0"
                                    style={{
                                        backgroundColor: '#1e1f26',
                                        border: '1px solid rgba(66,71,83,0.1)',
                                        color: '#c2c6d6',
                                    }}
                                    onMouseEnter={e => {
                                        (e.currentTarget as HTMLElement).style.color = '#afc6ff';
                                        (e.currentTarget as HTMLElement).style.borderColor = 'rgba(175,198,255,0.3)';
                                    }}
                                    onMouseLeave={e => {
                                        (e.currentTarget as HTMLElement).style.color = '#c2c6d6';
                                        (e.currentTarget as HTMLElement).style.borderColor = 'rgba(66,71,83,0.1)';
                                    }}
                                >
                                    <span className="material-symbols-outlined" style={{ fontSize: 14 }}>auto_awesome</span>
                                    {chip}
                                </button>
                            ))}
                        </div>
                    )}

                    {/* Input box */}
                    <div
                        className="rounded-2xl flex items-center p-2 shadow-2xl transition-all group"
                        style={{ backgroundColor: '#161820', border: '1px solid #1E2028' }}
                        onFocusCapture={e => (e.currentTarget.style.borderColor = 'rgba(175,198,255,0.4)')}
                        onBlurCapture={e => (e.currentTarget.style.borderColor = '#1E2028')}
                    >
                        <div className="pl-3 pr-2 flex items-center justify-center">
                            <span className="material-symbols-outlined transition-colors" style={{ color: '#8c909f', fontSize: 20 }}>
                                auto_awesome
                            </span>
                        </div>
                        <input
                            type="text"
                            value={inputValue}
                            onChange={e => onInputChange(e.target.value)}
                            onKeyDown={handleKeyDown}
                            placeholder="Ask anything about your data..."
                            className="bg-transparent border-none outline-none text-sm flex-1 py-3 px-1"
                            style={{ color: '#e2e2eb' }}
                            disabled={sending}
                        />
                        <div className="flex items-center gap-2 pr-1">
                            <button
                                onClick={onSend}
                                disabled={sending || !inputValue.trim()}
                                className="flex items-center justify-center rounded p-2 transition-all hover:brightness-110 disabled:opacity-50 disabled:cursor-not-allowed"
                                style={{ backgroundColor: '#afc6ff', color: '#002d6c' }}
                            >
                                <span className="material-symbols-outlined" style={{ fontSize: 20 }}>send</span>
                            </button>
                        </div>
                    </div>

                </div>
            </div>
        </section>
    );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function AskPage() {
    const searchParams = useSearchParams();
    const { token, loading: authLoading } = useAuth();

    const { messages, loading: sending, error, conversationId, sendQuestion, startNewChat, loadConversation } = useAsk(token);

    const [conversations, setConversations] = useState<AskConversation[]>([]);
    const [historyLoading, setHistoryLoading] = useState(false);
    const [starters, setStarters] = useState<string[]>([]);
    const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
    const [inputValue, setInputValue] = useState('');

    // Fetch conversation history and starters once authenticated
    const fetchHistory = useCallback(async () => {
        if (!token) return;
        setHistoryLoading(true);
        try {
            const convs = await api.listConversations(token);
            setConversations(convs);
        } finally {
            setHistoryLoading(false);
        }
    }, [token]);

    useEffect(() => {
        if (authLoading || !token) return;
        void fetchHistory();
        api.getAskStarters(token).then(setStarters).catch(() => {});
    }, [authLoading, token, fetchHistory]);

    // Auto-send ?q= param on first load
    const sentInitialQuery = useRef(false);
    useEffect(() => {
        const q = searchParams.get('q');
        if (q && token && !sentInitialQuery.current) {
            sentInitialQuery.current = true;
            setInputValue('');
            void sendQuestion(q);
        }
    }, [token, searchParams, sendQuestion]);

    // Refresh history after new message completes (conversation may have been created)
    useEffect(() => {
        if (!sending && conversationId && token) {
            void fetchHistory();
            setActiveConversationId(conversationId);
        }
    }, [sending, conversationId, token, fetchHistory]);

    const handleSelectConversation = useCallback(async (id: string) => {
        if (!token) return;
        setActiveConversationId(id);
        try {
            const detail = await api.getConversation(token, id);
            loadConversation(detail);
        } catch {
            // keep existing messages on error
        }
    }, [token, loadConversation]);

    const handleNewChat = useCallback(() => {
        startNewChat();
        setActiveConversationId(null);
        setInputValue('');
    }, [startNewChat]);

    const handleSend = useCallback(async () => {
        const q = inputValue.trim();
        if (!q || sending) return;
        setInputValue('');
        await sendQuestion(q);
    }, [inputValue, sending, sendQuestion]);

    const { today, yesterday, older } = groupConversations(conversations);

    const activeId = activeConversationId ?? conversationId;
    const conversationTitle = conversations.find(c => c.id === activeId)?.title ?? '';

    return (
        <div className="flex h-full overflow-hidden">
            <HistoryPanel
                today={today}
                yesterday={yesterday}
                older={older}
                activeId={activeId}
                loading={historyLoading}
                onNewChat={handleNewChat}
                onSelect={handleSelectConversation}
            />
            <ChatArea
                conversationTitle={conversationTitle}
                messages={messages}
                starters={starters}
                sending={sending}
                error={error}
                inputValue={inputValue}
                onInputChange={setInputValue}
                onSend={handleSend}
            />
        </div>
    );
}
