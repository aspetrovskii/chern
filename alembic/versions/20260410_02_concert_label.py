"""concert label column

Revision ID: 20260410_02
Revises: 20260410_01
Create Date: 2026-04-10
"""

from __future__ import annotations

import sqlalchemy as sa
from alembic import op

revision = "20260410_02"
down_revision = "20260410_01"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("concerts", sa.Column("label", sa.String(length=80), nullable=True))


def downgrade() -> None:
    op.drop_column("concerts", "label")
