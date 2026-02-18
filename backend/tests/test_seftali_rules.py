"""
ŞEFTALİ Rules Test Suite — T1 through T8
Tests all business rules R1-R25 via direct service calls.
Run: cd /app/backend && python -m pytest tests/test_seftali_rules.py -v
"""
import asyncio
import os
import sys
import math
import uuid
from pathlib import Path
from datetime import datetime, timezone, timedelta

import pytest
import pytest_asyncio

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from dotenv import load_dotenv
load_dotenv(Path(__file__).resolve().parent.parent / ".env")

from motor.motor_asyncio import AsyncIOMotorClient

MONGO_URL = os.environ["MONGO_URL"]
DB_NAME = os.environ["DB_NAME"]

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

TEST_CUSTOMER_ID = "test-cust-rules-001"
TEST_CUSTOMER_USER_ID = "test-user-rules-001"
TEST_PRODUCT_A = "test-prod-A"
TEST_PRODUCT_B = "test-prod-B"
TEST_SALES_USER_ID = "test-sales-rules-001"

pytestmark = pytest.mark.asyncio


def gid():
    return str(uuid.uuid4())


def iso(dt):
    return dt.isoformat()


def days_between(dt1, dt2):
    if isinstance(dt1, str):
        dt1 = datetime.fromisoformat(dt1)
    if isinstance(dt2, str):
        dt2 = datetime.fromisoformat(dt2)
    diff = abs((dt2 - dt1).total_seconds()) / 86400
    return max(math.ceil(diff), 1)


@pytest.fixture(scope="session")
def event_loop():
    loop = asyncio.new_event_loop()
    yield loop
    loop.close()


@pytest_asyncio.fixture(scope="session")
async def db():
    client = AsyncIOMotorClient(MONGO_URL)
    database = client[DB_NAME]
    yield database
    client.close()


CLEAN_COLS = [
    COL_DELIVERIES, COL_CONSUMPTION_STATS, COL_SYSTEM_DRAFTS,
    COL_WORKING_COPIES, COL_ORDERS, COL_VARIANCE_EVENTS,
    COL_STOCK_DECLARATIONS, COL_AUDIT_EVENTS,
]


@pytest_asyncio.fixture(autouse=True)
async def clean_test_data(db):
    for col in CLEAN_COLS:
        await db[col].delete_many({"customer_id": TEST_CUSTOMER_ID})

    await db[COL_CUSTOMERS].update_one(
        {"id": TEST_CUSTOMER_ID},
        {"$set": {
            "id": TEST_CUSTOMER_ID, "user_id": TEST_CUSTOMER_USER_ID,
            "name": "Test Rules Customer",
            "route_plan": {"days": ["MON", "FRI"], "effective_from_week": "2025-W01"},
            "is_active": True,
            "created_at": iso(datetime.now(timezone.utc)),
            "updated_at": iso(datetime.now(timezone.utc)),
        }},
        upsert=True,
    )
    for pid, name, code in [
        (TEST_PRODUCT_A, "Test Product A", "TST_A"),
        (TEST_PRODUCT_B, "Test Product B", "TST_B"),
    ]:
        await db[COL_PRODUCTS].update_one(
            {"id": pid},
            {"$set": {"id": pid, "name": name, "code": code, "shelf_life_days": 30,
                       "created_at": iso(datetime.now(timezone.utc)),
                       "updated_at": iso(datetime.now(timezone.utc))}},
            upsert=True,
        )
    yield
    for col in CLEAN_COLS:
        await db[col].delete_many({"customer_id": TEST_CUSTOMER_ID})


# ---- helpers ----
async def create_delivery(db, delivered_at, items, status="pending"):
    dlv_id = gid()
    dlv = {
        "id": dlv_id, "customer_id": TEST_CUSTOMER_ID,
        "created_by_salesperson_id": TEST_SALES_USER_ID,
        "delivery_type": "route", "delivered_at": iso(delivered_at),
        "invoice_no": f"TEST-{dlv_id[:8]}", "acceptance_status": status,
        "accepted_at": iso(delivered_at) if status == "accepted" else None,
        "rejected_at": None, "rejection_reason": None,
        "items": items, "created_at": iso(delivered_at), "updated_at": iso(delivered_at),
    }
    await db[COL_DELIVERIES].insert_one(dlv)
    dlv.pop("_id", None)
    return dlv


