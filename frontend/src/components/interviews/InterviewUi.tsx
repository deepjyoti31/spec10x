import type { ReactNode } from 'react';

export type InterviewUiStatus = 'done' | 'processing' | 'error' | 'low_insight';
export type InterviewFileIcon = 'description' | 'mic' | 'videocam';
export type InterviewPillTone = 'accent' | 'neutral' | 'success' | 'warning' | 'danger';

function cx(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(' ');
}

export const interviewSurfaceCardClassName = 'rounded-xl border border-[#1E2028] bg-[#161820]';
export const interviewInsetCardClassName =
  'rounded-xl border border-[rgba(255,255,255,0.06)] bg-[#191b22]';
export const interviewPrimaryButtonClassName =
  'rounded bg-[#afc6ff] px-4 py-2 text-xs font-bold text-[#002d6c] transition-all hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60';
export const interviewSecondaryButtonClassName =
  'rounded border border-[#1E2028] bg-[#161820] px-4 py-2 text-xs font-medium text-[#B0B2BA] transition-colors hover:bg-[#1E1F26] hover:text-[#F0F0F3] disabled:cursor-not-allowed disabled:opacity-60';

export function formatInterviewDate(value: string, includeTime = false): string {
  return new Intl.DateTimeFormat(
    'en',
    includeTime
      ? {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
          hour: 'numeric',
          minute: '2-digit',
        }
      : {
          month: 'short',
          day: 'numeric',
        }
  ).format(new Date(value));
}

