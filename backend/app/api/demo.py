"""
Spec10x Backend — Demo API Routes

Loads sample data for new users to explore the platform.
Covers all supported data types: interviews (with all insight categories),
support tickets, and survey responses.
"""

import uuid
import logging
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func

from app.core.auth import get_current_user
from app.core.database import get_db
from app.models import (
    User,
    Interview,
    Speaker,
    Theme,
    Insight,
    Signal,
    FileType,
    InterviewStatus,
    InsightCategory,
    ThemeStatus,
    SignalKind,
    SignalStatus,
    SourceType,
)
from app.services.sources import get_or_create_default_workspace

router = APIRouter(prefix="/api/demo", tags=["Demo"])
logger = logging.getLogger(__name__)

# ─── Helpers ─────────────────────────────────────────────

def _days_ago(n: int) -> datetime:
    return datetime.now(timezone.utc) - timedelta(days=n)


# ─── Themes ──────────────────────────────────────────────
# Central definition: name → description
# All interviews, tickets, and surveys reference these by name.

SAMPLE_THEMES: dict[str, str] = {
    "Manual Workflow Overhead": (
        "Time lost to manual note-taking, copy-pasting, and tagging of customer feedback "
        "across disconnected tools."
    ),
    "Data Fragmentation": (
        "Feedback scattered across Notion, spreadsheets, and email with no single source "
        "of truth or cross-tool search."
    ),
    "Automated Insight Extraction": (
        "AI-powered categorization and tagging of insights directly from raw transcripts, "
        "reducing analyst review time."
    ),
    "Cross-Interview Search": (
        "Ability to query patterns, quotes, and themes across all interviews and sources "
        "simultaneously."
    ),
    "Report Export": (
        "Generating formatted stakeholder reports, slide-ready summaries, and shareable "
        "insight snapshots from the platform."
    ),
    "Market Validation": (
        "Strong willingness-to-pay signals, favorable competitive comparisons, and clear "
        "ROI articulation from prospects and customers."
    ),
    "Collaboration & Sharing": (
        "Team access controls, shared views, and workflow integrations that allow insights "
        "to flow across roles and squads."
    ),
    "Integrations": (
        "Connections with Slack, Jira, Notion, and CRMs to embed insights into existing "
        "team workflows without context-switching."
    ),
    "Performance & Reliability": (
        "Upload speed, transcript processing latency, search response times, and overall "
        "system stability under load."
    ),
}


# ─── Interviews ──────────────────────────────────────────

