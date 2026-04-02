'use client';

import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type ReactNode,
} from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';

import {
  formatInterviewDate,
  formatInterviewDuration,
  getInterviewFileIconColor,
  getInterviewUiStatus,
  InterviewFileIcon,
  InterviewFileIconTile,
  InterviewInlineStateCard,
  InterviewPill,
  interviewPrimaryButtonClassName,
  InterviewStatusBadge,
} from '@/components/interviews/InterviewUi';
import { useToast } from '@/components/ui/Toast';
import { INTERVIEW_UPLOAD_ACCEPT, useInterviews } from '@/hooks/useInterviews';
import { useWebSocket } from '@/hooks/useWebSocket';
import type {
  InterviewLibraryDisplayStatus,
  InterviewLibraryItemResponse,
  InterviewLibrarySort,
} from '@/lib/api';

type InterviewStatus = 'done' | 'processing' | 'error';
type FileIcon = InterviewFileIcon;
type FilterMenu = 'sort' | 'status' | 'source' | null;

interface Interview {
  id: string;
  icon: FileIcon;
  fileType: string;
  iconColor: string;
  title: string;
  syncedFrom?: string;
  participant: string;
  date: string;
  duration?: string;
  insights: number;
  tags: string[];
  status: InterviewStatus;
  processingPct?: number;
}

const SORT_OPTIONS: Array<{ value: InterviewLibrarySort; label: string }> = [
  { value: 'recent', label: 'Recent first' },
  { value: 'oldest', label: 'Oldest first' },
  { value: 'name', label: 'By name' },
  { value: 'insights', label: 'By insights' },
  { value: 'themes', label: 'By themes' },
];

const STATUS_OPTIONS: Array<{ value: InterviewLibraryDisplayStatus; label: string }> = [
  { value: 'done', label: 'Done' },
  { value: 'processing', label: 'Processing' },
  { value: 'error', label: 'Error' },
  { value: 'low_insight', label: 'Low insight' },
];

const PROCESSING_STATUS_PROGRESS: Record<string, number> = {
  queued: 18,
  transcribing: 52,
  analyzing: 78,
};

const VALID_SORTS = new Set<InterviewLibrarySort>(['recent', 'oldest', 'name', 'insights', 'themes']);
const VALID_STATUSES = new Set<InterviewLibraryDisplayStatus>([
  'done',
  'processing',
  'error',
  'low_insight',
]);

function isSort(value: string | null): value is InterviewLibrarySort {
  return Boolean(value && VALID_SORTS.has(value as InterviewLibrarySort));
}

function isStatus(value: string | null): value is InterviewLibraryDisplayStatus {
  return Boolean(value && VALID_STATUSES.has(value as InterviewLibraryDisplayStatus));
}

function buildHref(pathname: string, params: URLSearchParams): string {
  const query = params.toString();
  return query ? `${pathname}?${query}` : pathname;
}

function formatBytes(bytes: number): string {
  if (bytes >= 1024 * 1024 * 1024) {
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
  }
  if (bytes >= 1024 * 1024) {
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }
  if (bytes >= 1024) {
    return `${Math.round(bytes / 1024)} KB`;
  }
  return `${bytes} B`;
}

function formatInterviewCount(count: number): string {
  return `${count} interview${count === 1 ? '' : 's'}`;
}

function getProcessingPct(
  item: InterviewLibraryItemResponse,
  progressById: Record<string, number>
): number | undefined {
  if (item.display_status !== 'processing') return undefined;

  const liveProgress = progressById[item.id];
  if (typeof liveProgress === 'number') {
    return Math.max(8, Math.min(100, Math.round(liveProgress)));
  }

  return PROCESSING_STATUS_PROGRESS[item.raw_status] ?? 45;
}

