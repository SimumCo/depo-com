"""
Import weekly consumption data from Excel file into SEFTALI system.
- Reads haftalik_tuketim_dataseti_urun_adli.xlsx
- Groups rows by date -> each date = 1 delivery with 9 items
- Creates deliveries in chronological order, marks accepted
- Runs MODEL B consumption pipeline for each delivery
"""
import asyncio
import os
import sys
import uuid
from datetime import datetime, timezone
from pathlib import Path
from collections import OrderedDict

sys.path.insert(0, str(Path(__file__).parent))
from dotenv import load_dotenv
load_dotenv(Path(__file__).parent / ".env")

import openpyxl
from motor.motor_asyncio import AsyncIOMotorClient

EXCEL_PATH = "/tmp/tuketim.xlsx"
CUSTOMER_ID = "8a422e18-791f-4e6a-88b0-583f20fba6d4"
SALESPERSON_ID = "68132231-0b00-4351-904b-640588eaa1ed"

# Map Excel product codes to existing sf_products IDs
PRODUCT_MAP = {
    "15203002": "be8d1263-3237-422d-9902-92461a2399fc",   # 200 ML AYRAN
    "15214060": "ec32c163-bcea-487e-a720-fc83e851ba62",   # 180 ml KAKAOLU SUT 6LI
    "15214059": "e692a7c4-49ee-4261-871b-684fd445b045",   # 180 ml CILEKLI SUT 6LI
    "15214062": "058b4cb1-db97-43c9-8d5e-fde52216b954",   # 180 ml YAGLI SUT 6LI
    "15203020": "56370f8f-d1bc-439d-ab77-ec3faea6a7ca",   # 1000 ml AYRAN
    "15203009": "0c9fb7e9-e97a-4a42-8a7c-d9e7cfe2557c",   # 2000 ml AYRAN
    "15201028": "12e44748-b991-4ddf-b74c-920ca06a6e9e",   # 750 GR T.YAGLI YOGURT
    "15201003": "196b9151-6722-45e3-bbdb-27077e40c341",   # 500 GR T.YAGLI YOGURT
    "15206048": "6f717418-9e68-4704-9c96-7cd20c19a651",   # 600 GR KASAR PEYNIRI
}


def gid():
    return str(uuid.uuid4())


def iso(dt):
    return dt.isoformat()


def parse_date(date_str):
    """Parse date string to datetime with UTC timezone."""
    if isinstance(date_str, datetime):
        return date_str.replace(tzinfo=timezone.utc)
    return datetime.strptime(str(date_str), "%Y-%m-%d").replace(tzinfo=timezone.utc)


def read_excel():
    """Read Excel and group rows by date."""
    wb = openpyxl.load_workbook(EXCEL_PATH)
    ws = wb.active

    grouped = OrderedDict()
    for row in ws.iter_rows(min_row=2, values_only=True):
        musteri, tarih, urun_kodu, urun_adi, adet = row
        if not tarih or not urun_kodu:
            continue
        date_key = str(tarih)
        if date_key not in grouped:
            grouped[date_key] = []
        grouped[date_key].append({
            "product_code": str(urun_kodu),
            "product_name": str(urun_adi),
            "qty": int(adet),
        })

    return grouped


async def run_consumption_pipeline(db, customer_id, delivery):
    """MODEL B: Update consumption stats when delivery is accepted."""
    import math
    EPSILON = 0.001

    delivery_id = delivery["id"]
    accepted_at = delivery["accepted_at"]

    for item in delivery["items"]:
        product_id = item["product_id"]
        qty = item["qty"]

        stats = await db.sf_consumption_stats.find_one(
            {"customer_id": customer_id, "product_id": product_id}, {"_id": 0}
        )

        if stats is None:
            doc = {
                "customer_id": customer_id,
                "product_id": product_id,
                "base": {
                    "daily_avg": 0,
                    "last_delivery": {"delivery_id": delivery_id, "qty": qty, "at": accepted_at},
                    "prev_delivery": None,
                },
                "stock": {"last_decl": None},
                "spike": None,
                "created_at": accepted_at,
                "updated_at": accepted_at,
            }
            await db.sf_consumption_stats.insert_one(doc)
        else:
            last_del = stats["base"].get("last_delivery")
            upd = {"spike": None, "updated_at": accepted_at}

            if last_del:
                dt1 = datetime.fromisoformat(last_del["at"]) if isinstance(last_del["at"], str) else last_del["at"]
                dt2 = datetime.fromisoformat(accepted_at) if isinstance(accepted_at, str) else accepted_at
                diff_days = abs((dt2 - dt1).total_seconds()) / 86400
                diff_days = max(math.ceil(diff_days), 1)
                upd["base.daily_avg"] = last_del["qty"] / diff_days
                upd["base.prev_delivery"] = last_del

            upd["base.last_delivery"] = {
                "delivery_id": delivery_id, "qty": qty, "at": accepted_at
            }

            await db.sf_consumption_stats.update_one(
                {"customer_id": customer_id, "product_id": product_id}, {"$set": upd}
            )


