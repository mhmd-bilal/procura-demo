"""Gemini AI Service - Handles all AI-powered extraction and analysis."""

import google.generativeai as genai
import json
import logging
import re
import io
import asyncio
from typing import Optional
from app.core.config import get_settings
from app.models.schemas import ExtractedQuotationData
from google.api_core import gapic_v1
from google.rpc import error_details_pb2

logger = logging.getLogger(__name__)
settings = get_settings()

# Configure Gemini
genai.configure(api_key=settings.GEMINI_API_KEY)


async def _retry_with_backoff(func, max_retries=3, base_delay=2.0):
    """Retry a function with exponential backoff, handling 429 errors gracefully."""
    for attempt in range(max_retries):
        try:
            return await func() if asyncio.iscoroutinefunction(func) else func()
        except Exception as e:
            error_str = str(e)
            # Check if it's a quota error (429)
            if "429" in error_str or "quota" in error_str.lower():
                if attempt < max_retries - 1:
                    # Extract retry delay from error if available
                    delay = base_delay * (2 ** attempt)  # Exponential backoff: 2s, 4s, 8s
                    logger.warning(f"Rate limited (429). Retrying in {delay}s... (Attempt {attempt + 1}/{max_retries})")
                    await asyncio.sleep(delay)
                    continue
                else:
                    logger.error(f"Rate limit exceeded after {max_retries} retries. Giving up.")
                    raise
            else:
                # Not a rate limit error, raise immediately
                raise
    return None


class GeminiService:
    """AI service using Google Gemini for quotation analysis."""

    def __init__(self):
        self.model = genai.GenerativeModel(settings.GEMINI_MODEL)

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
                return self.model.generate_content(prompt, request_options={"timeout": 300})
            
            response = await _retry_with_backoff(call_gemini)
            logger.info("Gemini API call: extract_quotation_data returned response length=%s", len(response.text or ""))
            cleaned = self._clean_json_response(response.text)
            data = json.loads(cleaned)
            extracted = ExtractedQuotationData(**data)
            logger.info("Gemini API call: extract_quotation_data completed, items=%s", len(extracted.items))
            return extracted
        except json.JSONDecodeError as e:
            logger.error(f"Failed to parse Gemini response as JSON: {e}")
            logger.error(f"Raw response: {response.text[:500] if response else 'No response'}")
            # Try to extract JSON from response
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
                return genai.upload_file(
                    file_obj,
                    mime_type="application/pdf",
                    display_name="quotation.pdf"
                )
            
            uploaded_file = await _retry_with_backoff(upload_file_with_retry)

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
                return self.model.generate_content([prompt, uploaded_file], request_options={"timeout": 300})
            
            response = await _retry_with_backoff(call_gemini_pdf)
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
            logger.error(f"Gemini PDF extraction failed: {str(e)}")
            raise

    async def normalize_item_names(self, items: list[dict]) -> list[dict]:
        """Normalize inconsistent item names across multiple vendors."""
        prompt = f"""You are a procurement data normalization specialist.

Given these items from different vendor quotations, normalize the item names so that equivalent items share the exact same normalized name.

Rules:
1. Items that refer to the same product should get the same normalized_name.
2. Use the item's 'description', 'item_name', and 'quantity' to accurately determine if they are the same product. Even if the 'item_name' is missing details (e.g. "Steel Square Pipe"), the 'description' often contains the specifications (e.g. "40x40x2mm").
3. Use standard industry terminology.
4. Include key specifications (dimensions, grade, etc.) in the normalized name.
5. Return the same list with an added "normalized_name" field.

Items:
{json.dumps(items, indent=2)}

Return ONLY a JSON array with each item having the original fields plus "normalized_name"."""

        try:
            logger.info("Gemini API call: normalize_item_names starting for %s items", len(items))
            
            async def call_gemini_normalize():
                return self.model.generate_content(prompt, request_options={"timeout": 300})
            
            response = await _retry_with_backoff(call_gemini_normalize)
            logger.info("Gemini API call: normalize_item_names returned response length=%s", len(response.text or ""))
            cleaned = self._clean_json_response(response.text)
            normalized = json.loads(cleaned)
            logger.info("Gemini API call: normalize_item_names completed")
            return normalized
        except Exception as e:
            logger.error(f"Item normalization failed: {str(e)}")
            # Fallback: use original names
            for item in items:
                item["normalized_name"] = item.get("item_name", "Unknown")
            return items

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
            
            # Use a different model specifically for summaries to spread the quota load
            summary_model = genai.GenerativeModel("gemini-3.1-flash-lite")
            
            async def call_gemini_summary():
                return summary_model.generate_content(prompt, request_options={"timeout": 300})
            
            response = await _retry_with_backoff(call_gemini_summary)
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
                return self.model.generate_content(prompt, request_options={"timeout": 300})
            
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
                return self.model.generate_content(prompt, request_options={"timeout": 300})
            
            response = await _retry_with_backoff(call_gemini_anomalies)
            cleaned = self._clean_json_response(response.text)
            return json.loads(cleaned)
        except Exception as e:
            logger.error(f"Anomaly detection failed: {str(e)}")
            return []

    async def generate_vendor_intelligence(self, vendor_name: str) -> dict:
        """Use Gemini (with Search Grounding) to research a vendor online and return an intelligence profile."""
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
            
            # Using gemini-3.1-flash-lite which has higher quota
            search_model = genai.GenerativeModel(
                model_name="gemini-3.1-flash-lite"
            )
            
            async def call_gemini_intelligence():
                return search_model.generate_content(prompt, request_options={"timeout": 300})
            
            response = await _retry_with_backoff(call_gemini_intelligence)
            cleaned = self._clean_json_response(response.text)
            return json.loads(cleaned)
        except Exception as e:
            logger.error(f"Vendor intelligence generation failed for {vendor_name}: {str(e)}")
            # Fallback response if search fails
            return {
                "vendor_name": vendor_name,
                "online_rating": None,
                "market_presence": "Information not readily available.",
                "public_sentiment": "Unknown",
                "key_reviews": ["Could not retrieve online reviews at this time."],
                "red_flags_found": [],
                "research_summary": f"Automated online research for '{vendor_name}' could not be completed successfully. Please conduct manual due diligence."
            }
