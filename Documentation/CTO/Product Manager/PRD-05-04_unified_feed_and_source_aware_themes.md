# PRD-05-04: Unified Feed and Source-Aware Themes

> Date: March 16, 2026
> Status: Draft
> Release: `v0.5`
> Owner: Founder acting as Product Manager
> Epic: `EPIC-05-04`

## Problem

Even if connected and imported evidence lands correctly, users will not feel the product shift unless the UI clearly shows mixed evidence in one place. Without a shared surface, `v0.5` risks becoming "foundation work plus hidden data."

The product needs a visible multi-source experience that is clear, trustworthy, and easy to inspect.

## Solution

Ship two connected surfaces:

- a unified signal feed
- source-aware theme detail views

The feed proves the shared model works. Source-aware theme views explain where a theme is coming from and keep the product from sounding more certain than the evidence supports.

## Why Now

- this is the clearest visible proof that `v0.5` is more than interview upload plus hidden connector plumbing
- planning guidance explicitly says users need to feel the product shift from single-source to multi-source
- the score and board depend on understandable mixed evidence

## Success Metrics

| Metric | Target |
|---|---|
| mixed-source rows render coherently in one feed | yes |
| PM can filter by source, date, and sentiment | yes |
| theme detail shows evidence counts by source type | yes |
| every evidence row can link back to original material | yes |

## In Scope

- unified feed backed by normalized `signals`
- source badges, timestamps, and stable row structure
- source, date, and sentiment filters
- source-aware theme evidence sections
- evidence linkback to original records or native product views

## Out of Scope

- workflow-heavy saved boards
- broad collaboration features
- causal language or automatic root-cause claims
- large redesign of the existing dashboard beyond what is needed for mixed evidence

## User Flow

1. PM opens the multi-source feed
2. PM sees interviews, Zendesk evidence, and survey rows in one timeline
3. PM filters by source, sentiment, or date
4. PM clicks into a theme
5. Theme detail shows where the theme is supported: interview, support, survey, or mixed
6. PM follows a link back to the original evidence

## Key Requirements

### Functional

- feed rows must use a consistent shape even when the source content differs
- filters must combine without breaking user state
- theme pages must show evidence by source type
- linkbacks must be visible and understandable

### Trust and UX

- use language like "supporting evidence" and "source breakdown"
- avoid language that implies proof or causation
- preserve clarity even when source types differ in structure

## Dependencies

- `PRD-05-01` source foundation
- `PRD-05-02` Zendesk normalization
- `PRD-05-03` survey import normalization

## Risks

| Risk | Mitigation |
|---|---|
| feed becomes visually noisy | keep strong badges, stable row structure, and restrained metadata |
| source diversity is misread as causation | use explicit supporting-evidence wording |
| linkbacks are inconsistent across providers | define provider-specific linkback behavior in connector PRDs, not in the feed core |

## Initial Story Coverage

- `US-05-04-01`
- `US-05-04-02`
- `US-05-04-03`
- `US-05-04-04`
- `US-05-04-05` as optional support scope

## Open Questions

- whether the unified feed lives inside the existing dashboard or as a distinct view with shared navigation
- whether saved views are worth shipping in `v0.5` if core feed adoption is not yet proven
