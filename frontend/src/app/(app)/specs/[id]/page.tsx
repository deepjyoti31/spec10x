'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import ReactMarkdown from 'react-markdown';

import { GitHubExportModal } from '@/components/specs/GitHubExportModal';
import { useToast } from '@/components/ui/Toast';
import { useSpec } from '@/hooks/useSpecs';
import { api, SpecEvidenceItem, SpecSection, SpecStatus, SpecTask } from '@/lib/api';
import {
  SPEC_ALLOWED_TRANSITIONS,
  SPEC_COMPLEXITY_META,
  SPEC_REGENERATABLE_STATUSES,
  SPEC_STATUS_META,
  SPEC_TASK_READY_STATUSES,
} from '@/lib/specStatus';
import { useAuth } from '@/hooks/useAuth';

const CARD_STYLE: React.CSSProperties = {
  backgroundColor: '#191b22',
  border: '1px solid rgba(66,71,83,0.1)',
};

function CitationChips({
  citations,
  onFocus,
}: {
  citations: number[];
  onFocus: (ref: number) => void;
}) {
  if (!citations.length) return null;
  return (
    <div className="mt-2 flex flex-wrap gap-1">
      {citations.map((ref) => (
        <button
          key={ref}
          type="button"
          className="rounded px-1.5 py-0.5 text-[10px] font-bold transition-colors hover:bg-[rgba(175,198,255,0.25)]"
          style={{ backgroundColor: 'rgba(175,198,255,0.12)', color: '#afc6ff' }}
          onClick={() => onFocus(ref)}
          title={`Jump to evidence [${ref}]`}
        >
          [{ref}]
        </button>
      ))}
    </div>
  );
}

