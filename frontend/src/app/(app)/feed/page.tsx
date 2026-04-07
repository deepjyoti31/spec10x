'use client';

import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
} from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';

import { useToast } from '@/components/ui/Toast';
import { useFeed } from '@/hooks/useFeed';
import type {
  FeedFilters,
  FeedSignalDetailResponse,
  FeedSignalResponse,
  SignalLinkResponse,
  SourceType,
} from '@/lib/api';

type SentimentType = 'negative' | 'neutral' | 'positive';
type FilterMenu = 'source' | 'sentiment' | null;

interface FilterOptionValue<TValue> {
  value: TValue;
  label: string;
}

const VALID_SOURCES = new Set<SourceType>(['interview', 'support', 'survey', 'analytics']);
const VALID_SENTIMENTS = new Set<SentimentType>(['negative', 'neutral', 'positive']);
const SOURCE_OPTIONS: Array<FilterOptionValue<SourceType | null>> = [
  { value: null, label: 'All' },
  { value: 'interview', label: 'Interview' },
  { value: 'support', label: 'Support' },
  { value: 'survey', label: 'Survey' },
  { value: 'analytics', label: 'Analytics' },
];
const SENTIMENT_OPTIONS: Array<FilterOptionValue<SentimentType | null>> = [
  { value: null, label: 'All' },
  { value: 'negative', label: 'Negative' },
  { value: 'neutral', label: 'Neutral' },
  { value: 'positive', label: 'Positive' },
];

const SOURCE_STYLES: Record<SourceType, { bg: string; color: string }> = {
  interview: { bg: 'rgba(175,198,255,0.12)', color: '#afc6ff' },
  support: { bg: 'rgba(251,191,36,0.1)', color: '#FBBF24' },
  survey: { bg: 'rgba(52,211,153,0.1)', color: '#34D399' },
  analytics: { bg: 'rgba(192,132,252,0.12)', color: '#d9b8ff' },
};

const SENTIMENT_STYLES: Record<
  SentimentType,
  { bg: string; color: string; icon: string; label: string }
> = {
  negative: {
    bg: 'rgba(248,113,113,0.1)',
    color: '#ffb4ab',
    icon: 'sentiment_very_dissatisfied',
    label: 'Negative',
  },
  neutral: {
    bg: 'rgba(139,141,151,0.1)',
    color: '#8B8D97',
    icon: 'sentiment_neutral',
    label: 'Neutral',
  },
  positive: {
    bg: 'rgba(52,211,153,0.1)',
    color: '#34D399',
    icon: 'sentiment_very_satisfied',
    label: 'Positive',
  },
};

const ROW_TIMESTAMP_FORMATTER = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: 'numeric',
});
const DETAIL_DATE_FORMATTER = new Intl.DateTimeFormat('en-US', {
  month: 'long',
  day: 'numeric',
  year: 'numeric',
});
const DATE_FILTER_FORMATTER = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: 'numeric',
  year: 'numeric',
});

function isSourceType(value: string | null): value is SourceType {
  return Boolean(value && VALID_SOURCES.has(value as SourceType));
}

function isSentiment(value: string | null): value is SentimentType {
  return Boolean(value && VALID_SENTIMENTS.has(value as SentimentType));
}

function isDateParam(value: string | null): value is string {
  return Boolean(value && /^\d{4}-\d{2}-\d{2}$/.test(value));
}

function buildHref(pathname: string, params: URLSearchParams): string {
  const query = params.toString();
  return query ? `${pathname}?${query}` : pathname;
}

function humanizeKey(key: string): string {
  return key
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function formatRelativeTimestamp(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  const diffMs = Date.now() - date.getTime();
  if (diffMs < 0) {
    return ROW_TIMESTAMP_FORMATTER.format(date);
  }

  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  if (hours < 48) return 'Yesterday';

  const days = Math.floor(hours / 24);
  if (days < 7) return `${days} days ago`;

  return ROW_TIMESTAMP_FORMATTER.format(date);
}

function formatDetailDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return DETAIL_DATE_FORMATTER.format(date);
}

function formatDateButtonLabel(value: string, fallback: string): string {
  if (!value) return fallback;

  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) {
    return fallback;
  }

  return DATE_FILTER_FORMATTER.format(date);
}

