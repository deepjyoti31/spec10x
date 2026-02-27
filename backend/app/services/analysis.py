"""
Spec10x Backend — AI Analysis Service

Extracts structured insights from interview transcripts.
Mock mode uses keyword/heuristic matching; real mode uses Gemini.
"""

import json
import logging
import re
import random
from dataclasses import dataclass, field

import google.generativeai as genai

from app.core.config import get_settings
from app.prompts.extraction import SYSTEM_PROMPT, USER_PROMPT_TEMPLATE, OUTPUT_SCHEMA

logger = logging.getLogger(__name__)

# Track whether genai has been configured
_genai_configured = False


# ─── Data Classes ────────────────────────────────────────

@dataclass
class InsightData:
    """A single extracted insight from an interview."""
    category: str  # pain_point, feature_request, positive, suggestion
    title: str
    quote: str
    quote_start: int | None = None
    quote_end: int | None = None
    speaker: str | None = None
    theme_suggestion: str = ""
    sub_themes: list[str] = field(default_factory=list)
    sentiment: str = "neutral"  # positive, negative, neutral
    confidence: float = 0.85


@dataclass
class SpeakerData:
    """A detected speaker in the interview."""
    label: str
    name: str | None = None
    role: str | None = None
    is_interviewer: bool = False


@dataclass
class AnalysisResult:
    """Complete analysis result for one interview."""
    insights: list[InsightData] = field(default_factory=list)
    speakers: list[SpeakerData] = field(default_factory=list)
    summary: str = ""
    language: str = "en"


# ─── Keyword Patterns ────────────────────────────────────

PAIN_PATTERNS = [
    (r"frustrat\w*", "Frustration"),
    (r"difficult|hard to|struggle\w*", "Difficulty"),
    (r"confus\w*", "Confusion"),
    (r"slow|takes? too long|time[- ]consuming", "Performance Issues"),
    (r"broken|doesn'?t work|bug\w*", "Bugs and Issues"),
    (r"overwhelm\w*|too many|clutter\w*", "Information Overload"),
    (r"can'?t find|search.*(doesn'?t|not).*work", "Search Problems"),
    (r"wrong|incorrect|error\w*", "Errors"),
    (r"annoying|bother\w*|irritat\w*", "Annoyance"),
]

FEATURE_PATTERNS = [
    (r"wish\w*|would be great|would love", "Desired Features"),
    (r"need\w*|should have|should be", "Requirements"),
    (r"want\w*|looking for", "User Wants"),
    (r"miss\w*|lacking", "Missing Features"),
    (r"integrat\w*|connect\w*", "Integrations"),
    (r"mobile|phone|app", "Mobile Support"),
    (r"collaborat\w*|share\w*|team", "Collaboration"),
    (r"export\w*|download\w*", "Export Features"),
]

POSITIVE_PATTERNS = [
    (r"love\w*|amazing|excellent", "Highly Positive"),
    (r"great|good|nice|helpful", "Positive"),
    (r"easy|simple|intuitive|straightforward", "Ease of Use"),
    (r"fast|quick|efficient", "Speed"),
    (r"recommend\w*", "Recommends"),
]

THEME_KEYWORDS = {
    "onboard": "Onboarding Experience",
    "search": "Search Functionality",
    "export": "Export & Data Access",
    "notif": "Notification System",
    "mobile": "Mobile Experience",
    "collaborat": "Team Collaboration",
    "dashboard": "Dashboard & Analytics",
    "pricing": "Pricing & Value",
    "support": "Customer Support",
    "document": "Documentation",
    "setup": "Setup & Configuration",
    "performance": "Performance",
    "ui": "User Interface",
    "ux": "User Experience",
    "report": "Reporting",
    "integrat": "Integrations",
}


# ─── Analysis Functions ──────────────────────────────────

def analyze_transcript(
    transcript: str,
    use_mock: bool = True,
) -> AnalysisResult:
    """
    Analyze an interview transcript and extract structured insights.

    Args:
        transcript: Full text of the interview
        use_mock: If True, use keyword matching; if False, use Gemini

    Returns:
        AnalysisResult with insights, speakers, summary, language
    """
    if use_mock:
        return _mock_analyze(transcript)
    else:
        return _real_analyze(transcript)


