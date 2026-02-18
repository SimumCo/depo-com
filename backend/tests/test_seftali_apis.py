"""
ŞEFTALİ Module Backend API Tests
Tests customer, sales, and admin endpoints for the yogurt/ayran distribution system.
"""

import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
CUSTOMER_CREDS = {"username": "sf_musteri", "password": "musteri123"}
CUSTOMER2_CREDS = {"username": "sf_musteri2", "password": "musteri123"}
SALES_REP_CREDS = {"username": "sf_satici", "password": "satici123"}
PLASIYER_CREDS = {"username": "sf_plasiyer", "password": "plasiyer123"}
ADMIN_CREDS = {"username": "admin", "password": "admin123"}


# ========= FIXTURES =========
@pytest.fixture(scope="module")
def session():
    """Shared requests session"""
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


@pytest.fixture(scope="module")
def customer_token(session):
    """Get customer auth token"""
    resp = session.post(f"{BASE_URL}/api/auth/login", json=CUSTOMER_CREDS)
    if resp.status_code == 200:
        return resp.json().get("access_token")
    pytest.skip(f"Customer login failed: {resp.status_code} - {resp.text}")


@pytest.fixture(scope="module")
def customer2_token(session):
    """Get customer2 auth token"""
    resp = session.post(f"{BASE_URL}/api/auth/login", json=CUSTOMER2_CREDS)
    if resp.status_code == 200:
        return resp.json().get("access_token")
    pytest.skip(f"Customer2 login failed: {resp.status_code} - {resp.text}")


@pytest.fixture(scope="module")
def sales_token(session):
    """Get sales rep auth token"""
    resp = session.post(f"{BASE_URL}/api/auth/login", json=SALES_REP_CREDS)
    if resp.status_code == 200:
        return resp.json().get("access_token")
    pytest.skip(f"Sales login failed: {resp.status_code} - {resp.text}")


@pytest.fixture(scope="module")
def plasiyer_token(session):
    """Get sales agent (plasiyer) auth token"""
    resp = session.post(f"{BASE_URL}/api/auth/login", json=PLASIYER_CREDS)
    if resp.status_code == 200:
        return resp.json().get("access_token")
    pytest.skip(f"Plasiyer login failed: {resp.status_code} - {resp.text}")


@pytest.fixture(scope="module")
def admin_token(session):
    """Get admin auth token"""
    resp = session.post(f"{BASE_URL}/api/auth/login", json=ADMIN_CREDS)
    if resp.status_code == 200:
        return resp.json().get("access_token")
    pytest.skip(f"Admin login failed: {resp.status_code} - {resp.text}")


def auth_header(token):
    """Build authorization header"""
    return {"Authorization": f"Bearer {token}"}


# ========= AUTHENTICATION TESTS =========
class TestAuthentication:
    """Test login for all user types"""

    def test_customer_login(self, session):
        """Customer (sf_musteri) login"""
        resp = session.post(f"{BASE_URL}/api/auth/login", json=CUSTOMER_CREDS)
        assert resp.status_code == 200, f"Customer login failed: {resp.text}"
        data = resp.json()
        assert "access_token" in data
        print(f"Customer login successful, role: {data.get('user', {}).get('role')}")

    def test_customer2_login(self, session):
        """Customer2 (sf_musteri2) login"""
        resp = session.post(f"{BASE_URL}/api/auth/login", json=CUSTOMER2_CREDS)
        assert resp.status_code == 200, f"Customer2 login failed: {resp.text}"

    def test_sales_rep_login(self, session):
        """Sales rep (sf_satici) login"""
        resp = session.post(f"{BASE_URL}/api/auth/login", json=SALES_REP_CREDS)
        assert resp.status_code == 200, f"Sales rep login failed: {resp.text}"
        data = resp.json()
        assert "access_token" in data
        print(f"Sales login successful, role: {data.get('user', {}).get('role')}")

    def test_plasiyer_login(self, session):
        """Sales agent/Plasiyer (sf_plasiyer) login"""
        resp = session.post(f"{BASE_URL}/api/auth/login", json=PLASIYER_CREDS)
        assert resp.status_code == 200, f"Plasiyer login failed: {resp.text}"

    def test_admin_login(self, session):
        """Admin login"""
        resp = session.post(f"{BASE_URL}/api/auth/login", json=ADMIN_CREDS)
        assert resp.status_code == 200, f"Admin login failed: {resp.text}"
        data = resp.json()
        assert "access_token" in data
        print(f"Admin login successful, role: {data.get('user', {}).get('role')}")


