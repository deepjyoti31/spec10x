'use client';

import React, { useState } from 'react';

// ---------------------------------------------------------------------------
// Static demo data
// ---------------------------------------------------------------------------

const THEME_CARDS = [
    {
        id: 1,
        title: 'Onboarding Friction',
        score: 8.7,
        isNew: true,
        active: true,
        mentions: 142,
        sources: ['Slack', 'Intercom'],
        sentiment: [
            { color: '#F87171', pct: 65 },
            { color: '#4a4e5c', pct: 20 },
            { color: '#4F8CFF', pct: 15 },
        ],
        quotes: [
            'The step 3 documentation is completely outdated compared to the current UI...',
            'Why does it require a phone number verification for sandbox accounts?',
        ],
    },
    {
        id: 2,
        title: 'API Latency Peaks',
        score: 7.2,
        isNew: false,
        active: false,
        mentions: 89,
        sources: ['Sentry'],
        sentiment: [
            { color: '#F87171', pct: 30 },
            { color: '#4a4e5c', pct: 50 },
            { color: '#4F8CFF', pct: 20 },
        ],
        quotes: ['Endpoints in us-east-1 are timing out consistently under heavy load...'],
    },
    {
        id: 3,
        title: 'Billing Transparency',
        score: 6.8,
        isNew: false,
        active: false,
        mentions: 56,
        sources: ['Zendesk'],
        sentiment: [
            { color: '#F87171', pct: 15 },
            { color: '#4a4e5c', pct: 70 },
            { color: '#4F8CFF', pct: 15 },
        ],
        quotes: ['Hard to understand the usage-based charges for enterprise tiers...'],
    },
    {
        id: 4,
        title: 'Dark Mode Contrast',
        score: 5.4,
        isNew: false,
        active: false,
        mentions: 42,
        sources: ['Twitter'],
        sentiment: [
            { color: '#4F8CFF', pct: 80 },
            { color: '#4a4e5c', pct: 20 },
        ],
        quotes: ['Love the new theme but accessibility contrast is a bit low in settings.'],
    },
    {
        id: 5,
        title: 'Mobile Navigation',
        score: 5.1,
        isNew: true,
        active: false,
        mentions: 38,
        sources: ['App Store'],
        sentiment: [
            { color: '#F87171', pct: 40 },
            { color: '#4a4e5c', pct: 60 },
        ],
        quotes: ['Hamburger menu feels clunky on iOS devices with larger screens.'],
    },
    {
        id: 6,
        title: 'PDF Export Logic',
        score: 4.9,
        isNew: false,
        active: false,
        mentions: 31,
        sources: ['Email'],
        sentiment: [
            { color: '#4a4e5c', pct: 100 },
        ],
        quotes: ['Layout breaks when exporting charts with 10+ data points.'],
    },
];

const SORT_OPTIONS = ['Urgency', 'Frequency', 'Sentiment', 'Recency'];

// ---------------------------------------------------------------------------
// Theme Card
// ---------------------------------------------------------------------------

