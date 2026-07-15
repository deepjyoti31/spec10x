"""
v1.1 Multi-User Workspaces — API tests (PRD-11-01, EPIC-11-02)

Covers the invite → accept → shared-pool flow, owner/member permissions,
leave/remove fallback, and workspace switching. Uses a client whose
authenticated user can be switched mid-test, since multi-user behavior is
the point.
"""

import uuid

import pytest
import pytest_asyncio
from httpx import AsyncClient, ASGITransport
from sqlalchemy import select
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession

from app.core.config import get_settings
from app.core.database import get_db
from app.core.auth import get_current_user
from app.models import User
from app.main import app

from tests.conftest import AUTH_HEADER, create_test_interview

settings = get_settings()

pytestmark = pytest.mark.asyncio


@pytest_asyncio.fixture
async def multi_client():
    """Like the shared `client` fixture, but the acting user is switchable."""
    engine = create_async_engine(settings.database_url, echo=False)
    session_factory = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    import app.api.interviews as interviews_module
    interviews_module._arq_pool = None

    acting = {"uid": None, "email": None, "name": None}

    async def _get_or_create_acting_user(session: AsyncSession) -> User:
        stmt = select(User).where(User.firebase_uid == acting["uid"])
        result = await session.execute(stmt)
        user = result.scalar_one_or_none()
        if user is None:
            user = User(
                firebase_uid=acting["uid"],
                email=acting["email"],
                name=acting["name"] or "",
            )
            session.add(user)
            await session.commit()
            await session.refresh(user)
        return user

    async def _override_db():
        async with session_factory() as session:
            try:
                yield session
                await session.commit()
            except Exception:
                await session.rollback()
                raise

    async def _override_current_user():
        async with session_factory() as session:
            return await _get_or_create_acting_user(session)

    app.dependency_overrides[get_db] = _override_db
    app.dependency_overrides[get_current_user] = _override_current_user

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        def act_as(uid: str, email: str, name: str = ""):
            acting["uid"] = uid
            acting["email"] = email
            acting["name"] = name

        ac.act_as = act_as
        yield ac

    app.dependency_overrides.clear()
    interviews_module._arq_pool = None
    await engine.dispose()


def _fresh_pair():
    """Two brand-new users per test — the suite DB is never truncated."""
    tag = uuid.uuid4().hex[:10]
    owner = (f"ws-owner-{tag}", f"ws-owner-{tag}@spec10xtest.com", "Owner Olive")
    member = (f"ws-member-{tag}", f"ws-member-{tag}@spec10xtest.com", "Member Mia")
    return owner, member


async def _invite(client, email: str) -> dict:
    response = await client.post(
        "/api/workspace/members", json={"email": email}, headers=AUTH_HEADER
    )
    assert response.status_code == 201, response.text
    return response.json()


async def _accept_first_invite(client) -> dict:
    invites = (await client.get("/api/workspace/invites", headers=AUTH_HEADER)).json()
    assert len(invites) >= 1
    response = await client.post(
        f"/api/workspace/invites/{invites[0]['id']}/accept", headers=AUTH_HEADER
    )
    assert response.status_code == 200, response.text
    return response.json()


async def test_workspace_starts_personal_with_owner_row(multi_client):
    (owner_uid, owner_email, owner_name), _ = _fresh_pair()
    multi_client.act_as(owner_uid, owner_email, owner_name)

    response = await multi_client.get("/api/workspace", headers=AUTH_HEADER)
    assert response.status_code == 200
    data = response.json()
    assert data["my_role"] == "owner"
    assert data["owner_email"] == owner_email
    assert len(data["members"]) == 1
    assert data["members"][0]["role"] == "owner"
    assert data["members"][0]["is_you"] is True
    assert data["members"][0]["status"] == "active"
    assert len(data["workspaces"]) == 1
    assert data["workspaces"][0]["is_personal"] is True


