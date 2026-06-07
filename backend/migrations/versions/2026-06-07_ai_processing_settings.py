"""Add AI processing settings and validation log state

Revision ID: 002
Revises: 001
Create Date: 2026-06-07
"""

from __future__ import annotations

from typing import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "002"
down_revision: str | None = "001"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    """Add persistent AI settings and validation-log AI state columns."""
    op.create_table(
        "system_settings",
        sa.Column("key", sa.String(length=100), primary_key=True),
        sa.Column("value", postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
    )

    op.add_column("validation_logs", sa.Column("ai_processing_mode", sa.String(length=20), nullable=True))
    op.add_column("validation_logs", sa.Column("ai_processing_status", sa.String(length=20), nullable=True))
    op.add_column("validation_logs", sa.Column("ai_provider_name", sa.String(length=50), nullable=True))
    op.add_column("validation_logs", sa.Column("ai_error_message", sa.Text(), nullable=True))
    op.add_column("validation_logs", sa.Column("ai_processed_at", sa.DateTime(timezone=True), nullable=True))
    op.create_index(
        "ix_validation_logs_ai_processing_status",
        "validation_logs",
        ["ai_processing_status"],
    )


def downgrade() -> None:
    """Remove AI settings table and validation-log AI state columns."""
    op.drop_index("ix_validation_logs_ai_processing_status", table_name="validation_logs")
    op.drop_column("validation_logs", "ai_processed_at")
    op.drop_column("validation_logs", "ai_error_message")
    op.drop_column("validation_logs", "ai_provider_name")
    op.drop_column("validation_logs", "ai_processing_status")
    op.drop_column("validation_logs", "ai_processing_mode")
    op.drop_table("system_settings")