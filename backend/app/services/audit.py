from contextvars import ContextVar
from datetime import datetime, timezone
from typing import Any, Dict, Optional

from sqlalchemy import event, inspect
from sqlalchemy.orm import Session

from app.models import AuditLog, Project, Site

# ContextVar to store the current request's user ID
current_user_id_ctx: ContextVar[Optional[int]] = ContextVar(
    "current_user_id_ctx", default=None
)


def set_current_user_id(user_id: Optional[int]) -> None:
    """Set current user ID in context for audit logging."""
    current_user_id_ctx.set(user_id)


def get_current_user_id() -> Optional[int]:
    """Retrieve current user ID from context."""
    return current_user_id_ctx.get()


def record_audit_log(
    db: Session,
    action: str,
    entity_type: str,
    entity_id: str,
    diff: Optional[Dict[str, Any]] = None,
    user_id: Optional[int] = None,
) -> AuditLog:
    """Explicitly create and persist an audit log entry."""
    active_user_id = user_id if user_id is not None else get_current_user_id()
    log_entry = AuditLog(
        user_id=active_user_id,
        action=action,
        entity_type=entity_type,
        entity_id=str(entity_id),
        diff=diff or {},
    )
    db.add(log_entry)
    return log_entry


def register_audit_event_listeners():
    """Register SQLAlchemy ORM event listeners for automatic audit logging on Project and Site changes."""

    @event.listens_for(Session, "before_flush")
    def before_flush_audit(session: Session, flush_context, instances):
        user_id = session.info.get("user_id") or get_current_user_id()

        # Handle new insertions
        for target in session.new:
            if isinstance(target, AuditLog):
                continue
            if isinstance(target, Project):
                diff = {
                    "name": target.name,
                    "description": target.description,
                    "status": (
                        target.status.value
                        if hasattr(target.status, "value")
                        else str(target.status)
                    ),
                }
                pending = session.info.setdefault("pending_audit_inserts", [])
                pending.append(
                    {
                        "target": target,
                        "entity_type": "project",
                        "action": "create",
                        "diff": diff,
                        "user_id": user_id,
                    }
                )
            elif isinstance(target, Site):
                diff = {
                    "name": target.name,
                    "project_id": target.project_id,
                    "site_type": (
                        target.site_type.value
                        if hasattr(target.site_type, "value")
                        else str(target.site_type)
                    ),
                    "area_hectares": (
                        float(target.area_hectares)
                        if target.area_hectares is not None
                        else None
                    ),
                }
                pending = session.info.setdefault("pending_audit_inserts", [])
                pending.append(
                    {
                        "target": target,
                        "entity_type": "site",
                        "action": "create",
                        "diff": diff,
                        "user_id": user_id,
                    }
                )

        # Handle updates
        for target in session.dirty:
            if isinstance(target, AuditLog):
                continue
            state = inspect(target)
            diff = {}
            for attr in state.attrs:
                if attr.key in ("geom", "created_at", "id"):
                    continue
                history = attr.history
                if history.has_changes():
                    old_val = history.deleted[0] if history.deleted else None
                    new_val = history.added[0] if history.added else None
                    if hasattr(old_val, "value"):
                        old_val = old_val.value
                    if hasattr(new_val, "value"):
                        new_val = new_val.value
                    diff[attr.key] = {"old": old_val, "new": new_val}

            if diff:
                entity_type = (
                    "project"
                    if isinstance(target, Project)
                    else "site" if isinstance(target, Site) else None
                )
                if entity_type:
                    session.add(
                        AuditLog(
                            user_id=user_id,
                            action="update",
                            entity_type=entity_type,
                            entity_id=str(target.id),
                            diff=diff,
                        )
                    )

        # Handle deletions
        for target in session.deleted:
            if isinstance(target, AuditLog):
                continue
            entity_type = (
                "project"
                if isinstance(target, Project)
                else "site" if isinstance(target, Site) else None
            )
            if entity_type:
                diff = {"name": getattr(target, "name", "Unknown")}
                if isinstance(target, Site):
                    diff["project_id"] = target.project_id
                session.add(
                    AuditLog(
                        user_id=user_id,
                        action="delete",
                        entity_type=entity_type,
                        entity_id=str(target.id),
                        diff=diff,
                    )
                )

    @event.listens_for(Session, "after_flush")
    def after_flush_audit(session: Session, flush_context):
        pending = session.info.pop("pending_audit_inserts", [])
        for item in pending:
            target = item["target"]
            session.add(
                AuditLog(
                    user_id=item["user_id"],
                    action=item["action"],
                    entity_type=item["entity_type"],
                    entity_id=str(target.id),
                    diff=item["diff"],
                )
            )


def format_activity_sentence(log: AuditLog, db: Session) -> Dict[str, Any]:
    """Format an audit log record into a human-readable activity sentence."""
    user_name = log.user.full_name if log.user and log.user.full_name else "System User"
    action = log.action.lower()
    entity_type = log.entity_type.lower()
    diff = log.diff or {}

    sentence = f"{user_name} performed {action} on {entity_type} #{log.entity_id}"

    if entity_type == "site":
        site_name = diff.get("name")
        if not site_name and action != "delete":
            site_obj = db.query(Site).filter(Site.id == int(log.entity_id)).first()
            if site_obj:
                site_name = site_obj.name

        project_id = diff.get("project_id")
        project_name = None
        if project_id:
            proj = db.query(Project).filter(Project.id == int(project_id)).first()
            if proj:
                project_name = proj.name

        if action == "create":
            if site_name and project_name:
                sentence = f"{user_name} added {site_name} to {project_name}"
            elif site_name:
                sentence = f"{user_name} created site '{site_name}'"
            else:
                sentence = f"{user_name} created site #{log.entity_id}"
        elif action == "update":
            sentence = f"{user_name} updated properties for site '{site_name or log.entity_id}'"
        elif action == "delete":
            sentence = (
                f"{user_name} deleted conservation site '{site_name or log.entity_id}'"
            )

    elif entity_type == "project":
        project_name = diff.get("name")
        if not project_name and action != "delete":
            proj_obj = (
                db.query(Project).filter(Project.id == int(log.entity_id)).first()
            )
            if proj_obj:
                project_name = proj_obj.name

        if action == "create":
            sentence = f"{user_name} initialized conservation project '{project_name or log.entity_id}'"
        elif action == "update":
            sentence = f"{user_name} updated project metadata for '{project_name or log.entity_id}'"
        elif action == "delete":
            sentence = f"{user_name} archived and deleted project '{project_name or log.entity_id}'"

    return {
        "id": log.id,
        "user_id": log.user_id,
        "user_name": user_name,
        "action": log.action,
        "entity_type": log.entity_type,
        "entity_id": log.entity_id,
        "diff": log.diff,
        "sentence": sentence,
        "created_at": (
            log.created_at.isoformat()
            if log.created_at
            else datetime.now(timezone.utc).isoformat()
        ),
    }
