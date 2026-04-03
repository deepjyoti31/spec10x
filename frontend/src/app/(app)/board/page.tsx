'use client';

import React, { useEffect } from 'react';

import { useBoard } from '@/hooks/useBoard';
import { useToast } from '@/components/ui/Toast';
import { BoardThemeCardResponse } from '@/lib/api';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const SOURCE_COLORS: Record<string, string> = {
    interview:  'rgba(59,130,246,0.2)',
    support:    'rgba(168,85,247,0.2)',
    survey:     'rgba(16,185,129,0.2)',
    analytics:  'rgba(234,179,8,0.2)',
};

function freqLabel(count: number): string {
    if (count >= 15) return 'High';
    if (count >= 5)  return 'Med';
    return 'Low';
}

function recencyLabel(isoDate?: string): string {
    if (!isoDate) return '—';
    const days = Math.floor((Date.now() - new Date(isoDate).getTime()) / 86_400_000);
    if (days === 0) return 'Today';
    if (days === 1) return 'Yday';
    return `${days}d ago`;
}

function initials(name?: string | null): string {
    if (!name) return '??';
    return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
}

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
    const offset = circumference - (score / 10) * circumference;
    const cx = size / 2;
    const cy = size / 2;

    return (
        <div className="relative flex items-center justify-center flex-shrink-0" style={{ width: size, height: size }}>
            <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
                <circle cx={cx} cy={cy} r={radius} fill="transparent" stroke="#282a30" strokeWidth={strokeWidth} />
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
            <span className="absolute font-bold" style={{ fontSize: size >= 48 ? 11 : 10, color: '#F0F0F3' }}>
                {score.toFixed(1)}
            </span>
        </div>
    );
}

// ---------------------------------------------------------------------------
// Score pill
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
            SCORE {score.toFixed(1)}
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
            style={{ backgroundColor: '#1e1f26', color: '#c2c6d6', border: '1px solid rgba(66,71,83,0.1)' }}
        >
            {label}
        </span>
    );
}

// ---------------------------------------------------------------------------
// Pin button
// ---------------------------------------------------------------------------