function mapInterviewItem(
  item: InterviewLibraryItemResponse,
  progressById: Record<string, number>
): Interview {
  const status = getInterviewUiStatus(item.display_status);

  return {
    id: item.id,
    icon: item.file_type === 'mp3' || item.file_type === 'wav' ? 'mic' : item.file_type === 'mp4' ? 'videocam' : 'description',
    fileType: item.file_type,
    iconColor: getInterviewFileIconColor(item.file_type, status),
    title: item.filename,
    syncedFrom: item.source_provider !== 'native_upload' ? item.source_label : undefined,
    participant: item.participant_summary ?? '',
    date: formatInterviewDate(item.created_at),
    duration: formatInterviewDuration(item.duration_seconds) ?? undefined,
    insights: item.display_status === 'error' ? 0 : item.insights_count,
    tags: item.display_status === 'done' ? item.theme_chips.slice(0, 3).map((chip) => chip.name) : [],
    status,
    processingPct: getProcessingPct(item, progressById),
  };
}

function getSortLabel(sort: InterviewLibrarySort): string {
  return SORT_OPTIONS.find((option) => option.value === sort)?.label ?? 'Recent first';
}

function getStatusLabel(status: InterviewLibraryDisplayStatus | null): string {
  if (!status) return 'All statuses';
  return STATUS_OPTIONS.find((option) => option.value === status)?.label ?? 'All statuses';
}

function StatusBadge({ status }: { status: InterviewStatus }) {
  return <InterviewStatusBadge status={status} />;
}

function FilterDropdown({
  label,
  value,
  open,
  onToggle,
  children,
}: {
  label: string;
  value: string;
  open: boolean;
  onToggle: () => void;
  children: ReactNode;
}) {
  return (
    <div className="relative flex-shrink-0" data-filter-menu-root="true">
      <button
        type="button"
        aria-expanded={open}
        onClick={onToggle}
        className="h-full rounded-xl px-3 text-xs font-medium text-[#8B8D97] transition-colors"
        style={{ backgroundColor: '#161820', border: '1px solid #1E2028' }}
        onMouseEnter={(event) => {
          event.currentTarget.style.borderColor = '#2A2C38';
        }}
        onMouseLeave={(event) => {
          event.currentTarget.style.borderColor = open ? 'rgba(175,198,255,0.4)' : '#1E2028';
        }}
      >
        <span className="flex items-center gap-2">
          <span>{label}:</span>
          <span className="text-[#c8cad6]">{value}</span>
          <span className="material-symbols-outlined" style={{ fontSize: 16 }}>
            expand_more
          </span>
        </span>
      </button>
      {open ? (
        <div
          className="absolute right-0 top-full z-30 mt-2 min-w-[220px] overflow-hidden rounded-xl"
          style={{
            backgroundColor: '#161820',
            border: '1px solid #1E2028',
            boxShadow: '0 18px 45px rgba(0,0,0,0.35)',
          }}
        >
          <div className="py-1">{children}</div>
        </div>
      ) : null}
    </div>
  );
}

