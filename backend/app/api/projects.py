"""Projects API - CRUD operations for comparison projects."""

from fastapi import APIRouter, HTTPException, Depends
from app.core.supabase import get_supabase
from app.models.schemas import ProjectCreate, ProjectUpdate, ProjectResponse
from app.api.deps import get_current_user

router = APIRouter(prefix="/projects", tags=["Projects"])


@router.get("")
async def list_projects(org_id: str = None, current_user = Depends(get_current_user)):
    """List all projects, optionally filtered by organization."""
    supabase = get_supabase()
    query = supabase.table("projects").select(
        "*, vendors(count)"
    ).order("created_at", desc=True)

    query = query.eq("created_by", current_user.id)

    if org_id:
        query = query.eq("organization_id", org_id)

    result = query.execute()

    # Enrich with vendor count
    projects = []
    for p in result.data:
        vendor_count = 0
        if isinstance(p.get("vendors"), list):
            vendor_count = len(p["vendors"])
        elif isinstance(p.get("vendors"), dict):
            vendor_count = p["vendors"].get("count", 0)

        projects.append({
            **p,
            "vendor_count": vendor_count
        })

    return {"data": projects}


@router.get("/{project_id}")
async def get_project(project_id: str, current_user = Depends(get_current_user)):
    """Get a single project with all related data."""
    supabase = get_supabase()
    result = supabase.table("projects").select("*").eq("id", project_id).eq("created_by", current_user.id).single().execute()

    if not result.data:
        raise HTTPException(status_code=404, detail="Project not found")

    # Get vendors
    vendors = supabase.table("vendors").select("*").eq("project_id", project_id).execute()

    # Get quotations
    quotations = supabase.table("quotations").select("*").eq("project_id", project_id).execute()

    return {
        "data": {
            **result.data,
            "vendors": vendors.data,
            "quotations": quotations.data
        }
    }


@router.post("")
async def create_project(project: ProjectCreate, current_user = Depends(get_current_user)):
    """Create a new comparison project."""
    supabase = get_supabase()

    # No auth context available here, so create the project without an organization_id.
    # This avoids requiring the organizations table when the schema is not initialized.
    data = {
        "name": project.name,
        "description": project.description,
        "currency": project.currency,
        "tags": project.tags,
        "status": "draft",
        "created_by": current_user.id,
        "organization_id": None
    }

    result = supabase.table("projects").insert(data).execute()
    if getattr(result, "error", None):
        raise HTTPException(status_code=500, detail=f"Failed to create project: {result.error}")

    return {"data": result.data[0]}


@router.patch("/{project_id}")
async def update_project(project_id: str, project: ProjectUpdate, current_user = Depends(get_current_user)):
    """Update project details."""
    supabase = get_supabase()
    update_data = project.model_dump(exclude_none=True)

    if not update_data:
        raise HTTPException(status_code=400, detail="No fields to update")

    result = supabase.table("projects").update(update_data).eq("id", project_id).eq("created_by", current_user.id).execute()

    if not result.data:
        raise HTTPException(status_code=404, detail="Project not found")

    return {"data": result.data[0]}


@router.delete("/{project_id}")
async def delete_project(project_id: str, current_user = Depends(get_current_user)):
    """Delete a project and all related data."""
    supabase = get_supabase()
    
    # First check if the project exists and belongs to the user
    check = supabase.table("projects").select("id").eq("id", project_id).eq("created_by", current_user.id).execute()
    if not check.data:
        raise HTTPException(status_code=404, detail="Project not found or you don't have permission")
        
    supabase.table("projects").delete().eq("id", project_id).eq("created_by", current_user.id).execute()
    return {"message": "Project deleted successfully"}
