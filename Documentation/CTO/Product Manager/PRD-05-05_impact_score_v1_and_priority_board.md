# PRD-05-05: Impact Score v1 and Priority Board

> Date: March 16, 2026
> Status: Draft
> Release: `v0.5`
> Owner: Founder acting as Product Manager
> Epic: `EPIC-05-05`

## Problem

Multi-source evidence is useful, but PMs still need a way to decide what deserves attention first. If `v0.5` only adds a feed, it improves visibility but not prioritization.

The product needs a lightweight decision surface that ranks what looks important without pretending to be a full task tracker or magical AI prioritization engine.

## Solution

Ship:

- Impact Score v1
- an evidence-first priority board
- score breakdown UI
- lightweight manual override through pin or monitor states

Score v1 stays intentionally simple and explainable.

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
- score explanation in theme detail and board views
- ranked board cards with evidence preview
- pin or monitor state

## Out of Scope

- advanced financial impact modeling
- task tracking
- broad collaboration layer
- causal inference claims
- heavy collections and merge features unless core scope is already green

## User Flow

1. PM views the priority board
2. Product ranks themes using score v1
3. PM expands a card to see why it ranked there
4. PM follows evidence links into theme or feed views
5. PM pins or monitors a theme if they want lightweight manual control

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

## Open Questions

- whether board cards should show trend placeholders in `v0.5` or wait for `v0.52`
- what minimum evidence preview is enough to make the board useful without overwhelming the card layout