# ========= CUSTOMER API TESTS =========
class TestCustomerAPIs:
    """Customer endpoint tests"""

    def test_get_profile(self, session, customer_token):
        """GET /api/seftali/customer/profile"""
        resp = session.get(
            f"{BASE_URL}/api/seftali/customer/profile",
            headers=auth_header(customer_token)
        )
        assert resp.status_code == 200, f"Profile fetch failed: {resp.text}"
        data = resp.json()
        assert data.get("success") == True
        assert "data" in data
        print(f"Customer profile fetched: {data.get('data', {}).get('name')}")

    def test_get_products(self, session, customer_token):
        """GET /api/seftali/customer/products"""
        resp = session.get(
            f"{BASE_URL}/api/seftali/customer/products",
            headers=auth_header(customer_token)
        )
        assert resp.status_code == 200, f"Products fetch failed: {resp.text}"
        data = resp.json()
        assert data.get("success") == True
        products = data.get("data", [])
        assert isinstance(products, list)
        print(f"Products fetched: {len(products)} items")

    def test_get_draft(self, session, customer_token):
        """GET /api/seftali/customer/draft"""
        resp = session.get(
            f"{BASE_URL}/api/seftali/customer/draft",
            headers=auth_header(customer_token)
        )
        assert resp.status_code == 200, f"Draft fetch failed: {resp.text}"
        data = resp.json()
        assert data.get("success") == True
        draft = data.get("data", {})
        items = draft.get("items", [])
        print(f"Draft fetched: {len(items)} items, generated_from: {draft.get('generated_from')}")

    def test_get_pending_deliveries(self, session, customer_token):
        """GET /api/seftali/customer/deliveries/pending"""
        resp = session.get(
            f"{BASE_URL}/api/seftali/customer/deliveries/pending",
            headers=auth_header(customer_token)
        )
        assert resp.status_code == 200, f"Pending deliveries fetch failed: {resp.text}"
        data = resp.json()
        assert data.get("success") == True
        deliveries = data.get("data", [])
        print(f"Pending deliveries: {len(deliveries)}")

    def test_get_pending_variance(self, session, customer_token):
        """GET /api/seftali/customer/variance/pending"""
        resp = session.get(
            f"{BASE_URL}/api/seftali/customer/variance/pending",
            headers=auth_header(customer_token)
        )
        assert resp.status_code == 200, f"Variance fetch failed: {resp.text}"
        data = resp.json()
        assert data.get("success") == True
        print(f"Pending variance events: {len(data.get('data', []))}")


class TestCustomerDeliveryAccept:
    """Test delivery accept/reject flow"""

    def test_accept_delivery_double_accept_returns_409(self, session, customer_token):
        """Test that accepting an already accepted delivery returns 409"""
        # First get pending deliveries
        resp = session.get(
            f"{BASE_URL}/api/seftali/customer/deliveries/pending",
            headers=auth_header(customer_token)
        )
        assert resp.status_code == 200
        deliveries = resp.json().get("data", [])
        
        if len(deliveries) == 0:
            pytest.skip("No pending deliveries to test")
        
        delivery_id = deliveries[0]["id"]
        
        # Accept delivery
        accept_resp = session.post(
            f"{BASE_URL}/api/seftali/customer/deliveries/{delivery_id}/accept",
            headers=auth_header(customer_token)
        )
        assert accept_resp.status_code == 200, f"First accept failed: {accept_resp.text}"
        print(f"First accept successful for delivery {delivery_id[:8]}")
        
        # Try to accept again - should return 409
        double_resp = session.post(
            f"{BASE_URL}/api/seftali/customer/deliveries/{delivery_id}/accept",
            headers=auth_header(customer_token)
        )
        assert double_resp.status_code == 409, f"Expected 409 on double accept, got {double_resp.status_code}"
        print("Double accept correctly returned 409")


