'use client';

import React from 'react';

// ---------------------------------------------------------------------------
// Static demo data
// ---------------------------------------------------------------------------

const MEMBERS = [
    {
        initials: 'DJ',
        avatarBg: '#354873',
        avatarColor: '#b2c6f8',
        name: 'Deep Jyoti',
        isYou: true,
        email: 'deep@spec10x.ai',
        role: 'Owner',
        lastActive: 'Now',
    },
    {
        initials: 'AS',
        avatarBg: '#d87802',
        avatarColor: '#ffffff',
        name: 'Anya Sharma',
        isYou: false,
        email: 'anya.s@acme.com',
        role: 'Editor',
        lastActive: '2h ago',
    },
    {
        initials: 'MR',
        avatarBg: '#33343b',
        avatarColor: '#8c909f',
        name: 'Mike Rodriguez',
        isYou: false,
        email: 'mike.r@globex.io',
        role: 'Editor',
        lastActive: 'Yesterday',
    },
];

// ---------------------------------------------------------------------------
// Stat card
// ---------------------------------------------------------------------------

function StatCard({
    label,
    value,
    sub,
    proBadge,
    progress,
}: {
    label: string;
    value: string | number;
    sub: string;
    proBadge?: boolean;
    progress?: number;
}) {
    return (
        <div
            className="p-5 rounded-xl relative overflow-hidden"
            style={{ backgroundColor: '#1e1f26', border: '1px solid rgba(66,71,83,0.05)' }}
        >
            {proBadge && (
                <div className="absolute top-0 right-0 p-2">
                    <span
                        className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                        style={{ backgroundColor: 'rgba(79,140,255,0.1)', color: '#4F8CFF' }}
                    >
                        PRO
                    </span>
                </div>
            )}
            <p className="text-xs font-medium uppercase tracking-wider mb-1" style={{ color: '#8c909f' }}>
                {label}
            </p>
            <div className="flex items-baseline gap-2">
                <span className="text-3xl font-bold text-[#e2e2eb]">{value}</span>
                <span className="text-xs" style={{ color: '#8c909f' }}>{sub}</span>
            </div>
            {progress !== undefined && (
                <div
                    className="mt-3 w-full h-1 rounded-full overflow-hidden"
                    style={{ backgroundColor: '#33343b' }}
                >
                    <div
                        className="h-full rounded-full"
                        style={{ backgroundColor: '#4F8CFF', width: `${progress}%` }}
                    />
                </div>
            )}
        </div>
    );
}

// ---------------------------------------------------------------------------
// Member table row
// ---------------------------------------------------------------------------

function MemberRow({
    member,
    isLast,
}: {
    member: typeof MEMBERS[0];
    isLast: boolean;
}) {
    return (
        <tr
            className="text-sm transition-colors"
            style={{ borderBottom: isLast ? 'none' : '1px solid rgba(66,71,83,0.05)' }}
            onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#1e1f26')}
            onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}
        >
            {/* Member */}
            <td className="px-6 py-4">
                <div className="flex items-center gap-3">
                    <div
                        className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
                        style={{ backgroundColor: member.avatarBg, color: member.avatarColor }}
                    >
                        {member.initials}
                    </div>
                    <div className="flex flex-col">
                        <span className="font-semibold text-[#e2e2eb] flex items-center gap-1">
                            {member.name}
                            {member.isYou && (
                                <span
                                    className="text-[10px] font-bold px-1.5 py-0.5 rounded ml-1"
                                    style={{ backgroundColor: 'rgba(79,140,255,0.1)', color: '#4F8CFF' }}
                                >
                                    YOU
                                </span>
                            )}
                        </span>
                        <span className="text-xs" style={{ color: '#8c909f' }}>{member.email}</span>
                    </div>
                </div>
            </td>

            {/* Role */}
            <td className="px-6 py-4" style={{ color: '#8c909f' }}>{member.role}</td>

            {/* Status */}
            <td className="px-6 py-4">
                <div className="flex items-center gap-1.5 text-emerald-400">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 flex-shrink-0" />
                    <span className="text-xs font-medium">Active</span>
                </div>
            </td>

            {/* Last Active */}
            <td className="px-6 py-4 text-xs" style={{ color: '#8c909f' }}>{member.lastActive}</td>

            {/* Actions */}
            <td className="px-6 py-4 text-right">
                <button
                    className="transition-colors"
                    style={{ color: '#8c909f' }}
                    onMouseEnter={e => (e.currentTarget.style.color = 'white')}
                    onMouseLeave={e => (e.currentTarget.style.color = '#8c909f')}
                >
                    <span className="material-symbols-outlined" style={{ fontSize: 20 }}>more_horiz</span>
                </button>
            </td>
        </tr>
    );
}

