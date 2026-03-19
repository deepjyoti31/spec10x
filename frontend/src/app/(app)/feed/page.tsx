'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import {
    api,
    FeedFilters,
    FeedSignalResponse,
    FeedSignalDetailResponse,
    SourceType,
} from '@/lib/api';
import Button from '@/components/ui/Button';
import styles from './feed.module.css';

const SOURCE_OPTIONS: Array<{ value: 'all' | SourceType; label: string }> = [
    { value: 'all', label: 'All Sources' },
    { value: 'interview', label: 'Interview' },
    { value: 'support', label: 'Support' },
    { value: 'survey', label: 'Survey' },
];

const SENTIMENT_OPTIONS = [
    { value: 'all', label: 'All Sentiment' },
    { value: 'negative', label: 'Negative' },
    { value: 'neutral', label: 'Neutral' },
    { value: 'positive', label: 'Positive' },
] as const;

function formatOccurredAt(value: string) {
    return new Intl.DateTimeFormat(undefined, {
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
    }).format(new Date(value));
}

function buildMetadataEntries(metadataJson?: Record<string, unknown> | null) {
    return Object.entries(metadataJson || {}).filter(([key, value]) => {
        if (key === 'theme_match') return false;
        if (value == null) return false;
        if (Array.isArray(value) && value.length === 0) return false;
        if (typeof value === 'string' && value.trim() === '') return false;
        return true;
    });
}

function renderMetadataValue(value: unknown) {
    if (Array.isArray(value)) {
        return value.join(', ');
    }
    if (typeof value === 'object' && value !== null) {
        return JSON.stringify(value);
    }
    return String(value);
}

function getRowBadge(row: FeedSignalResponse) {
    if (row.sentiment === 'negative') return { label: 'Negative', className: styles.badgeNegative };
    if (row.sentiment === 'positive') return { label: 'Positive', className: styles.badgePositive };
    if (row.sentiment === 'neutral') return { label: 'Neutral', className: styles.badgeNeutral };
    return { label: row.signal_kind_label, className: styles.badgeDefault };
}