class TestCustomerStockDeclaration:
    """Test stock declaration flow"""

    def test_create_stock_declaration(self, session, customer_token):
        """POST /api/seftali/customer/stock-declarations"""
        # First get products
        prod_resp = session.get(
            f"{BASE_URL}/api/seftali/customer/products",
            headers=auth_header(customer_token)
        )
        products = prod_resp.json().get("data", [])
        if not products:
            pytest.skip("No products available for stock declaration")
        
        # Create stock declaration with first product
        payload = {
            "items": [{"product_id": products[0]["id"], "qty": 50}]
        }
        resp = session.post(
            f"{BASE_URL}/api/seftali/customer/stock-declarations",
            json=payload,
            headers=auth_header(customer_token)
        )
        assert resp.status_code == 200, f"Stock declaration failed: {resp.text}"
        data = resp.json()
        assert data.get("success") == True
        print(f"Stock declaration created, spikes detected: {data.get('data', {}).get('spikes_detected', 0)}")

    def test_stock_declaration_no_duplicate_products(self, session, customer_token):
        """Test that duplicate product_ids in stock declaration returns 422"""
        prod_resp = session.get(
            f"{BASE_URL}/api/seftali/customer/products",
            headers=auth_header(customer_token)
        )
        products = prod_resp.json().get("data", [])
        if not products:
            pytest.skip("No products available")
        
        # Try to create with duplicate product_id
        payload = {
            "items": [
                {"product_id": products[0]["id"], "qty": 10},
                {"product_id": products[0]["id"], "qty": 20}  # duplicate
            ]
        }
        resp = session.post(
            f"{BASE_URL}/api/seftali/customer/stock-declarations",
            json=payload,
            headers=auth_header(customer_token)
        )
        assert resp.status_code == 422, f"Expected 422 for duplicate product_ids, got {resp.status_code}"
        print("Duplicate product_id validation works correctly")


class TestCustomerWorkingCopy:
    """Test working copy flow"""

    def test_start_working_copy(self, session, customer_token):
        """POST /api/seftali/customer/working-copy/start"""
        resp = session.post(
            f"{BASE_URL}/api/seftali/customer/working-copy/start",
            headers=auth_header(customer_token)
        )
        assert resp.status_code == 200, f"Start working copy failed: {resp.text}"
        data = resp.json()
        assert data.get("success") == True
        wc = data.get("data", {})
        assert "id" in wc
        print(f"Working copy started/retrieved: {wc.get('id')[:8]}, status: {wc.get('status')}")
        return wc

    def test_working_copy_user_qty_zero_returns_400(self, session, customer_token):
        """Test that user_qty = 0 returns 400 (should use removed flag instead)"""
        # Start working copy first
        start_resp = session.post(
            f"{BASE_URL}/api/seftali/customer/working-copy/start",
            headers=auth_header(customer_token)
        )
        wc = start_resp.json().get("data", {})
        wc_id = wc.get("id")
        items = wc.get("items", [])
        
        if not items:
            pytest.skip("No items in working copy to test")
        
        # Try to update with user_qty = 0
        payload = [{"product_id": items[0]["product_id"], "user_qty": 0, "removed": False}]
        resp = session.patch(
            f"{BASE_URL}/api/seftali/customer/working-copy/{wc_id}",
            json=payload,
            headers=auth_header(customer_token)
        )
        # Should return 422 validation error for user_qty = 0
        assert resp.status_code == 422, f"Expected 422 for user_qty=0, got {resp.status_code}: {resp.text}"
        print("user_qty=0 validation works correctly (returns 422)")


