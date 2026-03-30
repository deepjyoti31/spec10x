'use client';

import React from 'react';

// ---------------------------------------------------------------------------
// Score ring — SVG circular progress
// ---------------------------------------------------------------------------

function ScoreRing({
    score,
    size = 48,
    strokeWidth = 3,
    radius = 20,
}: {
    score: number;
    size?: number;
    strokeWidth?: number;
    radius?: number;
}) {
    const circumference = 2 * Math.PI * radius;
    // score is 0–10; map to 0–100% of circumference
    const offset = circumference - (score / 10) * circumference;
    const cx = size / 2;
    const cy = size / 2;

    return (
        <div className="relative flex items-center justify-center flex-shrink-0" style={{ width: size, height: size }}>
            <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
                {/* Track */}
                <circle
                    cx={cx} cy={cy} r={radius}
                    fill="transparent"
                    stroke="#282a30"
                    strokeWidth={strokeWidth}
                />
                {/* Progress */}
                <circle
                    cx={cx} cy={cy} r={radius}
                    fill="transparent"
                    stroke="#afc6ff"
                    strokeWidth={strokeWidth}
                    strokeDasharray={circumference}
                    strokeDashoffset={offset}
                    strokeLinecap="round"
                />
            </svg>
            <span
                className="absolute font-bold"
                style={{ fontSize: size >= 48 ? 11 : 10, color: '#F0F0F3' }}
            >
                {score}
            </span>
        </div>
    );
}

// ---------------------------------------------------------------------------
// Score pill (used in Investigate / Monitoring columns)
// ---------------------------------------------------------------------------

function ScorePill({ score, highlight }: { score: number; highlight?: boolean }) {
    return (
        <span
            className="text-[10px] font-bold px-2 py-0.5 rounded-full"
            style={{
                backgroundColor: highlight ? 'rgba(82,141,255,0.1)' : '#282a30',
                color: highlight ? '#528dff' : 'rgba(194,198,214,0.6)',
            }}
        >
            SCORE {score}
        </span>
    );
}

// ---------------------------------------------------------------------------
// Source tag
// ---------------------------------------------------------------------------

function SourceTag({ label }: { label: string }) {
    return (
        <span
            className="text-[9px] px-1.5 py-0.5 rounded"
            style={{
                backgroundColor: '#1e1f26',
                color: '#c2c6d6',
                border: '1px solid rgba(66,71,83,0.1)',
            }}
        >
            {label}
        </span>
    );
}

// ---------------------------------------------------------------------------
// Pin button
// ---------------------------------------------------------------------------

function PinButton() {
    return (
        <button
            className="transition-colors"
            style={{ color: 'rgba(194,198,214,0.4)' }}
            onMouseEnter={e => (e.currentTarget.style.color = '#afc6ff')}
            onMouseLeave={e => (e.currentTarget.style.color = 'rgba(194,198,214,0.4)')}
        >
            <span className="material-symbols-outlined" style={{ fontSize: 18 }}>push_pin</span>
        </button>
    );
}

// ---------------------------------------------------------------------------
// Generate Spec button
// ---------------------------------------------------------------------------

function GenerateSpecBtn() {
    return (
        <button
            className="flex-1 py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all hover:brightness-110 active:scale-[0.98]"
            style={{ backgroundColor: '#afc6ff', color: '#002d6c' }}
        >
            <span className="material-symbols-outlined" style={{ fontSize: 16 }}>auto_awesome</span>
            Generate Spec
        </button>
    );
}

// ---------------------------------------------------------------------------
// Board card variants
// ---------------------------------------------------------------------------

