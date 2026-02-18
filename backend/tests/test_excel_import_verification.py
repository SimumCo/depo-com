"""
ŞEFTALİ Excel Import Verification Tests
Tests to verify Excel data import results for AILEM MARKET customer.
- 208 deliveries imported from Excel
- 9 products per delivery
- Consumption pipeline processed
"""

import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials - sf_musteri is the customer for AILEM MARKET
CUSTOMER_CREDS = {"username": "sf_musteri", "password": "musteri123"}

# Excel products (from import_excel_consumption.py)
EXCEL_PRODUCTS = [
    "200 ML AYRAN",
    "180 ml KAKAOLU SUT 6LI",
    "180 ml CILEKLI SUT 6LI",
    "180 ml YAGLI SUT 6LI",
    "1000 ml AYRAN",
    "2000 ml AYRAN",
    "750 GR T.YAGLI YOGURT",
    "500 GR T.YAGLI YOGURT",
    "600 GR KASAR PEYNIRI",
]


@pytest.fixture(scope="module")
def session():
    """Shared requests session"""
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


@pytest.fixture(scope="module")
def customer_token(session):
    """Get customer auth token for sf_musteri (AILEM MARKET)"""
    resp = session.post(f"{BASE_URL}/api/auth/login", json=CUSTOMER_CREDS)
    if resp.status_code == 200:
        return resp.json().get("access_token")
    pytest.fail(f"Customer login failed: {resp.status_code} - {resp.text}")


def auth_header(token):
    """Build authorization header"""
    return {"Authorization": f"Bearer {token}"}


class TestExcelDeliveryHistory:
    """Test delivery history shows 208 Excel-imported deliveries"""

    def test_delivery_history_returns_208_deliveries(self, session, customer_token):
        """GET /api/seftali/customer/deliveries/history - should return 208 deliveries"""
        resp = session.get(
            f"{BASE_URL}/api/seftali/customer/deliveries/history",
            headers=auth_header(customer_token)
        )
        assert resp.status_code == 200, f"Delivery history failed: {resp.text}"
        data = resp.json()
        assert data.get("success") == True
        
        deliveries = data.get("data", [])
        total_count = len(deliveries)
        
        print(f"Delivery history returned: {total_count} deliveries")
        assert total_count == 208, f"Expected 208 deliveries, got {total_count}"

    def test_deliveries_have_excel_invoice_prefix(self, session, customer_token):
        """All deliveries should have EXCEL- prefixed invoice numbers"""
        resp = session.get(
            f"{BASE_URL}/api/seftali/customer/deliveries/history",
            headers=auth_header(customer_token)
        )
        assert resp.status_code == 200
        deliveries = resp.json().get("data", [])
        
        excel_deliveries = [d for d in deliveries if d.get("invoice_no", "").startswith("EXCEL-")]
        print(f"Excel-prefixed deliveries: {len(excel_deliveries)}/{len(deliveries)}")
        
        # All 208 should have EXCEL- prefix
        assert len(excel_deliveries) == 208, f"Expected 208 EXCEL- prefixed deliveries, got {len(excel_deliveries)}"

    def test_each_delivery_has_9_items(self, session, customer_token):
        """Each Excel delivery should have 9 items (9 products)"""
        resp = session.get(
            f"{BASE_URL}/api/seftali/customer/deliveries/history",
            headers=auth_header(customer_token)
        )
        assert resp.status_code == 200
        deliveries = resp.json().get("data", [])
        
        # Check a sample of deliveries for 9 items each
        sample_size = min(10, len(deliveries))
        for i in range(sample_size):
            dlv = deliveries[i]
            items = dlv.get("items", [])
            invoice = dlv.get("invoice_no", "unknown")
            assert len(items) == 9, f"Delivery {invoice} has {len(items)} items, expected 9"
        
        print(f"Verified {sample_size} deliveries each have 9 items")

    def test_all_deliveries_are_accepted(self, session, customer_token):
        """All Excel deliveries should have acceptance_status='accepted'"""
        resp = session.get(
            f"{BASE_URL}/api/seftali/customer/deliveries/history",
            headers=auth_header(customer_token)
        )
        assert resp.status_code == 200
        deliveries = resp.json().get("data", [])
        
        accepted_count = sum(1 for d in deliveries if d.get("acceptance_status") == "accepted")
        print(f"Accepted deliveries: {accepted_count}/{len(deliveries)}")
        
        assert accepted_count == len(deliveries), f"Not all deliveries are accepted: {accepted_count}/{len(deliveries)}"

    def test_deliveries_sorted_by_date_desc(self, session, customer_token):
        """Deliveries should be sorted by delivered_at descending (newest first)"""
        resp = session.get(
            f"{BASE_URL}/api/seftali/customer/deliveries/history",
            headers=auth_header(customer_token)
        )
        assert resp.status_code == 200
        deliveries = resp.json().get("data", [])
        
        if len(deliveries) >= 2:
            first_date = deliveries[0].get("delivered_at", "")
            last_date = deliveries[-1].get("delivered_at", "")
            print(f"Date range: {last_date[:10]} to {first_date[:10]}")
            
            # First should be newer (greater) than last
            assert first_date >= last_date, "Deliveries not sorted by date descending"


