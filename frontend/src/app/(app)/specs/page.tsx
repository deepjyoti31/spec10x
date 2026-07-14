'use client';

import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';

import { useToast } from '@/components/ui/Toast';
import { useSpecs } from '@/hooks/useSpecs';
import { useThemes } from '@/hooks/useThemes';
import { SpecListItemResponse, SpecStatus } from '@/lib/api';
import { SPEC_STATUS_META } from '@/lib/specStatus';

const STATUS_TABS: Array<{ key: SpecStatus | 'all'; label: string }> = [
  { key: 'all', label: 'All' },
  { key: 'draft', label: 'Draft' },
  { key: 'in_review', label: 'In Review' },
  { key: 'needs_changes', label: 'Needs Changes' },
  { key: 'approved', label: 'Approved' },
  { key: 'in_dev', label: 'In Dev' },
  { key: 'shipped', label: 'Shipped' },
];

function StatusBadge({ status }: { status: SpecStatus }) {
  const meta = SPEC_STATUS_META[status];
  return (
    <span
      className="flex-shrink-0 rounded px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider"
      style={{ backgroundColor: meta.bg, color: meta.color }}
    >
      {meta.label}
    </span>
  );
}

function SpecCard({ spec }: { spec: SpecListItemResponse }) {
  return (
    <Link
      href={`/specs/${spec.id}`}
      className="group block rounded-xl p-5 transition-colors"
      style={{ backgroundColor: '#191b22', border: '1px solid rgba(66,71,83,0.1)' }}
    >
      <div className="flex items-start justify-between gap-3">
        <h3 className="text-sm font-bold text-[#e2e2eb] group-hover:text-[#afc6ff]">
          {spec.title}
        </h3>
        <StatusBadge status={spec.status} />
      </div>
      <p className="mt-1 text-xs" style={{ color: '#8c909f' }}>
        From theme: {spec.theme_name_snapshot}
        {spec.theme_id ? '' : ' (theme no longer exists)'}
      </p>
      <div className="mt-3 flex flex-wrap items-center gap-3 text-[11px]" style={{ color: '#8c909f' }}>
        {spec.generation_status === 'error' ? (
          <span style={{ color: '#ffb4ab' }}>Generation failed — open to retry</span>
        ) : (
          <>
            {spec.impact_score_snapshot != null && (
              <span>Impact {spec.impact_score_snapshot.toFixed(1)}</span>
            )}
            <span>{spec.evidence_count} evidence items</span>
            <span
              className="rounded px-1.5 py-0.5 text-[10px] font-medium"
              style={{
                backgroundColor: 'rgba(255,255,255,0.05)',
                color: spec.is_edited ? '#a8e6b0' : '#8c909f',
              }}
            >
              {spec.is_edited ? 'Edited by you' : 'AI draft'}
            </span>
          </>
        )}
        <span className="ml-auto">
          {new Date(spec.updated_at).toLocaleDateString()}
        </span>
      </div>
    </Link>
  );
}

