/**
 * Smoke-suite API fixtures (US-05-06-01).
 *
 * Shapes must stay in sync with the response types in `src/lib/api.ts` —
 * these are what the mocked backend returns for every page the smoke
 * suite visits.
 */

// ── Data sources catalog ─────────────────────────────────────────────────────

const now = '2026-07-12T08:00:00Z';

function dataSource(
  id: string,
  sourceType: string,
  provider: string,
  displayName: string,
  connectionMethod: string
) {
  return {
    id,
    source_type: sourceType,
    provider,
    display_name: displayName,
    connection_method: connectionMethod,
    is_active: true,
    created_at: now,
    updated_at: now,
  };
}

export const DATA_SOURCES = [
  dataSource('ds-zendesk', 'support', 'zendesk', 'Zendesk', 'api_token'),
  dataSource('ds-fireflies', 'interview', 'fireflies', 'Fireflies', 'api_token'),
  dataSource('ds-otter', 'interview', 'otter', 'Otter.ai', 'api_token'),
  dataSource('ds-posthog', 'analytics', 'posthog', 'PostHog', 'api_token'),
  dataSource('ds-csv', 'survey', 'csv_import', 'CSV Survey / NPS', 'csv_upload'),
];

// ── Source connections (one live Zendesk connection) ────────────────────────

export const SOURCE_CONNECTIONS = [
  {
    id: 'conn-zendesk-1',
    workspace_id: 'ws-1',
    created_by_user_id: 'e2e-smoke-user',
    status: 'connected',
    last_synced_at: '2026-07-12T07:30:00Z',
    last_error_summary: undefined,
    created_at: '2026-06-01T09:00:00Z',
    updated_at: '2026-07-12T07:30:00Z',
    data_source: DATA_SOURCES[0],
    total_records_synced: 128,
  },
];

// ── Survey import ────────────────────────────────────────────────────────────

export const SURVEY_HISTORY = {
  imports: [
    {
      id: 'imp-1',
      connection_id: 'conn-csv-1',
      import_name: 'nps_q2.csv',
      status: 'succeeded',
      started_at: '2026-07-01T10:00:00Z',
      finished_at: '2026-07-01T10:00:12Z',
      records_seen: 42,
      records_created: 42,
      records_updated: 0,
      records_unchanged: 0,
    },
  ],
};

export const SURVEY_VALIDATION = {
  valid: true,
  errors: [],
  warnings: ['2 rows are missing a score value'],
  preview_rows: [
    {
      response_text: 'The export flow is confusing on mobile',
      question: 'What can we improve?',
      submitted_at: '2026-07-01',
    },
    {
      response_text: 'Love the insights, want Slack alerts',
      question: 'What can we improve?',
      submitted_at: '2026-07-02',
    },
  ],
  total_rows: 5,
  columns_found: ['response_text', 'question', 'submitted_at', 'score'],
};

export const SURVEY_CONFIRM = {
  status: 'succeeded',
  import_name: 'smoke_survey.csv',
  connection_id: 'conn-csv-1',
  sync_run_id: 'run-csv-1',
  records_seen: 5,
  records_created: 5,
  records_updated: 0,
  records_unchanged: 0,
};

export const SURVEY_CSV_CONTENT = [
  'response_text,question,submitted_at,score',
  '"The export flow is confusing on mobile","What can we improve?",2026-07-01,4',
  '"Love the insights, want Slack alerts","What can we improve?",2026-07-02,9',
  '"Setup was quick","What can we improve?",2026-07-03,8',
  '"Search misses older interviews","What can we improve?",2026-07-05,5',
  '"Board helps our weekly triage","What can we improve?",2026-07-06,9',
].join('\n');

// ── Feed signals (mixed sources) ─────────────────────────────────────────────

