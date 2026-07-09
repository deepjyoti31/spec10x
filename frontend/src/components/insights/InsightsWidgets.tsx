'use client';

import Link from 'next/link';
import { useState } from 'react';

import type {
  SourceType,
  ThemeDetailResponse,
  ThemeExplorerCard,
  ThemeExplorerSentiment,
  ThemeExplorerSort,
  ThemeTrendResponse,
} from '@/lib/api';

export const LIVE_SOURCE_OPTIONS: Array<{ value: SourceType; label: string }> = [
  { value: 'interview', label: 'Interview' },
  { value: 'support', label: 'Support' },
  { value: 'survey', label: 'Survey' },
  { value: 'analytics', label: 'Analytics' },
];

export const SORT_OPTIONS: Array<{ value: ThemeExplorerSort; label: string }> = [
  { value: 'urgency', label: 'Urgency' },
  { value: 'frequency', label: 'Frequency' },
  { value: 'sentiment', label: 'Sentiment' },
  { value: 'recency', label: 'Recency' },
];

function formatImpactScore(score: number): string {
  return (score / 10).toFixed(1);
}

function formatRelativeTime(timestamp?: string): string {
  if (!timestamp) return 'No recent evidence';

  const now = new Date();
  const then = new Date(timestamp);
  const diffMs = then.getTime() - now.getTime();
  const diffMinutes = Math.round(diffMs / 60000);
  const rtf = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });

  if (Math.abs(diffMinutes) < 60) {
    return rtf.format(diffMinutes, 'minute');
  }

  const diffHours = Math.round(diffMinutes / 60);
  if (Math.abs(diffHours) < 24) {
    return rtf.format(diffHours, 'hour');
  }

  const diffDays = Math.round(diffHours / 24);
  return rtf.format(diffDays, 'day');
}

function formatDateSpan(values: string[]): string {
  if (!values.length) {
    return 'Awaiting evidence';
  }

  const sortedValues = [...values].sort();
  const formatter = new Intl.DateTimeFormat('en', {
    month: 'short',
    day: 'numeric',
  });
  const first = formatter.format(new Date(sortedValues[0]));
  const last = formatter.format(new Date(sortedValues[sortedValues.length - 1]));
  return first === last ? first : `${first} - ${last}`;
}

function toPercent(value: number): number {
  return Math.max(0, Math.round(value * 100));
}

function getDominantSentiment(theme: ThemeDetailResponse): string {
  const entries: Array<[string, number]> = [
    ['Negative', theme.sentiment_negative],
    ['Neutral', theme.sentiment_neutral],
    ['Positive', theme.sentiment_positive],
  ];
  return entries.sort((a, b) => b[1] - a[1])[0][0];
}

function getSourceAccent(sourceType: string): string {
  if (sourceType === 'support') return '#ffb77b';
  if (sourceType === 'survey') return '#b2c6f8';
  if (sourceType === 'analytics') return '#d9b8ff';
  return '#afc6ff';
}

function formatBreakdownPoints(value?: number, max?: number): string {
  if (typeof value !== 'number') return '0.0';
  if (typeof max !== 'number') return value.toFixed(1);
  return `${value.toFixed(1)} / ${max}`;
}

function getInitials(value?: string): string {
  if (!value) return 'AI';
  const pieces = value
    .split(/\s+/)
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, 2);
  if (!pieces.length) return 'AI';
  return pieces.map((item) => item[0]?.toUpperCase() ?? '').join('');
}

interface InsightsFilterRailProps {
  selectedSources: SourceType[];
  selectedSentiment: ThemeExplorerSentiment | null;
  dateFrom: string;
  dateTo: string;
  onToggleSource: (source: SourceType) => void;
  onSentimentChange: (sentiment: ThemeExplorerSentiment | null) => void;
  onDateChange: (field: 'date_from' | 'date_to', value: string) => void;
  onClearFilters: () => void;
}

