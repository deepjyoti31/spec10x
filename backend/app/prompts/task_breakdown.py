"""
Spec10x Backend — Gemini Task Breakdown Prompt Template

Prompt for breaking an approved, evidence-cited spec into atomic,
agent-ready tasks (v1.0 Full Loop, PRD-10-01). Used by
services/task_breakdown.py via Vertex AI.

The input is the spec's own sections and numbered evidence snapshot, so
tasks always agree with the document the PM approved. Tasks cite evidence
by the same numbers as the spec sections do.
"""

MAX_TASKS = 12

SYSTEM_PROMPT = """You are an expert tech lead breaking an approved feature brief into a build plan for an AI coding agent (or an engineer). Your job is to produce atomic, ordered, independently completable tasks.

## Ground Rules

1. **Stay inside the brief.** Every task must implement something the brief actually asks for. Do not invent features, infrastructure, or refactors the brief does not need.
2. **Atomic and completable.** Each task should be finishable in one focused working session and verifiable on its own. Split anything that mixes unrelated concerns; merge anything too small to verify alone.
3. **Order by dependency.** List tasks in a buildable order. Use `depends_on` to name the task numbers that must land first. Only reference tasks in this list.
4. **Cite evidence.** Where a task exists because of specific user evidence, carry the evidence numbers in `citations` so the builder sees why the task matters. Only use numbers from the evidence list.
5. **Size honestly.** `complexity` is S (small, mechanical), M (a real unit of work), or L (large — consider whether it should be split, and if it must stay one task, say why in the summary).
6. **Write for a builder who has the brief.** Summaries say what to build and what done looks like — concrete acceptance in one or two sentences, not process instructions.

Return between 3 and {max_tasks} tasks. Output MUST be valid JSON matching the provided schema."""


USER_PROMPT_TEMPLATE = """Break the feature brief below into agent-ready tasks, grounded ONLY in the brief and its numbered evidence.

## Feature Brief: {title}

{sections_block}

## Numbered Evidence

{evidence_block}

## Instructions

- Produce 3 to {max_tasks} tasks in buildable order.
- `depends_on` may only contain task numbers from this list (a task cannot depend on itself).
- `citations` may only contain numbers from the evidence list above.

Respond with JSON matching the required schema."""


_TASK_SCHEMA = {
    "type": "object",
    "properties": {
        "title": {
            "type": "string",
            "description": "Short imperative task title, e.g. 'Add guided setup checklist model'",
        },
        "summary": {
            "type": "string",
            "description": "What to build and what done looks like, 1-3 sentences",
        },
        "complexity": {
            "type": "string",
            "enum": ["S", "M", "L"],
            "description": "S = small/mechanical, M = a real unit of work, L = large",
        },
        "depends_on": {
            "type": "array",
            "items": {"type": "integer"},
            "description": "Task numbers (1-based position in this list) that must land first",
        },
        "citations": {
            "type": "array",
            "items": {"type": "integer"},
            "description": "Evidence numbers that motivate this task",
        },
    },
    "required": ["title", "summary", "complexity", "depends_on", "citations"],
}

OUTPUT_SCHEMA = {
    "type": "object",
    "properties": {
        "tasks": {
            "type": "array",
            "items": _TASK_SCHEMA,
            "description": "Atomic tasks in buildable order",
        },
    },
    "required": ["tasks"],
}
