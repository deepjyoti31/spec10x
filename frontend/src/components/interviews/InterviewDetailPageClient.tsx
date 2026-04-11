'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';

import {
  formatInterviewDate,
  formatInterviewDuration,
  getInterviewUiStatus,
  InterviewFileIconTile,
  InterviewInlineStateCard,
  InterviewMetaRow,
  InterviewPill,
  type InterviewPillTone,
  interviewInsetCardClassName,
  interviewPrimaryButtonClassName,
  interviewSecondaryButtonClassName,
  interviewSurfaceCardClassName,
  InterviewStatusBadge,
} from '@/components/interviews/InterviewUi';
import { useToast } from '@/components/ui/Toast';
import { useAuth } from '@/hooks/useAuth';
import { api, InterviewDetailResponse } from '@/lib/api';

function getCategoryMeta(category: string): { label: string; tone: InterviewPillTone } {
  if (category === 'pain_point') {
    return { label: 'Pain Point', tone: 'danger' };
  }
  if (category === 'feature_request') {
    return { label: 'Feature Request', tone: 'warning' };
  }
  if (category === 'positive') {
    return { label: 'Positive', tone: 'success' };
  }
  return { label: 'Suggestion', tone: 'accent' };
}

function SectionHeader({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string;
  title: string;
  description: string;
}) {
  return (
    <div className="border-b border-[#1E2028] pb-4">
      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#5A5C66]">
        {eyebrow}
      </p>
      <h2 className="mt-2 text-lg font-semibold text-[#F0F0F3]">{title}</h2>
      <p className="mt-1 text-sm leading-6 text-[#8B8D97]">{description}</p>
    </div>
  );
}

function LoadingState() {
  return (
    <div className="relative flex-1 overflow-y-auto bg-[#0F1117] p-8">
      <div className="flex w-full flex-col gap-3">
        <div className={`${interviewSurfaceCardClassName} h-36 animate-pulse`} />
        <div className="grid gap-3 lg:grid-cols-[1.15fr_0.85fr]">
          <div className={`${interviewSurfaceCardClassName} h-[560px] animate-pulse`} />
          <div className="space-y-3">
            <div className={`${interviewSurfaceCardClassName} h-[220px] animate-pulse`} />
            <div className={`${interviewSurfaceCardClassName} h-[320px] animate-pulse`} />
          </div>
        </div>
      </div>
    </div>
  );
}