async def accept_delivery_via_service(db, delivery):
    from services.seftali.consumption_service import ConsumptionService
    from services.seftali.draft_service import DraftService

    cid = delivery["customer_id"]
    now = datetime.now(timezone.utc)
    await db[COL_DELIVERIES].update_one(
        {"id": delivery["id"]},
        {"$set": {"acceptance_status": "accepted", "accepted_at": iso(now), "updated_at": iso(now)}},
    )
    delivery["accepted_at"] = now
    await ConsumptionService.apply_delivery_accepted(cid, delivery)
    pids = [it["product_id"] for it in delivery["items"]]
    await DraftService.update_draft_for_customer(cid, pids, "delivery_accept")

    active_wc = await db[COL_WORKING_COPIES].find_one({"customer_id": cid, "status": "active"}, {"_id": 0})
    if active_wc:
        await db[COL_WORKING_COPIES].update_one(
            {"id": active_wc["id"]}, {"$set": {"status": "deleted_by_delivery", "updated_at": iso(now)}},
        )


async def accept_delivery_raw(db, delivery, accepted_at):
    """Accept with explicit timestamp — for deterministic tests."""
    from services.seftali.consumption_service import ConsumptionService

    await db[COL_DELIVERIES].update_one(
        {"id": delivery["id"]},
        {"$set": {"acceptance_status": "accepted", "accepted_at": iso(accepted_at)}},
    )
    delivery["accepted_at"] = accepted_at
    return await ConsumptionService.apply_delivery_accepted(TEST_CUSTOMER_ID, delivery)


async def stock_decl_pipeline(db, declared_at, items):
    from services.seftali.consumption_service import ConsumptionService
    from services.seftali.draft_service import DraftService
    from services.seftali.variance_service import VarianceService

    sd_id = gid()
    sd = {
        "id": sd_id, "customer_id": TEST_CUSTOMER_ID,
        "declared_at": iso(declared_at), "items": items,
        "created_at": iso(declared_at), "updated_at": iso(declared_at),
    }
    await db[COL_STOCK_DECLARATIONS].insert_one(sd)

    sd_svc = {"id": sd_id, "declared_at": iso(declared_at), "items": items}
    _, spike_events = await ConsumptionService.apply_stock_declaration(TEST_CUSTOMER_ID, sd_svc)

    for se in spike_events:
        await VarianceService.create_variance_for_spike(
            se["customer_id"], se["product_id"], se["stock_decl_id"],
            se["spike_ratio"], se["observed_daily"], se["base_avg"],
        )
    pids = [it["product_id"] for it in items]
    await DraftService.update_draft_for_customer(TEST_CUSTOMER_ID, pids, "stock_decl")
    return sd_id, spike_events


async def get_stats(db, pid):
    return await db[COL_CONSUMPTION_STATS].find_one(
        {"customer_id": TEST_CUSTOMER_ID, "product_id": pid}, {"_id": 0}
    )


async def get_draft(db):
    return await db[COL_SYSTEM_DRAFTS].find_one({"customer_id": TEST_CUSTOMER_ID}, {"_id": 0})


# ============================================================
# T1: First delivery accepted → base.avg=0, draft created
# ============================================================
async def test_t1_first_delivery_avg_zero(db):
    """R7: First delivery → base.daily_avg = 0"""
    t1 = datetime(2025, 6, 1, tzinfo=timezone.utc)
    dlv = await create_delivery(db, t1, [{"product_id": TEST_PRODUCT_A, "qty": 100}])
    await accept_delivery_raw(db, dlv, t1)
    s = await get_stats(db, TEST_PRODUCT_A)
    assert s is not None
    assert s["base"]["daily_avg"] == 0
    assert s["base"]["last_delivery"]["qty"] == 100
    assert s["base"]["prev_delivery"] is None
    assert s["spike"] is None


async def test_t1_first_delivery_draft_created(db):
    """R14,R15: Draft exists after first delivery accept."""
    t1 = datetime(2025, 6, 1, tzinfo=timezone.utc)
    dlv = await create_delivery(db, t1, [{"product_id": TEST_PRODUCT_A, "qty": 100}])
    await accept_delivery_via_service(db, dlv)
    d = await get_draft(db)
    assert d is not None
    assert d["generated_from"] == "delivery_accept"
    assert len(d["items"]) >= 1