function FilterOption({
  selected,
  onClick,
  label,
  meta,
}: {
  selected: boolean;
  onClick: () => void;
  label: string;
  meta?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center justify-between gap-3 px-4 py-2.5 text-left text-sm text-[#c8cad6] transition-colors hover:bg-[#1E2028]"
    >
      <span>{label}</span>
      <span className="flex items-center gap-2">
        {meta ? <span className="text-xs text-[#5A5C66]">{meta}</span> : null}
        {selected ? (
          <span className="material-symbols-outlined text-[var(--color-accent)]" style={{ fontSize: 16 }}>
            check
          </span>
        ) : null}
      </span>
    </button>
  );
}

function InlineStateCard({
  title,
  body,
  actionLabel,
  onAction,
  tone = 'default',
}: {
  title: string;
  body: string;
  actionLabel?: string;
  onAction?: () => void;
  tone?: 'default' | 'error';
}) {
  return (
    <InterviewInlineStateCard
      title={title}
      body={body}
      actionLabel={actionLabel}
      onAction={onAction}
      tone={tone}
    />
  );
}

function InterviewRow({
  interview,
  checked,
  onCheck,
  onOpen,
  onRetry,
  retrying,
}: {
  interview: Interview;
  checked: boolean;
  onCheck: (id: string) => void;
  onOpen: (id: string) => void;
  onRetry: (id: string) => void;
  retrying: boolean;
}) {
  const isProcessing = interview.status === 'processing';
  const isError = interview.status === 'error';

  return (
    <div
      role="button"
      tabIndex={0}
      className="flex cursor-pointer items-center rounded-xl p-5 transition-all"
      style={{
        backgroundColor: '#161820',
        border: `1px solid ${isError ? 'rgba(248,113,113,0.1)' : '#1E2028'}`,
        opacity: isProcessing ? 0.7 : 1,
      }}
      onClick={() => onOpen(interview.id)}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          onOpen(interview.id);
        }
      }}
      onMouseEnter={(event) => {
        if (!isProcessing) {
          const element = event.currentTarget as HTMLElement;
          element.style.borderColor = isError ? 'rgba(255,180,171,0.3)' : 'rgba(175,198,255,0.3)';
          element.style.backgroundColor = '#1E1F26';
        }
      }}
      onMouseLeave={(event) => {
        const element = event.currentTarget as HTMLElement;
        element.style.borderColor = isError ? 'rgba(248,113,113,0.1)' : '#1E2028';
        element.style.backgroundColor = '#161820';
      }}
    >
      <input
        type="checkbox"
        disabled={isProcessing}
        checked={checked}
        onChange={() => onCheck(interview.id)}
        onClick={(event) => event.stopPropagation()}
        className="mr-6 h-4 w-4 flex-shrink-0 rounded"
        style={{
          accentColor: 'var(--color-accent)',
          opacity: isProcessing ? 0.3 : 1,
          cursor: isProcessing ? 'not-allowed' : 'pointer',
        }}
      />

      <InterviewFileIconTile
        fileType={interview.fileType}
        status={interview.status}
        iconColor={interview.iconColor}
        className="mr-5"
      />

      <div className="min-w-0 flex-1">
        <div className="mb-1 flex items-center gap-3">
          <h3 className="truncate text-[15px] font-semibold text-[#F0F0F3]">{interview.title}</h3>
          {interview.syncedFrom ? (
            <span
              className="rounded px-2 py-0.5 text-[10px] font-medium text-[#8B8D97]"
              style={{ backgroundColor: 'rgba(51,52,59,0.5)' }}
            >
              Synced from {interview.syncedFrom}
            </span>
          ) : null}
        </div>
        <div className="flex items-center gap-3 text-[13px] text-[#5A5C66]">
          {interview.participant ? (
            <>
              <span className="flex items-center gap-1.5">{interview.participant}</span>
              <span className="h-1 w-1 rounded-full bg-[#2A2C38]" />
            </>
          ) : null}
          <span>{interview.date}</span>
          {interview.duration ? (
            <>
              <span className="h-1 w-1 rounded-full bg-[#2A2C38]" />
              <span>{interview.duration}</span>
            </>
          ) : null}
        </div>
      </div>

      {interview.status === 'done' ? (
        <div className="mr-12 flex items-center gap-8">
          <div className="flex flex-col text-right">
            <span className="text-xs font-semibold text-[#c8cad6]">{interview.insights} insights</span>
            <span className="text-[10px] uppercase tracking-widest text-[#5A5C66]">Analysis</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {interview.tags.map((tag) => (
              <InterviewPill key={tag} label={tag} />
            ))}
          </div>
        </div>
      ) : null}

      {interview.status === 'processing' ? (
        <div
          className="mr-12 w-48 flex-shrink-0 overflow-hidden rounded-full"
          style={{ backgroundColor: '#191b22', height: 6 }}
        >
          <div
            className="h-full rounded-full animate-pulse"
            style={{ backgroundColor: '#FBBF24', width: `${interview.processingPct ?? 45}%` }}
          />
        </div>
      ) : null}

      {interview.status === 'error' ? (
        <div className="mr-12">
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              onRetry(interview.id);
            }}
            disabled={retrying}
            className="text-xs font-medium text-[var(--color-danger)] hover:underline disabled:cursor-not-allowed disabled:opacity-60"
          >
            {retrying ? 'Retrying...' : 'Retry Analysis'}
          </button>
        </div>
      ) : null}

      <StatusBadge status={interview.status} />
    </div>
  );
}