export default function SpecsPage() {
  const router = useRouter();
  const { showToast } = useToast();
  const { specs, loading, error, createSpec } = useSpecs();
  const { activeThemes, loading: themesLoading } = useThemes();

  const searchParams = useSearchParams();
  // Deep links like /specs?status=approved (home pipeline, tasks page) land on the right tab
  const [tab, setTab] = useState<SpecStatus | 'all'>(() => {
    const requested = searchParams?.get('status');
    return requested && STATUS_TABS.some((entry) => entry.key === requested)
      ? (requested as SpecStatus)
      : 'all';
  });
  const [showPicker, setShowPicker] = useState(false);
  const [generatingThemeId, setGeneratingThemeId] = useState<string | null>(null);

  const visibleSpecs = useMemo(
    () => (tab === 'all' ? specs : specs.filter((spec) => spec.status === tab)),
    [specs, tab]
  );

  async function handleGenerate(themeId: string) {
    setGeneratingThemeId(themeId);
    try {
      const created = await createSpec(themeId);
      if (created.generation_status === 'error') {
        showToast('Spec created, but generation failed — you can retry from the spec page.', 'error');
      }
      router.push(`/specs/${created.id}`);
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to generate spec', 'error');
      setGeneratingThemeId(null);
    }
  }

  return (
    <div className="flex-1 overflow-y-auto" style={{ backgroundColor: '#111319' }}>
      <div className="mx-auto max-w-6xl space-y-6 px-12 pb-16 pt-10">
        <section className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <div className="space-y-1">
            <h1 className="text-2xl font-bold tracking-tight text-[#e2e2eb]">Specs</h1>
            <p className="text-sm" style={{ color: '#c2c6d6' }}>
              AI-drafted feature briefs generated from your prioritized themes — every section cited back to real evidence.
            </p>
          </div>
          <button
            type="button"
            className="inline-flex flex-shrink-0 items-center gap-2 rounded px-4 py-2 text-xs font-bold transition-all"
            style={{ backgroundColor: '#afc6ff', color: '#002d6c' }}
            onClick={() => setShowPicker((current) => !current)}
          >
            <span className="material-symbols-outlined" style={{ fontSize: 16 }}>
              add
            </span>
            New Spec
          </button>
        </section>

        {showPicker ? (
          <section
            className="space-y-3 rounded-xl p-5"
            style={{ backgroundColor: '#191b22', border: '1px solid rgba(66,71,83,0.1)' }}
          >
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-[#e2e2eb]">Generate a spec from a theme</h2>
              <button
                type="button"
                className="text-xs font-bold"
                style={{ color: '#8c909f' }}
                onClick={() => setShowPicker(false)}
              >
                Close
              </button>
            </div>
            <p className="text-xs" style={{ color: '#8c909f' }}>
              Pick a theme — the AI drafts the brief from that theme&apos;s supporting evidence. You review, edit, and approve.
            </p>
            {themesLoading ? (
              <p className="text-xs" style={{ color: '#8c909f' }}>Loading themes...</p>
            ) : activeThemes.length === 0 ? (
              <p className="text-xs" style={{ color: '#8c909f' }}>
                No active themes yet. Upload interviews or sync sources first.
              </p>
            ) : (
              <div className="max-h-72 space-y-1 overflow-y-auto">
                {activeThemes.map((theme) => (
                  <button
                    key={theme.id}
                    type="button"
                    disabled={generatingThemeId !== null}
                    className="flex w-full items-center justify-between gap-3 rounded px-3 py-2 text-left transition-colors hover:bg-white/[0.04] disabled:opacity-50"
                    style={{ border: '1px solid rgba(66,71,83,0.1)' }}
                    onClick={() => {
                      void handleGenerate(theme.id);
                    }}
                  >
                    <span className="text-xs font-medium text-[#e2e2eb]">{theme.name}</span>
                    <span className="flex items-center gap-3 text-[11px]" style={{ color: '#8c909f' }}>
                      {theme.impact_score != null && <span>Impact {theme.impact_score.toFixed(1)}</span>}
                      <span>{theme.mention_count} mentions</span>
                      {generatingThemeId === theme.id ? (
                        <span style={{ color: '#afc6ff' }}>Generating…</span>
                      ) : (
                        <span className="material-symbols-outlined" style={{ fontSize: 14 }}>
                          arrow_forward
                        </span>
                      )}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </section>
        ) : null}

        <div className="flex flex-wrap gap-1">
          {STATUS_TABS.map((entry) => (
            <button
              key={entry.key}
              type="button"
              className="rounded px-3 py-1.5 text-xs font-bold transition-colors"
              style={
                tab === entry.key
                  ? { backgroundColor: 'rgba(175,198,255,0.12)', color: '#afc6ff' }
                  : { color: '#8c909f' }
              }
              onClick={() => setTab(entry.key)}
            >
              {entry.label}
            </button>
          ))}
        </div>

        {loading ? (
          <p className="text-sm" style={{ color: '#8c909f' }}>Loading specs...</p>
        ) : error ? (
          <p className="text-sm" style={{ color: '#ffb4ab' }}>{error}</p>
        ) : visibleSpecs.length === 0 ? (
          <div
            className="rounded-xl p-10 text-center"
            style={{ backgroundColor: '#191b22', border: '1px solid rgba(66,71,83,0.1)' }}
          >
            <p className="text-sm" style={{ color: '#8c909f' }}>
              {tab === 'all'
                ? 'No specs yet. Generate your first brief from a prioritized theme.'
                : 'No specs in this status.'}
            </p>
          </div>
        ) : (
          <section className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {visibleSpecs.map((spec) => (
              <SpecCard key={spec.id} spec={spec} />
            ))}
          </section>
        )}
      </div>
    </div>
  );
}
