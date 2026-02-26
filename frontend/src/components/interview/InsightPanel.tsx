'use client';

import React from 'react';
import styles from './InsightPanel.module.css';
import type { InsightResponse } from '@/lib/api';

interface InsightPanelProps {
    insights: InsightResponse[];
    activeInsightId: string | null;
    onInsightClick: (insightId: string) => void;
    onDismiss: (insightId: string) => void;
    onFlag: (insightId: string) => void;
}

const CATEGORY_LABELS: Record<string, string> = {
    pain_point: 'Pain Point',
    feature_request: 'Feature Request',
    positive: 'Positive Feedback',
    suggestion: 'Suggestion',
};

const CATEGORY_STYLES: Record<string, string> = {
    pain_point: styles.categoryPainPoint,
    feature_request: styles.categoryFeatureRequest,
    positive: styles.categoryPositive,
    suggestion: styles.categorySuggestion,
};

export default function InsightPanel({
    insights,
    activeInsightId,
    onInsightClick,
    onDismiss,
    onFlag,
}: InsightPanelProps) {
    const visibleInsights = insights.filter((i) => !i.is_dismissed);

    if (visibleInsights.length === 0) {
        return (
            <div className={styles.container}>
                <div className={styles.header}>
                    <span className={styles.headerTitle}>Extracted Insights</span>
                </div>
                <div className={styles.empty}>
                    No insights extracted from this interview yet.
                </div>
            </div>
        );
    }

    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <div>
                    <span className={styles.headerTitle}>Extracted Insights</span>
                    <span className={styles.countBadge}>{visibleInsights.length}</span>
                </div>
            </div>

            {visibleInsights.map((insight) => (
                <div
                    key={insight.id}
                    id={`insight-${insight.id}`}
                    className={`${styles.insightCard} ${activeInsightId === insight.id ? styles.insightCardActive : ''
                        }`}
                    onClick={() => onInsightClick(insight.id)}
                >
                    {/* Category pill */}
                    <div
                        className={`${styles.categoryPill} ${CATEGORY_STYLES[insight.category] || ''
                            }`}
                    >
                        {CATEGORY_LABELS[insight.category] || insight.category}
                    </div>

                    {/* Title */}
                    <div className={styles.insightTitle}>{insight.title}</div>

                    {/* Quote */}
                    <div className={styles.insightQuote}>&ldquo;{insight.quote}&rdquo;</div>

                    {/* Footer */}
                    <div className={styles.insightFooter}>
                        {insight.theme_suggestion && (
                            <span className={styles.themePill}>{insight.theme_suggestion}</span>
                        )}
                        <button
                            className={styles.jumpLink}
                            onClick={(e) => {
                                e.stopPropagation();
                                onInsightClick(insight.id);
                            }}
                        >
                            Jump to quote ↗
                        </button>
                    </div>

                    {/* Hover actions */}
                    <div className={styles.cardActions}>
                        <button
                            className={`${styles.cardActionBtn} ${insight.is_flagged ? styles.flaggedBtn : ''
                                }`}
                            title={insight.is_flagged ? 'Unflag' : 'Flag as uncertain'}
                            onClick={(e) => {
                                e.stopPropagation();
                                onFlag(insight.id);
                            }}
                        >
                            🚩
                        </button>
                        <button
                            className={styles.cardActionBtn}
                            title="Dismiss insight"
                            onClick={(e) => {
                                e.stopPropagation();
                                onDismiss(insight.id);
                            }}
                        >
                            ✕
                        </button>
                    </div>
                </div>
            ))}

            <button className={styles.addInsightBtn}>+ Add insight</button>
        </div>
    );
}
