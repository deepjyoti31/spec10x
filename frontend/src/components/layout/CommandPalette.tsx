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
    { id: 'page-dashboard', type: 'page', icon: '📊', label: 'Dashboard', href: '/dashboard' },
    { id: 'page-ask', type: 'page', icon: '✨', label: 'Ask Your Interviews', href: '/ask' },
    { id: 'page-settings', type: 'page', icon: '⚙️', label: 'Settings', href: '/settings' },
];

export default function CommandPalette({ isOpen, onClose }: CommandPaletteProps) {
    const router = useRouter();
    const { token } = useAuth();
    const inputRef = useRef<HTMLInputElement>(null);
    const [query, setQuery] = useState('');
    const [activeIdx, setActiveIdx] = useState(0);
    const [interviews, setInterviews] = useState<InterviewResponse[]>([]);
    const [themes, setThemes] = useState<ThemeResponse[]>([]);

    // Fetch data when opened
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
                // silently fail
            }
        };
        fetchData();
    }, [isOpen, token]);

    // Focus input when opened
    useEffect(() => {
        if (isOpen) {
            setQuery('');
            setActiveIdx(0);
            setTimeout(() => inputRef.current?.focus(), 50);
        }
    }, [isOpen]);

    // Build filtered results
    const results = useMemo(() => {
        const q = query.toLowerCase().trim();
        const items: SearchResult[] = [];

        // Pages
        const pageMatches = PAGE_RESULTS.filter(
            (p) => !q || p.label.toLowerCase().includes(q)
        );
        items.push(...pageMatches);

        // Interviews
        const interviewMatches = interviews
            .filter((i) => !q || i.filename.toLowerCase().includes(q))
            .slice(0, 5)
            .map((i) => ({
                id: `interview-${i.id}`,
                type: 'interview' as const,
                icon: '📄',
                label: i.filename,
                hint: i.status,
                href: `/interview/${i.id}`,
            }));
        items.push(...interviewMatches);

        // Themes
        const themeMatches = themes
            .filter((t) => !q || t.name.toLowerCase().includes(q))
            .slice(0, 5)
            .map((t) => ({
                id: `theme-${t.id}`,
                type: 'theme' as const,
                icon: '🏷️',
                label: t.name,
                hint: `${t.mention_count} mentions`,
                href: `/dashboard`,
            }));
        items.push(...themeMatches);

        return items;
    }, [query, interviews, themes]);

    // Reset active index when results change
    useEffect(() => {
        setActiveIdx(0);
    }, [results.length]);

    // Navigate to result
    const handleSelect = useCallback(
        (result: SearchResult) => {
            onClose();
            router.push(result.href);
        },
        [onClose, router]
    );

    // Keyboard navigation
    const handleKeyDown = useCallback(
        (e: React.KeyboardEvent) => {
            switch (e.key) {
                case 'ArrowDown':
                    e.preventDefault();
                    setActiveIdx((prev) => Math.min(prev + 1, results.length - 1));
                    break;
                case 'ArrowUp':
                    e.preventDefault();
                    setActiveIdx((prev) => Math.max(prev - 1, 0));
                    break;
                case 'Enter':
                    e.preventDefault();
                    if (results[activeIdx]) handleSelect(results[activeIdx]);
                    break;
                case 'Escape':
                    e.preventDefault();
                    onClose();
                    break;
            }
        },
        [results, activeIdx, handleSelect, onClose]
    );

    if (!isOpen) return null;

    // Group results by type
    const pageResults = results.filter((r) => r.type === 'page');
    const interviewResults = results.filter((r) => r.type === 'interview');
    const themeResults = results.filter((r) => r.type === 'theme');

    let globalIdx = 0;

    return (
        <div className={styles.overlay} onClick={onClose}>
            <div className={styles.palette} onClick={(e) => e.stopPropagation()}>
                <input
                    ref={inputRef}
                    className={styles.searchInput}
                    placeholder="Search interviews, themes, pages…"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
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
                                    {pageResults.map((r) => {
                                        const idx = globalIdx++;
                                        return (
                                            <div
                                                key={r.id}
                                                className={`${styles.resultItem} ${idx === activeIdx ? styles.resultItemActive : ''
                                                    }`}
                                                onClick={() => handleSelect(r)}
                                                onMouseEnter={() => setActiveIdx(idx)}
                                            >
                                                <span className={styles.resultIcon}>{r.icon}</span>
                                                <span className={styles.resultLabel}>{r.label}</span>
                                            </div>
                                        );
                                    })}
                                </>
                            )}

                            {interviewResults.length > 0 && (
                                <>
                                    <div className={styles.groupLabel}>Interviews</div>
                                    {interviewResults.map((r) => {
                                        const idx = globalIdx++;
                                        return (
                                            <div
                                                key={r.id}
                                                className={`${styles.resultItem} ${idx === activeIdx ? styles.resultItemActive : ''
                                                    }`}
                                                onClick={() => handleSelect(r)}
                                                onMouseEnter={() => setActiveIdx(idx)}
                                            >
                                                <span className={styles.resultIcon}>{r.icon}</span>
                                                <span className={styles.resultLabel}>{r.label}</span>
                                                {r.hint && (
                                                    <span className={styles.resultHint}>{r.hint}</span>
                                                )}
                                            </div>
                                        );
                                    })}
                                </>
                            )}

                            {themeResults.length > 0 && (
                                <>
                                    <div className={styles.groupLabel}>Themes</div>
                                    {themeResults.map((r) => {
                                        const idx = globalIdx++;
                                        return (
                                            <div
                                                key={r.id}
                                                className={`${styles.resultItem} ${idx === activeIdx ? styles.resultItemActive : ''
                                                    }`}
                                                onClick={() => handleSelect(r)}
                                                onMouseEnter={() => setActiveIdx(idx)}
                                            >
                                                <span className={styles.resultIcon}>{r.icon}</span>
                                                <span className={styles.resultLabel}>{r.label}</span>
                                                {r.hint && (
                                                    <span className={styles.resultHint}>{r.hint}</span>
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
                    <span><span className={styles.kbd}>↑↓</span> Navigate</span>
                    <span><span className={styles.kbd}>↵</span> Select</span>
                    <span><span className={styles.kbd}>Esc</span> Close</span>
                </div>
            </div>
        </div>
    );
}
