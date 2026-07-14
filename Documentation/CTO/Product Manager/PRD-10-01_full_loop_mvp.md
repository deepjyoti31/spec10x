# PRD-10-01: Full Loop MVP (Task Breakdown, Agent Handoff, Roadmap, and Outcomes)

> Date: July 14, 2026
> Release: `v1.0`
> Owner: Founder acting as Product Manager
> Epics: `EPIC-10-01`, `EPIC-10-02`, `EPIC-10-03`, `EPIC-10-04`

## Problem

With `v0.8` accepted, Spec10x carries a PM from raw customer evidence to an approved, evidence-cited feature brief. But the loop still breaks at both ends of delivery:

1. **Handoff is manual.** An approved spec must be re-typed into tasks for a coding agent or an engineer. The evidence trail — the whole point of the product — is lost at exactly the moment the work starts.
2. **Nothing closes the loop.** After a spec ships, Spec10x has no opinion on whether the pain it addressed actually went quiet. The "Learn" column of the vision loop is empty, and the Deliver/Learn sidebar sections have been "Coming Soon" since the v1.0 UI shell landed.

The roadmap's `v1.0` milestone ("Full Loop") is the bridge from *ready to build it* to *built it, and here is what happened*.

## Solution

Ship the Full Loop core as a Must-only cut:

1. **Task breakdown** — from an approved spec, generate an ordered set of atomic, agent-ready tasks with one bounded Gemini call: title, summary, S/M/L complexity, dependencies between tasks, and citations back into the spec's existing evidence snapshot.
2. **Agent-ready export** — a self-contained markdown context bundle per spec: the brief, its tasks, and the numbered evidence appendix. One click to copy or download; paste it into Claude Code, Cursor, or any coding agent.
3. **Ship & outcomes** — the first transition to Shipped stamps `shipped_at`. The new `/outcomes` page compares weekly customer-voice volume on the source theme before vs. after shipping — correlational, honestly labeled — so the PM can see whether the pain went quiet.
4. **Roadmap view** — `/roadmap` derives Now / Next / Later / Shipped columns directly from spec statuses. No second data model; the review workflow *is* the roadmap.
5. **Command Center pipeline** — the home dashboard gains the spec pipeline strip (Draft → Shipped counts) so the full loop is visible at a glance.
6. **Sidebar unlock** — `Tasks`, `Roadmap` (Deliver), and `Outcomes` (Learn) go from "Coming Soon" to live. Every section of the v1.0 shell is now real.

## Why This Cut

The full `v1.0` vision also names two-way PM tool sync, public API and webhooks, competitive intelligence, and custom report builders. Those are all *distribution* of the loop; this cut is the loop itself. The wedge hypothesis `v1.0` must test first: **does an evidence-cited brief that breaks itself into agent-ready tasks, and then reports back on the pain it addressed, keep the PM inside Spec10x for the whole cycle?** For the solo-founder-plus-AI-agents audience, a markdown context bundle is the universal integration — it works with every coding agent today, with zero connector maintenance (the v0.5 lesson: too many connectors too early turns the roadmap into connector maintenance).

## Success Metrics

| Metric | Target |
|---|---|
| PM can turn an approved spec into an ordered, dependency-aware task list in one action | yes |
| every task is traceable — tasks carry citations that resolve to the spec's evidence snapshot | yes |
| the export bundle is self-contained: brief + tasks + evidence render as one markdown document with no live references | yes |
| shipping a spec produces a before/after voice-volume readout on its source theme without any manual setup | yes |
| roadmap and pipeline views require zero additional data entry — they derive fully from existing spec statuses | yes |
| no regression to existing spec generation, review workflow, board, or trends behavior | yes |

## In Scope

- `specs` table gains `tasks_json` (ordered task list snapshot), `tasks_generated_at`, and `shipped_at`
- task breakdown service using Vertex AI Gemini with a structured-output schema: numbered tasks with title, summary, S/M/L complexity, `depends_on` (task numbers), and `citations` (evidence refs); invalid dependency numbers and evidence refs are dropped, mirroring the v0.8 citation sanitizer
- `POST /api/specs/{id}/tasks` — generate (or regenerate) the task breakdown; allowed only for Approved, In Dev, or Shipped specs
- `GET /api/specs/{id}/export` — agent-ready markdown context bundle (text/markdown)
- `GET /api/specs/outcomes` — all shipped specs with pre/post-ship weekly voice-signal volume on the source theme (4 weekly buckets each side of `shipped_at`), plus an honest state: `improving`, `worsening`, `flat`, `too_early` (less than one full post-ship week), or `unavailable` (theme merged away or deleted)
- `PATCH /api/specs/{id}` stamps `shipped_at` on the first transition into Shipped; moving back to In Dev keeps the original ship timestamp
- home dashboard response gains `spec_pipeline` (count per status)
- frontend: task panel in Spec Studio (generate, complexity chips, dependencies, citation chips, copy/download export); `/tasks` delivery workbench; `/roadmap`; `/outcomes`; home pipeline strip; sidebar unlock for Tasks, Roadmap, Outcomes
- `/trust` gains a task-breakdown sentence (same Vertex AI handling; no new data classes leave the existing path)

## Out of Scope (deferred, not dropped)

- **Two-way PM tool sync** (Linear, Jira, GitHub Issues, Asana) — the markdown bundle is the v1.0 handoff; connectors return only after the loop itself is proven
- **Public API & webhooks** — no external automation surface until pilots ask for a specific one
- **Competitive intelligence** — separate ingestion problem, separate PRD
- **Custom dashboards & stakeholder report builder** — `/outcomes` and `/roadmap` are the fixed v1.0 reports
- **Auto-close loop notifications** — outcomes are read, not pushed, until the readout itself earns trust
- **Task editing/reordering/splitting** — tasks are a regenerable artifact of the spec in v1.0, not independently managed work items
- **Wireframe suggestions, flow diagrams, codebase awareness** — still `v0.8x` follow-ups gated on spec-trust measurement (`D-08-04`)

