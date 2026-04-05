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
                        className="text-[13px] font-medium text-[#afc6ff] hover:underline"
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

                <section className="bg-[#161820] border border-[#1E2028] rounded-lg p-6 flex flex-col items-center justify-center text-center relative overflow-hidden">
                    <div className="absolute inset-0" style={{ background: 'radial-gradient(circle at center, rgba(175,198,255,0.06) 0%, transparent 70%)' }} />
                    <div className="relative z-10 flex flex-col items-center py-4">
                        <div className="w-16 h-16 rounded-full bg-[#1C1E28] flex items-center justify-center mb-4 border border-white/5">
                            <span className="material-symbols-outlined text-[#5A5C66]" style={{ fontSize: 40 }}>lock</span>
                        </div>
                        <h3 className="text-[20px] font-bold text-[#F0F0F3] mb-1">Spec Pipeline</h3>
                        <span className="px-2 py-0.5 rounded-sm bg-[#afc6ff]/20 text-[#afc6ff] text-[10px] font-bold uppercase tracking-widest mb-3 inline-block">Coming Soon</span>
                        <p className="text-[14px] text-[#5A5C66] max-w-xs">Automate the creation of PRDs and product specs directly from validated themes and user insights.</p>
                    </div>
                </section>
            </div>

            <section className="bg-[#161820] border border-[#1E2028] rounded-lg p-10 flex flex-col items-center justify-center text-center relative overflow-hidden">
                <div className="absolute inset-0" style={{ background: 'radial-gradient(circle at center, rgba(175,198,255,0.04) 0%, transparent 60%)' }} />
                <div className="relative z-10 flex flex-col items-center">
                    <div className="w-20 h-20 rounded-full bg-[#1C1E28] flex items-center justify-center mb-6 border border-white/5">
                        <span className="material-symbols-outlined text-[#5A5C66]" style={{ fontSize: 48 }}>lock</span>
                    </div>
                    <h3 className="text-[24px] font-bold text-[#F0F0F3] mb-2 tracking-tight">Post-Launch Impact</h3>
                    <span className="px-3 py-1 rounded-sm bg-[#afc6ff]/20 text-[#afc6ff] text-[11px] font-bold uppercase tracking-widest mb-4 inline-block">Coming Soon</span>
                    <p className="text-[15px] text-[#5A5C66] max-w-lg leading-relaxed">
                        Closing the feedback loop. Connect your post-launch metrics to historical themes and insights to measure the true ROI of your product decisions and iterate with precision.
                    </p>
                </div>
            </section>
        </div>
    );
}
