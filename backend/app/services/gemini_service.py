"""Gemini AI Service - Handles all AI-powered extraction and analysis."""

import google.generativeai as genai
import json
import logging
import re
import io
import asyncio
import httpx
from typing import Optional
from app.core.config import get_settings
from app.models.schemas import ExtractedQuotationData

# Force httpx default timeout to 10 minutes to prevent ANY google-generativeai read timeouts
try:
    httpx._config.DEFAULT_TIMEOUT_CONFIG = httpx.Timeout(600.0)
except Exception:
    pass

logger = logging.getLogger(__name__)
settings = get_settings()

# Configure Gemini
genai.configure(api_key=settings.GEMINI_API_KEY)


# Model constants
PRIMARY_MODEL = "gemini-2.5-flash-lite"
FALLBACK_MODEL = "gemini-2.5-flash"


async def _retry_with_backoff(func, max_retries=3, base_delay=2.0, fallback_func=None):
    """Retry with exponential backoff. On quota errors, try fallback_func if provided."""
    for attempt in range(max_retries):
        try:
            return await func() if asyncio.iscoroutinefunction(func) else func()
        except Exception as e:
            error_str = str(e).lower()
            is_quota = "429" in error_str or "quota" in error_str or "resource exhausted" in error_str
            is_retryable = is_quota or "timed out" in error_str or "timeout" in error_str

            # On quota error with a fallback available, switch immediately
            if is_quota and fallback_func is not None:
                logger.warning(f"Quota hit on primary model, switching to fallback: {str(e)[:100]}")
                try:
                    return await fallback_func() if asyncio.iscoroutinefunction(fallback_func) else fallback_func()
                except Exception as e2:
                    logger.error(f"Fallback also failed: {str(e2)[:100]}")
                    raise

            if is_retryable and attempt < max_retries - 1:
                delay = base_delay * (2 ** attempt)
                logger.warning(f"Retryable error (attempt {attempt + 1}/{max_retries}), retrying in {delay}s: {str(e)[:120]}")
                await asyncio.sleep(delay)
                continue
            else:
                if is_retryable:
                    logger.error(f"Failed after {max_retries} retries: {str(e)[:120]}")
                raise
    return None


