from config.database import db
from .utils import gen_id, now_utc, to_iso, COL_VARIANCE_EVENTS


class VarianceService:

    @staticmethod
    async def create_variance_for_spike(
        customer_id: str,
        product_id: str,
        stock_decl_id: str,
        spike_ratio: float,
        observed_daily: float,
        base_avg: float,
    ):
        """Create a variance event for a spike. Idempotent via unique index."""
        existing = await db[COL_VARIANCE_EVENTS].find_one(
            {
                "trigger.type": "stock_decl_spike",
                "trigger.ref_id": stock_decl_id,
                "product_id": product_id,
            },
            {"_id": 0},
        )
        if existing:
            return existing

        change_ratio = (observed_daily - base_avg) / base_avg if base_avg > 0 else 0
        doc = {
            "id": gen_id(),
            "customer_id": customer_id,
            "product_id": product_id,
            "detected_at": to_iso(now_utc()),
            "trigger": {"type": "stock_decl_spike", "ref_id": stock_decl_id},
            "change_ratio": change_ratio,
            "direction": "increase",
            "severity": "major",
            "status": "needs_reason",
            "reason_code": None,
            "reason_note": None,
            "customer_action_at": None,
            "created_at": to_iso(now_utc()),
            "updated_at": to_iso(now_utc()),
        }
        await db[COL_VARIANCE_EVENTS].insert_one(doc)
        doc.pop("_id", None)
        return doc
