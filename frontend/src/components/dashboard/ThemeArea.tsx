'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ThemeResponse } from '@/lib/api';
import ThemeCard from './ThemeCard';
import Button from '@/components/ui/Button';
import Skeleton from '@/components/ui/Skeleton';
import styles from './ThemeArea.module.css';

const SORT_OPTIONS = [
    { value: 'urgency', label: 'By Urgency' },
    { value: 'frequency', label: 'By Frequency' },
    { value: 'sentiment', label: 'By Sentiment' },
    { value: 'recency', label: 'By Recency' },
];

interface ThemeAreaProps {
    activeThemes: ThemeResponse[];
    previousThemes: ThemeResponse[];
    loading: boolean;
    sort: string;
    onSortChange: (sort: string) => void;
    selectedThemeId: string | null;
    onThemeSelect: (theme: ThemeResponse) => void;
    onThemeRename?: (id: string, name: string) => void;
    onUploadClick: () => void;
    onLoadSampleData?: () => void;
    interviewCount: number;
}

export default function ThemeArea({
    activeThemes,
    previousThemes,
    loading,
    sort,
    onSortChange,
    selectedThemeId,
    onThemeSelect,
    onThemeRename,
    onUploadClick,
    onLoadSampleData,
    interviewCount,
}: ThemeAreaProps) {
    const router = useRouter();
    const [showAll, setShowAll] = useState(false);
    const [showPrevious, setShowPrevious] = useState(false);

    const displayThemes = showAll ? activeThemes : activeThemes.slice(0, 10);
    const hasMore = activeThemes.length > 10;
    const isEmpty = activeThemes.length === 0 && previousThemes.length === 0 && !loading;

    const handleAskKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter' && e.currentTarget.value.trim()) {
            router.push(`/ask?q=${encodeURIComponent(e.currentTarget.value.trim())}`);
        }
    };

    // Empty state
    if (isEmpty) {
        return (
            <div className={styles.themeArea}>
                <div className={styles.emptyState}>
                    <div className={styles.emptyIllustration}>📊</div>
                    <h2 className={styles.emptyTitle}>Upload your first interviews</h2>
                    <p className={styles.emptyText}>
                        Drag & drop transcripts, audio, or video files. Spec10x will analyze them
                        and uncover the themes and insights hidden in your data.
                    </p>
                    <Button size="lg" onClick={onUploadClick}>
                        Upload Interviews
                    </Button>
                    <div className={styles.formatPills}>
                        {['.txt', '.md', '.pdf', '.docx', '.mp3', '.wav', '.mp4'].map((fmt) => (
                            <span key={fmt} className={styles.formatPill}>{fmt}</span>
                        ))}
                    </div>
                    <button className={styles.sampleLink} onClick={onLoadSampleData}>
                        Or try with sample data →
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className={styles.themeArea}>
            {/* Header */}
            <div className={styles.header}>
                <div className={styles.titleRow}>
                    <h1 className={styles.title}>Your Insights</h1>
                    <span className={styles.subtitle}>
                        {interviewCount} interview{interviewCount !== 1 ? 's' : ''} analyzed
                    </span>
                </div>

                {/* Sort toggles */}
                <div className={styles.sortToggles}>
                    {SORT_OPTIONS.map((opt) => (
                        <button
                            key={opt.value}
                            className={`${styles.sortPill} ${sort === opt.value ? styles.sortPillActive : ''}`}
                            onClick={() => onSortChange(opt.value)}
                        >
                            {opt.label}
                        </button>
                    ))}
                </div>

                {/* Ask input */}
                <div className={styles.askInputWrapper}>
                    <div className={styles.askInputContainer}>
                        <span className={styles.askIcon}>✨</span>
                        <input
                            className={styles.askInput}
                            placeholder="Ask a question about your interviews…"
                            onKeyDown={handleAskKeyDown}
                            onClick={() => router.push('/ask')}
                        />
                    </div>
                </div>
            </div>

            {/* Loading skeleton */}
            {loading ? (
                <div className={styles.skeletonGrid}>
                    {Array.from({ length: 6 }).map((_, i) => (
                        <Skeleton key={i} variant="card" />
                    ))}
                </div>
            ) : (
                <>
                    {/* Theme card grid */}
                    <div className={styles.themeGrid}>
                        {displayThemes.map((theme) => (
                            <ThemeCard
                                key={theme.id}
                                theme={theme}
                                selected={selectedThemeId === theme.id}
                                onClick={() => onThemeSelect(theme)}
                                onRename={onThemeRename}
                            />
                        ))}
                    </div>

                    {/* Show more */}
                    {hasMore && !showAll && (
                        <button className={styles.showMore} onClick={() => setShowAll(true)}>
                            Show {activeThemes.length - 10} more theme{activeThemes.length - 10 !== 1 ? 's' : ''} →
                        </button>
                    )}

                    {/* Previous themes */}
                    {previousThemes.length > 0 && (
                        <div className={styles.previousSection}>
                            <button
                                className={styles.previousHeader}
                                onClick={() => setShowPrevious(!showPrevious)}
                            >
                                <span className={`${styles.chevron} ${showPrevious ? styles.chevronOpen : ''}`}>▶</span>
                                Previous themes ({previousThemes.length})
                            </button>
                            {showPrevious && (
                                <div className={styles.themeGrid}>
                                    {previousThemes.map((theme) => (
                                        <ThemeCard
                                            key={theme.id}
                                            theme={theme}
                                            selected={selectedThemeId === theme.id}
                                            onClick={() => onThemeSelect(theme)}
                                            onRename={onThemeRename}
                                        />
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </>
            )}
        </div>
    );
}
