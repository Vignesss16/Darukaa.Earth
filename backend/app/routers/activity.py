from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.auth import get_current_user
from app.database import get_db
from app.models import AuditLog, User
from app.services.audit import format_activity_sentence

router = APIRouter(prefix="/api/v1/activity", tags=["Activity Feed"])


@router.get(
    "",
    summary="List recent activity log events",
    description="Retrieve plain-language system activity events across projects and conservation sites.",
)
def list_activity(
    limit: int = Query(
        50, ge=1, le=200, description="Max number of log events to retrieve"
    ),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Retrieve formatted plain-language activity log items."""
    logs = db.query(AuditLog).order_by(AuditLog.created_at.desc()).limit(limit).all()

    return [format_activity_sentence(log, db) for log in logs]