def _mock_analyze(transcript: str) -> AnalysisResult:
    """Mock analysis using keyword/heuristic matching."""
    result = AnalysisResult()

    # Detect speakers
    result.speakers = _detect_speakers(transcript)

    # Split into sentences/segments
    segments = _split_into_segments(transcript)

    # Scan for insights
    for segment in segments:
        text = segment["text"]
        text_lower = text.lower()

        # Check pain points
        for pattern, label in PAIN_PATTERNS:
            if re.search(pattern, text_lower):
                theme = _guess_theme(text_lower)
                insight = InsightData(
                    category="pain_point",
                    title=_generate_title(text, "pain_point", label),
                    quote=text.strip(),
                    quote_start=segment.get("start"),
                    quote_end=segment.get("end"),
                    speaker=segment.get("speaker"),
                    theme_suggestion=theme,
                    sentiment="negative",
                    confidence=round(random.uniform(0.75, 0.95), 2),
                )
                result.insights.append(insight)
                break

        # Check feature requests
        for pattern, label in FEATURE_PATTERNS:
            if re.search(pattern, text_lower):
                if any(i.quote == text.strip() for i in result.insights):
                    break
                theme = _guess_theme(text_lower)
                insight = InsightData(
                    category="feature_request",
                    title=_generate_title(text, "feature_request", label),
                    quote=text.strip(),
                    quote_start=segment.get("start"),
                    quote_end=segment.get("end"),
                    speaker=segment.get("speaker"),
                    theme_suggestion=theme,
                    sentiment="neutral",
                    confidence=round(random.uniform(0.7, 0.9), 2),
                )
                result.insights.append(insight)
                break

        # Check positive feedback
        for pattern, label in POSITIVE_PATTERNS:
            if re.search(pattern, text_lower):
                if any(i.quote == text.strip() for i in result.insights):
                    break
                theme = _guess_theme(text_lower)
                insight = InsightData(
                    category="positive",
                    title=_generate_title(text, "positive", label),
                    quote=text.strip(),
                    quote_start=segment.get("start"),
                    quote_end=segment.get("end"),
                    speaker=segment.get("speaker"),
                    theme_suggestion=theme,
                    sentiment="positive",
                    confidence=round(random.uniform(0.8, 0.95), 2),
                )
                result.insights.append(insight)
                break

    # Generate summary
    pain_count = sum(1 for i in result.insights if i.category == "pain_point")
    feature_count = sum(1 for i in result.insights if i.category == "feature_request")
    positive_count = sum(1 for i in result.insights if i.category == "positive")
    result.summary = (
        f"Interview analysis found {len(result.insights)} insights: "
        f"{pain_count} pain points, {feature_count} feature requests, "
        f"{positive_count} positive feedback items."
    )

    logger.info(
        f"Mock analysis complete: {len(result.insights)} insights, "
        f"{len(result.speakers)} speakers"
    )
    return result


def _configure_genai():
    """Configure the genai SDK (once) with API key or ADC."""
    global _genai_configured
    if _genai_configured:
        return
    settings = get_settings()
    if settings.google_api_key:
        genai.configure(api_key=settings.google_api_key)
        logger.info("Gemini configured with API key")
    else:
        logger.info("Gemini using Application Default Credentials")
    _genai_configured = True


