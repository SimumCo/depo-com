#!/usr/bin/env python3
"""
SED Invoice HTML Parsing Test
Tests the specific SED2025000000078.html invoice parsing functionality
"""

import requests
import json

# Configuration
BASE_URL = "https://seftali-dist.preview.emergentagent.com/api"

def test_sed_invoice():
    print("🧪 Testing SED Invoice HTML Parsing")
    print("=" * 50)
    
    # Step 1: Login with accounting user
    print("🔐 Step 1: Login with muhasebe account")
    login_data = {"username": "muhasebe", "password": "muhasebe123"}
    
    try:
        response = requests.post(f"{BASE_URL}/auth/login", json=login_data, timeout=30)
        if response.status_code != 200:
            print(f"❌ Login failed: {response.status_code} - {response.text}")
            return False
        
        token = response.json().get("access_token")
        if not token:
            print("❌ No token received")
            return False
        
        print("✅ Login successful")
        headers = {"Authorization": f"Bearer {token}"}
        
    except Exception as e:
        print(f"❌ Login exception: {str(e)}")
        return False
    
    # Step 2: Fetch SED HTML content
    print("\n📄 Step 2: Fetching SED HTML content")
    try:
        html_response = requests.get(
            "https://customer-assets.emergentagent.com/job_c21b56fa-eb45-48e4-8eca-74c5ff09f9b2/artifacts/nf1rxoc2_SED2025000000078.html", 
            timeout=30
        )
        if html_response.status_code != 200:
            print(f"❌ Failed to fetch HTML: {html_response.status_code}")
            return False
        
        sed_html_content = html_response.text
        print("✅ SED HTML content fetched successfully")
        
    except Exception as e:
        print(f"❌ HTML fetch exception: {str(e)}")
        return False
    
    # Step 3: Upload invoice
    print("\n📤 Step 3: Uploading SED invoice")
    try:
        invoice_data = {"html_content": sed_html_content}
        response = requests.post(f"{BASE_URL}/invoices/upload", json=invoice_data, headers=headers, timeout=30)
        
        if response.status_code != 200:
            print(f"❌ Upload failed: {response.status_code} - {response.text}")
            return False
        
        result = response.json()
        invoice_id = result.get("invoice_id")
        if not invoice_id:
            print("❌ No invoice_id in response")
            return False
        
        print(f"✅ Invoice uploaded successfully: {invoice_id}")
        
    except Exception as e:
        print(f"❌ Upload exception: {str(e)}")
        return False
    
    # Step 4: Validate parsing results
    print("\n🔍 Step 4: Validating parsing results")
    try:
        response = requests.get(f"{BASE_URL}/invoices/{invoice_id}", headers=headers, timeout=30)
        
        if response.status_code != 200:
            print(f"❌ Failed to get invoice details: {response.status_code}")
            return False
        
        invoice = response.json()
        
        # Expected values
        expected_values = {
            "customer_name": "YÖRÜKOĞLU SÜT VE ÜRÜNLERİ SANAYİ TİCARET ANONİM ŞİRKETİ",
            "customer_tax_id": "9830366087",
            "invoice_number": "SED2025000000078",
            "invoice_date": "27 10 2025",
            "grand_total": "47.395,61"
        }
        
        all_passed = True
        
        # Get products first
        products = invoice.get("products", [])
        
        # Validate each field
        for field, expected in expected_values.items():
            actual = invoice.get(field)
            if actual == expected:
                print(f"✅ {field}: {actual}")
            else:
                print(f"❌ {field}: Expected '{expected}', Got '{actual}'")
                all_passed = False
        
        # Debug: Print all products found
        print(f"\n🔍 Debug - All products found ({len(products)}):")
        for i, product in enumerate(products, 1):
            print(f"  {i}. {product.get('product_name', 'N/A')} - Qty: {product.get('quantity', 'N/A')}")
        print()
        
        # Validate product count
        if len(products) == 9:
            print(f"✅ Product count: {len(products)}")
        else:
            print(f"❌ Product count: Expected 9, Got {len(products)}")
            all_passed = False
        
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
                print(f"✅ Product '{expected_product['name']}': Found with quantity {expected_product['quantity']}")
            else:
                print(f"❌ Product '{expected_product['name']}': Not found or incorrect quantity")
                all_passed = False
        
        return all_passed
        
    except Exception as e:
        print(f"❌ Validation exception: {str(e)}")
        return False

if __name__ == "__main__":
    success = test_sed_invoice()
    
    print("\n" + "=" * 50)
    if success:
        print("🎉 SED Invoice parsing test PASSED!")
    else:
        print("💥 SED Invoice parsing test FAILED!")
    
    exit(0 if success else 1)