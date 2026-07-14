# PRD-054-01: Saved Views, Collections & Theme Merge, and Ownership Polish

> Date: July 14, 2026
> Release: `v0.54`
> Owner: Founder acting as Product Manager
> Epics: `EPIC-054-01`, `EPIC-054-02`, `EPIC-054-03`

## Problem

`v0.5` through `v0.53` deliberately deferred three pieces of scope to protect the core wedge (multi-source evidence, connectors, scoring):

- **Saved views** (`US-05-04-05`) — named, reusable filter sets on the unified feed. Deferred at the Sprint 4/5 cut line in `PRD-05-04`.
- **Collections & theme merge** (`US-05-05-05`) — user-created interview groupings and the ability to merge two related themes into one. Deferred at the Sprint 6 cut line in `PRD-05-05`.
- **Ownership and collaboration polish** (`EPIC-053-03`) — `Interview` and `Theme` rows are still purely `user_id`-scoped even though `source_connections`/`source_items`/`signals` moved to workspace ownership in `v0.5`. This mismatch would eventually force a rewrite if collaboration ships later.

None of this blocks the core product. All of it is now debt that should be cleared before starting new capability (`v0.8` groundwork or a fourth connector), per founder decision on July 14, 2026.

## Solution

Ship three small, independent epics:

1. **Saved Views** — persist a named filter set (`source`, `sentiment`, `date_from`, `date_to`) against the unified feed and let the user reapply it in one click.
2. **Collections & Theme Merge** — let a user group interviews into a named `Collection`, and let a user merge one theme into another, preserving all evidence and insight history under the surviving theme.
3. **Ownership Polish** — add a nullable `workspace_id` to `Interview` and `Theme` (mirroring the pattern already used by `source_connections`/`source_items`/`signals`), backfilled from each owner's personal workspace, plus a lightweight `comment` field on both. This closes the ownership-model gap without introducing any multi-user UI — `v0.54` still ships single-user visible behavior, exactly as `D-05-03` intended for the interim.

## Why Now

- these are cut-line items with an already-approved shape (see `PRD-05-04` §"Decisions Locked" and `PRD-05-05` "Out of Scope") — there is no new design risk
- the ownership mismatch is the one item that gets more expensive to fix the longer real production data accumulates on `Interview`/`Theme`
- clearing debt before opening new scope keeps the tracker's core discipline intact: ship, measure, then decide what's next — not stack unaccepted work

## Success Metrics

| Metric | Target |
|---|---|
| PM can save the current feed filter state and reapply it later | yes |
| PM can group interviews into a named collection | yes |
| PM can merge one theme into another without losing any evidence or insight | yes |
| `Interview` and `Theme` rows carry workspace ownership consistent with the rest of the source model | yes |
| no regression to existing feed, board, or theme detail behavior | yes |

## In Scope

- `SavedView` model + CRUD (create, list, delete) scoped to the user's default workspace
- `Collection` model + CRUD, plus add/remove interview membership
- `POST /api/themes/{id}/merge` — reassigns insights and sub-themes from a source theme into the target theme, updates external signal theme-matching, then retires the source theme
- `workspace_id` (nullable FK) and `comment` (nullable text) columns on `Interview` and `Theme`, backfilled via migration
- minimal frontend surfaces: a "Views" control on `/feed`, a new `/collections` page, and a "Merge" action on `/board` theme cards

## Out of Scope

- multi-user workspace UI, invites, or roles (still forecast-only per `EPIC-053-03` boundary)
- collection-level sharing or permissions
- automatic/AI-suggested theme merges — merge is always a manual, explicit user action
- comment threads or @mentions (the `comment` field is a single free-text note per record, not a discussion feature)
- saved views on any surface other than the unified feed

## User Flows

### Saved Views
1. PM applies source/sentiment/date filters on `/feed`
2. PM clicks "Save this view," names it
3. PM (or a later session) opens the Views menu and selects a saved view — filters apply immediately

### Collections & Theme Merge
1. PM creates a collection ("Enterprise renewal risk") from `/collections`
2. PM adds relevant interviews to the collection
3. Separately, PM notices two theme cards on `/board` describing the same problem
4. PM merges the weaker/duplicate theme into the stronger one — evidence, quotes, and insight counts consolidate under the surviving theme, and the source theme disappears

### Ownership Polish
- invisible to the end user in `v0.54` — no UI changes to how interviews/themes are scoped. This is purely a data-model correction that keeps `Interview` and `Theme` consistent with the workspace-owned tables introduced in `v0.5`.

## Key Requirements

### Functional
- saved view filters must use the exact same shape as `GET /api/feed` query params, so applying a view is a pure query-param merge
- collection membership must be idempotent — adding an interview already in a collection is a no-op, not an error
- theme merge must never drop an insight or a signal's evidence — every insight and sub-theme from the source theme must resolve to the target theme after merge
- theme merge must trigger the same `refresh_external_signal_theme_matches` side effect that renames already trigger, so external evidence (Zendesk, survey, analytics signals) re-matches against the surviving theme name
- `workspace_id` backfill must be a single deterministic migration step tied to each owner's personal workspace — no manual data fixing required

### Trust and UX
- merge is destructive to the source theme record itself (not its evidence) — the UI must require explicit confirmation before merging
- comment fields are private notes, not shared collaboration — no wording implies other users can see them until real multi-user workspaces ship

## Dependencies

- `PRD-05-01` source foundation (`Workspace` model, workspace-owned tables)
- `PRD-05-04` unified feed (`FeedFilters` shape, `GET /api/feed`)
- `PRD-05-05` priority board and theme rename precedent (`PATCH /api/themes/{id}`, `refresh_external_signal_theme_matches`)

## Risks

| Risk | Mitigation |
|---|---|
| theme merge silently drops evidence | reassign insights/sub-themes before deleting the source theme; cover with a dedicated regression test asserting insight and signal counts are conserved |
| `workspace_id` backfill misses rows (e.g. orphaned interviews) | backfill migration joins strictly on `owner_user_id = interviews.user_id AND kind = 'personal'`, which is guaranteed to exist for every user via `get_or_create_default_workspace` |
| saved views drift out of sync with feed filter shape if the feed adds new filters later | store `filters_json` as an open dict rather than fixed columns, so future filters don't require a schema migration |
| collections become an unbounded workflow feature | keep collections to grouping + naming only; no status, no assignment, no automation |

## Initial Story Coverage

- `US-054-01-01`, `US-054-01-02` (saved views)
- `US-054-02-01` through `US-054-02-04` (collections + theme merge)
- `US-054-03-01`, `US-054-03-02` (ownership polish)

## Decisions Locked

- saved views persist as an open `filters_json` dict, not fixed filter columns
- theme merge is one-directional and explicit: user picks a target theme and a source theme to fold into it; there is no automatic/suggested merge
- `workspace_id` on `Interview`/`Theme` is nullable and additive — existing `user_id` scoping remains the authoritative access-control field in `v0.54`; workspace linkage is preparatory, not a behavior change
- no new multi-user UI ships in `v0.54` — the existing `/team` page remains a "Coming Soon" placeholder