class GeminiService:
    """AI service using Google Gemini for quotation analysis."""

    def __init__(self):
        self.model = genai.GenerativeModel(PRIMARY_MODEL)
        self.fallback_model = genai.GenerativeModel(FALLBACK_MODEL)

    def _clean_json_response(self, text: str) -> str:
        """Clean markdown code blocks from Gemini response."""
        text = text.strip()
        if text.startswith("```json"):
            text = text[7:]
        elif text.startswith("```"):
            text = text[3:]
        if text.endswith("```"):
            text = text[:-3]
        return text.strip()

    async def extract_quotation_data(self, text: str) -> ExtractedQuotationData:
        """Extract structured quotation data from raw text using Gemini."""
        prompt = f"""You are a procurement data extraction specialist. Extract structured quotation data from the following document text.

IMPORTANT RULES:
1. Extract ALL line items with their details
2. Normalize item names to standard format (e.g., "MS Sheet 2mm" and "Mild Steel Sheet 2 MM" should both become "Mild Steel Sheet 2mm")
3. Convert all prices to numeric values (remove currency symbols)
4. If a field is not found, use null
5. Parse dates in ISO format
6. Extract tax rates as percentages
7. If a price is given for a quantity other than 1, you MUST calculate the price for a single unit and set it as `unit_price`. Store the provided quantity in `quantity`. Ensure `total_price` = `unit_price` * `quantity`.

Return ONLY a valid JSON object with this exact structure:
{{
    "vendor_name": "string or null",
    "vendor_address": "string or null",
    "vendor_contact": "string or null",
    "vendor_email": "string or null",
    "vendor_phone": "string or null",
    "vendor_gst": "string or null",
    "quotation_number": "string or null",
    "quotation_date": "string or null",
    "validity_period": "string or null",
    "payment_terms": "string or null",
    "delivery_terms": "string or null",
    "delivery_days": "integer or null",
    "warranty_info": "string or null",
    "items": [
        {{
            "item_name": "string (normalized name)",
            "description": "string or null",
            "quantity": "number or null",
            "unit": "string or null (e.g., 'pcs', 'kg', 'nos', 'sqm')",
            "unit_price": "number or null",
            "total_price": "number or null",
            "tax_rate": "number or null (percentage)",
            "tax_amount": "number or null",
            "discount_rate": "number or null (percentage)",
            "discount_amount": "number or null",
            "hsn_code": "string or null"
        }}
    ],
    "subtotal": "number or null",
    "total_tax": "number or null",
    "grand_total": "number or null",
    "notes": "string or null"
}}

DOCUMENT TEXT:
---
{text[:15000]}
---

Return ONLY the JSON object, no markdown formatting or additional text."""

        try:
            logger.info("Gemini API call: extract_quotation_data starting, text length=%s", len(text))

            async def call_gemini():
                return self.model.generate_content(prompt, request_options={"timeout": 600})

            async def call_gemini_fallback():
                return self.fallback_model.generate_content(prompt, request_options={"timeout": 600})

            response = await _retry_with_backoff(call_gemini, fallback_func=call_gemini_fallback)
            logger.info("Gemini API call: extract_quotation_data returned response length=%s", len(response.text or ""))
            cleaned = self._clean_json_response(response.text)
            data = json.loads(cleaned)
            extracted = ExtractedQuotationData(**data)
            logger.info("Gemini API call: extract_quotation_data completed, items=%s", len(extracted.items))
            return extracted
        except json.JSONDecodeError as e:
            logger.error(f"Failed to parse Gemini response as JSON: {e}")
            logger.error(f"Raw response: {response.text[:500] if response else 'No response'}")
            if response:
                json_match = re.search(r'\{.*\}', response.text, re.DOTALL)
                if json_match:
                    data = json.loads(json_match.group())
                    return ExtractedQuotationData(**data)
            raise ValueError("Failed to extract structured data from quotation")
        except Exception as e:
            logger.error(f"Gemini extraction failed: {str(e)}")
            raise

    async def extract_quotation_data_from_pdf(self, file_bytes: bytes, quotation_id: str | None = None) -> ExtractedQuotationData:
        """Extract structured quotation data directly from a PDF via Gemini file upload."""
        try:
            logger.info("Gemini PDF fallback starting for quotation_id=%s", quotation_id)
            file_obj = io.BytesIO(file_bytes)

            async def upload_file_with_retry():
                # Re-seek the file object before each upload attempt
                file_obj.seek(0)
                return genai.upload_file(
                    file_obj,
                    mime_type="application/pdf",
                    display_name="quotation.pdf"
                )

            logger.info("Starting genai.upload_file...")
            uploaded_file = await _retry_with_backoff(upload_file_with_retry)
            logger.info(f"File uploaded successfully: {uploaded_file.uri if uploaded_file else 'None'}. Now starting generate_content...")

            prompt = f"""You are a procurement data extraction specialist. Extract structured quotation data from the uploaded PDF document.

IMPORTANT RULES:
1. Extract ALL line items with their details
2. Normalize item names to standard format
3. Convert all prices to numeric values (remove currency symbols)
4. If a field is not found, use null
5. Parse dates in ISO format
6. Extract tax rates as percentages
7. If a price is given for a quantity other than 1, you MUST calculate the price for a single unit and set it as `unit_price`. Store the provided quantity in `quantity`. Ensure `total_price` = `unit_price` * `quantity`.

Return ONLY a valid JSON object with this exact structure:
{{
    "vendor_name": "string or null",
    "vendor_address": "string or null",
    "vendor_contact": "string or null",
    "vendor_email": "string or null",
    "vendor_phone": "string or null",
    "vendor_gst": "string or null",
    "quotation_number": "string or null",
    "quotation_date": "string or null",
    "validity_period": "string or null",
    "payment_terms": "string or null",
    "delivery_terms": "string or null",
    "delivery_days": "integer or null",
    "warranty_info": "string or null",
    "items": [
        {{
            "item_name": "string (normalized name)",
            "description": "string or null",
            "quantity": "number or null",
            "unit": "string or null (e.g., 'pcs', 'kg', 'nos', 'sqm')",
            "unit_price": "number or null",
            "total_price": "number or null",
            "tax_rate": "number or null (percentage)",
            "tax_amount": "number or null",
            "discount_rate": "number or null (percentage)",
            "discount_amount": "number or null",
            "hsn_code": "string or null"
        }}
    ],
    "subtotal": "number or null",
    "total_tax": "number or null",
    "grand_total": "number or null",
    "notes": "string or null"
}}

Uploaded file: quotation.pdf

Return ONLY the JSON object, no markdown formatting or additional text."""

            async def call_gemini_pdf():
                logger.info("Inside call_gemini_pdf...")
                return self.model.generate_content([prompt, uploaded_file], request_options={"timeout": 600.0})

            async def call_gemini_pdf_fallback():
                logger.info("Inside call_gemini_pdf_fallback...")
                return self.fallback_model.generate_content([prompt, uploaded_file], request_options={"timeout": 600.0})

            response = await _retry_with_backoff(call_gemini_pdf, fallback_func=call_gemini_pdf_fallback)
            logger.info("Gemini PDF fallback returned response length=%s", len(response.text or ""))
            cleaned = self._clean_json_response(response.text)
            data = json.loads(cleaned)
            extracted = ExtractedQuotationData(**data)
            logger.info("Gemini PDF fallback completed, items=%s", len(extracted.items))
            return extracted
        except json.JSONDecodeError as e:
            logger.error(f"Failed to parse Gemini PDF response as JSON: {e}")
            logger.error(f"Raw PDF response: {response.text[:500]}")
            json_match = re.search(r'\{.*\}', response.text, re.DOTALL)
            if json_match:
                data = json.loads(json_match.group())
                return ExtractedQuotationData(**data)
            raise ValueError("Failed to extract structured data from PDF via Gemini")
        except Exception as e:
            raise

    async def normalize_item_names(self, items: list[str]) -> dict[str, str]:
        """Normalize item names using Gemini to handle abbreviations like MS vs Mild Steel."""
        if not items:
            return {}

        prompt = f"""You are a procurement catalog expert. Group the following raw item names into standardized canonical names.
Expand abbreviations (e.g., 'MS' -> 'Mild Steel', 'GI' -> 'Galvanized Iron').
Ignore minor dimensional variations if they refer to the same base item type, but DO keep distinct items separate.

RAW NAMES:
{json.dumps(items, indent=2)}

Return ONLY a flat JSON dictionary mapping EXACT raw names to a standardized name.
Example: {{"MS Square Pipe": "Mild Steel Square Pipe", "Mild Steel Square Pipe 40x40x2mm": "Mild Steel Square Pipe"}}
Do not include any markdown, just the JSON dictionary.
"""
        try:
            async def call_gemini_norm():
                return self.model.generate_content(prompt, request_options={"timeout": 60.0})

            async def call_gemini_norm_fallback():
                return self.fallback_model.generate_content(prompt, request_options={"timeout": 60.0})

            response = await _retry_with_backoff(call_gemini_norm, fallback_func=call_gemini_norm_fallback)
            cleaned = self._clean_json_response(response.text)
            return json.loads(cleaned)
        except Exception as e:
            logger.error(f"Item normalization failed: {str(e)}")
            # Fallback: return identity map
            return {item: item for item in items}

    async def generate_procurement_summary(self, comparison_data: dict) -> dict:
        """Generate AI procurement insights from comparison data."""
        prompt = f"""You are a senior procurement analyst. Analyze this vendor comparison data and provide procurement insights.

COMPARISON DATA:
{json.dumps(comparison_data, indent=2)}

Generate a comprehensive procurement analysis with this JSON structure:
{{
    "overall_assessment": "Brief overall assessment paragraph",
    "cheapest_vendor": {{
        "vendor_name": "string",
        "total_amount": "number",
        "savings_pct": "number (vs average)"
    }},
    "best_delivery_vendor": {{
        "vendor_name": "string",
        "avg_delivery_days": "number"
    }},
    "risk_flags": [
        {{
            "vendor_name": "string",
            "risk_type": "string (e.g., 'missing_warranty', 'no_delivery_commitment', 'abnormal_pricing')",
            "description": "string",
            "severity": "string (low/medium/high)"
        }}
    ],
    "missing_sections": [
        {{
            "vendor_name": "string",
            "missing_items": ["list of missing item names"]
        }}
    ],
    "recommendations": [
        {{
            "priority": "number (1-5)",
            "recommendation": "string",
            "rationale": "string"
        }}
    ],
    "vendor_rankings": [
        {{
            "rank": "number",
            "vendor_name": "string",
            "score": "number (0-100)",
            "max_score": "number (always 100)",
            "score_breakdown": [
                {{
                    "category": "string (e.g., 'Pricing', 'Delivery Timelines', 'Terms & Conditions')",
                    "score": "number",
                    "max_score": "number"
                }}
            ],
            "strengths": ["list"],
            "weaknesses": ["list"]
        }}
    ],
    "summary_text": "A 2-3 paragraph executive summary suitable for management review"
}}

Return ONLY the JSON object."""

        try:
            logger.info("Gemini API call: generate_procurement_summary starting, vendors=%s, items=%s", len(comparison_data.get("vendors", [])), len(comparison_data.get("items", [])))

            async def call_gemini_summary():
                return self.model.generate_content(prompt, request_options={"timeout": 600})

            async def call_gemini_summary_fallback():
                return self.fallback_model.generate_content(prompt, request_options={"timeout": 600})

            response = await _retry_with_backoff(call_gemini_summary, fallback_func=call_gemini_summary_fallback)
            logger.info("Gemini API call: generate_procurement_summary returned response length=%s", len(response.text or ""))
            cleaned = self._clean_json_response(response.text)
            summary = json.loads(cleaned)
            logger.info("Gemini API call: generate_procurement_summary completed")
            return summary
        except Exception as e:
            logger.error(f"Procurement summary generation failed: {str(e)}")
            raise

    async def generate_negotiation_email(
        self,
        vendor_data: dict,
        email_type: str,
        comparison_context: dict,
        custom_context: Optional[str] = None
    ) -> dict:
        """Generate professional negotiation emails."""
        type_instructions = {
            "revised_pricing": "Write a professional email requesting revised pricing from the vendor. Reference specific items where their pricing is higher than competitors (without naming competitors). Be diplomatic but firm.",
            "missing_details": "Write a professional email requesting missing quotation details from the vendor. List specifically what information is needed.",
            "delivery_negotiation": "Write a professional email negotiating better delivery timelines. Reference the project requirements and suggest specific improvements."
        }

        instruction = type_instructions.get(email_type, type_instructions["revised_pricing"])

        prompt = f"""You are a procurement professional writing business correspondence.

{instruction}

VENDOR INFORMATION:
{json.dumps(vendor_data, indent=2)}

COMPARISON CONTEXT:
{json.dumps(comparison_context, indent=2)}

{f"ADDITIONAL CONTEXT: {custom_context}" if custom_context else ""}

Generate the email with this JSON structure:
{{
    "subject": "Email subject line",
    "body": "Complete email body with proper greeting, content, and sign-off",
    "key_points": ["List of key negotiation points"],
    "tone": "professional/firm/collaborative",
    "follow_up_date": "Suggested follow-up date (e.g., '5 business days')"
}}

Return ONLY the JSON object."""

        try:
            logger.info("Gemini API call: generate_negotiation_email starting, vendor_id=%s, email_type=%s", vendor_data.get("id"), email_type)

            async def call_gemini_email():
                return self.model.generate_content(prompt)

            response = await _retry_with_backoff(call_gemini_email)
            logger.info("Gemini API call: generate_negotiation_email returned response length=%s", len(response.text or ""))
            cleaned = self._clean_json_response(response.text)
            email_result = json.loads(cleaned)
            logger.info("Gemini API call: generate_negotiation_email completed")
            return email_result
        except Exception as e:
            logger.error(f"Negotiation email generation failed: {str(e)}")
            raise

    async def detect_anomalies(self, items_data: list[dict]) -> list[dict]:
        """Detect pricing anomalies and inconsistencies."""
        prompt = f"""You are a procurement auditor. Analyze these quotation items for anomalies.

ITEMS DATA:
{json.dumps(items_data, indent=2)}

Check for:
1. Abnormal pricing (significantly higher or lower than others)
2. Quantity mismatches between vendors for the same item
3. Missing specifications
4. Unusual tax rates
5. Inconsistent units of measurement

Return a JSON array of anomalies:
[
    {{
        "item_name": "string",
        "vendor_name": "string",
        "anomaly_type": "string",
        "description": "string",
        "severity": "low/medium/high",
        "suggested_action": "string"
    }}
]

Return ONLY the JSON array. If no anomalies found, return an empty array []."""

        try:
            async def call_gemini_anomalies():
                return self.model.generate_content(prompt, request_options={"timeout": 600})

            async def call_gemini_anomalies_fallback():
                return self.fallback_model.generate_content(prompt, request_options={"timeout": 600})

            response = await _retry_with_backoff(call_gemini_anomalies, fallback_func=call_gemini_anomalies_fallback)
            cleaned = self._clean_json_response(response.text)
            return json.loads(cleaned)
        except Exception as e:
            logger.error(f"Anomaly detection failed: {str(e)}")
            return []

    async def generate_vendor_intelligence(self, vendor_name: str) -> dict:
        """Use Gemini to research a vendor online and return an intelligence profile."""
        prompt = f"""You are a corporate researcher. Search the internet and use your knowledge to provide a comprehensive vendor intelligence profile for: '{vendor_name}'.
Look for their reputation, customer reviews, market presence, and any red flags.

Return ONLY a JSON object with this exact structure:
{{
    "vendor_name": "{vendor_name}",
    "online_rating": "number (e.g., 4.5) or null if not found",
    "market_presence": "string (a brief summary of their industry standing)",
    "public_sentiment": "string (overall vibe of online reviews)",
    "key_reviews": [
        "list of 2-4 brief, summarized reviews or sentiments found online"
    ],
    "red_flags_found": [
        "list of any public warnings, legal issues, or consistent complaints found online. Leave empty if none."
    ],
    "research_summary": "A 1-2 paragraph conclusion on whether they are a reliable supplier based on public data."
}}

Return ONLY the JSON object. Do not include markdown formatting or extra text."""

        try:
            logger.info("Gemini API call: generate_vendor_intelligence starting for vendor=%s", vendor_name)

            async def call_gemini_intelligence():
                return self.model.generate_content(prompt, request_options={"timeout": 600})

            async def call_gemini_intelligence_fallback():
                return self.fallback_model.generate_content(prompt, request_options={"timeout": 600})

            response = await _retry_with_backoff(call_gemini_intelligence, fallback_func=call_gemini_intelligence_fallback)
            cleaned = self._clean_json_response(response.text)
            return json.loads(cleaned)
        except Exception as e:
            logger.error(f"Vendor intelligence generation failed for {vendor_name}: {str(e)}")
            return {
                "vendor_name": vendor_name,
                "online_rating": None,
                "market_presence": "Information not readily available.",
                "public_sentiment": "Unknown",
                "key_reviews": ["Could not retrieve online reviews at this time."],
                "red_flags_found": [],
                "research_summary": f"Automated online research for '{vendor_name}' could not be completed successfully. Please conduct manual due diligence."
            }