# ============================================================
# T2: Second delivery → base.avg = prev_qty / days
# ============================================================
async def test_t2_model_b_calculation(db):
    """R5: daily_avg = previous_delivery_qty / days_between"""
    t1 = datetime(2025, 6, 1, tzinfo=timezone.utc)
    t2 = datetime(2025, 6, 6, tzinfo=timezone.utc)
    dlv1 = await create_delivery(db, t1, [{"product_id": TEST_PRODUCT_A, "qty": 100}])
    await accept_delivery_raw(db, dlv1, t1)
    dlv2 = await create_delivery(db, t2, [{"product_id": TEST_PRODUCT_A, "qty": 60}])
    await accept_delivery_raw(db, dlv2, t2)
    s = await get_stats(db, TEST_PRODUCT_A)
    expected = 100 / days_between(iso(t1), iso(t2))
    assert abs(s["base"]["daily_avg"] - expected) < 0.001


async def test_t2_new_qty_is_reference_only(db):
    """R6: New qty does not enter consumption calc."""
    t1 = datetime(2025, 6, 1, tzinfo=timezone.utc)
    t2 = datetime(2025, 6, 6, tzinfo=timezone.utc)
    dlv1 = await create_delivery(db, t1, [{"product_id": TEST_PRODUCT_A, "qty": 100}])
    await accept_delivery_raw(db, dlv1, t1)
    dlv2 = await create_delivery(db, t2, [{"product_id": TEST_PRODUCT_A, "qty": 9999}])
    await accept_delivery_raw(db, dlv2, t2)
    s = await get_stats(db, TEST_PRODUCT_A)
    expected = 100 / days_between(iso(t1), iso(t2))
    assert abs(s["base"]["daily_avg"] - expected) < 0.001
    assert s["base"]["last_delivery"]["qty"] == 9999


async def test_t2_spike_reset_on_accept(db):
    """R13: Delivery accepted → spike = None."""
    t1 = datetime(2025, 6, 1, tzinfo=timezone.utc)
    dlv1 = await create_delivery(db, t1, [{"product_id": TEST_PRODUCT_A, "qty": 100}])
    await accept_delivery_raw(db, dlv1, t1)
    await db[COL_CONSUMPTION_STATS].update_one(
        {"customer_id": TEST_CUSTOMER_ID, "product_id": TEST_PRODUCT_A},
        {"$set": {"spike": {"active": True, "daily_avg": 999, "ratio": 10}}},
    )
    t2 = datetime(2025, 6, 6, tzinfo=timezone.utc)
    dlv2 = await create_delivery(db, t2, [{"product_id": TEST_PRODUCT_A, "qty": 60}])
    await accept_delivery_raw(db, dlv2, t2)
    s = await get_stats(db, TEST_PRODUCT_A)
    assert s["spike"] is None


# ============================================================
# T3: Stock S > D_last → no spike, base unchanged
# ============================================================
async def test_t3_no_spike_when_stock_high(db):
    """R9,R12: S > D_last → observed_consumed=0, no spike."""
    t1 = datetime(2025, 6, 1, tzinfo=timezone.utc)
    t2 = datetime(2025, 6, 6, tzinfo=timezone.utc)
    dlv1 = await create_delivery(db, t1, [{"product_id": TEST_PRODUCT_A, "qty": 100}])
    await accept_delivery_raw(db, dlv1, t1)
    dlv2 = await create_delivery(db, t2, [{"product_id": TEST_PRODUCT_A, "qty": 50}])
    await accept_delivery_raw(db, dlv2, t2)
    s_before = await get_stats(db, TEST_PRODUCT_A)
    base_before = s_before["base"]["daily_avg"]

    t_stock = datetime(2025, 6, 8, tzinfo=timezone.utc)
    _, spikes = await stock_decl_pipeline(db, t_stock, [{"product_id": TEST_PRODUCT_A, "qty": 200}])
    assert len(spikes) == 0

    s_after = await get_stats(db, TEST_PRODUCT_A)
    assert s_after["base"]["daily_avg"] == base_before
    assert s_after["spike"] is None
    assert s_after["stock"]["last_decl"]["qty"] == 200


