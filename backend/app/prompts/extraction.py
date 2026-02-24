"""
Spec10x Backend — Gemini Extraction Prompt Template

This module stores the prompt template for Gemini-based insight extraction.
Used by services/analysis.py when use_mock=False (real AI mode).

The prompt is designed for Gemini 2.5 Flash-Lite and expects structured JSON output.
"""

# System prompt for the extraction model
SYSTEM_PROMPT = """You are an expert product research analyst. Your job is to analyze customer interview transcripts and extract structured insights.

For each interview transcript, you will:
1. Identify distinct speakers and their roles
2. Extract key insights (pain points, feature requests, positive feedback, suggestions)
3. Assign a theme suggestion for each insight
4. Rate confidence and sentiment for each insight

Output MUST be valid JSON matching the schema below."""


# JSON output schema for structured extraction
OUTPUT_SCHEMA = {
    "type": "object",
    "properties": {
        "speakers": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "label": {"type": "string", "description": "Speaker label as it appears in transcript"},
                    "name": {"type": "string", "description": "Inferred name if available"},
                    "role": {"type": "string", "description": "Inferred role (e.g., PM, Engineer, Customer)"},
                    "is_interviewer": {"type": "boolean"},
                },
                "required": ["label"],
            },
        },
        "insights": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "category": {
                        "type": "string",
                        "enum": ["pain_point", "feature_request", "positive", "suggestion"],
                    },
                    "title": {"type": "string", "description": "Concise 5-12 word title"},
                    "quote": {"type": "string", "description": "Exact quote from the transcript"},
                    "speaker": {"type": "string", "description": "Speaker label who said this"},
                    "theme_suggestion": {
                        "type": "string",
                        "description": "Suggested theme name for cross-interview clustering",
                    },
                    "sub_themes": {
                        "type": "array",
                        "items": {"type": "string"},
                        "description": "Sub-theme tags",
                    },
                    "sentiment": {
                        "type": "string",
                        "enum": ["positive", "negative", "neutral"],
                    },
                    "confidence": {
                        "type": "number",
                        "minimum": 0,
                        "maximum": 1,
                        "description": "Confidence score (0-1)",
                    },
                },
                "required": ["category", "title", "quote", "theme_suggestion", "sentiment", "confidence"],
            },
        },
        "summary": {"type": "string", "description": "2-3 sentence summary of the interview"},
        "language": {"type": "string", "description": "Detected language code (e.g., 'en')"},
    },
    "required": ["speakers", "insights", "summary", "language"],
}


# User prompt template — {transcript} is replaced with actual content
USER_PROMPT_TEMPLATE = """Analyze the following customer interview transcript. Extract all significant insights, identify speakers, and suggest themes for cross-interview analysis.

Focus on:
- Pain points the user is experiencing
- Feature requests or desired improvements
- Positive feedback about what's working well
- Suggestions for how things could be better

For each insight, provide:
- An exact quote from the transcript
- A concise title (5-12 words)
- A theme suggestion that could be used to group this with similar insights from other interviews
- Confidence score (0-1) based on how clear and actionable the insight is

TRANSCRIPT:
---
{transcript}
---

Respond with JSON matching the required schema."""
