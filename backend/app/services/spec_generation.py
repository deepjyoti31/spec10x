"""
Spec10x Backend — Spec Generation Service (v0.8 Specification Engine)

Turns a prioritized theme plus its matched evidence signals into a
structured, evidence-cited feature brief using Gemini via Vertex AI.

Design (PRD-08-01):
  - evidence is passed to the model as a numbered list; the model cites by
    number, so citations map deterministically back to stored evidence
  - the evidence used for generation is snapshotted onto the spec row
    (`evidence_json`), so the brief stays renderable after theme merges,
    signal changes, or theme deletion
  - one bounded Gemini call per generation (D-08-02): at most
    EVIDENCE_VOICE_CAP voice signals plus EVIDENCE_METRIC_CAP metric windows
"""

import json
import logging

from google import genai
from google.genai import types
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.models import Signal, Spec, SpecGenerationStatus, SpecStatus, Theme, User
from app.prompts.spec_generation import (
    OUTPUT_SCHEMA,
    SECTION_DEFINITIONS,
    SYSTEM_PROMPT,
    USER_PROMPT_TEMPLATE,
)
from app.services.signals import (
    PROVIDER_LABELS,
    SIGNAL_KIND_LABELS,
    SOURCE_TYPE_LABELS,
    build_signal_link,
    build_source_breakdown,
    calculate_impact_score,
    is_voice_signal,
)

logger = logging.getLogger(__name__)

# Bounded generation input (PRD-08-01 functional requirement)
EVIDENCE_VOICE_CAP = 40
EVIDENCE_METRIC_CAP = 5
EVIDENCE_EXCERPT_CHARS = 280


def build_spec_evidence(theme_signals: list[Signal]) -> list[dict]:
    """Build the numbered evidence snapshot stored on the spec.

    Voice signals (newest first, capped) come before analytics metric
    windows (capped) so citations favor customer language.
    """
    newest_first = sorted(
        theme_signals, key=lambda signal: signal.occurred_at, reverse=True
    )
    voice = [s for s in newest_first if is_voice_signal(s)][:EVIDENCE_VOICE_CAP]
    metric = [s for s in newest_first if not is_voice_signal(s)][:EVIDENCE_METRIC_CAP]

    evidence: list[dict] = []
    for ref, signal in enumerate([*voice, *metric], start=1):
        content_text = signal.content_text or ""
        excerpt = (
            content_text
            if len(content_text) <= EVIDENCE_EXCERPT_CHARS
            else f"{content_text[:EVIDENCE_EXCERPT_CHARS - 3]}..."
        )
        evidence.append(
            {
                "ref": ref,
                "signal_id": str(signal.id),
                "source_type": signal.source_type.value,
                "source_label": SOURCE_TYPE_LABELS.get(
                    signal.source_type, signal.source_type.value.title()
                ),
                "provider_label": PROVIDER_LABELS.get(
                    signal.provider, signal.provider.replace("_", " ").title()
                ),
                "signal_kind": signal.signal_kind.value,
                "signal_kind_label": SIGNAL_KIND_LABELS.get(
                    signal.signal_kind,
                    signal.signal_kind.value.replace("_", " ").title(),
                ),
                "excerpt": excerpt,
                "author_or_speaker": signal.author_or_speaker,
                "sentiment": signal.sentiment,
                "occurred_at": signal.occurred_at.isoformat(),
                "link": build_signal_link(signal),
            }
        )
    return evidence


def _format_evidence_block(evidence: list[dict]) -> str:
    lines = []
    for item in evidence:
        descriptor_parts = [item["source_label"], item["signal_kind_label"]]
        if item["sentiment"]:
            descriptor_parts.append(item["sentiment"])
        if item["author_or_speaker"]:
            descriptor_parts.append(item["author_or_speaker"])
        descriptor_parts.append(item["occurred_at"][:10])
        lines.append(f"[{item['ref']}] ({', '.join(descriptor_parts)}) {item['excerpt']}")
    return "\n".join(lines)


