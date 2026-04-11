"""
Spec10x Backend — Product Context Service

Manages user product context for synthesis false-positive prevention.
Uses Gemini to extract product fingerprints from websites.
"""

import logging
from typing import Optional

from google import genai
from google.genai import types

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.models import User

logger = logging.getLogger(__name__)


async def fetch_product_context_from_url(url: str) -> Optional[str]:
    """
    Use Gemini to fetch and analyze a website, extracting a product fingerprint.

    Tries UrlContext tool first. If unavailable (e.g., on Vertex AI),
    falls back to Google Search grounding to find information about the URL.

    Returns:
        AI-generated product fingerprint text, or None on failure.
    """
    settings = get_settings()

    prompt = f"""Analyze the following website and extract a product fingerprint from it.

URL: {url}

Extract the following information and return it as structured bullet points:

1. **Product Name**: What is the product called?
2. **What It Does**: One-sentence description of the product's core function.
3. **Problems It Solves**: What pain points or challenges does this product claim to address? List each one.
4. **Value Propositions**: What key benefits or outcomes does the product promise? List each one.
5. **Target Audience**: Who is this product for? (industry, role, company size)
6. **Key Features**: Top features or capabilities mentioned.
7. **Common Pitch Language**: Key phrases, taglines, or marketing language used to describe the product.

Be thorough — capture ALL the problems and value propositions mentioned, even subtle ones.
This information will be used to distinguish the product team's own messaging from genuine customer feedback.

If the URL is inaccessible or contains no relevant product information, say "UNABLE_TO_EXTRACT" and nothing else."""

    client = genai.Client(
        vertexai=True,
        project=settings.gcp_project_id,
        location=settings.gcp_location,
    )

    # --- Attempt 1: UrlContext tool (preferred) ---
    try:
        logger.info(f"Attempting UrlContext fetch for: {url}")
        url_context_tool = types.Tool(url_context=types.UrlContext())

        response = await client.aio.models.generate_content(
            model=settings.gemini_model,
            contents=prompt,
            config=types.GenerateContentConfig(
                tools=[url_context_tool],
                temperature=0.1,
            ),
        )

        result_text = response.text.strip()

        if "UNABLE_TO_EXTRACT" in result_text:
            logger.warning(f"UrlContext could not extract product context from: {url}")
            return None

        logger.info(f"Successfully extracted product context via UrlContext from: {url} ({len(result_text)} chars)")
        return result_text

    except Exception as e:
        logger.warning(f"UrlContext failed for {url}: {e}. Falling back to Google Search grounding.")

    # --- Attempt 2: Google Search grounding (fallback) ---
    try:
        logger.info(f"Attempting Google Search grounding for: {url}")
        search_tool = types.Tool(google_search=types.GoogleSearch())

        search_prompt = f"""Search for the website at {url} and extract a product fingerprint.

{prompt}"""

        response = await client.aio.models.generate_content(
            model=settings.gemini_model,
            contents=search_prompt,
            config=types.GenerateContentConfig(
                tools=[search_tool],
                temperature=0.1,
            ),
        )

        result_text = response.text.strip()

        if "UNABLE_TO_EXTRACT" in result_text:
            logger.warning(f"Google Search could not extract product context from: {url}")
            return None

        logger.info(f"Successfully extracted product context via Google Search from: {url} ({len(result_text)} chars)")
        return result_text

    except Exception as e:
        logger.error(f"All methods failed to fetch product context from {url}: {e}", exc_info=True)
        return None


async def save_product_context(
    db: AsyncSession,
    user: User,
    description: Optional[str] = None,
    website_url: Optional[str] = None,
) -> User:
    """
    Save product context for a user.

    If a website URL is provided, uses Gemini to generate an AI summary.
    Combines manual description + website summary into a unified
    product_context_summary.

    If the user provides only a URL (no manual description), the website
    summary is also placed into product_description so the UI textarea
    shows what was extracted.
    """
    if description is not None:
        user.product_description = description.strip() if description else None

    if website_url is not None:
        user.product_website_url = website_url.strip() if website_url else None

    # If a website URL is provided, fetch AI summary
    website_summary = None
    if website_url and website_url.strip():
        logger.info(f"Fetching product context from URL for user {user.id}")
        website_summary = await fetch_product_context_from_url(website_url.strip())

        # If user didn't provide a manual description, auto-fill from the URL
        if website_summary and not user.product_description:
            user.product_description = website_summary

    # Build unified product context summary
    parts = []
    if user.product_description:
        parts.append(f"## User-Provided Description\n{user.product_description}")
    if website_summary and website_summary != user.product_description:
        # Only add as a separate section if it's different from description
        parts.append(f"## AI-Extracted From Website\n{website_summary}")

    user.product_context_summary = "\n\n".join(parts) if parts else None

    await db.flush()
    logger.info(f"Saved product context for user {user.id} (has_context={bool(user.product_context_summary)})")

    return user


def get_product_context_for_extraction(user: User) -> Optional[str]:
    """
    Retrieve the user's product context formatted for injection
    into the extraction prompt.

    Returns:
        Formatted product context string, or None if not set.
    """
    if not user.product_context_summary:
        return None

    return user.product_context_summary
