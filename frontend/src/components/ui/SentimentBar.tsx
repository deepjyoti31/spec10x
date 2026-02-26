'use client';

import React from 'react';
import styles from './SentimentBar.module.css';

interface SentimentBarProps {
    positive: number;
    neutral: number;
    negative: number;
    className?: string;
}

export default function SentimentBar({
    positive,
    neutral,
    negative,
    className,
}: SentimentBarProps) {
    const total = positive + neutral + negative || 1;
    const pPct = Math.round((positive / total) * 100);
    const nPct = Math.round((neutral / total) * 100);
    const negPct = Math.round((negative / total) * 100);

    return (
        <div className={`${styles.wrapper} ${className || ''}`}>
            <div className={styles.bar}>
                {pPct > 0 && (
                    <div
                        className={`${styles.segment} ${styles.positiveSegment}`}
                        style={{ width: `${pPct}%` }}
                    />
                )}
                {nPct > 0 && (
                    <div
                        className={`${styles.segment} ${styles.neutralSegment}`}
                        style={{ width: `${nPct}%` }}
                    />
                )}
                {negPct > 0 && (
                    <div
                        className={`${styles.segment} ${styles.negativeSegment}`}
                        style={{ width: `${negPct}%` }}
                    />
                )}
            </div>
            <span className={styles.tooltipContent}>
                {pPct}% positive · {nPct}% neutral · {negPct}% negative
            </span>
        </div>
    );
}
