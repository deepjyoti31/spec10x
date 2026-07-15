# PRD-11-01: Open-Source Readiness, Multi-User Workspaces, and Delivery Integrations

> Date: July 14, 2026
> Release: `v1.1`
> Owner: Project maintainers
> Epics: `EPIC-11-01`, `EPIC-11-02`, `EPIC-11-03`, `EPIC-11-04`, `EPIC-11-05`

## Problem

With `v1.0` accepted, the product loop is feature-complete for a single user. But the project's context changed the same day: Spec10x is now fully open source, and the pilot program is retired. The gaps that matter are no longer wedge-hypothesis gaps — they are adoption gaps:

1. **Strangers cannot run it in five minutes.** `docker compose up` starts infrastructure only; the app itself needs three hand-driven terminals, and there is no CI, so a contributor cannot know whether their change is green without local Postgres archaeology.
2. **The product assumes one user.** Every data query scopes to a single owner. The `/team` page is a static mockup. An open-source tool that a team cannot share stays a demo.
3. **The agent handoff is copy-paste.** `v1.0` produces an agent-ready markdown bundle, but a coding agent cannot *pull* it, and nothing flows back when the work ships.
4. **Delivery ends at the clipboard.** Tasks cannot leave Spec10x in a form an OSS team already uses (GitHub Issues), and outcomes are read, never pushed — the loop closes only if the PM remembers to look.
5. **The newest, most demo-critical flow (specs → tasks → outcomes) has no E2E coverage** — risky exactly when outside PRs start arriving.

## Solution

Ship `v1.1` as a Must-only cut across five epics:

1. **Open-source onboarding & CI** (`EPIC-11-01`) — a `docker compose --profile app up` full-stack path (Postgres, Redis, MinIO, migrations, backend, worker, frontend), GitHub Actions CI running the backend suite against a fresh pgvector Postgres plus frontend lint/build and the Playwright smoke suite, `CONTRIBUTING.md`, and a README rewritten for people who did not build the product.
2. **Multi-user workspaces** (`EPIC-11-02`) — invite teammates by email into your existing workspace. Members see and work in the shared evidence pool: feed, themes, board, specs, tasks, roadmap, outcomes. Explicit accept, owner-controlled membership, real `/team` page.
3. **MCP server** (`EPIC-11-03`) — a stdio MCP server so Claude Code (or any MCP client) can list specs, pull the self-contained context bundle, read outcomes, and report a ship — turning the v1.0 export from copy-paste into a live handoff.
4. **Full-loop smoke coverage** (`EPIC-11-04`) — Playwright smoke specs for the specs → tasks → outcomes path, in the existing fully-mocked harness.
5. **Delivery integrations** (`EPIC-11-05`) — one-click export of a spec's task breakdown to GitHub Issues with a request-scoped token that is never stored, and auto-close outcome notifications: when a shipped spec's outcome readout first leaves `too_early`, the owner gets an in-app notification.

## Why This Cut

The open-source pivot replaces "prove the wedge with pilots" with "make strangers able to run, trust, and extend this." Onboarding and CI are the multiplier on every future contribution. Multi-user is the structural gap that gets *harder* to close the longer contributors build on the single-user assumption. The MCP server and GitHub Issues export are the two lightest integrations that meet an OSS audience where it already works (coding agents and GitHub), reusing the v1.0 bundle and task snapshot rather than building PM-tool sync. Outcome notifications make the Learn column active with zero new data entry. Everything heavier (two-way PM sync, public API/webhooks, competitive intel, dashboards) stays deferred.

## Success Metrics

