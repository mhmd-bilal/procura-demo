// ============================================
// Core Entity Types
// ============================================

export interface Organization {
  id: string;
  name: string;
  slug: string;
  logo_url?: string;
  created_at: string;
  updated_at: string;
}

export interface User {
  id: string;
  email: string;
  full_name?: string;
  avatar_url?: string;
  organization_id?: string;
  role: 'owner' | 'admin' | 'member' | 'viewer';
  created_at: string;
}

export type ProjectStatus = 'draft' | 'processing' | 'compared' | 'completed' | 'archived';

export interface Project {
  id: string;
  organization_id?: string;
  created_by?: string;
  name: string;
  description?: string;
  status: ProjectStatus;
  total_estimated_spend: number;
  currency: string;
  tags: string[];
  vendor_count?: number;
  vendors?: Vendor[];
  quotations?: Quotation[];
  created_at: string;
  updated_at: string;
}

export interface Vendor {
  id: string;
  project_id: string;
  name: string;
  contact_person?: string;
  email?: string;
  phone?: string;
  address?: string;
  gst_number?: string;
  rating?: number;
  created_at: string;
}

export type QuotationStatus = 'uploaded' | 'processing' | 'extracted' | 'failed';

export interface Quotation {
  id: string;
  project_id: string;
  vendor_id: string;
  file_name: string;
  file_url: string;
  file_size?: number;
  status: QuotationStatus;
  page_count?: number;
  extraction_confidence?: number;
  error_message?: string;
  created_at: string;
}

export interface ExtractedItem {
  id: string;
  quotation_id: string;
  vendor_id: string;
  project_id: string;
  item_name: string;
  normalized_name?: string;
  description?: string;
  quantity?: number;
  unit?: string;
  unit_price?: number;
  total_price?: number;
  tax_rate?: number;
  tax_amount?: number;
  delivery_days?: number;
  payment_terms?: string;
  warranty_info?: string;
  validity_period?: string;
  confidence_score?: number;
  vendors?: { name: string };
}

export interface VendorPrice {
  vendor_name: string;
  vendor_id: string;
  unit_price?: number;
  total_price?: number;
  quantity?: number;
  unit?: string;
  tax_rate?: number;
  delivery_days?: number;
  warranty_info?: string;
  payment_terms?: string;
}

export interface ComparisonResult {
  id: string;
  project_id?: string;
  normalized_item_name: string;
  item_variants: { original_name: string; vendor_name: string; vendor_id: string }[];
  vendor_prices: Record<string, VendorPrice>;
  lowest_vendor_id?: string;
  lowest_price?: number;
  highest_price?: number;
  price_difference_pct?: number;
  quantity_mismatch: boolean;
  missing_vendors: string[];
  anomaly_flags: { type: string; message: string }[];
  remarks?: string;
}

export interface AISummary {
  id: string;
  project_id: string;
  summary_type: string;
  content: ProcurementSummary;
  created_at: string;
}

export interface ProcurementSummary {
  overall_assessment: string;
  cheapest_vendor?: {
    vendor_name: string;
    total_amount: number;
    savings_pct: number;
  };
  best_delivery_vendor?: {
    vendor_name: string;
    avg_delivery_days: number;
  };
  risk_flags: {
    vendor_name: string;
    risk_type: string;
    description: string;
    severity: 'low' | 'medium' | 'high';
  }[];
  missing_sections: {
    vendor_name: string;
    missing_items: string[];
  }[];
  recommendations: {
    priority: number;
    recommendation: string;
    rationale: string;
  }[];
  vendor_rankings: {
    rank: number;
    vendor_name: string;
    score: number;
    strengths: string[];
    weaknesses: string[];
  }[];
  summary_text: string;
}

export interface NegotiationEmail {
  subject: string;
  body: string;
  key_points: string[];
  tone: string;
  follow_up_date: string;
}

// ============================================
// API Response Types
// ============================================

export interface ApiResponse<T> {
  data: T;
  count?: number;
  message?: string;
}

export interface ProcessingResult {
  status: string;
  items_count: number;
  page_count: number;
  vendor_info_extracted: boolean;
}

export interface ProcessAllResult {
  processed: number;
  failed: number;
  errors: { quotation_id: string; file_name: string; error: string }[];
}