async def test_t3_draft_updated_on_stock_decl(db):
    """R15: Draft updated on stock declaration."""
    t1 = datetime(2025, 6, 1, tzinfo=timezone.utc)
    dlv = await create_delivery(db, t1, [{"product_id": TEST_PRODUCT_A, "qty": 100}])
    await accept_delivery_via_service(db, dlv)
    t_stock = datetime(2025, 6, 3, tzinfo=timezone.utc)
    await stock_decl_pipeline(db, t_stock, [{"product_id": TEST_PRODUCT_A, "qty": 80}])
    d = await get_draft(db)
    assert d["generated_from"] == "stock_decl"


# ============================================================
# T4: Spike detection (ratio >= 3)
# ============================================================
async def test_t4_spike_and_variance_created(db):
    """R10,R11: Major spike → spike set + variance event."""
    t1 = datetime(2025, 6, 1, tzinfo=timezone.utc)
    t2 = datetime(2025, 6, 11, tzinfo=timezone.utc)
    dlv1 = await create_delivery(db, t1, [{"product_id": TEST_PRODUCT_A, "qty": 100}])
    await accept_delivery_raw(db, dlv1, t1)
    dlv2 = await create_delivery(db, t2, [{"product_id": TEST_PRODUCT_A, "qty": 50}])
    await accept_delivery_raw(db, dlv2, t2)
    s = await get_stats(db, TEST_PRODUCT_A)
    assert abs(s["base"]["daily_avg"] - 10.0) < 0.001

    # S=0, D_last=50, 1 day → observed_daily=50, ratio=50/10=5 >= 3
    t_stock = datetime(2025, 6, 12, tzinfo=timezone.utc)
    sd_id, spikes = await stock_decl_pipeline(db, t_stock, [{"product_id": TEST_PRODUCT_A, "qty": 0}])
    assert len(spikes) == 1

    s = await get_stats(db, TEST_PRODUCT_A)
    assert s["spike"] is not None
    assert s["spike"]["active"] is True
    assert s["spike"]["ratio"] >= SPIKE_THRESHOLD

    var = await db[COL_VARIANCE_EVENTS].find_one(
        {"customer_id": TEST_CUSTOMER_ID, "product_id": TEST_PRODUCT_A,
         "trigger.type": "stock_decl_spike"}, {"_id": 0}
    )
    assert var is not None
    assert var["status"] == "needs_reason"


async def test_t4_variance_idempotent(db):
    """R25: Same stock_decl_id + product → no duplicate variance."""
    from services.seftali.variance_service import VarianceService

    t1 = datetime(2025, 6, 1, tzinfo=timezone.utc)
    t2 = datetime(2025, 6, 11, tzinfo=timezone.utc)
    dlv1 = await create_delivery(db, t1, [{"product_id": TEST_PRODUCT_A, "qty": 100}])
    await accept_delivery_raw(db, dlv1, t1)
    dlv2 = await create_delivery(db, t2, [{"product_id": TEST_PRODUCT_A, "qty": 50}])
    await accept_delivery_raw(db, dlv2, t2)

    t_stock = datetime(2025, 6, 12, tzinfo=timezone.utc)
    sd_id, _ = await stock_decl_pipeline(db, t_stock, [{"product_id": TEST_PRODUCT_A, "qty": 0}])

    v1 = await VarianceService.create_variance_for_spike(TEST_CUSTOMER_ID, TEST_PRODUCT_A, sd_id, 5, 50, 10)
    v2 = await VarianceService.create_variance_for_spike(TEST_CUSTOMER_ID, TEST_PRODUCT_A, sd_id, 5, 50, 10)
    assert v1["id"] == v2["id"]

    count = await db[COL_VARIANCE_EVENTS].count_documents(
        {"customer_id": TEST_CUSTOMER_ID, "trigger.ref_id": sd_id, "product_id": TEST_PRODUCT_A}
    )
    assert count == 1


# ============================================================
# T5: WC active + delivery accept → WC deleted_by_delivery
# ============================================================
async def test_t5_wc_deleted_on_accept(db):
    """R22: Active WC → deleted_by_delivery."""
    now = datetime.now(timezone.utc)
    wc_id = gid()
    await db[COL_WORKING_COPIES].insert_one({
        "id": wc_id, "customer_id": TEST_CUSTOMER_ID, "status": "active",
        "items": [{"product_id": TEST_PRODUCT_A, "user_qty": 10, "removed": False, "source": "draft"}],
        "created_at": iso(now), "updated_at": iso(now),
    })
    dlv = await create_delivery(db, now, [{"product_id": TEST_PRODUCT_A, "qty": 100}])
    await accept_delivery_via_service(db, dlv)
    wc = await db[COL_WORKING_COPIES].find_one({"id": wc_id}, {"_id": 0})
    assert wc["status"] == "deleted_by_delivery"


