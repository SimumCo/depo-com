import math
import uuid
from datetime import datetime, timezone, timedelta

EPSILON = 1e-6
SPIKE_RATIO_THRESHOLD = 3.0
SPIKE_RECENCY_DAYS = 7

# Collection names (prefixed to avoid conflicts with existing collections)
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

DAY_MAP = {"MON": 0, "TUE": 1, "WED": 2, "THU": 3, "FRI": 4, "SAT": 5, "SUN": 6}


def gen_id():
    return str(uuid.uuid4())


def days_between(dt1, dt2):
    if isinstance(dt1, str):
        dt1 = datetime.fromisoformat(dt1)
    if isinstance(dt2, str):
        dt2 = datetime.fromisoformat(dt2)
    diff = abs((dt2 - dt1).total_seconds()) / 86400
    return max(math.ceil(diff), 1)


def now_utc():
    return datetime.now(timezone.utc)


def to_iso(dt):
    if isinstance(dt, datetime):
        return dt.isoformat()
    return dt


def parse_iso(s):
    if isinstance(s, str):
        return datetime.fromisoformat(s)
    return s


def days_to_next_route(route_days):
    if not route_days:
        return 7
    today = now_utc().weekday()
    route_weekdays = [DAY_MAP.get(d, 0) for d in route_days]
    min_days = 8
    for rd in route_weekdays:
        diff = (rd - today) % 7
        if diff == 0:
            diff = 7
        if diff < min_days:
            min_days = diff
    return min_days


def next_route_date(route_days):
    days = days_to_next_route(route_days)
    return now_utc() + timedelta(days=days)


def std_resp(success, data=None, message=""):
    resp = {"success": success}
    if data is not None:
        resp["data"] = data
    if message:
        resp["message"] = message
    return resp
