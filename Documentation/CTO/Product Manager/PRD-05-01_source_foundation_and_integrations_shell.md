# PRD-05-01: Source Foundation and Integrations Shell

> Date: March 16, 2026
> Status: Draft
> Release: `v0.5`
> Owner: Founder acting as Product Manager
> Epic: `EPIC-05-01`

## Problem

Spec10x v0.1 is strong at interview uploads, but it has no shared source model for connected evidence. If support, survey, and later analytics sources are added directly into product logic, the result will be brittle schemas, provider-specific code paths, and hard-to-debug sync behavior.

The product needs a small but durable source foundation before it adds visible multi-source features.

## Solution

Build the minimal shared connector foundation for `v0.5`:

- `data_sources`
- `source_connections`
- `sync_runs`
- `source_items`
- `signals`
- an integrations shell in product settings

This foundation is additive. It does not replace `interviews`, `insights`, `themes`, or `transcript_chunks` in `v0.5`.

## Why Now

- `v0.5` depends on one live support connector plus survey import
- the planning doc explicitly says the source model should land before more UI surfaces
- delaying this work creates avoidable connector debt before the first real connected source even ships

## Success Metrics

| Metric | Target |
|---|---|
| source foundation migrations land without schema rework in `v0.5` | yes |
| first Zendesk connector can reuse the shared contract | yes |
| sync failures are queryable via `sync_runs` | yes |
| integrations shell can show empty, connected, syncing, and error states | yes |

## In Scope

- Workspace-safe ownership model for new source tables
- Default personal workspace assumption behind the scenes for current single-user flows
- Connector contract for `connect`, `validate`, `backfill`, `sync_incremental`, `normalize`, `disconnect`
- Shared normalized `signals` contract for feed, score, and source-aware theme evidence
- Integrations shell that surfaces provider availability and connection state

## Out of Scope

- Full workspace collaboration UI
- Invite flows, roles, or admin controls
- Migrating the entire v0.1 interview stack to workspace ownership
- Real-time webhook fan-out across multiple providers
- Broad provider marketplace UX

## User Flow

1. PM opens Integrations
2. PM sees available providers and current states
3. PM selects Zendesk or future providers from a consistent shell
4. Product uses shared connection and sync lifecycle
5. Connected evidence later appears in feed and theme views through `signals`

## Key Requirements

### Functional

- New source tables must support workspace-safe ownership from day one
- Source connections must store secret references, not raw credentials
- Source items must make imports idempotent through upstream ID mapping
- Sync runs must capture lifecycle and failure information clearly
- Signals must normalize evidence into a shared product-facing shape

### Non-Functional

- Debuggability: failed syncs must be reviewable from DB rows and logs
- Security: secrets only via Secret Manager references
- Extensibility: schema must handle support, survey, interview, and future analytics inputs
- Restraint: keep the model optimized for the next 2-4 connectors, not a platform for 40

## Dependencies

- `D-05-02` approved `signals` schema
- `D-05-03` approved workspace-safe ownership model
- `D-05-04` smoke test approach for integrations shell coverage

## Risks

| Risk | Mitigation |
|---|---|
| source foundation becomes a mini-platform project | keep tables minimal and tied to immediate `v0.5` use cases |
| workspace-safe design creates too much current-scope overhead | use default personal workspace behavior and avoid multi-user UX in `v0.5` |
| provider-specific exceptions leak into shared schema | keep provider details in `metadata_json` and connector modules |

## Initial Story Coverage

- `US-05-01-01`
- `US-05-01-02`
- `US-05-01-03`
- `US-05-01-04`
- `US-05-01-05`
- `US-05-01-06`

## Open Questions

- whether a minimal `workspaces` table is introduced now or default workspace resolution is handled through a lighter compatibility layer
- how much connection configuration belongs in `config_json` versus provider-specific tables
