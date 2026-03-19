# PRD-05-05: Impact Score v1 and Priority Board

> Date: March 16, 2026
> Status: Impact Score v1 accepted; priority board deferred to Sprint 6
> Release: `v0.5`
> Owner: Founder acting as Product Manager
> Epic: `EPIC-05-05`

## Problem

Multi-source evidence is useful, but PMs still need a way to decide what deserves attention first. If `v0.5` only adds a feed, it improves visibility but not prioritization.

The product needs a lightweight decision surface that ranks what looks important without pretending to be a full task tracker or magical AI prioritization engine.

## Solution

Ship this epic in two steps:

- Sprint 5: Impact Score v1 plus urgency sorting and theme-detail visibility
- Sprint 6: an evidence-first priority board, score breakdown UI, and lightweight manual override through pin or monitor states

Impact Score v1 stays intentionally simple and explainable.

## Implementation Update (March 19, 2026)

The Sprint 5 portion of this PRD is now implemented.

- `GET /api/themes?sort=urgency` now uses Impact Score v1 ordering
- theme detail responses can include `impact_score` alongside source breakdown and supporting evidence
- the dedicated board view, expanded score breakdown UI, and pin or monitor controls remain Sprint 6 work and are intentionally not part of the accepted Sprint 4 and Sprint 5 scope

## Impact Score v1 Formula

Balanced formula locked for `v0.5`:

- `frequency = min(themed_evidence_count, 10) / 10 * 40`
- `negative = negative_ratio * 25`
- `recency = 20 / 14 / 8 / 3` for newest evidence age buckets `<= 7d / <= 30d / <= 90d / older`
- `source_diversity = distinct_source_types / 3 * 15`
- `impact_total = round(sum, 1)`

## Why Now

- the planning doc says the board should help answer "what should we investigate next?"
- the score and board are the action layer on top of the shared evidence model
- trust is more important than sophistication in the first scoring release

## Success Metrics

| Metric | Target |
|---|---|
| PM can see ranked themes in one place | yes |
| PM can inspect why a score was assigned | yes |
| pilot users can explain score inputs without handholding | yes |
| board is used for investigation, not confused for a task manager | yes |

## In Scope

- score inputs: frequency, recency, negative sentiment weight, source diversity
- deterministic score output
- score visibility in theme detail and urgency sort for Sprint 5
- ranked board cards with evidence preview in Sprint 6
- pin or monitor state in Sprint 6

## Out of Scope

- advanced financial impact modeling
- task tracking
- broad collaboration layer
- causal inference claims
- heavy collections and merge features unless core scope is already green

## User Flow

1. PM sorts themes by urgency in the dashboard
2. Product ranks themes using Impact Score v1
3. PM opens theme detail to inspect impact score, source breakdown, and supporting evidence
4. PM follows evidence links into feed or interview views
5. Sprint 6 adds the dedicated board surface plus pin or monitor controls

## Key Requirements

### Functional

- score formula must be documented and deterministic
- board cards must show enough evidence context to invite inspection
- users must be able to see the score breakdown
- manual override must remain lightweight and not become a work-management system

### Trust and UX

- explainability is a hard requirement, not a nice-to-have
- language should suggest prioritization help, not proof
- score v1 must be easy to challenge when it looks wrong

## Dependencies

- `PRD-05-04` unified feed and source-aware themes
- `D-05-05` observability baseline for later measurement

## Risks

| Risk | Mitigation |
|---|---|
| users expect a more magical score than v1 can honestly provide | show the score breakdown directly |
| board drifts into a workflow tool | keep pin/monitor lightweight and avoid assignment or task semantics |
| low trust in rank order blocks adoption | measure trust explicitly during the `v0.5` post-release window |

## Initial Story Coverage

- `US-05-05-01`
- `US-05-05-02`
- `US-05-05-03`
- `US-05-05-04`
- `US-05-05-05` as optional support scope

## Decisions Locked

- Impact Score v1 uses the balanced formula above and no extra hidden weights
- the board remains a Sprint 6 surface; Sprint 5 acceptance does not require a new `/board` route or board nav item
- trend placeholders and board-card evidence preview stay deferred until the Sprint 6 board implementation