function ThemeCard({
    card,
    selected,
    onClick,
}: {
    card: typeof THEME_CARDS[0];
    selected: boolean;
    onClick: () => void;
}) {
    return (
        <article
            onClick={onClick}
            className="rounded-xl p-5 cursor-pointer transition-all hover:-translate-y-0.5"
            style={{
                backgroundColor: selected ? '#282a30' : '#191b22',
                border: selected ? '1px solid rgba(79,140,255,0.4)' : '1px solid transparent',
                boxShadow: selected ? '0 20px 25px rgba(79,140,255,0.05)' : 'none',
            }}
        >
            {/* Header */}
            <div className="flex justify-between items-start mb-3">
                <h3
                    className="font-semibold leading-tight"
                    style={{ color: selected ? '#4F8CFF' : '#e2e2eb' }}
                >
                    {card.title}
                </h3>
                <div className="flex items-center gap-2">
                    {card.isNew && (
                        <span
                            className="text-[10px] font-bold px-1.5 py-0.5 rounded"
                            style={{ backgroundColor: 'rgba(79,140,255,0.2)', color: '#4F8CFF' }}
                        >
                            NEW
                        </span>
                    )}
                    <span
                        className="text-xs font-bold"
                        style={{ color: selected ? '#F0F0F3' : '#8B8D97' }}
                    >
                        {card.score}
                    </span>
                </div>
            </div>

            {/* Meta */}
            <div className="flex items-center gap-3 mb-4">
                <div className="flex items-center gap-1">
                    <span className="material-symbols-outlined text-[#5A5C66]" style={{ fontSize: 14 }}>forum</span>
                    <span className="text-[11px] text-[#8B8D97]">{card.mentions} mentions</span>
                </div>
                <div className="flex gap-1">
                    {card.sources.map(s => (
                        <span
                            key={s}
                            className="text-[10px] text-[#8B8D97] px-1.5 rounded"
                            style={{ backgroundColor: '#1e1f26' }}
                        >
                            {s}
                        </span>
                    ))}
                </div>
            </div>

            {/* Sentiment bar */}
            <div
                className="h-1 w-full rounded-full mb-4 overflow-hidden flex"
                style={{ backgroundColor: '#0c0e14' }}
            >
                {card.sentiment.map((seg, i) => (
                    <div
                        key={i}
                        className="h-full"
                        style={{ backgroundColor: seg.color, width: `${seg.pct}%` }}
                    />
                ))}
            </div>

            {/* Quotes */}
            <div className="space-y-3">
                {card.quotes.map((q, i) => (
                    <p
                        key={i}
                        className="text-[11px] text-[#8B8D97] italic pl-3"
                        style={{ borderLeft: '2px solid rgba(66,71,83,0.2)' }}
                    >
                        &ldquo;{q}&rdquo;
                    </p>
                ))}
            </div>
        </article>
    );
}

// ---------------------------------------------------------------------------
// Right panel: Theme Detail
// ---------------------------------------------------------------------------

