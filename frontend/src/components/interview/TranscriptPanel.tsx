'use client';

import React, { useState, useMemo, useCallback, useRef } from 'react';
import styles from './TranscriptPanel.module.css';
import type { InsightResponse, SpeakerResponse } from '@/lib/api';

interface TranscriptPanelProps {
    transcript: string;
    speakers: SpeakerResponse[];
    insights: InsightResponse[];
    activeInsightId: string | null;
    onHighlightClick: (insightId: string) => void;
    highlightFilters: Record<string, boolean>;
    onToggleFilter: (category: string) => void;
}

const CATEGORY_LABELS: Record<string, string> = {
    pain_point: 'Pain Point',
    feature_request: 'Feature Request',
    positive: 'Positive Feedback',
    suggestion: 'Suggestion',
};

const CATEGORY_STYLES: Record<string, { dot: string; highlight: string }> = {
    pain_point: { dot: styles.dotPainPoint, highlight: styles.highlightPainPoint },
    feature_request: { dot: styles.dotFeatureRequest, highlight: styles.highlightFeatureRequest },
    positive: { dot: styles.dotPositive, highlight: styles.highlightPositive },
    suggestion: { dot: styles.dotSuggestion, highlight: styles.highlightSuggestion },
};

export default function TranscriptPanel({
    transcript,
    speakers,
    insights,
    activeInsightId,
    onHighlightClick,
    highlightFilters,
    onToggleFilter,
}: TranscriptPanelProps) {
    const [hoveredInsight, setHoveredInsight] = useState<string | null>(null);

    // Build speaker name map
    const speakerMap = useMemo(() => {
        const map: Record<string, { name: string; isInterviewer: boolean }> = {};
        speakers.forEach((s) => {
            map[s.speaker_label] = {
                name: s.name || s.speaker_label,
                isInterviewer: s.is_interviewer,
            };
        });
        return map;
    }, [speakers]);

    // Get unique themes from insights for theme pills
    const themePills = useMemo(() => {
        const themes = new Map<string, string>();
        insights.forEach((i) => {
            if (i.theme_suggestion && !themes.has(i.theme_suggestion)) {
                themes.set(i.theme_suggestion, i.theme_id || '');
            }
        });
        return Array.from(themes.entries()).map(([name, id]) => ({ name, id }));
    }, [insights]);

    // Parse transcript into lines for rendering
    const paragraphs = useMemo(() => {
        if (!transcript) return [];
        return transcript.split('\n').filter((line) => line.trim().length > 0);
    }, [transcript]);

    // Build highlight annotations from insights
    const activeInsights = useMemo(() => {
        return insights.filter(
            (i) => !i.is_dismissed && highlightFilters[i.category] !== false
        );
    }, [insights, highlightFilters]);

    // Speaker metadata
    const primarySpeaker = speakers.find((s) => !s.is_interviewer);

    if (!transcript) {
        return (
            <div className={styles.container}>
                <div className={styles.emptyTranscript}>
                    No transcript available for this interview.
                </div>
            </div>
        );
    }

    return (
        <div className={styles.container}>
            {/* Participant header */}
            <div className={styles.participantHeader}>
                <h1 className={styles.participantName}>
                    {primarySpeaker?.name || primarySpeaker?.speaker_label || 'Interview'}
                </h1>
                <div className={styles.metadataRow}>
                    {primarySpeaker?.role && (
                        <>
                            <span>{primarySpeaker.role}</span>
                            {primarySpeaker.company && <span className={styles.separator}>@</span>}
                        </>
                    )}
                    {primarySpeaker?.company && <span>{primarySpeaker.company}</span>}
                    {speakers.length > 0 && (
                        <>
                            <span className={styles.separator}>·</span>
                            <span>{speakers.length} speakers detected</span>
                        </>
                    )}
                </div>
                {themePills.length > 0 && (
                    <div className={styles.themePills}>
                        {themePills.map((theme) => (
                            <span key={theme.name} className={styles.themePill}>
                                {theme.name}
                            </span>
                        ))}
                    </div>
                )}
            </div>

            {/* Highlight legend bar */}
            <div className={styles.legendBar}>
                {Object.entries(CATEGORY_LABELS).map(([key, label]) => (
                    <button
                        key={key}
                        className={`${styles.legendItem} ${highlightFilters[key] === false ? styles.legendItemDisabled : ''
                            }`}
                        onClick={() => onToggleFilter(key)}
                    >
                        <span
                            className={`${styles.legendDot} ${CATEGORY_STYLES[key]?.dot || ''}`}
                        />
                        {label}
                    </button>
                ))}
            </div>

            {/* Transcript body */}
            <div className={styles.transcriptBody}>
                {paragraphs.map((line, idx) => {
                    // Detect speaker labels like "Interviewer:", "Speaker 1:", "Sarah:"
                    const speakerMatch = line.match(/^([^:]+):\s*/);
                    const speakerLabel = speakerMatch ? speakerMatch[1].trim() : null;
                    const speakerInfo = speakerLabel ? speakerMap[speakerLabel] : null;
                    const textContent = speakerMatch
                        ? line.slice(speakerMatch[0].length)
                        : line;

                    // Check if any insight quote overlaps with this line
                    const lineInsights = activeInsights.filter((insight) => {
                        if (!insight.quote) return false;
                        return textContent
                            .toLowerCase()
                            .includes(insight.quote.toLowerCase().slice(0, 40));
                    });

                    return (
                        <div key={idx} className={styles.paragraph}>
                            {speakerLabel && (
                                <span
                                    className={`${styles.speakerLabel} ${speakerInfo?.isInterviewer
                                            ? styles.speakerInterviewer
                                            : styles.speakerParticipant
                                        }`}
                                >
                                    {speakerInfo?.name || speakerLabel}:
                                </span>
                            )}
                            {lineInsights.length > 0 ? (
                                <HighlightedText
                                    text={textContent}
                                    insights={lineInsights}
                                    activeInsightId={activeInsightId}
                                    hoveredInsight={hoveredInsight}
                                    onHover={setHoveredInsight}
                                    onClick={onHighlightClick}
                                />
                            ) : (
                                <span>{textContent}</span>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

// Sub-component: renders text with highlighted spans for matching insights
function HighlightedText({
    text,
    insights,
    activeInsightId,
    hoveredInsight,
    onHover,
    onClick,
}: {
    text: string;
    insights: InsightResponse[];
    activeInsightId: string | null;
    hoveredInsight: string | null;
    onHover: (id: string | null) => void;
    onClick: (id: string) => void;
}) {
    // Find the first matching insight for highlighting
    const insight = insights[0];
    if (!insight) return <span>{text}</span>;

    const quoteSnippet = insight.quote.slice(0, 60).toLowerCase();
    const lowerText = text.toLowerCase();
    const matchIdx = lowerText.indexOf(quoteSnippet);

    if (matchIdx === -1) {
        // Fallback: highlight entire line
        const highlightClass = CATEGORY_STYLES[insight.category]?.highlight || '';
        return (
            <span
                className={`${styles.highlight} ${highlightClass} ${activeInsightId === insight.id ? styles.highlightActive : ''
                    }`}
                onClick={() => onClick(insight.id)}
                onMouseEnter={() => onHover(insight.id)}
                onMouseLeave={() => onHover(null)}
            >
                {text}
                {hoveredInsight === insight.id && (
                    <span className={styles.tooltip}>
                        {insight.theme_suggestion || insight.title}
                        <span className={styles.tooltipCategory}>
                            · {CATEGORY_LABELS[insight.category] || insight.category}
                        </span>
                    </span>
                )}
            </span>
        );
    }

    const before = text.slice(0, matchIdx);
    const highlighted = text.slice(matchIdx, matchIdx + insight.quote.length);
    const after = text.slice(matchIdx + insight.quote.length);
    const highlightClass = CATEGORY_STYLES[insight.category]?.highlight || '';

    return (
        <span>
            {before}
            <span
                className={`${styles.highlight} ${highlightClass} ${activeInsightId === insight.id ? styles.highlightActive : ''
                    }`}
                onClick={() => onClick(insight.id)}
                onMouseEnter={() => onHover(insight.id)}
                onMouseLeave={() => onHover(null)}
            >
                {highlighted}
                {hoveredInsight === insight.id && (
                    <span className={styles.tooltip}>
                        {insight.theme_suggestion || insight.title}
                        <span className={styles.tooltipCategory}>
                            · {CATEGORY_LABELS[insight.category] || insight.category}
                        </span>
                    </span>
                )}
            </span>
            {after}
        </span>
    );
}