// Full "Pinned" card with ring, metrics grid, evidence, and actions
function PinnedCardFull() {
    const metrics = [
        { label: 'FREQ', value: 'High',  danger: false },
        { label: 'NEG',  value: '92%',   danger: true  },
        { label: 'REC',  value: 'Today', danger: false },
        { label: 'DIV',  value: '4 Seg', danger: false },
    ];

    return (
        <div
            className="rounded-xl p-4 group cursor-default transition-all"
            style={{ backgroundColor: '#161820', border: '1px solid #1E2028' }}
            onMouseEnter={e => (e.currentTarget.style.borderColor = 'rgba(175,198,255,0.3)')}
            onMouseLeave={e => (e.currentTarget.style.borderColor = '#1E2028')}
        >
            {/* Top row: ring + badges */}
            <div className="flex justify-between items-start mb-4">
                <ScoreRing score={8.7} size={48} strokeWidth={3} radius={20} />
                <div className="flex gap-2">
                    <span
                        className="text-[10px] font-bold px-2 py-0.5 rounded flex items-center gap-1"
                        style={{ backgroundColor: 'rgba(175,198,255,0.12)', color: '#afc6ff' }}
                    >
                        <span
                            className="material-symbols-outlined"
                            style={{ fontSize: 12, fontVariationSettings: "'FILL' 1" }}
                        >
                            push_pin
                        </span>
                        PINNED
                    </span>
                </div>
            </div>

            {/* Title + signals */}
            <h3 className="text-base font-semibold text-[#F0F0F3] mb-1">Onboarding Friction</h3>
            <div className="flex items-center gap-2 mb-4">
                <span className="text-xs" style={{ color: 'rgba(194,198,214,0.6)' }}>23 signals</span>
                <div className="flex -space-x-1.5">
                    {['rgba(59,130,246,0.2)', 'rgba(168,85,247,0.2)', 'rgba(16,185,129,0.2)'].map((bg, i) => (
                        <span
                            key={i}
                            className="w-4 h-4 rounded-full"
                            style={{ backgroundColor: bg, border: '1px solid #111319' }}
                        />
                    ))}
                </div>
            </div>

            {/* Metrics grid */}
            <div className="grid grid-cols-4 gap-2 mb-4">
                {metrics.map(m => (
                    <div
                        key={m.label}
                        className="p-2 rounded text-center"
                        style={{ backgroundColor: '#191b22' }}
                    >
                        <span
                            className="block text-[10px] font-bold mb-0.5"
                            style={{ color: 'rgba(194,198,214,0.4)' }}
                        >
                            {m.label}
                        </span>
                        <span
                            className="text-xs font-semibold"
                            style={{ color: m.danger ? '#ffb4ab' : '#F0F0F3' }}
                        >
                            {m.value}
                        </span>
                    </div>
                ))}
            </div>

            {/* Evidence quote */}
            <div
                className="p-2.5 rounded-lg mb-4"
                style={{
                    backgroundColor: '#0c0e14',
                    border: '1px solid rgba(66,71,83,0.1)',
                }}
            >
                <div className="flex items-center gap-2 mb-1.5">
                    {/* Initials avatar */}
                    <div
                        className="w-4 h-4 rounded-full flex items-center justify-center text-[8px] font-bold text-white flex-shrink-0"
                        style={{ backgroundColor: '#afc6ff' }}
                    >
                        SC
                    </div>
                    <span className="text-[10px] font-medium" style={{ color: '#c2c6d6' }}>
                        Sarah Chen · Enterprise
                    </span>
                </div>
                <p className="text-[11px] italic leading-relaxed" style={{ color: 'rgba(226,226,235,0.7)' }}>
                    &ldquo;The initial workspace setup took us 3 calls. The invited users couldn&rsquo;t see the primary board...&rdquo;
                </p>
            </div>

            {/* Hover actions */}
            <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <GenerateSpecBtn />
                <button
                    className="px-2.5 py-2 rounded-lg transition-colors"
                    style={{ backgroundColor: '#282a30', color: '#c2c6d6' }}
                    onMouseEnter={e => (e.currentTarget.style.color = 'white')}
                    onMouseLeave={e => (e.currentTarget.style.color = '#c2c6d6')}
                >
                    <span className="material-symbols-outlined" style={{ fontSize: 18 }}>close</span>
                </button>
            </div>
        </div>
    );
}

// Simpler pinned card (Card B)
function PinnedCardSimple() {
    return (
        <div
            className="rounded-xl p-4 group cursor-default transition-all"
            style={{ backgroundColor: '#161820', border: '1px solid #1E2028' }}
            onMouseEnter={e => (e.currentTarget.style.borderColor = 'rgba(175,198,255,0.3)')}
            onMouseLeave={e => (e.currentTarget.style.borderColor = '#1E2028')}
        >
            <div className="flex justify-between items-start mb-4">
                <ScoreRing score={7.2} size={48} strokeWidth={3} radius={20} />
            </div>
            <h3 className="text-base font-semibold text-[#F0F0F3] mb-1">Mobile Responsiveness</h3>
            <p className="text-[11px] mb-4" style={{ color: '#c2c6d6' }}>
                Critical layout issues on Safari mobile reported by multiple high-value users.
            </p>
            <div className="flex gap-2">
                <GenerateSpecBtn />
            </div>
        </div>
    );
}

// Investigate card with ring (Card C)
function InvestigateCardRing() {
    return (
        <div
            className="rounded-xl p-4 group cursor-default transition-all"
            style={{ backgroundColor: '#161820', border: '1px solid #1E2028' }}
            onMouseEnter={e => (e.currentTarget.style.borderColor = '#424753')}
            onMouseLeave={e => (e.currentTarget.style.borderColor = '#1E2028')}
        >
            <div className="flex justify-between items-start mb-4">
                <ScoreRing score={7.9} size={40} strokeWidth={2.5} radius={16} />
                <PinButton />
            </div>
            <h3 className="text-sm font-semibold text-[#F0F0F3] mb-2">Search Performance</h3>
            <div className="flex flex-wrap gap-1.5 mb-3">
                <SourceTag label="INTERCOM" />
                <SourceTag label="G2" />
            </div>
            <div
                className="p-2 rounded text-[10px] leading-relaxed"
                style={{
                    backgroundColor: '#0c0e14',
                    borderLeft: '2px solid #528dff',
                    color: 'rgba(194,198,214,0.8)',
                }}
            >
                &ldquo;Lag is becoming unbearable when indexing large tables...&rdquo;
            </div>
        </div>
    );
}

