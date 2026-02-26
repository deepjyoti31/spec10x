"""
Spec10x Backend — Demo API Routes

Loads sample interview data for new users to explore the platform.
"""

import uuid
import logging
from datetime import datetime, timezone

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func

from app.core.auth import get_current_user
from app.core.database import get_db
from app.models import (
    User,
    Interview,
    Speaker,
    Theme,
    SubTheme,
    Insight,
    FileType,
    InterviewStatus,
    InsightCategory,
    ThemeStatus,
)

router = APIRouter(prefix="/api/demo", tags=["Demo"])
logger = logging.getLogger(__name__)

# ─── Sample Data ─────────────────────────────────────────

SAMPLE_INTERVIEWS = [
    {
        "filename": "Sarah_Chen_PM_Interview.txt",
        "transcript": (
            "Interviewer: Thanks for joining us, Sarah. Can you tell me about your "
            "current workflow for managing customer feedback?\n\n"
            "Sarah Chen: Sure. Right now we use a combination of Notion docs and "
            "spreadsheets. After every customer call, I manually write up notes and "
            "try to tag them with themes. It takes me about 30 minutes per interview "
            "just to organize the notes.\n\n"
            "Interviewer: What are the biggest pain points in that process?\n\n"
            "Sarah Chen: The biggest issue is that insights get lost. We have hundreds "
            "of pages of notes across different documents, and there's no way to search "
            "across all of them efficiently. I've missed important patterns because the "
            "data is so fragmented.\n\n"
            "Interviewer: If you could wave a magic wand, what would the ideal tool "
            "look like?\n\n"
            "Sarah Chen: I'd love something that automatically extracts the key "
            "insights from transcripts and groups them by theme. Like, pain points "
            "in one bucket, feature requests in another. And I want to be able to ask "
            "questions across all my interviews at once — like a ChatGPT for my "
            "research data.\n\n"
            "Interviewer: How much time do you think that would save?\n\n"
            "Sarah Chen: Easily 5-10 hours a week. Right now I spend a full day every "
            "week just synthesizing feedback. If that were automated, I could focus on "
            "actually building what customers need."
        ),
        "speakers": [
            {"label": "Interviewer", "name": "Interviewer", "is_interviewer": True},
            {"label": "Sarah Chen", "name": "Sarah Chen", "role": "Product Manager",
             "company": "TechCorp", "is_interviewer": False},
        ],
        "insights": [
            {
                "category": "pain_point",
                "title": "Manual note-taking is time-consuming",
                "quote": "It takes me about 30 minutes per interview just to organize the notes",
                "sentiment": "negative",
                "theme_suggestion": "Manual Workflow Overhead",
            },
            {
                "category": "pain_point",
                "title": "Insights get lost in fragmented data",
                "quote": "insights get lost. We have hundreds of pages of notes across different documents",
                "sentiment": "negative",
                "theme_suggestion": "Data Fragmentation",
            },
            {
                "category": "feature_request",
                "title": "Auto-extract insights by category",
                "quote": "automatically extracts the key insights from transcripts and groups them by theme",
                "sentiment": "positive",
                "theme_suggestion": "Automated Insight Extraction",
            },
            {
                "category": "feature_request",
                "title": "Cross-interview Q&A",
                "quote": "ask questions across all my interviews at once — like a ChatGPT for my research data",
                "sentiment": "positive",
                "theme_suggestion": "Cross-Interview Search",
            },
        ],
    },
    {
        "filename": "Marcus_Rivera_Designer_Interview.txt",
        "transcript": (
            "Interviewer: Marcus, tell me about how you currently gather and use "
            "customer feedback in your design process.\n\n"
            "Marcus Rivera: As a design lead, I sit in on a lot of user research "
            "sessions. The problem is, the insights from those sessions rarely make "
            "it back to me in a useful format. The PM takes notes, but by the time "
            "I see them, they're summarized bullet points that lose all the nuance.\n\n"
            "Interviewer: What kind of nuance gets lost?\n\n"
            "Marcus Rivera: The emotional context. When a user says 'this is really "
            "frustrating,' that tells me something different than 'this could be "
            "improved.' But in the notes, they both just become 'user wants X changed.' "
            "I need to hear the actual words to understand the severity.\n\n"
            "Interviewer: What would help you get that context back?\n\n"
            "Marcus Rivera: Direct access to the transcripts with highlights. If I "
            "could see the exact quotes with some visual indicator of sentiment — like "
            "red for pain points, green for things they love — I could scan through "
            "feedback much faster. Color-coding by category would be incredibly "
            "useful for my workflow.\n\n"
            "Interviewer: Is there anything else you'd want?\n\n"
            "Marcus Rivera: The ability to export insights as a report. I often need "
            "to present customer feedback in design reviews, and right now I manually "
            "compile quotes into slide decks. If I could just export a well-formatted "
            "summary, that would save me hours."
        ),
        "speakers": [
            {"label": "Interviewer", "name": "Interviewer", "is_interviewer": True},
            {"label": "Marcus Rivera", "name": "Marcus Rivera", "role": "Design Lead",
             "company": "DesignStudio", "is_interviewer": False},
        ],
        "insights": [
            {
                "category": "pain_point",
                "title": "Insights lose nuance in summarization",
                "quote": "insights from those sessions rarely make it back to me in a useful format",
                "sentiment": "negative",
                "theme_suggestion": "Data Fragmentation",
            },
            {
                "category": "pain_point",
                "title": "Emotional context lost in note-taking",
                "quote": "The emotional context. When a user says 'this is really frustrating,' that tells me something different",
                "sentiment": "negative",
                "theme_suggestion": "Manual Workflow Overhead",
            },
            {
                "category": "feature_request",
                "title": "Color-coded sentiment highlighting",
                "quote": "visual indicator of sentiment — like red for pain points, green for things they love",
                "sentiment": "positive",
                "theme_suggestion": "Automated Insight Extraction",
            },
            {
                "category": "feature_request",
                "title": "Export insights as formatted reports",
                "quote": "export a well-formatted summary, that would save me hours",
                "sentiment": "positive",
                "theme_suggestion": "Report Export",
            },
        ],
    },
    {
        "filename": "Priya_Patel_Founder_Interview.txt",
        "transcript": (
            "Interviewer: Priya, as a founder, how do you stay connected to "
            "customer feedback?\n\n"
            "Priya Patel: Honestly, it's one of my biggest challenges. In the early "
            "days, I did every customer call myself. Now with a team of 15, I can't "
            "be on every call. But I still need to understand what customers are "
            "saying. The current process is broken — I rely on second-hand summaries "
            "that are often biased by whoever wrote them.\n\n"
            "Interviewer: What do you mean by biased?\n\n"
            "Priya Patel: Different people emphasize different things. Our PM focuses "
            "on feature requests, our support lead focuses on bugs, and our sales "
            "team focuses on objections. Nobody has the full picture. I need a tool "
            "that gives me an unbiased, comprehensive view of what customers actually "
            "said.\n\n"
            "Interviewer: How would you want to access that information?\n\n"
            "Priya Patel: I want to be able to ask questions. Like 'what are our top "
            "3 churn risks?' or 'what feature would have the biggest impact?' And I "
            "want the answers to come directly from customer quotes, not someone's "
            "interpretation. The AI should cite its sources.\n\n"
            "Interviewer: What about pricing? What would you pay for something "
            "like this?\n\n"
            "Priya Patel: For a tool that actually delivers on this promise? $50-100 "
            "per user per month easily. We're already spending more than that on "
            "Dovetail and it doesn't do half of what you're describing. The ROI is "
            "obvious — if it saves my PM even 5 hours a week, it pays for itself."
        ),
        "speakers": [
            {"label": "Interviewer", "name": "Interviewer", "is_interviewer": True},
            {"label": "Priya Patel", "name": "Priya Patel", "role": "CEO & Founder",
             "company": "StartupXYZ", "is_interviewer": False},
        ],
        "insights": [
            {
                "category": "pain_point",
                "title": "Second-hand summaries introduce bias",
                "quote": "I rely on second-hand summaries that are often biased by whoever wrote them",
                "sentiment": "negative",
                "theme_suggestion": "Data Fragmentation",
            },
            {
                "category": "pain_point",
                "title": "No single source of truth for feedback",
                "quote": "Nobody has the full picture. I need a tool that gives me an unbiased, comprehensive view",
                "sentiment": "negative",
                "theme_suggestion": "Data Fragmentation",
            },
            {
                "category": "feature_request",
                "title": "Natural language Q&A with cited sources",
                "quote": "I want the answers to come directly from customer quotes, not someone's interpretation",
                "sentiment": "positive",
                "theme_suggestion": "Cross-Interview Search",
            },
            {
                "category": "positive",
                "title": "Strong willingness to pay",
                "quote": "$50-100 per user per month easily. We're already spending more than that on Dovetail",
                "sentiment": "positive",
                "theme_suggestion": "Market Validation",
            },
            {
                "category": "positive",
                "title": "Clear ROI articulation",
                "quote": "if it saves my PM even 5 hours a week, it pays for itself",
                "sentiment": "positive",
                "theme_suggestion": "Market Validation",
            },
        ],
    },
]


