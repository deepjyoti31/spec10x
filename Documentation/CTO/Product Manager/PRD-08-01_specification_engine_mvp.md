# PRD-08-01: Specification Engine MVP (Specs, Trends, and Board-to-Spec Flow)

> Date: July 14, 2026
> Release: `v0.8`
> Owner: Founder acting as Product Manager
> Epics: `EPIC-08-01`, `EPIC-08-02`, `EPIC-08-03`, `EPIC-08-04`

## Problem

The `v0.5x` family proved that Spec10x can combine multi-source customer evidence, keep it current automatically, and rank it credibly. But the product still stops at "here is what matters." The PM then leaves Spec10x to write the actual feature brief by hand — re-reading quotes, re-deriving acceptance criteria, and losing the evidence trail in the process.

The roadmap's `v0.8` milestone ("Specification Engine") is the bridge from *knowing what to build* to *being ready to build it*: turn a prioritized theme into a full, evidence-cited feature brief in one action.

## Solution

Ship the Specification Engine core as a Must-only cut:

1. **Spec generation** — from any theme, generate a structured feature brief with Gemini: problem statement, user stories, proposed solution, acceptance criteria, risks and edge cases, success metrics. Every section carries inline citations that resolve to real evidence (interview insights, support tickets, survey responses, analytics metric windows).
2. **Evidence trail** — the evidence used for generation is snapshotted onto the spec, so citations stay stable even as live signals change or themes merge later.
3. **Spec Studio** — `/specs` list with status filter tabs, and `/specs/[id]` split-pane detail (spec sections left, numbered evidence panel right) with inline markdown editing per section.
4. **Review workflow** — Draft → In Review → Needs Changes → Approved → In Dev → Shipped, with validated transitions. AI writes the first draft; the human edits and approves.
5. **Trends page** — unlock `/trends`: weekly voice-signal volume per theme over the last 8 weeks, grouped into Rising / Declining / Stable using the existing `calculate_theme_trend` windows.
6. **Board-to-spec flow** — a `Generate Spec` action on pinned board theme cards that creates the spec and lands the PM in the Spec Studio.

## Why This Cut

The full `v0.8` vision also names wireframe suggestions, user flow diagrams, codebase awareness, and collaborative editing. Those are deliberately below the line (see Out of Scope). The wedge hypothesis `v0.8` must test first is narrower: **does an AI-drafted, evidence-cited brief actually save the PM the write-up and keep their trust?** If specs are not trusted, wireframes annotated by the same engine will not be either. The cut mirrors how `v0.5` shipped scoring: simplest credible version, fully explainable, measured before expansion.

## Success Metrics

| Metric | Target |
|---|---|
| PM can turn a prioritized theme into a complete brief in one action | yes |
| every generated claim is traceable — each spec section carries citations that resolve to real evidence items | yes |
| PM can edit any section and move the spec through Draft → Approved without leaving Spec10x | yes |
| specs survive theme merge/deletion without losing their evidence trail | yes |
| trends page shows rising/declining/stable themes from real signal windows, consistent with existing trend badges | yes |
| no regression to existing board, feed, or theme detail behavior | yes |

## In Scope

- `Spec` model: workspace-owned (same default-personal-workspace pattern as `D-05-03`), linked to its source theme via nullable FK plus a name snapshot, storing `sections_json` (structured sections with citation refs) and `evidence_json` (numbered evidence snapshot)
- spec generation service using Vertex AI Gemini with a structured-output schema; evidence is passed as a numbered list and the model cites by number, so every citation maps deterministically back to a signal
- `POST /api/specs` (generate from theme), `GET /api/specs` (list, status filter), `GET /api/specs/{id}`, `PATCH /api/specs/{id}` (title, section content, status transitions), `POST /api/specs/{id}/regenerate`, `DELETE /api/specs/{id}`
- status workflow validation server-side; invalid transitions are rejected
- `GET /api/themes/trends` — per-theme weekly voice-signal counts (8 weeks) plus trend direction from the existing 14-day windows
- frontend: `/specs`, `/specs/[id]`, `/trends` pages; sidebar unlock for Specs and Trends; `Generate Spec` on pinned board cards
- generation guardrails inherited from `v0.52`: metric windows are labeled analytics evidence, spec copy must stay correlational ("supporting evidence," not proven causation)

## Out of Scope (deferred, not dropped)

