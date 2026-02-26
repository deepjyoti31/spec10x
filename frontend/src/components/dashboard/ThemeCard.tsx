'use client';

import React, { useState, useRef, useEffect } from 'react';
import { ThemeResponse } from '@/lib/api';
import Badge from '@/components/ui/Badge';
import SentimentBar from '@/components/ui/SentimentBar';
import styles from './ThemeCard.module.css';

interface ThemeCardProps {
    theme: ThemeResponse;
    selected?: boolean;
    onClick: () => void;
    onRename?: (id: string, name: string) => void;
}

export default function ThemeCard({
    theme,
    selected = false,
    onClick,
    onRename,
}: ThemeCardProps) {
    const [isEditing, setIsEditing] = useState(false);
    const [editName, setEditName] = useState(theme.name);
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (isEditing && inputRef.current) {
            inputRef.current.focus();
            inputRef.current.select();
        }
    }, [isEditing]);

    const handleSave = () => {
        if (editName.trim() && editName !== theme.name) {
            onRename?.(theme.id, editName.trim());
        }
        setIsEditing(false);
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') handleSave();
        if (e.key === 'Escape') {
            setEditName(theme.name);
            setIsEditing(false);
        }
    };

    return (
        <div
            className={`${styles.card} ${selected ? styles.cardSelected : ''}`}
            onClick={onClick}
        >
            {/* Header: Theme name + NEW badge */}
            <div className={styles.cardHeader}>
                <div className={styles.themeName}>
                    {isEditing ? (
                        <input
                            ref={inputRef}
                            className={styles.editInput}
                            value={editName}
                            onChange={(e) => setEditName(e.target.value)}
                            onBlur={handleSave}
                            onKeyDown={handleKeyDown}
                            onClick={(e) => e.stopPropagation()}
                        />
                    ) : (
                        <>
                            {theme.name}
                            <button
                                className={styles.editIcon}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setIsEditing(true);
                                }}
                                aria-label="Rename theme"
                            >
                                ✏️
                            </button>
                        </>
                    )}
                </div>
                {theme.is_new && <Badge variant="new">NEW</Badge>}
            </div>

            {/* Mention count */}
            <div className={styles.mentionCount}>
                <Badge variant="count">
                    Mentioned across {theme.mention_count} source{theme.mention_count !== 1 ? 's' : ''}
                </Badge>
            </div>

            {/* Sentiment bar */}
            <div className={styles.sentimentRow}>
                <SentimentBar
                    positive={theme.sentiment_positive}
                    neutral={theme.sentiment_neutral}
                    negative={theme.sentiment_negative}
                />
            </div>

            {/* Placeholder for quotes — will be populated from theme detail API */}
            <div className={styles.quotes}>
                <div className={styles.quote}>
                    <span>Theme details visible when selected…</span>
                </div>
            </div>
        </div>
    );
}
