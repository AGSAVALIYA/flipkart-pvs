"""Initial schema — products, validation_logs, users, ingestion_jobs

Revision ID: 001
Revises: None
Create Date: 2026-06-06
"""
from __future__ import annotations

from typing import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "001"
down_revision: str | None = None
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    """Create all initial tables with indexes and constraints."""

    # ── Products ──────────────────────────────────────────────────────
    op.create_table(
        "products",
        sa.Column("wid", sa.String(50), primary_key=True),
        sa.Column("ean", sa.String(20), nullable=False),
        sa.Column("manufacturing_date", sa.Date(), nullable=False),
        sa.Column("expiry_date", sa.Date(), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
    )
    op.create_index("ix_products_ean", "products", ["ean"])

    # ── Users ─────────────────────────────────────────────────────────
    op.create_table(
        "users",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            primary_key=True,
            server_default=sa.text("gen_random_uuid()"),
        ),
        sa.Column("username", sa.String(50), unique=True, nullable=False),
        sa.Column("hashed_password", sa.String(255), nullable=False),
        sa.Column("role", sa.String(20), nullable=False, server_default="operator"),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default="true"),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column(
            "created_by",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("users.id", ondelete="SET NULL"),
            nullable=True,
        ),
    )
    op.create_index("ix_users_username", "users", ["username"], unique=True)

    # ── Validation Logs ───────────────────────────────────────────────
    op.create_table(
        "validation_logs",
        sa.Column(
            "id", sa.BigInteger(), primary_key=True, autoincrement=True
        ),
        sa.Column(
            "wid",
            sa.String(50),
            sa.ForeignKey("products.wid", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("captured_image_url", sa.String(500), nullable=False),
        sa.Column("validation_status", sa.String(20), nullable=False),
        sa.Column("verified_by", sa.String(100), nullable=False),
        sa.Column(
            "verified_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column("ai_extraction", postgresql.JSONB(), nullable=True),
        sa.Column("ai_match_result", sa.String(20), nullable=True),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.CheckConstraint(
            "validation_status IN ('VERIFIED', 'MISMATCH', 'PENDING')",
            name="ck_validation_logs_status",
        ),
        sa.CheckConstraint(
            "ai_match_result IS NULL OR ai_match_result IN ('MATCH', 'MISMATCH', 'INCONCLUSIVE')",
            name="ck_validation_logs_ai_match",
        ),
    )
    # Critical B-Tree index for sub-second date-range queries
    op.create_index(
        "ix_validation_logs_verified_at", "validation_logs", ["verified_at"]
    )
    op.create_index(
        "ix_validation_logs_wid", "validation_logs", ["wid"]
    )
    op.create_index(
        "ix_validation_logs_status", "validation_logs", ["validation_status"]
    )

    # ── Ingestion Jobs ────────────────────────────────────────────────
    op.create_table(
        "ingestion_jobs",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            primary_key=True,
            server_default=sa.text("gen_random_uuid()"),
        ),
        sa.Column("filename", sa.String(255), nullable=False),
        sa.Column("file_path", sa.String(500), nullable=False),
        sa.Column(
            "status",
            sa.String(20),
            nullable=False,
            server_default="pending",
        ),
        sa.Column("total_rows", sa.Integer(), nullable=True),
        sa.Column("processed_rows", sa.Integer(), server_default="0"),
        sa.Column("error_count", sa.Integer(), server_default="0"),
        sa.Column("error_details", postgresql.JSONB(), nullable=True),
        sa.Column("started_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("completed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column("created_by", sa.String(100), nullable=True),
        sa.CheckConstraint(
            "status IN ('pending', 'processing', 'completed', 'failed')",
            name="ck_ingestion_jobs_status",
        ),
    )


def downgrade() -> None:
    """Drop all tables in reverse dependency order."""
    op.drop_table("ingestion_jobs")
    op.drop_table("validation_logs")
    op.drop_table("users")
    op.drop_table("products")