- **Wireframe suggestions / wireframe canvas** (`/wireframes` stays "Coming Soon") — depends on spec trust being proven first
- **User flow diagrams** — same reasoning
- **Codebase awareness** (GitHub/GitLab repo connectors, architecture views) — a full connector-plus-analysis track of its own
- **Spec collaboration** — real-time co-editing, comment threads, team sign-offs; blocked on multi-user workspaces (`EPIC-053-03` remains forecast-only)
- **Agent-ready task export, PM tool sync** — `v1.0` scope
- **Dedicated worker pool for generation** — generation is a single bounded Gemini call and runs in-request like Ask; revisit if briefs grow past one call

## User Flows

### Generate from board
1. PM pins a theme on `/board`
2. PM clicks `Generate Spec` on the pinned card
3. Spec10x snapshots the theme's evidence, generates the brief, and opens `/specs/{id}`
4. PM reads section by section; each citation chip `[n]` highlights the matching evidence item in the right panel

### Refine and approve
1. PM edits a section inline (markdown), saves
2. PM moves the spec to In Review, then Approved (or Needs Changes and back)
3. Approved specs remain editable in title/content but can move on to In Dev and Shipped as the work progresses

### Trends
1. PM opens `/trends`
2. Rising themes (accelerating voice-signal volume) surface at top with weekly sparklines; Declining and Stable follow
3. Clicking a theme navigates to `/insights?theme={id}`

## Key Requirements

### Functional
- generation input is bounded: at most 40 voice signals (newest first) plus at most 5 analytics metric windows per spec, so cost per generation stays one predictable Gemini call
- citation integrity: refs returned by the model that don't exist in the numbered evidence list are dropped, never rendered as broken links
- spec creation requires a theme with at least one insight or matched signal; empty themes are rejected with a clear message
- `theme_name_snapshot` and `evidence_json` keep the spec fully renderable after its theme is merged away or deleted (FK is `SET NULL`)
- regeneration replaces sections and evidence, is only allowed pre-approval (Draft, In Review, Needs Changes), and resets the spec to Draft
- section edits preserve untouched sections; the PATCH payload targets sections by key
- trends must reuse `calculate_theme_trend` and `is_voice_signal` — no second trend definition

### Trust and UX
- specs are AI drafts and must be labeled as such until a human edits or approves them
- spec wording guardrail carried from `v0.52`: analytics evidence is correlational; prompts instruct the model to avoid causal claims, and the evidence panel keeps the analytics caution footnote
- customer content sent to Gemini for spec generation follows the exact same Vertex AI handling as existing analysis and Ask — no new model-data promises are needed, but `/trust` copy gains a spec-generation row for completeness
- deleting a spec never touches the underlying theme, insights, or signals

## Dependencies

- `PRD-05-05` Impact Score and board (pinned state, score breakdown)
- `PRD-052-02` trend windows and correlational wording rules
- `D-05-02` `signals` as the shared evidence layer (spec evidence is served from signals plus native insights)
- `D-05-03` workspace ownership pattern for new tables

## Risks

| Risk | Mitigation |
|---|---|
| generated specs feel generic or hallucinated | ground every section in the numbered evidence list; instruct the model to cite per section; drop uncited fabrications in review by exposing citations visibly |
| citation refs drift from evidence | snapshot evidence onto the spec at generation time; citations index the snapshot, not live signals |
| generation cost/latency creeps | hard cap on evidence items; single structured-output call; no agentic loops |
| status workflow becomes a project-management tool | six fixed states, no assignments, no due dates, no notifications |
| spec editing conflicts with regeneration | regeneration is explicit, confirmed in UI, and blocked after approval |

## Initial Story Coverage

- `US-08-01-01` through `US-08-01-03` (model, generation service, prompt guardrails)
- `US-08-02-01` through `US-08-02-03` (API, workflow, regeneration)
- `US-08-03-01` through `US-08-03-03` (Spec Studio list, detail, board entry point)
- `US-08-04-01`, `US-08-04-02` (trends API, trends page)

## Decisions Locked

- `D-08-01` — spec sections are fixed for the MVP: Problem Statement, User Stories, Proposed Solution, Acceptance Criteria, Risks & Edge Cases, Success Metrics. No custom section types until pilots ask.
- `D-08-02` — generation runs synchronously in-request (like Ask), not through arq. One bounded call; the UI shows a generating state during the request.
- `D-08-03` — citations are numeric refs into an evidence snapshot stored on the spec row, not live joins. Stability beats freshness for a document.
- `D-08-04` — wireframes, flow diagrams, and codebase awareness are explicitly deferred to a later `v0.8x` follow-up gated on spec trust measurement.
