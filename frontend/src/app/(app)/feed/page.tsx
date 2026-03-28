'use client';

import React, { useState } from 'react';

// ---------------------------------------------------------------------------
// Types & static demo data
// ---------------------------------------------------------------------------

type SourceType = 'Interview' | 'Support' | 'Survey';
type SentimentType = 'Negative' | 'Neutral' | 'Positive';

interface Signal {
    id: number;
    source: SourceType;
    timestamp: string;
    title: string;
    excerpt: string;
    sentiment: SentimentType;
    tag: string;
    hot?: boolean;
}

const SIGNALS: Signal[] = [
    {
        id: 1,
        source: 'Interview',
        timestamp: '2h ago',
        title: 'Onboarding flow is too complex',
        excerpt: 'The user mentioned they felt overwhelmed by the 14-step setup process. They abandoned twice before completing it with support help...',
        sentiment: 'Negative',
        tag: 'Friction',
    },
    {
        id: 2,
        source: 'Support',
        timestamp: '4h ago',
        title: 'Billing cycle confusion',
        excerpt: "Customer expected a prorated refund when switching from annual to monthly. Our current policy doesn't reflect this...",
        sentiment: 'Neutral',
        tag: 'Pricing',
    },
    {
        id: 3,
        source: 'Survey',
        timestamp: '6h ago',
        title: 'Mobile app performance boost',
        excerpt: 'Recent update reduced load times by 40%. User "thrilled" with the snappy response of the analytics tab...',
        sentiment: 'Positive',
        tag: 'Mobile',
    },
    {
        id: 4,
        source: 'Interview',
        timestamp: 'Yesterday',
        title: 'Enterprise SSO requirements',
        excerpt: 'Prospective client needs Okta integration before finalizing the deal. Current documentation is unclear on OIDC support...',
        sentiment: 'Neutral',
        tag: 'Security',
    },
    {
        id: 5,
        source: 'Support',
        timestamp: 'Yesterday',
        title: 'Export timeout',
        excerpt: 'Critical issue reported by 4 separate accounts. PDF export times out on larger datasets (>5k rows). Immediate fix requested...',
        sentiment: 'Negative',
        tag: 'Critical',
        hot: true,
    },
    {
        id: 6,
        source: 'Survey',
        timestamp: '2 days ago',
        title: 'Search accuracy feedback',
        excerpt: 'Users are finding relevant results faster with the new semantic search engine. NPS score increased by 12 points...',
        sentiment: 'Positive',
        tag: 'Search',
    },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const SOURCE_STYLES: Record<SourceType, { bg: string; color: string }> = {
    Interview: { bg: 'rgba(79,140,255,0.12)', color: '#4F8CFF' },
    Support:   { bg: 'rgba(251,191,36,0.1)',  color: '#FBBF24' },
    Survey:    { bg: 'rgba(52,211,153,0.1)',   color: '#34D399' },
};

const SENTIMENT_STYLES: Record<SentimentType, { bg: string; color: string; icon: string }> = {
    Negative: { bg: 'rgba(248,113,113,0.1)', color: '#F87171', icon: 'sentiment_very_dissatisfied' },
    Neutral:  { bg: 'rgba(139,141,151,0.1)', color: '#8B8D97', icon: 'sentiment_neutral' },
    Positive: { bg: 'rgba(52,211,153,0.1)',  color: '#34D399', icon: 'sentiment_very_satisfied' },
};

// ---------------------------------------------------------------------------
// Signal row
// ---------------------------------------------------------------------------

function SignalRow({
    signal,
    selected,
    onClick,
}: {
    signal: Signal;
    selected: boolean;
    onClick: () => void;
}) {
    const src = SOURCE_STYLES[signal.source];
    const snt = SENTIMENT_STYLES[signal.sentiment];

    return (
        <div
            onClick={onClick}
            className="p-5 cursor-pointer transition-colors border-b"
            style={{
                borderLeftWidth: 4,
                borderLeftColor: selected ? '#4F8CFF' : 'transparent',
                borderBottomColor: 'rgba(66,71,83,0.08)',
                backgroundColor: selected ? '#1E2230' : 'transparent',
            }}
            onMouseEnter={e => {
                if (!selected) (e.currentTarget as HTMLElement).style.backgroundColor = 'rgba(30,31,38,0.3)';
            }}
            onMouseLeave={e => {
                if (!selected) (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent';
            }}
        >
            {/* Source + timestamp */}
            <div className="flex justify-between items-start mb-2">
                <div className="flex items-center gap-2">
                    <span
                        className="px-2 py-0.5 rounded text-[10px] font-bold uppercase"
                        style={{ backgroundColor: src.bg, color: src.color }}
                    >
                        {signal.source}
                    </span>
                    {signal.hot && (
                        <span
                            className="material-symbols-outlined text-orange-500"
                            style={{ fontSize: 16, fontVariationSettings: "'FILL' 1" }}
                        >
                            local_fire_department
                        </span>
                    )}
                </div>
                <span className="text-[10px] text-[#5A5C66]">{signal.timestamp}</span>
            </div>

            {/* Title */}
            <h3 className="text-sm font-semibold text-[#e2e2eb] mb-1">{signal.title}</h3>

            {/* Excerpt */}
            <p className="text-xs text-[#8B8D97] leading-relaxed mb-3 line-clamp-2">
                {signal.excerpt}
            </p>

            {/* Sentiment + tag */}
            <div className="flex gap-2 items-center">
                <span
                    className="flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded"
                    style={{ backgroundColor: snt.bg, color: snt.color }}
                >
                    <span className="material-symbols-outlined" style={{ fontSize: 12 }}>
                        {snt.icon}
                    </span>
                    {signal.sentiment}
                </span>
                <span
                    className="text-[10px] text-[#c8cad6] px-1.5 py-0.5 rounded"
                    style={{ backgroundColor: '#282a30' }}
                >
                    {signal.tag}
                </span>
            </div>
        </div>
    );
}

// ---------------------------------------------------------------------------
// Evidence detail panel
// ---------------------------------------------------------------------------

function EvidenceDetail() {
    return (
        <div className="flex flex-col h-full overflow-hidden">
            {/* Panel header */}
            <div
                className="px-4 py-3 border-b flex justify-between items-center flex-shrink-0"
                style={{ backgroundColor: '#191b22', borderColor: 'rgba(66,71,83,0.08)' }}
            >
                <span className="text-xs font-bold uppercase tracking-widest text-[#5A5C66]">
                    Evidence Detail
                </span>
                <div className="flex gap-1">
                    {['link', 'archive', 'more_vert'].map(icon => (
                        <button
                            key={icon}
                            className="p-1.5 text-[#8B8D97] rounded transition-colors"
                            onMouseEnter={e => {
                                (e.currentTarget as HTMLElement).style.backgroundColor = '#1e1f26';
                                (e.currentTarget as HTMLElement).style.color = '#F0F0F3';
                            }}
                            onMouseLeave={e => {
                                (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent';
                                (e.currentTarget as HTMLElement).style.color = '#8B8D97';
                            }}
                        >
                            <span className="material-symbols-outlined" style={{ fontSize: 18 }}>{icon}</span>
                        </button>
                    ))}
                </div>
            </div>

            {/* Scrollable content */}
            <div className="flex-1 overflow-y-auto p-10 max-w-4xl mx-auto w-full">

                {/* Meta row */}
                <div className="flex items-center gap-3 mb-6">
                    <span
                        className="px-2 py-1 rounded text-[10px] font-bold uppercase"
                        style={{ backgroundColor: 'rgba(79,140,255,0.12)', color: '#4F8CFF' }}
                    >
                        Interview
                    </span>
                    <span className="text-[#424753] text-xs">•</span>
                    <span className="text-[#8B8D97] text-xs">October 24, 2023</span>
                    <span className="text-[#424753] text-xs">•</span>
                    <span className="text-[#8B8D97] text-xs">ID: SIG-8291</span>
                </div>

                {/* Title */}
                <h2 className="text-[20px] font-bold text-[#e2e2eb] leading-tight mb-4">
                    Onboarding flow is too complex
                </h2>

                {/* Tag pills */}
                <div className="flex flex-wrap gap-2 mb-8">
                    <span
                        className="px-2 py-1 rounded text-[10px] font-semibold"
                        style={{
                            backgroundColor: 'rgba(216,120,2,0.1)',
                            color: '#ffb77b',
                            border: '1px solid rgba(216,120,2,0.2)',
                        }}
                    >
                        Pain Point
                    </span>
                    <span
                        className="px-2 py-1 rounded text-[10px] font-semibold"
                        style={{
                            backgroundColor: 'rgba(248,113,113,0.1)',
                            color: '#F87171',
                            border: '1px solid rgba(248,113,113,0.2)',
                        }}
                    >
                        Negative Sentiment
                    </span>
                    <span
                        className="px-2 py-1 rounded text-[10px] font-semibold text-[#c8cad6]"
                        style={{ backgroundColor: '#33343b' }}
                    >
                        Onboarding Friction
                    </span>
                    <span
                        className="px-2 py-1 rounded text-[10px] font-semibold text-[#c8cad6]"
                        style={{ backgroundColor: '#33343b' }}
                    >
                        UX Debt
                    </span>
                </div>

                {/* Body quotes */}
                <div className="space-y-4 text-sm leading-relaxed text-[#c0c2cc] mb-10">
                    <p>
                        &ldquo;The initial setup was incredibly frustrating. I signed up thinking I could get a dashboard running in five minutes, but I was met with a 14-step wizard that required me to hunt down API keys from three different internal teams before I could even see the interface.&rdquo;
                    </p>
                    <p>
                        The participant highlighted that while the tool seems powerful, the &lsquo;activation energy&rsquo; required to see the first value point is significantly higher than competing solutions. They specifically called out the &lsquo;Data Mapping&rsquo; step as a major bottleneck where they lost momentum.
                    </p>
                    <p>
                        &ldquo;I actually closed the tab twice. The only reason I came back is because my manager specifically asked for the Spec10x report style. If I were choosing this myself, I would have opted for a more lightweight alternative during that first hour.&rdquo;
                    </p>
                </div>

                {/* Person card */}
                <div
                    className="flex items-center justify-between p-6 rounded-xl mb-10"
                    style={{
                        backgroundColor: '#191b22',
                        border: '1px solid rgba(66,71,83,0.1)',
                    }}
                >
                    <div className="flex items-center gap-4">
                        {/* Avatar initials */}
                        <div
                            className="w-12 h-12 rounded-full flex items-center justify-center text-sm font-bold text-white flex-shrink-0"
                            style={{
                                backgroundColor: '#4F8CFF',
                                boxShadow: '0 0 0 2px rgba(79,140,255,0.2)',
                            }}
                        >
                            SC
                        </div>
                        <div>
                            <h4 className="text-sm font-bold text-[#e2e2eb]">Sarah Chen</h4>
                            <p className="text-xs text-[#5A5C66]">Product Manager @ Stripe</p>
                        </div>
                    </div>
                    <button
                        className="px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-2 transition-all"
                        style={{ backgroundColor: '#528dff', color: '#00275f' }}
                        onMouseEnter={e => (e.currentTarget.style.filter = 'brightness(1.05)')}
                        onMouseLeave={e => (e.currentTarget.style.filter = 'none')}
                    >
                        <span className="material-symbols-outlined" style={{ fontSize: 16 }}>play_circle</span>
                        View full interview
                    </button>
                </div>

                {/* Metadata + related themes */}
                <div
                    className="grid grid-cols-2 gap-8 pt-8 border-t"
                    style={{ borderColor: 'rgba(66,71,83,0.1)' }}
                >
                    <div>
                        <h5 className="text-[10px] font-bold uppercase tracking-widest text-[#5A5C66] mb-4">
                            Metadata
                        </h5>
                        <div className="space-y-3">
                            {[
                                { label: 'Duration',     value: '42m 12s' },
                                { label: 'User Segment', value: 'Enterprise (Tier 1)' },
                                { label: 'Device',       value: 'Chrome / macOS' },
                            ].map(row => (
                                <div key={row.label} className="flex justify-between">
                                    <span className="text-xs text-[#8B8D97]">{row.label}</span>
                                    <span className="text-xs text-[#e2e2eb]">{row.value}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div>
                        <h5 className="text-[10px] font-bold uppercase tracking-widest text-[#5A5C66] mb-4">
                            Related Themes
                        </h5>
                        <div className="flex flex-wrap gap-2">
                            {[
                                { label: 'Setup Wizard',    dot: '#4F8CFF' },
                                { label: 'API Provisioning', dot: '#b2c6f8' },
                                { label: 'Time to Value',   dot: '#ffb77b' },
                            ].map(theme => (
                                <div
                                    key={theme.label}
                                    className="px-3 py-1 rounded flex items-center gap-2"
                                    style={{ backgroundColor: '#282a30' }}
                                >
                                    <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: theme.dot }} />
                                    <span className="text-[11px] text-[#e2e2eb]">{theme.label}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

            </div>
        </div>
    );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function FeedPage() {
    const [selectedSignal, setSelectedSignal] = useState(1);

    return (
        <div className="flex flex-col h-full overflow-hidden" style={{ backgroundColor: '#111319' }}>

            {/* ── Header area ── */}
            <section
                className="px-8 py-8 flex-shrink-0 border-b"
                style={{ borderColor: 'rgba(66,71,83,0.1)' }}
            >
                {/* Title + stats */}
                <div className="flex justify-between items-end mb-6">
                    <div>
                        <h1 className="text-[24px] font-bold tracking-tight text-[#e2e2eb] mb-1">Feed</h1>
                        <p className="text-sm text-[#8B8D97]">
                            Signals across interviews, support, and surveys
                        </p>
                    </div>
                    <div className="flex gap-6 text-xs font-medium text-[#5A5C66]">
                        {[
                            { value: '156', label: 'Signals',    accent: true },
                            { value: '47',  label: 'Interviews', accent: false },
                            { value: '89',  label: 'Tickets',    accent: false },
                            { value: '20',  label: 'Surveys',    accent: false },
                        ].map(stat => (
                            <div key={stat.label} className="flex flex-col items-end">
                                <span
                                    className="text-lg font-bold"
                                    style={{ color: stat.accent ? '#afc6ff' : '#e2e2eb' }}
                                >
                                    {stat.value}
                                </span>
                                <span className="uppercase tracking-widest text-[10px]">{stat.label}</span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Filter bar */}
                <div className="flex gap-3">
                    {[
                        { label: 'Source: All', icon: null },
                        { label: 'Sentiment: All', icon: null },
                        { label: 'Date From', icon: 'calendar_today' },
                        { label: 'Date To',   icon: 'calendar_today' },
                    ].map(f => (
                        <button
                            key={f.label}
                            className="flex items-center gap-2 px-3 py-2 rounded text-xs transition-colors"
                            style={{
                                backgroundColor: '#161820',
                                border: '1px solid #1E2028',
                                color: '#c2c6d6',
                            }}
                            onMouseEnter={e => (e.currentTarget.style.borderColor = 'rgba(79,140,255,0.5)')}
                            onMouseLeave={e => (e.currentTarget.style.borderColor = '#1E2028')}
                        >
                            {f.icon && (
                                <span className="material-symbols-outlined" style={{ fontSize: 14 }}>
                                    {f.icon}
                                </span>
                            )}
                            <span>{f.label}</span>
                            {!f.icon && (
                                <span className="material-symbols-outlined" style={{ fontSize: 14 }}>
                                    expand_more
                                </span>
                            )}
                        </button>
                    ))}

                    <div className="flex-1" />

                    <button
                        className="flex items-center gap-2 px-4 py-2 rounded text-xs font-bold transition-all"
                        style={{ backgroundColor: '#4F8CFF', color: '#002d6c' }}
                        onMouseEnter={e => (e.currentTarget.style.filter = 'brightness(1.1)')}
                        onMouseLeave={e => (e.currentTarget.style.filter = 'none')}
                    >
                        <span className="material-symbols-outlined" style={{ fontSize: 14 }}>file_download</span>
                        Export Signals
                    </button>
                </div>
            </section>

            {/* ── Two-panel layout ── */}
            <div className="flex-1 flex overflow-hidden">

                {/* Left panel: signals list */}
                <section
                    className="flex flex-col border-r"
                    style={{
                        width: '45%',
                        backgroundColor: '#0c0e14',
                        borderColor: 'rgba(66,71,83,0.1)',
                    }}
                >
                    {/* List header */}
                    <div
                        className="p-4 border-b flex justify-between items-center flex-shrink-0"
                        style={{ borderColor: 'rgba(66,71,83,0.05)' }}
                    >
                        <span className="text-xs font-bold uppercase tracking-widest text-[#5A5C66]">
                            Signals (156)
                        </span>
                        <span className="material-symbols-outlined text-[#5A5C66] cursor-pointer" style={{ fontSize: 16 }}>
                            sort
                        </span>
                    </div>

                    {/* Signal rows */}
                    <div className="flex-1 overflow-y-auto">
                        {SIGNALS.map(signal => (
                            <SignalRow
                                key={signal.id}
                                signal={signal}
                                selected={selectedSignal === signal.id}
                                onClick={() => setSelectedSignal(signal.id)}
                            />
                        ))}
                    </div>
                </section>

                {/* Right panel: evidence detail */}
                <section
                    className="flex-1 flex flex-col overflow-hidden"
                    style={{ backgroundColor: '#111319' }}
                >
                    <EvidenceDetail />
                </section>

            </div>
        </div>
    );
}