| Metric | Target |
|---|---|
| a newcomer reaches a running app with one env copy and one compose command | yes |
| every PR gets backend, frontend, and smoke verdicts from CI on a fresh database | yes |
| an owner can invite a teammate by email; after explicit accept, the member sees the same feed, themes, board, specs, tasks, roadmap, and outcomes | yes |
| a member's created content (interviews, specs, tasks) lands in the shared workspace pool | yes |
| an MCP client can list specs, pull a bundle identical to `GET /api/specs/{id}/export`, and mark a spec shipped (stamping `shipped_at` exactly like the UI) | yes |
| a spec's task breakdown exports to GitHub Issues in one action; the token is never persisted or logged; issue links appear on the tasks | yes |
| when a shipped spec's outcome first leaves `too_early`, its owner gets exactly one notification | yes |
| no regression to accepted v0.5x/v0.8/v1.0 behavior | yes |

## In Scope

- docker compose `app` profile: `migrate` (one-shot `alembic upgrade head`), `backend`, `worker`, `frontend` services layered on the existing infra services; infra-only default preserved
- `.github/workflows/ci.yml`: backend job (pgvector Postgres + Redis + MinIO services, fresh DB, `alembic upgrade head`, pytest), frontend job (lint + production build), smoke job (Playwright, mocked APIs)
- `CONTRIBUTING.md` (setup, tests, release-train doc pattern, PR expectations) and a README rewritten around the quickstart, with an explicit "which features need Vertex AI" section
- `workspace_members` table (invited email, role `owner`/`member`, status `invited`/`active`, audit fields) and `users.active_workspace_id`; migration with clean downgrade
- workspace API: `GET /api/workspace` (active workspace, role, members, pending invites), `POST /api/workspace/members` (owner invites by email), `DELETE /api/workspace/members/{id}` (owner revokes an invite or removes a member; members may remove themselves = leave), `GET /api/workspace/invites` (invites addressed to me), `POST /api/workspace/invites/{id}/accept`, `POST /api/workspace/invites/{id}/decline`, `POST /api/workspace/switch` (personal ↔ joined workspace)
- workspace request context: data routes resolve an active workspace and scope reads/writes to the workspace owner's data pool (`data_owner_id`), so every accepted surface becomes shared without a second data model
- `/team` page wired to the real API: member list, invite modal, revoke/remove, my pending invites with accept/decline, leave, seat framing removed (open source, no seat limits)
- stdio MCP server (`python -m app.mcp`): tools `list_specs`, `get_spec_bundle`, `get_spec_outcome`, `mark_spec_shipped`; identity from `SPEC10X_MCP_USER_EMAIL`; bundle rendered by the same `render_spec_export` as the API
- `POST /api/specs/{spec_id}/tasks/github`: creates one GitHub issue per task (title, summary, complexity, dependencies, evidence refs) via the GitHub REST API with a request-scoped PAT; stores `issue_url`/`issue_number` back into `tasks_json`; skips tasks that already have issues; surfaced in the Spec Studio task panel and `/tasks`
- outcomes computation extracted to a service shared by the API and the notifier; `specs.outcome_notified_at` column; daily arq cron creating one notification per spec when its outcome state first lands in `improving`/`worsening`/`flat`
- `/trust` copy extended: workspace sharing, GitHub token handling, MCP access path

## Out of Scope (deferred, not dropped)

- **Two-way PM tool sync** (Linear, Jira, Asana; GitHub *sync* beyond one-way issue creation) — one-way export first
- **Public REST API & webhooks** — the MCP server is the v1.1 automation surface
- **Roles & permissions beyond owner/member** and workspace audit logs — the `/team` "Coming Soon" cards stay honest
- **Multiple owned workspaces per user / workspace creation UI** — the shared pool is the owner's existing workspace
- **Email delivery of invites and notifications** — in-app only; no SMTP dependency
- **Competitive intelligence, custom dashboards, wireframes (`D-08-04`)** — unchanged
- **Attribution of individual member actions inside shared data** — workspace-level truth first, audit trail later

## Key Decisions

