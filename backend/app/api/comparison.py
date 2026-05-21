"""Comparison API - Generate and retrieve vendor comparisons."""

from fastapi import APIRouter, HTTPException
from app.core.supabase import get_supabase
from app.services.comparison_engine import ComparisonEngine
from app.services.gemini_service import GeminiService
from app.services.export_service import ExportService
from app.models.schemas import NegotiationEmailRequest, ExportRequest
from fastapi.responses import StreamingResponse
import io
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/comparison", tags=["Comparison"])


@router.post("/generate/{project_id}")
async def generate_comparison(project_id: str):
    """Generate comparison results for a project."""
    engine = ComparisonEngine()
    results = await engine.generate_comparison(project_id)

    if not results:
        raise HTTPException(status_code=400, detail="No items to compare. Process quotations first.")

    return {"data": results, "count": len(results)}


@router.get("/{project_id}")
async def get_comparison(project_id: str):
    """Get existing comparison results for a project."""
    supabase = get_supabase()
    results = supabase.table("comparison_results").select("*").eq(
        "project_id", project_id
    ).execute()

    vendors = supabase.table("vendors").select("*").eq(
        "project_id", project_id
    ).execute()

    return {
        "data": {
            "results": results.data,
            "vendors": vendors.data
        }
    }


@router.post("/summary/{project_id}")
async def generate_summary(project_id: str):
    """Generate AI procurement summary for a project."""
    supabase = get_supabase()

    logger.info("Summary endpoint invoked for project_id=%s", project_id)

    # Get comparison results
    results = supabase.table("comparison_results").select("*").eq(
        "project_id", project_id
    ).execute()

    if not results.data:
        logger.warning("No comparison results found for project_id=%s", project_id)
        raise HTTPException(status_code=400, detail="No comparison results found. Generate comparison first.")

    # Get vendors
    vendors = supabase.table("vendors").select("*").eq(
        "project_id", project_id
    ).execute()
    vendor_map = {v["id"]: v["name"] for v in vendors.data}

    # Prepare comparison data for AI
    comparison_data = {
        "vendors": [{"id": v["id"], "name": v["name"]} for v in vendors.data],
        "items": []
    }

    for r in results.data:
        item = {
            "name": r["normalized_item_name"],
            "vendor_prices": {},
            "lowest_vendor": vendor_map.get(r.get("lowest_vendor_id"), "N/A"),
            "price_difference_pct": r.get("price_difference_pct"),
            "quantity_mismatch": r.get("quantity_mismatch"),
            "anomaly_flags": r.get("anomaly_flags", [])
        }
        for vid, vp in (r.get("vendor_prices") or {}).items():
            if isinstance(vp, dict):
                item["vendor_prices"][vp.get("vendor_name", vid)] = {
                    "unit_price": vp.get("unit_price"),
                    "total_price": vp.get("total_price"),
                    "delivery_days": vp.get("delivery_days"),
                    "warranty_info": vp.get("warranty_info"),
                    "payment_terms": vp.get("payment_terms")
                }
        comparison_data["items"].append(item)

    # Generate Summary
    ai_service = GeminiService()
    try:
        summary = await ai_service.generate_procurement_summary(comparison_data)
    except Exception as e:
        logger.error("Summary generation failed: %s", str(e))
        raise HTTPException(
            status_code=503, 
            detail="LLM processing limits reached (quota exceeded). Please wait a moment before trying again."
        )

    # Store summary
    supabase.table("ai_summaries").insert({
        "project_id": project_id,
        "summary_type": "procurement",
        "content": summary,
        "generated_by": "gemini"
    }).execute()
    logger.info("Summary stored for project_id=%s", project_id)

    # Update project status
    supabase.table("projects").update({"status": "completed"}).eq(
        "id", project_id
    ).execute()

    return {"data": summary}


@router.get("/summary/{project_id}")
async def get_summary(project_id: str):
    """Get existing Summary for a project."""
    supabase = get_supabase()
    result = supabase.table("ai_summaries").select("*").eq(
        "project_id", project_id
    ).eq("summary_type", "procurement").order(
        "created_at", desc=True
    ).limit(1).execute()

    if not result.data:
        raise HTTPException(status_code=404, detail="No summary found")

    return {"data": result.data[0]}


@router.post("/negotiate")
async def generate_negotiation_email(request: NegotiationEmailRequest):
    """Generate a professional negotiation email."""
    supabase = get_supabase()

    # Get vendor info
    vendor = supabase.table("vendors").select("*").eq(
        "id", request.vendor_id
    ).single().execute()

    if not vendor.data:
        raise HTTPException(status_code=404, detail="Vendor not found")

    # Get vendor's project comparison context
    project_id = vendor.data.get("project_id")
    comparison = supabase.table("comparison_results").select("*").eq(
        "project_id", project_id
    ).execute()

    comparison_context = {
        "items": [
            {
                "name": r["normalized_item_name"],
                "vendor_price": r.get("vendor_prices", {}).get(request.vendor_id, {}),
                "lowest_price": r.get("lowest_price"),
                "price_diff_pct": r.get("price_difference_pct")
            }
            for r in comparison.data
        ]
    }

    ai_service = GeminiService()
    email = await ai_service.generate_negotiation_email(
        vendor_data=vendor.data,
        email_type=request.email_type,
        comparison_context=comparison_context,
        custom_context=request.context
    )

    return {"data": email}


@router.post("/export/{project_id}")
async def export_comparison(project_id: str, request: ExportRequest):
    """Export comparison as PDF or Excel."""
    supabase = get_supabase()

    # Get project
    project = supabase.table("projects").select("*").eq(
        "id", project_id
    ).single().execute()
    if not project.data:
        raise HTTPException(status_code=404, detail="Project not found")

    # Get comparison results
    results = supabase.table("comparison_results").select("*").eq(
        "project_id", project_id
    ).execute()

    # Get vendors
    vendors = supabase.table("vendors").select("*").eq(
        "project_id", project_id
    ).execute()

    # Get summary if requested
    summary = None
    if request.include_summary:
        summary_result = supabase.table("ai_summaries").select("content").eq(
            "project_id", project_id
        ).eq("summary_type", "procurement").order(
            "created_at", desc=True
        ).limit(1).execute()
        if summary_result.data:
            summary = summary_result.data[0]["content"]

    export_service = ExportService()

    if request.format == "xlsx":
        file_bytes = export_service.export_excel(
            project.data["name"], vendors.data, results.data, summary
        )
        return StreamingResponse(
            io.BytesIO(file_bytes),
            media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            headers={
                "Content-Disposition": f'attachment; filename="{project.data["name"]}_comparison.xlsx"'
            }
        )
    elif request.format == "pdf":
        file_bytes = export_service.export_pdf(
            project.data["name"], vendors.data, results.data, summary
        )
        return StreamingResponse(
            io.BytesIO(file_bytes),
            media_type="application/pdf",
            headers={
                "Content-Disposition": f'attachment; filename="{project.data["name"]}_comparison.pdf"'
            }
        )
    else:
        raise HTTPException(status_code=400, detail="Invalid format. Use 'pdf' or 'xlsx'")
