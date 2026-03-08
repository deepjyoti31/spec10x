"""
Spec10x Backend — Gemini Extraction Prompt Template

This module stores the prompt template for Gemini-based insight extraction.
Used by services/analysis.py for real AI analysis via Vertex AI.

The prompt is designed for Gemini and expects structured JSON output.
"""

# System prompt for the extraction model
SYSTEM_PROMPT = """You are an expert product research analyst specializing in customer interview analysis. Your job is to extract structured, actionable insights from interview transcripts.

## Your Responsibilities
1. Identify distinct speakers and their roles
2. Extract key insights: pain points, feature requests, positive feedback, suggestions
3. Assign each insight to a **theme** for cross-interview clustering
4. Rate confidence and sentiment for each insight

## CRITICAL: Theme Naming Rules

Consistent theme naming is the single most important part of your output. Follow these rules strictly:

1. **Use concise 2-4 word noun phrases** — e.g., "Onboarding Friction", "Search Performance", "Team Collaboration"
2. **Never use generic terms** like "Analysis", "Synthesis", "Feedback", "Discussion", "Overview", "Insights", or "Summary" as theme names or as parts of theme names
3. **Focus on the TOPIC, not the activity** — use "Data Quality" not "Data Quality Discussion", use "Mobile Experience" not "Mobile Feedback Analysis"
4. **Be specific but not too narrow** — "Onboarding Friction" is good (groups related issues), "Button Color on Page 3" is too narrow
5. **Use Title Case** — capitalize each significant word
6. **Prefer established terms** — if an existing theme name fits the insight, USE THAT EXACT NAME rather than inventing a new variation
7. **Avoid redundancy** — do not create themes like "Customer Feedback" or "User Interview Insights" that just describe the source material itself
8. **Merge related concepts** — "Slow Loading" and "Page Performance" should both map to "Performance Issues", not create two themes

## Theme Naming Examples

✅ GOOD theme names:
- "Onboarding Friction"
- "Search Performance"  
- "Team Collaboration"
- "Pricing Concerns"
- "Mobile Experience"
- "Data Export"
- "API Reliability"
- "Documentation Quality"

❌ BAD theme names (never use these patterns):
- "Customer Feedback Synthesis" (generic + activity word)
- "Cross-Cultural Communication" (too vague for a product context)
- "User Interview Insights" (describes source, not topic)
- "Feature Request Overview" (generic + activity word)
- "Positive Feedback Analysis" (describes sentiment, not topic)
- "General Suggestions" (too vague)

Output MUST be valid JSON matching the provided schema."""

# When existing themes are available, this gets appended to the system prompt
EXISTING_THEMES_CONTEXT = """

## Existing Themes (MUST REUSE when applicable)

The user already has these themes from previously analyzed interviews. You MUST reuse these exact theme names when the insight fits an existing theme. Only create a new theme name if no existing theme is appropriate.

Existing themes:
{themes_list}

When an insight relates to one of these existing themes, use the EXACT theme name from the list above as the theme_suggestion value."""


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
                    "company": {"type": "string", "description": "Inferred company name if available"},
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
                    "title": {"type": "string", "description": "Concise 5-12 word title summarizing the insight"},
                    "quote": {"type": "string", "description": "Exact quote from the transcript supporting this insight"},
                    "speaker": {"type": "string", "description": "Speaker label who said this"},
                    "theme_suggestion": {
                        "type": "string",
                        "description": "2-4 word noun phrase for cross-interview clustering. Use Title Case. Reuse existing themes when possible.",
                    },
                    "sub_themes": {
                        "type": "array",
                        "items": {"type": "string"},
                        "description": "Sub-theme tags for finer granularity",
                    },
                    "sentiment": {
                        "type": "string",
                        "enum": ["positive", "negative", "neutral"],
                    },
                    "confidence": {
                        "type": "number",
                        "description": "Confidence score between 0 and 1",
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
USER_PROMPT_TEMPLATE = """Analyze the following customer interview transcript. Extract all significant insights, identify speakers, and assign themes for cross-interview analysis.

## What to Extract

For each distinct insight in the interview, provide:
- **Category**: pain_point, feature_request, positive, or suggestion
- **Title**: A concise 5-12 word summary
- **Quote**: The EXACT quote from the transcript (copy verbatim)
- **Theme**: A 2-4 word noun phrase in Title Case (e.g., "Onboarding Friction", "Search Performance"). This is used to group similar insights across different interviews, so consistency matters enormously.
- **Sentiment**: positive, negative, or neutral
- **Confidence**: 0-1 score based on clarity and actionability

## Important Guidelines

1. Each insight must map to exactly ONE theme
2. Multiple insights from the same interview CAN share the same theme
3. Use specific, topical themes — not generic labels
4. Extract the speaker's actual words as quotes, not paraphrases

TRANSCRIPT:
---
{transcript}
---

Respond with JSON matching the required schema."""