function formatFilterSourceLabel(source: SourceType | null): string {
  return SOURCE_OPTIONS.find((option) => option.value === source)?.label ?? 'All';
}

function formatFilterSentimentLabel(sentiment: SentimentType | null): string {
  return SENTIMENT_OPTIONS.find((option) => option.value === sentiment)?.label ?? 'All';
}

function getSignalTitle(signal: Pick<FeedSignalResponse, 'title' | 'signal_kind_label'>): string {
  return signal.title?.trim() || signal.signal_kind_label || 'Untitled signal';
}

function getSignalTag(signal: FeedSignalResponse): string {
  return signal.theme_chip?.name || signal.signal_kind_label || 'Signal';
}

function normalizeLabels(values: string[]): string[] {
  const seen = new Set<string>();
  const normalized: string[] = [];

  for (const value of values) {
    const trimmed = value.trim();
    if (!trimmed) continue;

    const key = trimmed.toLowerCase();
    if (seen.has(key)) continue;

    seen.add(key);
    normalized.push(trimmed);
  }

  return normalized;
}

function getStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter((item): item is string => typeof item === 'string' && item.trim().length > 0);
}

function formatMetadataValue(value: unknown): string | null {
  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed || null;
  }
  if (typeof value === 'number') {
    return Number.isFinite(value) ? String(value) : null;
  }
  if (typeof value === 'boolean') {
    return value ? 'Yes' : 'No';
  }
  return null;
}

function splitContentIntoParagraphs(text: string): string[] {
  const paragraphs = text
    .split(/\n\s*\n/)
    .map((section) => section.trim())
    .filter(Boolean);

  if (paragraphs.length > 0) {
    return paragraphs;
  }

  const single = text.trim();
  return single ? [single] : [];
}

function getSignalThemeLabels(signal: FeedSignalDetailResponse): string[] {
  const metadata = signal.metadata_json ?? {};
  return normalizeLabels([
    ...(signal.theme_chip ? [signal.theme_chip.name] : []),
    ...getStringArray(metadata.tags),
  ]);
}

function getSignalMetadataRows(
  signal: FeedSignalDetailResponse
): Array<{ label: string; value: string }> {
  const metadata = signal.metadata_json ?? {};
  const rows: Array<{ label: string; value: string }> = [
    { label: 'Source', value: signal.source_label },
    { label: 'Provider', value: signal.provider_label },
    { label: 'Signal Type', value: signal.signal_kind_label },
  ];

  if (signal.author_or_speaker) {
    rows.push({
      label: signal.source_type === 'interview' ? 'Speaker' : 'Author',
      value: signal.author_or_speaker,
    });
  }

  const seenValues = new Set(rows.map((row) => row.value.toLowerCase()));
  const reservedKeys = new Set(['theme_match', 'tags', 'interview_id']);
  const preferredKeys = [
    'question',
    'category',
    'theme_suggestion',
    'speaker_name',
    'speaker_label',
    'filename',
  ];

  function appendRow(key: string, label?: string) {
    if (reservedKeys.has(key)) return;

    const value = formatMetadataValue(metadata[key]);
    if (!value) return;

    const normalized = value.toLowerCase();
    if (seenValues.has(normalized)) return;

    seenValues.add(normalized);
    rows.push({ label: label ?? humanizeKey(key), value });
  }

  preferredKeys.forEach((key) => appendRow(key));

  Object.entries(metadata).forEach(([key]) => {
    if (preferredKeys.includes(key)) return;
    appendRow(key);
  });

  return rows.slice(0, 6);
}

function getCardName(signal: FeedSignalDetailResponse): string {
  const metadata = signal.metadata_json ?? {};
  return (
    signal.author_or_speaker ??
    formatMetadataValue(metadata.speaker_name) ??
    formatMetadataValue(metadata.speaker_label) ??
    signal.provider_label
  );
}

function getCardSubtitle(signal: FeedSignalDetailResponse): string {
  const metadata = signal.metadata_json ?? {};
  const filename = formatMetadataValue(metadata.filename);
  const question = formatMetadataValue(metadata.question);

  if (signal.source_type === 'interview') {
    return filename ? `Interview signal from ${filename}` : `Interview signal via ${signal.provider_label}`;
  }

  if (signal.source_type === 'support') {
    return `Support signal via ${signal.provider_label}`;
  }

  if (signal.source_type === 'survey') {
    return question ?? `Survey signal via ${signal.provider_label}`;
  }

  return `${signal.source_label} signal via ${signal.provider_label}`;
}