def _real_analyze(transcript: str) -> AnalysisResult:
    """
    Real analysis using Gemini. Sends the transcript with the extraction
    prompt and parses structured JSON output into AnalysisResult.
    """
    _configure_genai()
    settings = get_settings()

    try:
        model = genai.GenerativeModel(
            model_name=settings.gemini_model,
            system_instruction=SYSTEM_PROMPT,
        )

        prompt = USER_PROMPT_TEMPLATE.format(transcript=transcript[:50000])  # Limit transcript length

        response = model.generate_content(
            prompt,
            generation_config=genai.GenerationConfig(
                response_mime_type="application/json",
                response_schema=OUTPUT_SCHEMA,
                temperature=0.2,
            ),
        )

        # Parse JSON response
        data = json.loads(response.text)

        # Build AnalysisResult from parsed JSON
        result = AnalysisResult(
            summary=data.get("summary", ""),
            language=data.get("language", "en"),
        )

        # Parse speakers
        for s in data.get("speakers", []):
            result.speakers.append(SpeakerData(
                label=s.get("label", "Unknown"),
                name=s.get("name"),
                role=s.get("role"),
                is_interviewer=s.get("is_interviewer", False),
            ))

        # Parse insights
        for i in data.get("insights", []):
            # Find quote position in transcript
            quote = i.get("quote", "")
            quote_start = transcript.find(quote) if quote else None
            quote_end = (quote_start + len(quote)) if quote_start and quote_start >= 0 else None

            result.insights.append(InsightData(
                category=i.get("category", "suggestion"),
                title=i.get("title", ""),
                quote=quote,
                quote_start=quote_start if quote_start and quote_start >= 0 else None,
                quote_end=quote_end,
                speaker=i.get("speaker"),
                theme_suggestion=i.get("theme_suggestion", "General Feedback"),
                sub_themes=i.get("sub_themes", []),
                sentiment=i.get("sentiment", "neutral"),
                confidence=i.get("confidence", 0.85),
            ))

        logger.info(
            f"Gemini analysis complete: {len(result.insights)} insights, "
            f"{len(result.speakers)} speakers"
        )
        return result

    except Exception as e:
        logger.error(f"Gemini analysis failed: {e}")
        logger.info("Falling back to mock analysis")
        return _mock_analyze(transcript)


# ─── Helper Functions ────────────────────────────────────

def _detect_speakers(transcript: str) -> list[SpeakerData]:
    """Detect speaker labels from transcript patterns."""
    speakers = {}
    # Match patterns like "Speaker 1:", "Interviewer:", "Sarah:", "SPEAKER 1:"
    pattern = r'^((?:Speaker\s*\d+|Interviewer|[\w]+)):\s'
    for match in re.finditer(pattern, transcript, re.MULTILINE | re.IGNORECASE):
        label = match.group(1).strip()
        if label not in speakers:
            is_interviewer = "interviewer" in label.lower()
            speakers[label] = SpeakerData(
                label=label,
                name=None if label.startswith("Speaker") else label,
                is_interviewer=is_interviewer,
            )
    return list(speakers.values())


def _split_into_segments(transcript: str) -> list[dict]:
    """Split transcript into segments for analysis."""
    segments = []
    current_speaker = None
    current_pos = 0

    lines = transcript.split("\n")
    for line in lines:
        line = line.strip()
        if not line:
            continue

        # Detect speaker change
        speaker_match = re.match(
            r'^((?:Speaker\s*\d+|Interviewer|[\w]+)):\s*(.*)',
            line,
            re.IGNORECASE,
        )
        if speaker_match:
            current_speaker = speaker_match.group(1).strip()
            text = speaker_match.group(2).strip()
        else:
            text = line

        if text:
            # Split long text into sentences
            sentences = re.split(r'(?<=[.!?])\s+', text)
            for sentence in sentences:
                sentence = sentence.strip()
                if len(sentence) > 20:  # Skip very short fragments
                    pos = transcript.find(sentence, current_pos)
                    segments.append({
                        "text": sentence,
                        "speaker": current_speaker,
                        "start": pos if pos >= 0 else None,
                        "end": (pos + len(sentence)) if pos >= 0 else None,
                    })
                    if pos >= 0:
                        current_pos = pos + len(sentence)

    return segments


def _guess_theme(text: str) -> str:
    """Guess a theme name based on keywords in the text."""
    for keyword, theme in THEME_KEYWORDS.items():
        if keyword in text:
            return theme

    # Default theme based on general content
    return "General Feedback"


def _generate_title(text: str, category: str, label: str) -> str:
    """Generate a concise insight title from the quote text."""
    # Take first 80 chars and clean up
    title = text[:80].strip()
    if len(text) > 80:
        # Cut at last space
        last_space = title.rfind(" ")
        if last_space > 40:
            title = title[:last_space]
        title += "..."

    # Remove speaker prefix if present
    title = re.sub(r'^(?:Speaker\s*\d+|Interviewer):\s*', '', title, flags=re.IGNORECASE)

    return title
