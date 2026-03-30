'use client';

import Link from 'next/link';

import {
    HomeDashboardActivityResponse,
    HomeDashboardPriorityResponse,
    HomeDashboardTrendResponse,
} from '@/lib/api';

function activityToneClasses(tone: string): string {
    switch (tone) {
        case 'success':
            return 'bg-[#34D399] shadow-[0_0_10px_rgba(52,211,153,0.3)]';
        case 'warning':
        case 'danger':
            return 'bg-[#ffb77b]';
        default:
            return 'bg-[#afc6ff]';
    }
}

function priorityBandClasses(band: string): string {
    switch (band) {
        case 'high':
            return 'bg-[#afc6ff]/10 text-[#afc6ff]';
        case 'med':
            return 'bg-white/5 text-[#8B8D97]';
        default:
            return 'bg-white/5 text-[#8B8D97]';
    }
}

function trendMeta(trend: string): { arrow: string; scoreClass: string } {
    switch (trend) {
        case 'up':
            return { arrow: '↑', scoreClass: 'text-[#34D399]' };
        case 'down':
            return { arrow: '↓', scoreClass: 'text-[var(--color-danger)]' };
        default:
            return { arrow: '→', scoreClass: 'text-[#8B8D97]' };
    }
}

function Sparkline({ points }: { points: number[] }) {
    const width = 40;
    const height = 16;
    const max = Math.max(...points, 1);
    const min = Math.min(...points, 0);
    const range = max - min || 1;
    const step = points.length > 1 ? width / (points.length - 1) : width;
    const d = points
        .map((value, index) => {
            const x = index * step;
            const y = height - ((value - min) / range) * (height - 2) - 1;
            return `${index === 0 ? 'M' : 'L'}${x.toFixed(2)} ${y.toFixed(2)}`;
        })
        .join(' ');

    return (
        <svg className="text-[#afc6ff] flex-shrink-0" fill="none" height="16" viewBox="0 0 40 16" width="40">
            <path d={d} stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
        </svg>
    );
}

export function StatCard({
    title,
    value,
    detail,
    detailClassName,
    icon,
    href,
}: {
    title: string;
    value: string;
    detail: string;
    detailClassName: string;
    icon: string;
    href: string;
}) {
    return (
        <Link
            href={href}
            className="bg-[#161820] border border-[#1E2028] rounded-lg p-6 flex flex-col group hover:border-[#afc6ff]/20 transition-all"
        >
            <div className="flex justify-between items-start mb-4">
                <span className="text-[#8B8D97] text-[13px] font-medium">{title}</span>
                <span
                    className="material-symbols-outlined text-[#8B8D97] group-hover:text-[#afc6ff] transition-colors"
                    style={{ fontSize: 20 }}
                >
                    {icon}
                </span>
            </div>
            <div className="flex items-baseline gap-2">
                <span className="text-[32px] font-bold text-[#F0F0F3] tracking-tight leading-none">{value}</span>
                <span className={`text-[12px] ${detailClassName}`}>{detail}</span>
            </div>
        </Link>
    );
}

export function ActivePriorityRow({
    priority,
    formatScore,
}: {
    priority: HomeDashboardPriorityResponse;
    formatScore: (value: number) => string;
}) {
    const trend = trendMeta(priority.trend);

    return (
        <Link
            href="/insights"
            className="px-6 py-4 flex items-center justify-between hover:bg-white/[0.02] transition-colors"
        >
            <div className="flex flex-col gap-1">
                <span className="text-[14px] text-[#F0F0F3] font-medium">{priority.name}</span>
                <div className="flex items-center gap-2 flex-wrap">
                    <span className="px-2 py-0.5 rounded-sm bg-[#afc6ff]/10 text-[#afc6ff] text-[10px] font-bold uppercase">
                        {priority.primary_count_label}
                    </span>
                    <span className="px-2 py-0.5 rounded-sm bg-white/5 text-[#8B8D97] text-[10px] font-bold uppercase">
                        {priority.source_summary_label}
                    </span>
                </div>
            </div>
            <div className="flex items-center gap-4">
                <div className="flex flex-col items-end">
                    <span className={`text-[14px] font-bold ${trend.scoreClass}`}>
                        {formatScore(priority.impact_score)} <span className="text-[10px]">{trend.arrow}</span>
                    </span>
                    <span className="text-[10px] text-[#8B8D97] uppercase tracking-tighter">Impact</span>
                </div>
                <div className={`px-3 py-1 text-[11px] font-bold rounded-full uppercase ${priorityBandClasses(priority.priority_band)}`}>
                    {priority.priority_band}
                </div>
            </div>
        </Link>
    );
}

export function ActivityItem({
    item,
    formatRelativeTime,
}: {
    item: HomeDashboardActivityResponse;
    formatRelativeTime: (timestamp: string) => string;
}) {
    return (
        <li className="flex items-start gap-4 relative">
            <div className={`w-4 h-4 flex-shrink-0 rounded-full border-4 border-[#161820] z-10 mt-0.5 ${activityToneClasses(item.tone)}`} />
            <Link href={item.href} className="flex flex-col hover:opacity-90 transition-opacity">
                <span className="text-[13px] text-[#F0F0F3] font-medium">{item.title}</span>
                <span className="text-[11px] text-[#8B8D97]">
                    {item.subtitle} • {formatRelativeTime(item.occurred_at)}
                </span>
            </Link>
        </li>
    );
}

export function EmergingTrendItem({ trend }: { trend: HomeDashboardTrendResponse }) {
    return (
        <Link href={trend.href} className="flex items-center justify-between p-4 rounded-lg bg-[#191b22] hover:bg-[#1e2030] transition-colors">
            <div className="flex flex-col">
                <div className="flex items-center gap-2 mb-1">
                    <span className="bg-[#34D399]/10 text-[#34D399] text-[9px] font-bold px-1.5 py-0.5 rounded-sm tracking-widest uppercase">New</span>
                    <span className="text-[14px] text-[#F0F0F3] font-medium">{trend.name}</span>
                </div>
                <span className="text-[12px] text-[#8B8D97]">
                    {typeof trend.velocity_delta === 'number'
                        ? `${trend.velocity_delta > 0 ? '+' : ''}${trend.velocity_delta}% velocity this week`
                        : 'Not enough week-over-week data yet'}
                </span>
            </div>
            <Sparkline points={trend.sparkline_points} />
        </Link>
    );
}

export function SectionEmptyState({
    title,
    body,
}: {
    title: string;
    body: string;
}) {
    return (
        <div className="px-6 py-8">
            <div className="rounded-lg border border-dashed border-white/8 bg-[#191b22] px-4 py-6">
                <p className="text-[13px] font-medium text-[#F0F0F3]">{title}</p>
                <p className="mt-1 text-[12px] text-[#8B8D97]">{body}</p>
            </div>
        </div>
    );
}
