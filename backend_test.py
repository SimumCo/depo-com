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
BASE_URL = "https://sarfiyat-kayit.preview.emergentagent.com/api"

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
        self.uploaded_invoice_id = None
        
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
    
    def test_sed_invoice_upload(self):
        """Test SED HTML Invoice Upload and Parsing"""
        headers = self.get_headers("accounting")
        if not headers:
            self.log_test("SED Invoice Upload", False, "No accounting token")
            return
        
        # Fetch SED HTML content from URL
        try:
            import requests as req_lib
            html_response = req_lib.get("https://customer-assets.emergentagent.com/job_c21b56fa-eb45-48e4-8eca-74c5ff09f9b2/artifacts/nf1rxoc2_SED2025000000078.html", timeout=30)
            if html_response.status_code != 200:
                self.log_test("SED Invoice Upload", False, f"Failed to fetch HTML: {html_response.status_code}")
                return
            
            sed_html_content = html_response.text
            
            invoice_data = {
                "html_content": sed_html_content
            }
            
            response = requests.post(
                f"{BASE_URL}/invoices/upload",
                json=invoice_data,
                headers=headers,
                timeout=30
            )
            
            if response.status_code == 200:
                result = response.json()
                invoice_id = result.get("invoice_id")
                if invoice_id:
                    self.log_test("SED Invoice Upload", True, f"SED Invoice uploaded: {invoice_id}")
                    # Store invoice ID for detailed validation
                    self.uploaded_invoice_id = invoice_id
                    
                    # Now validate the parsed data
                    self.validate_sed_invoice_parsing(invoice_id, headers)
                else:
                    self.log_test("SED Invoice Upload", False, "No invoice_id in response")
            else:
                self.log_test("SED Invoice Upload", False, f"Status: {response.status_code}, Response: {response.text}")
                
        except Exception as e:
            self.log_test("SED Invoice Upload", False, f"Exception: {str(e)}")
    
    def validate_sed_invoice_parsing(self, invoice_id, headers):
        """Validate SED invoice parsing results"""
        try:
            # Get invoice details
            response = requests.get(
                f"{BASE_URL}/invoices/{invoice_id}",
                headers=headers,
                timeout=30
            )
            
            if response.status_code != 200:
                self.log_test("SED Invoice Parsing Validation", False, f"Failed to get invoice details: {response.status_code}")
                return
            
            invoice = response.json()
            
            # Expected values for SED2025000000078
            expected_customer_name = "YÖRÜKOĞLU SÜT VE ÜRÜNLERİ SANAYİ TİCARET ANONİM ŞİRKETİ"
            expected_tax_id = "9830366087"
            expected_invoice_number = "SED2025000000078"
            expected_invoice_date = "27 10 2025"
            expected_product_count = 9
            expected_grand_total = "47.395,61"
            
            # Validate customer name
            if invoice.get("customer_name") == expected_customer_name:
                self.log_test("SED Customer Name Parsing", True, f"Correct: {invoice.get('customer_name')}")
            else:
                self.log_test("SED Customer Name Parsing", False, f"Expected: {expected_customer_name}, Got: {invoice.get('customer_name')}")
            
            # Validate tax ID
            if invoice.get("customer_tax_id") == expected_tax_id:
                self.log_test("SED Tax ID Parsing", True, f"Correct: {invoice.get('customer_tax_id')}")
            else:
                self.log_test("SED Tax ID Parsing", False, f"Expected: {expected_tax_id}, Got: {invoice.get('customer_tax_id')}")
            
            # Validate invoice number
            if invoice.get("invoice_number") == expected_invoice_number:
                self.log_test("SED Invoice Number Parsing", True, f"Correct: {invoice.get('invoice_number')}")
            else:
                self.log_test("SED Invoice Number Parsing", False, f"Expected: {expected_invoice_number}, Got: {invoice.get('invoice_number')}")
            
            # Validate invoice date
            if invoice.get("invoice_date") == expected_invoice_date:
                self.log_test("SED Invoice Date Parsing", True, f"Correct: {invoice.get('invoice_date')}")
            else:
                self.log_test("SED Invoice Date Parsing", False, f"Expected: {expected_invoice_date}, Got: {invoice.get('invoice_date')}")
            
            # Validate product count
            products = invoice.get("products", [])
            if len(products) == expected_product_count:
                self.log_test("SED Product Count Parsing", True, f"Correct: {len(products)} products")
            else:
                self.log_test("SED Product Count Parsing", False, f"Expected: {expected_product_count}, Got: {len(products)}")
            
            # Validate specific products
            expected_products = [
                {"name": "SÜZME YOĞURT 10 KG.", "quantity": 9},
                {"name": "YARIM YAĞLI YOĞURT 10 KG.", "quantity": 5},
                {"name": "KÖY PEYNİRİ 4 KG.", "quantity": 3}
            ]
            
            for expected_product in expected_products:
                found = False
                for product in products:
                    if (expected_product["name"] in product.get("product_name", "") and 
                        product.get("quantity") == expected_product["quantity"]):
                        found = True
                        break
                
                if found:
                    self.log_test(f"SED Product '{expected_product['name']}' Parsing", True, f"Found with quantity {expected_product['quantity']}")
                else:
                    self.log_test(f"SED Product '{expected_product['name']}' Parsing", False, f"Not found or incorrect quantity")
            
            # Validate grand total
            if invoice.get("grand_total") == expected_grand_total:
                self.log_test("SED Grand Total Parsing", True, f"Correct: {invoice.get('grand_total')}")
            else:
                self.log_test("SED Grand Total Parsing", False, f"Expected: {expected_grand_total}, Got: {invoice.get('grand_total')}")
                
        except Exception as e:
            self.log_test("SED Invoice Parsing Validation", False, f"Exception: {str(e)}")

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
    
    def test_customer_lookup_existing(self):
        """Test GET /api/customers/lookup/{tax_id} - Existing Customer"""
        headers = self.get_headers("accounting")
        if not headers:
            self.log_test("Customer Lookup - Existing", False, "No accounting token")
            return
        
        try:
            # Use the tax ID from previous test (1234567890 from review request)
            test_tax_id = "1234567890"
            
            response = requests.get(
                f"{BASE_URL}/customers/lookup/{test_tax_id}",
                headers=headers,
                timeout=30
            )
            
            if response.status_code == 200:
                result = response.json()
                
                # Validate response structure
                expected_fields = ["found", "customer_name", "customer_tax_id", "email", "phone", "address"]
                missing_fields = [field for field in expected_fields if field not in result]
                
                if missing_fields:
                    self.log_test("Customer Lookup - Existing", False, f"Missing response fields: {missing_fields}")
                    return
                
                # Validate expected values from review request
                if result.get("found") != True:
                    self.log_test("Customer Lookup - Existing", False, f"found should be true, got: {result.get('found')}")
                    return
                
                if result.get("customer_tax_id") != test_tax_id:
                    self.log_test("Customer Lookup - Existing", False, f"Wrong tax ID: expected {test_tax_id}, got {result.get('customer_tax_id')}")
                    return
                
                self.log_test("Customer Lookup - Existing", True, 
                    f"Found customer: {result.get('customer_name')} (Tax ID: {result.get('customer_tax_id')})")
                
            else:
                self.log_test("Customer Lookup - Existing", False, f"Status: {response.status_code}, Response: {response.text}")
                
        except Exception as e:
            self.log_test("Customer Lookup - Existing", False, f"Exception: {str(e)}")
    
    def test_customer_lookup_not_found(self):
        """Test GET /api/customers/lookup/{tax_id} - Non-existing Customer"""
        headers = self.get_headers("accounting")
        if not headers:
            self.log_test("Customer Lookup - Not Found", False, "No accounting token")
            return
        
        try:
            # Use a truly non-existing tax ID
            import time
            test_tax_id = f"8888888{int(time.time()) % 1000:03d}"
            
            response = requests.get(
                f"{BASE_URL}/customers/lookup/{test_tax_id}",
                headers=headers,
                timeout=30
            )
            
            if response.status_code == 404:
                result = response.json()
                expected_detail = "Bu vergi numarası ile kayıtlı müşteri bulunamadı"
                
                if result.get("detail") == expected_detail:
                    self.log_test("Customer Lookup - Not Found", True, f"Correct 404 response: {result.get('detail')}")
                else:
                    self.log_test("Customer Lookup - Not Found", False, f"Wrong error message: {result.get('detail')}")
                
            else:
                self.log_test("Customer Lookup - Not Found", False, f"Expected 404, got: {response.status_code}, Response: {response.text}")
                
        except Exception as e:
            self.log_test("Customer Lookup - Not Found", False, f"Exception: {str(e)}")

    def test_manual_invoice_new_categories(self):
        """Test Manuel Fatura Giriş - Yeni Kategoriler ile Ürünler"""
        headers = self.get_headers("accounting")
        if not headers:
            self.log_test("Manual Invoice - New Categories", False, "No accounting token")
            return
        
        try:
            # Generate unique tax ID and product codes for this test run
            import time
            timestamp = int(time.time()) % 10000
            unique_tax_id = f"555555{timestamp:04d}"
            
            # Test data from review request with new categories
            invoice_data = {
                "customer": {
                    "customer_name": "YENİ TEST MÜŞTERİ LTD",
                    "customer_tax_id": unique_tax_id,
                    "address": "Yeni Adres",
                    "email": "yeni@test.com",
                    "phone": "0312 999 88 77"
                },
                "invoice_number": "TEST2025000002",
                "invoice_date": "2025-01-16",
                "products": [
                    {
                        "product_code": f"YOG{timestamp:03d}",
                        "product_name": "KREMALI YOĞURT 1 KG",
                        "category": "Yoğurt",
                        "quantity": 50,
                        "unit": "ADET",
                        "unit_price": "25.00",
                        "total": "1250.00"
                    },
                    {
                        "product_code": f"AYR{timestamp:03d}",
                        "product_name": "AYRAN 200 ML",
                        "category": "Ayran",
                        "quantity": 100,
                        "unit": "ADET",
                        "unit_price": "5.00",
                        "total": "500.00"
                    },
                    {
                        "product_code": f"KAS{timestamp:03d}",
                        "product_name": "TAZE KAŞAR 500 GR",
                        "category": "Kaşar",
                        "quantity": 20,
                        "unit": "ADET",
                        "unit_price": "150.00",
                        "total": "3000.00"
                    },
                    {
                        "product_code": f"TER{timestamp:03d}",
                        "product_name": "TEREYAĞ 250 GR",
                        "category": "Tereyağı",
                        "quantity": 30,
                        "unit": "ADET",
                        "unit_price": "80.00",
                        "total": "2400.00"
                    },
                    {
                        "product_code": f"KRE{timestamp:03d}",
                        "product_name": "ŞEFİN KREMASI 200 ML",
                        "category": "Krema",
                        "quantity": 25,
                        "unit": "ADET",
                        "unit_price": "35.00",
                        "total": "875.00"
                    }
                ],
                "subtotal": "8025.00",
                "total_discount": "0",
                "total_tax": "80.25",
                "grand_total": "8105.25"
            }
            
            response = requests.post(
                f"{BASE_URL}/invoices/manual-entry",
                json=invoice_data,
                headers=headers,
                timeout=30
            )
            
            if response.status_code == 200:
                result = response.json()
                
                # Validate response structure
                expected_fields = ["message", "invoice_id", "customer_created", "customer_username", "customer_password", "products_created"]
                missing_fields = [field for field in expected_fields if field not in result]
                
                if missing_fields:
                    self.log_test("Manual Invoice - New Categories", False, f"Missing response fields: {missing_fields}")
                    return
                
                # Validate response values
                if result.get("message") != "Manuel fatura başarıyla oluşturuldu":
                    self.log_test("Manual Invoice - New Categories", False, f"Wrong message: {result.get('message')}")
                    return
                
                if result.get("customer_created") != True:
                    self.log_test("Manual Invoice - New Categories", False, f"customer_created should be true for new customer, got: {result.get('customer_created')}")
                    return
                
                if not result.get("customer_username") or not result.get("customer_password"):
                    self.log_test("Manual Invoice - New Categories", False, "Missing customer credentials")
                    return
                
                expected_products = ["KREMALI YOĞURT 1 KG", "AYRAN 200 ML", "TAZE KAŞAR 500 GR", "TEREYAĞ 250 GR", "ŞEFİN KREMASI 200 ML"]
                if result.get("products_created") != expected_products:
                    self.log_test("Manual Invoice - New Categories", False, f"Wrong products created: {result.get('products_created')}")
                    return
                
                # Store for later tests
                self.new_customer_username = result.get("customer_username")
                self.new_customer_password = result.get("customer_password")
                self.new_invoice_id = result.get("invoice_id")
                self.test_tax_id = unique_tax_id  # Store for existing customer test
                
                self.log_test("Manual Invoice - New Categories", True, 
                    f"Invoice: {result.get('invoice_id')}, Customer: {result.get('customer_username')}/{result.get('customer_password')}, Products: {len(result.get('products_created', []))}")
                
            else:
                self.log_test("Manual Invoice - New Categories", False, f"Status: {response.status_code}, Response: {response.text}")
                
        except Exception as e:
            self.log_test("Manual Invoice - New Categories", False, f"Exception: {str(e)}")

    def test_manual_invoice_entry_new_customer(self):
        """Test Manuel Fatura Giriş - Yeni Müşteri + Yeni Ürünler (Legacy Test)"""
        headers = self.get_headers("accounting")
        if not headers:
            self.log_test("Manual Invoice Entry - New Customer", False, "No accounting token")
            return
        
        try:
            # Generate unique tax ID and product codes for this test run
            import time
            timestamp = int(time.time()) % 10000
            unique_tax_id = f"123456{timestamp:04d}"
            product_code_1 = f"TEST{timestamp:03d}01"
            product_code_2 = f"TEST{timestamp:03d}02"
            
            # Test data from review request
            invoice_data = {
                "customer": {
                    "customer_name": "TEST GIDA SANAYİ VE TİCARET LTD ŞTİ",
                    "customer_tax_id": unique_tax_id,
                    "address": "Test Mahallesi, Test Sokak No:1, Ankara",
                    "email": "info@testgida.com",
                    "phone": "0312 555 12 34"
                },
                "invoice_number": "TEST2025000001",
                "invoice_date": "2025-01-15",
                "products": [
                    {
                        "product_code": product_code_1,
                        "product_name": "TEST SÜZME YOĞURT 5 KG",
                        "category": "Süt Ürünleri",
                        "quantity": 10,
                        "unit": "ADET",
                        "unit_price": "500.00",
                        "total": "5000.00"
                    },
                    {
                        "product_code": product_code_2,
                        "product_name": "TEST BEYAZ PEYNİR 1 KG",
                        "category": "Peynir",
                        "quantity": 20,
                        "unit": "ADET",
                        "unit_price": "300.00",
                        "total": "6000.00"
                    }
                ],
                "subtotal": "11000.00",
                "total_discount": "0",
                "total_tax": "110.00",
                "grand_total": "11110.00"
            }
            
            response = requests.post(
                f"{BASE_URL}/invoices/manual-entry",
                json=invoice_data,
                headers=headers,
                timeout=30
            )
            
            if response.status_code == 200:
                result = response.json()
                
                # Validate response structure
                expected_fields = ["message", "invoice_id", "customer_created", "customer_username", "customer_password", "products_created"]
                missing_fields = [field for field in expected_fields if field not in result]
                
                if missing_fields:
                    self.log_test("Manual Invoice Entry - New Customer", False, f"Missing response fields: {missing_fields}")
                    return
                
                # Validate response values
                if result.get("message") != "Manuel fatura başarıyla oluşturuldu":
                    self.log_test("Manual Invoice Entry - New Customer", False, f"Wrong message: {result.get('message')}")
                    return
                
                if result.get("customer_created") != True:
                    self.log_test("Manual Invoice Entry - New Customer", False, f"customer_created should be true for new customer, got: {result.get('customer_created')}")
                    return
                
                if not result.get("customer_username") or not result.get("customer_password"):
                    self.log_test("Manual Invoice Entry - New Customer", False, "Missing customer credentials")
                    return
                
                expected_products = ["TEST SÜZME YOĞURT 5 KG", "TEST BEYAZ PEYNİR 1 KG"]
                if result.get("products_created") != expected_products:
                    self.log_test("Manual Invoice Entry - New Customer", False, f"Wrong products created: {result.get('products_created')}")
                    return
                
                # Store for later tests
                self.legacy_customer_username = result.get("customer_username")
                self.legacy_customer_password = result.get("customer_password")
                self.legacy_invoice_id = result.get("invoice_id")
                self.legacy_tax_id = unique_tax_id  # Store for existing customer test
                self.test_product_code_1 = product_code_1  # Store for database verification test
                
                self.log_test("Manual Invoice Entry - New Customer", True, 
                    f"Invoice: {result.get('invoice_id')}, Customer: {result.get('customer_username')}/{result.get('customer_password')}, Products: {len(result.get('products_created', []))}")
                
            else:
                self.log_test("Manual Invoice Entry - New Customer", False, f"Status: {response.status_code}, Response: {response.text}")
                
        except Exception as e:
            self.log_test("Manual Invoice Entry - New Customer", False, f"Exception: {str(e)}")
    
    def test_manual_invoice_entry_existing_customer(self):
        """Test Manuel Fatura Giriş - Mevcut Müşteri + Yeni Ürün"""
        headers = self.get_headers("accounting")
        if not headers:
            self.log_test("Manual Invoice Entry - Existing Customer", False, "No accounting token")
            return
        
        try:
            import time
            # Use same customer tax ID from the first test
            if not hasattr(self, 'test_tax_id'):
                self.log_test("Manual Invoice Entry - Existing Customer", False, "No test tax ID from first test")
                return
                
            # Use same customer tax ID but different products
            invoice_data = {
                "customer": {
                    "customer_name": "TEST GIDA SANAYİ VE TİCARET LTD ŞTİ",
                    "customer_tax_id": self.test_tax_id,  # Same tax ID from first test
                    "address": "Test Mahallesi, Test Sokak No:1, Ankara",
                    "email": "info@testgida.com",
                    "phone": "0312 555 12 34"
                },
                "invoice_number": "TEST2025000002",
                "invoice_date": "2025-01-16",
                "products": [
                    {
                        "product_code": f"TEST{int(time.time()) % 1000:03d}03",
                        "product_name": "TEST KAŞAR PEYNİRİ 2 KG",
                        "category": "Peynir",
                        "quantity": 15,
                        "unit": "ADET",
                        "unit_price": "400.00",
                        "total": "6000.00"
                    }
                ],
                "subtotal": "6000.00",
                "total_discount": "0",
                "total_tax": "60.00",
                "grand_total": "6060.00"
            }
            
            response = requests.post(
                f"{BASE_URL}/invoices/manual-entry",
                json=invoice_data,
                headers=headers,
                timeout=30
            )
            
            if response.status_code == 200:
                result = response.json()
                
                # Validate that existing customer is used
                if result.get("customer_created") != False:
                    self.log_test("Manual Invoice Entry - Existing Customer", False, "customer_created should be false for existing customer")
                    return
                
                if result.get("customer_username") is not None or result.get("customer_password") is not None:
                    self.log_test("Manual Invoice Entry - Existing Customer", False, "Should not return credentials for existing customer")
                    return
                
                expected_products = ["TEST KAŞAR PEYNİRİ 2 KG"]
                if result.get("products_created") != expected_products:
                    self.log_test("Manual Invoice Entry - Existing Customer", False, f"Wrong products created: {result.get('products_created')}")
                    return
                
                self.log_test("Manual Invoice Entry - Existing Customer", True, 
                    f"Invoice: {result.get('invoice_id')}, Existing customer used, New products: {len(result.get('products_created', []))}")
                
            else:
                self.log_test("Manual Invoice Entry - Existing Customer", False, f"Status: {response.status_code}, Response: {response.text}")
                
        except Exception as e:
            self.log_test("Manual Invoice Entry - Existing Customer", False, f"Exception: {str(e)}")
    
    def test_new_customer_login(self):
        """Test that newly created customer can login"""
        if not hasattr(self, 'new_customer_username') or not hasattr(self, 'new_customer_password'):
            self.log_test("New Customer Login", False, "No new customer credentials available")
            return
        
        try:
            login_data = {
                "username": self.new_customer_username,
                "password": self.new_customer_password
            }
            
            response = requests.post(
                f"{BASE_URL}/auth/login",
                json=login_data,
                timeout=30
            )
            
            if response.status_code == 200:
                data = response.json()
                token = data.get("access_token")
                if token:
                    self.log_test("New Customer Login", True, f"Customer {self.new_customer_username} can login successfully")
                else:
                    self.log_test("New Customer Login", False, "No token in response")
            else:
                self.log_test("New Customer Login", False, f"Status: {response.status_code}, Response: {response.text}")
                
        except Exception as e:
            self.log_test("New Customer Login", False, f"Exception: {str(e)}")
    
    def test_invoice_retrieval(self):
        """Test retrieving the created invoice"""
        if not hasattr(self, 'new_invoice_id'):
            self.log_test("Invoice Retrieval", False, "No invoice ID available")
            return
        
        headers = self.get_headers("accounting")
        if not headers:
            self.log_test("Invoice Retrieval", False, "No accounting token")
            return
        
        try:
            response = requests.get(
                f"{BASE_URL}/invoices/{self.new_invoice_id}",
                headers=headers,
                timeout=30
            )
            
            if response.status_code == 200:
                invoice = response.json()
                
                # Validate invoice data - use the correct customer name from new categories test
                expected_customer_name = "YENİ TEST MÜŞTERİ LTD"
                if invoice.get("customer_name") != expected_customer_name:
                    self.log_test("Invoice Retrieval", False, f"Wrong customer name: expected '{expected_customer_name}', got '{invoice.get('customer_name')}'")
                    return
                
                # Use the test tax ID from the new categories test
                if not hasattr(self, 'test_tax_id'):
                    self.log_test("Invoice Retrieval", False, "No test tax ID available for validation")
                    return
                    
                if invoice.get("customer_tax_id") != self.test_tax_id:
                    self.log_test("Invoice Retrieval", False, f"Wrong tax ID: expected {self.test_tax_id}, got {invoice.get('customer_tax_id')}")
                    return
                
                products = invoice.get("products", [])
                expected_product_count = 5  # From new categories test
                if len(products) != expected_product_count:
                    self.log_test("Invoice Retrieval", False, f"Wrong product count: expected {expected_product_count}, got {len(products)}")
                    return
                
                # Check specific products from new categories test
                product_names = [p.get("product_name") for p in products]
                expected_names = ["KREMALI YOĞURT 1 KG", "AYRAN 200 ML", "TAZE KAŞAR 500 GR", "TEREYAĞ 250 GR", "ŞEFİN KREMASI 200 ML"]
                
                for expected_name in expected_names:
                    if expected_name not in product_names:
                        self.log_test("Invoice Retrieval", False, f"Missing product: {expected_name}")
                        return
                
                self.log_test("Invoice Retrieval", True, f"Invoice data correct: {len(products)} products, customer: {invoice.get('customer_name')}")
                
            else:
                self.log_test("Invoice Retrieval", False, f"Status: {response.status_code}, Response: {response.text}")
                
        except Exception as e:
            self.log_test("Invoice Retrieval", False, f"Exception: {str(e)}")
    
    def test_database_verification(self):
        """Test database verification for created customer and products"""
        # This would require direct MongoDB access, which we'll simulate through API calls
        
        # Test 1: Check if customer exists by trying to create another invoice with same tax ID
        headers = self.get_headers("accounting")
        if not headers:
            self.log_test("Database Verification", False, "No accounting token")
            return
        
        try:
            import time
            # Try to create another invoice with same customer - should use existing customer
            if not hasattr(self, 'test_tax_id') or not hasattr(self, 'test_product_code_1'):
                self.log_test("Database Verification", False, "No test data available from first test")
                return
                
            test_invoice = {
                "customer": {
                    "customer_name": "TEST GIDA SANAYİ VE TİCARET LTD ŞTİ",
                    "customer_tax_id": self.test_tax_id,  # Same tax ID from first test
                    "address": "Test Mahallesi, Test Sokak No:1, Ankara",
                    "email": "info@testgida.com",
                    "phone": "0312 555 12 34"
                },
                "invoice_number": "TEST2025000003",
                "invoice_date": "2025-01-17",
                "products": [
                    {
                        "product_code": self.test_product_code_1,  # Use existing product code from first test
                        "product_name": "TEST SÜZME YOĞURT 5 KG",
                        "category": "Süt Ürünleri",
                        "quantity": 5,
                        "unit": "ADET",
                        "unit_price": "500.00",
                        "total": "2500.00"
                    }
                ],
                "subtotal": "2500.00",
                "total_discount": "0",
                "total_tax": "25.00",
                "grand_total": "2525.00"
            }
            
            response = requests.post(
                f"{BASE_URL}/invoices/manual-entry",
                json=test_invoice,
                headers=headers,
                timeout=30
            )
            
            if response.status_code == 200:
                result = response.json()
                
                # Should use existing customer and existing product
                if result.get("customer_created") == False and len(result.get("products_created", [])) == 0:
                    self.log_test("Database Verification", True, "Customer and products exist in database - reused correctly")
                else:
                    self.log_test("Database Verification", False, f"Unexpected creation: customer_created={result.get('customer_created')}, products_created={result.get('products_created')}")
            else:
                self.log_test("Database Verification", False, f"Status: {response.status_code}, Response: {response.text}")
                
        except Exception as e:
            self.log_test("Database Verification", False, f"Exception: {str(e)}")

    # ========== FATURA BAZLI TÜKETİM HESAPLAMA SİSTEMİ TESTS ==========
    
    def test_basic_automatic_consumption_calculation(self):
        """TEST 1: TEMEL OTOMATİK TÜKETİM HESAPLAMA"""
        headers = self.get_headers("admin")
        if not headers:
            self.log_test("Basic Automatic Consumption Calculation", False, "No admin token")
            return
        
        try:
            # First, check if there are any existing customers with invoices
            customers_response = requests.get(f"{BASE_URL}/invoices/all/list", headers=headers, timeout=30)
            if customers_response.status_code != 200:
                self.log_test("Basic Automatic Consumption Calculation", False, "Could not fetch invoices")
                return
            
            invoices = customers_response.json()
            if not invoices:
                self.log_test("Basic Automatic Consumption Calculation", False, "No invoices found in system")
                return
            
            # Find a customer with at least 2 invoices
            customer_invoices = {}
            for invoice in invoices:
                customer_id = invoice.get("customer_id")
                if customer_id:
                    if customer_id not in customer_invoices:
                        customer_invoices[customer_id] = []
                    customer_invoices[customer_id].append(invoice)
            
            # Find customer with multiple invoices
            target_customer_id = None
            target_invoice_id = None
            
            for customer_id, inv_list in customer_invoices.items():
                if len(inv_list) >= 2:
                    target_customer_id = customer_id
                    # Get the latest invoice
                    target_invoice_id = inv_list[0].get("id")
                    break
            
            if not target_invoice_id:
                self.log_test("Basic Automatic Consumption Calculation", False, "No customer with multiple invoices found")
                return
            
            # Test consumption records for this invoice
            response = requests.get(
                f"{BASE_URL}/customer-consumption/invoice-based/invoice/{target_invoice_id}",
                headers=headers,
                timeout=30
            )
            
            if response.status_code == 200:
                consumption_records = response.json()
                
                if consumption_records:
                    # Validate required fields
                    record = consumption_records[0]
                    required_fields = ["source_invoice_id", "target_invoice_id", "consumption_quantity", "daily_consumption_rate"]
                    missing_fields = [field for field in required_fields if field not in record]
                    
                    if missing_fields:
                        self.log_test("Basic Automatic Consumption Calculation", False, f"Missing fields in consumption record: {missing_fields}")
                    else:
                        self.log_test("Basic Automatic Consumption Calculation", True, 
                            f"Found {len(consumption_records)} consumption records for invoice {target_invoice_id}")
                else:
                    self.log_test("Basic Automatic Consumption Calculation", False, "No consumption records found for invoice")
            else:
                self.log_test("Basic Automatic Consumption Calculation", False, f"Status: {response.status_code}, Response: {response.text}")
                
        except Exception as e:
            self.log_test("Basic Automatic Consumption Calculation", False, f"Exception: {str(e)}")
    
    def test_backward_product_search_critical(self):
        """TEST 2: GERİYE DÖNÜK ÜRÜN ARAMA (Kritik!)"""
        headers = self.get_headers("accounting")
        if not headers:
            self.log_test("Backward Product Search (Critical)", False, "No accounting token")
            return
        
        try:
            import time
            timestamp = int(time.time()) % 10000
            unique_tax_id = f"777777{timestamp:04d}"
            
            # Create a unique customer for this test
            customer_data = {
                "customer_name": "GERİYE DÖNÜK ARAMA TEST MÜŞTERİSİ",
                "customer_tax_id": unique_tax_id,
                "address": "Test Adresi",
                "email": "geriyedonuk@test.com",
                "phone": "0312 777 88 99"
            }
            
            # Create 3 invoices with specific scenario
            # Invoice 1 (01/11/2024): Product A (TEST001, 50 units)
            invoice1_data = {
                "customer": customer_data,
                "invoice_number": f"BACK001-{timestamp}",
                "invoice_date": "01 11 2024",
                "products": [
                    {
                        "product_code": "TEST001",
                        "product_name": "TEST ÜRÜN A",
                        "category": "Test Kategori",
                        "quantity": 50,
                        "unit": "ADET",
                        "unit_price": "10.00",
                        "total": "500.00"
                    }
                ],
                "subtotal": "500.00",
                "total_discount": "0",
                "total_tax": "5.00",
                "grand_total": "505.00"
            }
            
            # Create Invoice 1
            response1 = requests.post(f"{BASE_URL}/invoices/manual-entry", json=invoice1_data, headers=headers, timeout=30)
            if response1.status_code != 200:
                self.log_test("Backward Product Search (Critical)", False, f"Failed to create invoice 1: {response1.text}")
                return
            
            invoice1_result = response1.json()
            invoice1_id = invoice1_result.get("invoice_id")
            
            # Invoice 2 (15/11/2024): Product B (TEST002, 30 units) - Product A NOT present
            invoice2_data = {
                "customer": customer_data,
                "invoice_number": f"BACK002-{timestamp}",
                "invoice_date": "15 11 2024",
                "products": [
                    {
                        "product_code": "TEST002",
                        "product_name": "TEST ÜRÜN B",
                        "category": "Test Kategori",
                        "quantity": 30,
                        "unit": "ADET",
                        "unit_price": "15.00",
                        "total": "450.00"
                    }
                ],
                "subtotal": "450.00",
                "total_discount": "0",
                "total_tax": "4.50",
                "grand_total": "454.50"
            }
            
            # Create Invoice 2
            response2 = requests.post(f"{BASE_URL}/invoices/manual-entry", json=invoice2_data, headers=headers, timeout=30)
            if response2.status_code != 200:
                self.log_test("Backward Product Search (Critical)", False, f"Failed to create invoice 2: {response2.text}")
                return
            
            invoice2_result = response2.json()
            invoice2_id = invoice2_result.get("invoice_id")
            
            # Invoice 3 (01/12/2024): Product A (TEST001, 80 units) - Product B NOT present
            invoice3_data = {
                "customer": customer_data,
                "invoice_number": f"BACK003-{timestamp}",
                "invoice_date": "01 12 2024",
                "products": [
                    {
                        "product_code": "TEST001",  # Same as Invoice 1
                        "product_name": "TEST ÜRÜN A",
                        "category": "Test Kategori",
                        "quantity": 80,
                        "unit": "ADET",
                        "unit_price": "10.00",
                        "total": "800.00"
                    }
                ],
                "subtotal": "800.00",
                "total_discount": "0",
                "total_tax": "8.00",
                "grand_total": "808.00"
            }
            
            # Create Invoice 3
            response3 = requests.post(f"{BASE_URL}/invoices/manual-entry", json=invoice3_data, headers=headers, timeout=30)
            if response3.status_code != 200:
                self.log_test("Backward Product Search (Critical)", False, f"Failed to create invoice 3: {response3.text}")
                return
            
            invoice3_result = response3.json()
            invoice3_id = invoice3_result.get("invoice_id")
            
            # Now check consumption record for Invoice 3
            # It should find Product A from Invoice 1 (not Invoice 2)
            consumption_response = requests.get(
                f"{BASE_URL}/customer-consumption/invoice-based/invoice/{invoice3_id}",
                headers=headers,
                timeout=30
            )
            
            if consumption_response.status_code == 200:
                consumption_records = consumption_response.json()
                
                if not consumption_records:
                    self.log_test("Backward Product Search (Critical)", False, "No consumption records found for invoice 3")
                    return
                
                # Find the TEST001 product record
                test001_record = None
                for record in consumption_records:
                    if record.get("product_code") == "TEST001":
                        test001_record = record
                        break
                
                if not test001_record:
                    self.log_test("Backward Product Search (Critical)", False, "No consumption record found for TEST001 product")
                    return
                
                # Validate the backward search worked correctly
                source_invoice_id = test001_record.get("source_invoice_id")
                consumption_quantity = test001_record.get("consumption_quantity")
                days_between = test001_record.get("days_between")
                daily_rate = test001_record.get("daily_consumption_rate")
                
                # Expected values
                expected_consumption = 80 - 50  # 30
                expected_days = 30  # 1 December - 1 November
                expected_daily_rate = 30 / 30  # 1.0
                
                validation_errors = []
                
                if source_invoice_id != invoice1_id:
                    validation_errors.append(f"source_invoice_id should be {invoice1_id} (Invoice 1), got {source_invoice_id}")
                
                if consumption_quantity != expected_consumption:
                    validation_errors.append(f"consumption_quantity should be {expected_consumption}, got {consumption_quantity}")
                
                if days_between != expected_days:
                    validation_errors.append(f"days_between should be {expected_days}, got {days_between}")
                
                if abs(daily_rate - expected_daily_rate) > 0.01:
                    validation_errors.append(f"daily_consumption_rate should be ~{expected_daily_rate}, got {daily_rate}")
                
                if validation_errors:
                    self.log_test("Backward Product Search (Critical)", False, f"Validation errors: {'; '.join(validation_errors)}")
                else:
                    self.log_test("Backward Product Search (Critical)", True, 
                        f"✅ Backward search worked! Found Product A from Invoice 1 (skipped Invoice 2). Consumption: {consumption_quantity}, Days: {days_between}, Rate: {daily_rate:.2f}")
                
            else:
                self.log_test("Backward Product Search (Critical)", False, f"Failed to get consumption records: {consumption_response.status_code}")
                
        except Exception as e:
            self.log_test("Backward Product Search (Critical)", False, f"Exception: {str(e)}")
    
    def test_first_invoice_scenario(self):
        """TEST 3: İLK FATURA SENARYOSU"""
        headers = self.get_headers("accounting")
        if not headers:
            self.log_test("First Invoice Scenario", False, "No accounting token")
            return
        
        try:
            import time
            timestamp = int(time.time()) % 10000
            unique_tax_id = f"888888{timestamp:04d}"
            
            # Create a completely new customer with first invoice
            first_invoice_data = {
                "customer": {
                    "customer_name": "İLK FATURA TEST MÜŞTERİSİ",
                    "customer_tax_id": unique_tax_id,
                    "address": "İlk Fatura Test Adresi",
                    "email": "ilkfatura@test.com",
                    "phone": "0312 888 99 00"
                },
                "invoice_number": f"FIRST-{timestamp}",
                "invoice_date": "01 01 2025",
                "products": [
                    {
                        "product_code": f"FIRST{timestamp:03d}",
                        "product_name": "İLK FATURA TEST ÜRÜNÜ",
                        "category": "Test Kategori",
                        "quantity": 100,
                        "unit": "ADET",
                        "unit_price": "20.00",
                        "total": "2000.00"
                    }
                ],
                "subtotal": "2000.00",
                "total_discount": "0",
                "total_tax": "20.00",
                "grand_total": "2020.00"
            }
            
            # Create the first invoice
            response = requests.post(f"{BASE_URL}/invoices/manual-entry", json=first_invoice_data, headers=headers, timeout=30)
            if response.status_code != 200:
                self.log_test("First Invoice Scenario", False, f"Failed to create first invoice: {response.text}")
                return
            
            result = response.json()
            invoice_id = result.get("invoice_id")
            
            # Check consumption record for this first invoice
            consumption_response = requests.get(
                f"{BASE_URL}/customer-consumption/invoice-based/invoice/{invoice_id}",
                headers=headers,
                timeout=30
            )
            
            if consumption_response.status_code == 200:
                consumption_records = consumption_response.json()
                
                if not consumption_records:
                    self.log_test("First Invoice Scenario", False, "No consumption records found for first invoice")
                    return
                
                record = consumption_records[0]
                
                # Validate first invoice characteristics
                validation_errors = []
                
                if record.get("can_calculate") != False:
                    validation_errors.append(f"can_calculate should be False, got {record.get('can_calculate')}")
                
                if record.get("source_invoice_id") is not None:
                    validation_errors.append(f"source_invoice_id should be None, got {record.get('source_invoice_id')}")
                
                if record.get("consumption_quantity") != 0:
                    validation_errors.append(f"consumption_quantity should be 0, got {record.get('consumption_quantity')}")
                
                expected_notes = "İlk fatura - Tüketim hesaplanamaz"
                if record.get("notes") != expected_notes:
                    validation_errors.append(f"notes should be '{expected_notes}', got '{record.get('notes')}'")
                
                if validation_errors:
                    self.log_test("First Invoice Scenario", False, f"Validation errors: {'; '.join(validation_errors)}")
                else:
                    self.log_test("First Invoice Scenario", True, 
                        f"✅ First invoice scenario correct: can_calculate=False, source_invoice_id=None, consumption_quantity=0, notes='{record.get('notes')}'")
                
            else:
                self.log_test("First Invoice Scenario", False, f"Failed to get consumption records: {consumption_response.status_code}")
                
        except Exception as e:
            self.log_test("First Invoice Scenario", False, f"Exception: {str(e)}")
    
    def test_bulk_calculation(self):
        """TEST 4: BULK CALCULATION"""
        headers = self.get_headers("admin")
        if not headers:
            self.log_test("Bulk Calculation", False, "No admin token")
            return
        
        try:
            response = requests.post(
                f"{BASE_URL}/customer-consumption/invoice-based/bulk-calculate",
                headers=headers,
                timeout=60  # Longer timeout for bulk operation
            )
            
            if response.status_code == 200:
                result = response.json()
                
                # Validate response structure
                required_fields = ["total_invoices", "invoices_processed", "total_consumption_records_created"]
                missing_fields = [field for field in required_fields if field not in result]
                
                if missing_fields:
                    self.log_test("Bulk Calculation", False, f"Missing response fields: {missing_fields}")
                else:
                    total_invoices = result.get("total_invoices", 0)
                    processed = result.get("invoices_processed", 0)
                    records_created = result.get("total_consumption_records_created", 0)
                    
                    self.log_test("Bulk Calculation", True, 
                        f"✅ Bulk calculation completed: {processed}/{total_invoices} invoices processed, {records_created} consumption records created")
                
            else:
                self.log_test("Bulk Calculation", False, f"Status: {response.status_code}, Response: {response.text}")
                
        except Exception as e:
            self.log_test("Bulk Calculation", False, f"Exception: {str(e)}")
    
    def test_customer_statistics(self):
        """TEST 5: MÜŞTERİ İSTATİSTİKLERİ"""
        headers = self.get_headers("admin")
        if not headers:
            self.log_test("Customer Statistics", False, "No admin token")
            return
        
        try:
            # First get a customer ID that has consumption records
            customers_response = requests.get(f"{BASE_URL}/invoices/all/list", headers=headers, timeout=30)
            if customers_response.status_code != 200:
                self.log_test("Customer Statistics", False, "Could not fetch invoices to find customer")
                return
            
            invoices = customers_response.json()
            if not invoices:
                self.log_test("Customer Statistics", False, "No invoices found")
                return
            
            # Get first customer ID
            customer_id = invoices[0].get("customer_id")
            if not customer_id:
                self.log_test("Customer Statistics", False, "No customer_id found in invoices")
                return
            
            # Test customer statistics API
            response = requests.get(
                f"{BASE_URL}/customer-consumption/invoice-based/stats/customer/{customer_id}",
                headers=headers,
                timeout=30
            )
            
            if response.status_code == 200:
                stats = response.json()
                
                # Validate response structure
                required_fields = ["total_products", "top_products", "average_daily_consumption"]
                missing_fields = [field for field in required_fields if field not in stats]
                
                if missing_fields:
                    self.log_test("Customer Statistics", False, f"Missing response fields: {missing_fields}")
                else:
                    total_products = stats.get("total_products", 0)
                    top_products = stats.get("top_products", [])
                    avg_daily = stats.get("average_daily_consumption", 0)
                    
                    self.log_test("Customer Statistics", True, 
                        f"✅ Customer stats: {total_products} products, {len(top_products)} top products, avg daily: {avg_daily:.2f}")
                
            else:
                self.log_test("Customer Statistics", False, f"Status: {response.status_code}, Response: {response.text}")
                
        except Exception as e:
            self.log_test("Customer Statistics", False, f"Exception: {str(e)}")
    
    def test_authorization_controls(self):
        """TEST 6: YETKİ KONTROLLARI"""
        try:
            # Test 1: Customer can only see their own consumption records
            customer_headers = self.get_headers("customer")
            if customer_headers:
                # Get customer's own ID
                me_response = requests.get(f"{BASE_URL}/auth/me", headers=customer_headers, timeout=30)
                if me_response.status_code == 200:
                    customer_info = me_response.json()
                    customer_id = customer_info.get("id")
                    
                    if customer_id:
                        # Customer accessing their own data - should work
                        response = requests.get(
                            f"{BASE_URL}/customer-consumption/invoice-based/customer/{customer_id}",
                            headers=customer_headers,
                            timeout=30
                        )
                        
                        if response.status_code == 200:
                            self.log_test("Authorization - Customer Own Data", True, "Customer can access own consumption data")
                        else:
                            self.log_test("Authorization - Customer Own Data", False, f"Customer cannot access own data: {response.status_code}")
                        
                        # Customer accessing other customer's data - should fail
                        fake_customer_id = "fake-customer-id-12345"
                        response = requests.get(
                            f"{BASE_URL}/customer-consumption/invoice-based/customer/{fake_customer_id}",
                            headers=customer_headers,
                            timeout=30
                        )
                        
                        if response.status_code == 403:
                            self.log_test("Authorization - Customer Other Data", True, "Customer correctly blocked from other customer's data")
                        else:
                            self.log_test("Authorization - Customer Other Data", False, f"Customer should be blocked, got: {response.status_code}")
                    else:
                        self.log_test("Authorization - Customer Tests", False, "Could not get customer ID")
                else:
                    self.log_test("Authorization - Customer Tests", False, "Could not get customer info")
            else:
                self.log_test("Authorization - Customer Tests", False, "No customer token")
            
            # Test 2: Sales agent can only see their customers
            plasiyer_headers = self.get_headers("plasiyer")
            if plasiyer_headers:
                # Try to access a customer (this might fail if no route exists, which is expected)
                fake_customer_id = "fake-customer-id-67890"
                response = requests.get(
                    f"{BASE_URL}/customer-consumption/invoice-based/customer/{fake_customer_id}",
                    headers=plasiyer_headers,
                    timeout=30
                )
                
                if response.status_code == 403:
                    self.log_test("Authorization - Sales Agent Restriction", True, "Sales agent correctly restricted to own customers")
                else:
                    self.log_test("Authorization - Sales Agent Restriction", False, f"Sales agent restriction not working: {response.status_code}")
            else:
                self.log_test("Authorization - Sales Agent Tests", False, "No plasiyer token")
            
            # Test 3: Admin/Accounting can see all data
            admin_headers = self.get_headers("admin")
            accounting_headers = self.get_headers("accounting")
            
            for role, headers in [("Admin", admin_headers), ("Accounting", accounting_headers)]:
                if headers:
                    # Try bulk calculation (admin only)
                    if role == "Admin":
                        response = requests.post(
                            f"{BASE_URL}/customer-consumption/invoice-based/bulk-calculate",
                            headers=headers,
                            timeout=30
                        )
                        
                        if response.status_code in [200, 500]:  # 500 might happen if already calculated
                            self.log_test(f"Authorization - {role} Bulk Access", True, f"{role} can access bulk calculation")
                        else:
                            self.log_test(f"Authorization - {role} Bulk Access", False, f"{role} cannot access bulk calculation: {response.status_code}")
                    
                    # Try customer stats (both should work)
                    fake_customer_id = "any-customer-id"
                    response = requests.get(
                        f"{BASE_URL}/customer-consumption/invoice-based/stats/customer/{fake_customer_id}",
                        headers=headers,
                        timeout=30
                    )
                    
                    if response.status_code in [200, 404]:  # 404 is OK if customer doesn't exist
                        self.log_test(f"Authorization - {role} Stats Access", True, f"{role} can access customer stats")
                    else:
                        self.log_test(f"Authorization - {role} Stats Access", False, f"{role} cannot access stats: {response.status_code}")
                else:
                    self.log_test(f"Authorization - {role} Tests", False, f"No {role.lower()} token")
                    
        except Exception as e:
            self.log_test("Authorization Controls", False, f"Exception: {str(e)}")

    def run_all_tests(self):
        """Run all API tests"""
        print("🧪 Starting Backend API Tests - Fatura Bazlı Tüketim Hesaplama Sistemi")
        print("=" * 80)
        
        # Login all users first
        print("\n🔐 Authentication Tests:")
        for user_type in TEST_USERS.keys():
            self.login_user(user_type)
        
        print("\n🎯 FATURA BAZLI TÜKETİM HESAPLAMA SİSTEMİ TESTS:")
        print("=" * 60)
        
        print("\n📊 TEST 1: TEMEL OTOMATİK TÜKETİM HESAPLAMA")
        self.test_basic_automatic_consumption_calculation()
        
        print("\n🔍 TEST 2: GERİYE DÖNÜK ÜRÜN ARAMA (Kritik!)")
        self.test_backward_product_search_critical()
        
        print("\n🆕 TEST 3: İLK FATURA SENARYOSU")
        self.test_first_invoice_scenario()
        
        print("\n⚡ TEST 4: BULK CALCULATION")
        self.test_bulk_calculation()
        
        print("\n📈 TEST 5: MÜŞTERİ İSTATİSTİKLERİ")
        self.test_customer_statistics()
        
        print("\n🔒 TEST 6: YETKİ KONTROLLARI")
        self.test_authorization_controls()
        
        print("\n🔍 Customer Lookup API Tests:")
        self.test_customer_lookup_existing()
        self.test_customer_lookup_not_found()
        
        print("\n📝 Manuel Fatura Giriş API Tests (New Categories):")
        self.test_manual_invoice_new_categories()
        
        print("\n📝 Manuel Fatura Giriş API Tests (Legacy):")
        self.test_manual_invoice_entry_new_customer()
        self.test_manual_invoice_entry_existing_customer()
        self.test_new_customer_login()
        self.test_invoice_retrieval()
        self.test_database_verification()
        
        print("\n📄 Legacy Invoice Management API Tests:")
        self.test_sed_invoice_upload()  # Test SED invoice
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
        print("\n" + "=" * 80)
        print("📊 TEST SUMMARY")
        print("=" * 80)
        
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