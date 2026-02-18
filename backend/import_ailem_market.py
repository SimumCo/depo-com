"""
AİLEM MARKET fatura verilerini ŞEFTALİ sistemine aktarma scripti.
5 fatura, kronolojik sırada, delivery accept pipeline ile işlenir.
"""
import asyncio
import os
import sys
from datetime import datetime, timezone
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from dotenv import load_dotenv
load_dotenv(Path(__file__).parent / ".env")

from motor.motor_asyncio import AsyncIOMotorClient
import uuid

def gid():
    return str(uuid.uuid4())

def iso(dt_str):
    """Parse DD-MM-YYYY to ISO"""
    d = datetime.strptime(dt_str, "%d-%m-%Y").replace(tzinfo=timezone.utc)
    return d.isoformat()

def now_iso():
    return datetime.now(timezone.utc).isoformat()

# ---- Fatura verileri (kronolojik sıra: eskiden yeniye) ----
INVOICES = [
    {
        "invoice_no": "EA12025000001791",
        "date": "12-08-2025",
        "items": [
            ("750 GR T.YAGLI YOGURT", 1),
            ("500 GR T.YAGLI YOGURT", 1),
            ("200 ml UHT CIRPMA KREMA", 1),
            ("180 ml CILEKLI SUT 6LI", 4),
            ("600 GR KASAR PEYNIRI", 1),
            ("180 ml KAKAOLU SUT 6LI", 4),
        ],
    },
    {
        "invoice_no": "EA12025000001902",
        "date": "26-08-2025",
        "items": [
            ("180 ml KAKAOLU SUT 6LI", 4),
            ("180 ml CILEKLI SUT 6LI", 4),
            ("180 ml YAGLI SUT 6LI", 4),
            ("500 GR T.YAGLI YOGURT", 2),
            ("200 ml UHT CIRPMA KREMA", 2),
            ("200 ml UHT PISIRMELIK KREMA", 2),
            ("1000 ml AYRAN", 6),
            ("2000 ml AYRAN", 4),
            ("600 GR KASAR PEYNIRI", 1),
            ("1000 ml Y.YAGLI UHT SUT", 12),
        ],
    },
    {
        "invoice_no": "EA12025000001958",
        "date": "02-09-2025",
        "items": [
            ("750 GR T.YAGLI YOGURT", 2),
            ("170 ML AYRAN", 40),
            ("400 GR KASAR PEYNIRI", 1),
            ("180 ml KAKAOLU SUT 6LI", 8),
            ("180 ml CILEKLI SUT 6LI", 4),
            ("180 ml YAGLI SUT 6LI", 4),
        ],
    },
    {
        "invoice_no": "EA12025000002027",
        "date": "09-09-2025",
        "items": [
            ("200 ML AYRAN", 80),
            ("180 ml KAKAOLU SUT 6LI", 8),
            ("180 ml CILEKLI SUT 6LI", 4),
            ("5 KG Y.YAGLI YOGURT", 1),
            ("500 GR T.YAGLI BEYAZ PEYNIR", 1),
            ("1000 ml AYRAN", 3),
            ("2000 ml AYRAN", 1),
            ("1750 GR CIFTLIK YAGLI YOGURT", 2),
            ("750 GR T.YAGLI YOGURT", 4),
            ("500 GR T.YAGLI YOGURT", 4),
            ("200 ml UHT PISIRMELIK KREMA", 2),
            ("200 ml UHT CIRPMA KREMA", 1),
            ("250 GR SUZME PEYNIR", 1),
        ],
    },
    {
        "invoice_no": "EA12025000002092",
        "date": "16-09-2025",
        "items": [
            ("200 ML AYRAN", 100),
            ("180 ml CILEKLI SUT 6LI", 4),
            ("1000 ml Y.YAGLI UHT SUT", 12),
            ("1750 GR CIFTLIK YAGLI YOGURT", 2),
            ("750 GR T.YAGLI YOGURT", 3),
            ("500 GR T.YAGLI BEYAZ PEYNIR", 1),
            ("200 ml UHT PISIRMELIK KREMA", 2),
            ("1000 ml AYRAN", 3),
            ("180 ml KAKAOLU SUT 6LI", 8),
        ],
    },
]


