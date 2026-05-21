"""Vendors API - Manage vendors and intelligence."""

from fastapi import APIRouter, HTTPException
from app.core.supabase import get_supabase
from app.services.gemini_service import GeminiService
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/vendors", tags=["Vendors"])


@router.get("/{vendor_id}/intelligence")
async def get_vendor_intelligence(vendor_id: str):
    """Generate or retrieve online intelligence for a vendor."""
    supabase = get_supabase()
    
    # 1. Get vendor details
    vendor = supabase.table("vendors").select("*").eq("id", vendor_id).single().execute()
    if not vendor.data:
        raise HTTPException(status_code=404, detail="Vendor not found")
        
    vendor_name = vendor.data.get("name")
    
    # 2. Check if we already have a recent summary stored in metadata
    # (Optional caching mechanism - we'll just generate it fresh or cache it in metadata)
    metadata = vendor.data.get("metadata") or {}
    if "intelligence" in metadata:
        return {"data": metadata["intelligence"]}
        
    # 3. Generate using Gemini
    ai_service = GeminiService()
    try:
        intelligence = await ai_service.generate_vendor_intelligence(vendor_name)
    except Exception as e:
        logger.error(f"Failed to generate intelligence for {vendor_name}: {e}")
        raise HTTPException(status_code=500, detail="Failed to retrieve vendor intelligence")
        
    # 4. Save to metadata for future use (cache)
    metadata["intelligence"] = intelligence
    supabase.table("vendors").update({"metadata": metadata}).eq("id", vendor_id).execute()
    
    return {"data": intelligence}