function PinButton({ onClick }: { onClick: () => void }) {
    return (
        <button
            onClick={onClick}
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
// Pinned card — full (first pinned theme)
// ---------------------------------------------------------------------------

function PinnedCardFull({ theme, onUnpin }: { theme: BoardThemeCardResponse; onUnpin: () => void }) {
    const score = theme.impact_score ?? 0;
    const firstEvidence = theme.evidence_preview[0];

    const metrics = [
        { label: 'FREQ', value: freqLabel(theme.mention_count),                                danger: false },
        { label: 'NEG',  value: `${Math.round(theme.sentiment_negative * 100)}%`,              danger: theme.sentiment_negative > 0.5 },
        { label: 'REC',  value: recencyLabel(firstEvidence?.occurred_at),                      danger: false },
        { label: 'DIV',  value: `${theme.source_breakdown.length || 1} Seg`,                   danger: false },
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
                <ScoreRing score={score} size={48} strokeWidth={3} radius={20} />
                <div className="flex gap-2">
                    <span
                        className="text-[10px] font-bold px-2 py-0.5 rounded flex items-center gap-1"
                        style={{ backgroundColor: 'rgba(175,198,255,0.12)', color: '#afc6ff' }}
                    >
                        <span className="material-symbols-outlined" style={{ fontSize: 12, fontVariationSettings: "'FILL' 1" }}>
                            push_pin
                        </span>
                        PINNED
                    </span>
                </div>
            </div>

            {/* Title + signals */}
            <h3 className="text-base font-semibold text-[#F0F0F3] mb-1">{theme.name}</h3>
            <div className="flex items-center gap-2 mb-4">
                <span className="text-xs" style={{ color: 'rgba(194,198,214,0.6)' }}>{theme.mention_count} signals</span>
                <div className="flex -space-x-1.5">
                    {theme.source_breakdown.slice(0, 4).map(s => (
                        <span
                            key={s.source_type}
                            className="w-4 h-4 rounded-full"
                            style={{ backgroundColor: SOURCE_COLORS[s.source_type] ?? 'rgba(100,100,100,0.2)', border: '1px solid #111319' }}
                        />
                    ))}
                </div>
            </div>

            {/* Metrics grid */}
            <div className="grid grid-cols-4 gap-2 mb-4">
                {metrics.map(m => (
                    <div key={m.label} className="p-2 rounded text-center" style={{ backgroundColor: '#191b22' }}>
                        <span className="block text-[10px] font-bold mb-0.5" style={{ color: 'rgba(194,198,214,0.4)' }}>{m.label}</span>
                        <span className="text-xs font-semibold" style={{ color: m.danger ? '#ffb4ab' : '#F0F0F3' }}>{m.value}</span>
                    </div>
                ))}
            </div>

            {/* Evidence quote */}
            {firstEvidence && (
                <div
                    className="p-2.5 rounded-lg mb-4"
                    style={{ backgroundColor: '#0c0e14', border: '1px solid rgba(66,71,83,0.1)' }}
                >
                    <div className="flex items-center gap-2 mb-1.5">
                        <div
                            className="w-4 h-4 rounded-full flex items-center justify-center text-[8px] font-bold text-white flex-shrink-0"
                            style={{ backgroundColor: '#afc6ff' }}
                        >
                            {initials(firstEvidence.author_or_speaker)}
                        </div>
                        <span className="text-[10px] font-medium" style={{ color: '#c2c6d6' }}>
                            {firstEvidence.author_or_speaker ?? 'Unknown'} · {firstEvidence.source_label}
                        </span>
                    </div>
                    <p className="text-[11px] italic leading-relaxed" style={{ color: 'rgba(226,226,235,0.7)' }}>
                        &ldquo;{firstEvidence.excerpt}&rdquo;
                    </p>
                </div>
            )}

            {/* Hover actions */}
            <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <GenerateSpecBtn />
                <button
                    onClick={onUnpin}
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

// ---------------------------------------------------------------------------
// Pinned card — simple (subsequent pinned themes)
// ---------------------------------------------------------------------------

function PinnedCardSimple({ theme }: { theme: BoardThemeCardResponse }) {
    const score = theme.impact_score ?? 0;
    const preview = theme.evidence_preview[0]?.excerpt ?? theme.description ?? '';

    return (
        <div
            className="rounded-xl p-4 group cursor-default transition-all"
            style={{ backgroundColor: '#161820', border: '1px solid #1E2028' }}
            onMouseEnter={e => (e.currentTarget.style.borderColor = 'rgba(175,198,255,0.3)')}
            onMouseLeave={e => (e.currentTarget.style.borderColor = '#1E2028')}
        >
            <div className="flex justify-between items-start mb-4">
                <ScoreRing score={score} size={48} strokeWidth={3} radius={20} />
            </div>
            <h3 className="text-base font-semibold text-[#F0F0F3] mb-1">{theme.name}</h3>
            {preview && (
                <p className="text-[11px] mb-4 line-clamp-2" style={{ color: '#c2c6d6' }}>{preview}</p>
            )}
            <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <GenerateSpecBtn />
            </div>
        </div>
    );
}

// ---------------------------------------------------------------------------
// Investigate card with ring (first investigate theme)
// ---------------------------------------------------------------------------

function InvestigateCardRing({ theme, onPin }: { theme: BoardThemeCardResponse; onPin: () => void }) {
    const score = theme.impact_score ?? 0;
    const quote = theme.evidence_preview[0]?.excerpt;

    return (
        <div
            className="rounded-xl p-4 group cursor-default transition-all"
            style={{ backgroundColor: '#161820', border: '1px solid #1E2028' }}
            onMouseEnter={e => (e.currentTarget.style.borderColor = '#424753')}
            onMouseLeave={e => (e.currentTarget.style.borderColor = '#1E2028')}
        >
            <div className="flex justify-between items-start mb-4">
                <ScoreRing score={score} size={40} strokeWidth={2.5} radius={16} />
                <PinButton onClick={onPin} />
            </div>
            <h3 className="text-sm font-semibold text-[#F0F0F3] mb-2">{theme.name}</h3>
            {theme.source_breakdown.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mb-3">
                    {theme.source_breakdown.slice(0, 3).map(s => (
                        <SourceTag key={s.source_type} label={s.label.toUpperCase()} />
                    ))}
                </div>
            )}
            {quote && (
                <div
                    className="p-2 rounded text-[10px] leading-relaxed"
                    style={{ backgroundColor: '#0c0e14', borderLeft: '2px solid #528dff', color: 'rgba(194,198,214,0.8)' }}
                >
                    &ldquo;{quote}&rdquo;
                </div>
            )}
        </div>
    );
}

// ---------------------------------------------------------------------------
// Compact card (remaining investigate + all monitoring)
// ---------------------------------------------------------------------------

function CompactCard({
    theme,
    highlight,
    muted,
    onPin,
}: {
    theme: BoardThemeCardResponse;
    highlight?: boolean;
    muted?: boolean;
    onPin: () => void;
}) {
    const score = theme.impact_score ?? 0;
    const description = theme.evidence_preview[0]?.excerpt ?? theme.description ?? '';

    return (
        <div
            className="rounded-xl p-4 cursor-default transition-all"
            style={{ backgroundColor: '#161820', border: '1px solid #1E2028' }}
            onMouseEnter={e => (e.currentTarget.style.borderColor = '#424753')}
            onMouseLeave={e => (e.currentTarget.style.borderColor = '#1E2028')}
        >
            <div className="flex justify-between items-center mb-3">
                <ScorePill score={score} highlight={highlight} />
                <PinButton onClick={onPin} />
            </div>
            <h3
                className="text-sm font-semibold mb-1"
                style={{ color: muted ? 'rgba(226,226,235,0.8)' : '#F0F0F3' }}
            >
                {theme.name}
            </h3>
            {description && (
                <p
                    className="text-[11px] line-clamp-2"
                    style={{ color: muted ? 'rgba(194,198,214,0.5)' : 'rgba(194,198,214,0.6)' }}
                >
                    {description}
                </p>
            )}
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
                <h2 className="font-semibold text-sm tracking-tight" style={{ color: labelColor ?? '#c2c6d6' }}>
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
// Skeleton card
// ---------------------------------------------------------------------------

function CardSkeleton() {
    return (
        <div
            className="rounded-xl p-4"
            style={{ backgroundColor: '#161820', border: '1px solid #1E2028' }}
        >
            <div className="flex justify-between items-start mb-4">
                <div className="w-12 h-12 rounded-full animate-pulse" style={{ backgroundColor: '#282a30' }} />
                <div className="w-14 h-4 rounded animate-pulse" style={{ backgroundColor: '#282a30' }} />
            </div>
            <div className="w-36 h-4 rounded animate-pulse mb-2" style={{ backgroundColor: '#282a30' }} />
            <div className="w-full h-3 rounded animate-pulse mb-1.5" style={{ backgroundColor: '#282a30' }} />
            <div className="w-3/4 h-3 rounded animate-pulse" style={{ backgroundColor: '#282a30' }} />
        </div>
    );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function BoardPage() {
    const { showToast } = useToast();
    const { pinned, investigate, monitoring, loading, error, pinTheme, unpinTheme } = useBoard();

    useEffect(() => {
        if (error) showToast(`Failed to load board: ${error}`, 'error');
    }, [error, showToast]);

    const handlePin = async (id: string) => {
        try { await pinTheme(id); }
        catch (err) { showToast(err instanceof Error ? err.message : 'Failed to pin theme', 'error'); }
    };

    const handleUnpin = async (id: string) => {
        try { await unpinTheme(id); }
        catch (err) { showToast(err instanceof Error ? err.message : 'Failed to unpin theme', 'error'); }
    };

    const pinnedBadge   = loading ? '—' : `${pinned.length} THEME${pinned.length === 1 ? '' : 'S'}`;
    const investigateBadge = loading ? '—' : `${investigate.length} THEME${investigate.length === 1 ? '' : 'S'}`;
    const monitoringBadge  = loading ? '—' : `${monitoring.length} THEME${monitoring.length === 1 ? '' : 'S'}`;

    return (
        <div className="flex flex-col h-full overflow-hidden" style={{ backgroundColor: '#111319' }}>

            {/* ── Board area (3-column grid) ── */}
            <div className="flex-1 p-8 grid grid-cols-3 gap-8 overflow-hidden">

                {/* ── Column 1: Pinned ── */}
                <section className="flex flex-col h-full overflow-hidden">
                    <ColumnHeader
                        icon="push_pin"
                        label="Pinned"
                        badge={pinnedBadge}
                        iconColor="#afc6ff"
                        labelColor="#F0F0F3"
                        iconFilled
                    />
                    <div className="flex-1 overflow-y-auto flex flex-col gap-4 pb-12" style={{ scrollbarWidth: 'none' }}>
                        {loading ? (
                            [0, 1].map(i => <CardSkeleton key={i} />)
                        ) : pinned.length === 0 ? (
                            <p className="text-xs text-[#5A5C66] px-1">No pinned themes yet. Pin a theme to track it here.</p>
                        ) : (
                            pinned.map((theme, i) =>
                                i === 0
                                    ? <PinnedCardFull key={theme.id} theme={theme} onUnpin={() => handleUnpin(theme.id)} />
                                    : <PinnedCardSimple key={theme.id} theme={theme} />
                            )
                        )}
                    </div>
                </section>

                {/* ── Column 2: Investigate Next ── */}
                <section className="flex flex-col h-full overflow-hidden">
                    <ColumnHeader
                        icon="arrow_forward_ios"
                        label="Investigate Next"
                        badge={investigateBadge}
                    />
                    <div className="flex-1 overflow-y-auto flex flex-col gap-4 pb-12" style={{ scrollbarWidth: 'none' }}>
                        {loading ? (
                            [0, 1, 2].map(i => <CardSkeleton key={i} />)
                        ) : investigate.length === 0 ? (
                            <p className="text-xs text-[#5A5C66] px-1">No themes to investigate.</p>
                        ) : (
                            investigate.map((theme, i) =>
                                i === 0
                                    ? <InvestigateCardRing key={theme.id} theme={theme} onPin={() => handlePin(theme.id)} />
                                    : <CompactCard key={theme.id} theme={theme} highlight onPin={() => handlePin(theme.id)} />
                            )
                        )}
                    </div>
                </section>

                {/* ── Column 3: Monitoring ── */}
                <section className="flex flex-col h-full overflow-hidden">
                    <ColumnHeader
                        icon="visibility"
                        label="Monitoring"
                        badge={monitoringBadge}
                    />
                    <div
                        className="flex-1 overflow-y-auto flex flex-col gap-4 pb-12 transition-opacity"
                        style={{ scrollbarWidth: 'none', opacity: 0.8 }}
                        onMouseEnter={e => (e.currentTarget.style.opacity = '1')}
                        onMouseLeave={e => (e.currentTarget.style.opacity = '0.8')}
                    >
                        {loading ? (
                            [0, 1].map(i => <CardSkeleton key={i} />)
                        ) : monitoring.length === 0 ? (
                            <p className="text-xs text-[#5A5C66] px-1">No themes in monitoring.</p>
                        ) : (
                            monitoring.map(theme => (
                                <CompactCard key={theme.id} theme={theme} muted onPin={() => handlePin(theme.id)} />
                            ))
                        )}
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
