'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import {
    ThemeResponse,
    ThemeDetailResponse,
    InterviewResponse,
    InsightResponse,
    FeedSignalResponse,
} from '@/lib/api';
import SentimentBar from '@/components/ui/SentimentBar';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import styles from './DetailPanel.module.css';

interface DetailPanelProps {
    selectedTheme: ThemeResponse | null;
    selectedThemeDetail?: ThemeDetailResponse | null;
    selectedInterview: InterviewResponse | null;
    themeInsights?: InsightResponse[];
    interviewInsights?: InsightResponse[];
    totalInterviews?: number;
    totalThemes?: number;
}

export default function DetailPanel({
    selectedTheme,
    selectedThemeDetail,
    selectedInterview,
    themeInsights = [],
    interviewInsights = [],
    totalInterviews = 0,
    totalThemes = 0,
}: DetailPanelProps) {
    const router = useRouter();
    const displayTheme = selectedThemeDetail ?? selectedTheme;

    const openEvidenceItem = (item: FeedSignalResponse) => {
        if (item.source_type === 'interview' && item.link?.href) {
            router.push(item.link.href);
            return;
        }
        router.push(`/feed?signal=${item.id}`);
    };

    if (!selectedTheme && !selectedInterview) {
        return (
            <div className={styles.panel}>
                <div className={styles.defaultState}>
                    <div className={styles.defaultIcon}>List</div>
                    <div className={styles.defaultText}>
                        Select a theme or interview to see details
                    </div>
                    {(totalInterviews > 0 || totalThemes > 0) && (
                        <div style={{ marginTop: 'var(--space-6)' }}>
                            <div style={{ fontSize: '12px', color: 'var(--color-text-muted)', marginBottom: '8px' }}>
                                Quick Stats
                            </div>
                            <div style={{ display: 'flex', gap: '12px', fontSize: '12px', color: 'var(--color-text-secondary)' }}>
                                <span>{totalInterviews} interviews</span>
                                <span>·</span>
                                <span>{totalThemes} themes</span>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        );
    }

    if (displayTheme) {
        const total =
            displayTheme.sentiment_positive +
                displayTheme.sentiment_neutral +
                displayTheme.sentiment_negative || 1;
        const posPct = Math.round((displayTheme.sentiment_positive / total) * 100);
        const neuPct = Math.round((displayTheme.sentiment_neutral / total) * 100);
        const negPct = Math.round((displayTheme.sentiment_negative / total) * 100);
        const sentimentLabel =
            negPct > 60 ? 'Mostly Negative' : posPct > 60 ? 'Mostly Positive' : 'Mixed';
        const displayInsights = selectedThemeDetail?.insights || themeInsights;
        const breakdown = selectedThemeDetail?.source_breakdown || [];
        const evidenceGroups = selectedThemeDetail?.supporting_evidence || [];

        return (
            <div className={styles.panel}>
                <h2 className={styles.themeTitle}>
                    {displayTheme.name}
                    {displayTheme.is_new && <Badge variant="new">NEW</Badge>}
                </h2>

                <div className={styles.statsRow}>
                    Mentioned across {displayTheme.mention_count} source
                    {displayTheme.mention_count !== 1 ? 's' : ''} · Sentiment: {sentimentLabel}
                    {typeof displayTheme.impact_score === 'number' && (
                        <span className={styles.impactScore}>
                            Impact Score {displayTheme.impact_score.toFixed(1)}
                        </span>
                    )}
                </div>

                <div className={styles.sentimentBreakdown}>
                    <SentimentBar
                        positive={displayTheme.sentiment_positive}
                        neutral={displayTheme.sentiment_neutral}
                        negative={displayTheme.sentiment_negative}
                    />
                    <div className={styles.sentimentLabels}>
                        <span style={{ color: 'var(--color-success)' }}>{posPct}% positive</span>
                        <span style={{ color: 'var(--color-warning)' }}>{neuPct}% neutral</span>
                        <span style={{ color: 'var(--color-danger)' }}>{negPct}% negative</span>
                    </div>
                </div>

                {breakdown.length > 0 && (
                    <div className={styles.section}>
                        <h3 className={styles.sectionTitle}>Source Breakdown</h3>
                        <div className={styles.breakdownRow}>
                            {breakdown.map((item) => (
                                <div key={`${item.source_type}-${item.count}`} className={styles.breakdownChip}>
                                    <span>{item.label}</span>
                                    <strong>{item.count}</strong>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                <div className={styles.section}>
                    <h3 className={styles.sectionTitle}>Key Quotes</h3>
                    {displayInsights.length > 0 ? (
                        displayInsights.slice(0, 6).map((insight) => {
                            const sentimentClass =
                                insight.category === 'pain_point'
                                    ? styles.quotePainPoint
                                    : insight.category === 'feature_request'
                                        ? styles.quoteFeatureRequest
                                        : insight.category === 'positive'
                                            ? styles.quotePositive
                                            : styles.quoteSuggestion;

                            return (
                                <div key={insight.id} className={`${styles.quoteCard} ${sentimentClass}`}>
                                    <div className={styles.quoteText}>{insight.quote}</div>
                                    <div className={styles.quoteSource}>
                                        <Badge
                                            variant={
                                                insight.category as
                                                | 'pain_point'
                                                | 'feature_request'
                                                | 'positive'
                                                | 'suggestion'
                                            }
                                        >
                                            {insight.category.replace('_', ' ')}
                                        </Badge>
                                    </div>
                                </div>
                            );
                        })
                    ) : (
                        <div style={{ fontSize: '13px', color: 'var(--color-text-muted)' }}>
                            Select a theme to see its quotes and evidence
                        </div>
                    )}
                </div>

                {evidenceGroups.length > 0 && (
                    <div className={styles.section}>
                        <h3 className={styles.sectionTitle}>Evidence By Source</h3>
                        <div className={styles.evidenceGroups}>
                            {evidenceGroups.map((group) => (
                                <div key={group.source_type} className={styles.evidenceGroup}>
                                    <div className={styles.evidenceGroupHeader}>
                                        <span>{group.label}</span>
                                        <span className={styles.evidenceGroupCount}>{group.count}</span>
                                    </div>
                                    <div className={styles.evidenceList}>
                                        {group.items.slice(0, 4).map((item) => (
                                            <button
                                                key={item.id}
                                                type="button"
                                                className={styles.evidenceCard}
                                                onClick={() => openEvidenceItem(item)}
                                            >
                                                <div className={styles.evidenceCardTop}>
                                                    <span className={styles.evidenceSource}>{item.source_label}</span>
                                                    <span className={styles.evidenceTime}>
                                                        {new Date(item.occurred_at).toLocaleDateString()}
                                                    </span>
                                                </div>
                                                <div className={styles.evidenceTitle}>
                                                    {item.title || item.signal_kind_label}
                                                </div>
                                                <div className={styles.evidenceExcerpt}>{item.excerpt}</div>
                                                <div className={styles.evidenceFooter}>
                                                    <span className={styles.evidenceAction}>
                                                        {item.source_type === 'interview'
                                                            ? 'Open interview'
                                                            : 'Open in feed'}
                                                    </span>
                                                </div>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {displayTheme.description && (
                    <div className={styles.section}>
                        <h3 className={styles.sectionTitle}>Description</h3>
                        <p
                            style={{
                                fontSize: '13px',
                                color: 'var(--color-text-secondary)',
                                lineHeight: 1.6,
                            }}
                        >
                            {displayTheme.description}
                        </p>
                    </div>
                )}
            </div>
        );
    }

    if (selectedInterview) {
        const displayName = selectedInterview.filename.replace(/\.[^/.]+$/, '');

        return (
            <div className={styles.panel}>
                <h2 className={styles.interviewTitle}>{displayName}</h2>
                <div className={styles.interviewMeta}>
                    {selectedInterview.file_type.toUpperCase()} · Uploaded{' '}
                    {new Date(selectedInterview.created_at).toLocaleDateString()}
                    {selectedInterview.duration_seconds && (
                        <> · Duration: {Math.round(selectedInterview.duration_seconds / 60)} min</>
                    )}
                </div>

                <div className={styles.quickStats}>{interviewInsights.length} insights extracted</div>

                {selectedInterview.status !== 'done' && (
                    <div style={{ marginBottom: '16px' }}>
                        <Badge variant={selectedInterview.status === 'error' ? 'pain_point' : 'default'}>
                            {selectedInterview.status === 'error'
                                ? 'Error'
                                : `${selectedInterview.status}...`}
                        </Badge>
                        {selectedInterview.error_message && (
                            <p style={{ fontSize: '12px', color: 'var(--color-danger)', marginTop: '8px' }}>
                                {selectedInterview.error_message}
                            </p>
                        )}
                    </div>
                )}

                {interviewInsights.length > 0 && (
                    <div className={styles.section}>
                        <h3 className={styles.sectionTitle}>Key Insights</h3>
                        {interviewInsights.slice(0, 5).map((insight) => {
                            const sentimentClass =
                                insight.category === 'pain_point'
                                    ? styles.quotePainPoint
                                    : insight.category === 'feature_request'
                                        ? styles.quoteFeatureRequest
                                        : insight.category === 'positive'
                                            ? styles.quotePositive
                                            : styles.quoteSuggestion;

                            return (
                                <div key={insight.id} className={`${styles.quoteCard} ${sentimentClass}`}>
                                    <div
                                        style={{
                                            fontSize: '13px',
                                            fontWeight: 500,
                                            color: 'var(--color-text-primary)',
                                            marginBottom: '4px',
                                        }}
                                    >
                                        {insight.title}
                                    </div>
                                    <div className={styles.quoteText}>{insight.quote}</div>
                                    <Badge
                                        variant={
                                            insight.category as
                                            | 'pain_point'
                                            | 'feature_request'
                                            | 'positive'
                                            | 'suggestion'
                                        }
                                    >
                                        {insight.category.replace('_', ' ')}
                                    </Badge>
                                </div>
                            );
                        })}
                    </div>
                )}

                <div className={styles.viewTranscriptBtn}>
                    <Button
                        variant="secondary"
                        fullWidth
                        onClick={() => router.push(`/interview/${selectedInterview.id}`)}
                    >
                        View full transcript →
                    </Button>
                </div>
            </div>
        );
    }

    return null;
}
