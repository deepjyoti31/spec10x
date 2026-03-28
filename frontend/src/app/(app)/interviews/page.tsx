'use client';

import React, { useState } from 'react';

// ---------------------------------------------------------------------------
// Types & static demo data
// ---------------------------------------------------------------------------

type InterviewStatus = 'done' | 'processing' | 'error';
type FileIcon = 'description' | 'mic' | 'videocam';

interface Interview {
    id: number;
    icon: FileIcon;
    iconColor: string;
    title: string;
    syncedFrom?: string;
    participant: string;
    date: string;
    duration?: string;
    insights?: number;
    tags: string[];
    status: InterviewStatus;
    processingPct?: number;
}

const INTERVIEWS: Interview[] = [
    {
        id: 1,
        icon: 'description',
        iconColor: '#4F8CFF',
        title: 'Sarah Chen — Onboarding Deep Dive',
        participant: 'Stripe',
        date: 'Jan 15',
        duration: '42 min',
        insights: 7,
        tags: ['Onboarding', 'Search', 'Pricing'],
        status: 'done',
    },
    {
        id: 2,
        icon: 'mic',
        iconColor: '#8B8D97',
        title: 'Q4 Customer Feedback Report',
        syncedFrom: 'Fireflies',
        participant: 'Anonymous Participant',
        date: 'Jan 12',
        duration: '128 min',
        insights: 22,
        tags: ['Mobile', 'API'],
        status: 'done',
    },
    {
        id: 3,
        icon: 'videocam',
        iconColor: '#8B8D97',
        title: 'Product Review Call — Enterprise Tier',
        participant: 'John D. @ Enterprise Inc',
        date: 'Jan 10',
        duration: '18 min',
        insights: 4,
        tags: ['Performance', 'UX'],
        status: 'done',
    },
    {
        id: 4,
        icon: 'mic',
        iconColor: '#8B8D97',
        title: 'User Testing Session — Mobile App',
        syncedFrom: 'Fireflies',
        participant: '',
        date: 'Jan 8',
        duration: '55 min',
        insights: 12,
        tags: ['Mobile', 'Navigation'],
        status: 'done',
    },
    {
        id: 5,
        icon: 'description',
        iconColor: '#8B8D97',
        title: 'Guilherme — API Integration Feedback',
        participant: 'Developer @ Acme',
        date: 'Jan 5',
        duration: '28 min',
        insights: 9,
        tags: ['API', 'Documentation'],
        status: 'done',
    },
    {
        id: 6,
        icon: 'description',
        iconColor: '#5A5C66',
        title: 'Support Team Debrief — Q4 Escalations',
        participant: 'Internal',
        date: 'Jan 3',
        tags: [],
        status: 'processing',
        processingPct: 65,
    },
    {
        id: 7,
        icon: 'videocam',
        iconColor: '#F87171',
        title: 'Jake — Feature Request Interview',
        participant: 'PM @ CloudCo',
        date: 'Dec 28',
        tags: [],
        status: 'error',
    },
];

// ---------------------------------------------------------------------------
// Status badge
// ---------------------------------------------------------------------------

function StatusBadge({ status }: { status: InterviewStatus }) {
    if (status === 'done') {
        return (
            <div
                className="flex items-center gap-2 px-3 py-1 rounded-full"
                style={{
                    backgroundColor: 'rgba(52,211,153,0.1)',
                    border: '1px solid rgba(52,211,153,0.2)',
                }}
            >
                <div className="w-1.5 h-1.5 rounded-full bg-[#34D399]" />
                <span className="text-[11px] font-bold text-[#34D399] uppercase tracking-wider">Done</span>
            </div>
        );
    }
    if (status === 'processing') {
        return (
            <div
                className="flex items-center gap-2 px-3 py-1 rounded-full"
                style={{
                    backgroundColor: 'rgba(251,191,36,0.1)',
                    border: '1px solid rgba(251,191,36,0.2)',
                }}
            >
                <span className="material-symbols-outlined text-[#FBBF24]" style={{ fontSize: 14 }}>pending</span>
                <span className="text-[11px] font-bold text-[#FBBF24] uppercase tracking-wider">Processing</span>
            </div>
        );
    }
    return (
        <div
            className="flex items-center gap-2 px-3 py-1 rounded-full"
            style={{
                backgroundColor: 'rgba(248,113,113,0.1)',
                border: '1px solid rgba(248,113,113,0.2)',
            }}
        >
            <span className="material-symbols-outlined text-[#F87171]" style={{ fontSize: 14 }}>error</span>
            <span className="text-[11px] font-bold text-[#F87171] uppercase tracking-wider">Error</span>
        </div>
    );
}

// ---------------------------------------------------------------------------
// Interview row
// ---------------------------------------------------------------------------