export function InsightsFilterRail({
  selectedSources,
  selectedSentiment,
  dateFrom,
  dateTo,
  onToggleSource,
  onSentimentChange,
  onDateChange,
  onClearFilters,
}: InsightsFilterRailProps) {
  return (
    <section
      className="w-[220px] flex flex-col h-full border-r flex-shrink-0"
      style={{ backgroundColor: '#0C0D12', borderColor: 'rgba(66,71,83,0.1)' }}
    >
      <div className="p-5 flex justify-between items-end">
        <h2 className="text-xs font-semibold uppercase tracking-widest text-[#5A5C66]">
          Filters
        </h2>
        <button
          type="button"
          onClick={onClearFilters}
          className="text-[10px] text-[#afc6ff] hover:underline"
        >
          Clear all
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-5 py-2 space-y-8">
        <div>
          <h3 className="text-xs font-semibold text-[#c8cad6] mb-3">Sources</h3>
          <div className="space-y-2.5">
            {LIVE_SOURCE_OPTIONS.map((source) => (
              <label key={source.value} className="flex items-center gap-2.5 cursor-pointer group">
                <input
                  type="checkbox"
                  checked={selectedSources.includes(source.value)}
                  onChange={() => onToggleSource(source.value)}
                  className="w-3.5 h-3.5 rounded-sm"
                  style={{ accentColor: '#afc6ff' }}
                />
                <span className="text-xs text-[#8B8D97] group-hover:text-[#F0F0F3] transition-colors">
                  {source.label}
                </span>
              </label>
            ))}
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2.5 opacity-40 cursor-default">
                <input type="checkbox" disabled className="w-3.5 h-3.5 rounded-sm" />
                <span className="text-xs text-[#8B8D97]">Analytics</span>
              </label>
              <span className="text-[9px] text-[#5A5C66] px-1 rounded" style={{ backgroundColor: '#1e1f26' }}>SOON</span>
            </div>
          </div>
        </div>

        <div>
          <h3 className="text-xs font-semibold text-[#c8cad6] mb-3">Sentiment</h3>
          <div className="space-y-2.5">
            {[
              { label: 'All selected', value: null },
              { label: 'Negative', value: 'negative' },
              { label: 'Positive', value: 'positive' },
              { label: 'Neutral', value: 'neutral' },
            ].map((option) => (
              <label key={option.label} className="flex items-center gap-2.5 cursor-pointer group">
                <input
                  type="radio"
                  name="sentiment"
                  checked={selectedSentiment === option.value}
                  onChange={() =>
                    onSentimentChange(option.value as ThemeExplorerSentiment | null)
                  }
                  className="w-3.5 h-3.5"
                  style={{ accentColor: '#afc6ff' }}
                />
                <span className="text-xs text-[#8B8D97] group-hover:text-[#F0F0F3]">
                  {option.label}
                </span>
              </label>
            ))}
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2.5 opacity-40 cursor-default">
                <input type="radio" name="sentiment" disabled className="w-3.5 h-3.5" />
                <span className="text-xs text-[#8B8D97]">Polarizing</span>
              </label>
              <span className="text-[9px] text-[#5A5C66] px-1 rounded" style={{ backgroundColor: '#1e1f26' }}>SOON</span>
            </div>
          </div>
        </div>

        <div>
          <h3 className="text-xs font-semibold text-[#c8cad6] mb-3">Date Range</h3>
          <div className="space-y-2">
            <input
              type="date"
              value={dateFrom}
              onChange={(event) => onDateChange('date_from', event.target.value)}
              className="w-full rounded text-[11px] py-2 px-3 outline-none transition-all"
              style={{
                backgroundColor: '#161820',
                border: '1px solid transparent',
                color: '#8B8D97',
              }}
              onFocus={(event) => {
                event.currentTarget.style.border = '1px solid rgba(175,198,255,0.3)';
              }}
              onBlur={(event) => {
                event.currentTarget.style.border = '1px solid transparent';
              }}
            />
            <input
              type="date"
              value={dateTo}
              onChange={(event) => onDateChange('date_to', event.target.value)}
              className="w-full rounded text-[11px] py-2 px-3 outline-none transition-all"
              style={{
                backgroundColor: '#161820',
                border: '1px solid transparent',
                color: '#8B8D97',
              }}
              onFocus={(event) => {
                event.currentTarget.style.border = '1px solid rgba(175,198,255,0.3)';
              }}
              onBlur={(event) => {
                event.currentTarget.style.border = '1px solid transparent';
              }}
            />
          </div>
        </div>

        <div className="space-y-6 pb-6">
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-semibold text-[#c8cad6]">Collection</h3>
              <span className="text-[9px] text-[#5A5C66] px-1 rounded" style={{ backgroundColor: '#1e1f26' }}>SOON</span>
            </div>
            <button
              type="button"
              disabled
              className="w-full flex items-center justify-between px-3 py-2 rounded text-[11px] cursor-not-allowed opacity-40"
              style={{ backgroundColor: '#161820', color: '#8B8D97', border: '1px solid rgba(66,71,83,0.1)' }}
            >
              <span>Select collection…</span>
              <span className="material-symbols-outlined" style={{ fontSize: 14, color: '#5A5C66' }}>expand_more</span>
            </button>
          </div>

          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-semibold text-[#c8cad6]">Saved View</h3>
              <span className="text-[9px] text-[#5A5C66] px-1 rounded" style={{ backgroundColor: '#1e1f26' }}>SOON</span>
            </div>
            <button
              type="button"
              disabled
              className="w-full flex items-center justify-between px-3 py-2 rounded text-[11px] cursor-not-allowed opacity-40 mb-2"
              style={{ backgroundColor: '#161820', color: '#8B8D97', border: '1px solid rgba(66,71,83,0.1)' }}
            >
              <span>Select view…</span>
              <span className="material-symbols-outlined" style={{ fontSize: 14, color: '#5A5C66' }}>expand_more</span>
            </button>
            <button
              type="button"
              disabled
              className="w-full text-center py-1.5 rounded text-[11px] cursor-not-allowed opacity-40"
              style={{ color: '#8B8D97', border: '1px solid rgba(66,71,83,0.1)' }}
            >
              Save current
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}

interface SortTabsProps {
  activeSort: ThemeExplorerSort;
  onSelect: (sort: ThemeExplorerSort) => void;
}

export function SortTabs({ activeSort, onSelect }: SortTabsProps) {
  return (
    <div className="flex p-1 rounded-lg" style={{ backgroundColor: '#0c0e14' }}>
      {SORT_OPTIONS.map((option) => (
        <button
          key={option.value}
          type="button"
          onClick={() => onSelect(option.value)}
          className="px-3 py-1 text-xs font-medium rounded-md transition-all"
          style={
            activeSort === option.value
              ? {
                  backgroundColor: '#afc6ff',
                  color: '#002d6c',
                  boxShadow: '0 4px 6px rgba(175,198,255,0.1)',
                }
              : { color: '#5A5C66' }
          }
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

interface ThemeCardProps {
  card: ThemeExplorerCard;
  selected: boolean;
  onClick: () => void;
}

export function ThemeCard({ card, selected, onClick }: ThemeCardProps) {
  const sentimentSegments = [
    { color: '#ffb4ab', pct: toPercent(card.sentiment.negative) },
    { color: '#4a4e5c', pct: toPercent(card.sentiment.neutral) },
    { color: '#afc6ff', pct: toPercent(card.sentiment.positive) },
  ].filter((segment) => segment.pct > 0);

  return (
    <article
      onClick={onClick}
      className="rounded-xl p-5 cursor-pointer transition-all hover:-translate-y-0.5"
      style={{
        backgroundColor: selected ? '#282a30' : '#191b22',
        border: selected
          ? '1px solid rgba(175,198,255,0.4)'
          : '1px solid transparent',
        boxShadow: selected ? '0 20px 25px rgba(175,198,255,0.05)' : 'none',
      }}
    >
      <div className="flex justify-between items-start mb-3">
        <h3
          className="font-semibold leading-tight"
          style={{ color: selected ? '#afc6ff' : '#e2e2eb' }}
        >
          {card.name}
        </h3>
        <div className="flex items-center gap-2">
          <ThemeTrendBadge trend={card.trend} />
          {card.is_new && (
            <span
              className="text-[10px] font-bold px-1.5 py-0.5 rounded"
              style={{
                backgroundColor: 'rgba(175,198,255,0.2)',
                color: '#afc6ff',
              }}
            >
              NEW
            </span>
          )}
          <span
            className="text-xs font-bold"
            style={{ color: card.impact_score > 70 ? '#34D399' : card.impact_score > 40 ? '#ffb77b' : '#ffb4ab' }}
          >
            {formatImpactScore(card.impact_score)}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-3 mb-4 flex-wrap">
        <div className="flex items-center gap-1">
          <span
            className="material-symbols-outlined text-[#5A5C66]"
            style={{ fontSize: 14 }}
          >
            forum
          </span>
          <span className="text-[11px] text-[#8B8D97]">
            {card.mention_count} {card.mention_count === 1 ? 'mention' : 'mentions'}
          </span>
        </div>
        <div className="flex gap-1 flex-wrap">
          {card.source_chips.map((source) => (
            <span
              key={`${card.id}-${source.source_type}`}
              className="text-[10px] text-[#8B8D97] px-1.5 rounded"
              style={{ backgroundColor: '#1e1f26' }}
            >
              {source.label}
              {source.count > 1 ? ` (${source.count})` : ''}
            </span>
          ))}
        </div>
      </div>

      <div
        className="h-1 w-full rounded-full mb-4 overflow-hidden flex"
        style={{ backgroundColor: '#0c0e14' }}
      >
        {sentimentSegments.map((segment) => (
          <div
            key={`${card.id}-${segment.color}`}
            className="h-full"
            style={{ backgroundColor: segment.color, width: `${segment.pct}%` }}
          />
        ))}
      </div>

      <div className="space-y-3">
        {card.quote_previews.length ? (
          card.quote_previews.map((preview) => (
            <div key={preview.id}>
              <p
                className="text-[11px] text-[#8B8D97] italic pl-3"
                style={{ borderLeft: '2px solid rgba(66,71,83,0.2)' }}
              >
                &ldquo;{preview.excerpt}&rdquo;
              </p>
              <p className="mt-1 pl-3 text-[10px] text-[#5A5C66]">
                {preview.author_or_speaker
                  ? `${preview.author_or_speaker} via ${preview.source_label}`
                  : preview.source_label}
              </p>
            </div>
          ))
        ) : (
          <p className="text-[11px] text-[#5A5C66] italic">
            Evidence previews will appear here as this theme gathers support.
          </p>
        )}
      </div>
    </article>
  );
}

interface ThemeDetailPanelProps {
  theme: ThemeDetailResponse;
  onAskTheme: () => void;
}

const TREND_DISPLAY: Record<
  ThemeTrendResponse['direction'],
  { icon: string; label: string; color: string; bg: string }
> = {
  rising: { icon: 'trending_up', label: 'Rising', color: '#ffb77b', bg: 'rgba(255,183,123,0.1)' },
  flat: { icon: 'trending_flat', label: 'Flat', color: '#8B8D97', bg: 'rgba(139,141,151,0.1)' },
  declining: { icon: 'trending_down', label: 'Declining', color: '#34D399', bg: 'rgba(52,211,153,0.1)' },
};

function ThemeTrendBadge({ trend }: { trend?: ThemeTrendResponse | null }) {
  if (!trend) return null;
  const display = TREND_DISPLAY[trend.direction] ?? TREND_DISPLAY.flat;

  return (
    <span
      className="text-[9px] font-bold px-1.5 py-0.5 rounded flex items-center gap-1 uppercase tracking-wider"
      style={{ backgroundColor: display.bg, color: display.color }}
      title={`${trend.recent_count} signals in the last ${trend.window_days} days vs ${trend.previous_count} before — evidence volume, not proven impact`}
    >
      <span className="material-symbols-outlined" style={{ fontSize: 12 }}>
        {display.icon}
      </span>
      {display.label}
    </span>
  );
}

export function ThemeDetailPanel({ theme, onAskTheme }: ThemeDetailPanelProps) {
  const [evidenceFilter, setEvidenceFilter] = useState<SourceType | null>(null);
  const evidenceItems = theme.supporting_evidence
    .flatMap((group) =>
      group.items.map((item) => ({
        ...item,
        source_group_label: group.label,
        source_group_type: group.source_type,
      }))
    )
    .sort(
      (left, right) =>
        new Date(right.occurred_at).getTime() - new Date(left.occurred_at).getTime()
    );
  const filteredEvidence = evidenceFilter
    ? evidenceItems.filter((item) => item.source_group_type === evidenceFilter)
    : evidenceItems;
  const topEvidence = filteredEvidence.slice(0, 3);
  const hasAnalyticsEvidence = filteredEvidence.some(
    (item) => item.source_group_type === 'analytics'
  );
  const evidenceDates = evidenceItems.map((item) => item.occurred_at);
  const totalSourceCount = theme.source_breakdown.reduce(
    (sum, source) => sum + source.count,
    0
  );
  const breakdownItems = [
    {
      label: 'Frequency',
      value: formatBreakdownPoints(theme.impact_breakdown?.frequency, 40),
      width: Math.min(100, ((theme.impact_breakdown?.frequency ?? 0) / 40) * 100),
      color: '#afc6ff',
    },
    {
      label: 'Negative sentiment',
      value: formatBreakdownPoints(theme.impact_breakdown?.negative, 25),
      width: Math.min(100, ((theme.impact_breakdown?.negative ?? 0) / 25) * 100),
      color: '#ffb4ab',
    },
    {
      label: 'Recency',
      value: formatBreakdownPoints(theme.impact_breakdown?.recency, 20),
      width: Math.min(100, ((theme.impact_breakdown?.recency ?? 0) / 20) * 100),
      color: '#ffb77b',
    },
    {
      label: 'Source diversity',
      value: formatBreakdownPoints(theme.impact_breakdown?.source_diversity, 15),
      width: Math.min(100, ((theme.impact_breakdown?.source_diversity ?? 0) / 15) * 100),
      color: '#34D399',
    },
  ];

  return (
    <div className="p-6">
      <div className="flex justify-between items-start mb-1">
        <h2 className="text-lg font-bold text-white tracking-tight leading-none">
          {theme.name}
        </h2>
        {theme.is_new && (
          <span
            className="text-[10px] font-bold px-1.5 py-0.5 rounded"
            style={{ backgroundColor: 'rgba(175,198,255,0.2)', color: '#afc6ff' }}
          >
            NEW
          </span>
        )}
      </div>

      <div className="flex items-center gap-2 mb-6">
        <div className="text-2xl font-bold" style={{ color: '#afc6ff' }}>
          {formatImpactScore(theme.impact_score ?? 0)}
        </div>
        <div className="text-[10px] text-[#5A5C66] uppercase font-semibold">
          Impact Score
        </div>
        <ThemeTrendBadge trend={theme.trend} />
        <div className="ml-auto text-[10px] text-[#5A5C66] font-medium">
          {formatDateSpan(evidenceDates)}
        </div>
      </div>

      <div
        className="grid grid-cols-2 gap-px rounded-lg overflow-hidden mb-8"
        style={{ backgroundColor: 'rgba(66,71,83,0.1)' }}
      >
        {[
          {
            label: 'Frequency',
            value: `${theme.mention_count} ${theme.mention_count === 1 ? 'mention' : 'mentions'}`,
            danger: false,
          },
          {
            label: 'Sentiment',
            value: getDominantSentiment(theme),
            danger: getDominantSentiment(theme) === 'Negative',
          },
          {
            label: 'Recency',
            value: formatRelativeTime(evidenceItems[0]?.occurred_at),
            danger: false,
          },
          {
            label: 'Diversity',
            value: `${theme.source_breakdown.length} ${theme.source_breakdown.length === 1 ? 'Channel' : 'Channels'}`,
            danger: false,
          },
        ].map((stat) => (
          <div key={stat.label} className="p-3" style={{ backgroundColor: '#0F1117' }}>
            <div className="text-[10px] text-[#5A5C66] uppercase font-bold mb-1">
              {stat.label}
            </div>
            <div
              className="text-sm font-semibold"
              style={{ color: stat.danger ? '#ffb4ab' : '#F0F0F3' }}
            >
              {stat.value}
            </div>
          </div>
        ))}
      </div>

      <div className="mb-8">
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-[11px] text-[#5A5C66] font-bold uppercase">
            Why This Ranks Here
          </h4>
          <span className="text-[10px] text-[#5A5C66]">
            Total {formatBreakdownPoints(theme.impact_breakdown?.total, 100)}
          </span>
        </div>
        {theme.score_change && (
          <p className="text-[11px] leading-relaxed mb-3" style={{ color: 'rgba(194,198,214,0.6)' }}>
            {theme.score_change.explanation}
          </p>
        )}
        <div className="space-y-3">
          {breakdownItems.map((item) => (
            <div key={item.label}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-[11px] text-[#8B8D97]">{item.label}</span>
                <span className="text-[11px] text-[#F0F0F3]">{item.value}</span>
              </div>
              <div className="h-2 rounded-full overflow-hidden" style={{ backgroundColor: '#161820' }}>
                <div
                  className="h-full rounded-full"
                  style={{ width: `${item.width}%`, backgroundColor: item.color }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="mb-8">
        <h4 className="text-[11px] text-[#5A5C66] font-bold uppercase mb-3">
          Source Breakdown
        </h4>
        {theme.source_breakdown.length ? (
          <>
            <div className="h-6 w-full rounded flex overflow-hidden mb-2">
              {theme.source_breakdown.map((source) => (
                <div
                  key={`${theme.id}-${source.source_type}`}
                  className="h-full"
                  style={{
                    backgroundColor: getSourceAccent(source.source_type),
                    width: `${Math.max(
                      8,
                      Math.round((source.count / Math.max(totalSourceCount, 1)) * 100)
                    )}%`,
                  }}
                />
              ))}
            </div>
            <div className="flex justify-between gap-3 flex-wrap text-[10px] text-[#5A5C66]">
              {theme.source_breakdown.map((source) => (
                <span key={`${theme.id}-${source.source_type}-label`}>
                  {source.label} ({Math.round((source.count / Math.max(totalSourceCount, 1)) * 100)}
                  %)
                </span>
              ))}
            </div>
          </>
        ) : (
          <div className="rounded-lg border border-dashed border-white/6 px-4 py-4 text-[12px] text-[#5A5C66]">
            No source evidence has been attached to this theme yet.
          </div>
        )}
      </div>

      <div className="mb-8">
        <div className="flex items-center justify-between mb-3 gap-2 flex-wrap">
          <h4 className="text-[11px] text-[#5A5C66] font-bold uppercase">
            Top Evidence
          </h4>
          {theme.supporting_evidence.length > 1 && (
            <div className="flex items-center gap-1 flex-wrap">
              <button
                type="button"
                onClick={() => setEvidenceFilter(null)}
                className="text-[10px] px-2 py-0.5 rounded-full transition-colors"
                style={{
                  backgroundColor: evidenceFilter === null ? 'rgba(175,198,255,0.15)' : '#1e1f26',
                  color: evidenceFilter === null ? '#afc6ff' : '#8B8D97',
                  border: '1px solid rgba(66,71,83,0.2)',
                }}
              >
                All
              </button>
              {theme.supporting_evidence.map((group) => (
                <button
                  key={group.source_type}
                  type="button"
                  onClick={() =>
                    setEvidenceFilter(
                      evidenceFilter === group.source_type ? null : group.source_type
                    )
                  }
                  className="text-[10px] px-2 py-0.5 rounded-full transition-colors"
                  style={{
                    backgroundColor:
                      evidenceFilter === group.source_type ? 'rgba(175,198,255,0.15)' : '#1e1f26',
                    color: evidenceFilter === group.source_type ? '#afc6ff' : '#8B8D97',
                    border: '1px solid rgba(66,71,83,0.2)',
                  }}
                >
                  {group.label} ({group.count})
                </button>
              ))}
            </div>
          )}
        </div>
        {topEvidence.length ? (
          <div className="space-y-3">
            {topEvidence.map((evidence) => {
              const accentColor = getSourceAccent(evidence.source_group_type);
              const label = evidence.author_or_speaker
                ? `${evidence.author_or_speaker} via ${evidence.source_label}`
                : evidence.source_label;

              return (
                <div
                  key={evidence.id}
                  className="p-3 rounded-lg"
                  style={{
                    backgroundColor: '#0c0e14',
                    border: '1px solid rgba(66,71,83,0.1)',
                  }}
                >
                  <p className="text-[11px] text-[#c8cad6] mb-2 leading-relaxed">
                    &ldquo;{evidence.excerpt}&rdquo;
                  </p>
                  <div className="flex items-center gap-2">
                    <div
                      className="w-4 h-4 rounded-full flex items-center justify-center text-[8px] font-bold"
                      style={{
                        backgroundColor: `${accentColor}20`,
                        color: accentColor,
                      }}
                    >
                      {getInitials(evidence.author_or_speaker || evidence.source_label)}
                    </div>
                    <span className="text-[9px] text-[#5A5C66]">{label}</span>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="rounded-lg border border-dashed border-white/6 px-4 py-4 text-[12px] text-[#5A5C66]">
            {evidenceFilter
              ? 'No evidence from this source yet. Try another filter.'
              : 'Supporting evidence will appear here once the theme has linked signals.'}
          </div>
        )}
        {hasAnalyticsEvidence && (
          <p className="text-[10px] leading-relaxed mt-3" style={{ color: 'rgba(194,198,214,0.5)' }}>
            Analytics signals are related usage shifts from the same period — supporting
            evidence, not a proven cause.
          </p>
        )}
      </div>

      <div className="space-y-2 pb-8">
        <Link
          href="/board"
          className="w-full py-2.5 rounded-lg text-xs font-bold flex items-center justify-center gap-2 transition-all hover:brightness-110"
          style={{ backgroundColor: '#afc6ff', color: '#002d6c' }}
        >
          <span className="material-symbols-outlined" style={{ fontSize: 16 }}>
            view_kanban
          </span>
          View in Board
        </Link>
        <button
          type="button"
          onClick={onAskTheme}
          className="w-full py-2.5 rounded-lg text-xs font-bold flex items-center justify-center gap-2 transition-all"
          style={{
            backgroundColor: '#1e1f26',
            color: '#afc6ff',
            border: '1px solid rgba(175,198,255,0.2)',
          }}
          onMouseEnter={(event) => {
            event.currentTarget.style.backgroundColor = '#282a30';
          }}
          onMouseLeave={(event) => {
            event.currentTarget.style.backgroundColor = '#1e1f26';
          }}
        >
          <span className="material-symbols-outlined" style={{ fontSize: 16 }}>
            auto_awesome
          </span>
          Ask AI about this theme
        </button>
      </div>
    </div>
  );
}