def _sanitize_citations(raw_citations, valid_refs: set[int]) -> list[int]:
    """Drop citation refs that do not exist in the evidence list."""
    cleaned: set[int] = set()
    for value in raw_citations or []:
        try:
            ref = int(value)
        except (TypeError, ValueError):
            continue
        if ref in valid_refs:
            cleaned.add(ref)
    return sorted(cleaned)


def _parse_generated_sections(data: dict, valid_refs: set[int]) -> list[dict]:
    sections: list[dict] = []
    for key, title in SECTION_DEFINITIONS:
        raw_section = data.get(key) or {}
        sections.append(
            {
                "key": key,
                "title": title,
                "content": (raw_section.get("content") or "").strip(),
                "citations": _sanitize_citations(
                    raw_section.get("citations"), valid_refs
                ),
            }
        )
    return sections


def _generate_brief(
    *,
    theme: Theme,
    evidence: list[dict],
    score,
    source_summary: str,
) -> dict:
    """One bounded Gemini call returning the parsed brief JSON."""
    settings = get_settings()
    client = genai.Client(
        vertexai=True,
        project=settings.gcp_project_id,
        location=settings.gcp_location,
    )
    prompt = USER_PROMPT_TEMPLATE.format(
        theme_name=theme.name,
        theme_description=theme.description or "No description.",
        impact_score=score.total,
        frequency=score.frequency,
        negative=score.negative,
        recency=score.recency,
        source_diversity=score.source_diversity,
        source_summary=source_summary,
        evidence_block=_format_evidence_block(evidence),
    )
    response = client.models.generate_content(
        model=settings.gemini_model,
        contents=prompt,
        config=types.GenerateContentConfig(
            response_mime_type="application/json",
            response_schema=OUTPUT_SCHEMA,
            temperature=0.3,
            system_instruction=SYSTEM_PROMPT,
        ),
    )
    return json.loads(response.text)


async def generate_spec_for_theme(
    db: AsyncSession,
    *,
    user: User,
    theme: Theme,
    spec: Spec,
    theme_signals: list[Signal],
) -> Spec:
    """Generate (or regenerate) the brief for `spec` from `theme` evidence.

    Failures are recorded on the spec row (`generation_status=error`) rather
    than raised, so the API can return the spec and the user can retry.
    """
    settings = get_settings()
    evidence = build_spec_evidence(theme_signals)
    score = calculate_impact_score(theme_id=theme.id, signals=theme_signals)
    source_summary = (
        ", ".join(
            f"{entry['count']} {entry['label'].lower()}"
            for entry in build_source_breakdown(theme_signals)
        )
        or "no evidence"
    )

    spec.theme_name_snapshot = theme.name
    spec.evidence_json = evidence
    spec.impact_score_snapshot = score.total
    spec.model_used = settings.gemini_model

    try:
        data = _generate_brief(
            theme=theme,
            evidence=evidence,
            score=score,
            source_summary=source_summary,
        )
        valid_refs = {item["ref"] for item in evidence}
        sections = _parse_generated_sections(data, valid_refs)
        if all(not section["content"] for section in sections):
            raise ValueError("Model returned an empty brief")

        spec.title = (data.get("title") or "").strip() or theme.name
        spec.sections_json = sections
        spec.generation_status = SpecGenerationStatus.ready
        spec.generation_error = None
        spec.status = SpecStatus.draft
        spec.is_edited = False
        logger.info(
            f"Spec generation complete for theme {theme.id}: "
            f"{len(sections)} sections, {len(evidence)} evidence items"
        )
    except Exception as exc:
        logger.error(f"Spec generation failed for theme {theme.id}: {exc}")
        spec.title = spec.title or theme.name
        spec.generation_status = SpecGenerationStatus.error
        spec.generation_error = str(exc)[:2000]

    await db.flush()
    return spec