// ---------------------------------------------------------------------------
// Coming soon card
// ---------------------------------------------------------------------------

function ComingSoonCard({
    icon,
    title,
    description,
    gradientColor,
}: {
    icon: string;
    title: string;
    description: string;
    gradientColor: string;
}) {
    return (
        <div
            className="group relative p-8 rounded-2xl flex flex-col items-center justify-center text-center space-y-4 overflow-hidden"
            style={{ backgroundColor: '#191b22', border: '1px solid rgba(66,71,83,0.1)' }}
        >
            {/* Hover gradient overlay */}
            <div
                className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"
                style={{ background: `linear-gradient(135deg, ${gradientColor} 0%, transparent 60%)` }}
            />

            <div
                className="w-12 h-12 rounded-xl flex items-center justify-center relative z-10"
                style={{ backgroundColor: '#33343b' }}
            >
                <span
                    className="material-symbols-outlined"
                    style={{ fontSize: 28, color: 'rgba(140,144,159,0.5)' }}
                >
                    {icon}
                </span>
            </div>

            <div className="relative z-10">
                <h3 className="text-lg font-bold text-[#e2e2eb]">{title}</h3>
                <p className="text-sm mt-1" style={{ color: '#8c909f' }}>{description}</p>
            </div>

            <span
                className="text-[10px] font-bold uppercase tracking-widest px-3 py-1 rounded-full relative z-10"
                style={{ backgroundColor: 'rgba(79,140,255,0.1)', color: '#4F8CFF' }}
            >
                Coming Soon
            </span>
        </div>
    );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function TeamPage() {
    return (
        <div className="flex-1 overflow-y-auto" style={{ backgroundColor: '#111319' }}>
            <div className="max-w-6xl mx-auto px-12 pt-10 pb-0 space-y-12">

                {/* ── Header ── */}
                <section className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                    <div className="space-y-1">
                        <h1 className="text-2xl font-bold tracking-tight text-[#e2e2eb]">Team</h1>
                        <p className="text-sm" style={{ color: '#c2c6d6' }}>
                            Manage workspace members and their access levels across projects.
                        </p>
                    </div>
                    <button
                        className="inline-flex items-center gap-2 px-6 py-2.5 rounded-lg font-semibold text-sm transition-all active:scale-95 flex-shrink-0"
                        style={{ backgroundColor: '#4F8CFF', color: '#002d6c' }}
                        onMouseEnter={e =>
                            (e.currentTarget.style.boxShadow = '0 0 20px rgba(175,198,255,0.2)')
                        }
                        onMouseLeave={e => (e.currentTarget.style.boxShadow = 'none')}
                    >
                        <span className="material-symbols-outlined" style={{ fontSize: 16 }}>person_add</span>
                        Invite Member
                    </button>
                </section>

                {/* ── Stat cards ── */}
                <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <StatCard label="Total Members" value={3}  sub="Active" />
                    <StatCard label="Admin"         value={1}  sub="Owner" />
                    <StatCard label="Editors"       value={2}  sub="Collaborators" />
                    <StatCard
                        label="Seat Limit"
                        value={5}
                        sub="Pro Plan"
                        proBadge
                        progress={60}
                    />
                </section>

                {/* ── Member list ── */}
                <section className="space-y-4">
                    <h2
                        className="text-sm font-semibold flex items-center gap-2"
                        style={{ color: '#c2c6d6' }}
                    >
                        <span className="material-symbols-outlined" style={{ fontSize: 16 }}>list</span>
                        Workspace Members
                    </h2>

                    <div
                        className="overflow-hidden rounded-xl"
                        style={{ backgroundColor: '#191b22', border: '1px solid rgba(66,71,83,0.1)' }}
                    >
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr
                                    className="text-[11px] font-bold uppercase tracking-widest"
                                    style={{
                                        color: '#8c909f',
                                        borderBottom: '1px solid rgba(66,71,83,0.1)',
                                    }}
                                >
                                    {['Member', 'Role', 'Status', 'Last Active', ''].map((h, i) => (
                                        <th
                                            key={i}
                                            className="px-6 py-4"
                                            style={{ textAlign: i === 4 ? 'right' : 'left' }}
                                        >
                                            {h}
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {MEMBERS.map((member, i) => (
                                    <MemberRow
                                        key={member.email}
                                        member={member}
                                        isLast={i === MEMBERS.length - 1}
                                    />
                                ))}
                            </tbody>
                        </table>
                    </div>
                </section>

                {/* ── Pending invites ── */}
                <section className="space-y-4">
                    <h2
                        className="text-sm font-semibold flex items-center gap-2"
                        style={{ color: '#c2c6d6' }}
                    >
                        <span className="material-symbols-outlined" style={{ fontSize: 16 }}>mail</span>
                        Pending Invites
                    </h2>

                    <div
                        className="rounded-xl px-6 py-4 flex items-center justify-between"
                        style={{ backgroundColor: '#191b22', border: '1px solid rgba(66,71,83,0.1)' }}
                    >
                        <div className="flex items-center gap-4">
                            <div
                                className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
                                style={{ backgroundColor: '#1e1f26', color: '#8c909f' }}
                            >
                                <span className="material-symbols-outlined" style={{ fontSize: 20 }}>
                                    alternate_email
                                </span>
                            </div>
                            <div className="flex flex-col">
                                <span className="text-sm font-semibold text-[#e2e2eb]">
                                    sarah.lee@acmecorp.com
                                </span>
                                <span className="text-xs" style={{ color: '#8c909f' }}>
                                    Invited 3 days ago as Editor
                                </span>
                            </div>
                        </div>

                        <div className="flex items-center gap-3">
                            <button
                                className="text-xs font-bold px-3 py-1.5 transition-colors"
                                style={{ color: '#8c909f' }}
                                onMouseEnter={e => (e.currentTarget.style.color = '#e2e2eb')}
                                onMouseLeave={e => (e.currentTarget.style.color = '#8c909f')}
                            >
                                Revoke
                            </button>
                            <button
                                className="text-xs font-bold px-4 py-1.5 rounded-md transition-all"
                                style={{
                                    color: '#4F8CFF',
                                    border: '1px solid rgba(79,140,255,0.2)',
                                    backgroundColor: 'rgba(79,140,255,0.05)',
                                }}
                                onMouseEnter={e =>
                                    (e.currentTarget.style.backgroundColor = 'rgba(79,140,255,0.1)')
                                }
                                onMouseLeave={e =>
                                    (e.currentTarget.style.backgroundColor = 'rgba(79,140,255,0.05)')
                                }
                            >
                                Resend
                            </button>
                        </div>
                    </div>
                </section>

                {/* ── Coming soon cards ── */}
                <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <ComingSoonCard
                        icon="lock_person"
                        title="Roles & Permissions"
                        description="Granular access control for enterprise workflows."
                        gradientColor="rgba(79,140,255,0.05)"
                    />
                    <ComingSoonCard
                        icon="history"
                        title="Activity Log"
                        description="Audit trail of member actions and system events."
                        gradientColor="rgba(178,198,248,0.05)"
                    />
                </section>

            </div>

            {/* ── Footer ── */}
            <footer className="py-8 px-12 flex justify-center">
                <div
                    className="inline-flex items-center gap-3 px-4 py-2 rounded-full"
                    style={{ backgroundColor: '#191b22', border: '1px solid rgba(66,71,83,0.05)' }}
                >
                    <div className="w-2 h-2 rounded-full bg-[#4F8CFF] animate-pulse" />
                    <p
                        className="text-[11px] font-medium uppercase tracking-wider"
                        style={{ color: '#8c909f' }}
                    >
                        Plan Status: Spec10x Pro — 3 of 5 seats used
                    </p>
                </div>
            </footer>
        </div>
    );
}