function BulkActionsBar({
  count,
  busy,
  onReanalyze,
  onDelete,
}: {
  count: number;
  busy: boolean;
  onReanalyze: () => void;
  onDelete: () => void;
}) {
  return (
    <div
      className="fixed bottom-10 left-1/2 z-[100] flex h-14 -translate-x-1/2 items-center justify-between gap-12 rounded-2xl px-6 shadow-2xl"
      style={{
        background: 'rgba(30,31,38,0.7)',
        backdropFilter: 'blur(12px)',
        border: '1px solid #1E2028',
        minWidth: 500,
      }}
    >
      <div className="flex items-center gap-2">
        <span
          className="flex h-5 w-5 items-center justify-center rounded text-[10px] font-bold text-[#c8cad6]"
          style={{ backgroundColor: '#33343b' }}
        >
          {count}
        </span>
        <span className="text-xs font-medium text-[#c8cad6]">selected</span>
      </div>
      <div className="flex items-center gap-3">
        <button
          type="button"
          disabled={busy || count === 0}
          onClick={onReanalyze}
          className="flex h-9 items-center gap-2 px-4 text-xs font-semibold text-[#c8cad6] transition-colors hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
        >
          <span className="material-symbols-outlined" style={{ fontSize: 16 }}>
            auto_fix_high
          </span>
          Re-analyze
        </button>
        <button
          type="button"
          disabled
          className="flex h-9 items-center gap-2 px-4 text-xs font-semibold text-[#c8cad6] opacity-50"
        >
          <span className="material-symbols-outlined" style={{ fontSize: 16 }}>
            folder_open
          </span>
          Add to Collection
          <span className="material-symbols-outlined" style={{ fontSize: 16 }}>
            expand_more
          </span>
        </button>
        <div className="h-4 w-px bg-[#1E2028]" />
        <button
          type="button"
          disabled={busy || count === 0}
          onClick={onDelete}
          className="flex h-9 items-center gap-2 rounded-lg px-4 text-xs font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50"
          style={{ color: 'var(--color-danger)' }}
          onMouseEnter={(event) => {
            if (!event.currentTarget.disabled) {
              event.currentTarget.style.backgroundColor = 'rgba(248,113,113,0.05)';
            }
          }}
          onMouseLeave={(event) => {
            event.currentTarget.style.backgroundColor = 'transparent';
          }}
        >
          <span className="material-symbols-outlined" style={{ fontSize: 16 }}>
            delete
          </span>
          Delete
        </button>
      </div>
    </div>
  );
}

