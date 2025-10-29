#!/usr/bin/env python3
"""
Backend API Test Suite for Distribution Management System
Tests Invoice Management and Consumption Tracking APIs
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
    "accounting": {"username": "muhasebe", "password": "muhasebe123"},
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
    
    # ========== NEW INVOICE API TESTS ==========
    
    def test_invoice_upload(self):
        """Test POST /api/invoices/upload"""
        headers = self.get_headers("accounting")
        if not headers:
            self.log_test("Invoice Upload", False, "No accounting token")
            return
        
        # Sample HTML invoice content
        sample_html = """
        <html>
        <body>
            <h1>FATURA</h1>
            <p>Fatura No: EE12025000004134</p>
            <p>Tarih: 15 01 2025</p>
            <p>Vergi No: 1234567890</p>
            <table>
                <tr><td>Ürün</td><td>Miktar</td><td>Fiyat</td></tr>
                <tr><td>Coca Cola 330ml</td><td>24</td><td>120,00 TL</td></tr>
                <tr><td>Fanta 330ml</td><td>12</td><td>60,00 TL</td></tr>
            </table>
            <p>Toplam: 180,00 TL</p>
        </body>
        </html>
        """
        
        try:
            invoice_data = {
                "html_content": sample_html
            }
            
            response = requests.post(
                f"{BASE_URL}/invoices/upload",
                json=invoice_data,
                headers=headers,
                timeout=30
            )
            
            if response.status_code == 200:
                result = response.json()
                if result.get("invoice_id"):
                    self.log_test("Invoice Upload", True, f"Invoice uploaded: {result.get('invoice_id')}")
                    # Store invoice ID for later tests
                    self.uploaded_invoice_id = result.get("invoice_id")
                else:
                    self.log_test("Invoice Upload", False, "No invoice_id in response")
            else:
                self.log_test("Invoice Upload", False, f"Status: {response.status_code}, Response: {response.text}")
                
        except Exception as e:
            self.log_test("Invoice Upload", False, f"Exception: {str(e)}")
    
    def test_get_all_invoices(self):
        """Test GET /api/invoices/all/list"""
        headers = self.get_headers("accounting")
        if not headers:
            self.log_test("Get All Invoices", False, "No accounting token")
            return
        
        try:
            response = requests.get(
                f"{BASE_URL}/invoices/all/list",
                headers=headers,
                timeout=30
            )
            
            if response.status_code == 200:
                invoices = response.json()
                if isinstance(invoices, list):
                    self.log_test("Get All Invoices", True, f"Found {len(invoices)} invoices")
                    
                    # Check structure if invoices exist
                    if invoices:
                        invoice = invoices[0]
                        required_fields = ["id", "invoice_number", "invoice_date", "grand_total"]
                        missing_fields = [field for field in required_fields if field not in invoice]
                        if missing_fields:
                            self.log_test("Get All Invoices Structure", False, f"Missing fields: {missing_fields}")
                        else:
                            self.log_test("Get All Invoices Structure", True, "All required fields present")
                else:
                    self.log_test("Get All Invoices", False, "Response is not a list")
            else:
                self.log_test("Get All Invoices", False, f"Status: {response.status_code}, Response: {response.text}")
                
        except Exception as e:
            self.log_test("Get All Invoices", False, f"Exception: {str(e)}")
    
    def test_get_my_invoices(self):
        """Test GET /api/invoices/my-invoices"""
        headers = self.get_headers("customer")
        if not headers:
            self.log_test("Get My Invoices", False, "No customer token")
            return
        
        try:
            response = requests.get(
                f"{BASE_URL}/invoices/my-invoices",
                headers=headers,
                timeout=30
            )
            
            if response.status_code == 200:
                invoices = response.json()
                if isinstance(invoices, list):
                    self.log_test("Get My Invoices", True, f"Customer has {len(invoices)} invoices")
                else:
                    self.log_test("Get My Invoices", False, "Response is not a list")
            else:
                self.log_test("Get My Invoices", False, f"Status: {response.status_code}, Response: {response.text}")
                
        except Exception as e:
            self.log_test("Get My Invoices", False, f"Exception: {str(e)}")
    
    def test_get_invoice_detail(self):
        """Test GET /api/invoices/{invoice_id}"""
        if not hasattr(self, 'uploaded_invoice_id'):
            self.log_test("Get Invoice Detail", False, "No uploaded invoice ID available")
            return
            
        headers = self.get_headers("accounting")
        if not headers:
            self.log_test("Get Invoice Detail", False, "No accounting token")
            return
        
        try:
            response = requests.get(
                f"{BASE_URL}/invoices/{self.uploaded_invoice_id}",
                headers=headers,
                timeout=30
            )
            
            if response.status_code == 200:
                invoice = response.json()
                if isinstance(invoice, dict):
                    required_fields = ["id", "invoice_number", "html_content", "grand_total"]
                    missing_fields = [field for field in required_fields if field not in invoice]
                    if missing_fields:
                        self.log_test("Get Invoice Detail", False, f"Missing fields: {missing_fields}")
                    else:
                        self.log_test("Get Invoice Detail", True, f"Invoice detail retrieved: {invoice.get('invoice_number')}")
                else:
                    self.log_test("Get Invoice Detail", False, "Response is not a dict")
            else:
                self.log_test("Get Invoice Detail", False, f"Status: {response.status_code}, Response: {response.text}")
                
        except Exception as e:
            self.log_test("Get Invoice Detail", False, f"Exception: {str(e)}")
    
    # ========== NEW CONSUMPTION API TESTS ==========
    
    def test_consumption_calculate(self):
        """Test POST /api/consumption/calculate"""
        headers = self.get_headers("admin")
        if not headers:
            self.log_test("Consumption Calculate", False, "No admin token")
            return
        
        try:
            response = requests.post(
                f"{BASE_URL}/consumption/calculate",
                headers=headers,
                timeout=30
            )
            
            if response.status_code == 200:
                result = response.json()
                if isinstance(result, dict):
                    if "records_processed" in result:
                        self.log_test("Consumption Calculate", True, f"Processed {result.get('records_processed')} records")
                    else:
                        self.log_test("Consumption Calculate", False, "No records_processed field")
                else:
                    self.log_test("Consumption Calculate", False, "Response is not a dict")
            else:
                self.log_test("Consumption Calculate", False, f"Status: {response.status_code}, Response: {response.text}")
                
        except Exception as e:
            self.log_test("Consumption Calculate", False, f"Exception: {str(e)}")
    
    def test_get_my_consumption(self):
        """Test GET /api/consumption/my-consumption"""
        headers = self.get_headers("customer")
        if not headers:
            self.log_test("Get My Consumption", False, "No customer token")
            return
        
        try:
            # Test monthly consumption
            response = requests.get(
                f"{BASE_URL}/consumption/my-consumption?period_type=monthly",
                headers=headers,
                timeout=30
            )
            
            if response.status_code == 200:
                consumption = response.json()
                if isinstance(consumption, list):
                    self.log_test("Get My Consumption", True, f"Customer has {len(consumption)} consumption records")
                    
                    # Check structure if records exist
                    if consumption:
                        record = consumption[0]
                        required_fields = ["product_name", "weekly_avg", "monthly_avg", "last_order_date"]
                        missing_fields = [field for field in required_fields if field not in record]
                        if missing_fields:
                            self.log_test("Get My Consumption Structure", False, f"Missing fields: {missing_fields}")
                        else:
                            self.log_test("Get My Consumption Structure", True, "All required fields present")
                else:
                    self.log_test("Get My Consumption", False, "Response is not a list")
            else:
                self.log_test("Get My Consumption", False, f"Status: {response.status_code}, Response: {response.text}")
                
        except Exception as e:
            self.log_test("Get My Consumption", False, f"Exception: {str(e)}")
    
    def test_get_customer_consumption(self):
        """Test GET /api/consumption/customer/{customer_id}"""
        headers = self.get_headers("admin")
        if not headers:
            self.log_test("Get Customer Consumption", False, "No admin token")
            return
        
        try:
            # First get a customer ID
            customer_headers = self.get_headers("customer")
            if customer_headers:
                me_response = requests.get(f"{BASE_URL}/auth/me", headers=customer_headers, timeout=30)
                if me_response.status_code == 200:
                    customer_info = me_response.json()
                    customer_id = customer_info.get("id")
                    
                    if customer_id:
                        response = requests.get(
                            f"{BASE_URL}/consumption/customer/{customer_id}?period_type=weekly",
                            headers=headers,
                            timeout=30
                        )
                        
                        if response.status_code == 200:
                            consumption = response.json()
                            if isinstance(consumption, list):
                                self.log_test("Get Customer Consumption", True, f"Customer has {len(consumption)} consumption records")
                            else:
                                self.log_test("Get Customer Consumption", False, "Response is not a list")
                        else:
                            self.log_test("Get Customer Consumption", False, f"Status: {response.status_code}, Response: {response.text}")
                    else:
                        self.log_test("Get Customer Consumption", False, "No customer ID found")
                else:
                    self.log_test("Get Customer Consumption", False, "Could not get customer info")
            else:
                self.log_test("Get Customer Consumption", False, "No customer token for ID lookup")
                
        except Exception as e:
            self.log_test("Get Customer Consumption", False, f"Exception: {str(e)}")
    
    def run_all_tests(self):
        """Run all API tests"""
        print("🧪 Starting Backend API Tests - Invoice & Consumption Features")
        print("=" * 70)
        
        # Login all users first
        print("\n🔐 Authentication Tests:")
        for user_type in TEST_USERS.keys():
            self.login_user(user_type)
        
        print("\n📄 Invoice Management API Tests:")
        self.test_invoice_upload()
        self.test_get_all_invoices()
        self.test_get_my_invoices()
        self.test_get_invoice_detail()
        
        print("\n📊 Consumption Tracking API Tests:")
        self.test_consumption_calculate()
        self.test_get_my_consumption()
        self.test_get_customer_consumption()
        
        print("\n📦 Legacy Sales Agent API Tests (Quick Check):")
        self.test_sales_agent_warehouse_order()
        self.test_sales_agent_my_customers()
        self.test_sales_agent_stats()
        
        # Summary
        print("\n" + "=" * 70)
        print("📊 TEST SUMMARY")
        print("=" * 70)
        
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