| # | Decision |
|---|---|
| `D-11-01` | Members join the **owner's existing workspace**; all workspace data (evidence, themes, specs, tasks, outcomes) is shared. Writes land in the shared pool. No data migration, no second pool. |
| `D-11-02` | Invites are **explicit-accept** by email match. Nobody's active context changes without their own action; switching back to your personal workspace is always available. |
| `D-11-03` | The GitHub token is **request-scoped**: used for the one export call, never persisted, never logged, never echoed back. |
| `D-11-04` | The MCP server is read-mostly: its only mutation is `mark_spec_shipped`, which reuses the exact first-ship stamping rule (`D-10-06`). |
| `D-11-05` | Outcome notifications fire **once per spec**, only when the state first leaves `too_early` into a readable state; `unavailable` never notifies. |
| `D-11-06` | CI always runs against a **fresh database** — the slow-dev-DB failure class cannot exist in CI. |

## Key Requirements

### Functional
- compose default (`docker compose up`) still starts infra only; the full stack requires the explicit `app` profile
- CI backend job migrates a fresh database with `alembic upgrade head` before pytest; no test order or long-lived-data assumptions
- workspace scoping is one resolution point (request context dependency) — no per-route bespoke sharing logic
- a member's `GET`s return the same rows the owner sees on every accepted surface; a removed/left member instantly falls back to their personal workspace
- invite by email of an existing or not-yet-registered user both work (match at accept time by the invitee's login email, case-insensitive)
- MCP `get_spec_bundle` output is byte-identical to `GET /api/specs/{id}/export` for the same spec
- `mark_spec_shipped` on an already-shipped spec is a no-op that reports the existing `shipped_at`
- GitHub export requires an existing task breakdown (409 otherwise); a partial failure reports which tasks were created and leaves successfully created issue links saved
- outcome notification cron is idempotent: reruns never duplicate notifications (`outcome_notified_at` stamp)

### Trust and UX
- workspace sharing is opt-in and visible: `/team` shows exactly who can see the workspace; `/trust` explains that inviting a member shares the workspace's evidence, specs, and outcomes
- the GitHub modal states plainly: "Your token is used for this export only and never stored."
- MCP access is documented as equivalent to the owner's own access — configuration lives in the operator's own environment, not the database
- notification copy stays correlational ("voice volume fell after shipping"), mirroring `/outcomes` wording
- no seat limits, plan gates, or fake "PRO" badges anywhere in the team surface (open source)

## Dependencies

- `PRD-10-01` task snapshot, export bundle, `shipped_at` rule, outcomes states (all accepted)
- v0.5 smoke harness (`frontend/e2e/smoke`, fully mocked pattern)
- existing `Notification` model and `/api/notifications` surface
- existing `Workspace` model and `get_or_create_default_workspace` resolution

## Risks

| Risk | Mitigation |
|---|---|
| workspace scoping misses a route and leaks or hides data | single request-context dependency; a dedicated test asserts member-vs-owner parity per surface; non-member access tests assert 404 |
| shared writes surprise members ("where did my personal data go?") | explicit accept, always-available switch back to personal, `/team` and `/trust` copy stating exactly what is shared |
| GitHub API failures mid-export leave half the tasks exported | per-task idempotency (`issue_url` saved as created; already-exported tasks skipped on retry); response reports per-task results |
| MCP dependency (`mcp` SDK) churns | server code is a thin adapter; all logic lives in testable service functions that don't import the SDK |
| CI diverges from local reality | CI mirrors the documented local path exactly (same compose images, same migration command, same pytest invocation) |
| notification fires on flaky early data | only fires when the state first leaves `too_early`; `unavailable` never notifies (`D-11-05`) |

## Initial Story Coverage

| Epic | Stories |
|---|---|
| `EPIC-11-01` Open-source onboarding & CI | compose app profile; CI workflow; CONTRIBUTING + README |
| `EPIC-11-02` Multi-user workspaces | membership model + migration; workspace API; scoped data access; `/team` UI + trust copy |
| `EPIC-11-03` MCP server | server + tools; docs |
| `EPIC-11-04` Full-loop smoke | specs → tasks → outcomes Playwright spec |
| `EPIC-11-05` Delivery integrations | GitHub Issues export (API + UI); outcome notifications (service + cron + copy) |