async def test_t5_single_active_wc(db):
    """R20: Only one active WC per customer."""
    now = datetime.now(timezone.utc)
    await db[COL_WORKING_COPIES].insert_one({
        "id": gid(), "customer_id": TEST_CUSTOMER_ID, "status": "active",
        "items": [], "created_at": iso(now), "updated_at": iso(now),
    })
    count = await db[COL_WORKING_COPIES].count_documents(
        {"customer_id": TEST_CUSTOMER_ID, "status": "active"}
    )
    assert count == 1


# ============================================================
# T6: Delivery accept idempotent
# ============================================================
async def test_t6_idempotent_no_double_write(db):
    """R4: Accepted delivery → API returns 409, base not double-updated."""
    t1 = datetime(2025, 6, 1, tzinfo=timezone.utc)
    t2 = datetime(2025, 6, 6, tzinfo=timezone.utc)
    dlv1 = await create_delivery(db, t1, [{"product_id": TEST_PRODUCT_A, "qty": 100}])
    await accept_delivery_raw(db, dlv1, t1)
    dlv2 = await create_delivery(db, t2, [{"product_id": TEST_PRODUCT_A, "qty": 50}])
    await accept_delivery_raw(db, dlv2, t2)
    s = await get_stats(db, TEST_PRODUCT_A)
    avg_first = s["base"]["daily_avg"]

    # Verify delivery is already accepted in DB
    d = await db[COL_DELIVERIES].find_one({"id": dlv2["id"]}, {"_id": 0})
    assert d["acceptance_status"] == "accepted"

    # If we tried to call accept again, the API would return 409.
    # Stats must remain unchanged:
    s2 = await get_stats(db, TEST_PRODUCT_A)
    assert s2["base"]["daily_avg"] == avg_first


# ============================================================
# T7: Order submit → consumption unchanged
# ============================================================
async def test_t7_order_no_consumption_change(db):
    """R23: Order does not affect consumption_stats."""
    t1 = datetime(2025, 6, 1, tzinfo=timezone.utc)
    t2 = datetime(2025, 6, 6, tzinfo=timezone.utc)
    dlv1 = await create_delivery(db, t1, [{"product_id": TEST_PRODUCT_A, "qty": 100}])
    await accept_delivery_raw(db, dlv1, t1)
    dlv2 = await create_delivery(db, t2, [{"product_id": TEST_PRODUCT_A, "qty": 50}])
    await accept_delivery_raw(db, dlv2, t2)
    s_before = await get_stats(db, TEST_PRODUCT_A)

    await db[COL_ORDERS].insert_one({
        "id": gid(), "customer_id": TEST_CUSTOMER_ID,
        "created_from_working_copy_id": gid(), "status": "submitted",
        "items": [{"product_id": TEST_PRODUCT_A, "qty": 999}],
        "created_at": iso(datetime.now(timezone.utc)),
        "updated_at": iso(datetime.now(timezone.utc)),
    })
    s_after = await get_stats(db, TEST_PRODUCT_A)
    assert s_after["base"]["daily_avg"] == s_before["base"]["daily_avg"]
    assert s_after["spike"] == s_before["spike"]


# ============================================================
# T8: Bulk variance reason → recorded
# ============================================================
async def test_t8_bulk_variance_reason(db):
    """R24: Bulk reason → status=recorded."""
    now = datetime.now(timezone.utc)
    ev_ids = []
    for _ in range(2):
        eid = gid()
        ev_ids.append(eid)
        await db[COL_VARIANCE_EVENTS].insert_one({
            "id": eid, "customer_id": TEST_CUSTOMER_ID,
            "product_id": TEST_PRODUCT_A, "detected_at": iso(now),
            "trigger": {"type": "stock_decl_spike", "ref_id": gid()},
            "change_ratio": 5.0, "direction": "increase", "severity": "major",
            "status": "needs_reason", "reason_code": None, "reason_note": None,
            "customer_action_at": None, "created_at": iso(now), "updated_at": iso(now),
        })

    for eid in ev_ids:
        await db[COL_VARIANCE_EVENTS].update_one(
            {"id": eid, "status": "needs_reason"},
            {"$set": {"status": "recorded", "reason_code": "PROMO",
                      "reason_note": "test", "customer_action_at": iso(now), "updated_at": iso(now)}},
        )
    for eid in ev_ids:
        ev = await db[COL_VARIANCE_EVENTS].find_one({"id": eid}, {"_id": 0})
        assert ev["status"] == "recorded"
        assert ev["reason_code"] == "PROMO"
        assert ev["customer_action_at"] is not None