SAMPLE_INTERVIEWS = [
    {
        "filename": "Sarah_Chen_PM_Interview.txt",
        "transcript": (
            "Interviewer: Thanks for joining us, Sarah. Can you walk me through your "
            "current workflow for managing customer feedback?\n\n"
            "Sarah Chen: Sure. We use a mix of Notion docs and spreadsheets. After every "
            "customer call I manually write up notes and try to tag them with themes. It "
            "takes me about 30 minutes per interview just to organize the notes.\n\n"
            "Interviewer: What are the biggest pain points in that process?\n\n"
            "Sarah Chen: The biggest issue is that insights get lost. We have hundreds of "
            "pages of notes across different documents, and there's no way to search across "
            "all of them efficiently. I've missed important patterns because the data is so "
            "fragmented.\n\n"
            "Interviewer: If you could wave a magic wand, what would the ideal tool look "
            "like?\n\n"
            "Sarah Chen: Something that automatically extracts the key insights from "
            "transcripts and groups them by theme. Pain points in one bucket, feature "
            "requests in another. And I want to ask questions across all my interviews at "
            "once — like a ChatGPT for my research data.\n\n"
            "Interviewer: Any quick wins you'd suggest for the product?\n\n"
            "Sarah Chen: A keyboard shortcut to tag a quote directly in the transcript "
            "viewer would save me a ton of clicks. Small thing but it adds up.\n\n"
            "Interviewer: How much time do you think a tool like this would save?\n\n"
            "Sarah Chen: Easily 5–10 hours a week. Right now I spend a full day every week "
            "just synthesizing feedback. If that were automated, I could focus on actually "
            "building what customers need."
        ),
        "speakers": [
            {"label": "Interviewer", "name": "Interviewer", "is_interviewer": True},
            {
                "label": "Sarah Chen",
                "name": "Sarah Chen",
                "role": "Product Manager",
                "company": "TechCorp",
                "is_interviewer": False,
            },
        ],
        "insights": [
            {
                "category": "pain_point",
                "title": "Manual note-taking is time-consuming",
                "quote": "It takes me about 30 minutes per interview just to organize the notes",
                "sentiment": "negative",
                "theme": "Manual Workflow Overhead",
            },
            {
                "category": "pain_point",
                "title": "Insights get lost in fragmented data",
                "quote": "insights get lost. We have hundreds of pages of notes across different documents",
                "sentiment": "negative",
                "theme": "Data Fragmentation",
            },
            {
                "category": "feature_request",
                "title": "Auto-extract insights by category",
                "quote": "automatically extracts the key insights from transcripts and groups them by theme",
                "sentiment": "positive",
                "theme": "Automated Insight Extraction",
            },
            {
                "category": "feature_request",
                "title": "Cross-interview Q&A",
                "quote": "ask questions across all my interviews at once — like a ChatGPT for my research data",
                "sentiment": "positive",
                "theme": "Cross-Interview Search",
            },
            {
                "category": "suggestion",
                "title": "Keyboard shortcut for inline quote tagging",
                "quote": "A keyboard shortcut to tag a quote directly in the transcript viewer would save me a ton of clicks",
                "sentiment": "neutral",
                "theme": "Manual Workflow Overhead",
            },
        ],
    },
    {
        "filename": "Marcus_Rivera_Designer_Interview.txt",
        "transcript": (
            "Interviewer: Marcus, tell me about how you currently gather and use customer "
            "feedback in your design process.\n\n"
            "Marcus Rivera: As a design lead I sit in on a lot of user research sessions. "
            "The problem is, the insights from those sessions rarely make it back to me in "
            "a useful format. The PM takes notes but by the time I see them they're "
            "summarized bullet points that lose all the nuance.\n\n"
            "Interviewer: What kind of nuance gets lost?\n\n"
            "Marcus Rivera: The emotional context. When a user says 'this is really "
            "frustrating,' that tells me something different than 'this could be improved.' "
            "But in the notes they both become 'user wants X changed.' I need to hear the "
            "actual words to understand the severity.\n\n"
            "Interviewer: What would help you get that context back?\n\n"
            "Marcus Rivera: Direct access to the transcripts with highlights. If I could "
            "see the exact quotes with a visual indicator of sentiment — like red for pain "
            "points, green for things they love — I could scan feedback much faster. "
            "Color-coding by category would be incredibly useful.\n\n"
            "Interviewer: Is there anything else you'd want?\n\n"
            "Marcus Rivera: The ability to export insights as a report. I often present "
            "customer feedback in design reviews, and right now I manually compile quotes "
            "into slide decks. If I could export a well-formatted summary that would save "
            "me hours.\n\n"
            "Interviewer: What's working well today, even if it's manual?\n\n"
            "Marcus Rivera: Honestly, the discipline of going back and reviewing transcripts "
            "ourselves has caught things we'd otherwise miss. So the raw material is "
            "valuable — we just need better tooling around it."
        ),
        "speakers": [
            {"label": "Interviewer", "name": "Interviewer", "is_interviewer": True},
            {
                "label": "Marcus Rivera",
                "name": "Marcus Rivera",
                "role": "Design Lead",
                "company": "DesignStudio",
                "is_interviewer": False,
            },
        ],
        "insights": [
            {
                "category": "pain_point",
                "title": "Insights lose nuance when summarized",
                "quote": "insights from those sessions rarely make it back to me in a useful format",
                "sentiment": "negative",
                "theme": "Data Fragmentation",
            },
            {
                "category": "pain_point",
                "title": "Emotional context stripped from notes",
                "quote": "The emotional context. When a user says 'this is really frustrating,' that tells me something different",
                "sentiment": "negative",
                "theme": "Manual Workflow Overhead",
            },
            {
                "category": "feature_request",
                "title": "Color-coded sentiment highlighting",
                "quote": "visual indicator of sentiment — like red for pain points, green for things they love",
                "sentiment": "positive",
                "theme": "Automated Insight Extraction",
            },
            {
                "category": "feature_request",
                "title": "Export insights as formatted reports",
                "quote": "export a well-formatted summary that would save me hours",
                "sentiment": "positive",
                "theme": "Report Export",
            },
            {
                "category": "positive",
                "title": "Raw transcript review catches missed signals",
                "quote": "the discipline of going back and reviewing transcripts ourselves has caught things we'd otherwise miss",
                "sentiment": "positive",
                "theme": "Cross-Interview Search",
            },
        ],
    },
    {
        "filename": "Priya_Patel_Founder_Interview.txt",
        "transcript": (
            "Interviewer: Priya, as a founder how do you stay connected to customer "
            "feedback?\n\n"
            "Priya Patel: Honestly, it's one of my biggest challenges. In the early days I "
            "did every customer call myself. Now with a team of 15 I can't be on every "
            "call. But I still need to understand what customers are saying. The current "
            "process is broken — I rely on second-hand summaries that are often biased by "
            "whoever wrote them.\n\n"
            "Interviewer: What do you mean by biased?\n\n"
            "Priya Patel: Different people emphasize different things. Our PM focuses on "
            "feature requests, our support lead focuses on bugs, and our sales team focuses "
            "on objections. Nobody has the full picture. I need a tool that gives me an "
            "unbiased, comprehensive view of what customers actually said.\n\n"
            "Interviewer: How would you want to access that information?\n\n"
            "Priya Patel: I want to ask questions. Like 'what are our top 3 churn risks?' "
            "or 'what feature would have the biggest impact?' And I want the answers to "
            "come directly from customer quotes, not someone's interpretation. The AI "
            "should cite its sources.\n\n"
            "Interviewer: What about pricing? What would you pay?\n\n"
            "Priya Patel: For a tool that actually delivers on this? $50–100 per user per "
            "month easily. We're already spending more than that on Dovetail and it doesn't "
            "do half of what you're describing. The ROI is obvious — if it saves my PM even "
            "5 hours a week, it pays for itself.\n\n"
            "Interviewer: Would your team adopt this without heavy change management?\n\n"
            "Priya Patel: If it connects to the tools they already use — Slack, Notion, "
            "Jira — yes. People won't open a new tab for insights. The insights need to "
            "come to them."
        ),
        "speakers": [
            {"label": "Interviewer", "name": "Interviewer", "is_interviewer": True},
            {
                "label": "Priya Patel",
                "name": "Priya Patel",
                "role": "CEO & Founder",
                "company": "StartupXYZ",
                "is_interviewer": False,
            },
        ],
        "insights": [
            {
                "category": "pain_point",
                "title": "Second-hand summaries introduce bias",
                "quote": "I rely on second-hand summaries that are often biased by whoever wrote them",
                "sentiment": "negative",
                "theme": "Data Fragmentation",
            },
            {
                "category": "pain_point",
                "title": "No single source of truth for feedback",
                "quote": "Nobody has the full picture. I need a tool that gives me an unbiased, comprehensive view",
                "sentiment": "negative",
                "theme": "Data Fragmentation",
            },
            {
                "category": "feature_request",
                "title": "Natural language Q&A with cited sources",
                "quote": "I want the answers to come directly from customer quotes, not someone's interpretation",
                "sentiment": "positive",
                "theme": "Cross-Interview Search",
            },
            {
                "category": "feature_request",
                "title": "Integrations with Slack, Notion, and Jira",
                "quote": "If it connects to the tools they already use — Slack, Notion, Jira — yes",
                "sentiment": "positive",
                "theme": "Integrations",
            },
            {
                "category": "positive",
                "title": "Strong willingness to pay vs. Dovetail",
                "quote": "$50–100 per user per month easily. We're already spending more than that on Dovetail",
                "sentiment": "positive",
                "theme": "Market Validation",
            },
        ],
    },
    {
        "filename": "Jordan_Kim_Engineering_Interview.txt",
        "transcript": (
            "Interviewer: Jordan, engineering leads don't always engage with customer "
            "research tools. Why are you here?\n\n"
            "Jordan Kim: Because I keep getting pulled into meetings where the PM reads "
            "from notes that I can't verify. I want to see the actual evidence. When "
            "someone says 'users hate the upload flow,' I want to know how many users, "
            "what they actually said, and whether it's an edge case or a pattern.\n\n"
            "Interviewer: How does that affect your work today?\n\n"
            "Jordan Kim: We build the wrong things. Last quarter we spent three sprints on "
            "a feature that, when I later read the transcripts, only two customers had "
            "mentioned — and both were in unusual edge cases. If I'd had access to the "
            "raw data I would have pushed back.\n\n"
            "Interviewer: What would an ideal research tool give you?\n\n"
            "Jordan Kim: Transparency and traceability. Every insight should link back to "
            "the source quote, with a count of how many unique people raised it. And it "
            "needs to be fast — if I have to wait 10 seconds for a search result I'll stop "
            "using it.\n\n"
            "Interviewer: Any concerns about AI-generated summaries?\n\n"
            "Jordan Kim: Yes — I don't trust summaries that don't show their work. If the "
            "AI tells me 'customers want faster exports' I need to see the three quotes "
            "that support that claim. Otherwise it's just another layer of telephone.\n\n"
            "Interviewer: What would make you an internal champion for a tool like this?\n\n"
            "Jordan Kim: If it cut the time from 'customer said X' to 'engineering ticket "
            "created' from two weeks to two days, I'd advocate for it loudly."
        ),
        "speakers": [
            {"label": "Interviewer", "name": "Interviewer", "is_interviewer": True},
            {
                "label": "Jordan Kim",
                "name": "Jordan Kim",
                "role": "Head of Engineering",
                "company": "ScaleUp Inc.",
                "is_interviewer": False,
            },
        ],
        "insights": [
            {
                "category": "pain_point",
                "title": "Engineers can't verify research claims without source access",
                "quote": "I keep getting pulled into meetings where the PM reads from notes that I can't verify",
                "sentiment": "negative",
                "theme": "Data Fragmentation",
            },
            {
                "category": "pain_point",
                "title": "Building wrong features due to unverified research",
                "quote": "We build the wrong things. Last quarter we spent three sprints on a feature that only two customers had mentioned",
                "sentiment": "negative",
                "theme": "Manual Workflow Overhead",
            },
            {
                "category": "feature_request",
                "title": "Every insight must link back to source quote with mention count",
                "quote": "Every insight should link back to the source quote, with a count of how many unique people raised it",
                "sentiment": "positive",
                "theme": "Automated Insight Extraction",
            },
            {
                "category": "feature_request",
                "title": "Fast search — under 2 seconds",
                "quote": "it needs to be fast — if I have to wait 10 seconds for a search result I'll stop using it",
                "sentiment": "neutral",
                "theme": "Performance & Reliability",
            },
            {
                "category": "suggestion",
                "title": "AI summaries must show supporting quotes",
                "quote": "If the AI tells me 'customers want faster exports' I need to see the three quotes that support that claim",
                "sentiment": "neutral",
                "theme": "Cross-Interview Search",
            },
        ],
    },
    {
        "filename": "Alex_Thompson_CustomerSuccess_Interview.txt",
        "transcript": (
            "Interviewer: Alex, you're on the front lines with customers every day. How "
            "does your team currently capture and share what you're hearing?\n\n"
            "Alex Thompson: It's a mess, honestly. After calls I write notes in Salesforce, "
            "but nobody on the product team reads Salesforce. So I also paste highlights "
            "into a Slack channel called #customer-voice. That channel is now 4,000 "
            "messages long and nobody reads it either.\n\n"
            "Interviewer: What happens to the feedback then?\n\n"
            "Alex Thompson: It dies. I escalate the loudest complaints directly to the PM "
            "via DM, which means the squeaky wheel gets the grease and quiet but widespread "
            "problems go unnoticed. It's a huge blind spot.\n\n"
            "Interviewer: How does that affect customer retention?\n\n"
            "Alex Thompson: We've churned accounts where, in hindsight, the signals were "
            "all there — multiple support tickets, negative survey responses, a pattern in "
            "CSM notes. But nobody connected the dots until it was too late.\n\n"
            "Interviewer: What would change your workflow most?\n\n"
            "Alex Thompson: If the platform automatically aggregated signals across "
            "tickets, calls, and surveys and surfaced emerging themes before they become "
            "churn risks. I want a weekly digest: 'here are the three things your top "
            "accounts are struggling with.'\n\n"
            "Interviewer: Is there anything the current process does well?\n\n"
            "Alex Thompson: Our team is really good at capturing verbatim quotes. We "
            "actually have a culture of 'customer's own words' in our notes. So the raw "
            "material exists — it's just trapped in the wrong places."
        ),
        "speakers": [
            {"label": "Interviewer", "name": "Interviewer", "is_interviewer": True},
            {
                "label": "Alex Thompson",
                "name": "Alex Thompson",
                "role": "Customer Success Manager",
                "company": "GrowthCo",
                "is_interviewer": False,
            },
        ],
        "insights": [
            {
                "category": "pain_point",
                "title": "CSM notes trapped in Salesforce, invisible to product team",
                "quote": "I write notes in Salesforce, but nobody on the product team reads Salesforce",
                "sentiment": "negative",
                "theme": "Data Fragmentation",
            },
            {
                "category": "pain_point",
                "title": "Squeaky-wheel bias — quiet widespread problems go unnoticed",
                "quote": "the squeaky wheel gets the grease and quiet but widespread problems go unnoticed",
                "sentiment": "negative",
                "theme": "Data Fragmentation",
            },
            {
                "category": "pain_point",
                "title": "Churn signals missed because no cross-source pattern detection",
                "quote": "We've churned accounts where the signals were all there — multiple support tickets, negative survey responses",
                "sentiment": "negative",
                "theme": "Manual Workflow Overhead",
            },
            {
                "category": "feature_request",
                "title": "Weekly digest of emerging themes per account",
                "quote": "I want a weekly digest: 'here are the three things your top accounts are struggling with'",
                "sentiment": "positive",
                "theme": "Collaboration & Sharing",
            },
            {
                "category": "positive",
                "title": "Team culture of capturing verbatim customer quotes",
                "quote": "We actually have a culture of 'customer's own words' in our notes. So the raw material exists",
                "sentiment": "positive",
                "theme": "Automated Insight Extraction",
            },
        ],
    },
]


