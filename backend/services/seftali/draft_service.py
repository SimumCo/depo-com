from config.database import db
from .utils import (
    EPSILON, SPIKE_RECENCY_DAYS, now_utc, to_iso, parse_iso,
    days_to_next_route, COL_CUSTOMERS, COL_PRODUCTS,
    COL_CONSUMPTION_STATS, COL_SYSTEM_DRAFTS
)
from datetime import timedelta


class DraftService:

    @staticmethod
    async def update_draft_for_customer(customer_id: str, changed_product_ids: list, source: str):
        customer = await db[COL_CUSTOMERS].find_one({"id": customer_id}, {"_id": 0})
        if not customer:
            return None

        route_days = customer.get("route_plan", {}).get("days", [])
        nrd = days_to_next_route(route_days)
        now = now_utc()

        cursor = db[COL_CONSUMPTION_STATS].find({"customer_id": customer_id}, {"_id": 0})
        all_stats = await cursor.to_list(length=1000)

        items = []
        for st in all_stats:
            pid = st["product_id"]
            base_avg = st["base"].get("daily_avg", 0)
            spike = st.get("spike")

            avg_eff = base_avg
            avg_type = "base"
            if spike and spike.get("active"):
                det = parse_iso(spike["detected_at"])
                if (now - det).days <= SPIKE_RECENCY_DAYS:
                    avg_eff = spike["daily_avg"]
                    avg_type = "spike"

            last_decl = (st.get("stock") or {}).get("last_decl")
            last_del = st["base"].get("last_delivery")
            stock_eff = 0
            if last_decl:
                stock_eff = last_decl["qty"]
            elif last_del:
                stock_eff = last_del["qty"]

            if avg_eff > EPSILON:
                d2z = stock_eff / avg_eff
                est_finish = now + timedelta(days=d2z)
            else:
                d2z = 999
                est_finish = now + timedelta(days=999)

            risk = nrd - d2z
            suggested = round(avg_eff * nrd) if avg_eff > EPSILON else 0

            product = await db[COL_PRODUCTS].find_one({"id": pid}, {"_id": 0})
            skt_risk = False
            if product and product.get("shelf_life_days") and suggested > 0:
                days_supply = suggested / max(avg_eff, EPSILON)
                if days_supply > product["shelf_life_days"]:
                    skt_risk = True

            items.append({
                "product_id": pid,
                "priority_rank": 0,
                "suggested_qty": suggested,
                "avg_effective_used": avg_type,
                "stock_effective_used": stock_eff,
                "estimated_finish_at": to_iso(est_finish),
                "risk_score": risk,
                "flags": {"skt_risk": skt_risk},
            })

        items.sort(key=lambda x: (x["risk_score"], x["estimated_finish_at"], x["product_id"]))
        for i, it in enumerate(items):
            it["priority_rank"] = i + 1

        draft = {
            "customer_id": customer_id,
            "generated_from": source,
            "items": items,
            "updated_at": to_iso(now),
        }
        await db[COL_SYSTEM_DRAFTS].update_one(
            {"customer_id": customer_id},
            {"$set": draft, "$setOnInsert": {"created_at": to_iso(now)}},
            upsert=True,
        )
        return draft
