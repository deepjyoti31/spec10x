'use client';

import React, { useEffect, useRef, useState } from 'react';
import Link from 'next/link';

import { useBoard } from '@/hooks/useBoard';
import { useToast } from '@/components/ui/Toast';
import { BoardThemeCardResponse, ThemePriorityState } from '@/lib/api';

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

function formatBreakdownLabel(value: number | undefined, max: number): string {
    return `${(value ?? 0).toFixed(1)}/${max}`;
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
    const offset = circumference - (score / 100) * circumference;
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
                {(score / 10).toFixed(1)}
            </span>
        </div>
    );
}

// ---------------------------------------------------------------------------
// Metrics grid — 4-column breakdown shown on all cards
// ---------------------------------------------------------------------------

function MetricsGrid({ theme, compact = false }: { theme: BoardThemeCardResponse; compact?: boolean }) {
    const firstEvidence = theme.evidence_preview[0];
    const metrics = [
        { label: 'FREQ', value: freqLabel(theme.mention_count),                           danger: false },
        { label: 'NEG',  value: `${Math.round(theme.sentiment_negative * 100)}%`,          danger: theme.sentiment_negative > 0.5 },
        { label: 'REC',  value: recencyLabel(firstEvidence?.occurred_at),                  danger: false },
        { label: 'DIV',  value: `${theme.source_breakdown.length || 1}S`,                  danger: false },
    ];

    return (
        <div className={`grid grid-cols-4 gap-1.5 ${compact ? 'mb-2' : 'mb-4'}`}>
            {metrics.map(m => (
                <div
                    key={m.label}
                    className="p-1.5 rounded text-center"
                    style={{ backgroundColor: '#191b22' }}
                >
                    <span className="block font-bold mb-0.5" style={{ fontSize: 9, color: 'rgba(194,198,214,0.4)' }}>{m.label}</span>
                    <span className="font-semibold" style={{ fontSize: compact ? 10 : 11, color: m.danger ? '#ffb4ab' : '#F0F0F3' }}>{m.value}</span>
                </div>
            ))}
        </div>
    );
}

function ImpactBreakdownStrip({
    theme,
    compact = false,
}: {
    theme: BoardThemeCardResponse;
    compact?: boolean;
}) {
    const breakdown = theme.impact_breakdown;
    const items = [
        { label: 'FREQ', value: formatBreakdownLabel(breakdown?.frequency, 40), color: '#afc6ff' },
        { label: 'NEG', value: formatBreakdownLabel(breakdown?.negative, 25), color: '#ffb4ab' },
        { label: 'REC', value: formatBreakdownLabel(breakdown?.recency, 20), color: '#ffb77b' },
        { label: 'DIV', value: formatBreakdownLabel(breakdown?.source_diversity, 15), color: '#34D399' },
    ];

    return (
        <div className={compact ? 'mb-3' : 'mb-4'}>
            <div className="text-[9px] font-bold uppercase tracking-widest mb-2" style={{ color: 'rgba(194,198,214,0.4)' }}>
                Why This Rank
            </div>
            <div className="flex flex-wrap gap-1.5">
                {items.map(item => (
                    <span
                        key={item.label}
                        className="text-[9px] px-1.5 py-1 rounded"
                        style={{ backgroundColor: '#1e1f26', color: item.color, border: '1px solid rgba(66,71,83,0.14)' }}
                    >
                        {item.label} {item.value}
                    </span>
                ))}
            </div>
            {theme.score_change && (
                <p className="text-[10px] leading-relaxed mt-2" style={{ color: 'rgba(194,198,214,0.55)' }}>
                    {theme.score_change.explanation}
                </p>
            )}
        </div>
    );
}

// ---------------------------------------------------------------------------
// Trend badge — signal volume direction over the last two 14-day windows
// ---------------------------------------------------------------------------

const TREND_DISPLAY: Record<string, { icon: string; label: string; color: string; bg: string }> = {
    rising:    { icon: 'trending_up',   label: 'Rising',    color: '#ffb77b', bg: 'rgba(255,183,123,0.1)' },
    flat:      { icon: 'trending_flat', label: 'Flat',      color: '#8B8D97', bg: 'rgba(139,141,151,0.1)' },
    declining: { icon: 'trending_down', label: 'Declining', color: '#34D399', bg: 'rgba(52,211,153,0.1)' },
};