# ─── Support Tickets ──────────────────────────────────────
# Simulates Zendesk-style tickets synced via the support integration.

SAMPLE_TICKETS = [
    {
        "title": "Can we get bulk export to PDF?",
        "content_text": (
            "Hi — our VP of Product wants to share a summary of customer research in our "
            "board meeting next week. Is there a way to export all insights from a project "
            "to a single PDF? We'd want it to include quotes, theme groupings, and a "
            "sentiment breakdown. This would be a huge unlock for us."
        ),
        "author": "Jamie Ortega",
        "sentiment": "positive",
        "theme": "Report Export",
        "occurred_at": _days_ago(5),
        "metadata": {"priority": "normal", "tags": ["export", "reporting", "feature-request"]},
    },
    {
        "title": "Search not returning results for older interviews",
        "content_text": (
            "When I search for a phrase I know exists in a transcript from three months "
            "ago, I get no results. Searching the same phrase in a recent interview works "
            "fine. Is there a time limit on search indexing? We have 18 months of research "
            "that we can't surface anymore."
        ),
        "author": "Rena Vasquez",
        "sentiment": "negative",
        "theme": "Cross-Interview Search",
        "occurred_at": _days_ago(12),
        "metadata": {"priority": "high", "tags": ["search", "bug", "indexing"]},
    },
    {
        "title": "MP4 upload fails silently",
        "content_text": (
            "Tried uploading a 90-minute video interview (MP4, ~1.2 GB). The progress bar "
            "hits 100% and then the file disappears from the queue with no error message. "
            "I've tried three times. The same recording as an MP3 export uploads fine, but "
            "we prefer to keep the video for reference."
        ),
        "author": "Theo Nakamura",
        "sentiment": "negative",
        "theme": "Performance & Reliability",
        "occurred_at": _days_ago(8),
        "metadata": {
            "priority": "urgent",
            "tags": ["upload", "mp4", "bug"],
            "type": "incident",
        },
    },
    {
        "title": "How do I share a project with a teammate?",
        "content_text": (
            "I want to give our UX researcher read access to the interview project I've "
            "been building. I can see there's a 'Share' button but clicking it only shows "
            "my own email. Is multi-user sharing available on the Pro plan? Or do we need "
            "to upgrade to Business?"
        ),
        "author": "Sasha Brooks",
        "sentiment": "neutral",
        "theme": "Collaboration & Sharing",
        "occurred_at": _days_ago(18),
        "metadata": {"priority": "normal", "tags": ["sharing", "permissions", "team"]},
    },
    {
        "title": "Love the theme clustering — request: sub-themes",
        "content_text": (
            "The automatic theme clustering has genuinely replaced our Miro board for "
            "synthesis. One thing I'd love: the ability to nest sub-themes under a parent. "
            "Right now 'Onboarding' is flat — but we can see it splits into 'first-run "
            "setup' and 'ongoing feature discovery.' Being able to express that hierarchy "
            "would make our reports much cleaner."
        ),
        "author": "Priya Mehta",
        "sentiment": "positive",
        "theme": "Automated Insight Extraction",
        "occurred_at": _days_ago(22),
        "metadata": {"priority": "low", "tags": ["themes", "taxonomy", "feature-request"]},
    },
    {
        "title": "Slack integration — send insight digests to channel",
        "content_text": (
            "Our team lives in Slack. Any chance of a weekly digest that posts the top "
            "emerging themes to a channel we configure? Even a simple webhook would work. "
            "Right now insights stay in the platform and the team doesn't develop the "
            "habit of checking it. We need the insights to come to us."
        ),
        "author": "Dana Osei",
        "sentiment": "positive",
        "theme": "Integrations",
        "occurred_at": _days_ago(30),
        "metadata": {"priority": "normal", "tags": ["slack", "integrations", "notifications"]},
    },
    {
        "title": "AI summary missed key pain points from call",
        "content_text": (
            "Ran a 60-minute customer call through the analyzer. The AI identified 4 "
            "insights but missed at least 3 clear pain points that I had to add manually. "
            "Specifically, the customer spent 8 minutes on their frustration with our "
            "onboarding checklist and it wasn't captured at all. Is there a confidence "
            "threshold I can lower?"
        ),
        "author": "Carlos Reyes",
        "sentiment": "negative",
        "theme": "Automated Insight Extraction",
        "occurred_at": _days_ago(14),
        "metadata": {
            "priority": "high",
            "tags": ["ai", "accuracy", "insights", "bug"],
        },
    },
    {
        "title": "Processing time too slow for long recordings",
        "content_text": (
            "A 2-hour interview takes about 45 minutes to fully process. By the time "
            "insights are ready, I've already moved on to my next call. Can this be "
            "parallelized or batched overnight? Even a 'priority queue' option would help "
            "for time-sensitive synthesis sessions."
        ),
        "author": "Mia Johansson",
        "sentiment": "negative",
        "theme": "Performance & Reliability",
        "occurred_at": _days_ago(7),
        "metadata": {
            "priority": "high",
            "tags": ["performance", "processing", "latency"],
        },
    },
]