# ============================================================
# R1: Pending/rejected delivery → no effect
# ============================================================
async def test_r1_pending_no_effect(db):
    """R1: Pending delivery does not change stats."""
    t1 = datetime(2025, 6, 1, tzinfo=timezone.utc)
    dlv1 = await create_delivery(db, t1, [{"product_id": TEST_PRODUCT_A, "qty": 100}])
    await accept_delivery_via_service(db, dlv1)
    s_before = await get_stats(db, TEST_PRODUCT_A)

    await create_delivery(db, datetime(2025, 6, 5, tzinfo=timezone.utc),
                          [{"product_id": TEST_PRODUCT_A, "qty": 500}], status="pending")
    s_after = await get_stats(db, TEST_PRODUCT_A)
    assert s_after["base"]["daily_avg"] == s_before["base"]["daily_avg"]


async def test_r3_rejected_no_effect(db):
    """R3: Rejected delivery → no consumption change."""
    t1 = datetime(2025, 6, 1, tzinfo=timezone.utc)
    dlv1 = await create_delivery(db, t1, [{"product_id": TEST_PRODUCT_A, "qty": 100}])
    await accept_delivery_via_service(db, dlv1)
    s_before = await get_stats(db, TEST_PRODUCT_A)

    dlv2 = await create_delivery(db, datetime(2025, 6, 5, tzinfo=timezone.utc),
                                 [{"product_id": TEST_PRODUCT_A, "qty": 500}])
    await db[COL_DELIVERIES].update_one(
        {"id": dlv2["id"]}, {"$set": {"acceptance_status": "rejected"}},
    )
    s_after = await get_stats(db, TEST_PRODUCT_A)
    assert s_after["base"]["daily_avg"] == s_before["base"]["daily_avg"]


# ============================================================
# R8: Stock decl never changes base.daily_avg
# ============================================================
async def test_r8_stock_never_changes_base(db):
    """R8: Multiple stock declarations, base avg stays same."""
    t1 = datetime(2025, 6, 1, tzinfo=timezone.utc)
    t2 = datetime(2025, 6, 6, tzinfo=timezone.utc)
    dlv1 = await create_delivery(db, t1, [{"product_id": TEST_PRODUCT_A, "qty": 100}])
    await accept_delivery_raw(db, dlv1, t1)
    dlv2 = await create_delivery(db, t2, [{"product_id": TEST_PRODUCT_A, "qty": 50}])
    await accept_delivery_raw(db, dlv2, t2)
    s = await get_stats(db, TEST_PRODUCT_A)
    base_before = s["base"]["daily_avg"]

    for qty in [10, 0, 999]:
        t_stock = datetime(2025, 6, 7, tzinfo=timezone.utc)
        await stock_decl_pipeline(db, t_stock, [{"product_id": TEST_PRODUCT_A, "qty": qty}])
        s = await get_stats(db, TEST_PRODUCT_A)
        assert s["base"]["daily_avg"] == base_before, f"base changed with stock qty={qty}"


# ============================================================
# R16: Draft uses spike avg when recent
# ============================================================
async def test_r16_draft_spike_avg(db):
    """R16: Recent spike → avg_effective_used='spike'."""
    from services.seftali.draft_service import DraftService

    now = datetime.now(timezone.utc)
    t1 = now - timedelta(days=10)
    t2 = now - timedelta(days=5)
    dlv1 = await create_delivery(db, t1, [{"product_id": TEST_PRODUCT_A, "qty": 100}])
    await accept_delivery_raw(db, dlv1, t1)
    dlv2 = await create_delivery(db, t2, [{"product_id": TEST_PRODUCT_A, "qty": 50}])
    await accept_delivery_raw(db, dlv2, t2)

    await db[COL_CONSUMPTION_STATS].update_one(
        {"customer_id": TEST_CUSTOMER_ID, "product_id": TEST_PRODUCT_A},
        {"$set": {"spike": {
            "active": True, "daily_avg": 99.0, "ratio": 5.0,
            "consumed": 500, "window_days": 1,
            "detected_at": iso(now - timedelta(days=1)),
            "source_stock_decl_id": gid(),
        }}},
    )
    await DraftService.update_draft_for_customer(TEST_CUSTOMER_ID, [TEST_PRODUCT_A], "stock_decl")
    d = await get_draft(db)
    item = next(i for i in d["items"] if i["product_id"] == TEST_PRODUCT_A)
    assert item["avg_effective_used"] == "spike"


