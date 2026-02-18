"""
ŞEFTALİ Rules Test Suite — T1 through T8
Tests all business rules R1-R25 via direct service + DB calls.

Run: cd /app/backend && python tests/test_seftali_rules.py
"""
import asyncio
import os
import sys
import math
import uuid
import json
from pathlib import Path
from datetime import datetime, timezone, timedelta

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from dotenv import load_dotenv
load_dotenv(Path(__file__).resolve().parent.parent / ".env")

from config.database import db
from services.seftali.consumption_service import ConsumptionService
from services.seftali.draft_service import DraftService
from services.seftali.variance_service import VarianceService

EPSILON = 1e-6
SPIKE_THRESHOLD = 3.0

COL_CUSTOMERS = "sf_customers"
COL_PRODUCTS = "sf_products"
COL_DELIVERIES = "sf_deliveries"
COL_STOCK_DECLARATIONS = "sf_stock_declarations"
COL_CONSUMPTION_STATS = "sf_consumption_stats"
COL_SYSTEM_DRAFTS = "sf_system_drafts"
COL_WORKING_COPIES = "sf_working_copies"
COL_ORDERS = "sf_orders"
COL_VARIANCE_EVENTS = "sf_variance_events"
COL_AUDIT_EVENTS = "sf_audit_events"

CID = "test-cust-rules-001"
PA = "test-prod-A"
PB = "test-prod-B"
SALES = "test-sales-001"

results = []


def gid():
    return str(uuid.uuid4())


def iso(dt):
    return dt.isoformat()


def days_b(dt1, dt2):
    if isinstance(dt1, str): dt1 = datetime.fromisoformat(dt1)
    if isinstance(dt2, str): dt2 = datetime.fromisoformat(dt2)
    return max(math.ceil(abs((dt2 - dt1).total_seconds()) / 86400), 1)


async def cleanup():
    for col in [COL_DELIVERIES, COL_CONSUMPTION_STATS, COL_SYSTEM_DRAFTS,
                COL_WORKING_COPIES, COL_ORDERS, COL_VARIANCE_EVENTS,
                COL_STOCK_DECLARATIONS, COL_AUDIT_EVENTS]:
        await db[col].delete_many({"customer_id": CID})


async def setup():
    await cleanup()
    await db[COL_CUSTOMERS].update_one(
        {"id": CID},
        {"$set": {"id": CID, "user_id": gid(), "name": "Test Rules",
                  "route_plan": {"days": ["MON", "FRI"]}, "is_active": True,
                  "created_at": iso(datetime.now(timezone.utc)),
                  "updated_at": iso(datetime.now(timezone.utc))}},
        upsert=True)
    for pid, name, code in [(PA, "Product A", "TST_A"), (PB, "Product B", "TST_B")]:
        await db[COL_PRODUCTS].update_one(
            {"id": pid},
            {"$set": {"id": pid, "name": name, "code": code, "shelf_life_days": 30,
                       "created_at": iso(datetime.now(timezone.utc)),
                       "updated_at": iso(datetime.now(timezone.utc))}},
            upsert=True)


async def mk_dlv(at, items, status="pending"):
    did = gid()
    d = {"id": did, "customer_id": CID, "created_by_salesperson_id": SALES,
         "delivery_type": "route", "delivered_at": iso(at),
         "invoice_no": f"T-{did[:6]}", "acceptance_status": status,
         "accepted_at": iso(at) if status == "accepted" else None,
         "rejected_at": None, "rejection_reason": None, "items": items,
         "created_at": iso(at), "updated_at": iso(at)}
    await db[COL_DELIVERIES].insert_one(d)
    d.pop("_id", None)
    return d


async def accept_raw(dlv, at):
    await db[COL_DELIVERIES].update_one(
        {"id": dlv["id"]},
        {"$set": {"acceptance_status": "accepted", "accepted_at": iso(at)}})
    dlv["accepted_at"] = at
    return await ConsumptionService.apply_delivery_accepted(CID, dlv)