# ─── Survey Responses ────────────────────────────────────
# Simulates NPS/satisfaction survey responses from CSV import.

SAMPLE_SURVEYS = [
    {
        "content_text": (
            "The auto-tagging feature has completely changed how I do research. I used to "
            "spend a full Friday afternoon on synthesis — now it takes 30 minutes. The "
            "quote extraction is accurate enough that I trust it without re-reading every "
            "transcript."
        ),
        "author": "respondent_a1b2",
        "sentiment": "positive",
        "theme": "Automated Insight Extraction",
        "occurred_at": _days_ago(3),
        "metadata": {
            "nps_score": 10,
            "question": "How has Spec10x changed your research workflow?",
            "channel": "email",
        },
    },
    {
        "content_text": (
            "Search is the main reason I'm still looking at alternatives. I can't find "
            "quotes unless I remember the exact phrasing. Fuzzy search or semantic search "
            "would fix this. Until then I still keep a backup spreadsheet index."
        ),
        "author": "respondent_c3d4",
        "sentiment": "negative",
        "theme": "Cross-Interview Search",
        "occurred_at": _days_ago(10),
        "metadata": {
            "nps_score": 4,
            "question": "What is the single biggest thing we could improve?",
            "channel": "in-app",
        },
    },
    {
        "content_text": (
            "Would be a 10 if you had a Jira integration. Right now I export insights, "
            "paste them into a doc, and then manually create tickets. That gap is "
            "frustrating when the insight itself already has everything a ticket needs: "
            "the quote, the theme, the frequency count."
        ),
        "author": "respondent_e5f6",
        "sentiment": "positive",
        "theme": "Integrations",
        "occurred_at": _days_ago(16),
        "metadata": {
            "nps_score": 8,
            "question": "What would make you give us a higher score?",
            "channel": "email",
        },
    },
    {
        "content_text": (
            "Replaced Dovetail for our whole product team — 6 researchers and 2 PMs. "
            "Onboarding took less than a day. The interface is intuitive enough that I "
            "didn't need to write a guide for new team members, which says a lot."
        ),
        "author": "respondent_g7h8",
        "sentiment": "positive",
        "theme": "Market Validation",
        "occurred_at": _days_ago(25),
        "metadata": {
            "nps_score": 10,
            "question": "How would you describe Spec10x to a colleague?",
            "channel": "email",
        },
    },
    {
        "content_text": (
            "Good product overall but the export feels like an afterthought. PDFs look "
            "plain and I end up reformatting everything in Figma before sharing with "
            "leadership. Custom templates or at least a cleaner default layout would go "
            "a long way."
        ),
        "author": "respondent_i9j0",
        "sentiment": "neutral",
        "theme": "Report Export",
        "occurred_at": _days_ago(35),
        "metadata": {
            "nps_score": 7,
            "question": "What would improve your experience most?",
            "channel": "in-app",
        },
    },
    {
        "content_text": (
            "Large files are painfully slow. A 90-minute interview takes so long to "
            "process that I schedule uploads overnight. During peak hours it sometimes "
            "stalls entirely. For the price point, I'd expect faster turnaround."
        ),
        "author": "respondent_k1l2",
        "sentiment": "negative",
        "theme": "Performance & Reliability",
        "occurred_at": _days_ago(9),
        "metadata": {
            "nps_score": 5,
            "question": "What frustrates you most about the platform?",
            "channel": "in-app",
        },
    },
    {
        "content_text": (
            "The themes view is my favorite feature. Seeing all the mentions across "
            "different interviews in one place makes it so easy to prioritize the roadmap. "
            "Our last three shipped features came directly from theme frequency rankings."
        ),
        "author": "respondent_m3n4",
        "sentiment": "positive",
        "theme": "Automated Insight Extraction",
        "occurred_at": _days_ago(20),
        "metadata": {
            "nps_score": 9,
            "question": "Which feature do you use most and why?",
            "channel": "email",
        },
    },
    {
        "content_text": (
            "I wish I could invite my whole team to see the research without them needing "
            "a paid seat. Even a 'view-only guest' tier would make it easier to share "
            "findings with stakeholders who don't do research themselves. Right now I "
            "export to PDF every time, which breaks the experience."
        ),
        "author": "respondent_o5p6",
        "sentiment": "neutral",
        "theme": "Collaboration & Sharing",
        "occurred_at": _days_ago(42),
        "metadata": {
            "nps_score": 7,
            "question": "Is there anything stopping you from getting more value from Spec10x?",
            "channel": "email",
        },
    },
]


