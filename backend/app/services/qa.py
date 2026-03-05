"""
Spec10x Backend — RAG Q&A Service

Answers user questions using interview data via vector similarity + Gemini.
"""

import json
import logging
import uuid
from dataclasses import dataclass, field

from google import genai
from google.genai import types

from sqlalchemy import select, or_, text
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
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
) -> AskResponse:
    """
    Answer a user's question about their interview data.

    Args:
        db: Database session
        user_id: Current user's ID
        question: The user's question
        conversation_id: Existing conversation ID (or None for new)

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



async def _real_answer(
    db: AsyncSession,
    user_id: uuid.UUID,
    question: str,
) -> AskResponse:
    """
    Real Q&A using vector similarity search + Gemini.

    Pipeline:
        1. Embed the question using text-embedding-004 (RETRIEVAL_QUERY)
        2. Find top-K similar transcript chunks via pgvector cosine distance
        3. Build a context prompt with the relevant chunks
        4. Send to Gemini for a contextual answer
        5. Parse citations and return
    """
    settings = get_settings()
    client = genai.Client(
        vertexai=True,
        project=settings.gcp_project_id,
        location=settings.gcp_location
    )

    try:
        # Step 1: Embed the question
        emb_response = client.models.embed_content(
            model="gemini-embedding-001",
            contents=question,
            config=types.EmbedContentConfig(task_type="RETRIEVAL_QUERY")
        )
        if not emb_response.embeddings:
            raise ValueError("No embeddings returned")
        question_embedding = emb_response.embeddings[0].values

        # Step 2: Vector search — find top 10 similar chunks for this user
        # Using pgvector's cosine distance operator (<=>)
        embedding_str = "[" + ",".join(str(x) for x in question_embedding) + "]"

        vector_sql = text("""
            SELECT tc.id, tc.content, tc.interview_id,
                   tc.embedding <=> :query_embedding AS distance
            FROM transcript_chunks tc
            JOIN interviews i ON tc.interview_id = i.id
            WHERE i.user_id = :user_id
              AND tc.embedding IS NOT NULL
            ORDER BY tc.embedding <=> :query_embedding
            LIMIT 10
        """)

        result = await db.execute(
            vector_sql,
            {"query_embedding": embedding_str, "user_id": str(user_id)},
        )
        rows = result.fetchall()

        if not rows:
            logger.info("No embedding chunks found for question")
            return AskResponse(
                answer="I couldn't find relevant information in your interviews to answer this question.",
            )

        # Step 3: Build context from chunks
        interview_ids = set()
        context_parts = []
        for row in rows:
            interview_ids.add(row.interview_id)
            context_parts.append(f"[Source: Interview {row.interview_id}]\n{row.content}\n")

        context = "\n---\n".join(context_parts)

        # Get interview filenames
        interview_names = {}
        if interview_ids:
            stmt = select(Interview).where(Interview.id.in_(list(interview_ids)))
            res = await db.execute(stmt)
            for interview in res.scalars().all():
                interview_names[interview.id] = interview.filename

        # Step 4: Call Vertex AI for answer
        prompt = (
            f"## User Question\n{question}\n\n"
            f"## Interview Excerpts\n{context}\n\n"
            f"Answer the question based on these excerpts. "
            f"Use bullet points and bold key findings."
        )

        response = client.models.generate_content(
            model=settings.gemini_model,
            contents=prompt,
            config=types.GenerateContentConfig(
                temperature=0.3,
                max_output_tokens=1500,
                system_instruction=(
                    "You are a product research analyst. Answer the user's question "
                    "based ONLY on the interview transcript excerpts provided below. "
                    "Cite specific quotes from the excerpts to support your answer. "
                    "If the excerpts don't contain relevant information, say so honestly. "
                    "Format your response in clear markdown."
                ),
            )
        )

        answer = response.text

        # Step 5: Build citations from the chunks used
        citations = []
        seen_interviews = set()
        for row in rows[:5]:
            if row.interview_id not in seen_interviews:
                seen_interviews.add(row.interview_id)
                citations.append(Citation(
                    interview_id=str(row.interview_id),
                    interview_filename=interview_names.get(
                        row.interview_id, "Unknown"
                    ),
                    quote=row.content[:200] + "...",
                    chunk_id=str(row.id),
                ))

        # Generate follow-up suggestions using Gemini
        followups = await _ai_suggest_followups(client, question, answer, settings)

        logger.info(
            f"Gemini Q&A complete: {len(answer)} chars, "
            f"{len(citations)} citations"
        )

        return AskResponse(
            answer=answer,
            citations=citations,
            suggested_followups=followups,
        )

    except Exception as e:
        logger.error(f"Vertex AI Q&A failed: {e}")
        raise


async def _ai_suggest_followups(
    client: genai.Client,
    question: str,
    answer: str,
    settings,
) -> list[str]:
    """Generate follow-up question suggestions using Gemini."""
    try:
        response = client.models.generate_content(
            model=settings.gemini_model,
            contents=(
                f"Based on this Q&A about customer interviews, "
                f"suggest exactly 3 concise follow-up questions.\n\n"
                f"Question: {question}\nAnswer: {answer[:500]}\n\n"
                f"Respond as a JSON array of 3 strings, e.g. [\"q1\", \"q2\", \"q3\"]"
            ),
            config=types.GenerateContentConfig(
                response_mime_type="application/json",
                temperature=0.5,
                max_output_tokens=200,
            ),
        )
        followups = json.loads(response.text)
        if isinstance(followups, list):
            return followups[:3]
    except Exception:
        pass
    return _suggest_followups(question, [])


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


async def get_starters(
    db: AsyncSession,
    user_id: uuid.UUID,
) -> list[str]:
    """Generate dynamic starter questions based on recent interviews."""
    settings = get_settings()
    client = genai.Client(
        vertexai=True,
        project=settings.gcp_project_id,
        location=settings.gcp_location
    )

    # Default starters as fallback
    default_starters = [
        "What are the top pain points?",
        "What do users love about the product?",
        "What features are most requested?",
        "What's the overall sentiment?",
    ]

    try:
        # Get some recent chunks to ground the questions
        stmt = text("""
            SELECT tc.content
            FROM transcript_chunks tc
            JOIN interviews i ON tc.interview_id = i.id
            WHERE i.user_id = :user_id
            ORDER BY tc.created_at DESC
            LIMIT 15
        """)
        result = await db.execute(stmt, {"user_id": str(user_id)})
        rows = result.fetchall()

        if not rows:
            return default_starters

        context_parts = [r.content for r in rows]
        context = "\\n---\\n".join(context_parts)

        prompt = (
            f"Based on the following excerpts from recent user interviews:\\n{context}\\n\\n"
            f"Suggest exactly 4 insightful questions a product manager could ask to understand the user data better. "
            f"Make them concise and specific to the topics discussed. "
            f"Respond as a JSON array of 4 strings, e.g. [\\"q1\\", \\"q2\\", \\"q3\\", \\"q4\\"]"
        )
        response = client.models.generate_content(
            model=settings.gemini_model,
            contents=prompt,
            config=types.GenerateContentConfig(
                response_mime_type="application/json",
                temperature=0.7,
            ),
        )
        starters = json.loads(response.text)
        if isinstance(starters, list) and len(starters) >= 4:
            return starters[:4]
    except Exception as e:
        logger.error(f"Failed to generate starters: {e}")

    return default_starters