export function formatInterviewDuration(durationSeconds?: number | null): string | null {
  if (!durationSeconds || durationSeconds <= 0) return null;
  const hours = Math.floor(durationSeconds / 3600);
  const minutes = Math.round((durationSeconds % 3600) / 60);
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes} min`;
}

export function getInterviewUiStatus(status: string): InterviewUiStatus {
  if (status === 'error') return 'error';
  if (status === 'processing' || status === 'queued' || status === 'transcribing' || status === 'analyzing') {
    return 'processing';
  }
  if (status === 'low_insight') return 'low_insight';
  return 'done';
}

export function getInterviewFileIcon(fileType: string): InterviewFileIcon {
  if (fileType === 'mp3' || fileType === 'wav') return 'mic';
  if (fileType === 'mp4') return 'videocam';
  return 'description';
}

export function getInterviewFileIconColor(
  fileType: string,
  status: InterviewUiStatus = 'done'
): string {
  if (status === 'error') return 'var(--color-danger)';
  if (status === 'processing') return '#5A5C66';
  if (fileType === 'txt' || fileType === 'md' || fileType === 'pdf' || fileType === 'docx') {
    return 'var(--color-accent)';
  }
  return '#8B8D97';
}

export function InterviewStatusBadge({
  status,
  className,
}: {
  status: InterviewUiStatus;
  className?: string;
}) {
  if (status === 'done') {
    return (
      <div
        className={cx('flex items-center gap-2 rounded-full px-3 py-1', className)}
        style={{
          backgroundColor: 'rgba(52,211,153,0.1)',
          border: '1px solid rgba(52,211,153,0.2)',
        }}
      >
        <div className="h-1.5 w-1.5 rounded-full bg-[#34D399]" />
        <span className="text-[11px] font-bold uppercase tracking-wider text-[#34D399]">Done</span>
      </div>
    );
  }

  if (status === 'processing') {
    return (
      <div
        className={cx('flex items-center gap-2 rounded-full px-3 py-1', className)}
        style={{
          backgroundColor: 'rgba(251,191,36,0.1)',
          border: '1px solid rgba(251,191,36,0.2)',
        }}
      >
        <span className="material-symbols-outlined text-[#FBBF24]" style={{ fontSize: 14 }}>
          pending
        </span>
        <span className="text-[11px] font-bold uppercase tracking-wider text-[#FBBF24]">
          Processing
        </span>
      </div>
    );
  }

  if (status === 'low_insight') {
    return (
      <div
        className={cx('flex items-center gap-2 rounded-full px-3 py-1', className)}
        style={{
          backgroundColor: 'rgba(251,191,36,0.1)',
          border: '1px solid rgba(251,191,36,0.2)',
        }}
      >
        <span className="material-symbols-outlined text-[#FBBF24]" style={{ fontSize: 14 }}>
          warning
        </span>
        <span className="text-[11px] font-bold uppercase tracking-wider text-[#FBBF24]">
          Low Insight
        </span>
      </div>
    );
  }

  return (
    <div
      className={cx('flex items-center gap-2 rounded-full px-3 py-1', className)}
      style={{
        backgroundColor: 'rgba(248,113,113,0.1)',
        border: '1px solid rgba(248,113,113,0.2)',
      }}
    >
      <span className="material-symbols-outlined text-[var(--color-danger)]" style={{ fontSize: 14 }}>
        error
      </span>
      <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--color-danger)]">
        Error
      </span>
    </div>
  );
}

export function InterviewFileIconTile({
  fileType,
  status = 'done',
  iconColor,
  className,
}: {
  fileType: string;
  status?: InterviewUiStatus;
  iconColor?: string;
  className?: string;
}) {
  return (
    <div
      className={cx('flex-shrink-0 rounded-lg p-2.5', className)}
      style={{
        backgroundColor: '#191b22',
        color: iconColor ?? getInterviewFileIconColor(fileType, status),
      }}
    >
      <span className="material-symbols-outlined" style={{ fontSize: 24 }}>
        {getInterviewFileIcon(fileType)}
      </span>
    </div>
  );
}

export function InterviewMetaRow({
  items,
  className,
}: {
  items: Array<string | null | undefined | false>;
  className?: string;
}) {
  const visibleItems = items.filter(Boolean) as string[];

  if (visibleItems.length === 0) {
    return null;
  }

  return (
    <div className={cx('flex flex-wrap items-center gap-3 text-[13px] text-[#5A5C66]', className)}>
      {visibleItems.map((item, index) => (
        <div key={`${item}-${index}`} className="flex items-center gap-3">
          {index > 0 ? <span className="h-1 w-1 rounded-full bg-[#2A2C38]" /> : null}
          <span>{item}</span>
        </div>
      ))}
    </div>
  );
}

export function InterviewInlineStateCard({
  title,
  body,
  actionLabel,
  onAction,
  tone = 'default',
  footer,
  className,
}: {
  title: string;
  body: string;
  actionLabel?: string;
  onAction?: () => void;
  tone?: 'default' | 'error';
  footer?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cx('rounded-xl p-6', className)}
      style={{
        backgroundColor: '#161820',
        border: `1px solid ${tone === 'error' ? 'rgba(248,113,113,0.12)' : '#1E2028'}`,
      }}
    >
      <h3 className="text-base font-semibold text-[#F0F0F3]">{title}</h3>
      <p className="mt-2 text-sm leading-6 text-[#8B8D97]">{body}</p>
      {actionLabel && onAction ? (
        <button
          type="button"
          onClick={onAction}
          className={cx(interviewSecondaryButtonClassName, 'mt-4')}
        >
          {actionLabel}
        </button>
      ) : null}
      {footer ? <div className="mt-4">{footer}</div> : null}
    </div>
  );
}

export function InterviewPill({
  label,
  tone = 'accent',
  className,
}: {
  label: string;
  tone?: InterviewPillTone;
  className?: string;
}) {
  const toneClasses: Record<InterviewPillTone, string> = {
    accent: 'bg-[rgba(175,198,255,0.1)] text-[var(--color-accent)]',
    neutral: 'bg-[rgba(255,255,255,0.06)] text-[#8B8D97]',
    success: 'bg-[rgba(52,211,153,0.1)] text-[#34D399]',
    warning: 'bg-[rgba(251,191,36,0.1)] text-[#FBBF24]',
    danger: 'bg-[rgba(248,113,113,0.1)] text-[var(--color-danger)]',
  };

  return (
    <span
      className={cx(
        'rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-tighter',
        toneClasses[tone],
        className
      )}
    >
      {label}
    </span>
  );
}