function getCardInitials(name: string): string {
  const parts = name
    .split(/\s+/)
    .map((part) => part.trim())
    .filter(Boolean);

  if (parts.length === 0) return 'SG';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();

  return `${parts[0][0] ?? ''}${parts[1][0] ?? ''}`.toUpperCase();
}

function getCtaIcon(link: SignalLinkResponse | null | undefined): string {
  if (!link) return 'link';
  if (link.kind === 'external') return 'open_in_new';
  if (link.href.startsWith('/interview/')) return 'play_circle';
  return 'visibility';
}

function getShortSignalId(id: string): string {
  return id.slice(0, 8);
}

function StatValue({
  value,
  label,
  accent = false,
}: {
  value: string;
  label: string;
  accent?: boolean;
}) {
  return (
    <div className="flex flex-col items-end">
      <span className="text-lg font-bold" style={{ color: accent ? '#afc6ff' : '#e2e2eb' }}>
        {value}
      </span>
      <span className="uppercase tracking-widest text-[10px]">{label}</span>
    </div>
  );
}

function FilterDropdown({
  label,
  open,
  onToggle,
  children,
}: {
  label: string;
  open: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="relative" data-filter-menu-root="true">
      <button
        type="button"
        className="flex items-center gap-2 rounded px-3 py-2 text-xs transition-colors"
        style={{
          backgroundColor: '#161820',
          border: '1px solid #1E2028',
          color: '#c2c6d6',
        }}
        onClick={onToggle}
        onMouseEnter={(event) => {
          event.currentTarget.style.borderColor = 'rgba(175,198,255,0.5)';
        }}
        onMouseLeave={(event) => {
          event.currentTarget.style.borderColor = open ? 'rgba(175,198,255,0.5)' : '#1E2028';
        }}
      >
        <span>{label}</span>
        <span className="material-symbols-outlined" style={{ fontSize: 14 }}>
          expand_more
        </span>
      </button>

      {open ? (
        <div
          className="absolute left-0 top-full z-30 mt-2 min-w-[180px] overflow-hidden rounded"
          style={{
            backgroundColor: '#161820',
            border: '1px solid #1E2028',
            boxShadow: '0 18px 45px rgba(0,0,0,0.35)',
          }}
        >
          <div className="py-1">{children}</div>
        </div>
      ) : null}
    </div>
  );
}