async def test_invite_accept_shares_the_owners_pool(multi_client):
    (owner_uid, owner_email, owner_name), (member_uid, member_email, member_name) = _fresh_pair()

    # Owner uploads an interview and invites the member.
    multi_client.act_as(owner_uid, owner_email, owner_name)
    interview = await create_test_interview(multi_client, filename="shared-context.txt")
    await _invite(multi_client, member_email)

    # Member sees and accepts the invite; their context switches (D-11-02).
    multi_client.act_as(member_uid, member_email, member_name)
    workspace = await _accept_first_invite(multi_client)
    assert workspace["my_role"] == "member"
    assert workspace["owner_email"] == owner_email
    statuses = {m["email"]: m["status"] for m in workspace["members"]}
    assert statuses[member_email] == "active"

    # Member now sees the owner's interview…
    listing = (await multi_client.get("/api/interviews", headers=AUTH_HEADER)).json()
    listed_ids = {item["id"] for item in listing}
    assert interview["id"] in listed_ids

    # …and content the member creates lands in the shared pool.
    member_upload = await create_test_interview(multi_client, filename="member-added.txt")
    multi_client.act_as(owner_uid, owner_email, owner_name)
    owner_listing = (await multi_client.get("/api/interviews", headers=AUTH_HEADER)).json()
    owner_ids = {item["id"] for item in owner_listing}
    assert member_upload["id"] in owner_ids


async def test_member_cannot_invite_and_owner_cannot_be_removed(multi_client):
    (owner_uid, owner_email, owner_name), (member_uid, member_email, member_name) = _fresh_pair()

    multi_client.act_as(owner_uid, owner_email, owner_name)
    await _invite(multi_client, member_email)
    duplicate = await multi_client.post(
        "/api/workspace/members", json={"email": member_email}, headers=AUTH_HEADER
    )
    assert duplicate.status_code == 409

    multi_client.act_as(member_uid, member_email, member_name)
    workspace = await _accept_first_invite(multi_client)

    # Member may not invite into the shared workspace.
    outsider = f"outsider-{uuid.uuid4().hex[:8]}@spec10xtest.com"
    response = await multi_client.post(
        "/api/workspace/members", json={"email": outsider}, headers=AUTH_HEADER
    )
    assert response.status_code == 403

    # A member cannot remove someone else's row (owner's included) — 404.
    owner_row = next(m for m in workspace["members"] if m["role"] == "owner")
    response = await multi_client.delete(
        f"/api/workspace/members/{owner_row['id']}", headers=AUTH_HEADER
    )
    assert response.status_code == 404

    # Even the owner cannot remove the owner row itself — 409.
    multi_client.act_as(owner_uid, owner_email, owner_name)
    response = await multi_client.delete(
        f"/api/workspace/members/{owner_row['id']}", headers=AUTH_HEADER
    )
    assert response.status_code == 409


async def test_removed_member_falls_back_to_personal_pool(multi_client):
    (owner_uid, owner_email, owner_name), (member_uid, member_email, member_name) = _fresh_pair()

    multi_client.act_as(owner_uid, owner_email, owner_name)
    shared_interview = await create_test_interview(multi_client, filename="owner-only.txt")
    await _invite(multi_client, member_email)

    multi_client.act_as(member_uid, member_email, member_name)
    workspace = await _accept_first_invite(multi_client)
    member_row = next(m for m in workspace["members"] if m["email"] == member_email)

    # Owner removes the member.
    multi_client.act_as(owner_uid, owner_email, owner_name)
    response = await multi_client.delete(
        f"/api/workspace/members/{member_row['id']}", headers=AUTH_HEADER
    )
    assert response.status_code == 204

    # The member instantly works in their own (empty) pool again.
    multi_client.act_as(member_uid, member_email, member_name)
    listing = (await multi_client.get("/api/interviews", headers=AUTH_HEADER)).json()
    listed_ids = {item["id"] for item in listing}
    assert shared_interview["id"] not in listed_ids

    workspace = (await multi_client.get("/api/workspace", headers=AUTH_HEADER)).json()
    assert workspace["my_role"] == "owner"
    assert workspace["owner_email"] == member_email


