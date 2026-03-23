'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import {
    api,
    BoardThemeCardResponse,
    FeedSignalResponse,
    ThemePriorityState,
} from '@/lib/api';
import styles from './board.module.css';

interface ColumnConfig {
    key: ThemePriorityState;
    title: string;
    description: string;
}

const COLUMNS: ColumnConfig[] = [
    {
        key: 'pinned',
        title: 'Pinned',
        description: 'Manual keep-in-view themes for the current cycle.',
    },
    {
        key: 'default',
        title: 'Investigate Next',
        description: 'Ranked by Impact Score with no manual override applied.',
    },
    {
        key: 'monitoring',
        title: 'Monitoring',
        description: 'Themes worth watching without pulling them into the active stack.',
    },
];

function formatDate(value: string) {
    return new Intl.DateTimeFormat(undefined, {
        month: 'short',
        day: 'numeric',
    }).format(new Date(value));
}

function openEvidence(router: ReturnType<typeof useRouter>, item: FeedSignalResponse) {
    if (item.link?.kind === 'external' && item.link.href) {
        window.open(item.link.href, '_blank', 'noopener,noreferrer');
        return;
    }

    if (item.source_type === 'interview' && item.link?.href) {
        router.push(item.link.href);
        return;
    }

    router.push(`/feed?signal=${item.id}`);
}

function getPriorityLabel(state: ThemePriorityState) {
    if (state === 'pinned') return 'Pinned';
    if (state === 'monitoring') return 'Monitoring';
    return 'Ranked';
}

