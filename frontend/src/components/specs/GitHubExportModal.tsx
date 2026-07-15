'use client';

/**
 * GitHub Issues export modal (v1.1 delivery integration, D-11-03).
 *
 * One-way: creates one issue per task in the spec's breakdown. The token is
 * request-scoped on the server — used for the export calls, never stored,
 * logged, or echoed back — and this component never keeps it after submit.
 */

import React, { useState } from 'react';

import { api, GitHubExportResponse } from '@/lib/api';

export function GitHubExportModal({
  specId,
  specTitle,
  token,
  onClose,
  onExported,
}: {
  specId: string;
  specTitle: string;
  token: string;
  onClose: () => void;
  onExported: (result: GitHubExportResponse) => void;
}) {
  const [repo, setRepo] = useState('');
  const [githubToken, setGithubToken] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    if (!repo.trim() || !githubToken.trim() || submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      const result = await api.exportSpecTasksToGitHub(
        token,
        specId,
        repo.trim(),
        githubToken.trim(),
      );
      setGithubToken('');
      onExported(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Export failed');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-6"
      style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-md space-y-4 rounded-xl p-6"
        style={{ backgroundColor: '#191b22', border: '1px solid rgba(66,71,83,0.3)' }}
        onClick={e => e.stopPropagation()}
      >
        <div>
          <h2 className="text-sm font-bold text-[#e2e2eb]">Export tasks to GitHub Issues</h2>
          <p className="mt-1 text-xs" style={{ color: '#8c909f' }}>
            Creates one issue per task from “{specTitle}”. Tasks that already have an issue are
            skipped, so re-running only fills gaps.
          </p>
        </div>

        <label className="block space-y-1">
          <span className="text-[11px] font-bold uppercase tracking-wider" style={{ color: '#8c909f' }}>
            Repository
          </span>
          <input
            type="text"
            value={repo}
            onChange={e => setRepo(e.target.value)}
            placeholder="owner/name"
            className="w-full rounded px-3 py-2 text-sm text-[#e2e2eb] outline-none"
            style={{ backgroundColor: '#111319', border: '1px solid rgba(66,71,83,0.3)' }}
          />
        </label>

        <label className="block space-y-1">
          <span className="text-[11px] font-bold uppercase tracking-wider" style={{ color: '#8c909f' }}>
            GitHub token
          </span>
          <input
            type="password"
            value={githubToken}
            onChange={e => setGithubToken(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') void submit(); }}
            placeholder="ghp_… (needs issues: write on the repo)"
            className="w-full rounded px-3 py-2 text-sm text-[#e2e2eb] outline-none"
            style={{ backgroundColor: '#111319', border: '1px solid rgba(66,71,83,0.3)' }}
            autoComplete="off"
          />
        </label>

        <p className="text-[11px]" style={{ color: '#8c909f' }}>
          Your token is used for this export only and never stored.
        </p>

        {error && <p className="text-xs" style={{ color: '#ffb4ab' }}>{error}</p>}

        <div className="flex items-center justify-end gap-3 pt-1">
          <button
            type="button"
            className="px-3 py-2 text-xs font-bold"
            style={{ color: '#8c909f' }}
            onClick={onClose}
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={submitting || !repo.trim() || !githubToken.trim()}
            className="rounded px-4 py-2 text-xs font-bold disabled:opacity-50"
            style={{ backgroundColor: '#afc6ff', color: '#002d6c' }}
            onClick={() => void submit()}
          >
            {submitting ? 'Creating issues…' : 'Create Issues'}
          </button>
        </div>
      </div>
    </div>
  );
}
