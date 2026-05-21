"""Quotations API - Upload, process, and manage vendor quotations."""

import uuid
import logging
from fastapi import APIRouter, HTTPException, UploadFile, File, Form, BackgroundTasks
from app.core.supabase import get_supabase
from app.services.pdf_extractor import PDFExtractor
from app.services.gemini_service import GeminiService
from app.models.schemas import QuotationStatus

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/quotations", tags=["Quotations"])


@router.post("/upload")
async def upload_quotation(
    project_id: str = Form(...),
    file: UploadFile = File(...)
):
    """Upload a quotation PDF and create vendor record."""
    supabase = get_supabase()

    # Validate file type
    if not file.filename.lower().endswith('.pdf'):
        raise HTTPException(status_code=400, detail="Only PDF files are accepted")

    # Read file
    file_bytes = await file.read()
    file_size = len(file_bytes)

    # Check size (50MB limit)
    if file_size > 50 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="File size exceeds 50MB limit")

    # Create temporary vendor placeholder
    vendor_name = f"Pending Extraction - {file.filename}"
    vendor_result = supabase.table("vendors").insert({
        "project_id": project_id,
        "name": vendor_name
    }).execute()

    if getattr(vendor_result, "error", None):
        raise HTTPException(
            status_code=500,
            detail=(
                "Vendor creation failed. "
                "Check that the Supabase schema is initialized and the vendors table exists."
            )
        )

    vendor_id = vendor_result.data[0]["id"]

    # Upload to Supabase Storage
    storage_path = f"{project_id}/{vendor_id}/{uuid.uuid4()}.pdf"
    try:
        supabase.storage.from_("quotations").upload(
            storage_path,
            file_bytes,
            {"content-type": "application/pdf"}
        )
        file_url = supabase.storage.from_("quotations").get_public_url(storage_path)
    except Exception as e:
        logger.warning(f"Storage upload failed: {e}")
        file_url = f"/storage/{storage_path}"

    # Create quotation record
    quotation = supabase.table("quotations").insert({
        "project_id": project_id,
        "vendor_id": vendor_id,
        "file_name": file.filename,
        "file_url": file_url,
        "file_size": file_size,
        "storage_path": storage_path,
        "status": "uploaded"
    }).execute()

    if getattr(quotation, "error", None):
        raise HTTPException(
            status_code=500,
            detail=(
                "Quotation creation failed. "
                "Check that the Supabase schema is initialized and the quotations table exists."
            )
        )

    return {
        "data": {
            "quotation": quotation.data[0],
            "vendor": {"id": vendor_id, "name": vendor_name}
        }
    }


@router.post("/process/{quotation_id}")
async def process_quotation(quotation_id: str):
    """Process a single quotation - extract text and AI-parse data."""
    supabase = get_supabase()

    # Get quotation
    quotation = supabase.table("quotations").select("*").eq(
        "id", quotation_id
    ).single().execute()

    if not quotation.data:
        raise HTTPException(status_code=404, detail="Quotation not found")

    q = quotation.data

    logger.info("Quotation processing started for quotation_id=%s", quotation_id)

    # Update status to processing
    supabase.table("quotations").update(
        {"status": "processing"}
    ).eq("id", quotation_id).execute()

    try:
        # Download file from storage
        try:
            file_bytes = supabase.storage.from_("quotations").download(q["storage_path"])
        except Exception:
            raise HTTPException(status_code=500, detail="Could not retrieve PDF from storage")

        # Extract text from PDF
        extractor = PDFExtractor()
        pdf_data = extractor.extract_text(file_bytes)

        ai_service = GeminiService()
        if not pdf_data.get("text", "").strip():
            logger.warning("No text extracted from PDF; using Gemini file fallback for quotation_id=%s", quotation_id)
            extracted = await ai_service.extract_quotation_data_from_pdf(file_bytes, quotation_id)
        else:
            # AI extraction using Gemini
            extracted = await ai_service.extract_quotation_data(pdf_data["text"])
        logger.info("Gemini extraction returned %s items for quotation_id=%s", len(extracted.items), quotation_id)

        # Update vendor info if extracted
        vendor_update = {}
        if extracted.vendor_name:
            vendor_update["name"] = extracted.vendor_name
        if extracted.vendor_contact:
            vendor_update["contact_person"] = extracted.vendor_contact
        if extracted.vendor_email:
            vendor_update["email"] = extracted.vendor_email
        if extracted.vendor_phone:
            vendor_update["phone"] = extracted.vendor_phone
        if extracted.vendor_gst:
            vendor_update["gst_number"] = extracted.vendor_gst
        if extracted.vendor_address:
            vendor_update["address"] = extracted.vendor_address

        if vendor_update:
            supabase.table("vendors").update(vendor_update).eq(
                "id", q["vendor_id"]
            ).execute()

        # Store extracted items
        items_to_insert = []
        for idx, item in enumerate(extracted.items):
            items_to_insert.append({
                "quotation_id": quotation_id,
                "vendor_id": q["vendor_id"],
                "project_id": q["project_id"],
                "item_name": item.item_name,
                "normalized_name": item.item_name,  # Will be normalized during comparison
                "description": item.description,
                "quantity": item.quantity,
                "unit": item.unit,
                "unit_price": item.unit_price,
                "total_price": item.total_price,
                "tax_rate": item.tax_rate,
                "tax_amount": item.tax_amount,
                "discount_rate": item.discount_rate,
                "discount_amount": item.discount_amount,
                "hsn_code": item.hsn_code,
                "delivery_days": extracted.delivery_days,
                "payment_terms": extracted.payment_terms,
                "warranty_info": extracted.warranty_info,
                "validity_period": extracted.validity_period,
                "confidence_score": 85.0,  # Default confidence
                "sort_order": idx
            })

        if items_to_insert:
            supabase.table("extracted_items").insert(items_to_insert).execute()

        # Update quotation status
        supabase.table("quotations").update({
            "status": "extracted",
            "page_count": pdf_data.get("page_count"),
            "extraction_confidence": 85.0,
            "raw_text": pdf_data["text"][:5000]  # Store first 5k chars
        }).eq("id", quotation_id).execute()

        return {
            "data": {
                "status": "extracted",
                "items_count": len(items_to_insert),
                "page_count": pdf_data.get("page_count"),
                "vendor_info_extracted": bool(vendor_update)
            }
        }

    except Exception as e:
        logger.error(f"Processing failed for quotation {quotation_id}: {str(e)}")
        supabase.table("quotations").update({
            "status": "failed",
            "error_message": str(e)[:500]
        }).eq("id", quotation_id).execute()
        raise HTTPException(status_code=500, detail=f"Processing failed: {str(e)}")


