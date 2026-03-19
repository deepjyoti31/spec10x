# PRD-05-02: Zendesk Support Connector MVP

> Date: March 16, 2026
> Status: Accepted for Sprint 4 and Sprint 5 scope
> Release: `v0.5`
> Owner: Founder acting as Product Manager
> Epic: `EPIC-05-02`

## Problem

Spec10x currently requires manual evidence uploads. That makes it impossible to prove the connector architecture in a real customer workflow, and it keeps support evidence outside the product unless users do manual export work.

`v0.5` needs one live support source to prove that connected evidence can flow into feed, themes, and score logic.

## Solution

Ship Zendesk as the first live support connector for `v0.5`.

The connector should:

- validate credentials clearly
- backfill bounded history
- run incremental syncs safely
- normalize Zendesk evidence into shared `signals`
- expose sync status, error state, and manual re-sync controls

## Implementation Update (March 19, 2026)

Sprint 4 and Sprint 5 scope for this PRD is now implemented.

- Zendesk tickets normalize through the shared signal persistence path in `backend/app/services/signals.py`
- normalized rows retain provider metadata and linkback data for feed and theme evidence views
- the integrations shell now exposes last sync state, last error, recent sync runs, and manual sync and backfill actions
- release-level trust copy and observability review surfaces remain Sprint 6 follow-on work

## Why Zendesk

- selected as the first support connector target in Sprint 0
- strong fit for text-heavy evidence
- good wedge for validating support-source normalization before broader connector expansion

## Success Metrics

| Metric | Target |
|---|---|
| Zendesk connection can be established and validated | yes |
| bounded historical backfill completes without duplication | yes |
| incremental sync updates data without full reload | yes |
| normalized Zendesk evidence appears in feed and source-aware theme views | yes |
| sync state is understandable without support intervention | yes |

## In Scope

- One Zendesk credential path
- One bounded historical backfill path
- Cursor-based incremental sync
- Manual re-sync
- Zendesk evidence normalization into `signals`
- Linkback to original Zendesk evidence where available
- Connection state, last sync, and failure visibility in integrations shell

## Out of Scope

- Multiple support providers
- Writeback into Zendesk
- Full admin controls for team workspaces
- Advanced ticket taxonomy modeling beyond what feed, theme evidence, and score inputs need

## User Flow

1. PM opens Integrations
2. PM selects Zendesk
3. PM enters credentials
4. Product validates credentials and shows success or failure clearly
5. Product starts first bounded backfill
6. Evidence normalizes into `signals`
7. Feed and theme views show Zendesk-backed evidence
8. PM can view sync state and trigger manual re-sync

## Key Requirements

### Functional

- Connection rows store only secret references
- Backfill must be idempotent through `source_items`
- Incremental sync must use a cursor or equivalent stable checkpoint
- Normalized rows must include source type, provider, text payload, metadata, timestamps, and linkback
- Manual re-sync must not bypass logging or auditability

### Trust and Safety

- Request read-only access where possible
- Explain what data is read and what is stored
- Explain disconnect and imported-data delete behavior in plain English

## Dependencies

- `PRD-05-01` source foundation
- `D-05-05` sync observability baseline
- `D-05-06` trust package

## Risks

| Risk | Mitigation |
|---|---|
| Zendesk payload shape is wider than the product needs | normalize only the fields required for `signals` plus provider metadata |
| backfills are slow or expensive | bound history for `v0.5` pilots and measure backfill duration |
| users misunderstand what disconnect does | make stop-sync and imported-data delete behavior explicit |

## Initial Story Coverage

- `US-05-02-01`
- `US-05-02-02`
- `US-05-02-03`
- `US-05-02-04`
- `US-05-02-05`

## Decisions Locked

- the normalized Zendesk evidence unit for `v0.5` is one normalized ticket-level signal row produced through the shared persistence path
- non-interview theme association is persisted on the signal in `signals.metadata_json.theme_match`
- manual sync and backfill remain exposed in the integrations detail UI and continue to record sync-run history
- historical backfill remains intentionally bounded for pilot accounts and is configured through the connection flow rather than a second product-level design pass