@router.post("/load-sample-data")
async def load_sample_data(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Load sample interview data for the current user.
    Creates realistic interviews with transcripts, speakers, themes, and insights.
    """
    # Check if user already has interviews (don't double-load)
    stmt = select(func.count()).select_from(Interview).where(
        Interview.user_id == current_user.id
    )
    result = await db.execute(stmt)
    existing_count = result.scalar() or 0

    if existing_count > 0:
        return {
            "interviews_created": 0,
            "insights_discovered": 0,
            "themes_created": 0,
            "message": "Sample data not loaded — you already have interviews.",
        }

    # Collect unique theme suggestions
    theme_map: dict[str, Theme] = {}
    interviews_created = 0
    insights_created = 0

    for sample in SAMPLE_INTERVIEWS:
        # Create interview
        interview = Interview(
            user_id=current_user.id,
            filename=sample["filename"],
            file_type=FileType.txt,
            file_size_bytes=len(sample["transcript"]),
            storage_path=f"demo/{sample['filename']}",
            status=InterviewStatus.done,
            transcript=sample["transcript"],
        )
        db.add(interview)
        await db.flush()

        # Create speakers
        for sp in sample["speakers"]:
            speaker = Speaker(
                interview_id=interview.id,
                speaker_label=sp["label"],
                name=sp.get("name"),
                role=sp.get("role"),
                company=sp.get("company"),
                is_interviewer=sp["is_interviewer"],
                auto_detected=True,
            )
            db.add(speaker)

        # Create insights with themes
        for ins in sample["insights"]:
            theme_name = ins.get("theme_suggestion")
            theme = None

            if theme_name:
                if theme_name not in theme_map:
                    theme = Theme(
                        user_id=current_user.id,
                        name=theme_name,
                        mention_count=0,
                        sentiment_positive=0.0,
                        sentiment_neutral=0.0,
                        sentiment_negative=0.0,
                        status=ThemeStatus.active,
                        is_new=True,
                    )
                    db.add(theme)
                    await db.flush()
                    theme_map[theme_name] = theme
                else:
                    theme = theme_map[theme_name]

                # Update theme counts
                theme.mention_count += 1
                if ins.get("sentiment") == "positive":
                    theme.sentiment_positive += 1.0
                elif ins.get("sentiment") == "negative":
                    theme.sentiment_negative += 1.0
                else:
                    theme.sentiment_neutral += 1.0

            # Find quote position in transcript
            quote = ins["quote"]
            start_idx = sample["transcript"].find(quote)
            end_idx = start_idx + len(quote) if start_idx >= 0 else None

            insight = Insight(
                user_id=current_user.id,
                interview_id=interview.id,
                theme_id=theme.id if theme else None,
                category=InsightCategory(ins["category"]),
                title=ins["title"],
                quote=quote,
                quote_start_index=start_idx if start_idx >= 0 else None,
                quote_end_index=end_idx,
                confidence=0.85,
                sentiment=ins.get("sentiment"),
                theme_suggestion=theme_name,
            )
            db.add(insight)
            insights_created += 1

        interviews_created += 1

    # Normalize theme sentiments to percentages
    for theme in theme_map.values():
        total = theme.sentiment_positive + theme.sentiment_neutral + theme.sentiment_negative
        if total > 0:
            theme.sentiment_positive /= total
            theme.sentiment_neutral /= total
            theme.sentiment_negative /= total

    await db.commit()

    return {
        "interviews_created": interviews_created,
        "insights_discovered": insights_created,
        "themes_created": len(theme_map),
    }
