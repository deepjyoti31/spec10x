"""
Integration Tests — Ask Q&A API (Day 2)

Tests: ask question, list conversations, get conversation.
"""

import pytest


class TestAskQuestion:
    """Test POST /api/ask"""

    @pytest.mark.asyncio
    async def test_ask_returns_answer(self, client, mock_user, sample_interview, sample_insights):
        response = await client.post(
            "/api/ask",
            json={"question": "What are the main pain points?"},
            headers={"Authorization": "Bearer dev-token"},
        )
        assert response.status_code == 200
        data = response.json()
        assert "answer" in data
        assert "citations" in data
        assert "suggested_followups" in data
        assert "conversation_id" in data
        assert len(data["answer"]) > 0

    @pytest.mark.asyncio
    async def test_ask_creates_conversation(self, client, mock_user, sample_interview, sample_insights):
        # Ask a question (creates a conversation)
        response = await client.post(
            "/api/ask",
            json={"question": "Tell me about onboarding"},
            headers={"Authorization": "Bearer dev-token"},
        )
        assert response.status_code == 200
        conversation_id = response.json()["conversation_id"]

        # Verify conversation exists
        response = await client.get(
            "/api/ask/conversations",
            headers={"Authorization": "Bearer dev-token"},
        )
        assert response.status_code == 200
        convos = response.json()
        assert len(convos) >= 1


class TestListConversations:
    """Test GET /api/ask/conversations"""

    @pytest.mark.asyncio
    async def test_empty_initially(self, client, mock_user):
        response = await client.get(
            "/api/ask/conversations",
            headers={"Authorization": "Bearer dev-token"},
        )
        assert response.status_code == 200
        assert response.json() == []


class TestGetConversation:
    """Test GET /api/ask/conversations/{id}"""

    @pytest.mark.asyncio
    async def test_returns_messages(self, client, mock_user, sample_interview, sample_insights):
        # Create a conversation by asking
        ask_response = await client.post(
            "/api/ask",
            json={"question": "What issues do users have?"},
            headers={"Authorization": "Bearer dev-token"},
        )
        conversation_id = ask_response.json()["conversation_id"]

        # Get conversation detail
        response = await client.get(
            f"/api/ask/conversations/{conversation_id}",
            headers={"Authorization": "Bearer dev-token"},
        )
        assert response.status_code == 200
        data = response.json()
        assert "messages" in data
        assert len(data["messages"]) >= 2  # user message + assistant response
