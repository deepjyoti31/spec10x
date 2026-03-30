'use client';

import { FormEvent, useEffect, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';

import {
  api,
  SourceType,
  ThemeDetailResponse,
  ThemeExplorerSentiment,
  ThemeExplorerSort,
} from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';
import { useInsightsExplorer } from '@/hooks/useInsightsExplorer';
import {
  ExplorerEmptyState,
  InsightsErrorState,
  InsightsLoadingState,
  ThemeDetailErrorState,
  ThemeDetailLoadingState,
  ThemeDetailPlaceholder,
} from './InsightsStates';
import {
  InsightsFilterRail,
  LIVE_SOURCE_OPTIONS,
  SortTabs,
  ThemeCard,
  ThemeDetailPanel,
} from './InsightsWidgets';

const LIVE_SOURCE_VALUES = LIVE_SOURCE_OPTIONS.map((option) => option.value);
const VALID_SORTS: ThemeExplorerSort[] = ['urgency', 'frequency', 'sentiment', 'recency'];
const VALID_SENTIMENTS: ThemeExplorerSentiment[] = ['negative', 'positive', 'neutral'];

function isSourceType(value: string): value is SourceType {
  return LIVE_SOURCE_VALUES.includes(value as SourceType);
}

function isSort(value: string | null): value is ThemeExplorerSort {
  return Boolean(value && VALID_SORTS.includes(value as ThemeExplorerSort));
}

function isSentiment(value: string | null): value is ThemeExplorerSentiment {
  return Boolean(value && VALID_SENTIMENTS.includes(value as ThemeExplorerSentiment));
}

function buildHref(pathname: string, params: URLSearchParams): string {
  const query = params.toString();
  return query ? `${pathname}?${query}` : pathname;
}

export default function InsightsPageClient() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const searchParamsKey = searchParams.toString();
  const { token } = useAuth();

  const sort = isSort(searchParams.get('sort')) ? (searchParams.get('sort') as ThemeExplorerSort) : 'urgency';
  const sourceParams = searchParams.getAll('source').filter(isSourceType);
  const selectedSources =
    sourceParams.length > 0
      ? LIVE_SOURCE_VALUES.filter((value) => sourceParams.includes(value))
      : LIVE_SOURCE_VALUES;
  const sentiment = isSentiment(searchParams.get('sentiment'))
    ? (searchParams.get('sentiment') as ThemeExplorerSentiment)
    : null;
  const dateFrom = searchParams.get('date_from') ?? '';
  const dateTo = searchParams.get('date_to') ?? '';
  const selectedThemeId = searchParams.get('theme');

  const { explorer, loading, error, refetch } = useInsightsExplorer({
    sort,
    sources:
      sourceParams.length > 0 && sourceParams.length < LIVE_SOURCE_VALUES.length
        ? selectedSources
        : [],
    sentiment,
    date_from: dateFrom || null,
    date_to: dateTo || null,
    selected_theme_id: selectedThemeId || null,
  });

  const [askQuery, setAskQuery] = useState('');
  const [showAllActiveThemes, setShowAllActiveThemes] = useState(false);
  const [showPreviousThemes, setShowPreviousThemes] = useState(false);
  const [themeDetail, setThemeDetail] = useState<ThemeDetailResponse | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [detailRefreshKey, setDetailRefreshKey] = useState(0);

  function updateSearchParams(
    mutate: (params: URLSearchParams) => void,
    mode: 'push' | 'replace' = 'push'
  ) {
    const nextParams = new URLSearchParams(searchParamsKey);
    mutate(nextParams);
    const href = buildHref(pathname, nextParams);
    if (mode === 'replace') {
      router.replace(href, { scroll: false });
      return;
    }
    router.push(href, { scroll: false });
  }

  function setSort(nextSort: ThemeExplorerSort) {
    updateSearchParams((params) => {
      params.set('sort', nextSort);
    });
  }

  function toggleSource(source: SourceType) {
    const currentSources = [...selectedSources];
    const isSelected = currentSources.includes(source);

    if (isSelected && currentSources.length === 1) {
      return;
    }

    const nextSources = isSelected
      ? currentSources.filter((item) => item !== source)
      : LIVE_SOURCE_VALUES.filter((value) => currentSources.includes(value) || value === source);
    const normalizedSources =
      nextSources.length === LIVE_SOURCE_VALUES.length ? [] : nextSources;

    updateSearchParams((params) => {
      params.delete('source');
      normalizedSources.forEach((value) => params.append('source', value));
    });
  }

  function setSentiment(nextSentiment: ThemeExplorerSentiment | null) {
    updateSearchParams((params) => {
      if (nextSentiment) {
        params.set('sentiment', nextSentiment);
      } else {
        params.delete('sentiment');
      }
    });
  }

  function setDate(field: 'date_from' | 'date_to', value: string) {
    updateSearchParams((params) => {
      if (value) {
        params.set(field, value);
      } else {
        params.delete(field);
      }
    });
  }

  function clearFilters() {
    updateSearchParams((params) => {
      params.delete('source');
      params.delete('sentiment');
      params.delete('date_from');
      params.delete('date_to');
    });
  }

  function selectTheme(themeId: string) {
    updateSearchParams((params) => {
      params.set('theme', themeId);
    });
  }

  function routeToAsk(query: string) {
    const trimmed = query.trim();
    if (!trimmed) return;
    router.push(`/ask?q=${encodeURIComponent(trimmed)}`);
  }

  function handleAskSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    routeToAsk(askQuery);
  }

  const availableThemeIds = explorer
    ? new Set([...explorer.active_themes, ...explorer.previous_themes].map((theme) => theme.id))
    : null;
  const resolvedSelectedThemeId = explorer
    ? selectedThemeId && availableThemeIds?.has(selectedThemeId)
      ? selectedThemeId
      : explorer.default_selected_theme_id ?? null
    : selectedThemeId;
  const visibleActiveThemes = explorer
    ? showAllActiveThemes
      ? explorer.active_themes
      : explorer.active_themes.slice(0, 6)
    : [];

  useEffect(() => {
    if (!explorer) return;

    if (resolvedSelectedThemeId === selectedThemeId) {
      return;
    }

    const nextParams = new URLSearchParams(searchParamsKey);
    if (resolvedSelectedThemeId) {
      nextParams.set('theme', resolvedSelectedThemeId);
    } else {
      nextParams.delete('theme');
    }
    router.replace(buildHref(pathname, nextParams), { scroll: false });
  }, [explorer, pathname, resolvedSelectedThemeId, router, searchParamsKey, selectedThemeId]);

  useEffect(() => {
    const themeId = resolvedSelectedThemeId;

    if (!token || !themeId) {
      setThemeDetail(null);
      setDetailError(null);
      setDetailLoading(false);
      return;
    }

    const authToken: string = token;
    const selectedTheme: string = themeId;
    let cancelled = false;

    async function loadThemeDetail() {
      setThemeDetail(null);
      setDetailLoading(true);
      setDetailError(null);
      try {
        const nextDetail = await api.getTheme(authToken, selectedTheme);
        if (!cancelled) {
          setThemeDetail(nextDetail);
        }
      } catch (err) {
        if (!cancelled) {
          setDetailError(
            err instanceof Error ? err.message : 'Failed to load theme details'
          );
        }
      } finally {
        if (!cancelled) {
          setDetailLoading(false);
        }
      }
    }

    void loadThemeDetail();

    return () => {
      cancelled = true;
    };
  }, [token, resolvedSelectedThemeId, detailRefreshKey]);

  if (loading && !explorer) {
    return <InsightsLoadingState />;
  }

  if (!loading && error && !explorer) {
    return <InsightsErrorState onRetry={refetch} />;
  }

  if (!explorer) {
    return null;
  }

  return (
    <div className="flex h-full overflow-hidden">
      <InsightsFilterRail
        selectedSources={selectedSources}
        selectedSentiment={sentiment}
        dateFrom={dateFrom}
        dateTo={dateTo}
        onToggleSource={toggleSource}
        onSentimentChange={setSentiment}
        onDateChange={setDate}
        onClearFilters={clearFilters}
      />

      <section className="flex-1 overflow-y-auto p-6" style={{ backgroundColor: '#0F1117' }}>
        <div className="max-w-4xl mx-auto">
          {error && (
            <div className="mb-6 rounded-xl border border-[rgba(255,180,171,0.16)] bg-[rgba(255,180,171,0.06)] px-4 py-3 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <span
                  className="material-symbols-outlined text-[var(--color-danger)]"
                  style={{ fontSize: 18 }}
                >
                  warning
                </span>
                <span className="text-[13px] text-[#F0F0F3]">
                  The latest explorer refresh failed. Showing the most recent results.
                </span>
              </div>
              <button
                type="button"
                onClick={() => void refetch()}
                className="text-[13px] font-medium text-[#afc6ff] hover:underline"
              >
                Retry
              </button>
            </div>
          )}

          <div className="flex items-center justify-between mb-6 gap-6">
            <h1 className="text-xl font-bold tracking-tight text-[#F0F0F3]">
              {explorer.summary.active_themes_count}{' '}
              {explorer.summary.active_themes_count === 1 ? 'Active Theme' : 'Active Themes'}
            </h1>
            <SortTabs activeSort={sort} onSelect={setSort} />
          </div>

          {!explorer.empty_reason && (
            <form onSubmit={handleAskSubmit} className="mb-8 relative group">
              <span
                className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 transition-colors"
                style={{ fontSize: 20, color: 'rgba(175,198,255,0.7)' }}
              >
                auto_awesome
              </span>
              <input
                type="text"
                value={askQuery}
                onChange={(event) => setAskQuery(event.target.value)}
                placeholder="Ask AI: What's the main reason for churn in Q3?"
                className="w-full rounded-xl py-4 pl-12 pr-28 text-sm outline-none transition-all"
                style={{
                  backgroundColor: '#1e1f26',
                  border: '1px solid rgba(66,71,83,0.1)',
                  color: '#F0F0F3',
                }}
                onFocus={(event) => {
                  event.currentTarget.style.boxShadow = '0 0 0 2px rgba(175,198,255,0.2)';
                  event.currentTarget.style.borderColor = 'rgba(175,198,255,0.3)';
                }}
                onBlur={(event) => {
                  event.currentTarget.style.boxShadow = 'none';
                  event.currentTarget.style.borderColor = 'rgba(66,71,83,0.1)';
                }}
              />
              <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-2">
                <button
                  type="submit"
                  disabled={!askQuery.trim()}
                  className="w-8 h-8 rounded-full flex items-center justify-center transition-all disabled:opacity-40"
                  style={{ backgroundColor: '#afc6ff', color: '#002d6c' }}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: 16 }}>
                    north_east
                  </span>
                </button>
                <span
                  className="text-[10px] text-[#5A5C66] font-mono px-1.5 py-0.5 rounded"
                  style={{ backgroundColor: '#282a30' }}
                >
                  ASK
                </span>
              </div>
            </form>
          )}

          {explorer.empty_reason === 'no_data' ? (
            <ExplorerEmptyState
              title="Start with interview evidence"
              body="This workspace does not have analyzed interviews or linked signals yet, so there is nothing to cluster into themes."
              primaryLabel="Upload Interviews"
              onPrimaryAction={() => router.push('/interviews')}
            />
          ) : explorer.empty_reason === 'no_matches' ? (
            <ExplorerEmptyState
              title="No themes match these filters"
              body="Your workspace has insights, but this combination of source, sentiment, and dates filtered every theme out."
              primaryLabel="Clear Filters"
              onPrimaryAction={clearFilters}
            />
          ) : (
            <>
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                {visibleActiveThemes.map((theme) => (
                  <ThemeCard
                    key={theme.id}
                    card={theme}
                    selected={resolvedSelectedThemeId === theme.id}
                    onClick={() => selectTheme(theme.id)}
                  />
                ))}
              </div>

              {(explorer.active_themes.length > 6 || explorer.previous_themes.length > 0) && (
                <div className="mt-8 flex items-center justify-center gap-8 flex-wrap">
                  {explorer.active_themes.length > 6 && (
                    <button
                      type="button"
                      onClick={() => setShowAllActiveThemes((value) => !value)}
                      className="text-xs font-medium text-[#afc6ff] hover:underline"
                    >
                      {showAllActiveThemes
                        ? 'Show fewer themes'
                        : `+ Show ${explorer.active_themes.length - visibleActiveThemes.length} more themes`}
                    </button>
                  )}

                  {explorer.previous_themes.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setShowPreviousThemes((value) => !value)}
                      className="text-xs font-medium text-[#5A5C66] hover:text-[#F0F0F3] transition-colors"
                    >
                      {showPreviousThemes ? 'Hide' : 'Previous'} themes (
                      {explorer.previous_themes.length})
                    </button>
                  )}
                </div>
              )}

              {showPreviousThemes && explorer.previous_themes.length > 0 && (
                <div className="mt-8">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xs font-semibold uppercase tracking-widest text-[#5A5C66]">
                      Previous Themes
                    </h2>
                  </div>
                  <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                    {explorer.previous_themes.map((theme) => (
                      <ThemeCard
                        key={theme.id}
                        card={theme}
                        selected={resolvedSelectedThemeId === theme.id}
                        onClick={() => selectTheme(theme.id)}
                      />
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </section>

      <section
        className="w-[340px] flex flex-col h-full border-l overflow-y-auto flex-shrink-0"
        style={{ backgroundColor: '#0C0D12', borderColor: 'rgba(66,71,83,0.1)' }}
      >
        {explorer.empty_reason === 'no_data' ? (
          <ThemeDetailPlaceholder
            title="No theme selected"
            body="Once interviews are analyzed, the active theme detail panel will fill in here."
          />
        ) : explorer.empty_reason === 'no_matches' ? (
          <ThemeDetailPlaceholder
            title="Filters cleared the workspace"
            body="Adjust the current filters to bring a theme back into focus."
            icon="filter_alt_off"
          />
        ) : detailLoading && !themeDetail ? (
          <ThemeDetailLoadingState />
        ) : detailError ? (
          <ThemeDetailErrorState
            onRetry={() => {
              setDetailRefreshKey((value) => value + 1);
            }}
          />
        ) : themeDetail ? (
          <ThemeDetailPanel
            theme={themeDetail}
            onAskTheme={() =>
              routeToAsk(`Tell me more about the "${themeDetail.name}" theme`)
            }
          />
        ) : (
          <ThemeDetailPlaceholder
            title="Select a theme"
            body="Choose a theme from the center panel to inspect its impact, evidence, and source breakdown."
          />
        )}
      </section>
    </div>
  );
}