// Investigate / Monitoring compact card
function CompactCard({
    score,
    title,
    description,
    highlight,
    muted,
}: {
    score: number;
    title: string;
    description: string;
    highlight?: boolean;
    muted?: boolean;
}) {
    return (
        <div
            className="rounded-xl p-4 cursor-default transition-all"
            style={{ backgroundColor: '#161820', border: '1px solid #1E2028' }}
            onMouseEnter={e => (e.currentTarget.style.borderColor = '#424753')}
            onMouseLeave={e => (e.currentTarget.style.borderColor = '#1E2028')}
        >
            <div className="flex justify-between items-center mb-3">
                <ScorePill score={score} highlight={highlight} />
                <PinButton />
            </div>
            <h3
                className="text-sm font-semibold mb-1"
                style={{ color: muted ? 'rgba(226,226,235,0.8)' : '#F0F0F3' }}
            >
                {title}
            </h3>
            <p
                className="text-[11px]"
                style={{ color: muted ? 'rgba(194,198,214,0.5)' : 'rgba(194,198,214,0.6)' }}
            >
                {description}
            </p>
        </div>
    );
}

// ---------------------------------------------------------------------------
// Column header
// ---------------------------------------------------------------------------

function ColumnHeader({
    icon,
    label,
    badge,
    iconColor,
    labelColor,
    iconFilled,
}: {
    icon: string;
    label: string;
    badge: string;
    iconColor?: string;
    labelColor?: string;
    iconFilled?: boolean;
}) {
    return (
        <div className="flex items-center justify-between mb-6 px-1">
            <div className="flex items-center gap-2">
                <span
                    className="material-symbols-outlined"
                    style={{
                        fontSize: 18,
                        color: iconColor ?? '#c2c6d6',
                        fontVariationSettings: iconFilled ? "'FILL' 1" : "'FILL' 0",
                    }}
                >
                    {icon}
                </span>
                <h2
                    className="font-semibold text-sm tracking-tight"
                    style={{ color: labelColor ?? '#c2c6d6' }}
                >
                    {label}
                </h2>
            </div>
            <span
                className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                style={{ backgroundColor: '#282a30', color: 'rgba(194,198,214,0.4)' }}
            >
                {badge}
            </span>
        </div>
    );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function BoardPage() {
    return (
        <div className="flex flex-col h-full overflow-hidden" style={{ backgroundColor: '#111319' }}>

            {/* ── Board area (3-column grid) ── */}
            <div className="flex-1 p-8 grid grid-cols-3 gap-8 overflow-hidden">

                {/* ── Column 1: Pinned ── */}
                <section className="flex flex-col h-full overflow-hidden">
                    <ColumnHeader
                        icon="push_pin"
                        label="Pinned"
                        badge="2 THEMES"
                        iconColor="#afc6ff"
                        labelColor="#F0F0F3"
                        iconFilled
                    />
                    <div className="flex-1 overflow-y-auto flex flex-col gap-4 pb-12" style={{ scrollbarWidth: 'none' }}>
                        <PinnedCardFull />
                        <PinnedCardSimple />
                    </div>
                </section>

                {/* ── Column 2: Investigate Next ── */}
                <section className="flex flex-col h-full overflow-hidden">
                    <ColumnHeader
                        icon="arrow_forward_ios"
                        label="Investigate Next"
                        badge="RANKED"
                    />
                    <div className="flex-1 overflow-y-auto flex flex-col gap-4 pb-12" style={{ scrollbarWidth: 'none' }}>
                        <InvestigateCardRing />
                        <CompactCard
                            score={6.8}
                            title="API Documentation"
                            description="Missing webhooks documentation causing developer friction during trial."
                            highlight
                        />
                        <CompactCard
                            score={6.1}
                            title="Billing Confusion"
                            description="Users unsure how seat allocation reflects on invoice."
                        />
                    </div>
                </section>

                {/* ── Column 3: Monitoring ── */}
                <section className="flex flex-col h-full overflow-hidden">
                    <ColumnHeader
                        icon="visibility"
                        label="Monitoring"
                        badge="LOW PRIORITY"
                    />
                    <div
                        className="flex-1 overflow-y-auto flex flex-col gap-4 pb-12 transition-opacity"
                        style={{ scrollbarWidth: 'none', opacity: 0.8 }}
                        onMouseEnter={e => (e.currentTarget.style.opacity = '1')}
                        onMouseLeave={e => (e.currentTarget.style.opacity = '0.8')}
                    >
                        <CompactCard
                            score={5.4}
                            title="Data Export"
                            description="Request for CSV format alongside current JSON export."
                            muted
                        />
                        <CompactCard
                            score={3.8}
                            title="Dark Mode Demand"
                            description="Occasional tweets from community asking for UI themes."
                            muted
                        />
                    </div>
                </section>

            </div>

            {/* ── Fade-out gradient at bottom ── */}
            <div
                className="pointer-events-none absolute bottom-0 left-0 right-0 h-24"
                style={{ background: 'linear-gradient(to top, #111319, transparent)' }}
            />
        </div>
    );
}
