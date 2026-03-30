'use client';

import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';

// ---------------------------------------------------------------------------
// Static demo data
// ---------------------------------------------------------------------------

const RECENT_CHATS = [
    { id: 1, label: 'Onboarding pain points analysis', active: true,  icon: 'chat_bubble' },
    { id: 2, label: 'Compare mobile vs desktop feedback', active: false, icon: 'chat_bubble' },
    { id: 3, label: 'Top 5 churn risks this quarter',    active: false, icon: 'chat_bubble' },
];

const LAST_MONTH_CHATS = [
    { id: 4, label: 'Q3 Feature roadmap audit',        icon: 'history' },
    { id: 5, label: 'User sentiment regarding price',  icon: 'history' },
];

const SUGGESTION_CHIPS = [
    { icon: 'description', label: '📝 Generate spec for #1' },
    { icon: 'search',      label: '🔍 Show all evidence' },
    { icon: 'trending_up', label: '📈 Show trend over time' },
];

// ---------------------------------------------------------------------------
// History sidebar
// ---------------------------------------------------------------------------

function HistoryPanel() {
    const [activeChat, setActiveChat] = useState(1);

    return (
        <section
            className="flex flex-col h-full border-r flex-shrink-0"
            style={{ width: 260, backgroundColor: '#0C0D12', borderColor: 'rgba(66,71,83,0.05)' }}
        >
            {/* New chat button */}
            <div className="p-4">
                <button
                    className="w-full py-2.5 px-4 rounded-xl text-sm flex items-center justify-center gap-2 transition-all"
                    style={{
                        border: '1px dashed rgba(66,71,83,0.3)',
                        color: '#c2c6d6',
                    }}
                    onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#191b22')}
                    onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}
                >
                    <span className="material-symbols-outlined" style={{ fontSize: 16 }}>add</span>
                    New Chat
                </button>
            </div>

            {/* Chat history list */}
            <div className="flex-1 overflow-y-auto px-2 pb-6">
                {/* Recent */}
                <div className="mt-4 px-3 mb-2">
                    <h3 className="text-[10px] uppercase tracking-widest font-bold" style={{ color: '#8c909f' }}>
                        Recent
                    </h3>
                </div>
                <div className="space-y-0.5">
                    {RECENT_CHATS.map(chat => (
                        <button
                            key={chat.id}
                            onClick={() => setActiveChat(chat.id)}
                            className="w-full text-left px-3 py-2.5 rounded-lg text-[13px] flex items-center gap-3 transition-colors"
                            style={{
                                backgroundColor: activeChat === chat.id ? 'rgba(175,198,255,0.08)' : 'transparent',
                                color: activeChat === chat.id ? '#F0F0F3' : '#c2c6d6',
                                fontWeight: activeChat === chat.id ? 500 : 400,
                            }}
                            onMouseEnter={e => {
                                if (activeChat !== chat.id)
                                    (e.currentTarget as HTMLElement).style.backgroundColor = '#191b22';
                            }}
                            onMouseLeave={e => {
                                if (activeChat !== chat.id)
                                    (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent';
                            }}
                        >
                            <span
                                className="material-symbols-outlined flex-shrink-0"
                                style={{
                                    fontSize: 18,
                                    color: activeChat === chat.id ? '#afc6ff' : 'rgba(194,198,214,0.4)',
                                }}
                            >
                                {chat.icon}
                            </span>
                            <span className="truncate">{chat.label}</span>
                        </button>
                    ))}
                </div>

                {/* Last Month */}
                <div className="mt-8 px-3 mb-2">
                    <h3 className="text-[10px] uppercase tracking-widest font-bold" style={{ color: '#8c909f' }}>
                        Last Month
                    </h3>
                </div>
                <div className="space-y-0.5">
                    {LAST_MONTH_CHATS.map(chat => (
                        <button
                            key={chat.id}
                            onClick={() => setActiveChat(chat.id)}
                            className="w-full text-left px-3 py-2.5 rounded-lg text-[13px] flex items-center gap-3 transition-colors"
                            style={{ color: '#c2c6d6' }}
                            onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#191b22')}
                            onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}
                        >
                            <span
                                className="material-symbols-outlined flex-shrink-0"
                                style={{ fontSize: 18, color: 'rgba(194,198,214,0.4)' }}
                            >
                                {chat.icon}
                            </span>
                            <span className="truncate">{chat.label}</span>
                        </button>
                    ))}
                </div>
            </div>
        </section>
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
                style={{
                    backgroundColor: '#161820',
                    color: '#e2e2eb',
                    border: '1px solid rgba(66,71,83,0.1)',
                }}
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
            <span
                className="material-symbols-outlined"
                style={{ fontSize: 18, fontVariationSettings: "'FILL' 1" }}
            >
                auto_awesome
            </span>
            Spec10x AI
        </div>
    );
}

