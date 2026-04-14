'use client';

function Skeleton({ className }: { className: string }) {
    return <div className={`animate-pulse rounded-md bg-white/[0.06] ${className}`} />;
}

export function HomeLoadingState() {
    return (
        <div className="p-8 space-y-8 max-w-full">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {Array.from({ length: 4 }).map((_, index) => (
                    <div key={index} className="bg-[#161820] border border-[#1E2028] rounded-lg p-6">
                        <Skeleton className="h-4 w-24 mb-6" />
                        <Skeleton className="h-8 w-20 mb-2" />
                        <Skeleton className="h-3 w-24" />
                    </div>
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                <section className="lg:col-span-7 bg-[#161820] border border-[#1E2028] rounded-lg overflow-hidden">
                    <div className="px-6 py-5 border-b border-[#1E2028]">
                        <Skeleton className="h-4 w-36" />
                    </div>
                    <div className="divide-y divide-[#1E2028]">
                        {Array.from({ length: 5 }).map((_, index) => (
                            <div key={index} className="px-6 py-4">
                                <Skeleton className="h-4 w-40 mb-3" />
                                <Skeleton className="h-3 w-24 mb-2" />
                                <Skeleton className="h-3 w-16" />
                            </div>
                        ))}
                    </div>
                </section>

                <section className="lg:col-span-5 bg-[#161820] border border-[#1E2028] rounded-lg overflow-hidden">
                    <div className="px-6 py-5 border-b border-[#1E2028]">
                        <Skeleton className="h-4 w-32" />
                    </div>
                    <div className="px-6 py-6 space-y-6">
                        {Array.from({ length: 6 }).map((_, index) => (
                            <div key={index} className="flex items-start gap-4">
                                <Skeleton className="h-4 w-4 rounded-full mt-1" />
                                <div className="flex-1">
                                    <Skeleton className="h-3 w-40 mb-2" />
                                    <Skeleton className="h-3 w-28" />
                                </div>
                            </div>
                        ))}
                    </div>
                </section>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <section className="bg-[#161820] border border-[#1E2028] rounded-lg p-6 space-y-4">
                    <Skeleton className="h-4 w-36 mb-6" />
                    {Array.from({ length: 3 }).map((_, index) => (
                        <div key={index} className="rounded-lg bg-[#191b22] p-4">
                            <Skeleton className="h-3 w-32 mb-3" />
                            <Skeleton className="h-3 w-28" />
                        </div>
                    ))}
                </section>
                <section className="bg-[#161820] border border-[#1E2028] rounded-lg p-6">
                    <div className="flex flex-col items-center text-center">
                        <Skeleton className="h-16 w-16 rounded-full mb-4" />
                        <Skeleton className="h-5 w-32 mb-2" />
                        <Skeleton className="h-3 w-40 mb-2" />
                        <Skeleton className="h-3 w-32 mb-6" />
                        <Skeleton className="h-9 w-36 rounded-full" />
                    </div>
                </section>
            </div>

            <section className="bg-[#161820] border border-[#1E2028] rounded-lg p-10">
                <div className="flex flex-col items-center">
                    <Skeleton className="h-20 w-20 rounded-full mb-6" />
                    <Skeleton className="h-6 w-48 mb-3" />
                    <Skeleton className="h-4 w-56 mb-2" />
                    <Skeleton className="h-4 w-64 mb-8" />
                    <div className="flex gap-4">
                        <Skeleton className="h-10 w-40 rounded-full" />
                        <Skeleton className="h-10 w-40 rounded-full" />
                    </div>
                </div>
            </section>
        </div>
    );
}

export function HomeEmptyState({
    onUpload,
    onLoadSample,
    sampleDataLoading,
}: {
    onUpload: () => void;
    onLoadSample: () => Promise<void>;
    sampleDataLoading: boolean;
}) {
    return (
        <div className="p-8 h-full">
            <section className="h-full min-h-[520px] bg-[#161820] border border-[#1E2028] rounded-[28px] overflow-hidden relative flex items-center justify-center">
                <div className="absolute inset-0" style={{ background: 'radial-gradient(circle at top, rgba(175,198,255,0.08) 0%, transparent 58%)' }} />
                <div className="relative z-10 max-w-2xl px-8 py-16 text-center">
                    <div className="w-20 h-20 rounded-full mx-auto mb-6 bg-[#1C1E28] border border-white/5 flex items-center justify-center shadow-[0_0_30px_rgba(175,198,255,0.08)]">
                        <span className="material-symbols-outlined text-[#afc6ff]" style={{ fontSize: 40 }}>
                            analytics
                        </span>
                    </div>
                    <h1 className="text-[34px] font-bold text-[#F0F0F3] tracking-tight mb-4">Welcome to Spec10x</h1>
                    <p className="text-[16px] text-[#8B8D97] leading-relaxed max-w-xl mx-auto mb-8">
                        Upload your first customer interviews to get started. Spec10x will analyze them and discover the themes, pain points, and insights hidden in your data.
                    </p>
                    <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-8">
                        <button
                            onClick={onUpload}
                            className="flex items-center justify-center gap-2 rounded px-4 py-2 text-xs font-bold transition-all hover:brightness-110"
                            style={{ backgroundColor: '#afc6ff', color: '#002d6c' }}
                        >
                            Upload Interviews
                        </button>
                        <button
                            onClick={() => void onLoadSample()}
                            disabled={sampleDataLoading}
                            className="flex items-center justify-center gap-2 rounded px-4 py-2 text-xs font-bold transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                            style={{ border: '1px solid #1E2028', color: '#c2c6d6' }}
                            onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#1E1F26')}
                            onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}
                        >
                            {sampleDataLoading ? 'Loading Sample Data...' : 'Try with Sample Data →'}
                        </button>
                    </div>
                    <p className="text-[13px] text-[#5A5C66]">
                        Supported: .txt .md .pdf .docx .mp3 .wav .mp4
                    </p>
                </div>
            </section>
        </div>
    );
}

export function ErrorState({ onRetry }: { onRetry: () => Promise<void> }) {
    return (
        <div className="p-8 h-full">
            <section className="bg-[#161820] border border-[#1E2028] rounded-2xl px-8 py-10 max-w-xl">
                <div className="w-14 h-14 rounded-full bg-[var(--color-danger-subtle)] border border-[rgba(255,180,171,0.16)] flex items-center justify-center mb-5">
                    <span className="material-symbols-outlined text-[var(--color-danger)]" style={{ fontSize: 28 }}>
                        error
                    </span>
                </div>
                <h1 className="text-[24px] font-bold text-[#F0F0F3] tracking-tight mb-2">Home dashboard unavailable</h1>
                <p className="text-[14px] text-[#8B8D97] leading-relaxed mb-6">
                    The overview data did not load. Retry and I’ll pull the latest dashboard summary again.
                </p>
                <button
                    onClick={() => void onRetry()}
                    className="flex items-center gap-2 rounded px-4 py-2 text-xs font-bold transition-all hover:brightness-110"
                    style={{ backgroundColor: '#afc6ff', color: '#002d6c' }}
                >
                    Retry
                </button>
            </section>
        </div>
    );
}