# ========= SALES API TESTS =========
class TestSalesAPIs:
    """Sales endpoint tests"""

    def test_list_customers(self, session, sales_token):
        """GET /api/seftali/sales/customers"""
        resp = session.get(
            f"{BASE_URL}/api/seftali/sales/customers",
            headers=auth_header(sales_token)
        )
        assert resp.status_code == 200, f"List customers failed: {resp.text}"
        data = resp.json()
        assert data.get("success") == True
        customers = data.get("data", [])
        print(f"Sales: {len(customers)} customers fetched")
        return customers

    def test_list_products(self, session, sales_token):
        """GET /api/seftali/sales/products"""
        resp = session.get(
            f"{BASE_URL}/api/seftali/sales/products",
            headers=auth_header(sales_token)
        )
        assert resp.status_code == 200, f"List products failed: {resp.text}"
        data = resp.json()
        assert data.get("success") == True
        products = data.get("data", [])
        print(f"Sales: {len(products)} products fetched")
        return products

    def test_create_delivery(self, session, sales_token):
        """POST /api/seftali/sales/deliveries - create delivery for customer"""
        # Get customers and products
        cust_resp = session.get(f"{BASE_URL}/api/seftali/sales/customers", headers=auth_header(sales_token))
        prod_resp = session.get(f"{BASE_URL}/api/seftali/sales/products", headers=auth_header(sales_token))
        
        customers = cust_resp.json().get("data", [])
        products = prod_resp.json().get("data", [])
        
        if not customers or not products:
            pytest.skip("No customers or products available")
        
        payload = {
            "customer_id": customers[0]["id"],
            "delivery_type": "route",
            "invoice_no": f"TEST-FTR-{os.urandom(4).hex().upper()}",
            "items": [{"product_id": products[0]["id"], "qty": 100}]
        }
        resp = session.post(
            f"{BASE_URL}/api/seftali/sales/deliveries",
            json=payload,
            headers=auth_header(sales_token)
        )
        assert resp.status_code == 200, f"Create delivery failed: {resp.text}"
        data = resp.json()
        assert data.get("success") == True
        delivery = data.get("data", {})
        assert delivery.get("acceptance_status") == "pending"
        print(f"Delivery created: {delivery.get('id')[:8]}, invoice: {delivery.get('invoice_no')}")

    def test_create_delivery_qty_must_be_positive(self, session, sales_token):
        """Test that delivery items qty > 0 validation"""
        cust_resp = session.get(f"{BASE_URL}/api/seftali/sales/customers", headers=auth_header(sales_token))
        prod_resp = session.get(f"{BASE_URL}/api/seftali/sales/products", headers=auth_header(sales_token))
        
        customers = cust_resp.json().get("data", [])
        products = prod_resp.json().get("data", [])
        
        if not customers or not products:
            pytest.skip("No customers or products available")
        
        # Try qty = 0
        payload = {
            "customer_id": customers[0]["id"],
            "delivery_type": "route",
            "items": [{"product_id": products[0]["id"], "qty": 0}]
        }
        resp = session.post(
            f"{BASE_URL}/api/seftali/sales/deliveries",
            json=payload,
            headers=auth_header(sales_token)
        )
        assert resp.status_code == 422, f"Expected 422 for qty=0, got {resp.status_code}"
        print("Delivery qty > 0 validation works")

    def test_create_delivery_no_duplicate_products(self, session, sales_token):
        """Test no duplicate product_ids in delivery"""
        cust_resp = session.get(f"{BASE_URL}/api/seftali/sales/customers", headers=auth_header(sales_token))
        prod_resp = session.get(f"{BASE_URL}/api/seftali/sales/products", headers=auth_header(sales_token))
        
        customers = cust_resp.json().get("data", [])
        products = prod_resp.json().get("data", [])
        
        if not customers or not products:
            pytest.skip("No customers or products available")
        
        # Try duplicate product_id
        payload = {
            "customer_id": customers[0]["id"],
            "delivery_type": "route",
            "items": [
                {"product_id": products[0]["id"], "qty": 10},
                {"product_id": products[0]["id"], "qty": 20}  # duplicate
            ]
        }
        resp = session.post(
            f"{BASE_URL}/api/seftali/sales/deliveries",
            json=payload,
            headers=auth_header(sales_token)
        )
        assert resp.status_code == 422, f"Expected 422 for duplicate products, got {resp.status_code}"
        print("Delivery duplicate product validation works")

    def test_list_deliveries(self, session, sales_token):
        """GET /api/seftali/sales/deliveries"""
        resp = session.get(
            f"{BASE_URL}/api/seftali/sales/deliveries",
            headers=auth_header(sales_token)
        )
        assert resp.status_code == 200, f"List deliveries failed: {resp.text}"
        data = resp.json()
        assert data.get("success") == True
        deliveries = data.get("data", [])
        print(f"Sales: {len(deliveries)} deliveries fetched")

    def test_list_orders(self, session, sales_token):
        """GET /api/seftali/sales/orders"""
        resp = session.get(
            f"{BASE_URL}/api/seftali/sales/orders",
            headers=auth_header(sales_token)
        )
        assert resp.status_code == 200, f"List orders failed: {resp.text}"
        data = resp.json()
        assert data.get("success") == True
        orders = data.get("data", [])
        print(f"Sales: {len(orders)} orders fetched")


