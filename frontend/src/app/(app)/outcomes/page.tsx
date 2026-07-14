'use client';

/**
 * Outcomes — post-ship readout per shipped spec (v1.0 Full Loop, D-10-06).
 *
 * Weekly customer-voice volume on the source theme, 4 weeks before vs. after
 * the first ship. Correlational only: the readout never claims causation.
 * Bar colors are the first two slots of the app's CVD-validated series theme
 * (validated against the #191b22 surface); phase identity is also carried by
 * the ship divider and the legend, never by color alone.
 */

import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';

import { useAuth } from '@/hooks/useAuth';
import { api, SpecOutcomeResponse, SpecOutcomeState } from '@/lib/api';

const CARD_STYLE: React.CSSProperties = {
  backgroundColor: '#191b22',
  border: '1px solid rgba(66,71,83,0.1)',
};

const PRE_COLOR = '#3987e5';
const POST_COLOR = '#199e70';

const STATE_META: Record<SpecOutcomeState, { label: string; icon: string; color: string }> = {
  improving: { label: 'Voice volume fell', icon: 'trending_down', color: '#a8e6b0' },
  worsening: { label: 'Voice volume rose', icon: 'trending_up', color: '#ffb4ab' },
  flat: { label: 'No clear change', icon: 'trending_flat', color: '#8c909f' },
  too_early: { label: 'Too early to read', icon: 'hourglass_top', color: '#ffd8a8' },
  unavailable: { label: 'Theme no longer exists', icon: 'link_off', color: '#8c909f' },
};

function PrePostBars({ outcome }: { outcome: SpecOutcomeResponse }) {
  const counts = [...outcome.pre_counts, ...outcome.post_counts];
  if (counts.length === 0) return null;
  const max = Math.max(1, ...counts);
  const chartHeight = 56;

  const bar = (count: number, index: number, phase: 'pre' | 'post') => {
    const height = Math.max(3, Math.round((count / max) * chartHeight));
    const weekLabel =
      phase === 'pre'
        ? `${outcome.pre_counts.length - index} week${outcome.pre_counts.length - index === 1 ? '' : 's'} before ship`
        : `week ${index + 1} after ship`;
    return (
      <div
        key={`${phase}-${index}`}
        className="flex-1 rounded-t-[4px] transition-opacity hover:opacity-80"
        role="img"
        aria-label={`${count} voice signals, ${weekLabel}`}
        title={`${count} voice signal${count === 1 ? '' : 's'} — ${weekLabel}`}
        style={{
          height,
          backgroundColor: phase === 'pre' ? PRE_COLOR : POST_COLOR,
          minWidth: 8,
        }}
      />
    );
  };

  return (
    <div className="flex items-end gap-[2px]" style={{ height: chartHeight }}>
      {outcome.pre_counts.map((count, index) => bar(count, index, 'pre'))}
      <div
        className="self-stretch"
        title="Shipped"
        style={{ width: 2, backgroundColor: 'rgba(226,226,235,0.35)' }}
      />
      {outcome.post_counts.length > 0 ? (
        outcome.post_counts.map((count, index) => bar(count, index, 'post'))
      ) : (
        <div
          className="flex flex-1 items-center justify-center text-[9px] italic"
          style={{ color: '#5A5C66' }}
        >
          no full week yet
        </div>
      )}
    </div>
  );
}