function TrendBadge({ theme }: { theme: BoardThemeCardResponse }) {
    const trend = theme.trend;
    if (!trend) return null;
    const display = TREND_DISPLAY[trend.direction] ?? TREND_DISPLAY.flat;

    return (
        <span
            className="text-[9px] font-bold px-1.5 py-0.5 rounded flex items-center gap-1 uppercase tracking-wider"
            style={{ backgroundColor: display.bg, color: display.color }}
            title={`${trend.recent_count} signals in the last ${trend.window_days} days vs ${trend.previous_count} before — evidence volume, not proven impact`}
        >
            <span className="material-symbols-outlined" style={{ fontSize: 12 }}>{display.icon}</span>
            {display.label}
        </span>
    );
}

// ---------------------------------------------------------------------------
// View in Insights link
// ---------------------------------------------------------------------------

function ViewInInsightsLink({ themeId }: { themeId: string }) {
    return (
        <Link
            href={`/insights?theme=${themeId}`}
            className="text-[10px] font-medium flex items-center gap-0.5 transition-colors w-fit"
            style={{ color: 'rgba(175,198,255,0.5)' }}
            onMouseEnter={e => (e.currentTarget.style.color = '#afc6ff')}
            onMouseLeave={e => (e.currentTarget.style.color = 'rgba(175,198,255,0.5)')}
        >
            View in Insights
            <span className="material-symbols-outlined" style={{ fontSize: 12 }}>arrow_forward</span>
        </Link>
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
// Merge button — folds this theme into another one, picked from a dropdown
// ---------------------------------------------------------------------------

function MergeButton({
    theme,
    otherThemes,
    onMerge,
}: {
    theme: BoardThemeCardResponse;
    otherThemes: BoardThemeCardResponse[];
    onMerge: (targetThemeId: string) => void;
}) {
    const [open, setOpen] = useState(false);

    if (otherThemes.length === 0) return null;

    return (
        <div className="relative">
            <button
                onClick={e => { e.stopPropagation(); setOpen(v => !v); }}
                className="transition-colors"
                style={{ color: 'rgba(194,198,214,0.4)' }}
                onMouseEnter={e => (e.currentTarget.style.color = '#afc6ff')}
                onMouseLeave={e => (e.currentTarget.style.color = 'rgba(194,198,214,0.4)')}
                title="Merge this theme into another"
            >
                <span className="material-symbols-outlined" style={{ fontSize: 18 }}>call_merge</span>
            </button>
            {open && (
                <div
                    className="absolute right-0 top-full z-30 mt-1 min-w-[200px] overflow-hidden rounded"
                    style={{ backgroundColor: '#161820', border: '1px solid #1E2028', boxShadow: '0 18px 45px rgba(0,0,0,0.35)' }}
                    onMouseLeave={() => setOpen(false)}
                >
                    <div className="px-3 py-2 text-[9px] font-bold uppercase tracking-widest" style={{ color: '#5A5C66' }}>
                        Merge &ldquo;{theme.name}&rdquo; into
                    </div>
                    {otherThemes.map(other => (
                        <button
                            key={other.id}
                            className="block w-full px-3 py-2 text-left text-xs text-[#c8cad6] transition-colors hover:bg-[#1E2028]"
                            onClick={e => {
                                e.stopPropagation();
                                setOpen(false);
                                if (window.confirm(`Merge "${theme.name}" into "${other.name}"? All evidence and insights move to "${other.name}".`)) {
                                    onMerge(other.id);
                                }
                            }}
                        >
                            {other.name}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}

// ---------------------------------------------------------------------------
// Generate Spec button — disabled, Coming Soon
// ---------------------------------------------------------------------------

function GenerateSpecBtn() {
    return (
        <div className="flex-1 relative">
            <button
                disabled
                className="w-full py-2 rounded text-xs font-bold flex items-center justify-center gap-1.5 cursor-not-allowed"
                style={{ backgroundColor: '#1e2028', color: 'rgba(194,198,214,0.3)', border: '1px solid rgba(66,71,83,0.3)' }}
            >
                <span className="material-symbols-outlined" style={{ fontSize: 16 }}>auto_awesome</span>
                Generate Spec
            </button>
            <span
                className="absolute -top-2 -right-1 text-[9px] font-bold px-1.5 py-0.5 rounded-full"
                style={{ backgroundColor: '#282a30', color: 'rgba(194,198,214,0.5)', border: '1px solid rgba(66,71,83,0.4)' }}
            >
                SOON
            </span>
        </div>
    );
}

// ---------------------------------------------------------------------------
// Pinned card — full (first pinned theme)
// ---------------------------------------------------------------------------

function PinnedCardFull({
    theme,
    onDragStart,
}: {
    theme: BoardThemeCardResponse;
    onDragStart: (e: React.DragEvent) => void;
}) {
    const score = theme.impact_score ?? 0;
    const firstEvidence = theme.evidence_preview[0];

    return (
        <div
            draggable
            onDragStart={onDragStart}
            className="rounded-xl p-4 group cursor-grab active:cursor-grabbing transition-all"
            style={{ backgroundColor: '#161820', border: '1px solid #1E2028' }}
            onMouseEnter={e => (e.currentTarget.style.borderColor = 'rgba(175,198,255,0.3)')}
            onMouseLeave={e => (e.currentTarget.style.borderColor = '#1E2028')}
        >
            {/* Top row: ring + badges */}
            <div className="flex justify-between items-start mb-4">
                <ScoreRing score={score} size={48} strokeWidth={3} radius={20} />
                <div className="flex gap-2 items-center">
                    <TrendBadge theme={theme} />
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
            <MetricsGrid theme={theme} />
            <ImpactBreakdownStrip theme={theme} />

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

            {/* View in Insights */}
            <div className="mb-3">
                <ViewInInsightsLink themeId={theme.id} />
            </div>

            {/* Generate Spec */}
            <div className="flex gap-2">
                <GenerateSpecBtn />
            </div>
        </div>
    );
}

// ---------------------------------------------------------------------------
// Pinned card — simple (subsequent pinned themes)
// ---------------------------------------------------------------------------

function PinnedCardSimple({
    theme,
    onDragStart,
}: {
    theme: BoardThemeCardResponse;
    onDragStart: (e: React.DragEvent) => void;
}) {
    const score = theme.impact_score ?? 0;

    return (
        <div
            draggable
            onDragStart={onDragStart}
            className="rounded-xl p-4 group cursor-grab active:cursor-grabbing transition-all"
            style={{ backgroundColor: '#161820', border: '1px solid #1E2028' }}
            onMouseEnter={e => (e.currentTarget.style.borderColor = 'rgba(175,198,255,0.3)')}
            onMouseLeave={e => (e.currentTarget.style.borderColor = '#1E2028')}
        >
            <div className="flex justify-between items-start mb-4">
                <ScoreRing score={score} size={48} strokeWidth={3} radius={20} />
                <TrendBadge theme={theme} />
            </div>
            <h3 className="text-base font-semibold text-[#F0F0F3] mb-3">{theme.name}</h3>
            <MetricsGrid theme={theme} />
            <ImpactBreakdownStrip theme={theme} />
            <div className="mb-3">
                <ViewInInsightsLink themeId={theme.id} />
            </div>
            <div className="flex gap-2">
                <GenerateSpecBtn />
            </div>
        </div>
    );
}

// ---------------------------------------------------------------------------
// Investigate card with ring (first investigate theme)
// ---------------------------------------------------------------------------

function InvestigateCardRing({
    theme,
    otherThemes,
    onPin,
    onMerge,
    onDragStart,
}: {
    theme: BoardThemeCardResponse;
    otherThemes: BoardThemeCardResponse[];
    onPin: () => void;
    onMerge: (targetThemeId: string) => void;
    onDragStart: (e: React.DragEvent) => void;
}) {
    const score = theme.impact_score ?? 0;
    const quote = theme.evidence_preview[0]?.excerpt;

    return (
        <div
            draggable
            onDragStart={onDragStart}
            className="rounded-xl p-4 group cursor-grab active:cursor-grabbing transition-all"
            style={{ backgroundColor: '#161820', border: '1px solid #1E2028' }}
            onMouseEnter={e => (e.currentTarget.style.borderColor = '#424753')}
            onMouseLeave={e => (e.currentTarget.style.borderColor = '#1E2028')}
        >
            <div className="flex justify-between items-start mb-4">
                <ScoreRing score={score} size={48} strokeWidth={3} radius={20} />
                <div className="flex gap-2 items-center">
                    <TrendBadge theme={theme} />
                    <MergeButton theme={theme} otherThemes={otherThemes} onMerge={onMerge} />
                    <PinButton onClick={onPin} />
                </div>
            </div>
            <h3 className="text-sm font-semibold text-[#F0F0F3] mb-3">{theme.name}</h3>
            {theme.source_breakdown.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mb-3">
                    {theme.source_breakdown.slice(0, 3).map(s => (
                        <SourceTag key={s.source_type} label={s.label.toUpperCase()} />
                    ))}
                </div>
            )}
            <MetricsGrid theme={theme} compact />
            <ImpactBreakdownStrip theme={theme} compact />
            {quote && (
                <div
                    className="p-2 rounded text-[10px] leading-relaxed mb-3"
                    style={{ backgroundColor: '#0c0e14', borderLeft: '2px solid #528dff', color: 'rgba(194,198,214,0.8)' }}
                >
                    &ldquo;{quote}&rdquo;
                </div>
            )}
            <ViewInInsightsLink themeId={theme.id} />
        </div>
    );
}

// ---------------------------------------------------------------------------
// Compact card (remaining investigate + all monitoring)
// ---------------------------------------------------------------------------

function CompactCard({
    theme,
    otherThemes,
    muted,
    onPin,
    onMerge,
    onDragStart,
}: {
    theme: BoardThemeCardResponse;
    otherThemes: BoardThemeCardResponse[];
    muted?: boolean;
    onPin: () => void;
    onMerge: (targetThemeId: string) => void;
    onDragStart: (e: React.DragEvent) => void;
}) {
    const score = theme.impact_score ?? 0;

    return (
        <div
            draggable
            onDragStart={onDragStart}
            className="rounded-xl p-4 cursor-grab active:cursor-grabbing transition-all"
            style={{ backgroundColor: '#161820', border: '1px solid #1E2028' }}
            onMouseEnter={e => (e.currentTarget.style.borderColor = '#424753')}
            onMouseLeave={e => (e.currentTarget.style.borderColor = '#1E2028')}
        >
            <div className="flex justify-between items-start mb-4">
                <ScoreRing score={score} size={48} strokeWidth={3} radius={20} />
                <div className="flex gap-2 items-center">
                    <TrendBadge theme={theme} />
                    <MergeButton theme={theme} otherThemes={otherThemes} onMerge={onMerge} />
                    <PinButton onClick={onPin} />
                </div>
            </div>
            <h3
                className="text-sm font-semibold mb-3"
                style={{ color: muted ? 'rgba(226,226,235,0.8)' : '#F0F0F3' }}
            >
                {theme.name}
            </h3>
            <MetricsGrid theme={theme} compact />
            <ImpactBreakdownStrip theme={theme} compact />
            <ViewInInsightsLink themeId={theme.id} />
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
// Column drop zone wrapper
// ---------------------------------------------------------------------------

function DroppableColumn({
    column,
    onDrop,
    children,
    className,
    style,
    onMouseEnter,
    onMouseLeave,
}: {
    column: ThemePriorityState;
    onDrop: (themeId: string, targetColumn: ThemePriorityState) => void;
    children: React.ReactNode;
    className?: string;
    style?: React.CSSProperties;
    onMouseEnter?: (e: React.MouseEvent<HTMLDivElement>) => void;
    onMouseLeave?: (e: React.MouseEvent<HTMLDivElement>) => void;
}) {
    const [isDragOver, setIsDragOver] = useState(false);

    return (
        <div
            className={className}
            style={{
                ...style,
                outline: isDragOver ? '2px dashed rgba(175,198,255,0.3)' : '2px dashed transparent',
                borderRadius: 12,
                transition: 'outline 150ms ease',
            }}
            onMouseEnter={onMouseEnter}
            onMouseLeave={onMouseLeave}
            onDragOver={e => { e.preventDefault(); setIsDragOver(true); }}
            onDragLeave={e => {
                if (!e.currentTarget.contains(e.relatedTarget as Node)) {
                    setIsDragOver(false);
                }
            }}
            onDrop={e => {
                e.preventDefault();
                setIsDragOver(false);
                const themeId = e.dataTransfer.getData('text/plain');
                if (themeId) onDrop(themeId, column);
            }}
        >
            {children}
        </div>
    );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function BoardPage() {
    const { showToast } = useToast();
    const { allThemes, pinned, investigate, monitoring, loading, error, moveTheme, mergeThemes } = useBoard();
    const dragThemeId = useRef<string | null>(null);
    const dragSourceColumn = useRef<ThemePriorityState | null>(null);

    useEffect(() => {
        if (error) showToast(`Failed to load board: ${error}`, 'error');
    }, [error, showToast]);

    const handleDragStart = (themeId: string, sourceColumn: ThemePriorityState) =>
        (e: React.DragEvent) => {
            dragThemeId.current = themeId;
            dragSourceColumn.current = sourceColumn;
            e.dataTransfer.setData('text/plain', themeId);
            e.dataTransfer.effectAllowed = 'move';
        };

    const handleDrop = async (themeId: string, targetColumn: ThemePriorityState) => {
        if (!themeId || dragSourceColumn.current === targetColumn) return;
        try {
            await moveTheme(themeId, targetColumn);
        } catch (err) {
            showToast(err instanceof Error ? err.message : 'Failed to move theme', 'error');
        } finally {
            dragThemeId.current = null;
            dragSourceColumn.current = null;
        }
    };

    const handlePin = async (id: string) => {
        try { await moveTheme(id, 'pinned'); }
        catch (err) { showToast(err instanceof Error ? err.message : 'Failed to pin theme', 'error'); }
    };

    const handleMerge = async (sourceThemeId: string, targetThemeId: string) => {
        try {
            await mergeThemes(sourceThemeId, targetThemeId);
            showToast('Themes merged', 'success');
        } catch (err) {
            showToast(err instanceof Error ? err.message : 'Failed to merge themes', 'error');
        }
    };

    const pinnedBadge      = loading ? '—' : `${pinned.length} THEME${pinned.length === 1 ? '' : 'S'}`;
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
                    <DroppableColumn
                        column="pinned"
                        onDrop={handleDrop}
                        className="flex-1 overflow-y-auto flex flex-col gap-4 pb-12"
                        style={{ scrollbarWidth: 'none' } as React.CSSProperties}
                    >
                        {loading ? (
                            [0, 1].map(i => <CardSkeleton key={i} />)
                        ) : pinned.length === 0 ? (
                            <p className="text-xs text-[#5A5C66] px-1">No pinned themes yet. Pin a theme to track it here.</p>
                        ) : (
                            pinned.map((theme, i) =>
                                i === 0
                                    ? <PinnedCardFull
                                        key={theme.id}
                                        theme={theme}
                                        onDragStart={handleDragStart(theme.id, 'pinned')}
                                      />
                                    : <PinnedCardSimple
                                        key={theme.id}
                                        theme={theme}
                                        onDragStart={handleDragStart(theme.id, 'pinned')}
                                      />
                            )
                        )}
                    </DroppableColumn>
                </section>

                {/* ── Column 2: Investigate Next ── */}
                <section className="flex flex-col h-full overflow-hidden">
                    <ColumnHeader
                        icon="arrow_forward_ios"
                        label="Investigate Next"
                        badge={investigateBadge}
                    />
                    <DroppableColumn
                        column="default"
                        onDrop={handleDrop}
                        className="flex-1 overflow-y-auto flex flex-col gap-4 pb-12"
                        style={{ scrollbarWidth: 'none' } as React.CSSProperties}
                    >
                        {loading ? (
                            [0, 1, 2].map(i => <CardSkeleton key={i} />)
                        ) : investigate.length === 0 ? (
                            <p className="text-xs text-[#5A5C66] px-1">No themes to investigate.</p>
                        ) : (
                            investigate.map((theme, i) =>
                                i === 0
                                    ? <InvestigateCardRing
                                        key={theme.id}
                                        theme={theme}
                                        otherThemes={allThemes.filter(t => t.id !== theme.id)}
                                        onPin={() => handlePin(theme.id)}
                                        onMerge={(targetId) => handleMerge(theme.id, targetId)}
                                        onDragStart={handleDragStart(theme.id, 'default')}
                                      />
                                    : <CompactCard
                                        key={theme.id}
                                        theme={theme}
                                        otherThemes={allThemes.filter(t => t.id !== theme.id)}
                                        onPin={() => handlePin(theme.id)}
                                        onMerge={(targetId) => handleMerge(theme.id, targetId)}
                                        onDragStart={handleDragStart(theme.id, 'default')}
                                      />
                            )
                        )}
                    </DroppableColumn>
                </section>

                {/* ── Column 3: Monitoring ── */}
                <section className="flex flex-col h-full overflow-hidden">
                    <ColumnHeader
                        icon="visibility"
                        label="Monitoring"
                        badge={monitoringBadge}
                    />
                    <DroppableColumn
                        column="monitoring"
                        onDrop={handleDrop}
                        className="flex-1 overflow-y-auto flex flex-col gap-4 pb-12 transition-opacity"
                        style={{ scrollbarWidth: 'none', opacity: 0.8 } as React.CSSProperties}
                        onMouseEnter={e => (e.currentTarget.style.opacity = '1')}
                        onMouseLeave={e => (e.currentTarget.style.opacity = '0.8')}
                    >
                        {loading ? (
                            [0, 1].map(i => <CardSkeleton key={i} />)
                        ) : monitoring.length === 0 ? (
                            <p className="text-xs text-[#5A5C66] px-1">No themes in monitoring.</p>
                        ) : (
                            monitoring.map(theme => (
                                <CompactCard
                                    key={theme.id}
                                    theme={theme}
                                    otherThemes={allThemes.filter(t => t.id !== theme.id)}
                                    muted
                                    onPin={() => handlePin(theme.id)}
                                    onMerge={(targetId) => handleMerge(theme.id, targetId)}
                                    onDragStart={handleDragStart(theme.id, 'monitoring')}
                                />
                            ))
                        )}
                    </DroppableColumn>
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
