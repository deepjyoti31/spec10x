'use client';

/**
 * Tasks — the delivery workbench (v1.0 Full Loop).
 *
 * Every spec past approval, with its task-breakdown state and the agent
 * handoff actions. Task generation and editing happen in Spec Studio; this
 * page answers "what is ready to hand off, and has it been broken down?"
 */

import React, { useMemo, useState } from 'react';
import Link from 'next/link';

import { GitHubExportModal } from '@/components/specs/GitHubExportModal';
import { useToast } from '@/components/ui/Toast';
import { useAuth } from '@/hooks/useAuth';
import { useSpecs } from '@/hooks/useSpecs';
import { api, SpecListItemResponse } from '@/lib/api';
import { SPEC_STATUS_META, SPEC_TASK_READY_STATUSES } from '@/lib/specStatus';

const CARD_STYLE: React.CSSProperties = {
  backgroundColor: '#191b22',
  border: '1px solid rgba(66,71,83,0.1)',
};

function DeliveryRow({ spec }: { spec: SpecListItemResponse }) {
  const { token } = useAuth();
  const { showToast } = useToast();
  const [copying, setCopying] = useState(false);
  const [githubOpen, setGithubOpen] = useState(false);
  const statusMeta = SPEC_STATUS_META[spec.status];

  async function handleCopy() {
    if (!token) return;
    setCopying(true);
    try {
      const bundle = await api.getSpecExport(token, spec.id);
      await navigator.clipboard.writeText(bundle);
      showToast('Agent-ready bundle copied to clipboard', 'success');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to copy export', 'error');
    } finally {
      setCopying(false);
    }
  }

  return (
    <div className="flex flex-col gap-3 rounded-xl p-4 md:flex-row md:items-center" style={CARD_STYLE}>
      <div className="min-w-0 flex-1">
        <Link
          href={`/specs/${spec.id}`}
          className="text-sm font-bold text-[#e2e2eb] hover:text-[#afc6ff]"
        >
          {spec.title}
        </Link>
        <p className="mt-0.5 text-[11px]" style={{ color: '#8c909f' }}>
          {spec.theme_name_snapshot}
        </p>
      </div>
      <div className="flex flex-shrink-0 flex-wrap items-center gap-2">
        <span
          className="rounded px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider"
          style={{ backgroundColor: statusMeta.bg, color: statusMeta.color }}
        >
          {statusMeta.label}
        </span>
        {spec.task_count > 0 ? (
          <span className="text-[11px] font-bold" style={{ color: '#c2c6d6' }}>
            {spec.task_count} tasks
          </span>
        ) : (
          <Link
            href={`/specs/${spec.id}`}
            className="rounded px-2.5 py-1 text-[11px] font-bold transition-colors hover:bg-white/[0.08]"
            style={{ border: '1px solid rgba(66,71,83,0.3)', color: '#c2c6d6' }}
          >
            Break into tasks →
          </Link>
        )}
        {spec.task_count > 0 ? (
          <button
            type="button"
            className="flex items-center gap-1 rounded px-2.5 py-1 text-[11px] font-bold transition-colors hover:bg-white/[0.08]"
            style={{ border: '1px solid rgba(66,71,83,0.3)', color: '#c2c6d6' }}
            title="Create one GitHub issue per task (token used once, never stored)"
            onClick={() => setGithubOpen(true)}
          >
            <span className="material-symbols-outlined" style={{ fontSize: 13 }}>
              upload
            </span>
            GitHub Issues
          </button>
        ) : null}
        <button
          type="button"
          disabled={copying}
          className="flex items-center gap-1 rounded px-2.5 py-1 text-[11px] font-bold transition-colors hover:bg-white/[0.08] disabled:opacity-50"
          style={{ border: '1px solid rgba(66,71,83,0.3)', color: '#c2c6d6' }}
          title="Copy the brief + tasks + evidence as a markdown bundle for a coding agent"
          onClick={() => {
            void handleCopy();
          }}
        >
          <span className="material-symbols-outlined" style={{ fontSize: 13 }}>
            content_copy
          </span>
          {copying ? 'Copying…' : 'Copy for agent'}
        </button>
      </div>

      {githubOpen && token ? (
        <GitHubExportModal
          specId={spec.id}
          specTitle={spec.title}
          token={token}
          onClose={() => setGithubOpen(false)}
          onExported={(result) => {
            setGithubOpen(false);
            showToast(
              result.created > 0
                ? `Created ${result.created} GitHub issue${result.created === 1 ? '' : 's'} in ${result.repo}`
                : 'All tasks already have GitHub issues',
              'success'
            );
          }}
        />
      ) : null}
    </div>
  );
}

export default function TasksPage() {
  const { specs, loading, error } = useSpecs();

  const deliverySpecs = useMemo(
    () =>
      specs.filter(
        (spec) =>
          SPEC_TASK_READY_STATUSES.includes(spec.status) && spec.generation_status === 'ready'
      ),
    [specs]
  );

  return (
    <div className="flex-1 overflow-y-auto" style={{ backgroundColor: '#111319' }}>
      <div className="mx-auto max-w-4xl space-y-6 px-12 pb-16 pt-10">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#e2e2eb]">Tasks</h1>
          <p className="text-sm" style={{ color: '#c2c6d6' }}>
            Approved specs ready to hand off — break them into agent-ready tasks and copy the
            bundle into your coding agent.
          </p>
        </div>

        {loading ? (
          <p className="text-sm" style={{ color: '#8c909f' }}>Loading specs...</p>
        ) : error ? (
          <p className="text-sm" style={{ color: '#ffb4ab' }}>{error}</p>
        ) : deliverySpecs.length === 0 ? (
          <div className="rounded-xl p-10 text-center" style={CARD_STYLE}>
            <p className="text-sm font-bold text-[#e2e2eb]">Nothing approved yet</p>
            <p className="mt-1 text-xs" style={{ color: '#8c909f' }}>
              Task breakdown unlocks once a spec reaches Approved in{' '}
              <Link href="/specs" className="font-bold hover:underline" style={{ color: '#afc6ff' }}>
                Spec Studio
              </Link>
              .
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {deliverySpecs.map((spec) => (
              <DeliveryRow key={spec.id} spec={spec} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