function OutcomeCard({ outcome }: { outcome: SpecOutcomeResponse }) {
  const stateMeta = STATE_META[outcome.state] ?? STATE_META.flat;
  return (
    <section className="rounded-xl p-5" style={CARD_STYLE}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <Link
            href={`/specs/${outcome.spec_id}`}
            className="text-sm font-bold text-[#e2e2eb] hover:text-[#afc6ff]"
          >
            {outcome.title}
          </Link>
          <p className="mt-0.5 text-[11px]" style={{ color: '#8c909f' }}>
            {outcome.theme_id ? (
              <Link href={`/insights?theme=${outcome.theme_id}`} className="hover:underline">
                {outcome.theme_name}
              </Link>
            ) : (
              outcome.theme_name
            )}
            {' · shipped '}
            {new Date(outcome.shipped_at).toLocaleDateString()}
          </p>
        </div>
        <span
          className="flex flex-shrink-0 items-center gap-1 rounded px-2 py-1 text-[10px] font-bold"
          style={{ backgroundColor: 'rgba(255,255,255,0.04)', color: stateMeta.color }}
        >
          <span className="material-symbols-outlined" style={{ fontSize: 13 }}>
            {stateMeta.icon}
          </span>
          {stateMeta.label}
        </span>
      </div>

      {outcome.state === 'unavailable' ? (
        <p className="mt-4 text-xs italic" style={{ color: '#5A5C66' }}>
          The source theme was merged or deleted, so post-ship voice volume can no longer be
          measured. The spec keeps its evidence snapshot.
        </p>
      ) : (
        <>
          <div className="mt-4">
            <PrePostBars outcome={outcome} />
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-4 text-[10px]" style={{ color: '#8c909f' }}>
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-sm" style={{ backgroundColor: PRE_COLOR }} />
              Before ship
              {outcome.pre_weekly_avg != null ? (
                <span className="font-bold text-[#e2e2eb]">{outcome.pre_weekly_avg}/wk</span>
              ) : null}
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-sm" style={{ backgroundColor: POST_COLOR }} />
              After ship
              {outcome.post_weekly_avg != null ? (
                <span className="font-bold text-[#e2e2eb]">{outcome.post_weekly_avg}/wk</span>
              ) : null}
            </span>
          </div>
        </>
      )}
    </section>
  );
}

export default function OutcomesPage() {
  const { token, loading: authLoading } = useAuth();
  const [outcomes, setOutcomes] = useState<SpecOutcomeResponse[]>([]);
  const [windowWeeks, setWindowWeeks] = useState(4);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchOutcomes = useCallback(async () => {
    if (authLoading) return;
    if (!token) {
      setOutcomes([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const page = await api.getSpecOutcomes(token);
      setOutcomes(page.specs);
      setWindowWeeks(page.window_weeks);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load outcomes');
    } finally {
      setLoading(false);
    }
  }, [authLoading, token]);

  useEffect(() => {
    void fetchOutcomes();
  }, [fetchOutcomes]);

  return (
    <div className="flex-1 overflow-y-auto" style={{ backgroundColor: '#111319' }}>
      <div className="mx-auto max-w-5xl space-y-6 px-12 pb-16 pt-10">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#e2e2eb]">Outcomes</h1>
          <p className="text-sm" style={{ color: '#c2c6d6' }}>
            Weekly customer-voice volume on each shipped spec&apos;s source theme, {windowWeeks} weeks
            before vs. after ship.
          </p>
          <p className="mt-1 text-xs italic" style={{ color: '#8c909f' }}>
            Voice volume shows what users kept saying — supporting evidence, not proven impact.
          </p>
        </div>

        {loading ? (
          <p className="text-sm" style={{ color: '#8c909f' }}>Loading outcomes...</p>
        ) : error ? (
          <p className="text-sm" style={{ color: '#ffb4ab' }}>{error}</p>
        ) : outcomes.length === 0 ? (
          <div className="rounded-xl p-10 text-center" style={CARD_STYLE}>
            <p className="text-sm font-bold text-[#e2e2eb]">Nothing shipped yet</p>
            <p className="mt-1 text-xs" style={{ color: '#8c909f' }}>
              Move a spec to Shipped in{' '}
              <Link href="/specs" className="font-bold hover:underline" style={{ color: '#afc6ff' }}>
                Spec Studio
              </Link>{' '}
              and its post-ship readout will appear here.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {outcomes.map((outcome) => (
              <OutcomeCard key={outcome.spec_id} outcome={outcome} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
