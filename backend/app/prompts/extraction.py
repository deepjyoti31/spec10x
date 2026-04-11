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
5. Determine whether each insight comes from the INTERVIEWER or the CUSTOMER

## CRITICAL: Speaker Role Analysis

Before extracting insights, analyze the conversational dynamics to determine speaker roles:

### Interviewer Indicators (the person conducting the interview / the PM / the product person):
- Introduces a product or company at the start of the conversation
- Asks questions and probes for more detail
- Describes problems that their product solves (pitching / framing)
- Uses "we" when referring to a product being built or offered
- Gives a demo, walkthrough, or explanation of how something works
- Uses polished, marketing-style, or positioning language
- Sets the agenda or structure of the conversation
- Monologues early in the conversation explaining context

### Customer/Interviewee Indicators (the person being interviewed):
- Answers questions and responds to prompts
- Shares personal experiences using first person: "I", "my team", "at our company", "when I try to..."
- Describes their own daily workflow, processes, and tools
- Expresses genuine frustrations with specific, personal details and stories
- Mentions their own company, role, or industry context
- Provides unprompted elaboration and anecdotes
- Reacts to what the interviewer shows or describes

### For Each Insight — Is It Interviewer Voice?
- Set `is_interviewer_voice` to **true** if the statement appears to come from the person CONDUCTING the interview, NOT the customer being interviewed
- Pay special attention to the **opening section** of interviews where interviewers typically pitch their product — statements in this section describing problems or value propositions are almost always the interviewer, NOT customer insights
- A customer giving a short agreement to a leading question ("yes", "yeah", "sure", "I guess") is LOW-CONFIDENCE and should have a low confidence score (0.3-0.5)
- A customer ELABORATING with personal details, stories, or specifics after a question is HIGH-CONFIDENCE genuine feedback (0.8-1.0)
- When in doubt, lean toward marking as interviewer voice — false negatives (missing a real insight) are less damaging than false positives (attributing the interviewer's pitch to the customer)

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


# When the user has set up product context, this gets appended to the system prompt
PRODUCT_CONTEXT_BLOCK = """

## Product Context — DO NOT Extract These As Customer Insights

The user's product is described below. Statements that merely restate or echo this product positioning are likely from the interviewer's pitch, NOT from customers.

Be very careful to distinguish between:
- **Interviewer pitch** (third-person, generalized, marketing language matching the description below) → mark as `is_interviewer_voice: true`
- **Customer experience** (first-person, specific, personal stories about the same TOPIC) → these ARE valid insights even if the topic overlaps with the product positioning below

The key difference is FRAMING, not topic. A customer talking about the same problem the product solves is VALID feedback. The interviewer describing that problem as part of their pitch is NOT.

Product Context:
{product_context}"""


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
                    "is_interviewer_voice": {
                        "type": "boolean",
                        "description": "True if this insight appears to come from the interviewer/PM conducting the interview, not the customer being interviewed. Mark true for product pitches, problem framing by the interviewer, demos, and marketing language.",
                    },
                },
                "required": ["category", "title", "quote", "theme_suggestion", "sentiment", "confidence", "is_interviewer_voice"],
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
- **is_interviewer_voice**: true if this was said by the interviewer/PM, false if by the customer

## Important Guidelines

1. Each insight must map to exactly ONE theme
2. Multiple insights from the same interview CAN share the same theme
3. Use specific, topical themes — not generic labels
4. Extract the speaker's actual words as quotes, not paraphrases
5. **CRITICAL**: Carefully determine WHO said each quote. Statements from the interviewer describing their product, pitching problems, or framing value propositions should have `is_interviewer_voice: true`. Only genuine customer/interviewee statements should have `is_interviewer_voice: false`.
6. Be especially cautious with the opening section of interviews — this is where interviewers typically introduce themselves and pitch their product.

TRANSCRIPT:
---
{transcript}
---

Respond with JSON matching the required schema."""
