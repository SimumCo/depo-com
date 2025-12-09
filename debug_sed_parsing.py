#!/usr/bin/env python3
"""
Debug SED Invoice Parsing - Check what's actually being parsed
"""

import requests
import json
from bs4 import BeautifulSoup
import re

# Configuration
BASE_URL = "https://production-panel.preview.emergentagent.com/api"

def debug_sed_parsing():
    """Debug SED invoice parsing step by step"""
    
    # 1. Login as accounting
    login_response = requests.post(
        f"{BASE_URL}/auth/login",
        json={"username": "muhasebe", "password": "muhasebe123"},
        timeout=30
    )
    
    if login_response.status_code != 200:
        print(f"❌ Login failed: {login_response.status_code}")
        return
    
    token = login_response.json().get("access_token")
    headers = {"Authorization": f"Bearer {token}"}
    
    # 2. Fetch SED HTML content
    html_response = requests.get(
        "https://customer-assets.emergentagent.com/job_c21b56fa-eb45-48e4-8eca-74c5ff09f9b2/artifacts/nf1rxoc2_SED2025000000078.html",
        timeout=30
    )
    
    if html_response.status_code != 200:
        print(f"❌ Failed to fetch HTML: {html_response.status_code}")
        return
    
    html_content = html_response.text
    
    # 3. Upload invoice
    upload_response = requests.post(
        f"{BASE_URL}/invoices/upload",
        json={"html_content": html_content},
        headers=headers,
        timeout=30
    )
    
    if upload_response.status_code != 200:
        print(f"❌ Upload failed: {upload_response.status_code} - {upload_response.text}")
        return
    
    invoice_id = upload_response.json().get("invoice_id")
    print(f"✅ Invoice uploaded: {invoice_id}")
    
    # 4. Get invoice details
    detail_response = requests.get(
        f"{BASE_URL}/invoices/{invoice_id}",
        headers=headers,
        timeout=30
    )
    
    if detail_response.status_code != 200:
        print(f"❌ Failed to get details: {detail_response.status_code}")
        return
    
    invoice = detail_response.json()
    
    # 5. Debug parsing results
    print("\n🔍 PARSING RESULTS:")
    print("=" * 50)
    print(f"Customer Name: '{invoice.get('customer_name')}'")
    print(f"Tax ID: '{invoice.get('customer_tax_id')}'")
    print(f"Invoice Number: '{invoice.get('invoice_number')}'")
    print(f"Invoice Date: '{invoice.get('invoice_date')}'")
    print(f"Grand Total: '{invoice.get('grand_total')}'")
    print(f"Product Count: {len(invoice.get('products', []))}")
    
    print("\n📦 PRODUCTS:")
    for i, product in enumerate(invoice.get('products', []), 1):
        print(f"{i}. Name: '{product.get('product_name')}'")
        print(f"   Code: '{product.get('product_code')}'")
        print(f"   Quantity: {product.get('quantity')}")
        print(f"   Unit Price: '{product.get('unit_price')}'")
        print(f"   Total: '{product.get('total')}'")
        print()
    
    # 6. Debug HTML structure
    print("\n🔍 HTML STRUCTURE DEBUG:")
    print("=" * 50)
    
    soup = BeautifulSoup(html_content, 'html.parser')
    
    # Check customerIDTable
    customer_table = soup.find('table', {'id': 'customerIDTable'})
    if customer_table:
        print("✅ Found customerIDTable")
        bold_spans = customer_table.find_all('span', {'style': lambda x: x and 'font-weight:bold' in x})
        print(f"Bold spans found: {len(bold_spans)}")
        for i, span in enumerate(bold_spans):
            print(f"  {i+1}. '{span.get_text(strip=True)}'")
    else:
        print("❌ customerIDTable not found")
    
    # Check lineTable
    line_table = soup.find('table', {'id': 'lineTable'})
    if line_table:
        print("\n✅ Found lineTable")
        rows = line_table.find_all('tr')
        print(f"Total rows: {len(rows)}")
        
        for i, row in enumerate(rows):
            cells = row.find_all('td')
            if len(cells) >= 6:
                print(f"Row {i+1}: {len(cells)} cells")
                print(f"  Cell 1 (Code): '{cells[1].get_text(strip=True) if len(cells) > 1 else ''}'")
                print(f"  Cell 2 (Name): '{cells[2].get_text(strip=True) if len(cells) > 2 else ''}'")
                print(f"  Cell 3 (Qty): '{cells[3].get_text(strip=True) if len(cells) > 3 else ''}'")
                
                # Check quantity parsing
                quantity_text = cells[3].get_text(strip=True) if len(cells) > 3 else "0"
                quantity_match = re.search(r'(\d+)', quantity_text)
                quantity = float(quantity_match.group(1)) if quantity_match else 0.0
                print(f"  Parsed Quantity: {quantity}")
                print()
    else:
        print("❌ lineTable not found")

if __name__ == "__main__":
    debug_sed_parsing()