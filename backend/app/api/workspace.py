"""
Spec10x Backend — Workspace & Membership API (v1.1 multi-user, PRD-11-01)

Members join the owner's existing workspace (D-11-01). Invites are addressed
to an email and require an explicit accept (D-11-02); nobody's active
workspace changes without their own action.
"""

import logging
import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, EmailStr
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.auth import get_current_user
from app.core.database import get_db
from app.models import (
    User,
    Workspace,
    WorkspaceMember,
    WorkspaceMemberRole,
    WorkspaceMemberStatus,
)
from app.services.sources import get_or_create_default_workspace

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/workspace", tags=["Workspace"])


# ─── Schemas ─────────────────────────────────────────────

class MemberResponse(BaseModel):
    id: uuid.UUID
    name: str
    email: str
    role: str
    status: str
    is_you: bool
    joined_at: datetime | None


class WorkspaceOptionResponse(BaseModel):
    id: uuid.UUID
    name: str
    owner_email: str
    is_personal: bool
    is_active: bool


class WorkspaceResponse(BaseModel):
    id: uuid.UUID
    name: str
    owner_email: str
    my_role: str
    members: list[MemberResponse]
    workspaces: list[WorkspaceOptionResponse]


class InviteCreateRequest(BaseModel):
    email: EmailStr


class MyInviteResponse(BaseModel):
    id: uuid.UUID
    workspace_name: str
    owner_name: str
    owner_email: str
    invited_at: datetime


class SwitchRequest(BaseModel):
    workspace_id: uuid.UUID | None = None


# ─── Helpers ─────────────────────────────────────────────

def _normalize_email(email: str) -> str:
    return email.strip().lower()


async def _set_active_workspace(
    db: AsyncSession, user: User, workspace_id: uuid.UUID | None
) -> None:
    """Persist via explicit UPDATE — the user object may belong to another
    session (the auth dependency loads it separately), so attribute mutation
    alone is not guaranteed to be flushed with this transaction."""
    await db.execute(
        update(User).where(User.id == user.id).values(active_workspace_id=workspace_id)
    )
    user.active_workspace_id = workspace_id


async def _resolve_active_workspace(
    db: AsyncSession, current_user: User
) -> Workspace:
    """The workspace the user is currently working in (personal fallback)."""
    if current_user.active_workspace_id is not None:
        result = await db.execute(
            select(Workspace).where(Workspace.id == current_user.active_workspace_id)
        )
        workspace = result.scalar_one_or_none()
        if workspace is not None:
            if workspace.owner_user_id == current_user.id:
                return workspace
            membership = await _get_active_membership(db, workspace.id, current_user.id)
            if membership is not None:
                return workspace
        # Stale pointer (workspace gone or access revoked) — clean it up.
        await _set_active_workspace(db, current_user, None)
    return await get_or_create_default_workspace(db, current_user)


async def _get_active_membership(
    db: AsyncSession, workspace_id: uuid.UUID, user_id: uuid.UUID
) -> WorkspaceMember | None:
    result = await db.execute(
        select(WorkspaceMember).where(
            WorkspaceMember.workspace_id == workspace_id,
            WorkspaceMember.user_id == user_id,
            WorkspaceMember.status == WorkspaceMemberStatus.active,
        )
    )
    return result.scalar_one_or_none()


async def _ensure_owner_member_row(
    db: AsyncSession, workspace: Workspace
) -> None:
    """The owner is listed like everyone else — via an implicit owner row."""
    result = await db.execute(
        select(WorkspaceMember).where(
            WorkspaceMember.workspace_id == workspace.id,
            WorkspaceMember.role == WorkspaceMemberRole.owner,
        )
    )
    if result.scalar_one_or_none() is not None:
        return
    owner_result = await db.execute(
        select(User).where(User.id == workspace.owner_user_id)
    )
    owner = owner_result.scalar_one_or_none()
    if owner is None:
        return
    db.add(
        WorkspaceMember(
            workspace_id=workspace.id,
            user_id=owner.id,
            invited_email=_normalize_email(owner.email),
            role=WorkspaceMemberRole.owner,
            status=WorkspaceMemberStatus.active,
            joined_at=datetime.now(timezone.utc),
        )
    )
    await db.flush()


def _member_display_name(member: WorkspaceMember) -> str:
    if member.user_id is not None and member.user is not None and member.user.name:
        return member.user.name
    return member.invited_email.split("@", maxsplit=1)[0]


