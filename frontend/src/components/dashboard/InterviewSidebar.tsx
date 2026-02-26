'use client';

import React, { useState, useMemo } from 'react';
import { InterviewResponse } from '@/lib/api';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import styles from './InterviewSidebar.module.css';

interface InterviewSidebarProps {
    interviews: InterviewResponse[];
    loading: boolean;
    selectedId: string | null;
    onSelect: (interview: InterviewResponse) => void;
    onUploadClick: () => void;
    sort: string;
    onSortChange: (sort: string) => void;
    totalInsights?: number;
    totalThemes?: number;
}

export default function InterviewSidebar({
    interviews,
    loading,
    selectedId,
    onSelect,
    onUploadClick,
    sort,
    onSortChange,
    totalInsights = 0,
    totalThemes = 0,
}: InterviewSidebarProps) {
    const [filter, setFilter] = useState('');

    const filteredInterviews = useMemo(() => {
        if (!filter.trim()) return interviews;
        const q = filter.toLowerCase();
        return interviews.filter((i) =>
            i.filename.toLowerCase().includes(q)
        );
    }, [interviews, filter]);

    const getDisplayName = (interview: InterviewResponse) => {
        // Remove extension for display
        const name = interview.filename.replace(/\.[^/.]+$/, '');
        return name || `Interview`;
    };

    const getStatusClass = (status: string) => {
        if (status === 'done') return styles.statusDone;
        if (status === 'error') return styles.statusError;
        return styles.statusProcessing;
    };

    const isEmpty = interviews.length === 0 && !loading;

    return (
        <div className={styles.sidebar}>
            {/* Upload Button */}
            <div className={styles.uploadBtn}>
                <Button
                    fullWidth
                    size="md"
                    onClick={onUploadClick}
                    className={isEmpty ? styles.pulseUpload : ''}
                >
                    + Upload
                </Button>
            </div>

            {!isEmpty && (
                <>
                    {/* Search */}
                    <div className={styles.searchBox}>
                        <Input
                            placeholder="Filter interviews…"
                            icon="🔍"
                            value={filter}
                            onChange={(e) => setFilter(e.target.value)}
                        />
                    </div>

                    {/* Sort */}
                    <div className={styles.sortRow}>
                        <span className={styles.sortLabel}>Sort:</span>
                        <select
                            className={styles.sortSelect}
                            value={sort}
                            onChange={(e) => onSortChange(e.target.value)}
                        >
                            <option value="recent">Recent first</option>
                            <option value="name">By name</option>
                            <option value="sentiment">By sentiment</option>
                        </select>
                    </div>
                </>
            )}

            {/* Interview List */}
            {isEmpty ? (
                <div className={styles.emptyState}>
                    <div className={styles.emptyTitle}>No interviews yet</div>
                    <div className={styles.emptyText}>
                        Upload transcripts or audio files to get started
                    </div>
                </div>
            ) : (
                <div className={styles.interviewList}>
                    {loading
                        ? Array.from({ length: 5 }).map((_, i) => (
                            <div key={i} className={styles.interviewItem} style={{ opacity: 0.5 }}>
                                <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--color-bg-elevated)' }} />
                                <div className={styles.interviewInfo}>
                                    <div style={{ height: 14, background: 'var(--color-bg-elevated)', borderRadius: 4, width: `${60 + Math.random() * 30}%` }} />
                                    <div style={{ height: 10, background: 'var(--color-bg-elevated)', borderRadius: 4, width: '40%', marginTop: 4 }} />
                                </div>
                            </div>
                        ))
                        : filteredInterviews.map((interview) => (
                            <div
                                key={interview.id}
                                className={`${styles.interviewItem} ${selectedId === interview.id ? styles.interviewItemActive : ''}`}
                                onClick={() => onSelect(interview)}
                            >
                                <div className={`${styles.statusDot} ${getStatusClass(interview.status)}`} />
                                <div className={styles.interviewInfo}>
                                    <div className={styles.interviewName}>
                                        {getDisplayName(interview)}
                                    </div>
                                    <div className={styles.interviewMeta}>
                                        <span>{interview.file_type.toUpperCase()}</span>
                                        <span>·</span>
                                        <span>{new Date(interview.created_at).toLocaleDateString()}</span>
                                    </div>
                                </div>
                            </div>
                        ))}
                </div>
            )}

            {/* Stats Footer */}
            {!isEmpty && (
                <div className={styles.statsFooter}>
                    {interviews.length} interview{interviews.length !== 1 ? 's' : ''} · {totalInsights} insights · {totalThemes} themes
                </div>
            )}
        </div>
    );
}
