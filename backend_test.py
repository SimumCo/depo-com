#!/usr/bin/env python3
"""
Backend API Test Suite for Sales Agent System
Tests all Sales Agent and Sales Route APIs
"""

import requests
import json
import sys
from datetime import datetime
import uuid

# Configuration
BASE_URL = "https://review-portal-13.preview.emergentagent.com/api"

# Test Users
TEST_USERS = {
    "admin": {"username": "admin", "password": "admin123"},
    "plasiyer": {"username": "plasiyer1", "password": "plasiyer123"},
    "customer": {"username": "musteri1", "password": "musteri123"}
}

class APITester:
    def __init__(self):
        self.tokens = {}
        self.test_results = []
        self.failed_tests = []
        
    def log_test(self, test_name, success, details=""):
        """Log test result"""
        status = "✅ PASS" if success else "❌ FAIL"
        print(f"{status}: {test_name}")
        if details:
            print(f"   Details: {details}")
        
        self.test_results.append({
            "test": test_name,
            "success": success,
            "details": details
        })
        
        if not success:
            self.failed_tests.append(test_name)
    
    def login_user(self, user_type):
        """Login and get token for user type"""
        try:
            user_creds = TEST_USERS[user_type]
            response = requests.post(
                f"{BASE_URL}/auth/login",
                json=user_creds,
                timeout=30
            )
            
            if response.status_code == 200:
                data = response.json()
                token = data.get("access_token")
                if token:
                    self.tokens[user_type] = token
                    self.log_test(f"Login {user_type}", True, f"Token obtained")
                    return True
                else:
                    self.log_test(f"Login {user_type}", False, "No token in response")
                    return False
            else:
                self.log_test(f"Login {user_type}", False, f"Status: {response.status_code}, Response: {response.text}")
                return False
                
        except Exception as e:
            self.log_test(f"Login {user_type}", False, f"Exception: {str(e)}")
            return False
    
    def get_headers(self, user_type):
        """Get authorization headers for user type"""
        token = self.tokens.get(user_type)
        if not token:
            return None
        return {"Authorization": f"Bearer {token}"}
    
    def test_sales_agent_warehouse_order(self):
        """Test POST /api/salesagent/warehouse-order"""
        headers = self.get_headers("plasiyer")
        if not headers:
            self.log_test("Sales Agent Warehouse Order", False, "No plasiyer token")
            return
        
        # First get products to create a valid order
        try:
            products_response = requests.get(f"{BASE_URL}/products", headers=headers, timeout=30)
            if products_response.status_code != 200:
                self.log_test("Sales Agent Warehouse Order", False, "Could not fetch products")
                return
            
            products = products_response.json()
            if not products:
                self.log_test("Sales Agent Warehouse Order", False, "No products available")
                return
            
            # Create order with first product
            product = products[0]
            order_data = {
                "customer_id": "plasiyer-self",  # Will be overridden by API
                "channel_type": "logistics",
                "products": [
                    {
                        "product_id": product["id"],
                        "product_name": product["name"],
                        "units": 24,
                        "cases": 2,
                        "unit_price": product.get("logistics_price", 10.0),
                        "total_price": 24 * product.get("logistics_price", 10.0)
                    }
                ],
                "notes": "Test warehouse order from plasiyer"
            }
            
            response = requests.post(
                f"{BASE_URL}/salesagent/warehouse-order",
                json=order_data,
                headers=headers,
                timeout=30
            )
            
            if response.status_code == 200:
                order = response.json()
                if order.get("order_number", "").startswith("WHS-"):
                    self.log_test("Sales Agent Warehouse Order", True, f"Order created: {order.get('order_number')}")
                else:
                    self.log_test("Sales Agent Warehouse Order", False, "Order number doesn't start with WHS-")
            else:
                self.log_test("Sales Agent Warehouse Order", False, f"Status: {response.status_code}, Response: {response.text}")
                
        except Exception as e:
            self.log_test("Sales Agent Warehouse Order", False, f"Exception: {str(e)}")
    
    def test_sales_agent_my_customers(self):
        """Test GET /api/salesagent/my-customers"""
        headers = self.get_headers("plasiyer")
        if not headers:
            self.log_test("Sales Agent My Customers", False, "No plasiyer token")
            return
        
        try:
            response = requests.get(
                f"{BASE_URL}/salesagent/my-customers",
                headers=headers,
                timeout=30
            )
            
            if response.status_code == 200:
                customers = response.json()
                if isinstance(customers, list):
                    self.log_test("Sales Agent My Customers", True, f"Found {len(customers)} customers")
                    
                    # Check structure of first customer if exists
                    if customers:
                        customer = customers[0]
                        required_fields = ["route", "customer", "order_count"]
                        missing_fields = [field for field in required_fields if field not in customer]
                        if missing_fields:
                            self.log_test("Sales Agent My Customers Structure", False, f"Missing fields: {missing_fields}")
                        else:
                            self.log_test("Sales Agent My Customers Structure", True, "All required fields present")
                else:
                    self.log_test("Sales Agent My Customers", False, "Response is not a list")
            else:
                self.log_test("Sales Agent My Customers", False, f"Status: {response.status_code}, Response: {response.text}")
                
        except Exception as e:
            self.log_test("Sales Agent My Customers", False, f"Exception: {str(e)}")
    
    def test_sales_agent_my_routes(self):
        """Test GET /api/salesagent/my-routes"""
        headers = self.get_headers("plasiyer")
        if not headers:
            self.log_test("Sales Agent My Routes", False, "No plasiyer token")
            return
        
        try:
            response = requests.get(
                f"{BASE_URL}/salesagent/my-routes",
                headers=headers,
                timeout=30
            )
            
            if response.status_code == 200:
                routes = response.json()
                if isinstance(routes, list):
                    self.log_test("Sales Agent My Routes", True, f"Found {len(routes)} routes")
                    
                    # Check structure of first route if exists
                    if routes:
                        route = routes[0]
                        required_fields = ["id", "sales_agent_id", "customer_id", "delivery_day"]
                        missing_fields = [field for field in required_fields if field not in route]
                        if missing_fields:
                            self.log_test("Sales Agent My Routes Structure", False, f"Missing fields: {missing_fields}")
                        else:
                            self.log_test("Sales Agent My Routes Structure", True, "All required fields present")
                else:
                    self.log_test("Sales Agent My Routes", False, "Response is not a list")
            else:
                self.log_test("Sales Agent My Routes", False, f"Status: {response.status_code}, Response: {response.text}")
                
        except Exception as e:
            self.log_test("Sales Agent My Routes", False, f"Exception: {str(e)}")
    
    def test_sales_agent_stats(self):
        """Test GET /api/salesagent/stats"""
        headers = self.get_headers("plasiyer")
        if not headers:
            self.log_test("Sales Agent Stats", False, "No plasiyer token")
            return
        
        try:
            response = requests.get(
                f"{BASE_URL}/salesagent/stats",
                headers=headers,
                timeout=30
            )
            
            if response.status_code == 200:
                stats = response.json()
                if isinstance(stats, dict):
                    required_fields = ["my_customers_count", "my_warehouse_orders", "customer_orders", "total_orders"]
                    missing_fields = [field for field in required_fields if field not in stats]
                    if missing_fields:
                        self.log_test("Sales Agent Stats", False, f"Missing fields: {missing_fields}")
                    else:
                        self.log_test("Sales Agent Stats", True, f"Stats: {stats}")
                else:
                    self.log_test("Sales Agent Stats", False, "Response is not a dict")
            else:
                self.log_test("Sales Agent Stats", False, f"Status: {response.status_code}, Response: {response.text}")
                
        except Exception as e:
            self.log_test("Sales Agent Stats", False, f"Exception: {str(e)}")
    
    def test_sales_routes_create(self):
        """Test POST /api/sales-routes"""
        headers = self.get_headers("admin")
        if not headers:
            self.log_test("Sales Routes Create", False, "No admin token")
            return
        
        try:
            # Get a sales agent and customer for the route
            users_response = requests.get(f"{BASE_URL}/auth/me", headers=headers, timeout=30)
            
            route_data = {
                "sales_agent_id": str(uuid.uuid4()),  # Test with dummy ID
                "customer_id": str(uuid.uuid4()),     # Test with dummy ID
                "delivery_day": "monday",
                "route_order": 1,
                "notes": "Test route creation"
            }
            
            response = requests.post(
                f"{BASE_URL}/sales-routes",
                json=route_data,
                headers=headers,
                timeout=30
            )
            
            if response.status_code == 200:
                route = response.json()
                if route.get("id") and route.get("delivery_day") == "monday":
                    self.log_test("Sales Routes Create", True, f"Route created with ID: {route.get('id')}")
                else:
                    self.log_test("Sales Routes Create", False, "Invalid route response structure")
            else:
                self.log_test("Sales Routes Create", False, f"Status: {response.status_code}, Response: {response.text}")
                
        except Exception as e:
            self.log_test("Sales Routes Create", False, f"Exception: {str(e)}")
    
    def test_sales_routes_list(self):
        """Test GET /api/sales-routes"""
        headers = self.get_headers("admin")
        if not headers:
            self.log_test("Sales Routes List", False, "No admin token")
            return
        
        try:
            response = requests.get(
                f"{BASE_URL}/sales-routes",
                headers=headers,
                timeout=30
            )
            
            if response.status_code == 200:
                routes = response.json()
                if isinstance(routes, list):
                    self.log_test("Sales Routes List", True, f"Found {len(routes)} routes")
                    
                    # Check structure if routes exist
                    if routes:
                        route = routes[0]
                        required_fields = ["id", "sales_agent_id", "customer_id", "delivery_day"]
                        missing_fields = [field for field in required_fields if field not in route]
                        if missing_fields:
                            self.log_test("Sales Routes List Structure", False, f"Missing fields: {missing_fields}")
                        else:
                            self.log_test("Sales Routes List Structure", True, "All required fields present")
                else:
                    self.log_test("Sales Routes List", False, "Response is not a list")
            else:
                self.log_test("Sales Routes List", False, f"Status: {response.status_code}, Response: {response.text}")
                
        except Exception as e:
            self.log_test("Sales Routes List", False, f"Exception: {str(e)}")
    
    def test_customer_delivery_day(self):
        """Test GET /api/sales-routes/customer/{customer_id}"""
        headers = self.get_headers("customer")
        if not headers:
            self.log_test("Customer Delivery Day", False, "No customer token")
            return
        
        try:
            # First get customer info to get customer ID
            me_response = requests.get(f"{BASE_URL}/auth/me", headers=headers, timeout=30)
            if me_response.status_code != 200:
                self.log_test("Customer Delivery Day", False, "Could not get customer info")
                return
            
            customer_info = me_response.json()
            customer_id = customer_info.get("id")
            
            if not customer_id:
                self.log_test("Customer Delivery Day", False, "No customer ID found")
                return
            
            response = requests.get(
                f"{BASE_URL}/sales-routes/customer/{customer_id}",
                headers=headers,
                timeout=30
            )
            
            if response.status_code == 200:
                delivery_info = response.json()
                if isinstance(delivery_info, dict):
                    if "delivery_day" in delivery_info:
                        self.log_test("Customer Delivery Day", True, f"Delivery day: {delivery_info.get('delivery_day')}")
                    else:
                        self.log_test("Customer Delivery Day", False, "No delivery_day field in response")
                else:
                    self.log_test("Customer Delivery Day", False, "Response is not a dict")
            else:
                self.log_test("Customer Delivery Day", False, f"Status: {response.status_code}, Response: {response.text}")
                
        except Exception as e:
            self.log_test("Customer Delivery Day", False, f"Exception: {str(e)}")
    
    def run_all_tests(self):
        """Run all API tests"""
        print("🧪 Starting Backend API Tests")
        print("=" * 60)
        
        # Login all users first
        print("\n🔐 Authentication Tests:")
        for user_type in TEST_USERS.keys():
            self.login_user(user_type)
        
        print("\n📦 Sales Agent API Tests:")
        self.test_sales_agent_warehouse_order()
        self.test_sales_agent_my_customers()
        self.test_sales_agent_my_routes()
        self.test_sales_agent_stats()
        
        print("\n🛣️ Sales Routes API Tests:")
        self.test_sales_routes_create()
        self.test_sales_routes_list()
        
        print("\n👥 Customer API Tests:")
        self.test_customer_delivery_day()
        
        # Summary
        print("\n" + "=" * 60)
        print("📊 TEST SUMMARY")
        print("=" * 60)
        
        total_tests = len(self.test_results)
        passed_tests = len([t for t in self.test_results if t["success"]])
        failed_tests = len(self.failed_tests)
        
        print(f"Total Tests: {total_tests}")
        print(f"Passed: {passed_tests}")
        print(f"Failed: {failed_tests}")
        print(f"Success Rate: {(passed_tests/total_tests*100):.1f}%")
        
        if self.failed_tests:
            print(f"\n❌ Failed Tests:")
            for test in self.failed_tests:
                print(f"  - {test}")
        
        return failed_tests == 0

def main():
    """Main test function"""
    tester = APITester()
    success = tester.run_all_tests()
    
    if success:
        print("\n✅ All tests passed!")
        sys.exit(0)
    else:
        print("\n❌ Some tests failed!")
        sys.exit(1)

if __name__ == "__main__":
    main()