async def test_member_can_leave_and_switch_back(multi_client):
    (owner_uid, owner_email, owner_name), (member_uid, member_email, member_name) = _fresh_pair()

    multi_client.act_as(owner_uid, owner_email, owner_name)
    await _invite(multi_client, member_email)

    multi_client.act_as(member_uid, member_email, member_name)
    workspace = await _accept_first_invite(multi_client)
    shared_workspace_id = workspace["id"]

    # Switch back to personal without leaving…
    response = await multi_client.post(
        "/api/workspace/switch", json={"workspace_id": None}, headers=AUTH_HEADER
    )
    assert response.status_code == 200
    assert response.json()["owner_email"] == member_email

    # …then into the shared workspace again…
    response = await multi_client.post(
        "/api/workspace/switch",
        json={"workspace_id": shared_workspace_id},
        headers=AUTH_HEADER,
    )
    assert response.status_code == 200
    assert response.json()["owner_email"] == owner_email

    # …then leave for good (delete own member row).
    member_row = next(
        m for m in response.json()["members"] if m["email"] == member_email
    )
    response = await multi_client.delete(
        f"/api/workspace/members/{member_row['id']}", headers=AUTH_HEADER
    )
    assert response.status_code == 204

    # The shared workspace is gone from the switcher and 404s on switch.
    workspace = (await multi_client.get("/api/workspace", headers=AUTH_HEADER)).json()
    assert all(option["is_personal"] for option in workspace["workspaces"])
    response = await multi_client.post(
        "/api/workspace/switch",
        json={"workspace_id": shared_workspace_id},
        headers=AUTH_HEADER,
    )
    assert response.status_code == 404


async def test_declined_invite_disappears(multi_client):
    (owner_uid, owner_email, owner_name), (member_uid, member_email, member_name) = _fresh_pair()

    multi_client.act_as(owner_uid, owner_email, owner_name)
    await _invite(multi_client, member_email)

    multi_client.act_as(member_uid, member_email, member_name)
    invites = (await multi_client.get("/api/workspace/invites", headers=AUTH_HEADER)).json()
    my_invites = [i for i in invites if i["owner_email"] == owner_email]
    assert len(my_invites) == 1

    response = await multi_client.post(
        f"/api/workspace/invites/{my_invites[0]['id']}/decline", headers=AUTH_HEADER
    )
    assert response.status_code == 204

    invites = (await multi_client.get("/api/workspace/invites", headers=AUTH_HEADER)).json()
    assert all(i["owner_email"] != owner_email for i in invites)

    # Owner sees the pending row gone as well.
    multi_client.act_as(owner_uid, owner_email, owner_name)
    workspace = (await multi_client.get("/api/workspace", headers=AUTH_HEADER)).json()
    assert all(m["email"] != member_email for m in workspace["members"])


async def test_stranger_cannot_touch_foreign_invites(multi_client):
    (owner_uid, owner_email, owner_name), (member_uid, member_email, _) = _fresh_pair()
    stranger_tag = uuid.uuid4().hex[:8]

    multi_client.act_as(owner_uid, owner_email, owner_name)
    invite = await _invite(multi_client, member_email)

    multi_client.act_as(
        f"stranger-{stranger_tag}", f"stranger-{stranger_tag}@spec10xtest.com", "Stranger"
    )
    response = await multi_client.post(
        f"/api/workspace/invites/{invite['id']}/accept", headers=AUTH_HEADER
    )
    assert response.status_code == 404
    response = await multi_client.delete(
        f"/api/workspace/members/{invite['id']}", headers=AUTH_HEADER
    )
    assert response.status_code == 404