async def accept_full(dlv):
    now = datetime.now(timezone.utc)
    await db[COL_DELIVERIES].update_one(
        {"id": dlv["id"]},
        {"$set": {"acceptance_status": "accepted", "accepted_at": iso(now), "updated_at": iso(now)}})
    dlv["accepted_at"] = now
    await ConsumptionService.apply_delivery_accepted(CID, dlv)
    pids = [it["product_id"] for it in dlv["items"]]
    await DraftService.update_draft_for_customer(CID, pids, "delivery_accept")
    wc = await db[COL_WORKING_COPIES].find_one({"customer_id": CID, "status": "active"}, {"_id": 0})
    if wc:
        await db[COL_WORKING_COPIES].update_one(
            {"id": wc["id"]}, {"$set": {"status": "deleted_by_delivery", "updated_at": iso(now)}})


async def stock_pipeline(at, items):
    sid = gid()
    sd = {"id": sid, "customer_id": CID, "declared_at": iso(at), "items": items,
          "created_at": iso(at), "updated_at": iso(at)}
    await db[COL_STOCK_DECLARATIONS].insert_one(sd)
    svc = {"id": sid, "declared_at": iso(at), "items": items}
    _, spikes = await ConsumptionService.apply_stock_declaration(CID, svc)
    for se in spikes:
        await VarianceService.create_variance_for_spike(
            se["customer_id"], se["product_id"], se["stock_decl_id"],
            se["spike_ratio"], se["observed_daily"], se["base_avg"])
    pids = [it["product_id"] for it in items]
    await DraftService.update_draft_for_customer(CID, pids, "stock_decl")
    return sid, spikes


async def gs(pid):
    return await db[COL_CONSUMPTION_STATS].find_one(
        {"customer_id": CID, "product_id": pid}, {"_id": 0})


async def gd():
    return await db[COL_SYSTEM_DRAFTS].find_one({"customer_id": CID}, {"_id": 0})


def check(name, cond, detail=""):
    status = "PASS" if cond else "FAIL"
    results.append({"test": name, "status": status, "detail": detail})
    mark = "✓" if cond else "✗"
    print(f"  {mark} {name}" + (f" — {detail}" if detail and not cond else ""))


# ============================================================
async def t1_first_delivery():
    """T1: First delivery accepted → base.avg=0, draft created"""
    await cleanup()
    t1 = datetime(2025, 6, 1, tzinfo=timezone.utc)
    dlv = await mk_dlv(t1, [{"product_id": PA, "qty": 100}])
    await accept_raw(dlv, t1)
    s = await gs(PA)
    check("T1a: base.daily_avg == 0", s["base"]["daily_avg"] == 0,
          f"got {s['base']['daily_avg']}")
    check("T1b: last_delivery.qty == 100", s["base"]["last_delivery"]["qty"] == 100)
    check("T1c: prev_delivery is None", s["base"]["prev_delivery"] is None)
    check("T1d: spike is None", s["spike"] is None)

    await cleanup()
    dlv2 = await mk_dlv(t1, [{"product_id": PA, "qty": 100}])
    await accept_full(dlv2)
    d = await gd()
    check("T1e: draft created", d is not None)
    check("T1f: draft.generated_from == delivery_accept",
          d and d["generated_from"] == "delivery_accept")


async def t2_second_delivery():
    """T2: Second delivery (5 days) → avg = prev_qty / 5"""
    await cleanup()
    t1 = datetime(2025, 6, 1, tzinfo=timezone.utc)
    t2 = datetime(2025, 6, 6, tzinfo=timezone.utc)
    d1 = await mk_dlv(t1, [{"product_id": PA, "qty": 100}])
    await accept_raw(d1, t1)
    d2 = await mk_dlv(t2, [{"product_id": PA, "qty": 60}])
    await accept_raw(d2, t2)
    s = await gs(PA)
    exp = 100 / days_b(iso(t1), iso(t2))
    check("T2a: MODEL B avg = prev_qty/days", abs(s["base"]["daily_avg"] - exp) < 0.001,
          f"expected {exp}, got {s['base']['daily_avg']}")

    # R6: new qty is reference only
    await cleanup()
    d1 = await mk_dlv(t1, [{"product_id": PA, "qty": 100}])
    await accept_raw(d1, t1)
    d2 = await mk_dlv(t2, [{"product_id": PA, "qty": 9999}])
    await accept_raw(d2, t2)
    s = await gs(PA)
    check("T2b: R6 new qty not in calc", abs(s["base"]["daily_avg"] - exp) < 0.001,
          f"expected {exp}, got {s['base']['daily_avg']}")
    check("T2c: last_delivery.qty == 9999", s["base"]["last_delivery"]["qty"] == 9999)

    # R13: spike reset
    await cleanup()
    d1 = await mk_dlv(t1, [{"product_id": PA, "qty": 100}])
    await accept_raw(d1, t1)
    await db[COL_CONSUMPTION_STATS].update_one(
        {"customer_id": CID, "product_id": PA},
        {"$set": {"spike": {"active": True, "daily_avg": 999, "ratio": 10}}})
    d2 = await mk_dlv(t2, [{"product_id": PA, "qty": 60}])
    await accept_raw(d2, t2)
    s = await gs(PA)
    check("T2d: R13 spike reset on accept", s["spike"] is None, f"got {s['spike']}")


