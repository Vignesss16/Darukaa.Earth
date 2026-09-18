"""Add DEFORESTATION_AREA_KM2 and FIRE_INCIDENTS to metrictype enum

Revision ID: 002_add_metric_types
Revises: 001_initial_schema
Create Date: 2026-09-18 04:30:00.000000

"""

from typing import Sequence, Union

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "002_add_metric_types"
down_revision: Union[str, None] = "001_initial_schema"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Safely extend native PostgreSQL ENUM metrictype with IF NOT EXISTS
    op.execute(
        "ALTER TYPE metrictype ADD VALUE IF NOT EXISTS 'DEFORESTATION_AREA_KM2';"
    )
    op.execute("ALTER TYPE metrictype ADD VALUE IF NOT EXISTS 'FIRE_INCIDENTS';")


def downgrade() -> None:
    # PostgreSQL does not support removing values from an existing ENUM type
    # without recreating the type and all referencing tables/views.
    pass