async def _serialize_workspace(
    db: AsyncSession, workspace: Workspace, current_user: User
) -> WorkspaceResponse:
    members_result = await db.execute(
        select(WorkspaceMember)
        .options(selectinload(WorkspaceMember.user))
        .where(WorkspaceMember.workspace_id == workspace.id)
        .order_by(WorkspaceMember.created_at.asc())
    )
    members = members_result.scalars().all()

    owner_result = await db.execute(
        select(User).where(User.id == workspace.owner_user_id)
    )
    owner = owner_result.scalar_one()
    my_role = (
        WorkspaceMemberRole.owner.value
        if workspace.owner_user_id == current_user.id
        else WorkspaceMemberRole.member.value
    )

    # Workspaces this user can switch between: personal + active memberships.
    personal = await get_or_create_default_workspace(db, current_user)
    options: list[WorkspaceOptionResponse] = [
        WorkspaceOptionResponse(
            id=personal.id,
            name=personal.name,
            owner_email=current_user.email,
            is_personal=True,
            is_active=personal.id == workspace.id,
        )
    ]
    memberships_result = await db.execute(
        select(WorkspaceMember).where(
            WorkspaceMember.user_id == current_user.id,
            WorkspaceMember.status == WorkspaceMemberStatus.active,
            WorkspaceMember.role == WorkspaceMemberRole.member,
        )
    )
    for membership in memberships_result.scalars().all():
        ws_result = await db.execute(
            select(Workspace).where(Workspace.id == membership.workspace_id)
        )
        member_workspace = ws_result.scalar_one_or_none()
        if member_workspace is None:
            continue
        ws_owner_result = await db.execute(
            select(User).where(User.id == member_workspace.owner_user_id)
        )
        ws_owner = ws_owner_result.scalar_one_or_none()
        options.append(
            WorkspaceOptionResponse(
                id=member_workspace.id,
                name=member_workspace.name,
                owner_email=ws_owner.email if ws_owner else "",
                is_personal=False,
                is_active=member_workspace.id == workspace.id,
            )
        )

    return WorkspaceResponse(
        id=workspace.id,
        name=workspace.name,
        owner_email=owner.email,
        my_role=my_role,
        members=[
            MemberResponse(
                id=member.id,
                name=_member_display_name(member),
                email=member.invited_email,
                role=member.role.value,
                status=member.status.value,
                is_you=member.user_id == current_user.id,
                joined_at=member.joined_at,
            )
            for member in members
        ],
        workspaces=options,
    )


# ─── Routes ──────────────────────────────────────────────