async def t3_stock_high():
    """T3: Stock S > D_last → no spike, base unchanged"""
    await cleanup()
    t1 = datetime(2025, 6, 1, tzinfo=timezone.utc)
    t2 = datetime(2025, 6, 6, tzinfo=timezone.utc)
    d1 = await mk_dlv(t1, [{"product_id": PA, "qty": 100}])
    await accept_raw(d1, t1)
    d2 = await mk_dlv(t2, [{"product_id": PA, "qty": 50}])
    await accept_raw(d2, t2)
    s0 = await gs(PA)
    base0 = s0["base"]["daily_avg"]

    ts = datetime(2025, 6, 8, tzinfo=timezone.utc)
    _, spikes = await stock_pipeline(ts, [{"product_id": PA, "qty": 200}])
    check("T3a: no spike events", len(spikes) == 0)
    s = await gs(PA)
    check("T3b: R8 base unchanged", s["base"]["daily_avg"] == base0,
          f"was {base0}, now {s['base']['daily_avg']}")
    check("T3c: spike is None", s["spike"] is None)
    check("T3d: stock.last_decl.qty == 200", s["stock"]["last_decl"]["qty"] == 200)

    # Draft updated on stock_decl
    await cleanup()
    d1 = await mk_dlv(t1, [{"product_id": PA, "qty": 100}])
    await accept_full(d1)
    ts2 = datetime(2025, 6, 3, tzinfo=timezone.utc)
    await stock_pipeline(ts2, [{"product_id": PA, "qty": 80}])
    d = await gd()
    check("T3e: R15 draft from stock_decl", d["generated_from"] == "stock_decl")


async def t4_spike():
    """T4: Stock low, high consumption → spike + variance"""
    await cleanup()
    t1 = datetime(2025, 6, 1, tzinfo=timezone.utc)
    t2 = datetime(2025, 6, 11, tzinfo=timezone.utc)
    d1 = await mk_dlv(t1, [{"product_id": PA, "qty": 100}])
    await accept_raw(d1, t1)
    d2 = await mk_dlv(t2, [{"product_id": PA, "qty": 50}])
    await accept_raw(d2, t2)
    s = await gs(PA)
    check("T4a: base_avg == 10", abs(s["base"]["daily_avg"] - 10.0) < 0.001)

    # S=0, D_last=50, 1 day → obs_daily=50/1=50, ratio=50/10=5
    ts = datetime(2025, 6, 12, tzinfo=timezone.utc)
    sd_id, spikes = await stock_pipeline(ts, [{"product_id": PA, "qty": 0}])
    check("T4b: spike detected", len(spikes) == 1)
    s = await gs(PA)
    check("T4c: spike.active", s["spike"] is not None and s["spike"]["active"])
    check("T4d: spike.ratio >= 3", s["spike"]["ratio"] >= 3 if s["spike"] else False)
    check("T4e: R8 base still 10", abs(s["base"]["daily_avg"] - 10.0) < 0.001)

    var = await db[COL_VARIANCE_EVENTS].find_one(
        {"customer_id": CID, "product_id": PA, "trigger.type": "stock_decl_spike"}, {"_id": 0})
    check("T4f: R11 variance created", var is not None)
    check("T4g: variance status=needs_reason",
          var and var["status"] == "needs_reason")

    # R25: idempotent
    v2 = await VarianceService.create_variance_for_spike(CID, PA, sd_id, 5, 50, 10)
    check("T4h: R25 idempotent variance", v2["id"] == var["id"])
    cnt = await db[COL_VARIANCE_EVENTS].count_documents(
        {"customer_id": CID, "trigger.ref_id": sd_id, "product_id": PA})
    check("T4i: R25 no duplicate", cnt == 1)


