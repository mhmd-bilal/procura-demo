from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime
from enum import Enum


# ============================================
# Enums
# ============================================
class ProjectStatus(str, Enum):
    DRAFT = "draft"
    PROCESSING = "processing"
    COMPARED = "compared"
    COMPLETED = "completed"
    ARCHIVED = "archived"


class QuotationStatus(str, Enum):
    UPLOADED = "uploaded"
    PROCESSING = "processing"
    EXTRACTED = "extracted"
    FAILED = "failed"


class SummaryType(str, Enum):
    PROCUREMENT = "procurement"
    NEGOTIATION = "negotiation"
    RISK = "risk"
    RECOMMENDATION = "recommendation"


# ============================================
# Request Models
# ============================================
class ProjectCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=200)
    description: Optional[str] = None
    currency: str = Field(default="INR")
    tags: list[str] = Field(default_factory=list)


class ProjectUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    status: Optional[ProjectStatus] = None
    currency: Optional[str] = None
    tags: Optional[list[str]] = None


class VendorCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=200)
    contact_person: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None


class VendorUpdate(BaseModel):
    name: Optional[str] = None
    contact_person: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None


class NegotiationEmailRequest(BaseModel):
    vendor_id: str
    email_type: str = Field(..., description="Type: 'revised_pricing', 'missing_details', 'delivery_negotiation'")
    context: Optional[str] = None


class ExportRequest(BaseModel):
    format: str = Field(..., description="Export format: 'pdf', 'xlsx'")
    include_summary: bool = True
    include_charts: bool = False


# ============================================
# Response Models
# ============================================
class ProjectResponse(BaseModel):
    id: str
    name: str
    description: Optional[str]
    status: str
    total_estimated_spend: float
    currency: str
    vendor_count: int = 0
    tags: list[str]
    created_at: str
    updated_at: str


class VendorResponse(BaseModel):
    id: str
    project_id: str
    name: str
    contact_person: Optional[str]
    email: Optional[str]
    phone: Optional[str]
    quotation_count: int = 0
    created_at: str


class QuotationResponse(BaseModel):
    id: str
    project_id: str
    vendor_id: str
    file_name: str
    file_url: str
    file_size: Optional[int]
    status: str
    page_count: Optional[int]
    extraction_confidence: Optional[float]
    error_message: Optional[str]
    created_at: str


class ExtractedItemResponse(BaseModel):
    id: str
    quotation_id: str
    vendor_id: str
    item_name: str
    normalized_name: Optional[str]
    description: Optional[str]
    quantity: Optional[float]
    unit: Optional[str]
    unit_price: Optional[float]
    total_price: Optional[float]
    tax_rate: Optional[float]
    tax_amount: Optional[float]
    delivery_days: Optional[int]
    payment_terms: Optional[str]
    warranty_info: Optional[str]
    validity_period: Optional[str]
    confidence_score: Optional[float]


class ComparisonResultResponse(BaseModel):
    id: str
    normalized_item_name: str
    item_variants: list[dict]
    vendor_prices: dict
    lowest_vendor_id: Optional[str]
    lowest_price: Optional[float]
    highest_price: Optional[float]
    price_difference_pct: Optional[float]
    quantity_mismatch: bool
    missing_vendors: list[str]
    anomaly_flags: list[dict]
    remarks: Optional[str]


class AISummaryResponse(BaseModel):
    id: str
    project_id: str
    summary_type: str
    content: dict
    created_at: str


class ProcessingStatus(BaseModel):
    project_id: str
    total_quotations: int
    processed: int
    failed: int
    status: str
    progress_pct: float


# ============================================
# AI Extraction Models
# ============================================
class ExtractedQuotationItem(BaseModel):
    item_name: str
    description: Optional[str] = None
    quantity: Optional[float] = None
    unit: Optional[str] = None
    unit_price: Optional[float] = None
    total_price: Optional[float] = None
    tax_rate: Optional[float] = None
    tax_amount: Optional[float] = None
    discount_rate: Optional[float] = None
    discount_amount: Optional[float] = None
    hsn_code: Optional[str] = None


class ExtractedQuotationData(BaseModel):
    vendor_name: Optional[str] = None
    vendor_address: Optional[str] = None
    vendor_contact: Optional[str] = None
    vendor_email: Optional[str] = None
    vendor_phone: Optional[str] = None
    vendor_gst: Optional[str] = None
    quotation_number: Optional[str] = None
    quotation_date: Optional[str] = None
    validity_period: Optional[str] = None
    payment_terms: Optional[str] = None
    delivery_terms: Optional[str] = None
    delivery_days: Optional[int] = None
    warranty_info: Optional[str] = None
    items: list[ExtractedQuotationItem] = Field(default_factory=list)
    subtotal: Optional[float] = None
    total_tax: Optional[float] = None
    grand_total: Optional[float] = None
    notes: Optional[str] = None
