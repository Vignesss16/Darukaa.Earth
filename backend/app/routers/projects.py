from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.auth import get_current_user, require_roles
from app.database import get_db
from app.models import Project, ProjectStatus, Site, User, UserRole
from app.schemas import ProjectCreate, ProjectOut, ProjectUpdate

router = APIRouter(prefix="/api/v1/projects", tags=["Projects"])


@router.get(
    "",
    response_model=List[ProjectOut],
    summary="List all conservation projects",
    description="Retrieve a scannable, sortable list of all conservation projects with total site counts and status filtering.",
)
def list_projects(
    status_filter: Optional[ProjectStatus] = Query(
        None, alias="status", description="Filter projects by status (active/archived)"
    ),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List conservation projects with aggregated site count metadata."""
    query = db.query(Project)
    if status_filter:
        query = query.filter(Project.status == status_filter)

    projects = query.order_by(Project.created_at.desc()).all()

    # Calculate site counts per project
    results = []
    for proj in projects:
        site_count = (
            db.query(func.count(Site.id)).filter(Site.project_id == proj.id).scalar()
            or 0
        )
        proj_out = ProjectOut.model_validate(proj)
        proj_out.site_count = site_count
        results.append(proj_out)

    return results


@router.post(
    "",
    response_model=ProjectOut,
    status_code=status.HTTP_201_CREATED,
    summary="Create new conservation project",
    description="Initialize a new conservation project. Requires Admin or Analyst role permissions.",
)
def create_project(
    project_in: ProjectCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles([UserRole.ADMIN, UserRole.ANALYST])),
):
    """Create a new project container for grouping conservation sites."""
    project = Project(
        name=project_in.name,
        description=project_in.description,
        status=project_in.status or ProjectStatus.ACTIVE,
        owner_id=current_user.id,
    )
    db.add(project)
    db.commit()
    db.refresh(project)

    res = ProjectOut.model_validate(project)
    res.site_count = 0
    return res


@router.get(
    "/{project_id}",
    response_model=ProjectOut,
    summary="Get project details",
    description="Fetch single conservation project metadata by project ID.",
)
def get_project(
    project_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Retrieve detailed information for a single project."""
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Project with ID {project_id} was not found.",
        )
    site_count = (
        db.query(func.count(Site.id)).filter(Site.project_id == project.id).scalar()
        or 0
    )
    res = ProjectOut.model_validate(project)
    res.site_count = site_count
    return res


@router.put(
    "/{project_id}",
    response_model=ProjectOut,
    summary="Update project details",
    description="Modify existing conservation project name, description, or status. Requires Admin or Analyst role permissions.",
)
def update_project(
    project_id: int,
    project_in: ProjectUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles([UserRole.ADMIN, UserRole.ANALYST])),
):
    """Update metadata or status for an existing conservation project."""
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Project with ID {project_id} was not found.",
        )

    if project_in.name is not None:
        project.name = project_in.name
    if project_in.description is not None:
        project.description = project_in.description
    if project_in.status is not None:
        project.status = project_in.status

    db.commit()
    db.refresh(project)
    site_count = (
        db.query(func.count(Site.id)).filter(Site.project_id == project.id).scalar()
        or 0
    )
    res = ProjectOut.model_validate(project)
    res.site_count = site_count
    return res


@router.delete(
    "/{project_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete project",
    description="Delete a conservation project and all of its associated sites. Requires Admin role permissions.",
)
def delete_project(
    project_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles([UserRole.ADMIN])),
):
    """Permanently delete a project and cascade delete associated sites."""
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Project with ID {project_id} was not found.",
        )
    db.delete(project)
    db.commit()
    return None