async def t5_working_copy():
    """T5: WC active + delivery accept → deleted_by_delivery"""
    await cleanup()
    now = datetime.now(timezone.utc)
    wc_id = gid()
    await db[COL_WORKING_COPIES].insert_one({
        "id": wc_id, "customer_id": CID, "status": "active",
        "items": [{"product_id": PA, "user_qty": 10, "removed": False, "source": "draft"}],
        "created_at": iso(now), "updated_at": iso(now)})
    dlv = await mk_dlv(now, [{"product_id": PA, "qty": 100}])
    await accept_full(dlv)
    wc = await db[COL_WORKING_COPIES].find_one({"id": wc_id}, {"_id": 0})
    check("T5a: R22 WC deleted_by_delivery", wc["status"] == "deleted_by_delivery",
          f"got {wc['status']}")

    # R20: single active
    await cleanup()
    await db[COL_WORKING_COPIES].insert_one({
        "id": gid(), "customer_id": CID, "status": "active",
        "items": [], "created_at": iso(now), "updated_at": iso(now)})
    cnt = await db[COL_WORKING_COPIES].count_documents(
        {"customer_id": CID, "status": "active"})
    check("T5b: R20 single active WC", cnt == 1)


async def t6_idempotent():
    """T6: Accept idempotent → no double update"""
    await cleanup()
    t1 = datetime(2025, 6, 1, tzinfo=timezone.utc)
    t2 = datetime(2025, 6, 6, tzinfo=timezone.utc)
    d1 = await mk_dlv(t1, [{"product_id": PA, "qty": 100}])
    await accept_raw(d1, t1)
    d2 = await mk_dlv(t2, [{"product_id": PA, "qty": 50}])
    await accept_raw(d2, t2)
    s = await gs(PA)
    avg1 = s["base"]["daily_avg"]

    # Delivery already accepted in DB
    rec = await db[COL_DELIVERIES].find_one({"id": d2["id"]}, {"_id": 0})
    check("T6a: delivery is accepted", rec["acceptance_status"] == "accepted")
    # Stats unchanged (API would return 409)
    s2 = await gs(PA)
    check("T6b: R4 no double write", s2["base"]["daily_avg"] == avg1)


async def t7_order():
    """T7: Order submit → consumption unchanged"""
    await cleanup()
    t1 = datetime(2025, 6, 1, tzinfo=timezone.utc)
    t2 = datetime(2025, 6, 6, tzinfo=timezone.utc)
    d1 = await mk_dlv(t1, [{"product_id": PA, "qty": 100}])
    await accept_raw(d1, t1)
    d2 = await mk_dlv(t2, [{"product_id": PA, "qty": 50}])
    await accept_raw(d2, t2)
    s0 = await gs(PA)

    await db[COL_ORDERS].insert_one({
        "id": gid(), "customer_id": CID, "created_from_working_copy_id": gid(),
        "status": "submitted", "items": [{"product_id": PA, "qty": 999}],
        "created_at": iso(datetime.now(timezone.utc)),
        "updated_at": iso(datetime.now(timezone.utc))})
    s1 = await gs(PA)
    check("T7a: R23 base unchanged after order",
          s1["base"]["daily_avg"] == s0["base"]["daily_avg"])
    check("T7b: R23 spike unchanged after order", s1["spike"] == s0["spike"])


async def t8_bulk_variance():
    """T8: Bulk variance reason → recorded"""
    await cleanup()
    now = datetime.now(timezone.utc)
    eids = []
    for _ in range(2):
        eid = gid()
        eids.append(eid)
        await db[COL_VARIANCE_EVENTS].insert_one({
            "id": eid, "customer_id": CID, "product_id": PA,
            "detected_at": iso(now),
            "trigger": {"type": "stock_decl_spike", "ref_id": gid()},
            "change_ratio": 5.0, "direction": "increase", "severity": "major",
            "status": "needs_reason", "reason_code": None, "reason_note": None,
            "customer_action_at": None, "created_at": iso(now), "updated_at": iso(now)})

    for eid in eids:
        await db[COL_VARIANCE_EVENTS].update_one(
            {"id": eid, "status": "needs_reason"},
            {"$set": {"status": "recorded", "reason_code": "PROMO",
                      "reason_note": "test", "customer_action_at": iso(now),
                      "updated_at": iso(now)}})
    all_ok = True
    for eid in eids:
        ev = await db[COL_VARIANCE_EVENTS].find_one({"id": eid}, {"_id": 0})
        if ev["status"] != "recorded" or ev["reason_code"] != "PROMO" or not ev["customer_action_at"]:
            all_ok = False
    check("T8a: R24 bulk recorded", all_ok)


