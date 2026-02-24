"""
Spec10x Backend — RAG Q&A Service

Answers user questions using interview data.
Mock mode uses full-text search; real mode uses vector similarity + Gemini.
"""

import logging
import uuid
from dataclasses import dataclass, field

from sqlalchemy import select, or_
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import (
    TranscriptChunk, Interview, Insight, AskConversation, AskMessage,
    MessageRole,
)

logger = logging.getLogger(__name__)


@dataclass
class Citation:
    """A citation linking an answer to source material."""
    interview_id: str
    interview_filename: str
    quote: str
    chunk_id: str | None = None


@dataclass
class AskResponse:
    """Response from the Q&A system."""
    answer: str
    citations: list[Citation] = field(default_factory=list)
    suggested_followups: list[str] = field(default_factory=list)
    conversation_id: str = ""
    message_id: str = ""


async def ask_question(
    db: AsyncSession,
    user_id: uuid.UUID,
    question: str,
    conversation_id: uuid.UUID | None = None,
    use_mock: bool = True,
) -> AskResponse:
    """
    Answer a user's question about their interview data.

    Args:
        db: Database session
        user_id: Current user's ID
        question: The user's question
        conversation_id: Existing conversation ID (or None for new)
        use_mock: If True, use full-text search; if False, use vector search + Gemini

    Returns:
        AskResponse with answer, citations, and follow-up suggestions
    """
    # Get or create conversation
    if conversation_id:
        stmt = select(AskConversation).where(
            AskConversation.id == conversation_id,
            AskConversation.user_id == user_id,
        )
        result = await db.execute(stmt)
        conversation = result.scalar_one_or_none()
        if not conversation:
            conversation = await _create_conversation(db, user_id, question)
    else:
        conversation = await _create_conversation(db, user_id, question)

    # Save user message
    user_msg = AskMessage(
        conversation_id=conversation.id,
        role=MessageRole.user,
        content=question,
    )
    db.add(user_msg)
    await db.flush()

    # Generate answer
    if use_mock:
        response = await _mock_answer(db, user_id, question)
    else:
        response = await _real_answer(db, user_id, question)

    # Save assistant message
    assistant_msg = AskMessage(
        conversation_id=conversation.id,
        role=MessageRole.assistant,
        content=response.answer,
        citations={
            "citations": [
                {
                    "interview_id": c.interview_id,
                    "filename": c.interview_filename,
                    "quote": c.quote,
                }
                for c in response.citations
            ]
        },
    )
    db.add(assistant_msg)
    await db.flush()

    response.conversation_id = str(conversation.id)
    response.message_id = str(assistant_msg.id)
    return response


async def _create_conversation(
    db: AsyncSession,
    user_id: uuid.UUID,
    question: str,
) -> AskConversation:
    """Create a new Ask conversation."""
    title = question[:100] + ("..." if len(question) > 100 else "")
    conv = AskConversation(
        user_id=user_id,
        title=title,
    )
    db.add(conv)
    await db.flush()
    return conv


