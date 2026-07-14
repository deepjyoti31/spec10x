# PRD-052-02: Impact Score v2, Trends, and Evidence UX

> Release: `v0.52`
> Status: Drafted July 9, 2026 — implementation landed in the same pass
> Owner: Project maintainers
> Parent plan: `Documentation/engineering/v0.5_planning.md` § 5.3
> Tracker: `Documentation/engineering/Product Manager/v0.5_project_tracker.md`
> Covers: `EPIC-052-03` (score v2, trends, and evidence UX)

---

## 1. Problem

Score v1 proved that a simple, explainable score beats a magical one. But pilots still cannot answer two questions from the product alone:

1. **"Is this theme getting hotter or cooling off?"** — no trend surface exists
2. **"Why did this rank change since last week?"** — the breakdown shows *where* points come from, not *what moved*

And with analytics arriving in `v0.52`, an unguarded formula would let weekly metric windows inflate frequency and recency, making the score dishonest exactly when trust matters most.

## 2. Score v2 Formula

The weights are unchanged from v1 (frequency 40, negative sentiment 25, recency 20, source diversity 15). What changes is **which signals feed which component**:

| Component | v1 input | v2 input |
|---|---|---|
| Frequency (40) | all themed signals | customer-voice signals only |
| Negative sentiment (25) | all themed signals | customer-voice signals only |
| Recency (20) | newest themed signal | newest customer-voice signal |
| Source diversity (15) | distinct source types, all signals | distinct source types, all signals (analytics counts here) |

"Customer voice" means any signal whose `signal_kind` is not `metric_window` (interviews, tickets, survey responses).

Why: a theme mentioned by three customers should not leap up the board because twelve weekly metric windows matched it. Analytics widens the evidence base (diversity) without faking demand (frequency), emotion (sentiment), or momentum (recency). A theme supported *only* by analytics can score at most 5 points — it can appear, but never look urgent.

For themes with no analytics evidence, v2 scores are **identical to v1** — no pilot-visible rank churn from this change.

## 3. Trend Direction (US-052-03-01)

Deterministic volume comparison, no forecasting:

- window: last 14 days vs the 14 days before that
- counts customer-voice themed signals only (guardrail: weekly metric windows must not fake voice momentum)
- direction: `rising` / `flat` / `declining`

Surfaces:

- board cards: trend badge next to the score ring
- theme detail panel: badge next to the Impact Score
- insights explorer cards: badge next to the NEW chip
- hover copy states counts and the caution: "evidence volume, not proven impact"

## 4. Score-Change Explanations (US-052-03-02)

No score history table is needed. Because the formula is deterministic, the previous score is **recomputed as of 14 days ago** (signals newer than the cutoff excluded, recency measured against the cutoff). The delta then decomposes exactly into the four components.

Output (API `score_change` object): `delta`, `previous_total`, per-component deltas, `window_days`, and a plain-English `explanation` such as:

> "Score rose 12.4 over the last 14 days — recency +8.0, frequency +4.0, source diversity +0.4."

or, honestly:

> "No score change in the last 14 days."

Wording rules: real component names, one decimal, no fake precision, never a causal claim. Recency decay is allowed to *lower* scores over time and the explanation says so — that is the formula being honest, not a bug.

Surfaces: board cards (under "Why This Rank") and the theme detail panel (under "Why This Ranks Here").

## 5. Source Filters in Evidence Panels (US-052-03-03)

The theme detail panel gains source filter chips (All / per-source with counts) over the Top Evidence list. Filtering is client-side over the already-loaded `supporting_evidence` groups — no new API surface. Feed-level source filters (including Analytics) already existed and are unchanged.

## 6. Caution Language (US-052-03-04)

- analytics evidence in a theme panel is footnoted: "Analytics signals are related usage shifts from the same period — supporting evidence, not a proven cause."
- trend badges tooltip: "…evidence volume, not proven impact"
- metric-window summaries state direction and magnitude only (see `PRD-052-01` § 6)

## 7. API Changes

- `GET /api/themes/board` — each card gains `trend` and `score_change`
- `GET /api/themes/{id}` — detail gains `trend` and `score_change`
- `GET /api/themes/explorer` — each card gains `trend`
- all additions are optional fields; no breaking changes

## 8. Non-Goals

- no stored score history or time-series charts (defer until pilots ask)
- no trend forecasting or anomaly detection
- no correlation claims between analytics windows and voice signals
- no changes to the four weights — weight tuning waits for `G3M` evidence

## 9. Acceptance Evidence

- `backend/app/services/signals.py` — `calculate_impact_score` (voice/diversity split + `as_of`), `calculate_theme_trend`, `calculate_score_change`
- `backend/tests/test_score_v2.py` — 8 tests: analytics guardrails (diversity-only contribution, analytics-only theme cap), `as_of` cutoff, rising/declining/flat trends, metric-window exclusion from trend, rise explanation, stale-theme no-change
- `backend/app/api/themes.py`, `backend/app/schemas/__init__.py` — API plumbing
- `frontend/src/app/(app)/board/page.tsx` — `TrendBadge`, score-change line
- `frontend/src/components/insights/InsightsWidgets.tsx` — trend badge, score-change line, evidence source filter chips, analytics caution note
- full backend regression suite passing (209 tests) and frontend `npm run build` passing on July 9, 2026