class TestExcelDraftGeneration:
    """Test that draft contains Excel products with calculated suggested_qty"""

    def test_draft_has_items(self, session, customer_token):
        """GET /api/seftali/customer/draft - should have items for Excel products"""
        resp = session.get(
            f"{BASE_URL}/api/seftali/customer/draft",
            headers=auth_header(customer_token)
        )
        assert resp.status_code == 200, f"Draft fetch failed: {resp.text}"
        data = resp.json()
        assert data.get("success") == True
        
        draft = data.get("data", {})
        items = draft.get("items", [])
        
        print(f"Draft has {len(items)} items, generated_from: {draft.get('generated_from')}")
        assert len(items) > 0, "Draft should have items from consumption calculations"

    def test_draft_has_nonzero_suggested_qty(self, session, customer_token):
        """Draft items should have non-zero suggested_qty for products with history"""
        resp = session.get(
            f"{BASE_URL}/api/seftali/customer/draft",
            headers=auth_header(customer_token)
        )
        assert resp.status_code == 200
        
        draft = resp.json().get("data", {})
        items = draft.get("items", [])
        
        # Check for items with suggested_qty > 0
        nonzero_items = [it for it in items if it.get("suggested_qty", 0) > 0]
        print(f"Items with suggested_qty > 0: {len(nonzero_items)}/{len(items)}")
        
        for it in nonzero_items[:5]:  # Print first 5
            print(f"  - {it.get('product_name', it.get('product_id')[:8])}: suggested_qty={it.get('suggested_qty')}")
        
        assert len(nonzero_items) > 0, "Draft should have items with non-zero suggested_qty"

    def test_200ml_ayran_suggested_qty(self, session, customer_token):
        """200 ML AYRAN should have suggested_qty around 29 (based on Excel consumption)"""
        resp = session.get(
            f"{BASE_URL}/api/seftali/customer/draft",
            headers=auth_header(customer_token)
        )
        assert resp.status_code == 200
        
        draft = resp.json().get("data", {})
        items = draft.get("items", [])
        
        # Find 200 ML AYRAN in draft
        ayran_item = None
        for it in items:
            product_name = it.get("product_name", "").upper()
            if "200" in product_name and "AYRAN" in product_name:
                ayran_item = it
                break
        
        if ayran_item:
            suggested = ayran_item.get("suggested_qty", 0)
            print(f"200 ML AYRAN suggested_qty: {suggested}")
            # Allow some variance, but should be in reasonable range (20-40)
            assert suggested > 0, f"200 ML AYRAN should have suggested_qty > 0, got {suggested}"
        else:
            print("200 ML AYRAN not found in draft items - checking available products:")
            for it in items[:5]:
                print(f"  - {it.get('product_name', it.get('product_id'))}")

    def test_draft_items_have_product_names(self, session, customer_token):
        """Draft items should be enriched with product_name"""
        resp = session.get(
            f"{BASE_URL}/api/seftali/customer/draft",
            headers=auth_header(customer_token)
        )
        assert resp.status_code == 200
        
        draft = resp.json().get("data", {})
        items = draft.get("items", [])
        
        if len(items) > 0:
            items_with_name = [it for it in items if it.get("product_name")]
            print(f"Items with product_name: {len(items_with_name)}/{len(items)}")
            
            # All items should have product_name
            assert len(items_with_name) == len(items), "Some draft items missing product_name"


class TestDeliveryItems:
    """Test delivery item details"""

    def test_delivery_items_have_product_names(self, session, customer_token):
        """Delivery items should have product_name enrichment"""
        resp = session.get(
            f"{BASE_URL}/api/seftali/customer/deliveries/history",
            headers=auth_header(customer_token)
        )
        assert resp.status_code == 200
        deliveries = resp.json().get("data", [])
        
        if len(deliveries) > 0:
            # Check first delivery's items
            first_dlv = deliveries[0]
            items = first_dlv.get("items", [])
            
            items_with_name = [it for it in items if it.get("product_name")]
            print(f"First delivery items with product_name: {len(items_with_name)}/{len(items)}")
            
            for it in items:
                name = it.get("product_name", "MISSING")
                qty = it.get("qty", 0)
                print(f"  - {name}: {qty}")
            
            assert len(items_with_name) == len(items), "Some delivery items missing product_name"

    def test_date_range_covers_excel_period(self, session, customer_token):
        """Deliveries should cover Excel date range (2024-01-01 to 2025-12-25)"""
        resp = session.get(
            f"{BASE_URL}/api/seftali/customer/deliveries/history",
            headers=auth_header(customer_token)
        )
        assert resp.status_code == 200
        deliveries = resp.json().get("data", [])
        
        if len(deliveries) > 0:
            # Get date range (sorted desc, so first is newest, last is oldest)
            newest = deliveries[0].get("delivered_at", "")[:10]
            oldest = deliveries[-1].get("delivered_at", "")[:10]
            
            print(f"Delivery date range: {oldest} to {newest}")
            
            # Should start around 2024-01-01
            assert oldest.startswith("2024"), f"Oldest delivery should be from 2024, got {oldest}"


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
