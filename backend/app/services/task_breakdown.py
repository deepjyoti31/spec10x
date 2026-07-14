"""
Spec10x Backend — Task Breakdown Service (v1.0 Full Loop)

Breaks an approved, evidence-cited spec into atomic, agent-ready tasks
using Gemini via Vertex AI, and renders the agent-ready markdown export
bundle (spec + tasks + evidence appendix).

Design (PRD-10-01):
  - input is the spec's own `sections_json` and `evidence_json` — no fresh
    signal query, so tasks always agree with the approved document
  - one bounded Gemini call per breakdown, at most MAX_TASKS tasks
  - `depends_on` and `citations` are sanitized server-side the same way
    v0.8 sanitizes section citations: unknown refs are dropped, never
    rendered as broken links (D-10-03: a failed generation persists nothing)
"""

from __future__ import annotations

import json
import logging

from google import genai
from google.genai import types

from app.core.config import get_settings
from app.models import Spec
from app.prompts.task_breakdown import (
    MAX_TASKS,
    OUTPUT_SCHEMA,
    SYSTEM_PROMPT,
    USER_PROMPT_TEMPLATE,
)
from app.services.spec_generation import _sanitize_citations

logger = logging.getLogger(__name__)

VALID_COMPLEXITIES = {"S", "M", "L"}


class TaskGenerationError(Exception):
    """The model failed to produce a usable task breakdown."""


def _sections_block(sections: list[dict]) -> str:
    blocks = []
    for section in sections:
        content = (section.get("content") or "").strip()
        if not content:
            continue
        citations = section.get("citations") or []
        cite_note = f" (evidence: {', '.join(str(ref) for ref in citations)})" if citations else ""
        blocks.append(f"### {section.get('title', section.get('key', 'Section'))}{cite_note}\n\n{content}")
    return "\n\n".join(blocks)


def _evidence_block(evidence: list[dict]) -> str:
    lines = []
    for item in evidence:
        descriptor_parts = [item.get("source_label", "Evidence")]
        if item.get("sentiment"):
            descriptor_parts.append(item["sentiment"])
        if item.get("author_or_speaker"):
            descriptor_parts.append(item["author_or_speaker"])
        lines.append(f"[{item['ref']}] ({', '.join(descriptor_parts)}) {item.get('excerpt', '')}")
    return "\n".join(lines)


def _parse_generated_tasks(data: dict, valid_refs: set[int]) -> list[dict]:
    raw_tasks = (data.get("tasks") or [])[:MAX_TASKS]
    if not raw_tasks:
        raise TaskGenerationError("Model returned no tasks")

    valid_numbers = set(range(1, len(raw_tasks) + 1))
    tasks: list[dict] = []
    for number, raw in enumerate(raw_tasks, start=1):
        title = (raw.get("title") or "").strip()
        summary = (raw.get("summary") or "").strip()
        if not title:
            raise TaskGenerationError(f"Task {number} has no title")
        complexity = (raw.get("complexity") or "M").strip().upper()
        if complexity not in VALID_COMPLEXITIES:
            complexity = "M"
        depends_on = [
            ref
            for ref in _sanitize_citations(raw.get("depends_on"), valid_numbers)
            if ref != number
        ]
        tasks.append(
            {
                "number": number,
                "title": title,
                "summary": summary,
                "complexity": complexity,
                "depends_on": depends_on,
                "citations": _sanitize_citations(raw.get("citations"), valid_refs),
            }
        )
    return tasks