function InterviewRow({
    interview,
    checked,
    onCheck,
}: {
    interview: Interview;
    checked: boolean;
    onCheck: (id: number) => void;
}) {
    const isProcessing = interview.status === 'processing';
    const isError = interview.status === 'error';

    return (
        <div
            className="rounded-xl p-5 flex items-center transition-all cursor-pointer"
            style={{
                backgroundColor: '#161820',
                border: `1px solid ${isError ? 'rgba(248,113,113,0.1)' : '#1E2028'}`,
                opacity: isProcessing ? 0.7 : 1,
            }}
            onMouseEnter={e => {
                if (!isProcessing) {
                    const el = e.currentTarget as HTMLElement;
                    el.style.borderColor = isError ? 'rgba(248,113,113,0.3)' : 'rgba(79,140,255,0.3)';
                    el.style.backgroundColor = '#1E1F26';
                }
            }}
            onMouseLeave={e => {
                const el = e.currentTarget as HTMLElement;
                el.style.borderColor = isError ? 'rgba(248,113,113,0.1)' : '#1E2028';
                el.style.backgroundColor = '#161820';
            }}
        >
            {/* Checkbox */}
            <input
                type="checkbox"
                disabled={isProcessing}
                checked={checked}
                onChange={() => onCheck(interview.id)}
                className="w-4 h-4 rounded mr-6 flex-shrink-0"
                style={{
                    accentColor: '#4F8CFF',
                    opacity: isProcessing ? 0.3 : 1,
                    cursor: isProcessing ? 'not-allowed' : 'pointer',
                }}
            />

            {/* File type icon */}
            <div
                className="p-2.5 rounded-lg mr-5 flex-shrink-0"
                style={{ backgroundColor: '#191b22', color: interview.iconColor }}
            >
                <span className="material-symbols-outlined" style={{ fontSize: 24 }}>
                    {interview.icon}
                </span>
            </div>

            {/* Title + meta */}
            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3 mb-1">
                    <h3 className="text-[15px] font-semibold text-[#F0F0F3] truncate">
                        {interview.title}
                    </h3>
                    {interview.syncedFrom && (
                        <span
                            className="text-[10px] font-medium text-[#8B8D97] px-2 py-0.5 rounded flex-shrink-0"
                            style={{ backgroundColor: 'rgba(51,52,59,0.5)' }}
                        >
                            Synced from {interview.syncedFrom}
                        </span>
                    )}
                </div>
                <div className="flex items-center gap-3 text-[13px] text-[#5A5C66]">
                    {interview.participant && (
                        <>
                            <span className="flex items-center gap-1.5">{interview.participant}</span>
                            <span className="w-1 h-1 rounded-full bg-[#2A2C38]" />
                        </>
                    )}
                    <span>{interview.date}</span>
                    {interview.duration && (
                        <>
                            <span className="w-1 h-1 rounded-full bg-[#2A2C38]" />
                            <span>{interview.duration}</span>
                        </>
                    )}
                </div>
            </div>

            {/* Right side: insights + tags (done) OR progress bar (processing) OR retry (error) */}
            {interview.status === 'done' && (
                <div className="flex items-center gap-8 mr-12">
                    <div className="flex flex-col text-right">
                        <span className="text-xs font-semibold text-[#c8cad6]">{interview.insights} insights</span>
                        <span className="text-[10px] text-[#5A5C66] uppercase tracking-widest">Analysis</span>
                    </div>
                    <div className="flex gap-2 flex-wrap">
                        {interview.tags.map(tag => (
                            <span
                                key={tag}
                                className="px-2 py-0.5 text-[10px] font-bold rounded-md uppercase tracking-tighter"
                                style={{ backgroundColor: 'rgba(79,140,255,0.1)', color: '#4F8CFF' }}
                            >
                                {tag}
                            </span>
                        ))}
                    </div>
                </div>
            )}

            {interview.status === 'processing' && (
                <div className="mr-12 w-48 rounded-full overflow-hidden flex-shrink-0" style={{ backgroundColor: '#191b22', height: 6 }}>
                    <div
                        className="h-full rounded-full animate-pulse"
                        style={{ backgroundColor: '#FBBF24', width: `${interview.processingPct}%` }}
                    />
                </div>
            )}

            {interview.status === 'error' && (
                <div className="mr-12">
                    <span className="text-xs font-medium text-[#F87171] hover:underline cursor-pointer">
                        Retry Analysis
                    </span>
                </div>
            )}

            {/* Status badge */}
            <StatusBadge status={interview.status} />
        </div>
    );
}

// ---------------------------------------------------------------------------
// Bulk actions bar
// ---------------------------------------------------------------------------