export default function InterviewDetailPageClient() {
  const params = useParams<{ id: string }>();
  const { token } = useAuth();
  const { showToast } = useToast();
  const interviewIdParam = params?.id;
  const interviewId = typeof interviewIdParam === 'string' ? interviewIdParam : null;
  const [interview, setInterview] = useState<InterviewDetailResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    if (typeof token !== 'string' || typeof interviewId !== 'string') {
      setLoading(false);
      return;
    }

    const resolvedToken = token;
    const resolvedInterviewId = interviewId;
    let cancelled = false;

    async function loadInterview() {
      setLoading(true);
      setError(null);
      try {
        const nextInterview = await api.getInterview(resolvedToken, resolvedInterviewId);
        if (!cancelled) {
          setInterview(nextInterview);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load interview');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadInterview();

    return () => {
      cancelled = true;
    };
  }, [interviewId, token]);

  async function handleExport() {
    if (typeof token !== 'string' || typeof interviewId !== 'string') return;

    setExporting(true);
    try {
      const markdown = await api.exportInterview(token, interviewId);
      const blob = new Blob([markdown], { type: 'text/markdown;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = `${interview?.filename ?? 'interview'}.md`;
      anchor.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Export failed', 'error');
    } finally {
      setExporting(false);
    }
  }

  const interviewStatus = useMemo(
    () => (interview ? getInterviewUiStatus(interview.status) : 'done'),
    [interview]
  );

  if (loading) {
    return <LoadingState />;
  }

  if (error || !interview) {
    return (
      <div className="relative flex-1 overflow-y-auto bg-[#0F1117] p-8">
        <div className="w-full">
          <InterviewInlineStateCard
            tone="error"
            title="We could not load this interview"
            body={
              error ??
              'The selected interview no longer exists or is not available in this workspace.'
            }
            footer={
              <Link href="/interviews" className={interviewSecondaryButtonClassName}>
                Back to interviews
              </Link>
            }
          />
        </div>
      </div>
    );
  }

  const duration = formatInterviewDuration(interview.duration_seconds);
  const transcript = interview.transcript?.trim();
  const metaItems = [
    `Uploaded ${formatInterviewDate(interview.created_at, true)}`,
    duration || `${interview.file_type.toUpperCase()} file`,
    `${interview.speakers.length} speaker${interview.speakers.length === 1 ? '' : 's'}`,
  ];

  return (
    <div className="relative flex-1 overflow-y-auto bg-[#0F1117] p-8">
      <div className="flex w-full flex-col gap-3">
        <header className={`${interviewSurfaceCardClassName} p-6`}>
          <div className="flex flex-wrap items-start justify-between gap-6">
            <div className="flex min-w-0 flex-1 items-start gap-5">
              <InterviewFileIconTile
                fileType={interview.file_type}
                status={interviewStatus}
                className="mt-0.5"
              />
              <div className="min-w-0 flex-1">
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#5A5C66]">
                  Interview Detail
                </p>
                <div className="mt-3 flex flex-wrap items-center gap-3">
                  <h1 className="min-w-0 truncate text-3xl font-bold tracking-tight text-[#F0F0F3]">
                    {interview.filename}
                  </h1>
                  <InterviewStatusBadge status={interviewStatus} />
                </div>
                <InterviewMetaRow items={metaItems} className="mt-4" />
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Link href="/interviews" className={interviewSecondaryButtonClassName}>
                Back to interviews
              </Link>
              <button
                type="button"
                onClick={() => {
                  void handleExport();
                }}
                disabled={exporting}
                className={interviewPrimaryButtonClassName}
              >
                {exporting ? 'Exporting...' : 'Export markdown'}
              </button>
            </div>
          </div>
        </header>

        <div className="grid gap-3 lg:grid-cols-[1.15fr_0.85fr]">
          <section className={`${interviewSurfaceCardClassName} p-6`}>
            <SectionHeader
              eyebrow="Transcript"
              title="Full conversation"
              description="Read the source transcript behind the extracted insights and participant context."
            />

            {transcript ? (
              <div
                className={`${interviewInsetCardClassName} mt-5 whitespace-pre-wrap px-5 py-5 font-mono text-[13px] leading-7 text-[#D7D9E0]`}
              >
                {transcript}
              </div>
            ) : (
              <InterviewInlineStateCard
                className="mt-5"
                title="Transcript not available yet"
                body="This interview is missing transcript text right now, but the detail page is still ready for supporting metadata and extracted insights."
              />
            )}
          </section>

          <aside className="space-y-3">
            <section className={`${interviewSurfaceCardClassName} p-6`}>
              <SectionHeader
                eyebrow="Speakers"
                title="Participant roster"
                description="Review the detected people attached to this interview and the roles they were mapped to."
              />

              {interview.speakers.length > 0 ? (
                <div className="mt-5 space-y-3">
                  {interview.speakers.map((speaker) => (
                    <div key={speaker.id} className={`${interviewInsetCardClassName} px-4 py-4`}>
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex min-w-0 items-start gap-3">
                          <div
                            className="rounded-lg p-2.5 text-[#8B8D97]"
                            style={{ backgroundColor: '#161820' }}
                          >
                            <span className="material-symbols-outlined" style={{ fontSize: 20 }}>
                              person
                            </span>
                          </div>
                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold text-[#F0F0F3]">
                              {speaker.name || speaker.speaker_label}
                            </p>
                            <p className="mt-1 text-[13px] text-[#8B8D97]">
                              {speaker.role || speaker.speaker_label}
                              {speaker.company ? ` • ${speaker.company}` : ''}
                            </p>
                          </div>
                        </div>
                        <InterviewPill
                          label={speaker.is_interviewer ? 'Interviewer' : 'Speaker'}
                          tone={speaker.is_interviewer ? 'neutral' : 'accent'}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <InterviewInlineStateCard
                  className="mt-5"
                  title="No speakers available yet"
                  body="Speaker identities have not been attached to this interview yet."
                />
              )}
            </section>

            <section className={`${interviewSurfaceCardClassName} p-6`}>
              <SectionHeader
                eyebrow="Insights"
                title="Extracted evidence"
                description="Review the insight cards generated from this conversation in the same evidence style used across the library."
              />

              {interview.insights.length > 0 ? (
                <div className="mt-5 space-y-3">
                  {interview.insights.map((insight) => {
                    const category = getCategoryMeta(insight.category);
                    const confidence = Math.round(insight.confidence * 100);

                    return (
                      <article
                        key={insight.id}
                        className={`${interviewInsetCardClassName} px-4 py-4`}
                        style={{
                          opacity: insight.is_interviewer_voice ? 0.6 : 1,
                          borderLeft: insight.is_interviewer_voice
                            ? '3px solid rgba(251,146,60,0.4)'
                            : insight.provenance_label === 'review_recommended'
                            ? '3px solid rgba(175,198,255,0.3)'
                            : undefined,
                        }}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0 flex-1">
                            <h3 className="text-sm font-semibold text-[#F0F0F3]">
                              {insight.title}
                            </h3>
                            {insight.theme_suggestion ? (
                              <div className="mt-2">
                                <InterviewPill label={insight.theme_suggestion} />
                              </div>
                            ) : null}
                          </div>
                          <InterviewPill label={category.label} tone={category.tone} />
                        </div>

                        <p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-[#D7D9E0]">
                          "{insight.quote}"
                        </p>

                        {/* Provenance banner */}
                        {insight.is_interviewer_voice && (
                          <div
                            className="mt-3 flex items-center gap-2 rounded-md px-3 py-2 text-[11px]"
                            style={{ backgroundColor: 'rgba(251,146,60,0.08)', color: '#fb923c' }}
                            title={insight.provenance_reason ?? undefined}
                          >
                            <span className="material-symbols-outlined" style={{ fontSize: 14 }}>volume_off</span>
                            Likely from interviewer — excluded from themes
                          </div>
                        )}
                        {!insight.is_interviewer_voice && insight.provenance_label === 'review_recommended' && (
                          <div
                            className="mt-3 flex items-center gap-2 rounded-md px-3 py-2 text-[11px]"
                            style={{ backgroundColor: 'rgba(175,198,255,0.08)', color: '#afc6ff' }}
                            title={insight.provenance_reason ?? undefined}
                          >
                            <span className="material-symbols-outlined" style={{ fontSize: 14 }}>search</span>
                            May echo your product positioning — verify this is from the customer
                          </div>
                        )}

                        <InterviewMetaRow
                          items={[
                            `Confidence ${confidence}%`,
                            insight.sentiment ? `Sentiment ${insight.sentiment}` : null,
                          ]}
                          className="mt-4 text-xs uppercase tracking-[0.12em] text-[#8B8D97]"
                        />
                      </article>
                    );
                  })}
                </div>
              ) : (
                <InterviewInlineStateCard
                  className="mt-5"
                  title="No active insights yet"
                  body="This interview has not produced extracted insights yet."
                />
              )}
            </section>
          </aside>
        </div>
      </div>
    </div>
  );
}