function FilterOption({
  selected,
  label,
  onClick,
}: {
  selected: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center justify-between gap-3 px-4 py-2 text-left text-xs text-[#c8cad6] transition-colors hover:bg-[#1E2028]"
    >
      <span>{label}</span>
      {selected ? (
        <span className="material-symbols-outlined text-[var(--color-accent)]" style={{ fontSize: 16 }}>
          check
        </span>
      ) : null}
    </button>
  );
}

function DateFilterButton({
  label,
  onClick,
  onClear,
}: {
  label: string;
  onClick: () => void;
  onClear: () => void;
}) {
  return (
    <button
      type="button"
      className="flex items-center gap-2 rounded px-3 py-2 text-xs transition-colors"
      style={{
        backgroundColor: '#161820',
        border: '1px solid #1E2028',
        color: '#c2c6d6',
      }}
      onClick={onClick}
      onKeyDown={(event: ReactKeyboardEvent<HTMLButtonElement>) => {
        if (event.key === 'Backspace' || event.key === 'Delete') {
          event.preventDefault();
          onClear();
        }
      }}
      onMouseEnter={(event) => {
        event.currentTarget.style.borderColor = 'rgba(175,198,255,0.5)';
      }}
      onMouseLeave={(event) => {
        event.currentTarget.style.borderColor = '#1E2028';
      }}
    >
      <span className="material-symbols-outlined" style={{ fontSize: 14 }}>
        calendar_today
      </span>
      <span>{label}</span>
    </button>
  );
}

function PanelMessage({
  title,
  body,
  actionLabel,
  onAction,
}: {
  title: string;
  body: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <div className="flex h-full items-center justify-center p-8">
      <div className="max-w-sm text-center">
        <h3 className="mb-2 text-sm font-semibold text-[#e2e2eb]">{title}</h3>
        <p className="text-xs leading-relaxed text-[#8B8D97]">{body}</p>
        {actionLabel && onAction ? (
          <button
            type="button"
            className="mt-5 rounded-lg px-4 py-2 text-xs font-bold transition-all"
            style={{ backgroundColor: '#161820', border: '1px solid #1E2028', color: '#c8cad6' }}
            onClick={onAction}
            onMouseEnter={(event) => {
              event.currentTarget.style.borderColor = 'rgba(175,198,255,0.5)';
            }}
            onMouseLeave={(event) => {
              event.currentTarget.style.borderColor = '#1E2028';
            }}
          >
            {actionLabel}
          </button>
        ) : null}
      </div>
    </div>
  );
}

function SignalRow({
  signal,
  selected,
  onClick,
}: {
  signal: FeedSignalResponse;
  selected: boolean;
  onClick: () => void;
}) {
  const src = SOURCE_STYLES[signal.source_type];
  const sentimentStyle = signal.sentiment ? SENTIMENT_STYLES[signal.sentiment] : null;

  return (
    <div
      onClick={onClick}
      className="cursor-pointer border-b p-5 transition-colors"
      style={{
        borderLeftWidth: 4,
        borderLeftColor: selected ? '#afc6ff' : 'transparent',
        borderBottomColor: 'rgba(66,71,83,0.08)',
        backgroundColor: selected ? '#1E2230' : 'transparent',
      }}
      onMouseEnter={(event) => {
        if (!selected) {
          event.currentTarget.style.backgroundColor = 'rgba(30,31,38,0.3)';
        }
      }}
      onMouseLeave={(event) => {
        if (!selected) {
          event.currentTarget.style.backgroundColor = 'transparent';
        }
      }}
    >
      <div className="mb-2 flex items-start justify-between">
        <div className="flex items-center gap-2">
          <span
            className="rounded px-2 py-0.5 text-[10px] font-bold uppercase"
            style={{ backgroundColor: src.bg, color: src.color }}
          >
            {signal.source_label}
          </span>
        </div>
        <span className="text-[10px] text-[#5A5C66]">{formatRelativeTimestamp(signal.occurred_at)}</span>
      </div>

      <h3 className="mb-1 text-sm font-semibold text-[#e2e2eb]">{getSignalTitle(signal)}</h3>

      <p className="mb-3 line-clamp-2 text-xs leading-relaxed text-[#8B8D97]">{signal.excerpt}</p>

      <div className="flex items-center gap-2">
        {sentimentStyle ? (
          <span
            className="flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-medium"
            style={{ backgroundColor: sentimentStyle.bg, color: sentimentStyle.color }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: 12 }}>
              {sentimentStyle.icon}
            </span>
            {sentimentStyle.label}
          </span>
        ) : null}
        <span
          className="rounded px-1.5 py-0.5 text-[10px] text-[#c8cad6]"
          style={{ backgroundColor: '#282a30' }}
        >
          {getSignalTag(signal)}
        </span>
      </div>
    </div>
  );
}

function DetailPanelShell({
  link,
  onOpenLink,
  children,
}: {
  link?: SignalLinkResponse | null;
  onOpenLink: (link: SignalLinkResponse) => void;
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div
        className="flex flex-shrink-0 items-center justify-between border-b px-4 py-3"
        style={{ backgroundColor: '#191b22', borderColor: 'rgba(66,71,83,0.08)' }}
      >
        <span className="text-xs font-bold uppercase tracking-widest text-[#5A5C66]">
          Evidence Detail
        </span>
        <div className="flex gap-1">
          {['link', 'archive', 'more_vert'].map((icon) => (
            <button
              key={icon}
              type="button"
              className="rounded p-1.5 text-[#8B8D97] transition-colors"
              onClick={() => {
                if (icon === 'link' && link) {
                  onOpenLink(link);
                }
              }}
              onMouseEnter={(event) => {
                event.currentTarget.style.backgroundColor = '#1e1f26';
                event.currentTarget.style.color = '#F0F0F3';
              }}
              onMouseLeave={(event) => {
                event.currentTarget.style.backgroundColor = 'transparent';
                event.currentTarget.style.color = '#8B8D97';
              }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: 18 }}>
                {icon}
              </span>
            </button>
          ))}
        </div>
      </div>
      {children}
    </div>
  );
}