async def background_process_all(project_id: str, quotations_data: list):
    supabase = get_supabase()
    
    for q in quotations_data:
        try:
            await process_quotation(q["id"])
        except Exception as e:
            logger.error(f"Background processing failed for quotation {q['id']}: {e}")

    try:
        logger.info("Background project processing started for project_id=%s, quotations=%s", project_id, len(quotations_data))
        from app.services.comparison_engine import ComparisonEngine
        engine = ComparisonEngine()
        results = await engine.generate_comparison(project_id)

        if results:
            logger.info("Comparison generation completed for project_id=%s, items=%s", project_id, len(results))
            try:
                from app.api.comparison import generate_summary
                await generate_summary(project_id)
            except Exception as summary_error:
                logger.error(f"Summary generation failed for project {project_id}: {summary_error}")
                supabase.table("projects").update({"status": "compared"}).eq("id", project_id).execute()
        else:
            logger.warning(f"No comparison results generated for project {project_id}")
            supabase.table("projects").update({"status": "draft"}).eq("id", project_id).execute()
    except Exception as e:
        logger.error(f"Background comparison/summary failed for project {project_id}: {e}")
        supabase.table("projects").update({"status": "draft"}).eq("id", project_id).execute()


@router.post("/process-all/{project_id}")
async def process_all_quotations(project_id: str, background_tasks: BackgroundTasks):
    """Process all unprocessed quotations in a project in the background."""
    supabase = get_supabase()

    # Get all uploaded quotations
    quotations = supabase.table("quotations").select("*").eq(
        "project_id", project_id
    ).in_("status", ["uploaded", "failed"]).execute()

    if not quotations.data:
        return {"data": {"message": "No quotations to process", "processed": 0}}

    # Update project status
    supabase.table("projects").update({"status": "processing"}).eq(
        "id", project_id
    ).execute()

    background_tasks.add_task(background_process_all, project_id, quotations.data)

    return {"data": {"message": "Processing started in background", "count": len(quotations.data)}}


@router.get("/items/{project_id}")
async def get_extracted_items(project_id: str, vendor_id: str = None):
    """Get all extracted items for a project, optionally filtered by vendor."""
    supabase = get_supabase()
    query = supabase.table("extracted_items").select(
        "*, vendors(name)"
    ).eq("project_id", project_id).order("sort_order")

    if vendor_id:
        query = query.eq("vendor_id", vendor_id)

    result = query.execute()
    return {"data": result.data}


@router.delete("/{quotation_id}")
async def delete_quotation(quotation_id: str):
    """Delete a quotation and its extracted items."""
    supabase = get_supabase()

    # Get quotation for storage path
    q = supabase.table("quotations").select("*").eq("id", quotation_id).single().execute()
    if q.data and q.data.get("storage_path"):
        try:
            supabase.storage.from_("quotations").remove([q.data["storage_path"]])
        except Exception:
            pass

    # Delete extracted items first
    supabase.table("extracted_items").delete().eq("quotation_id", quotation_id).execute()
    supabase.table("quotations").delete().eq("id", quotation_id).execute()

    return {"message": "Quotation deleted"}
