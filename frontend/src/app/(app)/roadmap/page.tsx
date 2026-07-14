'use client';

/**
 * Roadmap — Now / Next / Later / Shipped derived entirely from spec statuses
 * (v1.0 Full Loop, D-10-05). Nothing to maintain: the review workflow is the
 * roadmap.
 */

import React from 'react';
import Link from 'next/link';

import { useSpecs } from '@/hooks/useSpecs';
import { SpecListItemResponse, SpecStatus } from '@/lib/api';
import { SPEC_STATUS_META } from '@/lib/specStatus';

const CARD_STYLE: React.CSSProperties = {
  backgroundColor: '#191b22',
  border: '1px solid rgba(66,71,83,0.1)',
};

const COLUMNS: Array<{
  key: string;
  title: string;
  caption: string;
  statuses: SpecStatus[];
}> = [
  { key: 'now', title: 'Now', caption: 'In development', statuses: ['in_dev'] },
  { key: 'next', title: 'Next', caption: 'Approved, ready to build', statuses: ['approved'] },
  {
    key: 'later',
    title: 'Later',
    caption: 'Drafts and specs in review',
    statuses: ['draft', 'in_review', 'needs_changes'],
  },
  { key: 'shipped', title: 'Shipped', caption: 'Out the door', statuses: ['shipped'] },
];

function RoadmapCard({ spec }: { spec: SpecListItemResponse }) {
  const statusMeta = SPEC_STATUS_META[spec.status];
  return (
    <Link
      href={`/specs/${spec.id}`}
      className="block rounded-lg p-3 transition-colors hover:border-[#afc6ff]/40"
      style={{ backgroundColor: 'rgba(255,255,255,0.02)', border: '1px solid rgba(66,71,83,0.15)' }}
    >
      <p className="text-xs font-bold text-[#e2e2eb]">{spec.title}</p>
      <p className="mt-1 text-[10px]" style={{ color: '#8c909f' }}>
        {spec.theme_name_snapshot}
      </p>
      <div className="mt-2 flex flex-wrap items-center gap-2 text-[10px]" style={{ color: '#5A5C66' }}>
        <span
          className="rounded px-1.5 py-0.5 font-bold uppercase tracking-wider"
          style={{ backgroundColor: statusMeta.bg, color: statusMeta.color }}
        >
          {statusMeta.label}
        </span>
        {spec.impact_score_snapshot != null ? (
          <span>Impact {spec.impact_score_snapshot.toFixed(1)}</span>
        ) : null}
        {spec.task_count > 0 ? <span>{spec.task_count} tasks</span> : null}
        {spec.shipped_at ? (
          <span>Shipped {new Date(spec.shipped_at).toLocaleDateString()}</span>
        ) : null}
      </div>
    </Link>
  );
}

export default function RoadmapPage() {
  const { specs, loading, error } = useSpecs();

  return (
    <div className="flex-1 overflow-y-auto" style={{ backgroundColor: '#111319' }}>
      <div className="mx-auto max-w-7xl space-y-6 px-12 pb-16 pt-10">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#e2e2eb]">Roadmap</h1>
          <p className="text-sm" style={{ color: '#c2c6d6' }}>
            Derived from your spec pipeline — every card links back through its spec to the
            evidence behind it.
          </p>
        </div>

        {loading ? (
          <p className="text-sm" style={{ color: '#8c909f' }}>Loading roadmap...</p>
        ) : error ? (
          <p className="text-sm" style={{ color: '#ffb4ab' }}>{error}</p>
        ) : specs.length === 0 ? (
          <div className="rounded-xl p-10 text-center" style={CARD_STYLE}>
            <p className="text-sm font-bold text-[#e2e2eb]">No specs yet</p>
            <p className="mt-1 text-xs" style={{ color: '#8c909f' }}>
              Generate a spec from a prioritized theme on the{' '}
              <Link href="/board" className="font-bold hover:underline" style={{ color: '#afc6ff' }}>
                board
              </Link>{' '}
              — it will show up here as it moves through review.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
            {COLUMNS.map((column) => {
              const columnSpecs = specs.filter((spec) => column.statuses.includes(spec.status));
              return (
                <section key={column.key} className="rounded-xl p-4" style={CARD_STYLE}>
                  <div className="flex items-baseline justify-between">
                    <h2 className="text-sm font-bold text-[#e2e2eb]">{column.title}</h2>
                    <span className="text-[10px] font-bold" style={{ color: '#5A5C66' }}>
                      {columnSpecs.length}
                    </span>
                  </div>
                  <p className="mt-0.5 text-[10px]" style={{ color: '#5A5C66' }}>
                    {column.caption}
                  </p>
                  <div className="mt-3 space-y-2">
                    {columnSpecs.length === 0 ? (
                      <p className="py-4 text-center text-[10px] italic" style={{ color: '#5A5C66' }}>
                        Nothing here yet
                      </p>
                    ) : (
                      columnSpecs.map((spec) => <RoadmapCard key={spec.id} spec={spec} />)
                    )}
                  </div>
                </section>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
