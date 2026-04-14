'use client';

interface InsightsErrorStateProps {
  onRetry: () => Promise<void> | void;
}

interface ExplorerEmptyStateProps {
  title: string;
  body: string;
  primaryLabel: string;
  onPrimaryAction: () => void;
}

function SkeletonBlock({ className }: { className: string }) {
  return <div className={`animate-pulse rounded-xl bg-white/5 ${className}`} />;
}

export function InsightsLoadingState() {
  return (
    <div className="flex h-full overflow-hidden">
      <section
        className="w-[220px] border-r flex-shrink-0 px-5 py-6 space-y-6"
        style={{ backgroundColor: '#0C0D12', borderColor: 'rgba(66,71,83,0.1)' }}
      >
        <SkeletonBlock className="h-4 w-24" />
        <SkeletonBlock className="h-24 w-full" />
        <SkeletonBlock className="h-24 w-full" />
        <SkeletonBlock className="h-24 w-full" />
      </section>

      <section className="flex-1 overflow-y-auto p-6" style={{ backgroundColor: '#0F1117' }}>
        <div className="max-w-4xl mx-auto space-y-6">
          <div className="flex items-center justify-between gap-6">
            <SkeletonBlock className="h-8 w-48" />
            <SkeletonBlock className="h-10 w-72" />
          </div>
          <SkeletonBlock className="h-16 w-full" />
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
            {Array.from({ length: 4 }).map((_, index) => (
              <div
                key={index}
                className="rounded-xl p-5 border border-white/5"
                style={{ backgroundColor: '#191b22' }}
              >
                <SkeletonBlock className="h-5 w-2/3" />
                <SkeletonBlock className="mt-4 h-3 w-1/2" />
                <SkeletonBlock className="mt-4 h-2 w-full" />
                <SkeletonBlock className="mt-4 h-10 w-full" />
                <SkeletonBlock className="mt-3 h-10 w-full" />
              </div>
            ))}
          </div>
        </div>
      </section>

      <section
        className="w-[340px] border-l flex-shrink-0 p-6 space-y-6"
        style={{ backgroundColor: '#0C0D12', borderColor: 'rgba(66,71,83,0.1)' }}
      >
        <SkeletonBlock className="h-6 w-2/3" />
        <SkeletonBlock className="h-8 w-24" />
        <SkeletonBlock className="h-36 w-full" />
        <SkeletonBlock className="h-24 w-full" />
        <SkeletonBlock className="h-40 w-full" />
      </section>
    </div>
  );
}

export function InsightsErrorState({ onRetry }: InsightsErrorStateProps) {
  return (
    <div className="h-full flex items-center justify-center px-6" style={{ backgroundColor: '#0F1117' }}>
      <div className="max-w-md text-center rounded-2xl border border-[rgba(255,180,171,0.16)] bg-[rgba(255,180,171,0.05)] px-8 py-10">
        <div className="w-14 h-14 rounded-full mx-auto mb-4 flex items-center justify-center bg-[rgba(255,180,171,0.1)] text-[var(--color-danger)]">
          <span className="material-symbols-outlined" style={{ fontSize: 28 }}>
            warning
          </span>
        </div>
        <h2 className="text-[20px] font-semibold text-[#F0F0F3]">Insights could not load</h2>
        <p className="mt-2 text-[14px] leading-relaxed text-[#8B8D97]">
          The redesigned workspace is wired up, but the explorer request did not complete this time.
        </p>
        <button
          type="button"
          onClick={() => void onRetry()}
          className="mt-6 inline-flex items-center gap-2 rounded px-4 py-2 text-xs font-bold transition-all hover:brightness-110"
          style={{ backgroundColor: '#afc6ff', color: '#002d6c' }}
        >
          <span className="material-symbols-outlined" style={{ fontSize: 16 }}>
            refresh
          </span>
          Retry
        </button>
      </div>
    </div>
  );
}

