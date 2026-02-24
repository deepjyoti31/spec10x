"""
Spec10x Backend — Ask (Q&A) API Routes

Chat interface for natural language Q&A across interview data.
"""

import uuid
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.auth import get_current_user
from app.core.config import get_settings
from app.core.database import get_db
from app.models import User, AskConversation
from app.schemas import (
    AskRequest,
    AskConversationResponse,
    AskMessageResponse,
)

router = APIRouter(prefix="/api/ask", tags=["Ask Q&A"])
settings = get_settings()


@router.post("")
async def ask_question(
    request: AskRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Ask a question about your interview data.
    Returns an answer with citations to source interviews.
    """
    from app.services.qa import ask_question as qa_ask

    response = await qa_ask(
        db=db,
        user_id=current_user.id,
        question=request.question,
        conversation_id=request.conversation_id,
        use_mock=settings.use_mock_ai,
    )

    return {
        "answer": response.answer,
        "citations": [
            {
                "interview_id": c.interview_id,
                "filename": c.interview_filename,
                "quote": c.quote,
            }
            for c in response.citations
        ],
        "suggested_followups": response.suggested_followups,
        "conversation_id": response.conversation_id,
        "message_id": response.message_id,
    }


@router.get("/conversations", response_model=list[AskConversationResponse])
async def list_conversations(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """List all Ask conversations for the current user."""
    stmt = (
        select(AskConversation)
        .where(AskConversation.user_id == current_user.id)
        .order_by(AskConversation.created_at.desc())
    )
    result = await db.execute(stmt)
    return result.scalars().all()


@router.get("/conversations/{conversation_id}")
async def get_conversation(
    conversation_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get a conversation with all its messages."""
    stmt = (
        select(AskConversation)
        .where(
            AskConversation.id == conversation_id,
            AskConversation.user_id == current_user.id,
        )
        .options(selectinload(AskConversation.messages))
    )
    result = await db.execute(stmt)
    conversation = result.scalar_one_or_none()

    if not conversation:
        raise HTTPException(status_code=404, detail="Conversation not found")

    return {
        "id": str(conversation.id),
        "title": conversation.title,
        "created_at": conversation.created_at.isoformat(),
        "messages": [
            {
                "id": str(msg.id),
                "role": msg.role.value,
                "content": msg.content,
                "citations": msg.citations,
                "created_at": msg.created_at.isoformat(),
            }
            for msg in sorted(conversation.messages, key=lambda m: m.created_at)
        ],
    }