function ThemeDetail() {
    return (
        <div className="p-6">
            {/* Title + badge */}
            <div className="flex justify-between items-start mb-1">
                <h2 className="text-lg font-bold text-white tracking-tight leading-none">
                    Onboarding Friction
                </h2>
                <span
                    className="text-[10px] font-bold px-1.5 py-0.5 rounded"
                    style={{ backgroundColor: 'rgba(79,140,255,0.2)', color: '#4F8CFF' }}
                >
                    NEW
                </span>
            </div>

            {/* Score row */}
            <div className="flex items-center gap-2 mb-6">
                <div className="text-2xl font-bold" style={{ color: '#4F8CFF' }}>8.7</div>
                <div className="text-[10px] text-[#5A5C66] uppercase font-semibold">Impact Score</div>
                <div className="ml-auto text-[10px] text-[#5A5C66] font-medium">Aug 12 – Aug 28</div>
            </div>

            {/* Mini stats grid */}
            <div
                className="grid grid-cols-2 gap-px rounded-lg overflow-hidden mb-8"
                style={{ backgroundColor: 'rgba(66,71,83,0.1)' }}
            >
                {[
                    { label: 'Frequency',  value: 'High (+12%)',  danger: false },
                    { label: 'Sentiment',  value: 'Negative',     danger: true  },
                    { label: 'Recency',    value: '2h ago',       danger: false },
                    { label: 'Diversity',  value: '4 Channels',   danger: false },
                ].map(stat => (
                    <div key={stat.label} className="p-3" style={{ backgroundColor: '#0F1117' }}>
                        <div className="text-[10px] text-[#5A5C66] uppercase font-bold mb-1">{stat.label}</div>
                        <div
                            className="text-sm font-semibold"
                            style={{ color: stat.danger ? '#F87171' : '#F0F0F3' }}
                        >
                            {stat.value}
                        </div>
                    </div>
                ))}
            </div>

            {/* Source breakdown */}
            <div className="mb-8">
                <h4 className="text-[11px] text-[#5A5C66] font-bold uppercase mb-3">Source Breakdown</h4>
                <div className="h-6 w-full rounded flex overflow-hidden mb-2">
                    <div className="h-full" style={{ backgroundColor: '#528dff', width: '45%' }} />
                    <div className="h-full" style={{ backgroundColor: '#354873', width: '30%' }} />
                    <div className="h-full" style={{ backgroundColor: '#4a4e5c', width: '25%' }} />
                </div>
                <div className="flex justify-between text-[10px] text-[#5A5C66]">
                    <span>Slack (45%)</span>
                    <span>Intercom (30%)</span>
                    <span>Direct (25%)</span>
                </div>
            </div>

            {/* Top evidence */}
            <div className="mb-8">
                <h4 className="text-[11px] text-[#5A5C66] font-bold uppercase mb-3">Top Evidence</h4>
                <div className="space-y-3">
                    {[
                        {
                            quote: 'The onboarding funnel drops significantly at the database connection step. Users are confused by the ARN requirements.',
                            initials: 'JD',
                            author: 'John D. via Slack',
                            color: '#4F8CFF',
                        },
                        {
                            quote: 'Still no support for Azure AD in the initial setup? This is a dealbreaker for enterprise clients.',
                            initials: 'SA',
                            author: 'Sarah A. via Intercom',
                            color: '#ffb77b',
                        },
                        {
                            quote: 'Can we simplify the workspace invitation flow? It takes 4 clicks to send one email.',
                            initials: 'MK',
                            author: 'Mike K. via Survey',
                            color: '#b2c6f8',
                        },
                    ].map(ev => (
                        <div
                            key={ev.initials}
                            className="p-3 rounded-lg"
                            style={{
                                backgroundColor: '#0c0e14',
                                border: '1px solid rgba(66,71,83,0.1)',
                            }}
                        >
                            <p className="text-[11px] text-[#c8cad6] mb-2 leading-relaxed">
                                &ldquo;{ev.quote}&rdquo;
                            </p>
                            <div className="flex items-center gap-2">
                                <div
                                    className="w-4 h-4 rounded-full flex items-center justify-center text-[8px] font-bold"
                                    style={{
                                        backgroundColor: `${ev.color}20`,
                                        color: ev.color,
                                    }}
                                >
                                    {ev.initials}
                                </div>
                                <span className="text-[9px] text-[#5A5C66]">{ev.author}</span>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Action buttons */}
            <div className="space-y-2 pb-8">
                <button
                    className="w-full py-2.5 rounded-lg text-xs font-bold flex items-center justify-center gap-2 transition-all hover:brightness-110"
                    style={{ backgroundColor: '#4F8CFF', color: '#002d6c' }}
                >
                    <span className="material-symbols-outlined" style={{ fontSize: 16 }}>view_kanban</span>
                    View in Board
                </button>
                <button
                    className="w-full py-2.5 rounded-lg text-xs font-bold flex items-center justify-center gap-2 transition-all"
                    style={{
                        backgroundColor: '#1e1f26',
                        color: '#4F8CFF',
                        border: '1px solid rgba(79,140,255,0.2)',
                    }}
                    onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#282a30')}
                    onMouseLeave={e => (e.currentTarget.style.backgroundColor = '#1e1f26')}
                >
                    <span className="material-symbols-outlined" style={{ fontSize: 16 }}>auto_awesome</span>
                    Ask AI about this theme
                </button>
            </div>
        </div>
    );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function InsightsPage() {
    const [selectedCard, setSelectedCard] = useState(1);
    const [activeSort, setActiveSort] = useState('Urgency');

    return (
        <div className="flex h-full overflow-hidden">

            {/* ── LEFT PANEL: Filters ── */}
            <section
                className="w-[220px] flex flex-col h-full border-r flex-shrink-0"
                style={{ backgroundColor: '#0C0D12', borderColor: 'rgba(66,71,83,0.1)' }}
            >
                {/* Header */}
                <div className="p-5 flex justify-between items-end">
                    <h2 className="text-xs font-semibold uppercase tracking-widest text-[#5A5C66]">
                        Filters
                    </h2>
                    <button className="text-[10px] text-[#4F8CFF] hover:underline">Clear all</button>
                </div>

                <div className="flex-1 overflow-y-auto px-5 py-2 space-y-8">

                    {/* Sources */}
                    <div>
                        <h3 className="text-xs font-semibold text-[#c8cad6] mb-3">Sources</h3>
                        <div className="space-y-2.5">
                            {['Interview', 'Support', 'Survey'].map(src => (
                                <label key={src} className="flex items-center gap-2.5 cursor-pointer group">
                                    <input
                                        defaultChecked
                                        type="checkbox"
                                        className="w-3.5 h-3.5 rounded-sm"
                                        style={{ accentColor: '#4F8CFF' }}
                                    />
                                    <span className="text-xs text-[#8B8D97] group-hover:text-[#F0F0F3] transition-colors">
                                        {src}
                                    </span>
                                </label>
                            ))}
                            {/* Locked: Analytics */}
                            <div className="flex items-center justify-between">
                                <label className="flex items-center gap-2.5 opacity-40">
                                    <input type="checkbox" disabled className="w-3.5 h-3.5 rounded-sm" />
                                    <span className="text-xs text-[#8B8D97]">Analytics</span>
                                </label>
                                <span
                                    className="text-[9px] text-[#5A5C66] px-1 rounded"
                                    style={{ backgroundColor: '#1e1f26' }}
                                >
                                    SOON
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Sentiment */}
                    <div>
                        <h3 className="text-xs font-semibold text-[#c8cad6] mb-3">Sentiment</h3>
                        <div className="space-y-2.5">
                            {['All selected', 'Negative', 'Positive', 'Neutral'].map((opt, i) => (
                                <label key={opt} className="flex items-center gap-2.5 cursor-pointer group">
                                    <input
                                        type="radio"
                                        name="sentiment"
                                        defaultChecked={i === 0}
                                        className="w-3.5 h-3.5"
                                        style={{ accentColor: '#4F8CFF' }}
                                    />
                                    <span className="text-xs text-[#8B8D97] group-hover:text-[#F0F0F3]">
                                        {opt}
                                    </span>
                                </label>
                            ))}
                        </div>
                    </div>

                    {/* Date Range */}
                    <div>
                        <h3 className="text-xs font-semibold text-[#c8cad6] mb-3">Date Range</h3>
                        <div className="space-y-2">
                            <input
                                type="text"
                                placeholder="From: MM/DD/YY"
                                className="w-full rounded text-[11px] py-2 px-3 outline-none transition-all"
                                style={{
                                    backgroundColor: '#161820',
                                    border: '1px solid transparent',
                                    color: '#8B8D97',
                                }}
                                onFocus={e => (e.currentTarget.style.border = '1px solid rgba(79,140,255,0.3)')}
                                onBlur={e => (e.currentTarget.style.border = '1px solid transparent')}
                            />
                            <input
                                type="text"
                                placeholder="To: Present"
                                className="w-full rounded text-[11px] py-2 px-3 outline-none transition-all"
                                style={{
                                    backgroundColor: '#161820',
                                    border: '1px solid transparent',
                                    color: '#8B8D97',
                                }}
                                onFocus={e => (e.currentTarget.style.border = '1px solid rgba(79,140,255,0.3)')}
                                onBlur={e => (e.currentTarget.style.border = '1px solid transparent')}
                            />
                        </div>
                    </div>

                    {/* Locked dropdowns */}
                    <div className="space-y-2 pb-6">
                        {['Collection', 'Saved Views'].map(item => (
                            <button
                                key={item}
                                className="w-full flex items-center justify-between p-2 rounded transition-colors group"
                                style={{ color: '#8B8D97' }}
                                onMouseEnter={e => {
                                    e.currentTarget.style.backgroundColor = '#1e1f26';
                                    e.currentTarget.style.color = '#F0F0F3';
                                }}
                                onMouseLeave={e => {
                                    e.currentTarget.style.backgroundColor = 'transparent';
                                    e.currentTarget.style.color = '#8B8D97';
                                }}
                            >
                                <span className="text-xs">{item}</span>
                                <span className="material-symbols-outlined text-[#5A5C66]" style={{ fontSize: 14 }}>lock</span>
                            </button>
                        ))}
                    </div>
                </div>
            </section>

            {/* ── CENTER PANEL: Themes Feed ── */}
            <section
                className="flex-1 overflow-y-auto p-6"
                style={{ backgroundColor: '#0F1117' }}
            >
                <div className="max-w-4xl mx-auto">

                    {/* Header row */}
                    <div className="flex items-center justify-between mb-6">
                        <h1 className="text-xl font-bold tracking-tight text-[#F0F0F3]">
                            12 Active Themes
                        </h1>
                        <div
                            className="flex p-1 rounded-lg"
                            style={{ backgroundColor: '#0c0e14' }}
                        >
                            {SORT_OPTIONS.map(opt => (
                                <button
                                    key={opt}
                                    onClick={() => setActiveSort(opt)}
                                    className="px-3 py-1 text-xs font-medium rounded-md transition-all"
                                    style={
                                        activeSort === opt
                                            ? {
                                                backgroundColor: '#4F8CFF',
                                                color: '#002d6c',
                                                boxShadow: '0 4px 6px rgba(79,140,255,0.1)',
                                              }
                                            : { color: '#5A5C66' }
                                    }
                                >
                                    {opt}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* AI input pill */}
                    <div className="mb-8 relative group">
                        <span
                            className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 transition-colors"
                            style={{ fontSize: 20, color: 'rgba(79,140,255,0.7)' }}
                        >
                            auto_awesome
                        </span>
                        <input
                            type="text"
                            placeholder="Ask AI: What's the main reason for churn in Q3?"
                            className="w-full rounded-xl py-4 pl-12 pr-16 text-sm outline-none transition-all"
                            style={{
                                backgroundColor: '#1e1f26',
                                border: '1px solid rgba(66,71,83,0.1)',
                                color: '#F0F0F3',
                            }}
                            onFocus={e => {
                                e.currentTarget.style.boxShadow = '0 0 0 2px rgba(79,140,255,0.2)';
                                e.currentTarget.style.borderColor = 'rgba(79,140,255,0.3)';
                            }}
                            onBlur={e => {
                                e.currentTarget.style.boxShadow = 'none';
                                e.currentTarget.style.borderColor = 'rgba(66,71,83,0.1)';
                            }}
                        />
                        <div className="absolute right-4 top-1/2 -translate-y-1/2">
                            <span
                                className="text-[10px] text-[#5A5C66] font-mono px-1.5 py-0.5 rounded"
                                style={{ backgroundColor: '#282a30' }}
                            >
                                ⌘ K
                            </span>
                        </div>
                    </div>

                    {/* Cards grid */}
                    <div className="grid grid-cols-2 gap-4">
                        {THEME_CARDS.map(card => (
                            <ThemeCard
                                key={card.id}
                                card={card}
                                selected={selectedCard === card.id}
                                onClick={() => setSelectedCard(card.id)}
                            />
                        ))}
                    </div>

                    {/* Pagination */}
                    <div className="mt-8 flex items-center justify-center gap-8">
                        <button className="text-xs font-medium text-[#4F8CFF] hover:underline">
                            + Show 6 more themes
                        </button>
                        <button className="text-xs font-medium text-[#5A5C66] hover:text-[#F0F0F3] transition-colors">
                            Previous themes (3)
                        </button>
                    </div>
                </div>
            </section>

            {/* ── RIGHT PANEL: Theme Detail ── */}
            <section
                className="w-[340px] flex flex-col h-full border-l overflow-y-auto flex-shrink-0"
                style={{ backgroundColor: '#0C0D12', borderColor: 'rgba(66,71,83,0.1)' }}
            >
                <ThemeDetail />
            </section>
        </div>
    );
}
