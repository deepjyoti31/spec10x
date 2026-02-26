"""
Integration Tests — Ask Q&A API (Day 2)

Tests: ask question, list conversations, get conversation.
"""

import pytest

from tests.conftest import AUTH_HEADER


class TestAskQuestion:
    """Test POST /api/ask"""

    @pytest.mark.asyncio
    async def test_ask_returns_answer(self, client):
        response = await client.post(
            "/api/ask",
            json={"question": "What are the main pain points?"},
            headers=AUTH_HEADER,
        )
        assert response.status_code == 200
        data = response.json()
        assert "answer" in data
        assert "citations" in data
        assert "suggested_followups" in data
        assert "conversation_id" in data
        assert len(data["answer"]) > 0


class TestListConversations:
    """Test GET /api/ask/conversations"""

    @pytest.mark.asyncio
    async def test_returns_list(self, client):
        response = await client.get("/api/ask/conversations", headers=AUTH_HEADER)
        assert response.status_code == 200
        assert isinstance(response.json(), list)


class TestGetConversation:
    """Test GET /api/ask/conversations/{id}"""

    @pytest.mark.asyncio
    async def test_returns_messages(self, client):
        # Create a conversation by asking a question
        ask_response = await client.post(
            "/api/ask",
            json={"question": "What issues do users have?"},
            headers=AUTH_HEADER,
        )
        assert ask_response.status_code == 200
        conversation_id = ask_response.json()["conversation_id"]

        # Get conversation detail
        response = await client.get(
            f"/api/ask/conversations/{conversation_id}",
            headers=AUTH_HEADER,
        )
        assert response.status_code == 200
        data = response.json()
        assert "messages" in data
        assert len(data["messages"]) >= 2  # user + assistant