export default function InterviewsPage() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const searchParamsKey = searchParams.toString();
  const uploadInputRef = useRef<HTMLInputElement | null>(null);
  const websocketRefreshTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { showToast } = useToast();
  const { lastMessage } = useWebSocket(true);

  const q = searchParams.get('q') ?? '';
  const sort = isSort(searchParams.get('sort'))
    ? (searchParams.get('sort') as InterviewLibrarySort)
    : 'recent';
  const status = isStatus(searchParams.get('status'))
    ? (searchParams.get('status') as InterviewLibraryDisplayStatus)
    : null;
  const source = searchParams.get('source') ?? null;

  const [searchValue, setSearchValue] = useState(q);
  const [openMenu, setOpenMenu] = useState<FilterMenu>(null);
  const [retryingId, setRetryingId] = useState<string | null>(null);
  const [processingProgress, setProcessingProgress] = useState<Record<string, number>>({});

  const {
    library,
    loading,
    error,
    selectedIds,
    mutationKind,
    uploading,
    toggleSelection,
    clearSelection,
    refetch,
    uploadFiles,
    reanalyzeInterview,
    bulkReanalyze,
    bulkDelete,
  } = useInterviews({ q, sort, status, source });

  useEffect(() => {
    setSearchValue(q);
  }, [q]);

  useEffect(() => {
    if (!openMenu) return;

    function handlePointerDown(event: MouseEvent) {
      const target = event.target as HTMLElement | null;
      if (target?.closest('[data-filter-menu-root="true"]')) return;
      setOpenMenu(null);
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setOpenMenu(null);
      }
    }

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [openMenu]);

  const updateSearchParams = useCallback(
    (mutate: (params: URLSearchParams) => void, mode: 'push' | 'replace' = 'push') => {
      const nextParams = new URLSearchParams(searchParamsKey);
      mutate(nextParams);
      const href = buildHref(pathname, nextParams);
      setOpenMenu(null);
      if (mode === 'replace') {
        router.replace(href, { scroll: false });
        return;
      }
      router.push(href, { scroll: false });
    },
    [pathname, router, searchParamsKey]
  );

  useEffect(() => {
    if (searchValue === q) return;

    const timer = setTimeout(() => {
      updateSearchParams((params) => {
        const nextValue = searchValue.trim();
        if (nextValue) {
          params.set('q', nextValue);
        } else {
          params.delete('q');
        }
      }, 'replace');
    }, 250);

    return () => clearTimeout(timer);
  }, [q, searchValue, updateSearchParams]);

  useEffect(() => {
    return () => {
      if (websocketRefreshTimer.current) {
        clearTimeout(websocketRefreshTimer.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!lastMessage?.interview_id || !lastMessage.status) return;

    setProcessingProgress((prev) => {
      const next = { ...prev };

      if (lastMessage.status === 'done' || lastMessage.status === 'error') {
        delete next[lastMessage.interview_id];
        return next;
      }

      next[lastMessage.interview_id] =
        typeof lastMessage.progress === 'number'
          ? lastMessage.progress
          : PROCESSING_STATUS_PROGRESS[lastMessage.status] ?? 45;

      return next;
    });

    if (websocketRefreshTimer.current) {
      clearTimeout(websocketRefreshTimer.current);
    }

    websocketRefreshTimer.current = setTimeout(() => {
      void refetch();
    }, 400);
  }, [lastMessage, refetch]);

  const interviews = useMemo(
    () => library?.items.map((item) => mapInterviewItem(item, processingProgress)) ?? [],
    [library, processingProgress]
  );

  const hasFilters = Boolean(q || sort !== 'recent' || status || source);
  const isBusy = mutationKind === 'upload' || mutationKind === 'reanalyze' || mutationKind === 'delete';
  const sourceOptions = library?.summary.available_sources ?? [];
  const selectedSourceLabel = source
    ? sourceOptions.find((option) => option.provider === source)?.label ?? source
    : 'All sources';
  const interviewCountLabel = library
    ? hasFilters && library.summary.filtered_count !== library.summary.total_count
      ? `${library.summary.filtered_count} of ${library.summary.total_count} interviews`
      : formatInterviewCount(library.summary.total_count)
    : 'Loading interviews...';
  const storageUsageLabel = library
    ? `${formatBytes(library.summary.storage_bytes_used)} of ${formatBytes(
        library.summary.storage_bytes_limit
      )} used`
    : 'Loading storage...';

  async function handleUploadSelection(event: ChangeEvent<HTMLInputElement>) {
    const files = event.target.files ? Array.from(event.target.files) : [];
    event.target.value = '';

    if (files.length === 0) return;

    try {
      const result = await uploadFiles(files);

      if (result.createdIds.length > 0) {
        showToast(
          `Queued ${result.createdIds.length} interview${result.createdIds.length === 1 ? '' : 's'} for processing`,
          'success'
        );
      }

      if (result.failedFiles.length > 0) {
        const firstFailure = result.failedFiles[0];
        showToast(
          `${result.failedFiles.length} file${result.failedFiles.length === 1 ? '' : 's'} failed. ${firstFailure.name}: ${firstFailure.error}`,
          result.createdIds.length > 0 ? 'warning' : 'error'
        );
      }
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Upload failed', 'error');
    }
  }

  async function handleRetry(id: string) {
    const interview = library?.items.find((item) => item.id === id);
    setRetryingId(id);

    try {
      await reanalyzeInterview(id);
      showToast(
        `Re-analysis queued for ${interview?.filename ?? 'the selected interview'}`,
        'success'
      );
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to retry analysis', 'error');
    } finally {
      setRetryingId(null);
    }
  }

  async function handleBulkReanalyze() {
    if (selectedIds.size === 0) return;

    try {
      const result = await bulkReanalyze();
      if (result.success_count > 0) {
        showToast(
          `Queued ${result.success_count} interview${result.success_count === 1 ? '' : 's'} for re-analysis`,
          'success'
        );
      }
      if (result.failed_count > 0) {
        showToast(
          `${result.failed_count} interview${result.failed_count === 1 ? '' : 's'} skipped. ${result.failures[0]?.error ?? 'Try again.'}`,
          'warning'
        );
      }
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to re-analyze interviews', 'error');
    }
  }

  async function handleBulkDelete() {
    if (selectedIds.size === 0) return;

    const confirmed = window.confirm(
      `Delete ${selectedIds.size} interview${selectedIds.size === 1 ? '' : 's'}? This removes their transcript, insights, and theme contributions.`
    );
    if (!confirmed) return;

    try {
      const result = await bulkDelete();
      if (result.success_count > 0) {
        showToast(
          `Deleted ${result.success_count} interview${result.success_count === 1 ? '' : 's'}`,
          'success'
        );
      }
      if (result.failed_count > 0) {
        showToast(
          `${result.failed_count} interview${result.failed_count === 1 ? '' : 's'} could not be deleted. ${result.failures[0]?.error ?? 'Try again.'}`,
          'warning'
        );
      }
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to delete interviews', 'error');
    }
  }

  function renderListContent() {
    if (!library && loading) {
      return (
        <InlineStateCard
          title="Loading interviews"
          body="Pulling your latest interview library and storage usage."
        />
      );
    }

    if (!library && error) {
      return (
        <InlineStateCard
          tone="error"
          title="We could not load the interview library"
          body={error}
          actionLabel="Retry"
          onAction={() => {
            void refetch();
          }}
        />
      );
    }

    if (!library) {
      return null;
    }

    if (!library.summary.has_data) {
      return (
        <InlineStateCard
          title="No interviews yet"
          body="Use the Upload button to add your first transcript, recording, or video."
        />
      );
    }

    if (interviews.length === 0) {
      return (
        <InlineStateCard
          title="No interviews match this view"
          body="Try adjusting the current search or filters to bring interviews back into view."
          actionLabel="Clear filters"
          onAction={() => {
            clearSelection();
            router.push('/interviews');
          }}
        />
      );
    }

    return interviews.map((interview) => (
      <InterviewRow
        key={interview.id}
        interview={interview}
        checked={selectedIds.has(interview.id)}
        onCheck={toggleSelection}
        onOpen={(id) => router.push(`/interview/${id}`)}
        onRetry={(id) => {
          void handleRetry(id);
        }}
        retrying={retryingId === interview.id}
      />
    ));
  }

  return (
    <>
      <div className="relative flex-1 overflow-y-auto p-8" style={{ backgroundColor: '#0F1117' }}>
        <input
          ref={uploadInputRef}
          type="file"
          multiple
          accept={INTERVIEW_UPLOAD_ACCEPT}
          className="hidden"
          onChange={handleUploadSelection}
        />

        <div className="mb-10 flex items-start justify-between">
          <div>
            <h1 className="mb-1 text-3xl font-bold tracking-tight text-[#F0F0F3]">Interviews</h1>
            <p className="flex items-center gap-2 text-sm text-[#8B8D97]">
              <span>{interviewCountLabel}</span>
              <span className="h-1 w-1 rounded-full bg-[#424753]" />
              <span>{storageUsageLabel}</span>
            </p>
          </div>
          <button
            type="button"
            disabled={uploading}
            onClick={() => uploadInputRef.current?.click()}
            className={`${interviewPrimaryButtonClassName} flex items-center gap-2`}
          >
            <span className="material-symbols-outlined" style={{ fontSize: 20 }}>
              upload
            </span>
            {uploading ? 'Uploading...' : 'Upload'}
          </button>
        </div>

        <div className="mb-8 flex h-10 items-center gap-3">
          <div className="relative h-full max-w-md flex-1">
            <span
              className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[#5A5C66]"
              style={{ fontSize: 16 }}
            >
              search
            </span>
            <input
              type="text"
              value={searchValue}
              placeholder="Filter interviews..."
              className="h-full w-full rounded-xl pl-10 pr-4 text-sm outline-none transition-colors"
              style={{
                backgroundColor: '#161820',
                border: '1px solid #1E2028',
                color: '#F0F0F3',
              }}
              onChange={(event) => setSearchValue(event.target.value)}
              onFocus={(event) => {
                event.currentTarget.style.borderColor = 'rgba(175,198,255,0.4)';
              }}
              onBlur={(event) => {
                event.currentTarget.style.borderColor = '#1E2028';
              }}
            />
          </div>

          <FilterDropdown
            label="Sort"
            value={getSortLabel(sort)}
            open={openMenu === 'sort'}
            onToggle={() => setOpenMenu((current) => (current === 'sort' ? null : 'sort'))}
          >
            {SORT_OPTIONS.map((option) => (
              <FilterOption
                key={option.value}
                selected={sort === option.value}
                label={option.label}
                onClick={() =>
                  updateSearchParams((params) => {
                    if (option.value === 'recent') {
                      params.delete('sort');
                    } else {
                      params.set('sort', option.value);
                    }
                  })
                }
              />
            ))}
          </FilterDropdown>

          <FilterDropdown
            label="Status"
            value={getStatusLabel(status)}
            open={openMenu === 'status'}
            onToggle={() => setOpenMenu((current) => (current === 'status' ? null : 'status'))}
          >
            <FilterOption
              selected={!status}
              label="All statuses"
              onClick={() =>
                updateSearchParams((params) => {
                  params.delete('status');
                })
              }
            />
            {STATUS_OPTIONS.map((option) => (
              <FilterOption
                key={option.value}
                selected={status === option.value}
                label={option.label}
                onClick={() =>
                  updateSearchParams((params) => {
                    params.set('status', option.value);
                  })
                }
              />
            ))}
          </FilterDropdown>

          <FilterDropdown
            label="Source"
            value={selectedSourceLabel}
            open={openMenu === 'source'}
            onToggle={() => setOpenMenu((current) => (current === 'source' ? null : 'source'))}
          >
            <FilterOption
              selected={!source}
              label="All sources"
              onClick={() =>
                updateSearchParams((params) => {
                  params.delete('source');
                })
              }
            />
            {sourceOptions.length > 0 ? (
              sourceOptions.map((option) => (
                <FilterOption
                  key={option.provider}
                  selected={source === option.provider}
                  label={option.label}
                  meta={`${option.count}`}
                  onClick={() =>
                    updateSearchParams((params) => {
                      params.set('source', option.provider);
                    })
                  }
                />
              ))
            ) : (
              <div className="px-4 py-2.5 text-sm text-[#5A5C66]">No sources available</div>
            )}
          </FilterDropdown>
        </div>

        <div className="space-y-3 pb-24">
          {error && library ? (
            <InlineStateCard
              tone="error"
              title="Refresh failed"
              body={`${error} Showing the most recent library data instead.`}
              actionLabel="Retry"
              onAction={() => {
                void refetch();
              }}
            />
          ) : null}

          {renderListContent()}
        </div>
      </div>

      <BulkActionsBar
        count={selectedIds.size}
        busy={isBusy}
        onReanalyze={() => {
          void handleBulkReanalyze();
        }}
        onDelete={() => {
          void handleBulkDelete();
        }}
      />
    </>
  );
}