## User Flows

### Break down and hand off
1. PM approves a spec in Spec Studio
2. PM clicks `Break into tasks` — Spec10x generates the ordered task list with complexity and dependencies, cited into the same evidence panel
3. PM clicks `Copy for agent` (or downloads the `.md` bundle) and pastes it into their coding agent
4. As work starts and finishes, PM moves the spec to In Dev, then Shipped

### Close the loop
1. Spec hits Shipped; `shipped_at` is stamped automatically
2. Two-plus weeks later, PM opens `/outcomes`
3. Each shipped spec shows voice-signal volume on its source theme, 4 weeks before vs. after ship, with an honest state label and the standing correlational caution
4. If the pain kept growing, the PM walks the trail back: outcome → spec → evidence

### See the whole pipeline
1. `/home` shows the spec pipeline strip: how many specs sit in each state
2. `/roadmap` lays the same truth out as Now (In Dev) / Next (Approved) / Later (Draft, In Review, Needs Changes) / Shipped columns; every card links into Spec Studio

## Key Requirements

### Functional
- task generation input is the spec's own `sections_json` and `evidence_json` — no fresh signal query, so tasks always agree with the document the PM approved
- one bounded Gemini call per breakdown; at most 12 tasks; `depends_on` may only reference other returned task numbers (self-references and unknown numbers are dropped); `citations` may only reference existing evidence refs
- task generation requires spec `generation_status = ready` and status in {Approved, In Dev, Shipped}; anything else is rejected with a clear message
- regenerating tasks replaces the previous breakdown (same confirm-first UX as spec regeneration); a failed generation changes nothing and returns an error the UI can show
- the export bundle must render standalone: sections inline their citation refs, tasks list their dependencies and citations, and the evidence appendix carries every numbered item from the snapshot
- `GET /api/specs/outcomes` is registered before the `/{spec_id}` route (same ordering rule as `/api/themes/trends`)
- outcome buckets use `is_voice_signal` only — metric windows never count toward volume (v0.52 rule)
- `shipped_at` is stamped once; the outcomes window is anchored to the first ship

### Trust and UX
- task lists are AI drafts of a plan, not assignments: no assignees, no due dates, no notifications
- outcomes wording is strictly correlational: "voice volume fell after shipping," never "this feature reduced complaints"; the page carries the standing "supporting evidence, not proven impact" caution
- an `unavailable` outcome (theme merged/deleted) says so plainly instead of showing an empty chart
- spec content sent to Gemini for task breakdown follows the exact same Vertex AI handling as spec generation; `/trust` copy is extended, no new retention claims
- deleting a spec still never touches themes, insights, or signals; tasks die with their spec

## Dependencies

- `PRD-08-01` spec model, evidence snapshot, review workflow (all shipped and accepted)
- `PRD-052-02` correlational wording rules and `is_voice_signal`
- v0.8 trends bucket pattern (`GET /api/themes/trends`) for weekly windows
- v1.0 UI shell (sidebar sections Deliver/Learn already exist, locked)

## Risks

| Risk | Mitigation |
|---|---|
| generated tasks are too coarse or too granular to hand to an agent | fixed S/M/L complexity vocabulary, 12-task cap, and prompt rules requiring each task to be independently completable; regeneration is one click |
| dependency graphs come back cyclic or dangling | server-side sanitizer drops self-references and unknown task numbers; UI renders dependencies as plain "after #n" chips, not a scheduler |
| outcomes read as causal proof | correlational copy everywhere, `too_early` state instead of premature verdicts, and the v0.52 caution line carried onto the page |
| pipeline/roadmap drift from reality because statuses go stale | zero-entry design: the views only reflect statuses the PM already maintains in the review workflow; nothing new to keep updated |
| export bundle leaks something the PM didn't review | the bundle contains only the spec row's own snapshot (sections, tasks, evidence) — exactly what Spec Studio already shows |

## Initial Story Coverage

- `US-10-01-01` through `US-10-01-03` (schema, breakdown service + sanitizers, tasks endpoint)
- `US-10-02-01` through `US-10-02-03` (export bundle, Spec Studio task panel, `/tasks` workbench)
- `US-10-03-01`, `US-10-03-02` (shipped_at + outcomes API, `/outcomes` page)
- `US-10-04-01` through `US-10-04-03` (`/roadmap`, home pipeline strip, `/trust` copy)

## Decisions Locked

- `D-10-01` — tasks live in `tasks_json` on the spec row, not a separate table. They are a regenerable artifact of the document; with PM-tool sync deferred there are no external ids to track. Revisit only when sync lands.
- `D-10-02` — task generation is gated on approval (Approved/In Dev/Shipped). Breaking down an unapproved draft invites building the wrong thing confidently.
- `D-10-03` — a failed task generation persists nothing and returns an error (unlike spec drafts, a partial task list has no review value). Retry is one click.
- `D-10-04` — the agent handoff is a self-contained markdown bundle served as `text/markdown`. Integration-neutral, zero connector maintenance, works with every agent today.
- `D-10-05` — the roadmap derives entirely from spec statuses: Now = In Dev, Next = Approved, Later = Draft/In Review/Needs Changes, plus Shipped. No separate roadmap model, no drag-to-reorder in v1.0.
- `D-10-06` — outcomes compare 4 weekly voice-signal buckets each side of the first `shipped_at`, reusing the trends bucket pattern; less than one full post-ship week reports `too_early` rather than a verdict.