// ---------------------------------------------------------------------------
// Finding cards (first AI response)
// ---------------------------------------------------------------------------

const FINDINGS = [
    {
        title: 'Confusing Setup Wizard',
        desc: 'Users struggle with the technical configuration step in part 3.',
        accentColor: '#ffb4ab',
    },
    {
        title: 'No Progress Indication',
        desc: 'Users feel "lost" during long data synchronization phases.',
        accentColor: '#FBBF24',
    },
    {
        title: 'Handoff Gap',
        desc: 'Discordance between sales promises and actual dashboard state.',
        accentColor: '#FBBF24',
    },
];

function FindingCards() {
    return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2">
            {FINDINGS.map(f => (
                <div
                    key={f.title}
                    className="p-4 rounded-xl flex flex-col gap-2"
                    style={{
                        backgroundColor: '#1e1f26',
                        borderLeft: `4px solid ${f.accentColor}`,
                    }}
                >
                    <span className="text-[13px] font-bold text-[#e2e2eb]">{f.title}</span>
                    <p className="text-[12px] leading-normal" style={{ color: '#c2c6d6' }}>{f.desc}</p>
                </div>
            ))}
        </div>
    );
}

// ---------------------------------------------------------------------------
// Quote cards (second AI response)
// ---------------------------------------------------------------------------

const QUOTES = [
    {
        initials: 'SC',
        avatarBg: '#354873',
        avatarColor: '#a4b8e9',
        name: 'Sarah Chen, CTO @ Nexus',
        match: '98% Match',
        matchHighlight: true,
        quote: 'The setup wizard feels like it was designed for a developer, not a product manager. I hit the API key step and had no idea where to find that info.',
    },
    {
        initials: 'JM',
        avatarBg: '#d87802',
        avatarColor: '#432100',
        name: 'Jake M., Ops Lead',
        match: '92% Match',
        matchHighlight: true,
        quote: 'I tried to skip the wizard because it was too complex, but then the whole app looked broken because no data was loaded.',
    },
    {
        initials: null,
        avatarBg: '#282a30',
        avatarColor: '#c2c6d6',
        name: 'Support Ticket #4821',
        match: '85% Match',
        matchHighlight: false,
        quote: 'User reports getting a 404 error during the \'Finalizing Workspace\' stage of the wizard. This is the 4th occurrence this week.',
    },
];