function SectionCard({
  section,
  saving,
  onSave,
  onFocusEvidence,
}: {
  section: SpecSection;
  saving: boolean;
  onSave: (key: string, content: string) => Promise<void>;
  onFocusEvidence: (ref: number) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(section.content);

  return (
    <section className="rounded-xl p-5" style={CARD_STYLE}>
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-sm font-bold text-[#e2e2eb]">{section.title}</h2>
        {editing ? (
          <div className="flex gap-2">
            <button
              type="button"
              className="text-xs font-bold"
              style={{ color: '#8c909f' }}
              onClick={() => {
                setDraft(section.content);
                setEditing(false);
              }}
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={saving}
              className="rounded px-3 py-1 text-xs font-bold disabled:opacity-50"
              style={{ backgroundColor: '#afc6ff', color: '#002d6c' }}
              onClick={() => {
                void onSave(section.key, draft)
                  .then(() => setEditing(false))
                  .catch(() => {});
              }}
            >
              {saving ? 'Saving…' : 'Save'}
            </button>
          </div>
        ) : (
          <button
            type="button"
            className="flex items-center gap-1 text-xs font-bold"
            style={{ color: '#8c909f' }}
            onClick={() => {
              setDraft(section.content);
              setEditing(true);
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: 14 }}>
              edit
            </span>
            Edit
          </button>
        )}
      </div>

      {editing ? (
        <textarea
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          rows={Math.max(6, draft.split('\n').length + 1)}
          className="mt-3 w-full rounded bg-transparent px-3 py-2 text-sm text-[#e2e2eb] outline-none"
          style={{ border: '1px solid #2A2C38', fontFamily: 'inherit' }}
        />
      ) : (
        <div className="prose-invert mt-3 max-w-none text-sm leading-relaxed text-[#c2c6d6] [&_li]:ml-4 [&_li]:list-disc [&_ol_li]:list-decimal [&_p]:mb-2 [&_ul]:mb-2 [&_strong]:text-[#e2e2eb]">
          {section.content ? (
            <ReactMarkdown>{section.content}</ReactMarkdown>
          ) : (
            <p className="text-xs italic" style={{ color: '#5A5C66' }}>
              This section is empty.
            </p>
          )}
        </div>
      )}
      <CitationChips citations={section.citations} onFocus={onFocusEvidence} />
    </section>
  );
}

function TaskCard({
  task,
  onFocusEvidence,
}: {
  task: SpecTask;
  onFocusEvidence: (ref: number) => void;
}) {
  const complexityMeta = SPEC_COMPLEXITY_META[task.complexity] ?? SPEC_COMPLEXITY_META.M;
  return (
    <div
      className="rounded-lg p-3"
      style={{ backgroundColor: 'rgba(255,255,255,0.02)', border: '1px solid rgba(66,71,83,0.15)' }}
    >
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm font-bold text-[#e2e2eb]">
          <span style={{ color: '#8c909f' }}>#{task.number}</span> {task.title}
        </p>
        <span
          className="flex-shrink-0 rounded px-1.5 py-0.5 text-[10px] font-bold"
          title={`Complexity ${task.complexity}`}
          style={{ backgroundColor: 'rgba(255,255,255,0.04)', color: complexityMeta.color }}
        >
          {complexityMeta.label}
        </span>
      </div>
      {task.summary ? (
        <p className="mt-1.5 text-xs leading-relaxed" style={{ color: '#c2c6d6' }}>
          {task.summary}
        </p>
      ) : null}
      {(task.depends_on.length > 0 || task.citations.length > 0 || task.issue_url) && (
        <div className="mt-2 flex flex-wrap items-center gap-1.5">
          {task.issue_url ? (
            <a
              href={task.issue_url}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-bold transition-colors hover:bg-[rgba(168,230,176,0.2)]"
              style={{ backgroundColor: 'rgba(168,230,176,0.1)', color: '#a8e6b0' }}
              title="Open the exported GitHub issue"
            >
              <span className="material-symbols-outlined" style={{ fontSize: 12 }}>open_in_new</span>
              {task.issue_number != null ? `issue #${task.issue_number}` : 'GitHub issue'}
            </a>
          ) : null}
          {task.depends_on.map((number) => (
            <span
              key={`dep-${number}`}
              className="rounded px-1.5 py-0.5 text-[10px] font-bold"
              style={{ backgroundColor: 'rgba(255,255,255,0.04)', color: '#8c909f' }}
            >
              after #{number}
            </span>
          ))}
          {task.citations.map((ref) => (
            <button
              key={`cite-${ref}`}
              type="button"
              className="rounded px-1.5 py-0.5 text-[10px] font-bold transition-colors hover:bg-[rgba(175,198,255,0.25)]"
              style={{ backgroundColor: 'rgba(175,198,255,0.12)', color: '#afc6ff' }}
              onClick={() => onFocusEvidence(ref)}
              title={`Jump to evidence [${ref}]`}
            >
              [{ref}]
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function EvidenceCard({
  item,
  highlighted,
}: {
  item: SpecEvidenceItem;
  highlighted: boolean;
}) {
  return (
    <div
      id={`evidence-${item.ref}`}
      className="rounded-lg p-3 transition-colors"
      style={{
        backgroundColor: highlighted ? 'rgba(175,198,255,0.08)' : 'rgba(255,255,255,0.02)',
        border: highlighted ? '1px solid rgba(175,198,255,0.4)' : '1px solid rgba(66,71,83,0.15)',
      }}
    >
      <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider" style={{ color: '#8c909f' }}>
        <span style={{ color: '#afc6ff' }}>[{item.ref}]</span>
        <span>{item.source_label}</span>
        <span className="font-medium normal-case tracking-normal">{item.signal_kind_label}</span>
        {item.sentiment ? (
          <span
            className="rounded px-1 py-0.5 font-medium normal-case tracking-normal"
            style={{
              color: item.sentiment === 'negative' ? '#ffb4ab' : item.sentiment === 'positive' ? '#a8e6b0' : '#8c909f',
              backgroundColor: 'rgba(255,255,255,0.04)',
            }}
          >
            {item.sentiment}
          </span>
        ) : null}
      </div>
      <p className="mt-2 text-xs leading-relaxed" style={{ color: '#c2c6d6' }}>
        {item.excerpt}
      </p>
      <div className="mt-2 flex items-center justify-between text-[10px]" style={{ color: '#5A5C66' }}>
        <span>
          {item.author_or_speaker ? `${item.author_or_speaker} · ` : ''}
          {new Date(item.occurred_at).toLocaleDateString()}
        </span>
        {item.link ? (
          <Link
            href={item.link.href}
            target={item.link.kind === 'external' ? '_blank' : undefined}
            className="font-bold hover:underline"
            style={{ color: '#afc6ff' }}
          >
            {item.link.label}
          </Link>
        ) : null}
      </div>
    </div>
  );
}

export default function SpecDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { token } = useAuth();
  const { showToast } = useToast();
  const { spec, loading, error, refetch, updateSpec, regenerate, generateTasks } = useSpec(params?.id ?? null);

  const [savingSection, setSavingSection] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState('');
  const [focusedRef, setFocusedRef] = useState<number | null>(null);
  const [generatingTasks, setGeneratingTasks] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [githubOpen, setGithubOpen] = useState(false);

  if (loading) {
    return (
      <div className="flex-1 overflow-y-auto" style={{ backgroundColor: '#111319' }}>
        <div className="mx-auto max-w-6xl px-12 pt-10">
          <p className="text-sm" style={{ color: '#8c909f' }}>Loading spec...</p>
        </div>
      </div>
    );
  }

  if (error || !spec) {
    return (
      <div className="flex-1 overflow-y-auto" style={{ backgroundColor: '#111319' }}>
        <div className="mx-auto max-w-6xl px-12 pt-10">
          <p className="text-sm" style={{ color: '#ffb4ab' }}>{error ?? 'Spec not found'}</p>
        </div>
      </div>
    );
  }

  const statusMeta = SPEC_STATUS_META[spec.status];
  const allowedNext = SPEC_ALLOWED_TRANSITIONS[spec.status] ?? [];
  const canRegenerate =
    SPEC_REGENERATABLE_STATUSES.includes(spec.status) && spec.theme_id != null;
  const tasksReady = SPEC_TASK_READY_STATUSES.includes(spec.status);
  const canExport = spec.generation_status === 'ready';

  async function handleStatusChange(next: SpecStatus) {
    try {
      await updateSpec({ status: next });
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to update status', 'error');
    }
  }

  async function handleSaveSection(key: string, content: string) {
    setSavingSection(true);
    try {
      await updateSpec({ sections: [{ key, content }] });
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to save section', 'error');
      throw err;
    } finally {
      setSavingSection(false);
    }
  }

  async function handleSaveTitle() {
    if (!titleDraft.trim()) return;
    try {
      await updateSpec({ title: titleDraft.trim() });
      setEditingTitle(false);
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to rename spec', 'error');
    }
  }

  async function handleRegenerate() {
    if (!window.confirm('Regenerate this spec? The AI will rewrite every section from current evidence, replacing your edits.')) {
      return;
    }
    setRegenerating(true);
    try {
      const updated = await regenerate();
      if (updated.generation_status === 'error') {
        showToast('Generation failed — try again.', 'error');
      }
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to regenerate spec', 'error');
    } finally {
      setRegenerating(false);
    }
  }

  async function handleDelete() {
    if (!window.confirm('Delete this spec? The theme and its evidence are not affected.')) return;
    if (!token) return;
    try {
      await api.deleteSpec(token, spec!.id);
      router.push('/specs');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to delete spec', 'error');
    }
  }

  function focusEvidence(ref: number) {
    setFocusedRef(ref);
    document.getElementById(`evidence-${ref}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  async function handleGenerateTasks() {
    if (
      spec!.tasks.length > 0 &&
      !window.confirm('Regenerate the task breakdown? The AI will replace the current tasks.')
    ) {
      return;
    }
    setGeneratingTasks(true);
    try {
      await generateTasks();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Task breakdown failed — try again.', 'error');
    } finally {
      setGeneratingTasks(false);
    }
  }

  async function handleCopyExport() {
    if (!token) return;
    setExporting(true);
    try {
      const bundle = await api.getSpecExport(token, spec!.id);
      await navigator.clipboard.writeText(bundle);
      showToast('Agent-ready bundle copied to clipboard', 'success');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to copy export', 'error');
    } finally {
      setExporting(false);
    }
  }

  async function handleDownloadExport() {
    if (!token) return;
    setExporting(true);
    try {
      const bundle = await api.getSpecExport(token, spec!.id);
      const blob = new Blob([bundle], { type: 'text/markdown' });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = `${spec!.title.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}.md`;
      anchor.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to download export', 'error');
    } finally {
      setExporting(false);
    }
  }

  return (
    <div className="flex-1 overflow-y-auto" style={{ backgroundColor: '#111319' }}>
      <div className="mx-auto max-w-6xl space-y-6 px-12 pb-16 pt-10">
        {/* ── Header ── */}
        <section className="space-y-3">
          <Link
            href="/specs"
            className="inline-flex items-center gap-1 text-xs font-bold hover:underline"
            style={{ color: '#8c909f' }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: 14 }}>
              arrow_back
            </span>
            All specs
          </Link>

          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div className="min-w-0 space-y-1">
              {editingTitle ? (
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={titleDraft}
                    onChange={(event) => setTitleDraft(event.target.value)}
                    className="w-96 rounded bg-transparent px-3 py-1.5 text-lg font-bold text-[#e2e2eb] outline-none"
                    style={{ border: '1px solid #2A2C38' }}
                  />
                  <button
                    type="button"
                    className="rounded px-3 py-1.5 text-xs font-bold"
                    style={{ backgroundColor: '#afc6ff', color: '#002d6c' }}
                    onClick={() => {
                      void handleSaveTitle();
                    }}
                  >
                    Save
                  </button>
                  <button
                    type="button"
                    className="text-xs font-bold"
                    style={{ color: '#8c909f' }}
                    onClick={() => setEditingTitle(false)}
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <h1
                  className="cursor-pointer text-2xl font-bold tracking-tight text-[#e2e2eb] hover:text-[#afc6ff]"
                  title="Click to rename"
                  onClick={() => {
                    setTitleDraft(spec.title);
                    setEditingTitle(true);
                  }}
                >
                  {spec.title}
                </h1>
              )}
              <p className="text-xs" style={{ color: '#8c909f' }}>
                From theme: {spec.theme_name_snapshot}
                {spec.theme_id ? '' : ' (theme no longer exists)'}
                {spec.impact_score_snapshot != null && ` · Impact ${spec.impact_score_snapshot.toFixed(1)} at generation`}
                {` · ${spec.is_edited ? 'Edited by you' : 'AI draft — review before sharing'}`}
              </p>
            </div>

            <div className="flex flex-shrink-0 flex-wrap items-center gap-2">
              <span
                className="rounded px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider"
                style={{ backgroundColor: statusMeta.bg, color: statusMeta.color }}
              >
                {statusMeta.label}
              </span>
              {allowedNext.map((next) => (
                <button
                  key={next}
                  type="button"
                  className="rounded px-2.5 py-1 text-[11px] font-bold transition-colors hover:bg-white/[0.08]"
                  style={{ border: '1px solid rgba(66,71,83,0.3)', color: '#c2c6d6' }}
                  onClick={() => {
                    void handleStatusChange(next);
                  }}
                >
                  → {SPEC_STATUS_META[next].label}
                </button>
              ))}
              {canRegenerate ? (
                <button
                  type="button"
                  disabled={regenerating}
                  className="flex items-center gap-1 rounded px-2.5 py-1 text-[11px] font-bold transition-colors hover:bg-white/[0.08] disabled:opacity-50"
                  style={{ border: '1px solid rgba(66,71,83,0.3)', color: '#c2c6d6' }}
                  onClick={() => {
                    void handleRegenerate();
                  }}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: 13 }}>
                    refresh
                  </span>
                  {regenerating ? 'Regenerating…' : 'Regenerate'}
                </button>
              ) : null}
              {canExport ? (
                <>
                  <button
                    type="button"
                    disabled={exporting}
                    className="flex items-center gap-1 rounded px-2.5 py-1 text-[11px] font-bold transition-colors hover:bg-white/[0.08] disabled:opacity-50"
                    style={{ border: '1px solid rgba(66,71,83,0.3)', color: '#c2c6d6' }}
                    title="Copy the brief + tasks + evidence as a markdown bundle for a coding agent"
                    onClick={() => {
                      void handleCopyExport();
                    }}
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: 13 }}>
                      content_copy
                    </span>
                    Copy for agent
                  </button>
                  <button
                    type="button"
                    disabled={exporting}
                    className="flex items-center gap-1 rounded px-2.5 py-1 text-[11px] font-bold transition-colors hover:bg-white/[0.08] disabled:opacity-50"
                    style={{ border: '1px solid rgba(66,71,83,0.3)', color: '#c2c6d6' }}
                    title="Download the markdown bundle"
                    onClick={() => {
                      void handleDownloadExport();
                    }}
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: 13 }}>
                      download
                    </span>
                    .md
                  </button>
                </>
              ) : null}
              <button
                type="button"
                className="flex items-center gap-1 rounded px-2.5 py-1 text-[11px] font-bold transition-colors hover:bg-[#ffb4ab]/[0.08]"
                style={{ border: '1px solid rgba(255,180,171,0.2)', color: '#ffb4ab' }}
                onClick={() => {
                  void handleDelete();
                }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: 13 }}>
                  delete
                </span>
                Delete
              </button>
            </div>
          </div>
        </section>

        {spec.generation_status === 'error' ? (
          <section
            className="rounded-xl p-5"
            style={{ backgroundColor: 'rgba(255,180,171,0.06)', border: '1px solid rgba(255,180,171,0.25)' }}
          >
            <p className="text-sm font-bold" style={{ color: '#ffb4ab' }}>
              Generation failed
            </p>
            <p className="mt-1 text-xs" style={{ color: '#c2c6d6' }}>
              {spec.generation_error ?? 'The AI could not produce a brief from this theme.'}
            </p>
            {canRegenerate ? (
              <button
                type="button"
                disabled={regenerating}
                className="mt-3 rounded px-4 py-2 text-xs font-bold disabled:opacity-50"
                style={{ backgroundColor: '#afc6ff', color: '#002d6c' }}
                onClick={() => {
                  void handleRegenerate();
                }}
              >
                {regenerating ? 'Retrying…' : 'Retry generation'}
              </button>
            ) : null}
          </section>
        ) : null}

        {/* ── Split pane: sections left, evidence right ── */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
          <div className="space-y-4 lg:col-span-3">
            {spec.sections.map((section) => (
              <SectionCard
                key={section.key}
                section={section}
                saving={savingSection}
                onSave={handleSaveSection}
                onFocusEvidence={focusEvidence}
              />
            ))}

            {/* ── Task breakdown (v1.0 Full Loop) ── */}
            {spec.generation_status === 'ready' ? (
              <section className="rounded-xl p-5" style={CARD_STYLE}>
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h2 className="text-sm font-bold text-[#e2e2eb]">
                      Task Breakdown{spec.tasks.length > 0 ? ` (${spec.tasks.length})` : ''}
                    </h2>
                    <p className="mt-0.5 text-[10px]" style={{ color: '#5A5C66' }}>
                      {spec.tasks.length > 0
                        ? 'AI plan draft — hand it to a coding agent with Copy for agent.'
                        : tasksReady
                          ? 'Break the approved brief into atomic, agent-ready tasks.'
                          : 'Available once the spec is approved.'}
                    </p>
                  </div>
                  <div className="flex flex-shrink-0 items-center gap-2">
                    {spec.tasks.length > 0 ? (
                      <button
                        type="button"
                        className="flex items-center gap-1 rounded px-3 py-1.5 text-xs font-bold transition-colors hover:bg-white/[0.08]"
                        style={{ border: '1px solid rgba(66,71,83,0.3)', color: '#c2c6d6' }}
                        title="Create one GitHub issue per task (token used once, never stored)"
                        onClick={() => setGithubOpen(true)}
                      >
                        <span className="material-symbols-outlined" style={{ fontSize: 14 }}>
                          upload
                        </span>
                        GitHub Issues
                      </button>
                    ) : null}
                    {tasksReady ? (
                      <button
                        type="button"
                        disabled={generatingTasks}
                        className="flex items-center gap-1 rounded px-3 py-1.5 text-xs font-bold disabled:opacity-50"
                        style={{ backgroundColor: '#afc6ff', color: '#002d6c' }}
                        onClick={() => {
                          void handleGenerateTasks();
                        }}
                      >
                        <span className="material-symbols-outlined" style={{ fontSize: 14 }}>
                          {spec.tasks.length > 0 ? 'refresh' : 'account_tree'}
                        </span>
                        {generatingTasks
                          ? 'Breaking down…'
                          : spec.tasks.length > 0
                            ? 'Regenerate tasks'
                            : 'Break into tasks'}
                      </button>
                    ) : null}
                  </div>
                </div>
                {spec.tasks.length > 0 ? (
                  <div className="mt-3 space-y-2">
                    {spec.tasks.map((task) => (
                      <TaskCard key={task.number} task={task} onFocusEvidence={focusEvidence} />
                    ))}
                  </div>
                ) : null}
              </section>
            ) : null}
          </div>

          <div className="lg:col-span-2">
            <div className="space-y-3 lg:sticky lg:top-6">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-bold text-[#e2e2eb]">
                  Evidence ({spec.evidence.length})
                </h2>
                <span className="text-[10px]" style={{ color: '#5A5C66' }}>
                  Snapshot taken at generation
                </span>
              </div>
              {spec.evidence.some((item) => item.source_type === 'analytics') ? (
                <p className="text-[10px] italic" style={{ color: '#8c909f' }}>
                  Analytics items show usage that correlates with this theme — supporting evidence, not proven impact.
                </p>
              ) : null}
              <div className="max-h-[70vh] space-y-2 overflow-y-auto pr-1">
                {spec.evidence.map((item) => (
                  <EvidenceCard key={item.ref} item={item} highlighted={focusedRef === item.ref} />
                ))}
              </div>
            </div>
          </div>
        </div>
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
            void refetch();
          }}
        />
      ) : null}
    </div>
  );
}
