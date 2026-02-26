'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { ThemeResponse, InterviewResponse, InsightResponse } from '@/lib/api';
import SentimentBar from '@/components/ui/SentimentBar';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import styles from './DetailPanel.module.css';

interface DetailPanelProps {
    selectedTheme: ThemeResponse | null;
    selectedInterview: InterviewResponse | null;
    themeInsights?: InsightResponse[];
    interviewInsights?: InsightResponse[];
    totalInterviews?: number;
    totalThemes?: number;
}

export default function DetailPanel({
    selectedTheme,
    selectedInterview,
    themeInsights = [],
    interviewInsights = [],
    totalInterviews = 0,
    totalThemes = 0,
}: DetailPanelProps) {
    const router = useRouter();

    // Default state - nothing selected
    if (!selectedTheme && !selectedInterview) {
        return (
            <div className={styles.panel}>
                <div className={styles.defaultState}>
                    <div className={styles.defaultIcon}>📋</div>
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

    // Theme detail view
    if (selectedTheme) {
        const total = selectedTheme.sentiment_positive + selectedTheme.sentiment_neutral + selectedTheme.sentiment_negative || 1;
        const posPct = Math.round((selectedTheme.sentiment_positive / total) * 100);
        const neuPct = Math.round((selectedTheme.sentiment_neutral / total) * 100);
        const negPct = Math.round((selectedTheme.sentiment_negative / total) * 100);

        const sentimentLabel = negPct > 60 ? 'Mostly Negative' :
            posPct > 60 ? 'Mostly Positive' : 'Mixed';

        return (
            <div className={styles.panel}>
                {/* Title */}
                <h2 className={styles.themeTitle}>
                    {selectedTheme.name}
                    {selectedTheme.is_new && <Badge variant="new">NEW</Badge>}
                </h2>

                {/* Stats */}
                <div className={styles.statsRow}>
                    Mentioned across {selectedTheme.mention_count} source{selectedTheme.mention_count !== 1 ? 's' : ''} · Sentiment: {sentimentLabel}
                </div>

                {/* Sentiment breakdown */}
                <div className={styles.sentimentBreakdown}>
                    <SentimentBar
                        positive={selectedTheme.sentiment_positive}
                        neutral={selectedTheme.sentiment_neutral}
                        negative={selectedTheme.sentiment_negative}
                    />
                    <div className={styles.sentimentLabels}>
                        <span style={{ color: 'var(--color-success)' }}>{posPct}% positive</span>
                        <span style={{ color: 'var(--color-warning)' }}>{neuPct}% neutral</span>
                        <span style={{ color: 'var(--color-danger)' }}>{negPct}% negative</span>
                    </div>
                </div>

                {/* Key Quotes */}
                <div className={styles.section}>
                    <h3 className={styles.sectionTitle}>Key Quotes</h3>
                    {themeInsights.length > 0 ? (
                        themeInsights.slice(0, 6).map((insight) => {
                            const sentimentClass =
                                insight.category === 'pain_point' ? styles.quotePainPoint :
                                    insight.category === 'feature_request' ? styles.quoteFeatureRequest :
                                        insight.category === 'positive' ? styles.quotePositive :
                                            styles.quoteSuggestion;

                            return (
                                <div key={insight.id} className={`${styles.quoteCard} ${sentimentClass}`}>
                                    <div className={styles.quoteText}>{insight.quote}</div>
                                    <div className={styles.quoteSource}>
                                        <Badge variant={insight.category as 'pain_point' | 'feature_request' | 'positive' | 'suggestion'}>
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

                {/* Description */}
                {selectedTheme.description && (
                    <div className={styles.section}>
                        <h3 className={styles.sectionTitle}>Description</h3>
                        <p style={{ fontSize: '13px', color: 'var(--color-text-secondary)', lineHeight: 1.6 }}>
                            {selectedTheme.description}
                        </p>
                    </div>
                )}
            </div>
        );
    }

    // Interview detail view
    if (selectedInterview) {
        const displayName = selectedInterview.filename.replace(/\.[^/.]+$/, '');

        return (
            <div className={styles.panel}>
                <h2 className={styles.interviewTitle}>{displayName}</h2>
                <div className={styles.interviewMeta}>
                    {selectedInterview.file_type.toUpperCase()} · Uploaded {new Date(selectedInterview.created_at).toLocaleDateString()}
                    {selectedInterview.duration_seconds && (
                        <> · Duration: {Math.round(selectedInterview.duration_seconds / 60)} min</>
                    )}
                </div>

                <div className={styles.quickStats}>
                    {interviewInsights.length} insights extracted
                </div>

                {/* Status */}
                {selectedInterview.status !== 'done' && (
                    <div style={{ marginBottom: '16px' }}>
                        <Badge variant={selectedInterview.status === 'error' ? 'pain_point' : 'default'}>
                            {selectedInterview.status === 'error' ? '❌ Error' : `🔄 ${selectedInterview.status}…`}
                        </Badge>
                        {selectedInterview.error_message && (
                            <p style={{ fontSize: '12px', color: 'var(--color-danger)', marginTop: '8px' }}>
                                {selectedInterview.error_message}
                            </p>
                        )}
                    </div>
                )}

                {/* Key insights from this interview */}
                {interviewInsights.length > 0 && (
                    <div className={styles.section}>
                        <h3 className={styles.sectionTitle}>Key Insights</h3>
                        {interviewInsights.slice(0, 5).map((insight) => {
                            const sentimentClass =
                                insight.category === 'pain_point' ? styles.quotePainPoint :
                                    insight.category === 'feature_request' ? styles.quoteFeatureRequest :
                                        insight.category === 'positive' ? styles.quotePositive :
                                            styles.quoteSuggestion;

                            return (
                                <div key={insight.id} className={`${styles.quoteCard} ${sentimentClass}`}>
                                    <div style={{ fontSize: '13px', fontWeight: 500, color: 'var(--color-text-primary)', marginBottom: '4px' }}>
                                        {insight.title}
                                    </div>
                                    <div className={styles.quoteText}>{insight.quote}</div>
                                    <Badge variant={insight.category as 'pain_point' | 'feature_request' | 'positive' | 'suggestion'}>
                                        {insight.category.replace('_', ' ')}
                                    </Badge>
                                </div>
                            );
                        })}
                    </div>
                )}

                {/* View transcript button */}
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