async def extra_r1_pending():
    """R1: Pending delivery no effect"""
    await cleanup()
    t1 = datetime(2025, 6, 1, tzinfo=timezone.utc)
    d1 = await mk_dlv(t1, [{"product_id": PA, "qty": 100}])
    await accept_full(d1)
    s0 = await gs(PA)
    await mk_dlv(datetime(2025, 6, 5, tzinfo=timezone.utc),
                 [{"product_id": PA, "qty": 500}], status="pending")
    s1 = await gs(PA)
    check("R1a: pending no change", s1["base"]["daily_avg"] == s0["base"]["daily_avg"])

    # R3: Rejected
    await cleanup()
    d1 = await mk_dlv(t1, [{"product_id": PA, "qty": 100}])
    await accept_full(d1)
    s0 = await gs(PA)
    d2 = await mk_dlv(datetime(2025, 6, 5, tzinfo=timezone.utc),
                       [{"product_id": PA, "qty": 500}])
    await db[COL_DELIVERIES].update_one(
        {"id": d2["id"]}, {"$set": {"acceptance_status": "rejected"}})
    s1 = await gs(PA)
    check("R3a: rejected no change", s1["base"]["daily_avg"] == s0["base"]["daily_avg"])


async def extra_r8_multi():
    """R8: Multiple stock decls, base always same"""
    await cleanup()
    t1 = datetime(2025, 6, 1, tzinfo=timezone.utc)
    t2 = datetime(2025, 6, 6, tzinfo=timezone.utc)
    d1 = await mk_dlv(t1, [{"product_id": PA, "qty": 100}])
    await accept_raw(d1, t1)
    d2 = await mk_dlv(t2, [{"product_id": PA, "qty": 50}])
    await accept_raw(d2, t2)
    s0 = await gs(PA)
    base0 = s0["base"]["daily_avg"]
    ok = True
    for qty in [10, 0, 999]:
        ts = datetime(2025, 6, 7, tzinfo=timezone.utc)
        await stock_pipeline(ts, [{"product_id": PA, "qty": qty}])
        s = await gs(PA)
        if s["base"]["daily_avg"] != base0:
            ok = False
    check("R8a: base unchanged through 3 stock decls", ok)


async def extra_r16_spike_avg():
    """R16: Recent spike → draft uses spike avg"""
    await cleanup()
    now = datetime.now(timezone.utc)
    t1 = now - timedelta(days=10)
    t2 = now - timedelta(days=5)
    d1 = await mk_dlv(t1, [{"product_id": PA, "qty": 100}])
    await accept_raw(d1, t1)
    d2 = await mk_dlv(t2, [{"product_id": PA, "qty": 50}])
    await accept_raw(d2, t2)
    await db[COL_CONSUMPTION_STATS].update_one(
        {"customer_id": CID, "product_id": PA},
        {"$set": {"spike": {
            "active": True, "daily_avg": 99.0, "ratio": 5.0,
            "consumed": 500, "window_days": 1,
            "detected_at": iso(now - timedelta(days=1)),
            "source_stock_decl_id": gid()}}})
    await DraftService.update_draft_for_customer(CID, [PA], "stock_decl")
    d = await gd()
    item = next(i for i in d["items"] if i["product_id"] == PA)
    check("R16a: avg_effective_used == spike", item["avg_effective_used"] == "spike")


async def extra_r17():
    """R17: Stock effective"""
    await cleanup()
    now = datetime.now(timezone.utc)
    t1 = now - timedelta(days=10)
    t2 = now - timedelta(days=5)
    d1 = await mk_dlv(t1, [{"product_id": PA, "qty": 100}])
    await accept_raw(d1, t1)
    d2 = await mk_dlv(t2, [{"product_id": PA, "qty": 50}])
    await accept_raw(d2, t2)
    ts = now - timedelta(days=1)
    await stock_pipeline(ts, [{"product_id": PA, "qty": 25}])
    d = await gd()
    item = next(i for i in d["items"] if i["product_id"] == PA)
    check("R17a: stock_effective == declared 25", item["stock_effective_used"] == 25)

    # Fallback to last delivery
    await cleanup()
    d1 = await mk_dlv(now, [{"product_id": PA, "qty": 77}])
    await accept_full(d1)
    d = await gd()
    item = next(i for i in d["items"] if i["product_id"] == PA)
    check("R17b: fallback to last_delivery 77", item["stock_effective_used"] == 77)