function EvidenceDetail({
  signal,
  onOpenLink,
}: {
  signal: FeedSignalDetailResponse;
  onOpenLink: (link: SignalLinkResponse) => void;
}) {
  const sourceStyle = SOURCE_STYLES[signal.source_type];
  const sentimentStyle = signal.sentiment ? SENTIMENT_STYLES[signal.sentiment] : null;
  const metadataRows = getSignalMetadataRows(signal);
  const relatedThemes = getSignalThemeLabels(signal).slice(0, 4);
  const bodyParagraphs = splitContentIntoParagraphs(signal.content_text || signal.excerpt);
  const displayName = getCardName(signal);
  const subtitle = getCardSubtitle(signal);
  const ctaIcon = getCtaIcon(signal.link);

  return (
    <DetailPanelShell link={signal.link} onOpenLink={onOpenLink}>
      <div className="mx-auto w-full max-w-4xl flex-1 overflow-y-auto p-10">
        <div className="mb-6 flex items-center gap-3">
          <span
            className="rounded px-2 py-1 text-[10px] font-bold uppercase"
            style={{ backgroundColor: sourceStyle.bg, color: sourceStyle.color }}
          >
            {signal.source_label}
          </span>
          <span className="text-xs text-[#424753]">•</span>
          <span className="text-xs text-[#8B8D97]">{formatDetailDate(signal.occurred_at)}</span>
          <span className="text-xs text-[#424753]">•</span>
          <span className="text-xs text-[#8B8D97]">ID: {getShortSignalId(signal.id)}</span>
        </div>

        <h2 className="mb-4 text-[20px] font-bold leading-tight text-[#e2e2eb]">
          {getSignalTitle(signal)}
        </h2>

        <div className="mb-8 flex flex-wrap gap-2">
          <span
            className="rounded px-2 py-1 text-[10px] font-semibold"
            style={{
              backgroundColor: 'rgba(216,120,2,0.1)',
              color: '#ffb77b',
              border: '1px solid rgba(216,120,2,0.2)',
            }}
          >
            {signal.signal_kind_label}
          </span>
          {sentimentStyle ? (
            <span
              className="rounded px-2 py-1 text-[10px] font-semibold"
              style={{
                backgroundColor: sentimentStyle.bg,
                color: sentimentStyle.color,
                border:
                  signal.sentiment === 'negative'
                    ? '1px solid rgba(248,113,113,0.2)'
                    : signal.sentiment === 'positive'
                      ? '1px solid rgba(52,211,153,0.2)'
                      : '1px solid rgba(139,141,151,0.2)',
              }}
            >
              {sentimentStyle.label} Sentiment
            </span>
          ) : null}
          {getSignalThemeLabels(signal).map((tag) => (
            <span
              key={tag}
              className="rounded px-2 py-1 text-[10px] font-semibold text-[#c8cad6]"
              style={{ backgroundColor: '#33343b' }}
            >
              {tag}
            </span>
          ))}
        </div>

        <div className="mb-10 space-y-4 text-sm leading-relaxed text-[#c0c2cc]">
          {bodyParagraphs.length > 0 ? (
            bodyParagraphs.map((paragraph) => <p key={paragraph}>{paragraph}</p>)
          ) : (
            <p>No evidence text is available for this signal yet.</p>
          )}
        </div>

        <div
          className="mb-10 flex items-center justify-between rounded-xl p-6"
          style={{
            backgroundColor: '#191b22',
            border: '1px solid rgba(66,71,83,0.1)',
          }}
        >
          <div className="flex items-center gap-4">
            <div
              className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full text-sm font-bold text-white"
              style={{
                backgroundColor: '#afc6ff',
                boxShadow: '0 0 0 2px rgba(175,198,255,0.2)',
              }}
            >
              {getCardInitials(displayName)}
            </div>
            <div>
              <h4 className="text-sm font-bold text-[#e2e2eb]">{displayName}</h4>
              <p className="text-xs text-[#5A5C66]">{subtitle}</p>
            </div>
          </div>

          {signal.link ? (
            <button
              type="button"
              className="flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-bold transition-all"
              style={{ backgroundColor: '#528dff', color: '#00275f' }}
              onClick={() => onOpenLink(signal.link as SignalLinkResponse)}
              onMouseEnter={(event) => {
                event.currentTarget.style.filter = 'brightness(1.05)';
              }}
              onMouseLeave={(event) => {
                event.currentTarget.style.filter = 'none';
              }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: 16 }}>
                {ctaIcon}
              </span>
              {signal.link.label}
            </button>
          ) : null}
        </div>

        <div
          className="grid grid-cols-2 gap-8 border-t pt-8"
          style={{ borderColor: 'rgba(66,71,83,0.1)' }}
        >
          <div>
            <h5 className="mb-4 text-[10px] font-bold uppercase tracking-widest text-[#5A5C66]">
              Metadata
            </h5>
            <div className="space-y-3">
              {metadataRows.map((row) => (
                <div key={row.label} className="flex justify-between gap-4">
                  <span className="text-xs text-[#8B8D97]">{row.label}</span>
                  <span className="text-right text-xs text-[#e2e2eb]">{row.value}</span>
                </div>
              ))}
            </div>
          </div>

          <div>
            <h5 className="mb-4 text-[10px] font-bold uppercase tracking-widest text-[#5A5C66]">
              Related Themes
            </h5>
            {relatedThemes.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {relatedThemes.map((theme, index) => (
                  <div
                    key={theme}
                    className="flex items-center gap-2 rounded px-3 py-1"
                    style={{ backgroundColor: '#282a30' }}
                  >
                    <div
                      className="h-1.5 w-1.5 rounded-full"
                      style={{
                        backgroundColor: ['#afc6ff', '#b2c6f8', '#ffb77b', '#34D399'][index % 4],
                      }}
                    />
                    <span className="text-[11px] text-[#e2e2eb]">{theme}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-[#8B8D97]">No related themes were detected for this signal.</p>
            )}
          </div>
        </div>
      </div>
    </DetailPanelShell>
  );
}

export default function FeedPage() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const searchParamsKey = searchParams.toString();
  const { showToast } = useToast();

  const dateFromInputRef = useRef<HTMLInputElement | null>(null);
  const dateToInputRef = useRef<HTMLInputElement | null>(null);

  const source = isSourceType(searchParams.get('source')) ? (searchParams.get('source') as SourceType) : null;
  const sentiment = isSentiment(searchParams.get('sentiment'))
    ? (searchParams.get('sentiment') as SentimentType)
    : null;
  const dateFrom = isDateParam(searchParams.get('date_from')) ? searchParams.get('date_from') ?? '' : '';
  const dateTo = isDateParam(searchParams.get('date_to')) ? searchParams.get('date_to') ?? '' : '';
  const requestedSignalId = searchParams.get('signal');

  const [openMenu, setOpenMenu] = useState<FilterMenu>(null);

  const filters: FeedFilters = useMemo(
    () => ({
      source: source ?? undefined,
      sentiment: sentiment ?? undefined,
      date_from: dateFrom || undefined,
      date_to: dateTo || undefined,
    }),
    [dateFrom, dateTo, sentiment, source]
  );

  const {
    signals,
    selectedSignalId,
    selectedSignal,
    loading,
    detailLoading,
    error,
    detailError,
    exporting,
    refetch,
    exportFeed,
  } = useFeed(filters, requestedSignalId);

  const stats = useMemo(() => {
    const rows = signals ?? [];

    return {
      total: rows.length,
      interviews: rows.filter((signal) => signal.source_type === 'interview').length,
      tickets: rows.filter((signal) => signal.source_type === 'support').length,
      surveys: rows.filter((signal) => signal.source_type === 'survey').length,
    };
  }, [signals]);

  const sourceLabel = formatFilterSourceLabel(source);
  const sentimentLabel = formatFilterSentimentLabel(sentiment);

  const updateSearchParams = useCallback(
    (mutate: (params: URLSearchParams) => void, mode: 'push' | 'replace' = 'push') => {
      const nextParams = new URLSearchParams(searchParamsKey);
      mutate(nextParams);
      const href = buildHref(pathname, nextParams);
      setOpenMenu(null);

      if (mode === 'replace') {
        router.replace(href, { scroll: false });
        return;
      }

      router.push(href, { scroll: false });
    },
    [pathname, router, searchParamsKey]
  );

  useEffect(() => {
    if (!openMenu) return;

    function handlePointerDown(event: MouseEvent) {
      const target = event.target as HTMLElement | null;
      if (target?.closest('[data-filter-menu-root="true"]')) return;
      setOpenMenu(null);
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setOpenMenu(null);
      }
    }

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [openMenu]);

  useEffect(() => {
    if (selectedSignalId === requestedSignalId) {
      return;
    }

    updateSearchParams((params) => {
      if (selectedSignalId) {
        params.set('signal', selectedSignalId);
      } else {
        params.delete('signal');
      }
    }, 'replace');
  }, [requestedSignalId, selectedSignalId, updateSearchParams]);

  const openDatePicker = useCallback((inputRef: React.RefObject<HTMLInputElement | null>) => {
    const input = inputRef.current as (HTMLInputElement & { showPicker?: () => void }) | null;
    if (!input) return;

    if (typeof input.showPicker === 'function') {
      input.showPicker();
      return;
    }

    input.click();
  }, []);

  const clearDateFilter = useCallback(
    (field: 'date_from' | 'date_to') => {
      updateSearchParams((params) => {
        params.delete(field);
      }, 'replace');
    },
    [updateSearchParams]
  );

  const openSignalLink = useCallback(
    (link: SignalLinkResponse) => {
      if (link.kind === 'external') {
        window.open(link.href, '_blank', 'noopener,noreferrer');
        return;
      }

      router.push(link.href, { scroll: false });
    },
    [router]
  );

  async function handleExport() {
    try {
      const markdown = await exportFeed();
      const blob = new Blob([markdown], { type: 'text/markdown;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      const stamp = new Date().toISOString().slice(0, 10);

      anchor.href = url;
      anchor.download = `feed-signals-${stamp}.md`;
      anchor.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to export feed signals', 'error');
    }
  }

  function renderListPanel() {
    if (loading && !signals) {
      return (
        <PanelMessage
          title="Loading signals"
          body="Pulling your latest interview, support, and survey evidence."
        />
      );
    }

    if (!signals && error) {
      return (
        <PanelMessage
          title="We could not load the feed"
          body={error}
          actionLabel="Retry"
          onAction={() => {
            void refetch();
          }}
        />
      );
    }

    if (!signals || signals.length === 0) {
      return (
        <PanelMessage
          title="No signals found"
          body="Try a different source, sentiment, or date range to bring matching evidence back into view."
        />
      );
    }

    return signals.map((signal) => (
      <SignalRow
        key={signal.id}
        signal={signal}
        selected={selectedSignalId === signal.id}
        onClick={() => {
          updateSearchParams((params) => {
            params.set('signal', signal.id);
          });
        }}
      />
    ));
  }

  function renderDetailPanel() {
    if (loading && !signals) {
      return (
        <DetailPanelShell onOpenLink={openSignalLink}>
          <PanelMessage
            title="Loading evidence"
            body="Preparing the selected signal details."
          />
        </DetailPanelShell>
      );
    }

    if (!signals || signals.length === 0) {
      return (
        <DetailPanelShell onOpenLink={openSignalLink}>
          <PanelMessage
            title="No evidence selected"
            body="Once the feed has matching signals, the selected evidence will appear here."
          />
        </DetailPanelShell>
      );
    }

    if (detailLoading && !selectedSignal) {
      return (
        <DetailPanelShell onOpenLink={openSignalLink}>
          <PanelMessage
            title="Loading evidence"
            body="Fetching the full signal details for the current selection."
          />
        </DetailPanelShell>
      );
    }

    if (detailError || !selectedSignal) {
      return (
        <DetailPanelShell onOpenLink={openSignalLink}>
          <PanelMessage
            title="We could not load this evidence"
            body={detailError ?? 'The selected signal is no longer available in this filtered view.'}
            actionLabel="Retry"
            onAction={() => {
              void refetch();
            }}
          />
        </DetailPanelShell>
      );
    }

    return <EvidenceDetail signal={selectedSignal} onOpenLink={openSignalLink} />;
  }

  return (
    <div className="flex h-full flex-col overflow-hidden" style={{ backgroundColor: '#111319' }}>
      <input
        ref={dateFromInputRef}
        type="date"
        value={dateFrom}
        onChange={(event) => {
          updateSearchParams((params) => {
            if (event.target.value) {
              params.set('date_from', event.target.value);
            } else {
              params.delete('date_from');
            }
          }, 'replace');
        }}
        className="pointer-events-none absolute h-0 w-0 opacity-0"
        tabIndex={-1}
        aria-hidden="true"
      />
      <input
        ref={dateToInputRef}
        type="date"
        value={dateTo}
        onChange={(event) => {
          updateSearchParams((params) => {
            if (event.target.value) {
              params.set('date_to', event.target.value);
            } else {
              params.delete('date_to');
            }
          }, 'replace');
        }}
        className="pointer-events-none absolute h-0 w-0 opacity-0"
        tabIndex={-1}
        aria-hidden="true"
      />

      <section
        className="flex-shrink-0 border-b px-8 py-4"
        style={{ borderColor: 'rgba(66,71,83,0.1)' }}
      >
        <div className="flex items-center gap-3">
          <FilterDropdown
            label={`Source: ${sourceLabel}`}
            open={openMenu === 'source'}
            onToggle={() => setOpenMenu((current) => (current === 'source' ? null : 'source'))}
          >
            {SOURCE_OPTIONS.map((option) => (
              <FilterOption
                key={option.label}
                label={option.label}
                selected={option.value === source}
                onClick={() => {
                  updateSearchParams((params) => {
                    if (option.value) {
                      params.set('source', option.value);
                    } else {
                      params.delete('source');
                    }
                  });
                }}
              />
            ))}
          </FilterDropdown>

          <FilterDropdown
            label={`Sentiment: ${sentimentLabel}`}
            open={openMenu === 'sentiment'}
            onToggle={() => setOpenMenu((current) => (current === 'sentiment' ? null : 'sentiment'))}
          >
            {SENTIMENT_OPTIONS.map((option) => (
              <FilterOption
                key={option.label}
                label={option.label}
                selected={option.value === sentiment}
                onClick={() => {
                  updateSearchParams((params) => {
                    if (option.value) {
                      params.set('sentiment', option.value);
                    } else {
                      params.delete('sentiment');
                    }
                  });
                }}
              />
            ))}
          </FilterDropdown>

          <DateFilterButton
            label={formatDateButtonLabel(dateFrom, 'Date From')}
            onClick={() => openDatePicker(dateFromInputRef)}
            onClear={() => clearDateFilter('date_from')}
          />

          <DateFilterButton
            label={formatDateButtonLabel(dateTo, 'Date To')}
            onClick={() => openDatePicker(dateToInputRef)}
            onClear={() => clearDateFilter('date_to')}
          />

          <div className="flex-1" />

          <StatValue value={signals ? String(stats.total) : loading ? '...' : '0'} label="Signals" accent />

          <button
            type="button"
            className="flex items-center gap-2 rounded px-4 py-2 text-xs font-bold transition-all disabled:cursor-not-allowed disabled:opacity-60"
            style={{ backgroundColor: '#afc6ff', color: '#002d6c' }}
            disabled={exporting}
            onClick={() => {
              void handleExport();
            }}
            onMouseEnter={(event) => {
              if (!event.currentTarget.disabled) {
                event.currentTarget.style.filter = 'brightness(1.1)';
              }
            }}
            onMouseLeave={(event) => {
              event.currentTarget.style.filter = 'none';
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: 14 }}>
              file_download
            </span>
            {exporting ? 'Exporting...' : 'Export Signals'}
          </button>
        </div>
      </section>

      <div className="flex flex-1 overflow-hidden">
        <section
          className="flex flex-col border-r"
          style={{
            width: '45%',
            backgroundColor: '#0c0e14',
            borderColor: 'rgba(66,71,83,0.1)',
          }}
        >
          <div
            className="flex flex-shrink-0 items-center justify-between border-b p-4"
            style={{ borderColor: 'rgba(66,71,83,0.05)' }}
          >
            <span className="text-xs font-bold uppercase tracking-widest text-[#5A5C66]">
              Signals ({signals ? stats.total : loading ? '...' : '0'})
            </span>
            <span className="material-symbols-outlined cursor-pointer text-[#5A5C66]" style={{ fontSize: 16 }}>
              sort
            </span>
          </div>

          <div className="flex-1 overflow-y-auto">{renderListPanel()}</div>
        </section>

        <section className="flex flex-1 flex-col overflow-hidden" style={{ backgroundColor: '#111319' }}>
          {renderDetailPanel()}
        </section>
      </div>
    </div>
  );
}