function QuoteCard({ q }: { q: typeof QUOTES[0] }) {
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
                        {q.initials ?? (
                            <span className="material-symbols-outlined" style={{ fontSize: 14 }}>
                                confirmation_number
                            </span>
                        )}
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
// Chat area
// ---------------------------------------------------------------------------

function ChatArea({ initialQuery }: { initialQuery: string }) {
    const [inputValue, setInputValue] = useState(initialQuery);

    useEffect(() => {
        setInputValue(initialQuery);
    }, [initialQuery]);

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
                        Onboarding pain points analysis
                    </h1>
                    <div className="flex items-center gap-1 mt-0.5">
                        <span
                            className="text-[11px] flex items-center gap-1"
                            style={{ color: '#5A5C66' }}
                        >
                            <span className="material-symbols-outlined" style={{ fontSize: 12 }}>database</span>
                            Scope: Last 90 days • 1,240 Interviews
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
                <div className="max-w-[800px] mx-auto px-6 flex flex-col gap-10">

                    {/* User message 1 */}
                    <UserMessage text="What are the biggest onboarding pain points across all our interview data?" />

                    {/* AI response 1 */}
                    <div className="flex flex-col gap-4">
                        <AILabel />
                        <div className="text-[15px] leading-relaxed space-y-4" style={{ color: '#e2e2eb' }}>
                            <p>
                                Based on the semantic analysis of 1,240 interviews from the last quarter, I&apos;ve identified
                                three primary friction points in our onboarding flow:
                            </p>
                            <FindingCards />
                        </div>
                    </div>

                    {/* User message 2 */}
                    <UserMessage text="Show me the strongest quotes from interviews about the setup wizard confusion" />

                    {/* AI response 2 */}
                    <div className="flex flex-col gap-4 pb-40">
                        <AILabel />
                        <div className="grid grid-cols-1 gap-3">
                            {QUOTES.map(q => <QuoteCard key={q.name} q={q} />)}
                        </div>
                    </div>

                </div>
            </div>

            {/* Floating input area */}
            <div
                className="absolute bottom-0 left-0 right-0 pb-8 px-6"
                style={{
                    background: 'linear-gradient(to top, #0F1117 60%, rgba(15,17,23,0.95) 80%, transparent 100%)',
                }}
            >
                <div className="max-w-[800px] mx-auto flex flex-col gap-4">

                    {/* Suggestion chips */}
                    <div className="flex flex-wrap gap-2 justify-center">
                        {SUGGESTION_CHIPS.map(chip => (
                            <button
                                key={chip.label}
                                className="px-3 py-1.5 rounded-full text-[12px] flex items-center gap-1.5 transition-all"
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
                                <span className="material-symbols-outlined" style={{ fontSize: 14 }}>{chip.icon}</span>
                                {chip.label}
                            </button>
                        ))}
                    </div>

                    {/* Input box */}
                    <div
                        className="rounded-2xl flex items-center p-2 shadow-2xl transition-all group"
                        style={{ backgroundColor: '#161820', border: '1px solid #1E2028' }}
                        onFocusCapture={e => (e.currentTarget.style.borderColor = 'rgba(175,198,255,0.4)')}
                        onBlurCapture={e => (e.currentTarget.style.borderColor = '#1E2028')}
                    >
                        <div className="pl-3 pr-2 flex items-center justify-center">
                            <span
                                className="material-symbols-outlined transition-colors"
                                style={{ color: '#8c909f', fontSize: 20 }}
                            >
                                auto_awesome
                            </span>
                        </div>
                        <input
                            type="text"
                            value={inputValue}
                            onChange={e => setInputValue(e.target.value)}
                            placeholder="Ask anything about your data..."
                            className="bg-transparent border-none outline-none text-sm flex-1 py-3 px-1"
                            style={{ color: '#e2e2eb' }}
                        />
                        <div className="flex items-center gap-2 pr-1">
                            <button
                                className="w-9 h-9 flex items-center justify-center rounded-xl transition-colors"
                                style={{ color: '#8c909f' }}
                                onMouseEnter={e => {
                                    (e.currentTarget as HTMLElement).style.backgroundColor = '#1e1f26';
                                }}
                                onMouseLeave={e => {
                                    (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent';
                                }}
                            >
                                <span className="material-symbols-outlined" style={{ fontSize: 20 }}>attach_file</span>
                            </button>
                            <button
                                className="w-9 h-9 flex items-center justify-center rounded-xl transition-transform hover:scale-105"
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
    const initialQuery = searchParams.get('q') ?? '';

    return (
        <div className="flex h-full overflow-hidden">
            <HistoryPanel />
            <ChatArea initialQuery={initialQuery} />
        </div>
    );
}
