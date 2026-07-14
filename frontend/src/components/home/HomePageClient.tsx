'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';

import { useToast } from '@/components/ui/Toast';
import { useHomeDashboard } from '@/hooks/useHomeDashboard';
import { HomeEmptyState, HomeLoadingState, ErrorState } from './HomeDashboardStates';
import {
    ActivePriorityRow,
    ActivityItem,
    EmergingTrendItem,
    SectionEmptyState,
    StatCard,
} from './HomeDashboardWidgets';

const SPEC_PIPELINE_STAGES: Array<{
    key: 'draft' | 'in_review' | 'needs_changes' | 'approved' | 'in_dev' | 'shipped';
    label: string;
    color: string;
}> = [
    { key: 'draft', label: 'Draft', color: '#8c909f' },
    { key: 'in_review', label: 'In Review', color: '#afc6ff' },
    { key: 'needs_changes', label: 'Changes', color: '#ffd8a8' },
    { key: 'approved', label: 'Approved', color: '#a8e6b0' },
    { key: 'in_dev', label: 'In Dev', color: '#d8b4fe' },
    { key: 'shipped', label: 'Shipped', color: '#7dd3c0' },
];

function formatRelativeTime(timestamp: string): string {
    const now = new Date();
    const then = new Date(timestamp);
    const diffMs = then.getTime() - now.getTime();
    const diffMinutes = Math.round(diffMs / 60000);
    const rtf = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });

    if (Math.abs(diffMinutes) < 60) {
        return rtf.format(diffMinutes, 'minute');
    }

    const diffHours = Math.round(diffMinutes / 60);
    if (Math.abs(diffHours) < 24) {
        return rtf.format(diffHours, 'hour');
    }

    const diffDays = Math.round(diffHours / 24);
    return rtf.format(diffDays, 'day');
}

function formatScore(score: number): string {
    return (score / 10).toFixed(1);
}

function formatScoreDelta(delta: number | null | undefined): { label: string; className: string } {
    if (typeof delta !== 'number') {
        return {
            label: 'based on current evidence',
            className: 'text-[#8B8D97]',
        };
    }

    const displayDelta = Math.abs(delta / 10).toFixed(1);
    if (delta > 0) {
        return {
            label: `↑ ${displayDelta} vs last week`,
            className: 'text-[#34D399]',
        };
    }
    if (delta < 0) {
        return {
            label: `↓ ${displayDelta} vs last week`,
            className: 'text-[var(--color-danger)]',
        };
    }
    return {
        label: '→ unchanged vs last week',
        className: 'text-[#8B8D97]',
    };
}

