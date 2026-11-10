"""
Tests — DELETE /api/users/me/data (Settings → Danger Zone → Delete All Data)
"""

import uuid

import pytest
from sqlalchemy import select

from app.models import Spec, User
from tests.conftest import AUTH_HEADER
from tests.test_workspace_api import multi_client  # noqa: F401 — fixture

pytestmark = pytest.mark.asyncio


async def test_delete_my_data_removes_specs_with_quoted_evidence(multi_client, db_session):  # noqa: F811
    """Specs snapshot verbatim customer quotes in evidence_json, so "delete
    all data" must remove them along with the interviews they came from."""
    tag = uuid.uuid4().hex[:10]
    multi_client.act_as(f"wipe-{tag}", f"wipe-{tag}@spec10xtest.com", "Wipe Me")
    # Any authenticated call creates the user row.
    assert (await multi_client.get("/api/specs", headers=AUTH_HEADER)).status_code == 200

    user = (
        await db_session.execute(select(User).where(User.firebase_uid == f"wipe-{tag}"))
    ).scalar_one()
    spec = Spec(
        user_id=user.id,
        title="Brief quoting customers",
        evidence_json=[{"ref": 1, "quote": "I lose an hour every week to exports."}],
    )
    db_session.add(spec)
    await db_session.commit()

    response = await multi_client.delete("/api/users/me/data", headers=AUTH_HEADER)
    assert response.status_code == 204

    remaining = (
        await db_session.execute(select(Spec).where(Spec.user_id == user.id))
    ).scalars().all()
    assert remaining == []
