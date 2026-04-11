"""Add product context and provenance scoring

Revision ID: e8f2a1b9c4d7
Revises: c7d4e9f6b8a1
Create Date: 2026-04-11 22:30:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = "e8f2a1b9c4d7"
down_revision = "c7d4e9f6b8a1"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # ── User: Product Context fields ──
    op.add_column("users", sa.Column("product_description", sa.Text(), nullable=True))
    op.add_column("users", sa.Column("product_website_url", sa.String(1024), nullable=True))
    op.add_column("users", sa.Column("product_context_summary", sa.Text(), nullable=True))

    # ── Insight: Provenance scoring fields ──
    op.add_column("insights", sa.Column("provenance_label", sa.String(50), nullable=True))
    op.add_column("insights", sa.Column("provenance_reason", sa.String(512), nullable=True))
    op.add_column(
        "insights",
        sa.Column("is_interviewer_voice", sa.Boolean(), nullable=False, server_default=sa.text("false")),
    )


def downgrade() -> None:
    # ── Insight: Remove provenance fields ──
    op.drop_column("insights", "is_interviewer_voice")
    op.drop_column("insights", "provenance_reason")
    op.drop_column("insights", "provenance_label")

    # ── User: Remove product context fields ──
    op.drop_column("users", "product_context_summary")
    op.drop_column("users", "product_website_url")
    op.drop_column("users", "product_description")
