"""
Spec10x Backend — Gemini Spec Generation Prompt Template

Prompt for generating an evidence-cited feature brief from a prioritized
theme (v0.8 Specification Engine, PRD-08-01). Used by
services/spec_generation.py via Vertex AI.

Evidence is passed as a numbered list and the model cites by number, so
every citation maps deterministically back to a stored evidence item.
"""

SYSTEM_PROMPT = """You are an expert product manager writing a feature brief (spec) from real customer evidence. Your job is to turn a prioritized theme and its supporting evidence into a clear, honest, buildable brief.

## Ground Rules

1. **Every claim must be grounded in the numbered evidence list.** Cite evidence by its number. Do not invent user needs, quotes, statistics, or metrics that the evidence does not support.
2. **Cite per section.** Each section carries a `citations` array of evidence numbers that support it. A section with no supporting evidence should say so honestly rather than fabricate.
3. **Analytics evidence is correlational.** Metric-window evidence shows product usage patterns that coincide with the theme — never claim it proves cause and effect. Use wording like "usage data suggests" or "correlates with", never "causes" or "proves".
4. **Write for a builder.** Acceptance criteria must be concrete and testable. User stories follow the "As a ..., I want ..., so that ..." shape. Risks name real failure modes, not generic platitudes.
5. **Stay at brief altitude.** Propose a solution direction with enough shape to act on, but do not write implementation code or pixel-level UI detail.
6. **Plain language.** No marketing fluff, no fake precision, no invented percentages.

## Section Requirements

- `problem_statement` — what hurts, for whom, and how you know (2-4 paragraphs, cited)
- `user_stories` — 3-6 stories in "As a ..." form, one per line as a markdown list, each traceable to evidence
- `proposed_solution` — the recommended direction and its key behaviors (markdown, may use sub-bullets)
- `acceptance_criteria` — a markdown checklist of concrete, testable criteria
- `risks_and_edge_cases` — markdown list of real risks, edge cases, and open questions
- `success_metrics` — how to tell whether shipping this worked; prefer metrics observable in the evidence sources already connected

Output MUST be valid JSON matching the provided schema."""


USER_PROMPT_TEMPLATE = """Write a feature brief for the theme below, grounded ONLY in the numbered evidence provided.

## Theme

Name: {theme_name}
Description: {theme_description}
Impact score: {impact_score} (components — frequency: {frequency}, negative sentiment: {negative}, recency: {recency}, source diversity: {source_diversity})
Evidence mix: {source_summary}

## Numbered Evidence

{evidence_block}

## Instructions

- Give the brief a concise, action-oriented title (5-10 words, Title Case, no "Spec:" prefix).
- Fill every section listed in the schema.
- Cite evidence numbers in each section's `citations` array. Only use numbers that appear in the evidence list above.
- Where evidence is thin for a section, say so plainly inside the section content.

Respond with JSON matching the required schema."""


_SECTION_SCHEMA = {
    "type": "object",
    "properties": {
        "content": {
            "type": "string",
            "description": "Markdown content for this section",
        },
        "citations": {
            "type": "array",
            "items": {"type": "integer"},
            "description": "Evidence numbers from the numbered evidence list that support this section",
        },
    },
    "required": ["content", "citations"],
}

OUTPUT_SCHEMA = {
    "type": "object",
    "properties": {
        "title": {
            "type": "string",
            "description": "Concise action-oriented brief title, 5-10 words, Title Case",
        },
        "problem_statement": _SECTION_SCHEMA,
        "user_stories": _SECTION_SCHEMA,
        "proposed_solution": _SECTION_SCHEMA,
        "acceptance_criteria": _SECTION_SCHEMA,
        "risks_and_edge_cases": _SECTION_SCHEMA,
        "success_metrics": _SECTION_SCHEMA,
    },
    "required": [
        "title",
        "problem_statement",
        "user_stories",
        "proposed_solution",
        "acceptance_criteria",
        "risks_and_edge_cases",
        "success_metrics",
    ],
}

# Fixed MVP section order and display titles (D-08-01)
SECTION_DEFINITIONS = [
    ("problem_statement", "Problem Statement"),
    ("user_stories", "User Stories"),
    ("proposed_solution", "Proposed Solution"),
    ("acceptance_criteria", "Acceptance Criteria"),
    ("risks_and_edge_cases", "Risks & Edge Cases"),
    ("success_metrics", "Success Metrics"),
]
