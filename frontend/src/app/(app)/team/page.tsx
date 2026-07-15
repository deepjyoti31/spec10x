'use client';

/**
 * Team — real workspace membership (v1.1 multi-user, PRD-11-01).
 *
 * Members join the owner's existing workspace (D-11-01): inviting someone
 * shares the workspace's evidence, themes, specs, tasks, and outcomes.
 * Invites require an explicit accept (D-11-02). Owner/member only; deeper
 * roles and audit logs stay honestly "Coming Soon".
 */

import React, { useCallback, useEffect, useState } from 'react';

import { useAuth } from '@/hooks/useAuth';
import {
  api,
  ApiError,
  WorkspaceInviteResponse,
  WorkspaceMemberResponse,
  WorkspaceResponse,
} from '@/lib/api';

const CARD_STYLE: React.CSSProperties = {
  backgroundColor: '#191b22',
  border: '1px solid rgba(66,71,83,0.1)',
};

const AVATAR_COLORS = [
  { bg: '#354873', fg: '#b2c6f8' },
  { bg: '#2e5245', fg: '#a8e6b0' },
  { bg: '#5a4a2e', fg: '#ffd8a8' },
  { bg: '#53303c', fg: '#ffb4c0' },
  { bg: '#33343b', fg: '#8c909f' },
];

function initialsOf(name: string, email: string): string {
  const source = name.trim() || email;
  const parts = source.split(/[\s._@-]+/).filter(Boolean);
  return ((parts[0]?.[0] ?? '?') + (parts[1]?.[0] ?? '')).toUpperCase();
}

function StatCard({ label, value, sub }: { label: string; value: string | number; sub: string }) {
  return (
    <div className="rounded-xl p-5" style={{ backgroundColor: '#1e1f26', border: '1px solid rgba(66,71,83,0.05)' }}>
      <p className="mb-1 text-xs font-medium uppercase tracking-wider" style={{ color: '#8c909f' }}>
        {label}
      </p>
      <div className="flex items-baseline gap-2">
        <span className="text-3xl font-bold text-[#e2e2eb]">{value}</span>
        <span className="text-xs" style={{ color: '#8c909f' }}>{sub}</span>
      </div>
    </div>
  );
}

function MemberRow({
  member,
  index,
  isLast,
  canManage,
  busy,
  onRemove,
}: {
  member: WorkspaceMemberResponse;
  index: number;
  isLast: boolean;
  canManage: boolean;
  busy: boolean;
  onRemove: (member: WorkspaceMemberResponse) => void;
}) {
  const avatar = AVATAR_COLORS[index % AVATAR_COLORS.length];
  const isActive = member.status === 'active';
  const removable =
    member.role !== 'owner' && (canManage || member.is_you);
  const removeLabel = member.is_you && member.role !== 'owner'
    ? 'Leave'
    : isActive ? 'Remove' : 'Revoke';

  return (
    <tr
      className="text-sm transition-colors"
      style={{ borderBottom: isLast ? 'none' : '1px solid rgba(66,71,83,0.05)' }}
    >
      <td className="px-6 py-4">
        <div className="flex items-center gap-3">
          <div
            className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full text-xs font-bold"
            style={{ backgroundColor: avatar.bg, color: avatar.fg }}
          >
            {initialsOf(member.name, member.email)}
          </div>
          <div className="flex flex-col">
            <span className="flex items-center gap-1 font-semibold text-[#e2e2eb]">
              {member.name}
              {member.is_you && (
                <span
                  className="ml-1 rounded px-1.5 py-0.5 text-[10px] font-bold"
                  style={{ backgroundColor: 'rgba(175,198,255,0.1)', color: '#afc6ff' }}
                >
                  YOU
                </span>
              )}
            </span>
            <span className="text-xs" style={{ color: '#8c909f' }}>{member.email}</span>
          </div>
        </div>
      </td>
      <td className="px-6 py-4 capitalize" style={{ color: '#8c909f' }}>{member.role}</td>
      <td className="px-6 py-4">
        {isActive ? (
          <div className="flex items-center gap-1.5 text-emerald-400">
            <span className="h-1.5 w-1.5 flex-shrink-0 rounded-full bg-emerald-400" />
            <span className="text-xs font-medium">Active</span>
          </div>
        ) : (
          <div className="flex items-center gap-1.5" style={{ color: '#ffd8a8' }}>
            <span className="material-symbols-outlined" style={{ fontSize: 14 }}>mail</span>
            <span className="text-xs font-medium">Invited</span>
          </div>
        )}
      </td>
      <td className="px-6 py-4 text-xs" style={{ color: '#8c909f' }}>
        {member.joined_at ? new Date(member.joined_at).toLocaleDateString() : '—'}
      </td>
      <td className="px-6 py-4 text-right">
        {removable && (
          <button
            className="text-xs font-bold transition-colors disabled:opacity-50"
            style={{ color: '#8c909f' }}
            disabled={busy}
            onClick={() => onRemove(member)}
            onMouseEnter={e => (e.currentTarget.style.color = '#ffb4ab')}
            onMouseLeave={e => (e.currentTarget.style.color = '#8c909f')}
          >
            {removeLabel}
          </button>
        )}
      </td>
    </tr>
  );
}