class TestSalesPlasiyerAccess:
    """Test that plasiyer (sales_agent) can access sales APIs"""

    def test_plasiyer_can_list_customers(self, session, plasiyer_token):
        """Plasiyer should have access to /api/seftali/sales/customers"""
        resp = session.get(
            f"{BASE_URL}/api/seftali/sales/customers",
            headers=auth_header(plasiyer_token)
        )
        assert resp.status_code == 200, f"Plasiyer list customers failed: {resp.text}"
        print("Plasiyer can access sales/customers")

    def test_plasiyer_can_create_delivery(self, session, plasiyer_token):
        """Plasiyer should be able to create deliveries"""
        cust_resp = session.get(f"{BASE_URL}/api/seftali/sales/customers", headers=auth_header(plasiyer_token))
        prod_resp = session.get(f"{BASE_URL}/api/seftali/sales/products", headers=auth_header(plasiyer_token))
        
        customers = cust_resp.json().get("data", [])
        products = prod_resp.json().get("data", [])
        
        if not customers or not products:
            pytest.skip("No customers or products available")
        
        payload = {
            "customer_id": customers[0]["id"],
            "delivery_type": "off_route",
            "invoice_no": f"PLASIYER-{os.urandom(4).hex().upper()}",
            "items": [{"product_id": products[0]["id"], "qty": 50}]
        }
        resp = session.post(
            f"{BASE_URL}/api/seftali/sales/deliveries",
            json=payload,
            headers=auth_header(plasiyer_token)
        )
        assert resp.status_code == 200, f"Plasiyer create delivery failed: {resp.text}"
        print("Plasiyer can create deliveries")


# ========= ADMIN API TESTS =========
class TestAdminAPIs:
    """Admin endpoint tests (read-only)"""

    def test_health_summary(self, session, admin_token):
        """GET /api/seftali/admin/health/summary"""
        resp = session.get(
            f"{BASE_URL}/api/seftali/admin/health/summary",
            headers=auth_header(admin_token)
        )
        assert resp.status_code == 200, f"Health summary failed: {resp.text}"
        data = resp.json()
        assert data.get("success") == True
        summary = data.get("data", {})
        print(f"Admin summary - Deliveries: {summary.get('total_deliveries')}, Pending: {summary.get('pending_deliveries')}, Spikes: {summary.get('active_spikes')}")

    def test_list_variance(self, session, admin_token):
        """GET /api/seftali/admin/variance"""
        resp = session.get(
            f"{BASE_URL}/api/seftali/admin/variance",
            headers=auth_header(admin_token)
        )
        assert resp.status_code == 200, f"List variance failed: {resp.text}"
        data = resp.json()
        assert data.get("success") == True
        variance = data.get("data", [])
        print(f"Admin: {len(variance)} variance events")

    def test_list_deliveries(self, session, admin_token):
        """GET /api/seftali/admin/deliveries"""
        resp = session.get(
            f"{BASE_URL}/api/seftali/admin/deliveries",
            headers=auth_header(admin_token)
        )
        assert resp.status_code == 200, f"List deliveries failed: {resp.text}"
        data = resp.json()
        assert data.get("success") == True
        deliveries = data.get("data", [])
        print(f"Admin: {len(deliveries)} deliveries")


# ========= AUTHORIZATION TESTS =========
class TestAuthorization:
    """Test that roles are properly enforced"""

    def test_customer_cannot_access_sales_endpoints(self, session, customer_token):
        """Customer should not access /api/seftali/sales/*"""
        resp = session.get(
            f"{BASE_URL}/api/seftali/sales/customers",
            headers=auth_header(customer_token)
        )
        assert resp.status_code in [401, 403], f"Expected 401/403, got {resp.status_code}"
        print("Customer correctly blocked from sales endpoints")

    def test_customer_cannot_access_admin_endpoints(self, session, customer_token):
        """Customer should not access /api/seftali/admin/*"""
        resp = session.get(
            f"{BASE_URL}/api/seftali/admin/health/summary",
            headers=auth_header(customer_token)
        )
        assert resp.status_code in [401, 403], f"Expected 401/403, got {resp.status_code}"
        print("Customer correctly blocked from admin endpoints")

    def test_sales_cannot_access_admin_endpoints(self, session, sales_token):
        """Sales should not access /api/seftali/admin/*"""
        resp = session.get(
            f"{BASE_URL}/api/seftali/admin/health/summary",
            headers=auth_header(sales_token)
        )
        assert resp.status_code in [401, 403], f"Expected 401/403, got {resp.status_code}"
        print("Sales correctly blocked from admin endpoints")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