# ─── Endpoint ────────────────────────────────────────────

@router.post("/load-sample-data")
async def load_sample_data(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Load comprehensive sample data for the current user.

    Creates:
    - 5 interview transcripts covering PM, Design, Founder, Engineering, and CS personas
    - All 4 insight categories: pain_point, feature_request, positive, suggestion
    - 9 themes with descriptions
    - 8 support ticket signals (Zendesk-style)
    - 8 survey response signals (NPS CSV-style)
    """
    # Guard: don't double-load
    stmt = select(func.count()).select_from(Interview).where(
        Interview.user_id == current_user.id
    )
    result = await db.execute(stmt)
    existing_count = result.scalar() or 0

    if existing_count > 0:
        return {
            "interviews_created": 0,
            "insights_discovered": 0,
            "themes_created": 0,
            "signals_created": 0,
            "message": "Sample data not loaded — you already have interviews.",
        }

    # ── 1. Create all themes up-front ─────────────────────
    theme_map: dict[str, Theme] = {}
    for theme_name, description in SAMPLE_THEMES.items():
        theme = Theme(
            user_id=current_user.id,
            name=theme_name,
            description=description,
            mention_count=0,
            sentiment_positive=0.0,
            sentiment_neutral=0.0,
            sentiment_negative=0.0,
            status=ThemeStatus.active,
            is_new=True,
        )
        db.add(theme)
        theme_map[theme_name] = theme

    await db.flush()

    # ── 2. Create interviews with speakers and insights ───
    interviews_created = 0
    insights_created = 0
    created_interview_ids: list[uuid.UUID] = []

    for sample in SAMPLE_INTERVIEWS:
        interview = Interview(
            user_id=current_user.id,
            filename=sample["filename"],
            file_type=FileType.txt,
            file_size_bytes=len(sample["transcript"]),
            storage_path=f"demo/{sample['filename']}",
            status=InterviewStatus.done,
            transcript=sample["transcript"],
        )
        db.add(interview)
        await db.flush()
        created_interview_ids.append(interview.id)

        for sp in sample["speakers"]:
            speaker = Speaker(
                interview_id=interview.id,
                speaker_label=sp["label"],
                name=sp.get("name"),
                role=sp.get("role"),
                company=sp.get("company"),
                is_interviewer=sp["is_interviewer"],
                auto_detected=True,
            )
            db.add(speaker)

        for ins in sample["insights"]:
            theme_name = ins.get("theme")
            theme = theme_map.get(theme_name) if theme_name else None

            if theme:
                theme.mention_count += 1
                snt = ins.get("sentiment", "neutral")
                if snt == "positive":
                    theme.sentiment_positive += 1.0
                elif snt == "negative":
                    theme.sentiment_negative += 1.0
                else:
                    theme.sentiment_neutral += 1.0

            quote = ins["quote"]
            start_idx = sample["transcript"].find(quote)
            end_idx = start_idx + len(quote) if start_idx >= 0 else None

            insight = Insight(
                user_id=current_user.id,
                interview_id=interview.id,
                theme_id=theme.id if theme else None,
                category=InsightCategory(ins["category"]),
                title=ins["title"],
                quote=quote,
                quote_start_index=start_idx if start_idx >= 0 else None,
                quote_end_index=end_idx,
                confidence=0.87,
                sentiment=ins.get("sentiment"),
                theme_suggestion=theme_name,
            )
            db.add(insight)
            insights_created += 1

        interviews_created += 1

    # ── 3. Normalize theme sentiment percentages ──────────
    for theme in theme_map.values():
        total = (
            theme.sentiment_positive
            + theme.sentiment_neutral
            + theme.sentiment_negative
        )
        if total > 0:
            theme.sentiment_positive /= total
            theme.sentiment_neutral /= total
            theme.sentiment_negative /= total

    # ── 4. Sync interview signals ─────────────────────────
    from app.services.signals import sync_interview_signals_for_interview

    for interview_id in created_interview_ids:
        await sync_interview_signals_for_interview(db, interview_id=interview_id)

    # ── 5. Get workspace for external signals ─────────────
    workspace = await get_or_create_default_workspace(db, current_user)

    # ── 6. Create support ticket signals ─────────────────
    signals_created = 0

    for ticket in SAMPLE_TICKETS:
        theme_name = ticket.get("theme")
        theme = theme_map.get(theme_name) if theme_name else None
        metadata: dict = dict(ticket.get("metadata") or {})
        if theme:
            metadata["theme_match"] = {
                "theme_id": str(theme.id),
                "strategy": "demo_seed",
                "score": 1.0,
            }

        signal = Signal(
            workspace_id=workspace.id,
            source_type=SourceType.support,
            provider="zendesk",
            signal_kind=SignalKind.ticket,
            occurred_at=ticket["occurred_at"],
            title=ticket["title"],
            content_text=ticket["content_text"],
            author_or_speaker=ticket.get("author"),
            sentiment=ticket.get("sentiment"),
            metadata_json=metadata or None,
            status=SignalStatus.active,
        )
        db.add(signal)
        signals_created += 1

    # ── 7. Create survey response signals ────────────────
    for survey in SAMPLE_SURVEYS:
        theme_name = survey.get("theme")
        theme = theme_map.get(theme_name) if theme_name else None
        metadata = dict(survey.get("metadata") or {})
        if theme:
            metadata["theme_match"] = {
                "theme_id": str(theme.id),
                "strategy": "demo_seed",
                "score": 1.0,
            }

        signal = Signal(
            workspace_id=workspace.id,
            source_type=SourceType.survey,
            provider="csv_import",
            signal_kind=SignalKind.survey_response,
            occurred_at=survey["occurred_at"],
            title=None,
            content_text=survey["content_text"],
            author_or_speaker=survey.get("author"),
            sentiment=survey.get("sentiment"),
            metadata_json=metadata or None,
            status=SignalStatus.active,
        )
        db.add(signal)
        signals_created += 1

    await db.commit()

    return {
        "interviews_created": interviews_created,
        "insights_discovered": insights_created,
        "themes_created": len(theme_map),
        "signals_created": signals_created,
    }