function ComingSoonCard({
  icon,
  title,
  description,
}: {
  icon: string;
  title: string;
  description: string;
}) {
  return (
    <div
      className="flex flex-col items-center justify-center space-y-4 rounded-2xl p-8 text-center"
      style={CARD_STYLE}
    >
      <div className="flex h-12 w-12 items-center justify-center rounded-xl" style={{ backgroundColor: '#33343b' }}>
        <span className="material-symbols-outlined" style={{ fontSize: 28, color: 'rgba(140,144,159,0.5)' }}>
          {icon}
        </span>
      </div>
      <div>
        <h3 className="text-lg font-bold text-[#e2e2eb]">{title}</h3>
        <p className="mt-1 text-sm" style={{ color: '#8c909f' }}>{description}</p>
      </div>
      <span
        className="rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-widest"
        style={{ backgroundColor: 'rgba(175,198,255,0.1)', color: '#afc6ff' }}
      >
        Coming Soon
      </span>
    </div>
  );
}

export default function TeamPage() {
  const { token, loading: authLoading } = useAuth();
  const [workspace, setWorkspace] = useState<WorkspaceResponse | null>(null);
  const [myInvites, setMyInvites] = useState<WorkspaceInviteResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteError, setInviteError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (authLoading) return;
    if (!token) {
      setLoading(false);
      return;
    }
    setError(null);
    try {
      const [ws, invites] = await Promise.all([
        api.getWorkspace(token),
        api.getMyWorkspaceInvites(token),
      ]);
      setWorkspace(ws);
      setMyInvites(invites);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load workspace');
    } finally {
      setLoading(false);
    }
  }, [authLoading, token]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const withBusy = useCallback(
    async (action: () => Promise<unknown>) => {
      if (!token) return;
      setBusy(true);
      setError(null);
      try {
        await action();
        await refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Action failed');
      } finally {
        setBusy(false);
      }
    },
    [token, refresh],
  );

  const submitInvite = useCallback(async () => {
    if (!token) return;
    const email = inviteEmail.trim();
    if (!email) return;
    setBusy(true);
    setInviteError(null);
    try {
      await api.inviteWorkspaceMember(token, email);
      setInviteEmail('');
      setInviteOpen(false);
      await refresh();
    } catch (err) {
      if (err instanceof ApiError) {
        setInviteError(err.message);
      } else {
        setInviteError('Failed to send invite');
      }
    } finally {
      setBusy(false);
    }
  }, [token, inviteEmail, refresh]);

  const removeMember = useCallback(
    (member: WorkspaceMemberResponse) => {
      const verb = member.is_you ? 'Leave this workspace' : `Remove ${member.email}`;
      if (!window.confirm(`${verb}? They keep their own personal workspace; nothing shared is deleted.`)) {
        return;
      }
      void withBusy(() => api.removeWorkspaceMember(token as string, member.id));
    },
    [token, withBusy],
  );

  const isOwner = workspace?.my_role === 'owner';
  const activeMembers = workspace?.members.filter(m => m.status === 'active') ?? [];
  const pendingMembers = workspace?.members.filter(m => m.status === 'invited') ?? [];
  const switchable = (workspace?.workspaces ?? []).length > 1;

  return (
    <div className="flex-1 overflow-y-auto" style={{ backgroundColor: '#111319' }}>
      <div className="mx-auto max-w-6xl space-y-10 px-12 pb-16 pt-10">

        {/* ── Header ── */}
        <section className="flex flex-col justify-between gap-6 md:flex-row md:items-end">
          <div className="space-y-1">
            <h1 className="text-2xl font-bold tracking-tight text-[#e2e2eb]">Team</h1>
            <p className="text-sm" style={{ color: '#c2c6d6' }}>
              {workspace ? `${workspace.name} — ` : ''}everyone here shares this workspace&apos;s
              evidence, themes, specs, and outcomes.
            </p>
          </div>
          <div className="flex flex-shrink-0 items-center gap-3">
            {switchable && workspace && (
              <select
                aria-label="Switch workspace"
                className="rounded px-3 py-2 text-xs font-bold"
                style={{ backgroundColor: '#1e1f26', color: '#e2e2eb', border: '1px solid rgba(66,71,83,0.2)' }}
                value={workspace.id}
                disabled={busy}
                onChange={e => {
                  const option = workspace.workspaces.find(w => w.id === e.target.value);
                  if (!option || option.is_active) return;
                  void withBusy(() =>
                    api.switchWorkspace(token as string, option.is_personal ? null : option.id),
                  );
                }}
              >
                {workspace.workspaces.map(option => (
                  <option key={option.id} value={option.id}>
                    {option.is_personal ? `${option.name} (personal)` : option.name}
                  </option>
                ))}
              </select>
            )}
            {isOwner && (
              <button
                className="inline-flex items-center gap-2 rounded px-4 py-2 text-xs font-bold transition-all disabled:opacity-50"
                style={{ backgroundColor: '#afc6ff', color: '#002d6c' }}
                disabled={busy}
                onClick={() => { setInviteOpen(open => !open); setInviteError(null); }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: 16 }}>person_add</span>
                Invite Member
              </button>
            )}
          </div>
        </section>

        {error && (
          <p className="text-sm" style={{ color: '#ffb4ab' }}>{error}</p>
        )}

        {/* ── Invite form ── */}
        {inviteOpen && isOwner && (
          <section className="space-y-3 rounded-xl px-6 py-5" style={CARD_STYLE}>
            <p className="text-sm font-semibold text-[#e2e2eb]">Invite by email</p>
            <p className="text-xs" style={{ color: '#8c909f' }}>
              They&apos;ll see the invite on their own Team page after signing in with this email, and
              join only when they accept. Joining shares this workspace&apos;s evidence, specs, and
              outcomes with them.
            </p>
            <div className="flex items-center gap-3">
              <input
                type="email"
                value={inviteEmail}
                onChange={e => setInviteEmail(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') void submitInvite(); }}
                placeholder="teammate@example.com"
                className="flex-1 rounded px-3 py-2 text-sm text-[#e2e2eb] outline-none"
                style={{ backgroundColor: '#111319', border: '1px solid rgba(66,71,83,0.3)' }}
              />
              <button
                className="rounded px-4 py-2 text-xs font-bold transition-all disabled:opacity-50"
                style={{ backgroundColor: '#afc6ff', color: '#002d6c' }}
                disabled={busy || !inviteEmail.trim()}
                onClick={() => void submitInvite()}
              >
                Send Invite
              </button>
            </div>
            {inviteError && (
              <p className="text-xs" style={{ color: '#ffb4ab' }}>{inviteError}</p>
            )}
          </section>
        )}

        {/* ── Invitations addressed to me ── */}
        {myInvites.length > 0 && (
          <section className="space-y-4">
            <h2 className="flex items-center gap-2 text-sm font-semibold" style={{ color: '#c2c6d6' }}>
              <span className="material-symbols-outlined" style={{ fontSize: 16 }}>forward_to_inbox</span>
              Invitations for you
            </h2>
            {myInvites.map(invite => (
              <div
                key={invite.id}
                className="flex items-center justify-between rounded-xl px-6 py-4"
                style={CARD_STYLE}
              >
                <div className="flex flex-col">
                  <span className="text-sm font-semibold text-[#e2e2eb]">{invite.workspace_name}</span>
                  <span className="text-xs" style={{ color: '#8c909f' }}>
                    {invite.owner_name || invite.owner_email} invited you
                    {' · '}
                    {new Date(invite.invited_at).toLocaleDateString()}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    className="px-3 py-1.5 text-xs font-bold transition-colors disabled:opacity-50"
                    style={{ color: '#8c909f' }}
                    disabled={busy}
                    onClick={() => void withBusy(() => api.declineWorkspaceInvite(token as string, invite.id))}
                  >
                    Decline
                  </button>
                  <button
                    className="rounded px-4 py-2 text-xs font-bold transition-all disabled:opacity-50"
                    style={{ backgroundColor: '#afc6ff', color: '#002d6c' }}
                    disabled={busy}
                    onClick={() => void withBusy(() => api.acceptWorkspaceInvite(token as string, invite.id))}
                  >
                    Accept &amp; Join
                  </button>
                </div>
              </div>
            ))}
          </section>
        )}

        {loading ? (
          <p className="text-sm" style={{ color: '#8c909f' }}>Loading workspace...</p>
        ) : workspace ? (
          <>
            {/* ── Stat cards ── */}
            <section className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <StatCard label="Active Members" value={activeMembers.length} sub="in this workspace" />
              <StatCard label="Pending Invites" value={pendingMembers.length} sub="awaiting accept" />
              <StatCard label="Your Role" value={workspace.my_role === 'owner' ? 'Owner' : 'Member'} sub={workspace.owner_email} />
            </section>

            {/* ── Member list ── */}
            <section className="space-y-4">
              <h2 className="flex items-center gap-2 text-sm font-semibold" style={{ color: '#c2c6d6' }}>
                <span className="material-symbols-outlined" style={{ fontSize: 16 }}>list</span>
                Workspace Members
              </h2>
              <div className="overflow-hidden rounded-xl" style={CARD_STYLE}>
                <table className="w-full border-collapse text-left">
                  <thead>
                    <tr
                      className="text-[11px] font-bold uppercase tracking-widest"
                      style={{ color: '#8c909f', borderBottom: '1px solid rgba(66,71,83,0.1)' }}
                    >
                      {['Member', 'Role', 'Status', 'Joined', ''].map((heading, i) => (
                        <th key={i} className="px-6 py-4" style={{ textAlign: i === 4 ? 'right' : 'left' }}>
                          {heading}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {workspace.members.map((member, i) => (
                      <MemberRow
                        key={member.id}
                        member={member}
                        index={i}
                        isLast={i === workspace.members.length - 1}
                        canManage={isOwner}
                        busy={busy}
                        onRemove={removeMember}
                      />
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          </>
        ) : null}

        {/* ── Coming soon ── */}
        <section className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <ComingSoonCard
            icon="lock_person"
            title="Roles & Permissions"
            description="Granular access control beyond owner and member."
          />
          <ComingSoonCard
            icon="history"
            title="Activity Log"
            description="Audit trail of member actions and system events."
          />
        </section>
      </div>
    </div>
  );
}