export default function BoardPage() {
    const { token } = useAuth();
    const router = useRouter();
    const [cards, setCards] = useState<BoardThemeCardResponse[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [expandedThemeId, setExpandedThemeId] = useState<string | null>(null);
    const [savingThemeId, setSavingThemeId] = useState<string | null>(null);

    useEffect(() => {
        if (!token) return;

        setLoading(true);
        setError(null);

        api.getThemeBoard(token)
            .then((response) => setCards(response))
            .catch((err) => {
                setError(err instanceof Error ? err.message : 'Failed to load board');
            })
            .finally(() => setLoading(false));
    }, [token]);

    const groupedCards = useMemo(() => {
        return {
            pinned: cards.filter((theme) => theme.priority_state === 'pinned'),
            default: cards.filter((theme) => theme.priority_state === 'default'),
            monitoring: cards.filter((theme) => theme.priority_state === 'monitoring'),
        };
    }, [cards]);

    const handlePriorityChange = async (
        themeId: string,
        priorityState: ThemePriorityState
    ) => {
        if (!token) return;

        setSavingThemeId(themeId);
        try {
            const updatedTheme = await api.updateTheme(token, themeId, {
                priority_state: priorityState,
            });
            setCards((previous) =>
                previous.map((theme) =>
                    theme.id === themeId
                        ? { ...theme, priority_state: updatedTheme.priority_state }
                        : theme
                )
            );
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to update priority state');
        } finally {
            setSavingThemeId(null);
        }
    };

    return (
        <div className={styles.page}>
            <div className={styles.header}>
                <div>
                    <div className={styles.eyebrow}>Sprint 6 Priority Board</div>
                    <h1 className={styles.title}>Evidence-first theme triage</h1>
                    <p className={styles.subtitle}>
                        Pin what deserves a forced slot, keep the ranked backlog honest, and
                        monitor lower-pressure themes without turning the board into a task system.
                    </p>
                </div>
                <div className={styles.headerActions}>
                    <Link href="/dashboard" className={styles.headerLink}>
                        Open dashboard
                    </Link>
                    <Link href="/trust" className={styles.headerLinkSecondary}>
                        Review trust package
                    </Link>
                </div>
            </div>

            {error && <div className={styles.errorBanner}>{error}</div>}

            {loading ? (
                <div className={styles.loadingState}>Loading board...</div>
            ) : (
                <div className={styles.boardGrid}>
                    {COLUMNS.map((column) => {
                        const themes = groupedCards[column.key];

                        return (
                            <section key={column.key} className={styles.column}>
                                <div className={styles.columnHeader}>
                                    <div>
                                        <h2 className={styles.columnTitle}>{column.title}</h2>
                                        <p className={styles.columnDescription}>
                                            {column.description}
                                        </p>
                                    </div>
                                    <span className={styles.columnCount}>{themes.length}</span>
                                </div>

                                {themes.length === 0 ? (
                                    <div className={styles.emptyColumn}>
                                        No themes in this column yet.
                                    </div>
                                ) : (
                                    <div className={styles.cardStack}>
                                        {themes.map((theme) => {
                                            const isExpanded = expandedThemeId === theme.id;
                                            const previewRows = theme.evidence_preview.slice(0, 2);
                                            const leadSignal = previewRows[0];

                                            return (
                                                <article key={theme.id} className={styles.card}>
                                                    <div className={styles.cardTop}>
                                                        <span
                                                            className={`${styles.stateBadge} ${styles[`state_${theme.priority_state}`]}`}
                                                        >
                                                            {getPriorityLabel(theme.priority_state)}
                                                        </span>
                                                        <div className={styles.scoreBadge}>
                                                            {theme.impact_breakdown.total.toFixed(1)}
                                                        </div>
                                                    </div>

                                                    <h3 className={styles.cardTitle}>{theme.name}</h3>
                                                    <p className={styles.cardMeta}>
                                                        {theme.mention_count} supporting signal
                                                        {theme.mention_count === 1 ? '' : 's'}
                                                    </p>

                                                    <div className={styles.sourceBreakdown}>
                                                        {theme.source_breakdown.map((item) => (
                                                            <div
                                                                key={`${theme.id}-${item.source_type}`}
                                                                className={styles.sourceChip}
                                                            >
                                                                <span>{item.label}</span>
                                                                <strong>{item.count}</strong>
                                                            </div>
                                                        ))}
                                                    </div>

                                                    <div className={styles.previewList}>
                                                        {previewRows.map((item) => (
                                                            <button
                                                                key={item.id}
                                                                type="button"
                                                                className={styles.previewCard}
                                                                onClick={() => openEvidence(router, item)}
                                                            >
                                                                <div className={styles.previewMeta}>
                                                                    <span>{item.source_label}</span>
                                                                    <span>{formatDate(item.occurred_at)}</span>
                                                                </div>
                                                                <div className={styles.previewTitle}>
                                                                    {item.title || item.signal_kind_label}
                                                                </div>
                                                                <div className={styles.previewExcerpt}>
                                                                    {item.excerpt}
                                                                </div>
                                                            </button>
                                                        ))}
                                                    </div>

                                                    <div className={styles.actionRow}>
                                                        <button
                                                            type="button"
                                                            className={styles.actionButton}
                                                            disabled={savingThemeId === theme.id}
                                                            onClick={() =>
                                                                handlePriorityChange(theme.id, 'pinned')
                                                            }
                                                        >
                                                            Pin
                                                        </button>
                                                        <button
                                                            type="button"
                                                            className={styles.actionButton}
                                                            disabled={savingThemeId === theme.id}
                                                            onClick={() =>
                                                                handlePriorityChange(theme.id, 'monitoring')
                                                            }
                                                        >
                                                            Monitor
                                                        </button>
                                                        <button
                                                            type="button"
                                                            className={styles.actionButton}
                                                            disabled={savingThemeId === theme.id}
                                                            onClick={() =>
                                                                handlePriorityChange(theme.id, 'default')
                                                            }
                                                        >
                                                            Clear
                                                        </button>
                                                    </div>

                                                    <div className={styles.cardFooter}>
                                                        <button
                                                            type="button"
                                                            className={styles.expandButton}
                                                            onClick={() =>
                                                                setExpandedThemeId((current) =>
                                                                    current === theme.id ? null : theme.id
                                                                )
                                                            }
                                                        >
                                                            {isExpanded
                                                                ? 'Hide score breakdown'
                                                                : 'Show score breakdown'}
                                                        </button>

                                                        <Link
                                                            href={`/dashboard?theme=${theme.id}`}
                                                            className={styles.cardLink}
                                                        >
                                                            Open theme
                                                        </Link>
                                                    </div>

                                                    {isExpanded && (
                                                        <div className={styles.expandedPanel}>
                                                            <div className={styles.breakdownGrid}>
                                                                <div className={styles.breakdownCard}>
                                                                    <span>Frequency</span>
                                                                    <strong>
                                                                        {theme.impact_breakdown.frequency.toFixed(1)}
                                                                    </strong>
                                                                </div>
                                                                <div className={styles.breakdownCard}>
                                                                    <span>Negative</span>
                                                                    <strong>
                                                                        {theme.impact_breakdown.negative.toFixed(1)}
                                                                    </strong>
                                                                </div>
                                                                <div className={styles.breakdownCard}>
                                                                    <span>Recency</span>
                                                                    <strong>
                                                                        {theme.impact_breakdown.recency.toFixed(1)}
                                                                    </strong>
                                                                </div>
                                                                <div className={styles.breakdownCard}>
                                                                    <span>Source Diversity</span>
                                                                    <strong>
                                                                        {theme.impact_breakdown.source_diversity.toFixed(1)}
                                                                    </strong>
                                                                </div>
                                                            </div>
                                                            <div className={styles.linkRow}>
                                                                <Link
                                                                    href={`/dashboard?theme=${theme.id}`}
                                                                    className={styles.cardLink}
                                                                >
                                                                    Open theme detail
                                                                </Link>
                                                                {leadSignal && (
                                                                    <button
                                                                        type="button"
                                                                        className={styles.feedLink}
                                                                        onClick={() =>
                                                                            openEvidence(router, leadSignal)
                                                                        }
                                                                    >
                                                                        Jump to newest evidence
                                                                    </button>
                                                                )}
                                                            </div>
                                                        </div>
                                                    )}
                                                </article>
                                            );
                                        })}
                                    </div>
                                )}
                            </section>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