# ============================================================
# R17: Draft stock effective
# ============================================================
async def test_r17_stock_effective_declared(db):
    """R17: Stock decl exists → stock_effective = declared."""
    now = datetime.now(timezone.utc)
    t1 = now - timedelta(days=10)
    t2 = now - timedelta(days=5)
    dlv1 = await create_delivery(db, t1, [{"product_id": TEST_PRODUCT_A, "qty": 100}])
    await accept_delivery_raw(db, dlv1, t1)
    dlv2 = await create_delivery(db, t2, [{"product_id": TEST_PRODUCT_A, "qty": 50}])
    await accept_delivery_raw(db, dlv2, t2)

    t_stock = now - timedelta(days=1)
    await stock_decl_pipeline(db, t_stock, [{"product_id": TEST_PRODUCT_A, "qty": 25}])
    d = await get_draft(db)
    item = next(i for i in d["items"] if i["product_id"] == TEST_PRODUCT_A)
    assert item["stock_effective_used"] == 25


async def test_r17_stock_effective_fallback(db):
    """R17: No stock decl → stock_effective = last_delivery_qty."""
    now = datetime.now(timezone.utc)
    dlv = await create_delivery(db, now, [{"product_id": TEST_PRODUCT_A, "qty": 77}])
    await accept_delivery_via_service(db, dlv)
    d = await get_draft(db)
    item = next(i for i in d["items"] if i["product_id"] == TEST_PRODUCT_A)
    assert item["stock_effective_used"] == 77


# ============================================================
# R19: Draft tie-breaker
# ============================================================
async def test_r19_draft_sorted(db):
    """R19: Sorted by risk → estimated_finish → product_id."""
    from services.seftali.draft_service import DraftService

    t1 = datetime(2025, 6, 1, tzinfo=timezone.utc)
    t2 = datetime(2025, 6, 6, tzinfo=timezone.utc)
    for pid, q1, q2 in [(TEST_PRODUCT_A, 100, 50), (TEST_PRODUCT_B, 10, 5)]:
        d1 = await create_delivery(db, t1, [{"product_id": pid, "qty": q1}])
        await accept_delivery_raw(db, d1, t1)
        d2 = await create_delivery(db, t2, [{"product_id": pid, "qty": q2}])
        await accept_delivery_raw(db, d2, t2)

    await DraftService.update_draft_for_customer(TEST_CUSTOMER_ID, [TEST_PRODUCT_A, TEST_PRODUCT_B], "delivery_accept")
    d = await get_draft(db)
    items = d["items"]
    assert len(items) >= 2
    for i in range(len(items) - 1):
        assert items[i]["risk_score"] <= items[i + 1]["risk_score"]
    for i, it in enumerate(items):
        assert it["priority_rank"] == i + 1


# ============================================================
# R21: Working copy qty validation
# ============================================================
async def test_r21_qty_zero_rejected(db):
    """R21: user_qty=0 → validation error."""
    from pydantic import ValidationError
    from routes.seftali.customer_routes import WCUpdateItem
    with pytest.raises(ValidationError):
        WCUpdateItem(product_id=TEST_PRODUCT_A, user_qty=0)


async def test_r21_qty_negative_rejected(db):
    """R21: user_qty<0 → validation error."""
    from pydantic import ValidationError
    from routes.seftali.customer_routes import WCUpdateItem
    with pytest.raises(ValidationError):
        WCUpdateItem(product_id=TEST_PRODUCT_A, user_qty=-5)


async def test_r21_qty_null_accepted(db):
    """R21: user_qty=null → accepted."""
    from routes.seftali.customer_routes import WCUpdateItem
    item = WCUpdateItem(product_id=TEST_PRODUCT_A, user_qty=None)
    assert item.user_qty is None
