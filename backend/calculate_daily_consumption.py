"""
Günlük tüketim hesaplama scripti.
Excel'deki teslimatlar arasındaki günlük tüketimi hesaplar ve sf_daily_consumption'a kaydeder.

Mantık:
  22 Aralık Pazartesi: 60 adet fatura
  25 Aralık Perşembe: yeni teslimat
  → 3 gün arası (23, 24, 25)
  → Günlük tüketim = 60 / 3 = 20
  → 23 Aralık: 20, 24 Aralık: 20, 25 Aralık: 20

Run: cd /app/backend && python calculate_daily_consumption.py
"""
import asyncio
import os
import sys
from pathlib import Path
from datetime import datetime, timezone, timedelta
from collections import defaultdict

sys.path.insert(0, str(Path(__file__).parent))
from dotenv import load_dotenv
load_dotenv(Path(__file__).parent / ".env")

import openpyxl
from motor.motor_asyncio import AsyncIOMotorClient

EXCEL_PATH = "/tmp/tuketim.xlsx"
CUSTOMER_ID = "8a422e18-791f-4e6a-88b0-583f20fba6d4"

PRODUCT_MAP = {
    "15203002": "be8d1263-3237-422d-9902-92461a2399fc",
    "15214060": "ec32c163-bcea-487e-a720-fc83e851ba62",
    "15214059": "e692a7c4-49ee-4261-871b-684fd445b045",
    "15214062": "058b4cb1-db97-43c9-8d5e-fde52216b954",
    "15203020": "56370f8f-d1bc-439d-ab77-ec3faea6a7ca",
    "15203009": "0c9fb7e9-e97a-4a42-8a7c-d9e7cfe2557c",
    "15201028": "12e44748-b991-4ddf-b74c-920ca06a6e9e",
    "15201003": "196b9151-6722-45e3-bbdb-27077e40c341",
    "15206048": "6f717418-9e68-4704-9c96-7cd20c19a651",
}


def read_excel():
    wb = openpyxl.load_workbook(EXCEL_PATH)
    ws = wb.active
    products = defaultdict(list)
    for row in ws.iter_rows(min_row=2, values_only=True):
        _, tarih, urun_kodu, urun_adi, adet = row
        if not tarih or not urun_kodu:
            continue
        date_str = str(tarih)[:10]
        products[str(urun_kodu)].append((date_str, int(adet), str(urun_adi)))
    return products


async def main():
    print("=== Gunluk Tuketim Hesaplama ===\n")

    client = AsyncIOMotorClient(os.environ["MONGO_URL"])
    db = client[os.environ["DB_NAME"]]

    # 1. Read Excel
    products = read_excel()
    print(f"1. Excel okundu: {len(products)} urun")

    # 2. Clear old daily consumption for this customer
    del_result = await db.sf_daily_consumption.delete_many({"customer_id": CUSTOMER_ID})
    print(f"2. Eski kayitlar temizlendi: {del_result.deleted_count}")

    # 3. Calculate daily consumption for each product
    total_records = 0
    batch = []

    for excel_code, entries in products.items():
        product_id = PRODUCT_MAP.get(excel_code)
        if not product_id:
            continue

        product_name = entries[0][2]
        entries.sort(key=lambda x: x[0])

        for i in range(len(entries) - 1):
            d1_str, qty1, _ = entries[i]
            d2_str, _, _ = entries[i + 1]

            d1 = datetime.strptime(d1_str, "%Y-%m-%d")
            d2 = datetime.strptime(d2_str, "%Y-%m-%d")
            days_between = (d2 - d1).days

            if days_between <= 0:
                continue

            daily_consumption = qty1 / days_between

            # Create a record for each day: d1+1, d1+2, ..., d2
            for day_offset in range(1, days_between + 1):
                current_date = d1 + timedelta(days=day_offset)
                record = {
                    "customer_id": CUSTOMER_ID,
                    "product_id": product_id,
                    "date": current_date.strftime("%Y-%m-%d"),
                    "consumption": round(daily_consumption, 4),
                    "source_delivery_qty": qty1,
                    "source_delivery_date": d1_str,
                    "period_days": days_between,
                }
                batch.append(record)
                total_records += 1

            # Batch insert every 1000
            if len(batch) >= 1000:
                await db.sf_daily_consumption.insert_many(batch)
                batch = []

        print(f"   {product_name:45s} -> islendi")

    # Insert remaining
    if batch:
        await db.sf_daily_consumption.insert_many(batch)

    print(f"\n3. Toplam {total_records} gunluk tuketim kaydi olusturuldu")

    # 4. Create index
    await db.sf_daily_consumption.create_index(
        [("customer_id", 1), ("product_id", 1), ("date", 1)],
        unique=True
    )
    await db.sf_daily_consumption.create_index([("customer_id", 1), ("date", 1)])
    print("4. Indexler olusturuldu")

    # 5. Verify with sample
    print("\n5. Ornek kayitlar (200 ML AYRAN, son 10 gun):")
    ayran_id = "be8d1263-3237-422d-9902-92461a2399fc"
    cursor = db.sf_daily_consumption.find(
        {"customer_id": CUSTOMER_ID, "product_id": ayran_id},
        {"_id": 0, "date": 1, "consumption": 1, "source_delivery_qty": 1, "period_days": 1}
    ).sort("date", -1).limit(10)
    records = await cursor.to_list(10)
    for r in reversed(records):
        print(f"   {r['date']} | tuketim: {r['consumption']:6.2f} | "
              f"teslimat: {r['source_delivery_qty']} adet / {r['period_days']} gun")

    # 6. Summary per product
    print("\n6. Urun bazinda ozet:")
    pipeline = [
        {"$match": {"customer_id": CUSTOMER_ID}},
        {"$group": {
            "_id": "$product_id",
            "total_consumption": {"$sum": "$consumption"},
            "avg_daily": {"$avg": "$consumption"},
            "count": {"$sum": 1},
            "min_date": {"$min": "$date"},
            "max_date": {"$max": "$date"},
        }},
        {"$sort": {"avg_daily": -1}},
    ]
    results = await db.sf_daily_consumption.aggregate(pipeline).to_list(20)

    # Get product names
    prod_names = {}
    async for p in db.sf_products.find({}, {"_id": 0, "id": 1, "name": 1}):
        prod_names[p["id"]] = p["name"]

    for r in results:
        name = prod_names.get(r["_id"], r["_id"][:12])
        print(f"   {name:45s} | ort: {r['avg_daily']:8.4f}/gun | "
              f"toplam: {r['total_consumption']:8.1f} | "
              f"{r['count']} gun ({r['min_date']} - {r['max_date']})")

    print("\n=== Tamamlandi! ===")
    client.close()


if __name__ == "__main__":
    asyncio.run(main())
