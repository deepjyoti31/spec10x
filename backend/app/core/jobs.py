"""
Spec10x Backend — enqueue background jobs only after their data is committed.

A job enqueued inside an open transaction can reach the worker before the
rows it refers to are visible (the worker then finds nothing and drops the
job, leaving e.g. an interview stuck in "queued"), or refer to rows that are
later rolled back. `enqueue_after_commit` holds the job on the session and
sends it once the outermost transaction commits; a rollback discards it.
"""

from __future__ import annotations

import asyncio
import logging
from collections.abc import Awaitable, Callable

from sqlalchemy import event
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import Session

logger = logging.getLogger(__name__)

_PENDING_KEY = "spec10x.pending_jobs"

# Strong references so fire-and-forget enqueue tasks are not garbage-collected.
_inflight: set[asyncio.Task] = set()

JobSender = Callable[[], Awaitable[None]]


def enqueue_after_commit(db: AsyncSession, send: JobSender) -> None:
    """Run `send()` (which enqueues the job) after `db` commits."""
    db.sync_session.info.setdefault(_PENDING_KEY, []).append(send)


async def _send_all(pending: list[JobSender]) -> None:
    for send in pending:
        try:
            await send()
        except Exception:
            logger.exception("Failed to enqueue background job after commit")


@event.listens_for(Session, "after_commit")
def _send_pending_jobs(session: Session) -> None:
    pending = session.info.pop(_PENDING_KEY, None)
    if not pending:
        return
    # AsyncSession runs this hook on the event-loop thread (inside a greenlet),
    # so the running loop is available; the hook itself cannot await.
    task = asyncio.get_running_loop().create_task(_send_all(pending))
    _inflight.add(task)
    task.add_done_callback(_inflight.discard)


@event.listens_for(Session, "after_rollback")
def _drop_pending_jobs(session: Session) -> None:
    session.info.pop(_PENDING_KEY, None)


async def wait_for_pending_enqueues() -> None:
    """Await enqueues already handed off after a commit (tests, shutdown)."""
    loop = asyncio.get_running_loop()
    # Tasks from another (e.g. already closed) loop can never be awaited here.
    stale = {task for task in _inflight if task.get_loop() is not loop}
    _inflight.difference_update(stale)
    current = [task for task in _inflight if not task.done()]
    if current:
        await asyncio.gather(*current, return_exceptions=True)
