# PRD-051-01: Fireflies Automatic Interview Sync MVP

> Date: July 9, 2026
> Status: Draft — opened for the `v0.51` build window
> Release: `v0.51`
> Owner: Founder acting as Product Manager
> Epics: `EPIC-051-01`, `EPIC-051-02`, `EPIC-051-03`, `EPIC-051-04`

## Problem

Spec10x v0.5 shipped multi-source evidence, but interviews — the core evidence type — still enter the product only through manual file upload. Real prospects said this is the biggest workflow blocker: "I do not want to upload interview files by hand."

`v0.51` must make interview ingestion automatic for supported users: connect once, and the interview library stays current by itself.

## Solution

Ship Fireflies as the first automatic interview sync connector.

The connector should:

- validate a Fireflies API key clearly and safely
- backfill bounded meeting history
- run incremental syncs on a schedule and on demand
- **materialize each Fireflies meeting as a native Spec10x interview** that flows through the existing pipeline (analysis → insights → themes → per-insight signals)
- support disconnect and imported-data delete
- preserve manual upload as a fallback path

## Why Fireflies

- decided in `v0.5` planning (§10): Fireflies exposes public API docs and a self-serve API-key flow
- Otter's public API remains beta/account-manager gated — not the first target
- API-key auth is faster to ship than OAuth; the tradeoff is stronger secret-handling and disconnect messaging

## Key Architecture Decision: Materialization, Not Signal Rows

Zendesk and CSV connectors write normalized rows into `signals` directly. Fireflies does **not**.

Instead, each Fireflies meeting materializes into a native `Interview` row (transcript text built from meeting sentences) and is enqueued through the existing processing pipeline. The pipeline extracts insights, synthesizes themes, embeds transcript chunks (so Ask works on synced interviews), and creates one signal per accepted insight via the existing native-interview signal path.

Why:

- this is what "imported interviews behave like native records" means (`US-051-02-02`)
- it avoids double-counting: a meeting-level signal *and* per-insight signals would inflate frequency and Impact Score inputs
- Ask/Q&A grounding stays in `transcript_chunks`, per the approved `signals` v1 non-goals

Consequences:

- `FirefliesConnector.normalize()` intentionally returns no signal rows; idempotency is enforced through `source_items` (`external_id` = Fireflies transcript id, `native_entity_type = interview`)
- per-insight signals from synced interviews carry `provider = native_upload` in v0.51 (they are native insights); the interview's `metadata_json.source_provider = "fireflies"` preserves provenance and linkback. Revisit provider labeling in v0.52 if pilots find it confusing.
- sync-run record counts refer to **meetings materialized**, not signals written

## Sync Behavior

| Path | Behavior |
|---|---|
| Backfill | Fetch meetings from the last `backfill_days` (default 90) via the Fireflies GraphQL API, paginated at 50/page, bounded page count |
| Incremental | Fetch meetings since the last cursor (`last_synced_at`); no cursor → last 24 hours |
| Scheduled sync | arq cron job runs hourly and triggers incremental sync for every `connected` API-token connection |
| Idempotency | `source_items` unique on (connection, external_id); unchanged checksum → skipped; changed checksum → interview transcript is reset and reprocessed |
| User deletion respected | If a user deletes a synced interview, re-syncs do **not** recreate it (the `source_item` tombstone remains) |
| Empty meetings | Meetings with no sentences are counted as seen but not materialized |

## Trust and Safety

- API key is stored only on `source_connections.secret_ref` (Secret Manager reference in production), never in ordinary columns or logs
- read-only usage: Spec10x never writes back to Fireflies
- disconnect stops future syncs and clears the stored key reference; the user may still rotate/revoke the key in Fireflies itself — the UI says so explicitly
- imported-data delete (`DELETE /api/source-connections/{id}/data`) removes Spec10x's copies: materialized interviews (with their insights, chunks, and signals), connection signals, and source items — never upstream Fireflies records

## Success Metrics

| Metric | Target |
|---|---|
| Fireflies connection can be validated with clear failure states | yes |
| bounded historical backfill completes without duplication | yes |
| incremental sync uses a cursor and is retry-safe | yes |
| synced meetings appear as interviews and produce insights/themes | yes |
| disconnect stops syncs; imported-data delete removes copies | yes |

## In Scope

- Fireflies API-key credential path (GraphQL, Bearer auth)
- bounded historical backfill and cursor-based incremental sync
- interview materialization with metadata preservation (title, date, duration, participants, meeting URL)
- scheduled hourly incremental sync for connected API-token sources
- manual re-sync and sync-run visibility via the existing integrations shell
- disconnect and imported-data delete
- manual upload preserved unchanged as fallback

## Out of Scope

- Otter or any second interview provider
- OAuth flows
- audio/video download from Fireflies (transcript text only — minimal durable copy)
- webhook-based real-time sync
- workspace/team admin UX changes

## User Flow

1. PM opens Integrations
2. PM selects Fireflies and pastes their API key
3. Product validates the key and shows success or a clear failure
4. Product starts the historical backfill automatically
5. Meetings appear in the interview library and process like uploads
6. Hourly scheduled sync keeps the library current; manual re-sync is available
7. Disconnect stops syncing; imported-data delete removes Spec10x's copies

## Dependencies

- `PRD-05-01` source foundation (connector contract, `source_items`, `sync_runs`)
- `D-05-03` workspace ownership model (connections resolve through the default personal workspace)
- `D-05-05` observability baseline (sync runs + structured logs)
- `D-05-06` trust package (copy must match disconnect/delete behavior)

## Risks

| Risk | Mitigation |
|---|---|
| Fireflies API shape drifts | replay-style tests with recorded GraphQL payloads; provider quirks stay inside the connector |
| large meeting histories are slow/expensive | `backfill_days` bound (default 90), page cap, rate-limit-aware retryable errors |
| reprocessing loops on transcript churn | checksum comparison over title + transcript text; unchanged meetings are skipped |
| users fear always-on access | read-only key, plain-English trust copy, explicit disconnect + delete behavior |
| deleted interviews resurrected by sync | source-item tombstone prevents recreation |

## Story Coverage

- `US-051-01-01` … `US-051-01-04` (connection and credential flow)
- `US-051-02-01` … `US-051-02-04` (backfill and materialization)
- `US-051-03-01` … `US-051-03-05` (incremental sync, status, re-sync, disconnect, delete)
- `US-051-04-01` … `US-051-04-03` (failure-path tests, sync metrics, trust docs)

## Decisions Locked

- one Fireflies meeting materializes into exactly one native interview; per-insight signals come from the existing pipeline, not from connector `normalize()`
- `source_items.external_id` is the Fireflies transcript id; checksum is SHA-256 of title + built transcript text
- backfill remains bounded through `config_json.backfill_days` (default 90)
- scheduled sync is an hourly arq cron over all `connected` API-token connections (Fireflies and Zendesk both benefit)
- user-deleted synced interviews are not recreated by later syncs
