from config.database import db
from .utils import (
    days_between, EPSILON, SPIKE_RATIO_THRESHOLD,
    now_utc, to_iso, COL_CONSUMPTION_STATS
)


class ConsumptionService:

    @staticmethod
    async def apply_delivery_accepted(customer_id: str, delivery: dict) -> list:
        """MODEL B: Update base consumption when delivery is accepted."""
        updated_stats = []
        delivery_id = delivery["id"]
        accepted_at = delivery["accepted_at"]

        for item in delivery["items"]:
            product_id = item["product_id"]
            qty = item["qty"]

            stats = await db[COL_CONSUMPTION_STATS].find_one(
                {"customer_id": customer_id, "product_id": product_id}, {"_id": 0}
            )

            if stats is None:
                doc = {
                    "customer_id": customer_id,
                    "product_id": product_id,
                    "base": {
                        "daily_avg": 0,
                        "last_delivery": {"delivery_id": delivery_id, "qty": qty, "at": to_iso(accepted_at)},
                        "prev_delivery": None,
                    },
                    "stock": {"last_decl": None},
                    "spike": None,
                    "created_at": to_iso(now_utc()),
                    "updated_at": to_iso(now_utc()),
                }
                await db[COL_CONSUMPTION_STATS].insert_one(doc)
                doc.pop("_id", None)
                updated_stats.append(doc)
            else:
                last_del = stats["base"].get("last_delivery")
                upd = {"spike": None, "updated_at": to_iso(now_utc())}

                if last_del:
                    dt = days_between(last_del["at"], accepted_at)
                    upd["base.daily_avg"] = last_del["qty"] / dt
                    upd["base.prev_delivery"] = last_del

                upd["base.last_delivery"] = {
                    "delivery_id": delivery_id, "qty": qty, "at": to_iso(accepted_at)
                }

                await db[COL_CONSUMPTION_STATS].update_one(
                    {"customer_id": customer_id, "product_id": product_id}, {"$set": upd}
                )
                fresh = await db[COL_CONSUMPTION_STATS].find_one(
                    {"customer_id": customer_id, "product_id": product_id}, {"_id": 0}
                )
                updated_stats.append(fresh)

        return updated_stats

    @staticmethod
    async def apply_stock_declaration(customer_id: str, stock_decl: dict) -> tuple:
        """Update stock info and check for spikes. Returns (updated_stats, spike_events)."""
        updated_stats = []
        spike_events = []
        sdid = stock_decl["id"]
        declared_at = stock_decl["declared_at"]

        for item in stock_decl["items"]:
            pid = item["product_id"]
            dqty = item["qty"]

            stats = await db[COL_CONSUMPTION_STATS].find_one(
                {"customer_id": customer_id, "product_id": pid}, {"_id": 0}
            )

            decl_obj = {"stock_decl_id": sdid, "qty": dqty, "at": to_iso(declared_at)}

            if stats is None:
                doc = {
                    "customer_id": customer_id,
                    "product_id": pid,
                    "base": {"daily_avg": 0, "last_delivery": None, "prev_delivery": None},
                    "stock": {"last_decl": decl_obj},
                    "spike": None,
                    "created_at": to_iso(now_utc()),
                    "updated_at": to_iso(now_utc()),
                }
                await db[COL_CONSUMPTION_STATS].insert_one(doc)
                doc.pop("_id", None)
                updated_stats.append(doc)
                continue

            upd = {"stock.last_decl": decl_obj, "updated_at": to_iso(now_utc())}

            last_del = stats["base"].get("last_delivery")
            base_avg = stats["base"].get("daily_avg", 0)

            if last_del and base_avg > 0:
                dt = days_between(last_del["at"], declared_at)
                observed_consumed = max(last_del["qty"] - dqty, 0)
                observed_daily = observed_consumed / dt
                safe_base = max(base_avg, EPSILON)
                ratio = observed_daily / safe_base

                if ratio >= SPIKE_RATIO_THRESHOLD:
                    upd["spike"] = {
                        "active": True,
                        "daily_avg": observed_daily,
                        "ratio": ratio,
                        "consumed": observed_consumed,
                        "window_days": dt,
                        "detected_at": to_iso(declared_at),
                        "source_stock_decl_id": sdid,
                    }
                    spike_events.append({
                        "customer_id": customer_id,
                        "product_id": pid,
                        "spike_ratio": ratio,
                        "observed_daily": observed_daily,
                        "base_avg": base_avg,
                        "stock_decl_id": sdid,
                    })

            await db[COL_CONSUMPTION_STATS].update_one(
                {"customer_id": customer_id, "product_id": pid}, {"$set": upd}
            )
            fresh = await db[COL_CONSUMPTION_STATS].find_one(
                {"customer_id": customer_id, "product_id": pid}, {"_id": 0}
            )
            updated_stats.append(fresh)

        return updated_stats, spike_events