export default function FeedPage() {
    const { token } = useAuth();
    const router = useRouter();
    const searchParams = useSearchParams();

    const source = (searchParams.get('source') as SourceType | null) || 'all';
    const sentiment =
        (searchParams.get('sentiment') as 'positive' | 'neutral' | 'negative' | null) || 'all';
    const dateFrom = searchParams.get('date_from') || '';
    const dateTo = searchParams.get('date_to') || '';
    const selectedSignalId = searchParams.get('signal');

    const [signals, setSignals] = useState<FeedSignalResponse[]>([]);
    const [selectedDetail, setSelectedDetail] = useState<FeedSignalDetailResponse | null>(null);
    const [loading, setLoading] = useState(true);
    const [detailLoading, setDetailLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const filters = useMemo<FeedFilters>(
        () => ({
            source: source !== 'all' ? source : undefined,
            sentiment: sentiment !== 'all' ? sentiment : undefined,
            date_from: dateFrom || undefined,
            date_to: dateTo || undefined,
        }),
        [source, sentiment, dateFrom, dateTo]
    );

    const updateParams = useCallback(
        (updates: Record<string, string | undefined>) => {
            const params = new URLSearchParams(searchParams.toString());
            Object.entries(updates).forEach(([key, value]) => {
                if (value) {
                    params.set(key, value);
                } else {
                    params.delete(key);
                }
            });
            const next = params.toString();
            router.replace(next ? `/feed?${next}` : '/feed', { scroll: false });
        },
        [router, searchParams]
    );

    useEffect(() => {
        if (!token) return;

        setLoading(true);
        setError(null);

        api.listFeed(token, filters)
            .then((rows) => {
                setSignals(rows);
                if (rows.length === 0) {
                    setSelectedDetail(null);
                    if (selectedSignalId) {
                        updateParams({ signal: undefined });
                    }
                    return;
                }

                if (!selectedSignalId || !rows.some((row) => row.id === selectedSignalId)) {
                    updateParams({ signal: rows[0].id });
                }
            })
            .catch((err) => {
                setError(err instanceof Error ? err.message : 'Failed to load feed');
            })
            .finally(() => setLoading(false));
    }, [token, filters, selectedSignalId, updateParams]);

    useEffect(() => {
        if (!token || !selectedSignalId) {
            setSelectedDetail(null);
            return;
        }

        setDetailLoading(true);
        api.getFeedSignal(token, selectedSignalId)
            .then((detail) => setSelectedDetail(detail))
            .catch((err) => {
                setError(err instanceof Error ? err.message : 'Failed to load evidence detail');
                setSelectedDetail(null);
            })
            .finally(() => setDetailLoading(false));
    }, [token, selectedSignalId]);

    const selectedRow = signals.find((row) => row.id === selectedSignalId) || null;
    const detail: FeedSignalDetailResponse | null = selectedDetail
        ? selectedDetail
        : selectedRow
            ? {
                ...selectedRow,
                content_text: selectedRow.excerpt,
                metadata_json: null,
            }
            : null;
    const hasFilters = source !== 'all' || sentiment !== 'all' || dateFrom || dateTo;
    const metadataEntries = buildMetadataEntries(selectedDetail?.metadata_json);

    return (
        <div className={styles.page}>
            <div className={styles.header}>
                <div>
                    <div className={styles.eyebrow}>Unified Evidence Feed</div>
                    <h1 className={styles.title}>Signals across interviews, support, and surveys</h1>
                    <p className={styles.subtitle}>
                        Review the normalized evidence stream, trace themes back to source records,
                        and keep filters pinned in the URL while you work.
                    </p>
                </div>
            </div>

            <div className={styles.filterBar}>
                <select
                    className={styles.filterControl}
                    value={source}
                    onChange={(event) => updateParams({ source: event.target.value === 'all' ? undefined : event.target.value, signal: undefined })}
                >
                    {SOURCE_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                            {option.label}
                        </option>
                    ))}
                </select>
                <select
                    className={styles.filterControl}
                    value={sentiment}
                    onChange={(event) => updateParams({ sentiment: event.target.value === 'all' ? undefined : event.target.value, signal: undefined })}
                >
                    {SENTIMENT_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                            {option.label}
                        </option>
                    ))}
                </select>
                <input
                    className={styles.filterControl}
                    type="date"
                    value={dateFrom}
                    onChange={(event) => updateParams({ date_from: event.target.value || undefined, signal: undefined })}
                />
                <input
                    className={styles.filterControl}
                    type="date"
                    value={dateTo}
                    onChange={(event) => updateParams({ date_to: event.target.value || undefined, signal: undefined })}
                />
                {hasFilters && (
                    <Button variant="ghost" size="sm" onClick={() => updateParams({
                        source: undefined,
                        sentiment: undefined,
                        date_from: undefined,
                        date_to: undefined,
                        signal: undefined,
                    })}>
                        Clear Filters
                    </Button>
                )}
            </div>

            <div className={styles.layout}>
                <section className={styles.listPanel}>
                    <div className={styles.panelHeader}>
                        <span>Signals</span>
                        <span className={styles.panelCount}>{signals.length}</span>
                    </div>

                    {loading ? (
                        <div className={styles.emptyState}>Loading feed...</div>
                    ) : error ? (
                        <div className={styles.emptyState}>{error}</div>
                    ) : signals.length === 0 ? (
                        <div className={styles.emptyState}>
                            No signals match the current filters.
                        </div>
                    ) : (
                        <div className={styles.signalList}>
                            {signals.map((row) => {
                                const rowBadge = getRowBadge(row);
                                return (
                                    <button
                                        key={row.id}
                                        type="button"
                                        className={`${styles.signalRow} ${row.id === selectedSignalId ? styles.signalRowActive : ''}`}
                                        onClick={() => updateParams({ signal: row.id })}
                                    >
                                        <div className={styles.signalMeta}>
                                            <span className={styles.sourcePill}>{row.source_label}</span>
                                            <span className={styles.timeLabel}>{formatOccurredAt(row.occurred_at)}</span>
                                        </div>
                                        <div className={styles.signalTitle}>{row.title || row.signal_kind_label}</div>
                                        <div className={styles.signalExcerpt}>{row.excerpt}</div>
                                        <div className={styles.signalFooter}>
                                            <span className={`${styles.rowBadge} ${rowBadge.className}`}>
                                                {rowBadge.label}
                                            </span>
                                            {row.theme_chip && (
                                                <span className={styles.themeChip}>{row.theme_chip.name}</span>
                                            )}
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                    )}
                </section>

                <aside className={styles.detailPanel}>
                    <div className={styles.panelHeader}>
                        <span>Evidence Detail</span>
                        {detail && <span className={styles.panelCount}>{detail.provider_label}</span>}
                    </div>

                    {!detail || detailLoading ? (
                        <div className={styles.emptyState}>
                            {detailLoading ? 'Loading evidence detail...' : 'Select a signal to inspect its full context.'}
                        </div>
                    ) : (
                        <div className={styles.detailBody}>
                            <div className={styles.detailMetaTop}>
                                <span className={styles.sourcePill}>{detail.source_label}</span>
                                <span className={styles.timeLabel}>{formatOccurredAt(detail.occurred_at)}</span>
                            </div>

                            <h2 className={styles.detailTitle}>{detail.title || detail.signal_kind_label}</h2>

                            <div className={styles.detailBadges}>
                                <span className={styles.detailBadge}>{detail.signal_kind_label}</span>
                                {detail.sentiment && (
                                    <span className={styles.detailBadge}>
                                        {detail.sentiment.charAt(0).toUpperCase() + detail.sentiment.slice(1)}
                                    </span>
                                )}
                                {detail.theme_chip && (
                                    <span className={styles.detailBadgeAccent}>{detail.theme_chip.name}</span>
                                )}
                            </div>

                            <div className={styles.detailContent}>
                                {detail.content_text || detail.excerpt}
                            </div>

                            {detail.author_or_speaker && (
                                <div className={styles.detailSubtle}>Author/Speaker: {detail.author_or_speaker}</div>
                            )}

                            {detail.source_type === 'survey' ? (
                                <div className={styles.inlineNotice}>
                                    Imported CSV evidence stays inside Spec10x. There is no external survey URL for this row.
                                </div>
                            ) : detail.link?.href ? (
                                detail.link.kind === 'external' ? (
                                    <a
                                        href={detail.link.href}
                                        target="_blank"
                                        rel="noreferrer"
                                        className={styles.linkButton}
                                    >
                                        {detail.link.label}
                                    </a>
                                ) : (
                                    <Button
                                        variant="secondary"
                                        size="sm"
                                        onClick={() => router.push(detail.link!.href)}
                                    >
                                        {detail.link.label}
                                    </Button>
                                )
                            ) : null}

                            {metadataEntries.length > 0 && (
                                <div className={styles.metadataSection}>
                                    <div className={styles.metadataTitle}>Metadata</div>
                                    <div className={styles.metadataGrid}>
                                        {metadataEntries.map(([key, value]) => (
                                            <div key={key} className={styles.metadataItem}>
                                                <span className={styles.metadataKey}>
                                                    {key.replace(/_/g, ' ')}
                                                </span>
                                                <span className={styles.metadataValue}>
                                                    {renderMetadataValue(value)}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </aside>
            </div>
        </div>
    );
}
