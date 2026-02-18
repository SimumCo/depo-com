"""Kalan 2 faturayı ekle (fatura 6 ve 7)."""
import asyncio, os, sys, uuid
from datetime import datetime, timezone
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from dotenv import load_dotenv
load_dotenv(Path(__file__).parent / ".env")
from motor.motor_asyncio import AsyncIOMotorClient

def gid(): return str(uuid.uuid4())
def iso(d): return datetime.strptime(d, "%d-%m-%Y").replace(tzinfo=timezone.utc).isoformat()
def now_iso(): return datetime.now(timezone.utc).isoformat()

INVOICES_67 = [
    {
        "invoice_no": "EA12025000002156",
        "date": "23-09-2025",
        "items": [
            ("180 ml KAKAOLU SUT 6LI", 12),
            ("180 ml CILEKLI UHT SUT", 27),
            ("180 ml YAGLI SUT 6LI", 4),
            ("200 ML AYRAN", 100),
            ("750 GR T.YAGLI YOGURT", 2),
            ("500 GR T.YAGLI YOGURT", 3),
            ("2000 ml AYRAN", 3),
            ("1000 ml AYRAN", 2),
            ("600 GR KASAR PEYNIRI", 1),
            ("400 GR KASAR PEYNIRI", 2),
            ("250 GR SUZME PEYNIR", 1),
            ("2000 GR TAM YAGLI TOST PEYNIRI", 1),
        ],
    },
    {
        "invoice_no": "EA12025000002224",
        "date": "30-09-2025",
        "items": [
            ("180 ml KAKAOLU SUT 6LI", 12),
            ("180 ml YAGLI SUT 6LI", 4),
            ("200 ML AYRAN", 80),
            ("1750 GR CIFTLIK YAGLI YOGURT", 2),
            ("750 GR T.YAGLI YOGURT", 3),
            ("500 GR T.YAGLI YOGURT", 2),
            ("1000 ml AYRAN", 2),
            ("600 GR KASAR PEYNIRI", 2),
            ("2000 ml AYRAN", 2),
        ],
    },
]

SHELF_LIFE = {"AYRAN": 21, "YOGURT": 28, "SUT": 90, "KREMA": 60, "PEYNIR": 180, "KASAR": 120}
def guess_sl(n):
    for k, v in SHELF_LIFE.items():
        if k in n.upper(): return v
    return None

async def main():
    client = AsyncIOMotorClient(os.environ["MONGO_URL"])
    db = client[os.environ["DB_NAME"]]

    from services.seftali.consumption_service import ConsumptionService
    from services.seftali.draft_service import DraftService
    from services.seftali.utils import COL_WORKING_COPIES, COL_AUDIT_EVENTS

    # Get customer
    customer = await db.sf_customers.find_one({"name": "AILEM MARKET GURBET DURMUS"}, {"_id": 0})
    if not customer:
        print("Musteri bulunamadi!"); client.close(); return
    cid = customer["id"]
    sales = await db.users.find_one({"username": "sf_satici"}, {"_id": 0})
    sid = sales["id"] if sales else "system"

    # Ensure products exist
    product_map = {}
    cursor = db.sf_products.find({}, {"_id": 0})
    for p in await cursor.to_list(500):
        product_map[p["name"]] = p["id"]

    all_names = set()
    for inv in INVOICES_67:
        for n, _ in inv["items"]:
            all_names.add(n)

    for pname in sorted(all_names):
        if pname not in product_map:
            pid = gid()
            code = pname.upper().replace(" ", "_").replace(".", "").replace("(", "").replace(")", "")[:30]
            await db.sf_products.insert_one({
                "id": pid, "code": code, "name": pname,
                "shelf_life_days": guess_sl(pname),
                "created_at": now_iso(), "updated_at": now_iso(),
            })
            product_map[pname] = pid
            print(f"  Yeni urun eklendi: {pname}")

    # Process invoices
    for idx, inv in enumerate(INVOICES_67):
        dlv_id = gid()
        delivered_at = iso(inv["date"])
        items = []
        for pname, qty in inv["items"]:
            pid = product_map.get(pname)
            if not pid:
                print(f"  UYARI: {pname} bulunamadi"); continue
            items.append({"product_id": pid, "qty": qty})

        await db.sf_deliveries.insert_one({
            "id": dlv_id, "customer_id": cid, "created_by_salesperson_id": sid,
            "delivery_type": "route", "delivered_at": delivered_at,
            "invoice_no": inv["invoice_no"], "acceptance_status": "accepted",
            "accepted_at": delivered_at, "rejected_at": None, "rejection_reason": None,
            "items": items, "created_at": delivered_at, "updated_at": delivered_at,
        })

        dlv_for_svc = {"id": dlv_id, "accepted_at": delivered_at, "items": items}
        stats = await ConsumptionService.apply_delivery_accepted(cid, dlv_for_svc)
        pids = [it["product_id"] for it in items]
        await DraftService.update_draft_for_customer(cid, pids, "delivery_accept")
        await db[COL_WORKING_COPIES].update_many(
            {"customer_id": cid, "status": "active"},
            {"$set": {"status": "deleted_by_delivery", "updated_at": delivered_at}}
        )

        print(f"\n  Fatura {idx+6}/7: {inv['invoice_no']} ({inv['date']})")
        print(f"    Urun sayisi: {len(items)}")
        for s in stats:
            ba = s.get("base", {}).get("daily_avg", 0)
            prod = await db.sf_products.find_one({"id": s["product_id"]}, {"_id": 0, "name": 1})
            pn = prod["name"] if prod else "?"
            print(f"    {pn:40s} daily_avg={ba:.2f}")

    # Final draft
    draft = await db.sf_system_drafts.find_one({"customer_id": cid}, {"_id": 0})
    if draft:
        print(f"\n{'='*60}")
        print("FINAL DRAFT - 7 FATURA SONRASI")
        print(f"{'='*60}")
        for item in draft.get("items", []):
            prod = await db.sf_products.find_one({"id": item["product_id"]}, {"_id": 0, "name": 1})
            pn = prod["name"] if prod else "?"
            print(f"  #{item['priority_rank']:2d} {pn:40s} onerilen={item['suggested_qty']:5d}  avg={item['avg_effective_used']:5s}  stok={item['stock_effective_used']}")

    print(f"\n=== 7 faturanin tamami islendi! ===")
    client.close()

if __name__ == "__main__":
    asyncio.run(main())
