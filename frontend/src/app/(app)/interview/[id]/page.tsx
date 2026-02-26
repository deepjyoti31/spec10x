'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import styles from './interview.module.css';
import TranscriptPanel from '@/components/interview/TranscriptPanel';
import InsightPanel from '@/components/interview/InsightPanel';
import { api } from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';
import type { InterviewDetailResponse } from '@/lib/api';

export default function InterviewDetailPage() {
    const params = useParams();
    const router = useRouter();
    const { token } = useAuth();
    const interviewId = params.id as string;

    const [interview, setInterview] = useState<InterviewDetailResponse | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [activeInsightId, setActiveInsightId] = useState<string | null>(null);
    const [showRaw, setShowRaw] = useState(false);
    const [highlightFilters, setHighlightFilters] = useState<Record<string, boolean>>({
        pain_point: true,
        feature_request: true,
        positive: true,
        suggestion: true,
    });

    // Fetch interview data
    useEffect(() => {
        if (!token || !interviewId) return;

        const fetchData = async () => {
            try {
                setLoading(true);
                const data = await api.getInterview(token, interviewId);
                setInterview(data);
            } catch (err) {
                setError(err instanceof Error ? err.message : 'Failed to load interview');
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [token, interviewId]);

    // Handle highlight click → scroll to insight in right panel
    const handleHighlightClick = useCallback((insightId: string) => {
        setActiveInsightId(insightId);
        const el = document.getElementById(`insight-${insightId}`);
        el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, []);

    // Handle insight click → scroll to highlight in transcript
    const handleInsightClick = useCallback((insightId: string) => {
        setActiveInsightId(insightId);
        // Scroll is handled by TranscriptPanel's highlight mechanism
    }, []);

    // Handle dismiss
    const handleDismiss = useCallback(async (insightId: string) => {
        if (!token) return;
        try {
            await api.dismissInsight(token, insightId);
            setInterview((prev) => {
                if (!prev) return prev;
                return {
                    ...prev,
                    insights: prev.insights.map((i) =>
                        i.id === insightId ? { ...i, is_dismissed: true } : i
                    ),
                };
            });
        } catch {
            // silently fail
        }
    }, [token]);

    // Handle flag
    const handleFlag = useCallback(async (insightId: string) => {
        if (!token) return;
        try {
            await api.flagInsight(token, insightId);
            setInterview((prev) => {
                if (!prev) return prev;
                return {
                    ...prev,
                    insights: prev.insights.map((i) =>
                        i.id === insightId ? { ...i, is_flagged: !i.is_flagged } : i
                    ),
                };
            });
        } catch {
            // silently fail
        }
    }, [token]);

    // Toggle highlight category filter
    const handleToggleFilter = useCallback((category: string) => {
        setHighlightFilters((prev) => ({
            ...prev,
            [category]: !prev[category],
        }));
    }, []);

    // Export as markdown
    const handleExport = useCallback(async () => {
        if (!token || !interviewId) return;
        try {
            const markdown = await api.exportInterview(token, interviewId);
            const blob = new Blob([markdown], { type: 'text/markdown' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${interview?.filename || 'interview'}.md`;
            a.click();
            URL.revokeObjectURL(url);
        } catch {
            // silently fail
        }
    }, [token, interviewId, interview?.filename]);

    if (loading) {
        return (
            <div className={styles.container}>
                <div className={styles.loading}>Loading interview…</div>
            </div>
        );
    }

    if (error || !interview) {
        return (
            <div className={styles.container}>
                <div className={styles.error}>
                    <span>{error || 'Interview not found'}</span>
                    <a href="/dashboard">← Back to Dashboard</a>
                </div>
            </div>
        );
    }

    return (
        <div className={styles.container}>
            {/* Breadcrumb bar */}
            <div className={styles.breadcrumbBar}>
                <nav className={styles.breadcrumb}>
                    <button
                        className={styles.breadcrumbLink}
                        onClick={() => router.push('/dashboard')}
                    >
                        ← Dashboard
                    </button>
                    <span className={styles.breadcrumbSep}>&gt;</span>
                    <span className={styles.breadcrumbCurrent}>{interview.filename}</span>
                </nav>
                <div className={styles.actions}>
                    <button
                        className={`${styles.actionBtn} ${showRaw ? styles.toggleActive : ''}`}
                        onClick={() => setShowRaw(!showRaw)}
                    >
                        {showRaw ? '✨ Highlighted' : '📄 View Raw'}
                    </button>
                    <button className={styles.actionBtn} onClick={handleExport}>
                        Export ↓
                    </button>
                </div>
            </div>

            {/* Two-panel layout */}
            <div className={styles.panels}>
                <div className={styles.transcriptPanel}>
                    {showRaw ? (
                        <div style={{ padding: 24, whiteSpace: 'pre-wrap', fontSize: 14, lineHeight: 1.7, color: 'var(--text-primary)' }}>
                            {interview.transcript || 'No transcript available.'}
                        </div>
                    ) : (
                        <TranscriptPanel
                            transcript={interview.transcript || ''}
                            speakers={interview.speakers}
                            insights={interview.insights}
                            activeInsightId={activeInsightId}
                            onHighlightClick={handleHighlightClick}
                            highlightFilters={highlightFilters}
                            onToggleFilter={handleToggleFilter}
                        />
                    )}
                </div>
                <div className={styles.insightPanel}>
                    <InsightPanel
                        insights={interview.insights}
                        activeInsightId={activeInsightId}
                        onInsightClick={handleInsightClick}
                        onDismiss={handleDismiss}
                        onFlag={handleFlag}
                    />
                </div>
            </div>
        </div>
    );
}