export default function HomePageClient() {
    const router = useRouter();
    const { showToast } = useToast();
    const { dashboard, loading, error, refetch, loadSampleData, sampleDataLoading } = useHomeDashboard();

    const stats = dashboard?.stats;
    const scoreDeltaMeta = formatScoreDelta(stats?.average_impact_delta);

    async function handleLoadSampleData() {
        try {
            await loadSampleData();
            showToast('Sample data loaded', 'success');
        } catch (err) {
            showToast(
                err instanceof Error ? err.message : 'Failed to load sample data',
                'error',
            );
        }
    }

    if (loading && !dashboard) {
        return <HomeLoadingState />;
    }

    if (!loading && error && !dashboard) {
        return <ErrorState onRetry={refetch} />;
    }

    if (dashboard && !dashboard.has_data) {
        return (
            <HomeEmptyState
                onUpload={() => router.push('/interviews')}
                onLoadSample={handleLoadSampleData}
                sampleDataLoading={sampleDataLoading}
            />
        );
    }

    if (!dashboard || !stats) {
        return null;
    }

    return (
        <div className="p-8 space-y-8 max-w-full">
            {error && (
                <div className="rounded-xl border border-[rgba(255,180,171,0.16)] bg-[rgba(255,180,171,0.06)] px-4 py-3 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <span className="material-symbols-outlined text-[var(--color-danger)]" style={{ fontSize: 18 }}>
                            warning
                        </span>
                        <span className="text-[13px] text-[#F0F0F3]">The latest refresh failed. Showing the most recent dashboard data.</span>
                    </div>
                    <button
                        onClick={() => void refetch()}
                        className="flex items-center gap-2 rounded px-4 py-2 text-xs font-bold transition-all hover:brightness-110 flex-shrink-0"
                        style={{ backgroundColor: '#afc6ff', color: '#002d6c' }}
                    >
                        Retry
                    </button>
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard
                    title="Interviews"
                    value={String(stats.interviews_total)}
                    detail={
                        stats.interviews_this_week > 0
                            ? `+${stats.interviews_this_week} this week`
                            : 'No new interviews this week'
                    }
                    detailClassName={stats.interviews_this_week > 0 ? 'font-semibold text-[#34D399]' : 'text-[#8B8D97]'}
                    icon="folder_open"
                    href="/interviews"
                />

                <StatCard
                    title="Active Themes"
                    value={String(stats.active_themes_total)}
                    detail={
                        stats.new_themes_this_week > 0
                            ? `+${stats.new_themes_this_week} new`
                            : 'No new themes this week'
                    }
                    detailClassName={stats.new_themes_this_week > 0 ? 'font-semibold text-[#34D399]' : 'text-[#8B8D97]'}
                    icon="lightbulb"
                    href="/insights"
                />

                <StatCard
                    title="Signals"
                    value={String(stats.signals_total)}
                    detail={`across ${stats.active_source_type_count} ${stats.active_source_type_count === 1 ? 'source' : 'sources'}`}
                    detailClassName="text-[#8B8D97]"
                    icon="inbox"
                    href="/feed"
                />

                <StatCard
                    title="Avg Impact Score"
                    value={formatScore(stats.average_impact_score)}
                    detail={scoreDeltaMeta.label}
                    detailClassName={scoreDeltaMeta.className}
                    icon="trending_up"
                    href="/board"
                />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                <section className="lg:col-span-7 bg-[#161820] border border-[#1E2028] rounded-lg overflow-hidden">
                    <div className="flex justify-between items-center px-6 py-5 border-b border-[#1E2028]">
                        <h2 className="text-[#F0F0F3] font-semibold tracking-tight">Active Priorities</h2>
                        <Link href="/board" className="text-[#afc6ff] text-[13px] font-medium hover:underline flex items-center gap-1">
                            View Board
                            <span className="material-symbols-outlined" style={{ fontSize: 16 }}>arrow_forward</span>
                        </Link>
                    </div>
                    <div className="divide-y divide-[#1E2028]">
                        {dashboard.active_priorities.length > 0 ? (
                            dashboard.active_priorities.map((priority) => (
                                <ActivePriorityRow key={priority.id} priority={priority} formatScore={formatScore} />
                            ))
                        ) : (
                            <SectionEmptyState
                                title="No ranked priorities yet"
                                body="As themes gain evidence and impact, your highest-priority opportunities will appear here."
                            />
                        )}
                    </div>
                </section>

                <section className="lg:col-span-5 bg-[#161820] border border-[#1E2028] rounded-lg overflow-hidden">
                    <div className="flex justify-between items-center px-6 py-5 border-b border-[#1E2028]">
                        <h2 className="text-[#F0F0F3] font-semibold tracking-tight">Recent Activity</h2>
                        <Link href="/feed" className="text-[#afc6ff] text-[13px] font-medium hover:underline flex items-center gap-1">
                            View Feed
                            <span className="material-symbols-outlined" style={{ fontSize: 16 }}>arrow_forward</span>
                        </Link>
                    </div>
                    {dashboard.recent_activity.length > 0 ? (
                        <div className="px-6 py-6 relative">
                            <div className="absolute left-[31px] top-6 bottom-6 w-[1px] bg-white/5" />
                            <div className="max-h-[480px] overflow-y-auto">
                                <ul className="space-y-6">
                                    {dashboard.recent_activity.map((item, index) => (
                                        <ActivityItem
                                            key={`${item.kind}-${index}-${item.occurred_at}`}
                                            item={item}
                                            formatRelativeTime={formatRelativeTime}
                                        />
                                    ))}
                                </ul>
                            </div>
                        </div>
                    ) : (
                        <SectionEmptyState
                            title="No recent activity"
                            body="Uploads, theme discoveries, and sync completions will surface here as they happen."
                        />
                    )}
                </section>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <section className="bg-[#161820] border border-[#1E2028] rounded-lg p-6">
                    <h2 className="text-[#F0F0F3] font-semibold mb-6 tracking-tight">Emerging Trends</h2>
                    {dashboard.emerging_trends.length > 0 ? (
                        <div className="space-y-4">
                            {dashboard.emerging_trends.map((trend) => (
                                <EmergingTrendItem key={trend.id} trend={trend} />
                            ))}
                        </div>
                    ) : (
                        <div className="rounded-lg bg-[#191b22] border border-dashed border-white/6 px-4 py-6">
                            <p className="text-[13px] font-medium text-[#F0F0F3]">No emerging themes yet</p>
                            <p className="mt-1 text-[12px] text-[#8B8D97]">
                                New themes with enough recent evidence will appear here once the signal layer has momentum.
                            </p>
                        </div>
                    )}
                </section>

                <section className="bg-[#161820] border border-[#1E2028] rounded-lg overflow-hidden">
                    <div className="flex justify-between items-center px-6 py-5 border-b border-[#1E2028]">
                        <h2 className="text-[#F0F0F3] font-semibold tracking-tight">Spec Pipeline</h2>
                        <Link href="/roadmap" className="text-[#afc6ff] text-[13px] font-medium hover:underline flex items-center gap-1">
                            View Roadmap
                            <span className="material-symbols-outlined" style={{ fontSize: 16 }}>arrow_forward</span>
                        </Link>
                    </div>
                    {dashboard.spec_pipeline.total > 0 ? (
                        <div className="p-6">
                            <div className="grid grid-cols-3 gap-3">
                                {SPEC_PIPELINE_STAGES.map((stage) => (
                                    <Link
                                        key={stage.key}
                                        href={`/specs?status=${stage.key}`}
                                        className="rounded-lg bg-[#191b22] border border-white/5 px-3 py-3 text-center transition-colors hover:border-[#afc6ff]/40"
                                    >
                                        <p className="text-[20px] font-bold text-[#F0F0F3]">
                                            {dashboard.spec_pipeline[stage.key]}
                                        </p>
                                        <p className="mt-0.5 text-[10px] font-bold uppercase tracking-wider" style={{ color: stage.color }}>
                                            {stage.label}
                                        </p>
                                    </Link>
                                ))}
                            </div>
                            <p className="mt-4 text-[12px] text-[#8B8D97]">
                                {dashboard.spec_pipeline.total} spec{dashboard.spec_pipeline.total === 1 ? '' : 's'} in the loop —{' '}
                                {dashboard.spec_pipeline.shipped > 0 ? (
                                    <Link href="/outcomes" className="text-[#afc6ff] font-medium hover:underline">
                                        {dashboard.spec_pipeline.shipped} shipped, see outcomes
                                    </Link>
                                ) : (
                                    'nothing shipped yet'
                                )}
                            </p>
                        </div>
                    ) : (
                        <SectionEmptyState
                            title="No specs yet"
                            body="Generate a spec from a pinned theme on the board — the pipeline from draft to shipped will show here."
                        />
                    )}
                </section>
            </div>
        </div>
    );
}