async def main():
    client = AsyncIOMotorClient(os.environ["MONGO_URL"])
    db = client[os.environ["DB_NAME"]]

    # ---- 1. Tum urunleri topla ve sf_products'a ekle ----
    all_product_names = set()
    for inv in INVOICES:
        for name, _ in inv["items"]:
            all_product_names.add(name)

    print(f"Toplam benzersiz urun: {len(all_product_names)}")

    # Generate codes from names
    def make_code(name):
        return name.upper().replace(" ", "_").replace(".", "").replace("(", "").replace(")", "").replace("*", "X").replace(",", "")[:30]

    # Shelf life estimates
    SHELF_LIFE = {
        "AYRAN": 21, "YOGURT": 28, "SUT": 90, "KREMA": 60,
        "PEYNIR": 180, "KASAR": 120,
    }
    def guess_shelf_life(name):
        n = name.upper()
        for key, val in SHELF_LIFE.items():
            if key in n:
                return val
        return None

    product_map = {}  # name -> product_id

    for pname in sorted(all_product_names):
        existing = await db.sf_products.find_one({"name": pname}, {"_id": 0})
        if existing:
            product_map[pname] = existing["id"]
            print(f"  Urun mevcut: {pname}")
        else:
            pid = gid()
            code = make_code(pname)
            doc = {
                "id": pid,
                "code": code,
                "name": pname,
                "shelf_life_days": guess_shelf_life(pname),
                "created_at": now_iso(),
                "updated_at": now_iso(),
            }
            await db.sf_products.insert_one(doc)
            product_map[pname] = pid
            print(f"  Urun eklendi: {pname} ({code})")

    # ---- 2. Musteri guncelle ----
    customer = await db.sf_customers.find_one({"name": {"$regex": "Musteri A"}}, {"_id": 0})
    if customer:
        await db.sf_customers.update_one(
            {"id": customer["id"]},
            {"$set": {"name": "AILEM MARKET GURBET DURMUS", "updated_at": now_iso()}}
        )
        customer_id = customer["id"]
        print(f"\nMusteri guncellendi: AILEM MARKET GURBET DURMUS (id: {customer_id[:8]}...)")
    else:
        print("\nMusteri bulunamadi! sf_musteri ile iliskili musteri yok.")
        client.close()
        return

    # Get salesperson
    salesperson = await db.users.find_one({"username": "sf_satici"}, {"_id": 0})
    sales_id = salesperson["id"] if salesperson else "system"

    # ---- 3. Mevcut test delivery'leri temizle ----
    del_count = await db.sf_deliveries.delete_many({"customer_id": customer_id})
    print(f"\nEski teslimatlar silindi: {del_count.deleted_count}")
    await db.sf_consumption_stats.delete_many({"customer_id": customer_id})
    await db.sf_system_drafts.delete_many({"customer_id": customer_id})
    await db.sf_working_copies.delete_many({"customer_id": customer_id})
    await db.sf_orders.delete_many({"customer_id": customer_id})
    await db.sf_variance_events.delete_many({"customer_id": customer_id})
    await db.sf_audit_events.delete_many({"customer_id": customer_id})
    print("Eski tuketim verileri temizlendi.")

    # ---- 4. Delivery'leri olustur ve sirasi ile accept et ----
    # Import services
    from services.seftali.consumption_service import ConsumptionService
    from services.seftali.draft_service import DraftService
    from services.seftali.utils import to_iso, now_utc, COL_DELIVERIES, COL_WORKING_COPIES, COL_AUDIT_EVENTS

    for idx, inv in enumerate(INVOICES):
        dlv_id = gid()
        delivered_at = iso(inv["date"])
        items = []
        for pname, qty in inv["items"]:
            pid = product_map.get(pname)
            if not pid:
                print(f"  UYARI: Urun bulunamadi: {pname}")
                continue
            items.append({"product_id": pid, "qty": qty})

        # Insert delivery as pending
        dlv_doc = {
            "id": dlv_id,
            "customer_id": customer_id,
            "created_by_salesperson_id": sales_id,
            "delivery_type": "route",
            "delivered_at": delivered_at,
            "invoice_no": inv["invoice_no"],
            "acceptance_status": "pending",
            "accepted_at": None,
            "rejected_at": None,
            "rejection_reason": None,
            "items": items,
            "created_at": delivered_at,
            "updated_at": delivered_at,
        }
        await db.sf_deliveries.insert_one(dlv_doc)

        # Accept delivery (run pipeline)
        accepted_at_str = delivered_at  # Accept at delivery date for accurate MODEL B
        await db.sf_deliveries.update_one(
            {"id": dlv_id},
            {"$set": {
                "acceptance_status": "accepted",
                "accepted_at": accepted_at_str,
                "updated_at": accepted_at_str,
            }}
        )

        # Run consumption pipeline
        dlv_for_svc = {"id": dlv_id, "accepted_at": accepted_at_str, "items": items}
        stats = await ConsumptionService.apply_delivery_accepted(customer_id, dlv_for_svc)

        # Update draft
        pids = [it["product_id"] for it in items]
        await DraftService.update_draft_for_customer(customer_id, pids, "delivery_accept")

        # Kill active working copies
        await db[COL_WORKING_COPIES].update_many(
            {"customer_id": customer_id, "status": "active"},
            {"$set": {"status": "deleted_by_delivery", "updated_at": accepted_at_str}}
        )

        # Audit
        await db[COL_AUDIT_EVENTS].insert_one({
            "type": "delivery_accepted",
            "customer_id": customer_id,
            "delivery_id": dlv_id,
            "performed_by": "import_script",
            "at": accepted_at_str,
        })

        print(f"\n  Fatura {idx+1}/5: {inv['invoice_no']} ({inv['date']})")
        print(f"    Urun sayisi: {len(items)}")

        # Print consumption stats for this delivery
        for s in stats:
            base_avg = s.get("base", {}).get("daily_avg", 0)
            prod = await db.sf_products.find_one({"id": s["product_id"]}, {"_id": 0, "name": 1})
            pn = prod["name"] if prod else s["product_id"][:8]
            print(f"    {pn:40s} daily_avg={base_avg:.2f}")

    # ---- 5. Final draft'i goster ----
    draft = await db.sf_system_drafts.find_one({"customer_id": customer_id}, {"_id": 0})
    if draft:
        print(f"\n{'='*60}")
        print(f"FINAL DRAFT - AILEM MARKET")
        print(f"{'='*60}")
        for item in draft.get("items", []):
            prod = await db.sf_products.find_one({"id": item["product_id"]}, {"_id": 0, "name": 1})
            pn = prod["name"] if prod else "?"
            print(f"  #{item['priority_rank']:2d} {pn:40s} onerilen={item['suggested_qty']:5d}  avg={item['avg_effective_used']:5s}  stok={item['stock_effective_used']}")

    print(f"\n=== Import tamamlandi! ===")
    print(f"5 fatura basariyla islendi ve tuketim hesaplandi.")
    client.close()


if __name__ == "__main__":
    asyncio.run(main())