async def _mock_answer(
    db: AsyncSession,
    user_id: uuid.UUID,
    question: str,
) -> AskResponse:
    """
    Mock Q&A using full-text search across transcript chunks.
    Finds relevant chunks, builds a templated answer with citations.
    """
    question_lower = question.lower()

    # Extract search keywords (simple word tokenization)
    stop_words = {
        "what", "how", "why", "when", "where", "who", "which", "do", "does",
        "is", "are", "the", "a", "an", "in", "on", "at", "to", "for", "of",
        "and", "or", "not", "about", "with", "from", "by", "it", "my", "your",
        "their", "our", "this", "that", "these", "those", "all", "any",
    }
    keywords = [
        w for w in question_lower.split()
        if w not in stop_words and len(w) > 2
    ]

    if not keywords:
        keywords = question_lower.split()[:3]

    # Search transcript chunks using ILIKE
    conditions = [
        TranscriptChunk.content.ilike(f"%{kw}%")
        for kw in keywords[:5]
    ]

    stmt = (
        select(TranscriptChunk)
        .join(Interview, TranscriptChunk.interview_id == Interview.id)
        .where(
            Interview.user_id == user_id,
            or_(*conditions) if conditions else True,
        )
        .limit(10)
    )
    result = await db.execute(stmt)
    chunks = result.scalars().all()

    # Also search insights
    insight_conditions = [
        or_(
            Insight.title.ilike(f"%{kw}%"),
            Insight.quote.ilike(f"%{kw}%"),
        )
        for kw in keywords[:5]
    ]
    stmt = (
        select(Insight)
        .join(Interview, Insight.interview_id == Interview.id)
        .where(
            Insight.user_id == user_id,
            Insight.is_dismissed == False,  # noqa: E712
            or_(*insight_conditions) if insight_conditions else True,
        )
        .limit(10)
    )
    result = await db.execute(stmt)
    related_insights = result.scalars().all()

    # Build citations
    citations = []
    interview_ids_seen = set()

    # Get interview filenames for citations
    interview_ids = set()
    for chunk in chunks:
        interview_ids.add(chunk.interview_id)
    for insight in related_insights:
        interview_ids.add(insight.interview_id)

    interview_names = {}
    if interview_ids:
        stmt = select(Interview).where(Interview.id.in_(interview_ids))
        result = await db.execute(stmt)
        for interview in result.scalars().all():
            interview_names[interview.id] = interview.filename

    for chunk in chunks[:5]:
        if chunk.interview_id not in interview_ids_seen:
            interview_ids_seen.add(chunk.interview_id)
            citations.append(Citation(
                interview_id=str(chunk.interview_id),
                interview_filename=interview_names.get(chunk.interview_id, "Unknown"),
                quote=chunk.content[:200] + "...",
                chunk_id=str(chunk.id),
            ))

    # Build answer
    if chunks or related_insights:
        answer_parts = [
            f"Based on analysis of your interviews, here's what I found about **\"{question}\"**:\n"
        ]

        if related_insights:
            answer_parts.append(f"\n**Key findings ({len(related_insights)} relevant insights):**\n")
            for i, insight in enumerate(related_insights[:5], 1):
                category_label = {
                    "pain_point": "🔴 Pain Point",
                    "feature_request": "🔵 Feature Request",
                    "positive": "🟢 Positive",
                    "suggestion": "🟡 Suggestion",
                }.get(insight.category.value if hasattr(insight.category, 'value') else insight.category, "📝")

                answer_parts.append(
                    f"{i}. {category_label}: **{insight.title}**\n"
                    f"   > \"{insight.quote[:150]}{'...' if len(insight.quote) > 150 else ''}\"\n"
                    f"   — *{interview_names.get(insight.interview_id, 'Interview')}*\n"
                )

        if chunks and not related_insights:
            answer_parts.append(
                f"\nFound {len(chunks)} relevant passages across "
                f"{len(interview_ids_seen)} interviews. "
                f"The data suggests this topic appears across multiple interviews.\n"
            )

        answer = "\n".join(answer_parts)
    else:
        answer = (
            f"I couldn't find specific information about \"{question}\" "
            f"in your interviews. Try uploading more interview transcripts "
            f"or rephrasing your question."
        )

    # Generate follow-up suggestions
    followups = _suggest_followups(question, related_insights)

    return AskResponse(
        answer=answer,
        citations=citations,
        suggested_followups=followups,
    )


async def _real_answer(
    db: AsyncSession,
    user_id: uuid.UUID,
    question: str,
) -> AskResponse:
    """Real Q&A using vector search + Gemini. To be implemented."""
    raise NotImplementedError(
        "Real Q&A requires Vertex AI configuration. "
        "Set USE_MOCK_AI=true in .env to use mock mode."
    )


def _suggest_followups(question: str, insights: list) -> list[str]:
    """Generate 3 suggested follow-up questions."""
    base_followups = [
        "What solutions did users suggest for this?",
        "How does sentiment differ across user segments?",
        "What are the most frequently mentioned issues?",
        "Which users feel most strongly about this?",
        "Are there any positive aspects of this topic?",
        "How has this feedback changed over time?",
    ]

    # Pick 3 that are different from the question
    selected = []
    for f in base_followups:
        if f.lower() not in question.lower() and len(selected) < 3:
            selected.append(f)

    return selected[:3]
