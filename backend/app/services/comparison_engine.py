"""Comparison Engine - Generates vendor comparison tables and analysis."""

import logging
from typing import Optional
from app.core.supabase import get_supabase
from app.services.gemini_service import GeminiService

logger = logging.getLogger(__name__)


class ComparisonEngine:
    """Engine for comparing vendor quotations."""

    def __init__(self):
        self.supabase = get_supabase()
        self.ai = GeminiService()

    async def generate_comparison(self, project_id: str) -> list[dict]:
        """Generate comparison results for all items across vendors."""
        # Fetch all extracted items for the project
        items_result = self.supabase.table("extracted_items").select(
            "*, vendors(name)"
        ).eq("project_id", project_id).execute()

        items = items_result.data
        if not items:
            return []

        # Fetch vendors
        vendors_result = self.supabase.table("vendors").select("*").eq(
            "project_id", project_id
        ).execute()
        vendors = {v["id"]: v for v in vendors_result.data}

        # Group items by normalized name
        item_groups: dict[str, list] = {}
        for item in items:
            key = (item.get("normalized_name") or item["item_name"]).lower().strip()
            if key not in item_groups:
                item_groups[key] = []
            item_groups[key].append(item)

        # Normalize names using AI if needed
        all_items_for_normalization = [
            {
                "item_name": item["item_name"],
                "description": item.get("description"),
                "quantity": item.get("quantity"),
                "vendor_name": vendors.get(item["vendor_id"], {}).get("name", "Unknown"),
                "vendor_id": item["vendor_id"]
            }
            for item in items
        ]

        try:
            logger.info("Calling Gemini normalization for project_id=%s with %s items", project_id, len(all_items_for_normalization))
            normalized = await self.ai.normalize_item_names(all_items_for_normalization)
            logger.info("Gemini normalization completed for project_id=%s", project_id)
            # Rebuild groups with normalized names
            name_map = {}
            for norm_item in normalized:
                name_map[
                    f"{norm_item.get('vendor_id', '')}_{norm_item.get('item_name', '')}"
                ] = norm_item.get("normalized_name", norm_item.get("item_name"))
        except Exception:
            name_map = {}

        # Re-group with normalized names
        if name_map:
            item_groups = {}
            for item in items:
                key_lookup = f"{item['vendor_id']}_{item['item_name']}"
                normalized_name = name_map.get(key_lookup, item.get("normalized_name") or item["item_name"])
                key = normalized_name.lower().strip()
                if key not in item_groups:
                    item_groups[key] = []
                item_groups[key].append({**item, "normalized_name": normalized_name})

        # Generate comparison results
        comparison_results = []
        vendor_ids = set(v["id"] for v in vendors_result.data)

        for normalized_name, group_items in item_groups.items():
            display_name = group_items[0].get("normalized_name") or group_items[0]["item_name"]

            # Build vendor prices
            vendor_prices = {}
            item_variants = []
            present_vendor_ids = set()

            for item in group_items:
                vid = item["vendor_id"]
                vname = vendors.get(vid, {}).get("name", "Unknown")
                present_vendor_ids.add(vid)

                u_price = item.get("unit_price")
                t_price = item.get("total_price")
                qty = item.get("quantity")

                if u_price is None and t_price is not None and qty is not None and qty > 0:
                    u_price = round(t_price / qty, 2)
                elif u_price is not None and t_price is None and qty is not None:
                    t_price = round(u_price * qty, 2)

                vendor_prices[vid] = {
                    "vendor_name": vname,
                    "vendor_id": vid,
                    "unit_price": u_price,
                    "total_price": t_price,
                    "quantity": qty,
                    "unit": item.get("unit"),
                    "tax_rate": item.get("tax_rate"),
                    "delivery_days": item.get("delivery_days"),
                    "warranty_info": item.get("warranty_info"),
                    "payment_terms": item.get("payment_terms")
                }

                item_variants.append({
                    "original_name": item["item_name"],
                    "vendor_name": vname,
                    "vendor_id": vid
                })

            # Find lowest/highest
            prices = [
                (vid, vp.get("unit_price") or vp.get("total_price") or 0)
                for vid, vp in vendor_prices.items()
                if (vp.get("unit_price") or vp.get("total_price"))
            ]

            lowest_vendor_id = None
            lowest_price = None
            highest_price = None
            price_diff_pct = None

            if prices:
                prices.sort(key=lambda x: x[1])
                lowest_vendor_id = prices[0][0]
                lowest_price = prices[0][1]
                highest_price = prices[-1][1]
                if lowest_price and lowest_price > 0:
                    price_diff_pct = round(
                        ((highest_price - lowest_price) / lowest_price) * 100, 2
                    )

            # Detect missing vendors
            missing_vendors = list(vendor_ids - present_vendor_ids)

            # Check quantity mismatch
            quantities = [
                item.get("quantity")
                for item in group_items
                if item.get("quantity") is not None
            ]
            quantity_mismatch = len(set(quantities)) > 1 if len(quantities) > 1 else False

            # Build anomaly flags
            anomaly_flags = []
            if quantity_mismatch:
                anomaly_flags.append({
                    "type": "quantity_mismatch",
                    "message": f"Quantity varies across vendors: {quantities}"
                })
            if price_diff_pct and price_diff_pct > 30:
                anomaly_flags.append({
                    "type": "high_price_variance",
                    "message": f"Price difference of {price_diff_pct}% detected"
                })
            if missing_vendors:
                missing_names = [vendors.get(vid, {}).get("name", vid) for vid in missing_vendors]
                anomaly_flags.append({
                    "type": "missing_vendors",
                    "message": f"Not quoted by: {', '.join(missing_names)}"
                })

            result = {
                "project_id": project_id,
                "normalized_item_name": display_name,
                "item_variants": item_variants,
                "vendor_prices": vendor_prices,
                "lowest_vendor_id": lowest_vendor_id,
                "lowest_price": lowest_price,
                "highest_price": highest_price,
                "price_difference_pct": price_diff_pct,
                "quantity_mismatch": quantity_mismatch,
                "missing_vendors": missing_vendors,
                "anomaly_flags": anomaly_flags,
                "remarks": None
            }

            comparison_results.append(result)

        # Store results in database
        # First clear existing results
        self.supabase.table("comparison_results").delete().eq(
            "project_id", project_id
        ).execute()

        # Insert new results
        for result in comparison_results:
            self.supabase.table("comparison_results").insert(result).execute()

        # Update project status and total spend
        total_spend = sum(
            min(
                (vp.get("total_price") or vp.get("unit_price") or 0)
                for vp in r["vendor_prices"].values()
            ) if r["vendor_prices"] else 0
            for r in comparison_results
        )

        self.supabase.table("projects").update({
            "status": "compared",
            "total_estimated_spend": total_spend
        }).eq("id", project_id).execute()

        return comparison_results