function BulkActionsBar({ count }: { count: number }) {
    return (
        <div
            className="fixed bottom-10 left-1/2 -translate-x-1/2 rounded-2xl h-14 px-6 flex items-center justify-between gap-12 shadow-2xl z-[100]"
            style={{
                background: 'rgba(30,31,38,0.7)',
                backdropFilter: 'blur(12px)',
                border: '1px solid #1E2028',
                minWidth: 500,
            }}
        >
            <div className="flex items-center gap-2">
                <span
                    className="w-5 h-5 flex items-center justify-center rounded text-[10px] font-bold text-[#c8cad6]"
                    style={{ backgroundColor: '#33343b' }}
                >
                    {count}
                </span>
                <span className="text-xs font-medium text-[#c8cad6]">selected</span>
            </div>
            <div className="flex items-center gap-3">
                <button className="h-9 px-4 text-xs font-semibold text-[#c8cad6] hover:text-white transition-colors flex items-center gap-2">
                    <span className="material-symbols-outlined" style={{ fontSize: 16 }}>auto_fix_high</span>
                    Re-analyze
                </button>
                <button className="h-9 px-4 text-xs font-semibold text-[#c8cad6] hover:text-white transition-colors flex items-center gap-2">
                    <span className="material-symbols-outlined" style={{ fontSize: 16 }}>folder_open</span>
                    Add to Collection
                    <span className="material-symbols-outlined" style={{ fontSize: 16 }}>expand_more</span>
                </button>
                <div className="w-px h-4 bg-[#1E2028]" />
                <button
                    className="h-9 px-4 text-xs font-semibold rounded-lg transition-colors flex items-center gap-2"
                    style={{ color: '#F87171' }}
                    onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'rgba(248,113,113,0.05)')}
                    onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}
                >
                    <span className="material-symbols-outlined" style={{ fontSize: 16 }}>delete</span>
                    Delete
                </button>
            </div>
        </div>
    );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function InterviewsPage() {
    const [selected, setSelected] = useState<Set<number>>(new Set());

    function toggleSelect(id: number) {
        setSelected(prev => {
            const next = new Set(prev);
            next.has(id) ? next.delete(id) : next.add(id);
            return next;
        });
    }

    return (
        <div className="flex-1 overflow-y-auto p-8 relative" style={{ backgroundColor: '#0F1117' }}>

            {/* ── Header ── */}
            <div className="flex justify-between items-start mb-10">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-[#F0F0F3] mb-1">Interviews</h1>
                    <p className="text-sm text-[#8B8D97] flex items-center gap-2">
                        <span>47 interviews</span>
                        <span className="w-1 h-1 rounded-full bg-[#424753]" />
                        <span>58.2 MB of 5 GB used</span>
                    </p>
                </div>
                <button
                    className="px-5 py-2.5 rounded-xl font-semibold text-sm flex items-center gap-2 transition-all text-white"
                    style={{
                        backgroundColor: '#4F8CFF',
                        boxShadow: '0 4px 12px rgba(79,140,255,0.25)',
                    }}
                    onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#528dff')}
                    onMouseLeave={e => (e.currentTarget.style.backgroundColor = '#4F8CFF')}
                >
                    <span className="material-symbols-outlined" style={{ fontSize: 20 }}>upload</span>
                    Upload
                </button>
            </div>

            {/* ── Filter bar ── */}
            <div className="flex items-center gap-3 mb-8 h-10">
                {/* Search */}
                <div className="relative flex-1 max-w-md h-full">
                    <span
                        className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[#5A5C66]"
                        style={{ fontSize: 16 }}
                    >
                        search
                    </span>
                    <input
                        type="text"
                        placeholder="Filter interviews..."
                        className="w-full h-full rounded-xl pl-10 pr-4 text-sm outline-none transition-colors"
                        style={{
                            backgroundColor: '#161820',
                            border: '1px solid #1E2028',
                            color: '#F0F0F3',
                        }}
                        onFocus={e => (e.currentTarget.style.borderColor = 'rgba(79,140,255,0.4)')}
                        onBlur={e => (e.currentTarget.style.borderColor = '#1E2028')}
                    />
                </div>

                {/* Dropdowns */}
                {[
                    { label: 'Sort', value: 'Recent first' },
                    { label: 'Status', value: 'All statuses' },
                    { label: 'Source', value: 'All sources' },
                ].map(d => (
                    <button
                        key={d.label}
                        className="h-full px-3 rounded-xl flex items-center gap-2 text-xs font-medium text-[#8B8D97] transition-colors flex-shrink-0"
                        style={{ backgroundColor: '#161820', border: '1px solid #1E2028' }}
                        onMouseEnter={e => (e.currentTarget.style.borderColor = '#2A2C38')}
                        onMouseLeave={e => (e.currentTarget.style.borderColor = '#1E2028')}
                    >
                        {d.label}:{' '}
                        <span className="text-[#c8cad6]">{d.value}</span>
                        <span className="material-symbols-outlined" style={{ fontSize: 16 }}>expand_more</span>
                    </button>
                ))}
            </div>

            {/* ── Interview list ── */}
            <div className="space-y-3 pb-24">
                {INTERVIEWS.map(iv => (
                    <InterviewRow
                        key={iv.id}
                        interview={iv}
                        checked={selected.has(iv.id)}
                        onCheck={toggleSelect}
                    />
                ))}
            </div>

            {/* ── Bulk actions bar ── */}
            <BulkActionsBar count={selected.size} />
        </div>
    );
}