async def main():
    print("=== Excel Tuketim Verisi Import ===\n")

    # 1. Read Excel
    print("1. Excel okunuyor...")
    grouped = read_excel()
    print(f"   {len(grouped)} benzersiz tarih, toplam teslimat olusturulacak")

    # 2. Connect to MongoDB
    client = AsyncIOMotorClient(os.environ["MONGO_URL"])
    db = client[os.environ["DB_NAME"]]

    # 3. Clear existing AILEM MARKET data
    print("\n2. Mevcut AILEM MARKET verileri temizleniyor...")
    del_result = await db.sf_deliveries.delete_many({"customer_id": CUSTOMER_ID})
    print(f"   {del_result.deleted_count} teslimat silindi")
    stats_result = await db.sf_consumption_stats.delete_many({"customer_id": CUSTOMER_ID})
    print(f"   {stats_result.deleted_count} tuketim istatistigi silindi")
    draft_result = await db.sf_system_drafts.delete_many({"_id": CUSTOMER_ID})
    print(f"   Taslaklar temizlendi")

    # 4. Get salesperson user id
    sales_user = await db.users.find_one({"username": "sf_satici"}, {"_id": 0, "id": 1})
    salesperson_id = sales_user["id"] if sales_user else "unknown"

    # 5. Create deliveries chronologically
    print(f"\n3. {len(grouped)} teslimat olusturuluyor ve tuketim hesaplaniyor...")
    created_count = 0
    sorted_dates = sorted(grouped.keys())

    for i, date_key in enumerate(sorted_dates):
        items_data = grouped[date_key]
        delivery_date = parse_date(date_key)
        delivery_id = gid()
        accepted_at = iso(delivery_date)

        # Build delivery items
        items = []
        for item in items_data:
            product_id = PRODUCT_MAP.get(item["product_code"])
            if not product_id:
                print(f"   UYARI: Urun kodu {item['product_code']} eslestirilemiyor, atlaniyor")
                continue
            items.append({
                "product_id": product_id,
                "qty": item["qty"],
            })

        if not items:
            continue

        # Create delivery record
        delivery = {
            "id": delivery_id,
            "customer_id": CUSTOMER_ID,
            "created_by_salesperson_id": salesperson_id,
            "delivery_type": "route",
            "delivered_at": accepted_at,
            "invoice_no": f"EXCEL-{date_key}",
            "acceptance_status": "accepted",
            "accepted_at": accepted_at,
            "rejected_at": None,
            "rejection_reason": None,
            "items": items,
            "created_at": accepted_at,
            "updated_at": accepted_at,
        }

        await db.sf_deliveries.insert_one(delivery)

        # Run consumption pipeline
        await run_consumption_pipeline(db, CUSTOMER_ID, delivery)

        created_count += 1
        if (i + 1) % 50 == 0:
            print(f"   {i + 1}/{len(sorted_dates)} islem tamamlandi...")

    print(f"   Toplam {created_count} teslimat olusturuldu ve islendi")

    # 6. Verify results
    print("\n4. Dogrulama...")
    total_deliveries = await db.sf_deliveries.count_documents({"customer_id": CUSTOMER_ID})
    total_stats = await db.sf_consumption_stats.count_documents({"customer_id": CUSTOMER_ID})
    print(f"   Toplam teslimat: {total_deliveries}")
    print(f"   Tuketim istatistikleri: {total_stats}")

    # Show final consumption stats
    print("\n5. Son tuketim istatistikleri:")
    stats_cursor = db.sf_consumption_stats.find(
        {"customer_id": CUSTOMER_ID}, {"_id": 0}
    )
    stats_list = await stats_cursor.to_list(100)
    for s in stats_list:
        pid = s["product_id"]
        avg = s["base"]["daily_avg"]
        last_del = s["base"].get("last_delivery", {})
        last_qty = last_del.get("qty", 0) if last_del else 0
        last_at = last_del.get("at", "?") if last_del else "?"
        print(f"   {pid[:8]}... | Gunluk Ort: {avg:.2f} | Son Teslimat: {last_qty} adet ({last_at[:10]})")

    print("\n=== Import tamamlandi! ===")
    client.close()


if __name__ == "__main__":
    asyncio.run(main())
