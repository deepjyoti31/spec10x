'use client';

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import styles from './CommandPalette.module.css';
import { useAuth } from '@/hooks/useAuth';
import { api } from '@/lib/api';
import type { InterviewResponse, ThemeResponse } from '@/lib/api';

interface CommandPaletteProps {
    isOpen: boolean;
    onClose: () => void;
}

interface SearchResult {
    id: string;
    type: 'page' | 'interview' | 'theme';
    icon: string;
    label: string;
    hint?: string;
    href: string;
}

const PAGE_RESULTS: SearchResult[] = [
    { id: 'page-dashboard', type: 'page', icon: 'DB', label: 'Dashboard', href: '/dashboard' },
    { id: 'page-ask', type: 'page', icon: 'QA', label: 'Ask Your Interviews', href: '/ask' },
    { id: 'page-feed', type: 'page', icon: 'FD', label: 'Feed', href: '/feed' },
    { id: 'page-settings', type: 'page', icon: 'ST', label: 'Settings', href: '/settings' },
];

export default function CommandPalette({ isOpen, onClose }: CommandPaletteProps) {
    const router = useRouter();
    const { token } = useAuth();
    const inputRef = useRef<HTMLInputElement>(null);
    const [query, setQuery] = useState('');
    const [activeIdx, setActiveIdx] = useState(0);
    const [interviews, setInterviews] = useState<InterviewResponse[]>([]);
    const [themes, setThemes] = useState<ThemeResponse[]>([]);

    useEffect(() => {
        if (!isOpen || !token) return;

        const fetchData = async () => {
            try {
                const [interviewData, themeData] = await Promise.all([
                    api.listInterviews(token),
                    api.listThemes(token),
                ]);
                setInterviews(interviewData);
                setThemes(themeData);
            } catch {
                // Silently fail in the palette.
            }
        };

        fetchData();
    }, [isOpen, token]);

    useEffect(() => {
        if (!isOpen) return;
        setQuery('');
        setActiveIdx(0);
        setTimeout(() => inputRef.current?.focus(), 50);
    }, [isOpen]);

    const results = useMemo(() => {
        const q = query.toLowerCase().trim();
        const items: SearchResult[] = [];

        items.push(...PAGE_RESULTS.filter((page) => !q || page.label.toLowerCase().includes(q)));

        items.push(
            ...interviews
                .filter((interview) => !q || interview.filename.toLowerCase().includes(q))
                .slice(0, 5)
                .map((interview) => ({
                    id: `interview-${interview.id}`,
                    type: 'interview' as const,
                    icon: 'IV',
                    label: interview.filename,
                    hint: interview.status,
                    href: `/interview/${interview.id}`,
                }))
        );

        items.push(
            ...themes
                .filter((theme) => !q || theme.name.toLowerCase().includes(q))
                .slice(0, 5)
                .map((theme) => ({
                    id: `theme-${theme.id}`,
                    type: 'theme' as const,
                    icon: 'TH',
                    label: theme.name,
                    hint: `${theme.mention_count} mentions`,
                    href: '/dashboard',
                }))
        );

        return items;
    }, [interviews, query, themes]);

    useEffect(() => {
        setActiveIdx(0);
    }, [results.length]);

    const handleSelect = useCallback(
        (result: SearchResult) => {
            onClose();
            router.push(result.href);
        },
        [onClose, router]
    );

    const handleKeyDown = useCallback(
        (event: React.KeyboardEvent) => {
            switch (event.key) {
                case 'ArrowDown':
                    event.preventDefault();
                    setActiveIdx((prev) => Math.min(prev + 1, results.length - 1));
                    break;
                case 'ArrowUp':
                    event.preventDefault();
                    setActiveIdx((prev) => Math.max(prev - 1, 0));
                    break;
                case 'Enter':
                    event.preventDefault();
                    if (results[activeIdx]) {
                        handleSelect(results[activeIdx]);
                    }
                    break;
                case 'Escape':
                    event.preventDefault();
                    onClose();
                    break;
            }
        },
        [activeIdx, handleSelect, onClose, results]
    );

    if (!isOpen) return null;

    const pageResults = results.filter((result) => result.type === 'page');
    const interviewResults = results.filter((result) => result.type === 'interview');
    const themeResults = results.filter((result) => result.type === 'theme');

    let globalIdx = 0;

    return (
        <div className={styles.overlay} onClick={onClose}>
            <div className={styles.palette} onClick={(event) => event.stopPropagation()}>
                <input
                    ref={inputRef}
                    className={styles.searchInput}
                    placeholder="Search interviews, themes, pages..."
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    onKeyDown={handleKeyDown}
                />

                <div className={styles.results}>
                    {results.length === 0 ? (
                        <div className={styles.noResults}>No results found</div>
                    ) : (
                        <>
                            {pageResults.length > 0 && (
                                <>
                                    <div className={styles.groupLabel}>Pages</div>
                                    {pageResults.map((result) => {
                                        const idx = globalIdx++;
                                        return (
                                            <div
                                                key={result.id}
                                                className={`${styles.resultItem} ${idx === activeIdx ? styles.resultItemActive : ''}`}
                                                onClick={() => handleSelect(result)}
                                                onMouseEnter={() => setActiveIdx(idx)}
                                            >
                                                <span className={styles.resultIcon}>{result.icon}</span>
                                                <span className={styles.resultLabel}>{result.label}</span>
                                            </div>
                                        );
                                    })}
                                </>
                            )}

                            {interviewResults.length > 0 && (
                                <>
                                    <div className={styles.groupLabel}>Interviews</div>
                                    {interviewResults.map((result) => {
                                        const idx = globalIdx++;
                                        return (
                                            <div
                                                key={result.id}
                                                className={`${styles.resultItem} ${idx === activeIdx ? styles.resultItemActive : ''}`}
                                                onClick={() => handleSelect(result)}
                                                onMouseEnter={() => setActiveIdx(idx)}
                                            >
                                                <span className={styles.resultIcon}>{result.icon}</span>
                                                <span className={styles.resultLabel}>{result.label}</span>
                                                {result.hint && (
                                                    <span className={styles.resultHint}>{result.hint}</span>
                                                )}
                                            </div>
                                        );
                                    })}
                                </>
                            )}

                            {themeResults.length > 0 && (
                                <>
                                    <div className={styles.groupLabel}>Themes</div>
                                    {themeResults.map((result) => {
                                        const idx = globalIdx++;
                                        return (
                                            <div
                                                key={result.id}
                                                className={`${styles.resultItem} ${idx === activeIdx ? styles.resultItemActive : ''}`}
                                                onClick={() => handleSelect(result)}
                                                onMouseEnter={() => setActiveIdx(idx)}
                                            >
                                                <span className={styles.resultIcon}>{result.icon}</span>
                                                <span className={styles.resultLabel}>{result.label}</span>
                                                {result.hint && (
                                                    <span className={styles.resultHint}>{result.hint}</span>
                                                )}
                                            </div>
                                        );
                                    })}
                                </>
                            )}
                        </>
                    )}
                </div>

                <div className={styles.footer}>
                    <span><span className={styles.kbd}>Up/Down</span> Navigate</span>
                    <span><span className={styles.kbd}>Enter</span> Select</span>
                    <span><span className={styles.kbd}>Esc</span> Close</span>
                </div>
            </div>
        </div>
    );
}
