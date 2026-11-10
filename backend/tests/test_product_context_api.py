"""
Tests — PUT /api/users/me/product-context field semantics.

The settings page relies on: an omitted field is left unchanged, and an
empty string clears it.
"""

import pytest
import pytest_asyncio
from fastapi import Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.auth import get_current_user
from app.core.database import get_db
from app.main import app
from tests.conftest import AUTH_HEADER, _get_or_create_test_user

URL = "/api/users/me/product-context"


@pytest_asyncio.fixture
async def same_session_client(client):
    """Like production, load the user in the request's own DB session so the
    profile routes' commit/refresh act on it (the shared fixture loads the
    user in a separate session)."""

    async def _current_user_in_request_session(db: AsyncSession = Depends(get_db)):
        return await _get_or_create_test_user(db)

    app.dependency_overrides[get_current_user] = _current_user_in_request_session
    yield client


@pytest.mark.asyncio
async def test_empty_string_clears_and_omitted_keeps(same_session_client):
    client = same_session_client
    response = await client.put(URL, json={"description": "We build invoicing software."}, headers=AUTH_HEADER)
    assert response.status_code == 200
    assert response.json()["description"] == "We build invoicing software."

    # Omitted → unchanged
    response = await client.put(URL, json={}, headers=AUTH_HEADER)
    assert response.json()["description"] == "We build invoicing software."

    # Empty string → cleared, and the derived summary goes with it
    response = await client.put(URL, json={"description": ""}, headers=AUTH_HEADER)
    body = response.json()
    assert body["description"] is None
    assert body["has_context"] is False
