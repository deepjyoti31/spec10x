# PRD-05-03: Survey and NPS Import MVP

> Date: March 16, 2026
> Status: Accepted for Sprint 4 and Sprint 5 scope
> Release: `v0.5`
> Owner: Founder acting as Product Manager
> Epic: `EPIC-05-03`

## Problem

Many early users will have survey and NPS evidence available before they are ready to connect more systems. If `v0.5` depends only on live connectors, adoption friction stays high and the multi-source wedge becomes narrower than it should be.

The product needs a low-friction way to ingest survey evidence into the shared model.

## Solution

Ship a CSV-based survey and NPS import path that includes:

- a documented template
- validation with clear errors
- a preview step before import
- import history with status and failure summaries
- normalization into shared `signals`

## Implementation Update (March 19, 2026)

Sprint 4 and Sprint 5 scope for this PRD is now implemented.

- survey and NPS rows normalize through the shared signal persistence path in `backend/app/services/signals.py`
- the CSV confirm flow in the integrations UI now calls the real backend import endpoint instead of a placeholder path
- survey CSV import remains repeatable and does not occupy a one-time "active connection" slot
- import history is visible from the integrations surface so operators can review prior imports after refresh

## Why Now

- survey import provides immediate multi-source breadth with lower engineering risk than another live connector
- it gives cautious customers an evidence path with lower trust friction
- it lets `v0.5` prove the shared signal model across more than one source type

## Success Metrics

| Metric | Target |
|---|---|
| users can import valid survey and NPS CSVs end to end | yes |
| invalid files fail with clear recoverable messages | yes |
| imported survey rows become usable in feed, themes, and score inputs | yes |
| import history explains what happened to each file | yes |

## In Scope

- CSV template for survey and NPS imports
- required column validation
- preview and mapping review
- import history with counts and failures
- normalization into `signals`

## Out of Scope

- live survey provider connectors
- broad survey builder functionality
- data cleaning beyond what is needed for predictable template-based import

## User Flow

1. PM downloads or views the CSV template
2. PM uploads a survey or NPS CSV
3. Product validates required columns and row shape
4. PM reviews preview and warnings
5. PM confirms import
6. Survey responses normalize into `signals`
7. Product shows import history and status

## Key Requirements

### Functional

- template must define required and optional columns clearly
- validation must block imports when core columns are missing
- preview must show mapped fields and warnings before commit
- each accepted response row must become one normalized `signal`
- import history must survive refresh and show success or failure state

### UX

- error messages must be plain language
- import path should feel low-friction, not like an ETL tool

## Dependencies

- `PRD-05-01` source foundation
- approved `signals` schema v1

## Risks

| Risk | Mitigation |
|---|---|
| CSV contract is too loose and creates edge-case chaos | keep template strict in `v0.5` |
| preview step adds too much friction | keep the preview focused on obvious mapping and validation issues |
| survey evidence is too noisy for scoring | normalize only the fields needed for feed, themes, and score inputs |

## Initial Story Coverage

- `US-05-03-01`
- `US-05-03-02`
- `US-05-03-03`
- `US-05-03-04`

## Decisions Locked

- each accepted survey row becomes one normalized signal that can appear in feed, theme evidence, and Impact Score inputs
- survey import is a repeatable import entry point, not a one-time connected source
- minimum required fields continue to follow the validator and template contract implemented in `POST /api/survey-import/validate`
- optional survey fields continue to follow the same validator contract; the product docs no longer treat them as an open design question for `v0.5`