export const FEED_SIGNALS = [
  {
    id: 'sig-interview-1',
    source_type: 'interview',
    source_label: 'Interview',
    provider: 'native_upload',
    provider_label: 'Native Upload',
    signal_kind: 'insight',
    signal_kind_label: 'Insight',
    occurred_at: '2026-07-11T10:00:00Z',
    title: 'Users get lost during onboarding',
    excerpt: 'I could not find where to invite my team after signup.',
    author_or_speaker: 'Dana P.',
    sentiment: 'negative',
    theme_chip: { id: 'theme-1', name: 'Onboarding confusion' },
    link: { kind: 'internal', href: '/interview/int-1', label: 'Open Interview' },
  },
  {
    id: 'sig-support-1',
    source_type: 'support',
    source_label: 'Support',
    provider: 'zendesk',
    provider_label: 'Zendesk',
    signal_kind: 'ticket',
    signal_kind_label: 'Ticket',
    occurred_at: '2026-07-10T09:00:00Z',
    title: 'Exports fail for large workspaces',
    excerpt: 'CSV export times out whenever we select more than 90 days.',
    author_or_speaker: 'Alex R.',
    sentiment: 'negative',
    theme_chip: { id: 'theme-2', name: 'Export failures' },
    link: {
      kind: 'external',
      href: 'https://example.zendesk.com/agent/tickets/123',
      label: 'Open in Zendesk',
    },
  },
  {
    id: 'sig-survey-1',
    source_type: 'survey',
    source_label: 'Survey',
    provider: 'csv_import',
    provider_label: 'CSV Import',
    signal_kind: 'survey_response',
    signal_kind_label: 'Survey Response',
    occurred_at: '2026-07-09T12:00:00Z',
    title: 'Mobile app feels slow',
    excerpt: 'Love the product but the mobile experience lags on load.',
    author_or_speaker: 'Anonymous',
    sentiment: 'neutral',
    theme_chip: { id: 'theme-3', name: 'Mobile performance' },
    link: null,
  },
  {
    id: 'sig-analytics-1',
    source_type: 'analytics',
    source_label: 'Analytics',
    provider: 'posthog',
    provider_label: 'PostHog',
    signal_kind: 'metric_window',
    signal_kind_label: 'Metric Window',
    occurred_at: '2026-07-06T00:00:00Z',
    title: 'Weekly usage: export_clicked fell 18%',
    excerpt: 'export_clicked was seen 410 times this week, down from 500 the week before.',
    author_or_speaker: undefined,
    sentiment: undefined,
    theme_chip: null,
    link: {
      kind: 'external',
      href: 'https://us.posthog.com/project/1/events',
      label: 'Open in PostHog',
    },
  },
];

export const FEED_DETAILS: Record<string, unknown> = Object.fromEntries(
  FEED_SIGNALS.map((signal) => [
    signal.id,
    {
      ...signal,
      content_text: `${signal.excerpt}\n\nFull evidence context for the ${signal.source_label} signal used by the smoke suite.`,
      metadata_json: { smoke_fixture: 'true' },
    },
  ])
);

// ── Board themes ─────────────────────────────────────────────────────────────

function boardTheme(
  id: string,
  name: string,
  priorityState: string,
  impactScore: number,
  evidence: (typeof FEED_SIGNALS)[number]
) {
  return {
    id,
    name,
    description: `${name} — smoke fixture theme`,
    mention_count: 18,
    sentiment_positive: 0.1,
    sentiment_neutral: 0.3,
    sentiment_negative: 0.6,
    is_new: false,
    status: 'active',
    priority_state: priorityState,
    impact_score: impactScore,
    created_at: '2026-06-15T09:00:00Z',
    impact_breakdown: {
      total: impactScore,
      frequency: 30.5,
      negative: 18.0,
      recency: 14.2,
      source_diversity: 10.0,
    },
    source_breakdown: [
      { source_type: 'interview', label: 'Interview', count: 9 },
      { source_type: 'support', label: 'Support', count: 6 },
      { source_type: 'survey', label: 'Survey', count: 3 },
    ],
    evidence_preview: [evidence],
    trend: {
      direction: 'rising',
      recent_count: 12,
      previous_count: 5,
      window_days: 14,
    },
    score_change: {
      delta: 6.2,
      previous_total: impactScore - 6.2,
      frequency_delta: 2.5,
      negative_delta: 1.7,
      recency_delta: 1.2,
      source_diversity_delta: 0.8,
      window_days: 14,
      explanation: 'Score rose mainly on new negative support evidence in the last 14 days.',
    },
  };
}

export const BOARD_THEMES = [
  boardTheme('theme-1', 'Onboarding confusion', 'pinned', 82.4, FEED_SIGNALS[0]),
  boardTheme('theme-2', 'Export failures', 'default', 74.1, FEED_SIGNALS[1]),
  boardTheme('theme-3', 'Mobile performance', 'monitoring', 51.8, FEED_SIGNALS[2]),
];

// ── Home dashboard ───────────────────────────────────────────────────────────

export const HOME_DASHBOARD = {
  has_data: true,
  stats: {
    interviews_total: 24,
    interviews_this_week: 3,
    active_themes_total: 8,
    new_themes_this_week: 2,
    signals_total: 156,
    active_source_type_count: 3,
    average_impact_score: 64.2,
    average_impact_delta: 3.1,
  },
  active_priorities: [
    {
      id: 'theme-1',
      name: 'Onboarding confusion',
      impact_score: 82.4,
      trend: 'up',
      primary_count_label: '32 mentions',
      source_summary_label: 'Interviews · Support · Survey',
      priority_band: 'high',
    },
    {
      id: 'theme-2',
      name: 'Export failures',
      impact_score: 74.1,
      trend: 'up',
      primary_count_label: '21 mentions',
      source_summary_label: 'Support · Analytics',
      priority_band: 'med',
    },
  ],
  recent_activity: [
    {
      kind: 'sync',
      title: 'Zendesk sync completed',
      subtitle: '12 new tickets imported',
      occurred_at: '2026-07-12T07:30:00Z',
      href: '/integrations',
      tone: 'success',
    },
  ],
  emerging_trends: [
    {
      id: 'theme-2',
      name: 'Export failures',
      velocity_delta: 40,
      sparkline_points: [1, 2, 3, 5, 8],
      href: '/insights?theme=theme-2',
    },
  ],
};
