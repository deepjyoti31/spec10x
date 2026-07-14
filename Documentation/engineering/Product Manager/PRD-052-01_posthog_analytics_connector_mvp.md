# PRD-052-01: PostHog Analytics Connector MVP

> Release: `v0.52`
> Status: Drafted July 9, 2026 — implementation landed in the same pass
> Owner: Project maintainers
> Parent plan: `Documentation/engineering/v0.5_planning.md` § 5.3
> Tracker: `Documentation/engineering/Product Manager/v0.5_project_tracker.md`
> Covers: `EPIC-052-01` (analytics source extension) and `EPIC-052-02` (first analytics connector)

---

## 1. Problem

Spec10x can already combine interviews, support tickets, and survey responses, but it cannot yet show what users *do* alongside what they *say*. PMs keep switching to their analytics tool to sanity-check whether a complaint matches real usage. The `v0.52` promise is:

> "Spec10x can now connect product behavior with customer language."

## 2. Provider Decision

Decision, July 9, 2026: **PostHog is the first analytics connector.**

Decision rule (same rule that chose Zendesk and Fireflies): pick the provider with the lowest-friction, fully self-serve public API path.

- PostHog personal API keys are self-serve, read-only-capable, and revocable by the user
- The Query API accepts one bounded HogQL aggregate query — no pagination cursors, no export jobs
- Open-source and generous free tier make it easy for pilot users to try
- Mixpanel and Amplitude remain later candidates; nothing in the signal model is PostHog-specific

## 3. The Core Modeling Decision: Metric Windows, Not Events

Approved in `signals` v1 (`D-05-02`): analytics maps to **one signal per normalized metric window, never raw event payloads**.

For `v0.52` the metric window is:

- **weekly event count** per event name (`metric = weekly_event_count`, `unit = events`)
- windows are Monday-aligned UTC weeks
- only the top `max_events` events by volume are tracked (default 20, hard cap 50)
- backfill window is `backfill_weeks` (default 12, hard cap 26)

Why this cut:

- weekly windows are stable enough to reason about and small enough to stay idempotent
- an event × week grid is bounded: a default sync produces at most 240 rows, ever
- raw event ingestion would blow up storage, trust, and the feed's readability at once

## 4. Signal Shape

Each window becomes one `signals` row:

| Field | Value |
|---|---|
| `source_type` / `provider` | `analytics` / `posthog` |
| `signal_kind` | `metric_window` |
| `external_id` | `{event}\|{week_start_date}` — unique per connection via `source_items` |
| `occurred_at` | window end |
| `title` | `'{event}' — week of {date}` |
| `content_text` | plain-English summary with week-over-week direction, e.g. "'search_performed' fell 18.0% week over week (1,240 → 1,017) in the week of Jun 15, 2026." |
| `sentiment` | always `null` — a volume shift is not customer voice |
| `checksum` | the window's count, so re-reads of unchanged weeks register as `records_unchanged` |
| `metadata_json` | `metric`, `unit`, `event`, `window_start`, `window_end`, `value`, `previous_value`, `change_pct`, `direction` |
| `source_url` | link back to the PostHog project ("Open in PostHog" in the feed) |

## 5. Connector Lifecycle

Standard `BaseConnector` contract (`backend/app/connectors/posthog.py`):

- `connect()` — requires `secret_ref` (personal API key) and `config_json.project_id`; optional `host` (defaults to US Cloud; EU and self-hosted supported)
- `validate()` — `GET /api/projects/{id}/`; distinct user-facing errors for invalid key (401), key without project scope (403), wrong project or host (404), timeout, unreachable host
- `backfill()` — one HogQL query (`event, toStartOfWeek(timestamp), count()`) bounded by `backfill_weeks`; cursor out is `last_window_start`
- `sync_incremental()` — re-reads from **one week before** the cursor so the in-progress week keeps refreshing; checksums keep re-reads idempotent
- `normalize()` — windows → `metric_window` signals as in § 4
- `disconnect()` — clears `secret_ref` and stops future syncs; copy tells the user to also revoke the key in PostHog

Platform reuse (no new surface area):

- hourly `scheduled_connector_sync` cron picks up PostHog automatically (API-token connection method)
- existing `POST /source-connections/{id}/backfill` and `/sync` endpoints work unchanged
- `sync_runs`, structured sync logs, and the integrations status card work unchanged
- `DELETE /source-connections/{id}/data` removes imported metric-window signals and source items

## 6. False-Correlation Guardrails (US-052-01-03)

These are product rules, not just copy:

1. **No sentiment.** Metric windows always carry `sentiment = null`; they can never feed the negative-sentiment score component.
2. **No frequency inflation.** Impact Score v2 computes frequency, negative sentiment, and recency from customer-voice signals only; analytics contributes solely to source diversity (see `PRD-052-02`).
3. **No voice-trend inflation.** Theme trend direction counts customer-voice signals only.
4. **Correlational wording everywhere.** Signal summaries state direction and magnitude, never cause. Theme evidence panels label analytics as "related usage shifts from the same period — supporting evidence, not a proven cause."
5. **Bounded ingestion.** Top-events cap and week-window cap stop metric spam from drowning the feed.

## 7. UX Scope

- PostHog card moves from "Coming Soon" to available in the Analytics section of `/integrations`
- Connect modal collects host, project ID, personal API key, with a trust note (aggregate counts only; read-only; key stored as secret reference; disconnect and provider-side revocation guidance)
- Connect flow validates then starts the historical backfill immediately (same pattern as Fireflies)
- Feed renders analytics rows with the existing Analytics badge, metric-window label, and "Open in PostHog" linkback
- Feed source filter already includes Analytics; theme evidence panels gain a source filter (see `PRD-052-02`)

## 8. Non-Goals

- no raw event, user-profile, or session-recording ingestion
- no funnels, retention, or cohort math in `v0.52`
- no per-theme "metric attach" UI — matching stays the shared deterministic theme matcher
- no second analytics provider until PostHog is measured (`G3M`)
- no writeback to PostHog, ever

## 9. Trust Copy

- `/trust`: "What we read" and permissions table gained PostHog rows (aggregate weekly event counts only; never raw events, profiles, or recordings)
- `/privacy`: §1.1 and §1.3 gained PostHog language mirroring actual behavior
- connect modal restates the same promise inline

## 10. Failure Handling

| Failure | Behavior |
|---|---|
| invalid API key (401) | validation fails with key-specific hint; connection status `error` |
| key lacks project scope (403) | scope-specific error message |
| wrong project ID or host (404) | names the missing project and host |
| rate limit (429) | retryable `ConnectorError` honoring `Retry-After`; hourly cron retries |
| PostHog 5xx | retryable error, run recorded as failed with summary |
| timeout / unreachable host | clear network error message |
| empty result set | successful run with zero windows; cursor carried forward |

## 11. Acceptance Evidence

- `backend/app/connectors/posthog.py` — connector implementation
- `backend/tests/test_posthog_validation.py` — 8 validation tests including endpoint integration
- `backend/tests/test_posthog_sync.py` — 9 tests: window building, top-events cap, adjacency, change math, normalization semantics, fixture replay (`backend/tests/fixtures/posthog_query_weekly.json`), retryable rate limit, backfill via API, idempotent re-backfill, cursor-resumed incremental sync
- `frontend/src/app/(app)/integrations/page.tsx`, `ConnectModal.tsx` (`PostHogForm`), `useIntegrations.ts`
- `Documentation/releases/v0.5_sync_observability_runbook.md` § 8 — PostHog operational notes