@router.get("", response_model=WorkspaceResponse)
async def get_workspace(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """The requester's active workspace with its full member list."""
    workspace = await _resolve_active_workspace(db, current_user)
    await _ensure_owner_member_row(db, workspace)
    response = await _serialize_workspace(db, workspace, current_user)
    await db.commit()
    return response


@router.post("/members", response_model=MemberResponse, status_code=201)
async def invite_member(
    body: InviteCreateRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Invite someone into the active workspace by email (owner only)."""
    workspace = await _resolve_active_workspace(db, current_user)
    if workspace.owner_user_id != current_user.id:
        raise HTTPException(
            status_code=403, detail="Only the workspace owner can invite members"
        )
    email = _normalize_email(body.email)
    if email == _normalize_email(current_user.email):
        raise HTTPException(status_code=409, detail="You are already in this workspace")

    await _ensure_owner_member_row(db, workspace)
    existing_result = await db.execute(
        select(WorkspaceMember).where(
            WorkspaceMember.workspace_id == workspace.id,
            WorkspaceMember.invited_email == email,
        )
    )
    if existing_result.scalar_one_or_none() is not None:
        raise HTTPException(
            status_code=409, detail="This email is already invited or a member"
        )

    member = WorkspaceMember(
        workspace_id=workspace.id,
        invited_email=email,
        role=WorkspaceMemberRole.member,
        status=WorkspaceMemberStatus.invited,
        invited_by_user_id=current_user.id,
    )
    db.add(member)
    await db.commit()
    await db.refresh(member)
    return MemberResponse(
        id=member.id,
        name=_member_display_name(member),
        email=member.invited_email,
        role=member.role.value,
        status=member.status.value,
        is_you=False,
        joined_at=member.joined_at,
    )


@router.delete("/members/{member_id}", status_code=204)
async def remove_member(
    member_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Owner: revoke an invite or remove a member.
    Member: remove your own row (leave the workspace).
    """
    result = await db.execute(
        select(WorkspaceMember).where(WorkspaceMember.id == member_id)
    )
    member = result.scalar_one_or_none()
    if member is None:
        raise HTTPException(status_code=404, detail="Member not found")

    workspace_result = await db.execute(
        select(Workspace).where(Workspace.id == member.workspace_id)
    )
    workspace = workspace_result.scalar_one()

    is_owner = workspace.owner_user_id == current_user.id
    is_self = member.user_id == current_user.id
    if not is_owner and not is_self:
        raise HTTPException(status_code=404, detail="Member not found")
    if member.role == WorkspaceMemberRole.owner:
        raise HTTPException(
            status_code=409, detail="The workspace owner cannot be removed"
        )

    # Removed/leaving members instantly fall back to their personal workspace.
    if member.user_id is not None:
        await db.execute(
            update(User)
            .where(
                User.id == member.user_id,
                User.active_workspace_id == workspace.id,
            )
            .values(active_workspace_id=None)
        )

    await db.delete(member)
    await db.commit()


@router.get("/invites", response_model=list[MyInviteResponse])
async def list_my_invites(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Pending invites addressed to my login email."""
    result = await db.execute(
        select(WorkspaceMember)
        .where(
            WorkspaceMember.invited_email == _normalize_email(current_user.email),
            WorkspaceMember.status == WorkspaceMemberStatus.invited,
        )
        .order_by(WorkspaceMember.created_at.desc())
    )
    invites = []
    for member in result.scalars().all():
        workspace_result = await db.execute(
            select(Workspace).where(Workspace.id == member.workspace_id)
        )
        workspace = workspace_result.scalar_one_or_none()
        if workspace is None:
            continue
        owner_result = await db.execute(
            select(User).where(User.id == workspace.owner_user_id)
        )
        owner = owner_result.scalar_one_or_none()
        invites.append(
            MyInviteResponse(
                id=member.id,
                workspace_name=workspace.name,
                owner_name=owner.name if owner else "",
                owner_email=owner.email if owner else "",
                invited_at=member.created_at,
            )
        )
    return invites


async def _get_my_pending_invite(
    db: AsyncSession, invite_id: uuid.UUID, current_user: User
) -> WorkspaceMember:
    result = await db.execute(
        select(WorkspaceMember).where(WorkspaceMember.id == invite_id)
    )
    member = result.scalar_one_or_none()
    if (
        member is None
        or member.status != WorkspaceMemberStatus.invited
        or member.invited_email != _normalize_email(current_user.email)
    ):
        raise HTTPException(status_code=404, detail="Invite not found")
    return member


@router.post("/invites/{invite_id}/accept", response_model=WorkspaceResponse)
async def accept_invite(
    invite_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Accept an invite and switch into the shared workspace (D-11-02)."""
    member = await _get_my_pending_invite(db, invite_id, current_user)
    member.user_id = current_user.id
    member.status = WorkspaceMemberStatus.active
    member.joined_at = datetime.now(timezone.utc)
    await _set_active_workspace(db, current_user, member.workspace_id)

    workspace_result = await db.execute(
        select(Workspace).where(Workspace.id == member.workspace_id)
    )
    workspace = workspace_result.scalar_one()
    await _ensure_owner_member_row(db, workspace)
    response = await _serialize_workspace(db, workspace, current_user)
    await db.commit()
    return response


@router.post("/invites/{invite_id}/decline", status_code=204)
async def decline_invite(
    invite_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    member = await _get_my_pending_invite(db, invite_id, current_user)
    await db.delete(member)
    await db.commit()


@router.post("/switch", response_model=WorkspaceResponse)
async def switch_workspace(
    body: SwitchRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Switch the active workspace. Null (or your personal id) = personal."""
    if body.workspace_id is None:
        await _set_active_workspace(db, current_user, None)
    else:
        workspace_result = await db.execute(
            select(Workspace).where(Workspace.id == body.workspace_id)
        )
        workspace = workspace_result.scalar_one_or_none()
        if workspace is None:
            raise HTTPException(status_code=404, detail="Workspace not found")
        if workspace.owner_user_id == current_user.id:
            await _set_active_workspace(db, current_user, None)
        else:
            membership = await _get_active_membership(
                db, workspace.id, current_user.id
            )
            if membership is None:
                raise HTTPException(status_code=404, detail="Workspace not found")
            await _set_active_workspace(db, current_user, workspace.id)

    workspace = await _resolve_active_workspace(db, current_user)
    await _ensure_owner_member_row(db, workspace)
    response = await _serialize_workspace(db, workspace, current_user)
    await db.commit()
    return response