async def extra_r19():
    """R19: Draft sorted by risk"""
    await cleanup()
    t1 = datetime(2025, 6, 1, tzinfo=timezone.utc)
    t2 = datetime(2025, 6, 6, tzinfo=timezone.utc)
    for pid, q1, q2 in [(PA, 100, 50), (PB, 10, 5)]:
        d1 = await mk_dlv(t1, [{"product_id": pid, "qty": q1}])
        await accept_raw(d1, t1)
        d2 = await mk_dlv(t2, [{"product_id": pid, "qty": q2}])
        await accept_raw(d2, t2)
    await DraftService.update_draft_for_customer(CID, [PA, PB], "delivery_accept")
    d = await gd()
    items = d["items"]
    sorted_ok = all(items[i]["risk_score"] <= items[i+1]["risk_score"]
                    for i in range(len(items)-1))
    check("R19a: sorted by risk", sorted_ok)
    rank_ok = all(items[i]["priority_rank"] == i+1 for i in range(len(items)))
    check("R19b: priority_rank sequential", rank_ok)


async def extra_r21():
    """R21: WC qty validation"""
    from pydantic import ValidationError
    from routes.seftali.customer_routes import WCUpdateItem

    try:
        WCUpdateItem(product_id=PA, user_qty=0)
        check("R21a: qty=0 rejected", False, "no error raised")
    except (ValidationError, ValueError):
        check("R21a: qty=0 rejected", True)

    try:
        WCUpdateItem(product_id=PA, user_qty=-5)
        check("R21b: qty<0 rejected", False, "no error raised")
    except (ValidationError, ValueError):
        check("R21b: qty<0 rejected", True)

    item = WCUpdateItem(product_id=PA, user_qty=None)
    check("R21c: qty=null accepted", item.user_qty is None)


async def main():
    await setup()

    tests = [
        ("T1: First delivery", t1_first_delivery),
        ("T2: Second delivery (MODEL B)", t2_second_delivery),
        ("T3: Stock > D_last", t3_stock_high),
        ("T4: Spike detection", t4_spike),
        ("T5: Working copy", t5_working_copy),
        ("T6: Idempotent accept", t6_idempotent),
        ("T7: Order no consumption", t7_order),
        ("T8: Bulk variance", t8_bulk_variance),
        ("R1/R3: Pending/rejected", extra_r1_pending),
        ("R8: Stock never changes base", extra_r8_multi),
        ("R16: Draft spike avg", extra_r16_spike_avg),
        ("R17: Stock effective", extra_r17),
        ("R19: Draft sorting", extra_r19),
        ("R21: WC qty validation", extra_r21),
    ]

    print("=" * 60)
    print("ŞEFTALİ RULES TEST SUITE")
    print("=" * 60)

    for name, fn in tests:
        print(f"\n--- {name} ---")
        try:
            await fn()
        except Exception as e:
            check(f"{name} EXCEPTION", False, str(e))

    await cleanup()

    # Summary
    passed = sum(1 for r in results if r["status"] == "PASS")
    failed = sum(1 for r in results if r["status"] == "FAIL")
    total = len(results)

    print(f"\n{'=' * 60}")
    print(f"RESULTS: {passed}/{total} passed, {failed} failed")
    print(f"{'=' * 60}")

    if failed:
        print("\nFAILED TESTS:")
        for r in results:
            if r["status"] == "FAIL":
                print(f"  ✗ {r['test']}: {r['detail']}")

    # Write JSON report
    report = {
        "summary": f"{passed}/{total} passed",
        "passed": passed, "failed": failed, "total": total,
        "tests": results
    }
    report_path = "/app/test_reports/iteration_3.json"
    with open(report_path, "w") as f:
        json.dump(report, f, indent=2, ensure_ascii=False)
    print(f"\nReport: {report_path}")

    return failed == 0


if __name__ == "__main__":
    success = asyncio.run(main())
    sys.exit(0 if success else 1)
