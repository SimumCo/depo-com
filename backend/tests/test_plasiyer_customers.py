"""
Plasiyer Customers API Tests
Tests for /api/seftali/sales/customers/summary endpoint and related features
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
PLASIYER_USERNAME = "sf_plasiyer"
PLASIYER_PASSWORD = "plasiyer123"


@pytest.fixture(scope="module")
def auth_token():
    """Get authentication token for plasiyer user"""
    response = requests.post(
        f"{BASE_URL}/api/auth/login",
        json={"username": PLASIYER_USERNAME, "password": PLASIYER_PASSWORD}
    )
    assert response.status_code == 200, f"Login failed: {response.text}"
    data = response.json()
    assert "access_token" in data, "No access_token in response"
    return data["access_token"]


@pytest.fixture(scope="module")
def auth_headers(auth_token):
    """Get authorization headers"""
    return {"Authorization": f"Bearer {auth_token}"}


class TestPlasiyerLogin:
    """Test Plasiyer authentication"""
    
    def test_login_success(self):
        """Test successful login with plasiyer credentials"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"username": PLASIYER_USERNAME, "password": PLASIYER_PASSWORD}
        )
        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert "user" in data
        assert data["user"]["username"] == PLASIYER_USERNAME
        assert data["user"]["role"] == "sales_agent"
    
    def test_login_invalid_credentials(self):
        """Test login with invalid credentials"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"username": "invalid_user", "password": "wrong_password"}
        )
        assert response.status_code == 401


class TestCustomersSummary:
    """Test /api/seftali/sales/customers/summary endpoint"""
    
    def test_get_customers_summary_success(self, auth_headers):
        """Test getting customers summary with valid auth"""
        response = requests.get(
            f"{BASE_URL}/api/seftali/sales/customers/summary",
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        
        # Check response structure
        assert data["success"] is True
        assert "data" in data
        assert isinstance(data["data"], list)
    
    def test_customers_summary_data_structure(self, auth_headers):
        """Test that customer summary contains required fields"""
        response = requests.get(
            f"{BASE_URL}/api/seftali/sales/customers/summary",
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        
        if len(data["data"]) > 0:
            customer = data["data"][0]
            
            # Check required fields from API
            assert "id" in customer
            assert "name" in customer
            assert "pending_orders_count" in customer
            assert "overdue_deliveries_count" in customer
            assert "total_deliveries" in customer
            assert "days_since_last_order" in customer or customer.get("days_since_last_order") is None
            
            # Check data types
            assert isinstance(customer["pending_orders_count"], int)
            assert isinstance(customer["overdue_deliveries_count"], int)
            assert isinstance(customer["total_deliveries"], int)
    
    def test_customers_summary_unauthorized(self):
        """Test that endpoint requires authentication"""
        response = requests.get(
            f"{BASE_URL}/api/seftali/sales/customers/summary"
        )
        # Should return 401 or 403 without auth
        assert response.status_code in [401, 403]


class TestCustomersList:
    """Test /api/seftali/sales/customers endpoint"""
    
    def test_get_customers_list(self, auth_headers):
        """Test getting customers list"""
        response = requests.get(
            f"{BASE_URL}/api/seftali/sales/customers",
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        
        assert data["success"] is True
        assert "data" in data
        assert isinstance(data["data"], list)
    
    def test_customers_have_route_plan(self, auth_headers):
        """Test that customers have route_plan field"""
        response = requests.get(
            f"{BASE_URL}/api/seftali/sales/customers",
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        
        if len(data["data"]) > 0:
            customer = data["data"][0]
            assert "route_plan" in customer
            if customer["route_plan"]:
                assert "days" in customer["route_plan"]


class TestDeliveries:
    """Test /api/seftali/sales/deliveries endpoint"""
    
    def test_get_deliveries(self, auth_headers):
        """Test getting deliveries list"""
        response = requests.get(
            f"{BASE_URL}/api/seftali/sales/deliveries",
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        
        assert data["success"] is True
        assert "data" in data
        assert isinstance(data["data"], list)


class TestOrders:
    """Test /api/seftali/sales/orders endpoint"""
    
    def test_get_orders(self, auth_headers):
        """Test getting orders list"""
        response = requests.get(
            f"{BASE_URL}/api/seftali/sales/orders",
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        
        assert data["success"] is True
        assert "data" in data
        assert isinstance(data["data"], list)


class TestProducts:
    """Test /api/seftali/sales/products endpoint"""
    
    def test_get_products(self, auth_headers):
        """Test getting products list"""
        response = requests.get(
            f"{BASE_URL}/api/seftali/sales/products",
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        
        assert data["success"] is True
        assert "data" in data
        assert isinstance(data["data"], list)


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
