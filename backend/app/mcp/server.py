"""
Spec10x MCP server (v1.1, PRD-11-01, EPIC-11-03) — stdio transport.

Lets an MCP client (Claude Code, or any other) pull the same self-contained
context bundle the UI exports, list specs, read post-ship outcomes, and
report a ship back — closing the loop without copy-paste.

Run:
    SPEC10X_MCP_USER_EMAIL=you@example.com python -m app.mcp

The only mutation exposed is mark_spec_shipped (D-11-04). Access equals the
configured user's own access; configuration lives in the operator's
environment, never in the database.
"""

from __future__ import annotations

import os

from mcp.server.fastmcp import FastMCP

from app.core.database import get_session_factory
from app.mcp import tools

server = FastMCP(
    "spec10x",
    instructions=(
        "Spec10x turns customer evidence into evidence-cited specs with "
        "agent-ready task breakdowns. Pull a spec's bundle with "
        "get_spec_bundle, build it, then report back with mark_spec_shipped."
    ),
)


def _configured_email() -> str:
    return os.environ.get("SPEC10X_MCP_USER_EMAIL", "")


@server.tool()
async def list_specs(status: str | None = None) -> list[dict]:
    """List the workspace's specs (id, title, status, task_count).
    Optionally filter by status: draft, in_review, needs_changes, approved,
    in_dev, or shipped."""
    async with get_session_factory()() as db:
        user = await tools.resolve_mcp_user(db, _configured_email())
        return await tools.list_specs_tool(db, user, status)


@server.tool()
async def get_spec_bundle(spec_id: str) -> str:
    """The spec's self-contained markdown context bundle: the evidence-cited
    brief, its agent-ready task breakdown, and the numbered evidence
    appendix. Identical to the app's 'Copy for agent' export."""
    async with get_session_factory()() as db:
        user = await tools.resolve_mcp_user(db, _configured_email())
        return await tools.get_spec_bundle_tool(db, user, spec_id)


@server.tool()
async def get_spec_outcome(spec_id: str) -> dict:
    """The post-ship outcome readout for a shipped spec: weekly customer-voice
    volume on its source theme before vs. after ship. Correlational only."""
    async with get_session_factory()() as db:
        user = await tools.resolve_mcp_user(db, _configured_email())
        return await tools.get_spec_outcome_tool(db, user, spec_id)


@server.tool()
async def mark_spec_shipped(spec_id: str) -> dict:
    """Report that the spec's work shipped. Moves the spec to Shipped and
    stamps its first-ship timestamp (already-shipped specs are a no-op),
    which starts the post-ship outcome window."""
    async with get_session_factory()() as db:
        user = await tools.resolve_mcp_user(db, _configured_email())
        result = await tools.mark_spec_shipped_tool(db, user, spec_id)
        await db.commit()
        return result


def main() -> None:
    server.run()


if __name__ == "__main__":
    main()