def generate_tasks_for_spec(spec: Spec) -> list[dict]:
    """One bounded Gemini call returning the sanitized task list.

    Raises TaskGenerationError instead of persisting partial output —
    unlike spec drafts, a partial task list has no review value (D-10-03).
    """
    settings = get_settings()
    sections = spec.sections_json or []
    evidence = spec.evidence_json or []

    client = genai.Client(
        vertexai=True,
        project=settings.gcp_project_id,
        location=settings.gcp_location,
    )
    prompt = USER_PROMPT_TEMPLATE.format(
        title=spec.title,
        sections_block=_sections_block(sections),
        evidence_block=_evidence_block(evidence) or "No evidence items.",
        max_tasks=MAX_TASKS,
    )
    try:
        response = client.models.generate_content(
            model=settings.gemini_model,
            contents=prompt,
            config=types.GenerateContentConfig(
                response_mime_type="application/json",
                response_schema=OUTPUT_SCHEMA,
                temperature=0.2,
                system_instruction=SYSTEM_PROMPT.format(max_tasks=MAX_TASKS),
            ),
        )
        data = json.loads(response.text)
    except TaskGenerationError:
        raise
    except Exception as exc:
        logger.error(f"Task breakdown failed for spec {spec.id}: {exc}")
        raise TaskGenerationError(str(exc)[:500]) from exc

    valid_refs = {item["ref"] for item in evidence}
    tasks = _parse_generated_tasks(data, valid_refs)
    logger.info(f"Task breakdown complete for spec {spec.id}: {len(tasks)} tasks")
    return tasks


# ─── Agent-ready markdown export (D-10-04) ───────────────


def _format_refs(refs: list[int]) -> str:
    return ", ".join(f"[{ref}]" for ref in refs)


def render_spec_export(spec: Spec) -> str:
    """Self-contained markdown context bundle: brief + tasks + evidence.

    Contains only the spec row's own snapshot — exactly what Spec Studio
    already shows — so nothing unreviewed can leak into the handoff.
    """
    sections = spec.sections_json or []
    evidence = spec.evidence_json or []
    tasks = spec.tasks_json or []

    lines: list[str] = [
        f"# {spec.title}",
        "",
        f"> Spec10x feature brief — status: {spec.status.value}"
        + (f" · from theme: {spec.theme_name_snapshot}" if spec.theme_name_snapshot else ""),
        "> Evidence references like [n] resolve to the numbered evidence appendix at the end.",
        "",
    ]

    for section in sections:
        content = (section.get("content") or "").strip()
        lines.append(f"## {section.get('title', section.get('key', 'Section'))}")
        lines.append("")
        lines.append(content if content else "_This section is empty._")
        citations = section.get("citations") or []
        if citations:
            lines.append("")
            lines.append(f"Evidence: {_format_refs(citations)}")
        lines.append("")

    if tasks:
        lines.append("## Task Breakdown")
        lines.append("")
        for task in tasks:
            meta_parts = [f"complexity {task.get('complexity', 'M')}"]
            depends_on = task.get("depends_on") or []
            if depends_on:
                meta_parts.append(
                    "after " + ", ".join(f"#{number}" for number in depends_on)
                )
            lines.append(f"### Task {task['number']}: {task['title']} ({'; '.join(meta_parts)})")
            lines.append("")
            if task.get("summary"):
                lines.append(task["summary"])
            citations = task.get("citations") or []
            if citations:
                lines.append("")
                lines.append(f"Evidence: {_format_refs(citations)}")
            lines.append("")

    if evidence:
        lines.append("## Evidence Appendix")
        lines.append("")
        lines.append(
            "_Snapshot taken at spec generation. Analytics items show usage that"
            " correlates with the theme — supporting evidence, not proven impact._"
        )
        lines.append("")
        for item in evidence:
            descriptor_parts = [item.get("source_label", "Evidence")]
            if item.get("signal_kind_label"):
                descriptor_parts.append(item["signal_kind_label"])
            if item.get("sentiment"):
                descriptor_parts.append(item["sentiment"])
            if item.get("author_or_speaker"):
                descriptor_parts.append(item["author_or_speaker"])
            occurred_at = (item.get("occurred_at") or "")[:10]
            if occurred_at:
                descriptor_parts.append(occurred_at)
            lines.append(f"- **[{item['ref']}]** ({', '.join(descriptor_parts)}) {item.get('excerpt', '')}")
        lines.append("")

    return "\n".join(lines)
