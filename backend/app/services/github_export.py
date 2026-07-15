"""
GitHub Issues export (v1.1 delivery integration, PRD-11-01, D-11-03).

One-way: creates one GitHub issue per task in a spec's breakdown and saves
the created issue's URL/number back into the task snapshot. The caller's
token is request-scoped — used for these API calls and then discarded,
never persisted and never logged.
"""

from __future__ import annotations

import logging
import re

import httpx

from app.models import Spec

logger = logging.getLogger(__name__)

GITHUB_API_BASE = "https://api.github.com"
REPO_PATTERN = re.compile(r"^[A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+$")

# Errors that make every subsequent call pointless — stop early on these.
_FATAL_STATUS = {401, 403, 404}


class GitHubExportError(ValueError):
    """Raised for invalid input before any issue is created."""


def _issue_body(spec: Spec, task: dict) -> str:
    lines: list[str] = []
    if task.get("summary"):
        lines.append(task["summary"])
        lines.append("")
    lines.append(f"**Complexity:** {task.get('complexity', 'M')}")
    depends_on = task.get("depends_on") or []
    if depends_on:
        deps = ", ".join(f"task #{number}" for number in depends_on)
        lines.append(f"**Depends on:** {deps} (Spec10x task numbers, not issue numbers)")
    citations = task.get("citations") or []
    if citations:
        refs = ", ".join(f"[{ref}]" for ref in citations)
        lines.append(f"**Evidence:** {refs} — see the evidence appendix in the spec's export bundle")
    lines.append("")
    lines.append(f"---\n_Exported from Spec10x — spec: “{spec.title}” (task {task.get('number')})_")
    return "\n".join(lines)


async def export_tasks_to_github(
    spec: Spec,
    *,
    repo: str,
    token: str,
    client: httpx.AsyncClient | None = None,
) -> list[dict]:
    """Create one issue per not-yet-exported task, mutating the task dicts
    in place with `issue_url`/`issue_number` as each is created — a partial
    failure keeps everything created so far (retry skips those tasks).

    Returns per-task results:
    [{"number", "title", "status": created|already_exported|failed|not_attempted,
      "issue_url", "error"}]
    """
    repo = repo.strip().strip("/")
    if not REPO_PATTERN.match(repo):
        raise GitHubExportError(
            'Repository must be in "owner/name" form, e.g. "acme/roadmap".'
        )
    if not token.strip():
        raise GitHubExportError("A GitHub token is required.")

    tasks = spec.tasks_json or []
    results: list[dict] = []
    headers = {
        "Authorization": f"Bearer {token.strip()}",
        "Accept": "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
    }

    owns_client = client is None
    if owns_client:
        client = httpx.AsyncClient(timeout=20.0)

    fatal_error: str | None = None
    try:
        for task in tasks:
            result = {
                "number": task.get("number"),
                "title": task.get("title", ""),
                "status": "not_attempted",
                "issue_url": task.get("issue_url"),
                "error": None,
            }
            if task.get("issue_url"):
                result["status"] = "already_exported"
                results.append(result)
                continue
            if fatal_error is not None:
                result["error"] = fatal_error
                results.append(result)
                continue

            try:
                response = await client.post(
                    f"{GITHUB_API_BASE}/repos/{repo}/issues",
                    headers=headers,
                    json={
                        "title": f"[Spec10x] {task.get('title', 'Untitled task')}",
                        "body": _issue_body(spec, task),
                    },
                )
            except httpx.HTTPError as exc:
                # Never include headers/token in the logged error.
                logger.warning(f"GitHub export request failed: {type(exc).__name__}")
                fatal_error = "Could not reach the GitHub API."
                result["status"] = "failed"
                result["error"] = fatal_error
                results.append(result)
                continue

            if response.status_code == 201:
                payload = response.json()
                task["issue_url"] = payload.get("html_url")
                task["issue_number"] = payload.get("number")
                result["status"] = "created"
                result["issue_url"] = task["issue_url"]
            else:
                if response.status_code in (401, 403):
                    message = "GitHub rejected the token (check its repo/issues scope)."
                elif response.status_code == 404:
                    message = f'Repository "{repo}" was not found (or the token cannot see it).'
                else:
                    message = f"GitHub API error (HTTP {response.status_code})."
                result["status"] = "failed"
                result["error"] = message
                if response.status_code in _FATAL_STATUS:
                    fatal_error = message
            results.append(result)
    finally:
        if owns_client:
            await client.aclose()

    return results
