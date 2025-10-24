from fastapi import APIRouter, UploadFile, File, Depends, HTTPException
from typing import List, Optional
import pandas as pd
import io
from datetime import datetime, timezone
import uuid
from server import (
    User, UserRole, require_role, db, 
    CustomerProfile, Product, Order, OrderStatus, ChannelType,
    hash_password
)

router = APIRouter(prefix="/bulk-import", tags=["Bulk Import"])


@router.post("/customers/template")
async def download_customer_template(
    current_user: User = Depends(require_role([UserRole.SALES_REP, UserRole.ADMIN]))
):
    """Müşteri Excel template indir"""
    return {
        "columns": ["isletme_id", "isletme_adi", "adres", "sehir", "telefon", "vergi_no", "kanal_tipi"],
        "example": {
            "isletme_id": "CUST001",
            "isletme_adi": "ABC Market",
            "adres": "Atatürk Cad. No:123",
            "sehir": "İstanbul",
            "telefon": "+90 555 123 4567",
            "vergi_no": "1234567890",
            "kanal_tipi": "dealer"  # logistics veya dealer
        }
    }


@router.post("/customers/upload")
async def upload_customers(
    file: UploadFile = File(...),
    current_user: User = Depends(require_role([UserRole.SALES_REP, UserRole.ADMIN]))
):
    """Excel ile müşteri toplu yükleme"""
    if not file.filename.endswith(('.xlsx', '.xls')):
        raise HTTPException(status_code=400, detail="Sadece Excel dosyaları (.xlsx, .xls) kabul edilir")
    
    try:
        contents = await file.read()
        df = pd.read_excel(io.BytesIO(contents))
        
        # Required columns check
        required_cols = ['isletme_id', 'isletme_adi', 'adres']
        missing_cols = [col for col in required_cols if col not in df.columns]
        if missing_cols:
            raise HTTPException(status_code=400, detail=f"Eksik kolonlar: {missing_cols}")
        
        results = {
            "success": [],
            "errors": [],
            "skipped": []
        }
        
        for index, row in df.iterrows():
            try:
                isletme_id = str(row['isletme_id']).strip()
                isletme_adi = str(row['isletme_adi']).strip()
                
                # Check if customer already exists
                existing = await db.users.find_one({"customer_number": isletme_id})
                if existing:
                    results["skipped"].append({
                        "row": index + 2,
                        "isletme_id": isletme_id,
                        "reason": "Bu işletme ID zaten mevcut"
                    })
                    continue
                
                # Create customer user
                customer_id = str(uuid.uuid4())
                channel_type = str(row.get('kanal_tipi', 'dealer')).strip().lower()
                if channel_type not in ['logistics', 'dealer']:
                    channel_type = 'dealer'
                
                customer = {
                    "id": customer_id,
                    "username": f"customer_{isletme_id.lower()}",
                    "password_hash": hash_password("12345"),  # Default password
                    "email": f"{isletme_id.lower()}@customer.com",
                    "full_name": isletme_adi,
                    "role": "customer",
                    "customer_number": isletme_id,
                    "channel_type": channel_type,
                    "is_active": True,
                    "created_at": datetime.now(timezone.utc).isoformat()
                }
                
                await db.users.insert_one(customer)
                
                # Create customer profile
                profile = {
                    "id": str(uuid.uuid4()),
                    "user_id": customer_id,
                    "company_name": isletme_adi,
                    "phone": str(row.get('telefon', '')).strip() if pd.notna(row.get('telefon')) else None,
                    "address": str(row['adres']).strip(),
                    "city": str(row.get('sehir', '')).strip() if pd.notna(row.get('sehir')) else None,
                    "tax_number": str(row.get('vergi_no', '')).strip() if pd.notna(row.get('vergi_no')) else None,
                    "created_at": datetime.now(timezone.utc).isoformat(),
                    "updated_at": datetime.now(timezone.utc).isoformat()
                }
                
                await db.customer_profiles.insert_one(profile)
                
                results["success"].append({
                    "row": index + 2,
                    "isletme_id": isletme_id,
                    "isletme_adi": isletme_adi,
                    "username": customer['username'],
                    "default_password": "12345"
                })
                
            except Exception as e:
                results["errors"].append({
                    "row": index + 2,
                    "error": str(e)
                })
        
        return {
            "message": "İşlem tamamlandı",
            "summary": {
                "total": len(df),
                "success": len(results["success"]),
                "errors": len(results["errors"]),
                "skipped": len(results["skipped"])
            },
            "details": results
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Dosya işlenirken hata: {str(e)}")


@router.post("/products/template")
async def download_product_template(
    current_user: User = Depends(require_role([UserRole.SALES_REP, UserRole.ADMIN, UserRole.WAREHOUSE_MANAGER]))
):
    """Ürün Excel template indir"""
    return {
        "columns": ["urun_id", "urun_adi", "urun_turu", "stok", "son_kullanim_tarihi", "kasa_ici_adet", "agirlik_kg", "lojistik_fiyat", "bayi_fiyat"],
        "example": {
            "urun_id": "PRD001",
            "urun_adi": "Ürün Adı",
            "urun_turu": "Kategori",
            "stok": 1000,
            "son_kullanim_tarihi": "2025-12-31",
            "kasa_ici_adet": 12,
            "agirlik_kg": 1.5,
            "lojistik_fiyat": 10.50,
            "bayi_fiyat": 12.00
        }
    }


@router.post("/products/upload")
async def upload_products(
    file: UploadFile = File(...),
    current_user: User = Depends(require_role([UserRole.SALES_REP, UserRole.ADMIN, UserRole.WAREHOUSE_MANAGER]))
):
    """Excel ile ürün toplu yükleme"""
    if not file.filename.endswith(('.xlsx', '.xls')):
        raise HTTPException(status_code=400, detail="Sadece Excel dosyaları (.xlsx, .xls) kabul edilir")
    
    try:
        contents = await file.read()
        df = pd.read_excel(io.BytesIO(contents))
        
        required_cols = ['urun_id', 'urun_adi', 'urun_turu', 'stok', 'kasa_ici_adet']
        missing_cols = [col for col in required_cols if col not in df.columns]
        if missing_cols:
            raise HTTPException(status_code=400, detail=f"Eksik kolonlar: {missing_cols}")
        
        results = {
            "success": [],
            "errors": [],
            "skipped": []
        }
        
        for index, row in df.iterrows():
            try:
                urun_id = str(row['urun_id']).strip()
                
                # Check if product already exists
                existing = await db.products.find_one({"sku": urun_id})
                if existing:
                    results["skipped"].append({
                        "row": index + 2,
                        "urun_id": urun_id,
                        "reason": "Bu ürün ID zaten mevcut"
                    })
                    continue
                
                product_id = str(uuid.uuid4())
                
                product = {
                    "id": product_id,
                    "name": str(row['urun_adi']).strip(),
                    "sku": urun_id,
                    "category": str(row['urun_turu']).strip(),
                    "weight": float(row.get('agirlik_kg', 1.0)) if pd.notna(row.get('agirlik_kg')) else 1.0,
                    "units_per_case": int(row['kasa_ici_adet']),
                    "logistics_price": float(row.get('lojistik_fiyat', 0)) if pd.notna(row.get('lojistik_fiyat')) else 0.0,
                    "dealer_price": float(row.get('bayi_fiyat', 0)) if pd.notna(row.get('bayi_fiyat')) else 0.0,
                    "image_url": None,
                    "description": None,
                    "is_active": True,
                    "created_at": datetime.now(timezone.utc).isoformat()
                }
                
                await db.products.insert_one(product)
                
                # Create inventory
                expiry_date = None
                if pd.notna(row.get('son_kullanim_tarihi')):
                    try:
                        expiry_date = pd.to_datetime(row['son_kullanim_tarihi']).isoformat()
                    except:
                        pass
                
                inventory = {
                    "id": str(uuid.uuid4()),
                    "product_id": product_id,
                    "total_units": int(row['stok']),
                    "expiry_date": expiry_date,
                    "last_supply_date": datetime.now(timezone.utc).isoformat(),
                    "next_shipment_date": None,
                    "is_out_of_stock": int(row['stok']) == 0,
                    "location": None,
                    "updated_at": datetime.now(timezone.utc).isoformat()
                }
                
                await db.inventory.insert_one(inventory)
                
                results["success"].append({
                    "row": index + 2,
                    "urun_id": urun_id,
                    "urun_adi": product['name'],
                    "stok": int(row['stok'])
                })
                
            except Exception as e:
                results["errors"].append({
                    "row": index + 2,
                    "error": str(e)
                })
        
        return {
            "message": "İşlem tamamlandı",
            "summary": {
                "total": len(df),
                "success": len(results["success"]),
                "errors": len(results["errors"]),
                "skipped": len(results["skipped"])
            },
            "details": results
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Dosya işlenirken hata: {str(e)}")


@router.post("/orders/template")
async def download_order_template(
    current_user: User = Depends(require_role([UserRole.SALES_REP, UserRole.ADMIN]))
):
    """Sipariş Excel template indir"""
    return {
        "columns": ["siparis_id", "musteri_id", "urun_id_1", "adet_1", "urun_id_2", "adet_2", "urun_id_3", "adet_3", "siparis_tarihi", "siparis_durumu"],
        "example": {
            "siparis_id": "ORD001",
            "musteri_id": "CUST001",
            "urun_id_1": "PRD001",
            "adet_1": 50,
            "urun_id_2": "PRD002",
            "adet_2": 30,
            "urun_id_3": "",
            "adet_3": "",
            "siparis_tarihi": "2025-01-15",
            "siparis_durumu": "delivered"  # pending, approved, preparing, ready, dispatched, delivered
        },
        "note": "En fazla 10 ürün eklenebilir (urun_id_1 ile urun_id_10 arası)"
    }


@router.post("/orders/upload")
async def upload_orders(
    file: UploadFile = File(...),
    current_user: User = Depends(require_role([UserRole.SALES_REP, UserRole.ADMIN]))
):
    """Excel ile sipariş toplu yükleme"""
    if not file.filename.endswith(('.xlsx', '.xls')):
        raise HTTPException(status_code=400, detail="Sadece Excel dosyaları (.xlsx, .xls) kabul edilir")
    
    try:
        contents = await file.read()
        df = pd.read_excel(io.BytesIO(contents))
        
        required_cols = ['siparis_id', 'musteri_id', 'urun_id_1', 'adet_1']
        missing_cols = [col for col in required_cols if col not in df.columns]
        if missing_cols:
            raise HTTPException(status_code=400, detail=f"Eksik kolonlar: {missing_cols}")
        
        results = {
            "success": [],
            "errors": [],
            "skipped": []
        }
        
        for index, row in df.iterrows():
            try:
                siparis_id = str(row['siparis_id']).strip()
                musteri_id = str(row['musteri_id']).strip()
                
                # Check if order already exists
                existing = await db.orders.find_one({"order_number": siparis_id})
                if existing:
                    results["skipped"].append({
                        "row": index + 2,
                        "siparis_id": siparis_id,
                        "reason": "Bu sipariş ID zaten mevcut"
                    })
                    continue
                
                # Get customer
                customer = await db.users.find_one({"customer_number": musteri_id})
                if not customer:
                    results["errors"].append({
                        "row": index + 2,
                        "error": f"Müşteri ID bulunamadı: {musteri_id}"
                    })
                    continue
                
                # Collect products (up to 10)
                products = []
                total_amount = 0.0
                
                for i in range(1, 11):
                    urun_col = f'urun_id_{i}'
                    adet_col = f'adet_{i}'
                    
                    if urun_col not in df.columns or adet_col not in df.columns:
                        continue
                    
                    if pd.isna(row.get(urun_col)) or pd.isna(row.get(adet_col)):
                        continue
                    
                    urun_id = str(row[urun_col]).strip()
                    adet = int(row[adet_col])
                    
                    if not urun_id or adet <= 0:
                        continue
                    
                    # Get product
                    product = await db.products.find_one({"sku": urun_id})
                    if not product:
                        results["errors"].append({
                            "row": index + 2,
                            "error": f"Ürün ID bulunamadı: {urun_id}"
                        })
                        continue
                    
                    # Get price based on customer channel
                    channel_type = customer.get('channel_type', 'dealer')
                    unit_price = product.get('logistics_price', 0) if channel_type == 'logistics' else product.get('dealer_price', 0)
                    
                    total_price = adet * unit_price
                    total_amount += total_price
                    
                    products.append({
                        "product_id": product['id'],
                        "product_name": product['name'],
                        "units": adet,
                        "cases": adet // product.get('units_per_case', 1),
                        "unit_price": unit_price,
                        "total_price": total_price
                    })
                
                if not products:
                    results["errors"].append({
                        "row": index + 2,
                        "error": "Geçerli ürün bulunamadı"
                    })
                    continue
                
                # Order date
                order_date = datetime.now(timezone.utc)
                if pd.notna(row.get('siparis_tarihi')):
                    try:
                        order_date = pd.to_datetime(row['siparis_tarihi']).replace(tzinfo=timezone.utc)
                    except:
                        pass
                
                # Order status
                status = str(row.get('siparis_durumu', 'pending')).strip().lower()
                valid_statuses = ['pending', 'approved', 'preparing', 'ready', 'dispatched', 'delivered', 'cancelled']
                if status not in valid_statuses:
                    status = 'pending'
                
                order = {
                    "id": str(uuid.uuid4()),
                    "order_number": siparis_id,
                    "customer_id": customer['id'],
                    "sales_rep_id": current_user.id if current_user.role == UserRole.SALES_REP else None,
                    "channel_type": customer.get('channel_type', 'dealer'),
                    "status": status,
                    "products": products,
                    "total_amount": total_amount,
                    "notes": f"Excel import - {file.filename}",
                    "approved_by": None,
                    "prepared_by": None,
                    "dispatched_date": order_date.isoformat() if status in ['dispatched', 'delivered'] else None,
                    "delivered_date": order_date.isoformat() if status == 'delivered' else None,
                    "created_at": order_date.isoformat(),
                    "updated_at": datetime.now(timezone.utc).isoformat()
                }
                
                await db.orders.insert_one(order)
                
                results["success"].append({
                    "row": index + 2,
                    "siparis_id": siparis_id,
                    "musteri_id": musteri_id,
                    "urun_sayisi": len(products),
                    "toplam_tutar": total_amount
                })
                
            except Exception as e:
                results["errors"].append({
                    "row": index + 2,
                    "error": str(e)
                })
        
        return {
            "message": "İşlem tamamlandı",
            "summary": {
                "total": len(df),
                "success": len(results["success"]),
                "errors": len(results["errors"]),
                "skipped": len(results["skipped"])
            },
            "details": results
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Dosya işlenirken hata: {str(e)}")