export function ExplorerEmptyState({
  title,
  body,
  primaryLabel,
  onPrimaryAction,
}: ExplorerEmptyStateProps) {
  return (
    <div className="rounded-[28px] border border-[#1E2028] bg-[#12141B] px-8 py-12 text-center relative overflow-hidden">
      <div
        className="absolute inset-0"
        style={{
          background:
            'radial-gradient(circle at top, rgba(175,198,255,0.08) 0%, transparent 60%)',
        }}
      />
      <div className="relative z-10 max-w-lg mx-auto">
        <div className="w-16 h-16 rounded-full mx-auto mb-5 flex items-center justify-center bg-[#1C1E28] border border-white/5">
          <span className="material-symbols-outlined text-[#afc6ff]" style={{ fontSize: 34 }}>
            insights
          </span>
        </div>
        <h2 className="text-[24px] font-bold tracking-tight text-[#F0F0F3]">{title}</h2>
        <p className="mt-3 text-[14px] leading-relaxed text-[#8B8D97]">{body}</p>
        <button
          type="button"
          onClick={onPrimaryAction}
          className="mt-6 inline-flex items-center gap-2 rounded px-4 py-2 text-xs font-bold transition-all hover:brightness-110"
          style={{ backgroundColor: '#afc6ff', color: '#002d6c' }}
        >
          <span className="material-symbols-outlined" style={{ fontSize: 16 }}>
            arrow_forward
          </span>
          {primaryLabel}
        </button>
      </div>
    </div>
  );
}

export function ThemeDetailPlaceholder({
  title,
  body,
  icon = 'lightbulb',
}: {
  title: string;
  body: string;
  icon?: string;
}) {
  return (
    <div className="h-full flex items-center justify-center p-6">
      <div className="text-center max-w-xs">
        <div className="w-14 h-14 rounded-full mx-auto mb-4 flex items-center justify-center bg-[#1C1E28] border border-white/5">
          <span className="material-symbols-outlined text-[#5A5C66]" style={{ fontSize: 28 }}>
            {icon}
          </span>
        </div>
        <h3 className="text-[18px] font-semibold text-[#F0F0F3]">{title}</h3>
        <p className="mt-2 text-[13px] leading-relaxed text-[#8B8D97]">{body}</p>
      </div>
    </div>
  );
}

export function ThemeDetailLoadingState() {
  return (
    <div className="p-6 space-y-5">
      <SkeletonBlock className="h-6 w-2/3" />
      <SkeletonBlock className="h-8 w-24" />
      <SkeletonBlock className="h-32 w-full" />
      <SkeletonBlock className="h-24 w-full" />
      <SkeletonBlock className="h-36 w-full" />
      <SkeletonBlock className="h-10 w-full" />
      <SkeletonBlock className="h-10 w-full" />
    </div>
  );
}

export function ThemeDetailErrorState({ onRetry }: InsightsErrorStateProps) {
  return (
    <div className="h-full flex items-center justify-center p-6">
      <div className="max-w-xs text-center">
        <div className="w-12 h-12 rounded-full mx-auto mb-4 flex items-center justify-center bg-[rgba(255,180,171,0.1)] text-[var(--color-danger)]">
          <span className="material-symbols-outlined" style={{ fontSize: 24 }}>
            error
          </span>
        </div>
        <h3 className="text-[18px] font-semibold text-[#F0F0F3]">Theme details failed to load</h3>
        <p className="mt-2 text-[13px] leading-relaxed text-[#8B8D97]">
          The selected theme is still in the list, but the detail request needs another try.
        </p>
        <button
          type="button"
          onClick={() => void onRetry()}
          className="mt-5 inline-flex items-center gap-2 rounded px-4 py-2 text-xs font-bold transition-colors"
          style={{ border: '1px solid #1E2028', color: '#8B8D97' }}
          onMouseEnter={e => (e.currentTarget.style.color = 'white')}
          onMouseLeave={e => (e.currentTarget.style.color = '#8B8D97')}
        >
          <span className="material-symbols-outlined" style={{ fontSize: 16 }}>
            refresh
          </span>
          Retry
        </button>
      </div>
    </div>
  );
}
