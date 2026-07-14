'use client';

import React, { useMemo, useState } from 'react';
import Link from 'next/link';

import { useTrends } from '@/hooks/useTrends';
import { TrendThemeResponse } from '@/lib/api';

// Categorical series palette — validated for the dark surface (#191b22) with
// scripts/validate_palette.js: lightness band, chroma floor, CVD separation,
// and ≥3:1 contrast all pass. Slots are assigned by entity (theme position in
// the stable impact-sorted list), never re-assigned when the selection changes.
const SERIES_COLORS = ['#3987e5', '#199e70', '#c98500', '#9085e9', '#d55181'];
const MAX_SELECTED = SERIES_COLORS.length;

const CARD_STYLE: React.CSSProperties = {
  backgroundColor: '#191b22',
  border: '1px solid rgba(66,71,83,0.1)',
};

const DIRECTION_META: Record<string, { label: string; icon: string; color: string }> = {
  rising: { label: 'Rising', icon: 'trending_up', color: '#ffb4ab' },
  declining: { label: 'Declining', icon: 'trending_down', color: '#a8e6b0' },
  flat: { label: 'Stable', icon: 'trending_flat', color: '#8c909f' },
};

function formatWeekLabel(iso: string): string {
  const date = new Date(iso);
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function Sparkline({ counts }: { counts: number[] }) {
  const width = 96;
  const height = 28;
  const max = Math.max(...counts, 1);
  const step = width / (counts.length - 1);
  const points = counts
    .map((count, index) => `${index * step},${height - 3 - (count / max) * (height - 6)}`)
    .join(' ');
  return (
    <svg width={width} height={height} aria-hidden="true">
      <polyline points={points} fill="none" stroke="#3987e5" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}

function TrendChart({
  weeks,
  series,
}: {
  weeks: string[];
  series: Array<{ theme: TrendThemeResponse; color: string }>;
}) {
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  const width = 820;
  const height = 300;
  const pad = { top: 16, right: 120, bottom: 28, left: 36 };
  const plotWidth = width - pad.left - pad.right;
  const plotHeight = height - pad.top - pad.bottom;

  const maxCount = Math.max(
    1,
    ...series.flatMap(({ theme }) => theme.weekly_counts)
  );
  const xFor = (index: number) => pad.left + (index / (weeks.length - 1)) * plotWidth;
  const yFor = (count: number) => pad.top + plotHeight - (count / maxCount) * plotHeight;

  const gridValues = useMemo(() => {
    const stepCount = Math.min(4, maxCount);
    return Array.from({ length: stepCount + 1 }, (_, i) =>
      Math.round((maxCount / stepCount) * i)
    );
  }, [maxCount]);

  function handleMove(event: React.MouseEvent<SVGSVGElement>) {
    const rect = event.currentTarget.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * width;
    const index = Math.round(((x - pad.left) / plotWidth) * (weeks.length - 1));
    setHoverIndex(Math.max(0, Math.min(weeks.length - 1, index)));
  }

  if (series.length === 0) {
    return (
      <p className="py-10 text-center text-sm" style={{ color: '#8c909f' }}>
        Select at least one theme below to plot it.
      </p>
    );
  }

  return (
    <div className="relative">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="w-full"
        role="img"
        aria-label="Weekly signal volume per selected theme"
        onMouseMove={handleMove}
        onMouseLeave={() => setHoverIndex(null)}
      >
        {/* recessive grid */}
        {gridValues.map((value) => (
          <g key={value}>
            <line
              x1={pad.left}
              x2={pad.left + plotWidth}
              y1={yFor(value)}
              y2={yFor(value)}
              stroke="#2A2C38"
              strokeWidth={1}
            />
            <text x={pad.left - 8} y={yFor(value) + 3} textAnchor="end" fontSize={10} fill="#5A5C66">
              {value}
            </text>
          </g>
        ))}

        {/* x labels */}
        {weeks.map((week, index) =>
          index % 2 === 0 ? (
            <text
              key={week}
              x={xFor(index)}
              y={height - 8}
              textAnchor="middle"
              fontSize={10}
              fill="#5A5C66"
            >
              {formatWeekLabel(week)}
            </text>
          ) : null
        )}

        {/* crosshair */}
        {hoverIndex !== null && (
          <line
            x1={xFor(hoverIndex)}
            x2={xFor(hoverIndex)}
            y1={pad.top}
            y2={pad.top + plotHeight}
            stroke="#5A5C66"
            strokeWidth={1}
            strokeDasharray="3 3"
          />
        )}

        {/* series lines + hover markers + direct end labels */}
        {series.map(({ theme, color }) => {
          const points = theme.weekly_counts
            .map((count, index) => `${xFor(index)},${yFor(count)}`)
            .join(' ');
          const lastIndex = theme.weekly_counts.length - 1;
          return (
            <g key={theme.id}>
              <polyline
                points={points}
                fill="none"
                stroke={color}
                strokeWidth={2}
                strokeLinejoin="round"
                strokeLinecap="round"
              />
              {hoverIndex !== null && (
                <circle
                  cx={xFor(hoverIndex)}
                  cy={yFor(theme.weekly_counts[hoverIndex])}
                  r={4}
                  fill={color}
                  stroke="#191b22"
                  strokeWidth={2}
                />
              )}
              <circle cx={xFor(lastIndex)} cy={yFor(theme.weekly_counts[lastIndex])} r={3} fill={color} />
              <text
                x={xFor(lastIndex) + 8}
                y={yFor(theme.weekly_counts[lastIndex]) + 3}
                fontSize={10}
                fill="#c2c6d6"
              >
                {theme.name.length > 16 ? `${theme.name.slice(0, 15)}…` : theme.name}
              </text>
            </g>
          );
        })}
      </svg>

      {/* tooltip */}
      {hoverIndex !== null && (
        <div
          className="pointer-events-none absolute rounded-lg px-3 py-2 text-xs shadow-xl"
          style={{
            backgroundColor: '#1E2028',
            border: '1px solid #2A2C38',
            left: `${(xFor(hoverIndex) / width) * 100}%`,
            top: 0,
            transform: xFor(hoverIndex) > width * 0.6 ? 'translateX(-110%)' : 'translateX(12px)',
          }}
        >
          <div className="font-bold text-[#e2e2eb]">Week of {formatWeekLabel(weeks[hoverIndex])}</div>
          <div className="mt-1 space-y-0.5">
            {series.map(({ theme, color }) => (
              <div key={theme.id} className="flex items-center gap-2" style={{ color: '#c2c6d6' }}>
                <span className="inline-block h-2 w-2 rounded-full" style={{ backgroundColor: color }} />
                <span className="max-w-44 truncate">{theme.name}</span>
                <span className="ml-auto font-bold text-[#e2e2eb]">
                  {theme.weekly_counts[hoverIndex]}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function DirectionSection({
  title,
  caption,
  themes,
  windowDays,
}: {
  title: string;
  caption: string;
  themes: TrendThemeResponse[];
  windowDays: number;
}) {
  if (themes.length === 0) return null;
  return (
    <section className="space-y-3">
      <div>
        <h2 className="text-sm font-bold text-[#e2e2eb]">{title}</h2>
        <p className="text-xs" style={{ color: '#8c909f' }}>{caption}</p>
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {themes.map((theme) => {
          const direction = DIRECTION_META[theme.direction] ?? DIRECTION_META.flat;
          return (
            <Link
              key={theme.id}
              href={`/insights?theme=${theme.id}`}
              className="group rounded-xl p-4 transition-colors"
              style={CARD_STYLE}
            >
              <div className="flex items-start justify-between gap-2">
                <h3 className="text-xs font-bold text-[#e2e2eb] group-hover:text-[#afc6ff]">
                  {theme.name}
                </h3>
                <span
                  className="flex flex-shrink-0 items-center gap-1 text-[10px] font-bold uppercase tracking-wider"
                  style={{ color: direction.color }}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: 13 }}>
                    {direction.icon}
                  </span>
                  {direction.label}
                </span>
              </div>
              <div className="mt-3 flex items-end justify-between gap-3">
                <div className="text-[11px]" style={{ color: '#8c909f' }}>
                  <div>
                    <span className="font-bold text-[#e2e2eb]">{theme.recent_count}</span> signals last {windowDays}d
                  </div>
                  <div>vs {theme.previous_count} the {windowDays}d before</div>
                </div>
                <Sparkline counts={theme.weekly_counts} />
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}

export default function TrendsPage() {
  const { trends, loading, error } = useTrends();
  const [selectedIds, setSelectedIds] = useState<string[] | null>(null);
  const [showTable, setShowTable] = useState(false);

  // Stable slot assignment: color follows the theme's position in the
  // impact-sorted list, so toggling selection never repaints survivors.
  const colorByThemeId = useMemo(() => {
    const map = new Map<string, string>();
    (trends?.themes ?? []).forEach((theme, index) => {
      if (index < SERIES_COLORS.length) map.set(theme.id, SERIES_COLORS[index]);
    });
    return map;
  }, [trends]);

  const plottableThemes = useMemo(
    () => (trends?.themes ?? []).filter((theme) => colorByThemeId.has(theme.id)),
    [trends, colorByThemeId]
  );

  const effectiveSelected = useMemo(() => {
    if (selectedIds !== null) return selectedIds;
    return plottableThemes.slice(0, MAX_SELECTED).map((theme) => theme.id);
  }, [selectedIds, plottableThemes]);

  const series = useMemo(
    () =>
      plottableThemes
        .filter((theme) => effectiveSelected.includes(theme.id))
        .map((theme) => ({ theme, color: colorByThemeId.get(theme.id)! })),
    [plottableThemes, effectiveSelected, colorByThemeId]
  );

  function toggleTheme(id: string) {
    const current = new Set(effectiveSelected);
    if (current.has(id)) {
      current.delete(id);
    } else if (current.size < MAX_SELECTED) {
      current.add(id);
    }
    setSelectedIds(Array.from(current));
  }

  const rising = (trends?.themes ?? []).filter((theme) => theme.direction === 'rising');
  const declining = (trends?.themes ?? []).filter((theme) => theme.direction === 'declining');
  const stable = (trends?.themes ?? []).filter((theme) => theme.direction === 'flat');

  return (
    <div className="flex-1 overflow-y-auto" style={{ backgroundColor: '#111319' }}>
      <div className="mx-auto max-w-6xl space-y-8 px-12 pb-16 pt-10">
        <section className="space-y-1">
          <h1 className="text-2xl font-bold tracking-tight text-[#e2e2eb]">Trends</h1>
          <p className="text-sm" style={{ color: '#c2c6d6' }}>
            How customer-voice evidence volume moves per theme, week over week. Trends show evidence volume, not proven impact.
          </p>
        </section>

        {loading ? (
          <p className="text-sm" style={{ color: '#8c909f' }}>Loading trends...</p>
        ) : error ? (
          <p className="text-sm" style={{ color: '#ffb4ab' }}>{error}</p>
        ) : !trends || !trends.has_data ? (
          <div className="rounded-xl p-10 text-center" style={CARD_STYLE}>
            <p className="text-sm" style={{ color: '#8c909f' }}>
              No trend data yet. Upload interviews or sync sources to start tracking theme velocity.
            </p>
          </div>
        ) : (
          <>
            <section className="space-y-4 rounded-xl p-5" style={CARD_STYLE}>
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-sm font-bold text-[#e2e2eb]">
                  Weekly signal volume — last {trends.weeks.length} weeks
                </h2>
                <button
                  type="button"
                  className="rounded px-3 py-1.5 text-xs font-bold transition-colors"
                  style={
                    showTable
                      ? { backgroundColor: 'rgba(175,198,255,0.12)', color: '#afc6ff' }
                      : { color: '#8c909f' }
                  }
                  onClick={() => setShowTable((current) => !current)}
                >
                  {showTable ? 'Chart view' : 'Table view'}
                </button>
              </div>

              {showTable ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr style={{ color: '#8c909f' }}>
                        <th className="py-2 pr-4 font-bold">Theme</th>
                        {trends.weeks.map((week) => (
                          <th key={week} className="px-2 py-2 text-right font-medium">
                            {formatWeekLabel(week)}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {series.map(({ theme, color }) => (
                        <tr key={theme.id} style={{ borderTop: '1px solid #1E2028' }}>
                          <td className="py-2 pr-4 font-medium text-[#e2e2eb]">
                            <span className="mr-2 inline-block h-2 w-2 rounded-full" style={{ backgroundColor: color }} />
                            {theme.name}
                          </td>
                          {theme.weekly_counts.map((count, index) => (
                            <td key={index} className="px-2 py-2 text-right" style={{ color: '#c2c6d6' }}>
                              {count}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <TrendChart weeks={trends.weeks} series={series} />
              )}

              {/* legend / theme selector */}
              <div className="flex flex-wrap gap-2 border-t pt-3" style={{ borderColor: '#1E2028' }}>
                {plottableThemes.map((theme) => {
                  const selected = effectiveSelected.includes(theme.id);
                  const color = colorByThemeId.get(theme.id)!;
                  return (
                    <button
                      key={theme.id}
                      type="button"
                      className="flex items-center gap-1.5 rounded px-2 py-1 text-[11px] font-medium transition-colors"
                      style={{
                        border: `1px solid ${selected ? color : 'rgba(66,71,83,0.3)'}`,
                        color: selected ? '#e2e2eb' : '#8c909f',
                        opacity: selected ? 1 : 0.7,
                      }}
                      onClick={() => toggleTheme(theme.id)}
                    >
                      <span
                        className="inline-block h-2 w-2 rounded-full"
                        style={{ backgroundColor: selected ? color : '#5A5C66' }}
                      />
                      {theme.name}
                    </button>
                  );
                })}
                {trends.themes.length > plottableThemes.length ? (
                  <span className="self-center text-[10px]" style={{ color: '#5A5C66' }}>
                    Top {plottableThemes.length} themes by impact are plottable; the rest appear in the sections below.
                  </span>
                ) : null}
              </div>
            </section>

            <DirectionSection
              title="Rising"
              caption="Accelerating voice-signal volume — worth a look before they escalate."
              themes={rising}
              windowDays={trends.window_days}
            />
            <DirectionSection
              title="Declining"
              caption="Evidence volume is easing off versus the prior window."
              themes={declining}
              windowDays={trends.window_days}
            />
            <DirectionSection
              title="Stable"
              caption="Consistent mention rate across both windows."
              themes={stable}
              windowDays={trends.window_days}
            />
          </>
        )}
      </div>
    </div>
  );
}
