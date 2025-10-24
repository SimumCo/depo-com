from fastapi import APIRouter, HTTPException, Depends, UploadFile, File
from typing import List
from datetime import datetime, timedelta
from models.user import User, UserRole
from models.invoice import Invoice, InvoiceItem, PurchasePattern
from schemas.invoice import InvoiceCreate
from middleware.auth import get_current_user, require_role
from config.database import db
import base64
import logging

router = APIRouter(prefix="/invoices")
logger = logging.getLogger(__name__)

@router.post("/upload")
async def upload_invoice(
    file: UploadFile = File(...),
    customer_id: str = None,
    current_user: User = Depends(get_current_user)
):
    """Upload invoice PDF/Image for OCR processing - For Accounting role"""
    try:
        # Check permissions
        if current_user.role not in [UserRole.CUSTOMER, UserRole.ACCOUNTING]:
            raise HTTPException(status_code=403, detail="Not authorized")
        
        # Read file
        file_content = await file.read()
        file_base64 = base64.b64encode(file_content).decode('utf-8')
        
        # For accounting, customer_id should be provided
        if current_user.role == UserRole.ACCOUNTING and not customer_id:
            raise HTTPException(status_code=400, detail="customer_id is required for accounting role")
        
        # For customer, use their own ID
        if current_user.role == UserRole.CUSTOMER:
            customer_id = current_user.id
        
        # Save file info temporarily
        file_url = f"uploads/{file.filename}"  # In production, save to cloud storage
        
        # Create a simplified invoice record (without items)
        invoice_obj = Invoice(
            customer_id=customer_id,
            invoice_number=f"INV-{datetime.now().strftime('%Y%m%d%H%M%S')}",
            invoice_date=datetime.now(),
            file_url=file_url,
            file_type=file.content_type,
            notes="OCR işlemi bekleniyor"
        )
        
        doc = invoice_obj.model_dump()
        doc['invoice_date'] = doc['invoice_date'].isoformat()
        doc['created_at'] = doc['created_at'].isoformat()
        doc['updated_at'] = doc['updated_at'].isoformat()
        
        await db.invoices.insert_one(doc)
        
        logger.info(f"Invoice uploaded by {current_user.role} {current_user.id}: {file.filename} for customer {customer_id}")
        
        return {
            "message": "Fatura başarıyla yüklendi",
            "invoice_id": invoice_obj.id,
            "filename": file.filename,
            "size": len(file_content),
            "customer_id": customer_id,
            "status": "uploaded"
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Invoice upload failed: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Upload failed: {str(e)}")

@router.post("", response_model=Invoice)
async def create_invoice(
    invoice_input: InvoiceCreate,
    current_user: User = Depends(require_role([UserRole.CUSTOMER]))
):
    """Create invoice from manual input or OCR data"""
    invoice_dict = invoice_input.model_dump()
    invoice_dict['customer_id'] = current_user.id
    
    invoice_obj = Invoice(**invoice_dict)
    doc = invoice_obj.model_dump()
    doc['invoice_date'] = doc['invoice_date'].isoformat()
    doc['created_at'] = doc['created_at'].isoformat()
    doc['updated_at'] = doc['updated_at'].isoformat()
    
    await db.invoices.insert_one(doc)
    
    # Update purchase patterns
    await update_purchase_patterns(current_user.id, invoice_obj.items)
    
    logger.info(f"Invoice created: {invoice_obj.invoice_number} for customer {current_user.id}")
    
    return invoice_obj

@router.get("", response_model=List[Invoice])
async def get_invoices(
    current_user: User = Depends(require_role([UserRole.CUSTOMER]))
):
    """Get all invoices for current customer"""
    invoices = await db.invoices.find({"customer_id": current_user.id}, {"_id": 0}).to_list(1000)
    
    for invoice in invoices:
        if isinstance(invoice.get('invoice_date'), str):
            invoice['invoice_date'] = datetime.fromisoformat(invoice['invoice_date'])
        if isinstance(invoice.get('created_at'), str):
            invoice['created_at'] = datetime.fromisoformat(invoice['created_at'])
        if isinstance(invoice.get('updated_at'), str):
            invoice['updated_at'] = datetime.fromisoformat(invoice['updated_at'])
    
    return invoices

@router.get("/analysis")
async def get_purchase_analysis(
    period: str = "monthly",  # monthly, quarterly, yearly
    current_user: User = Depends(require_role([UserRole.CUSTOMER]))
):
    """Get purchase pattern analysis"""
    # Get all invoices for the customer
    invoices = await db.invoices.find({"customer_id": current_user.id}, {"_id": 0}).to_list(1000)
    
    if not invoices:
        return {
            "message": "Henüz fatura kaydı bulunmuyor",
            "total_invoices": 0,
            "analysis": []
        }
    
    # Analyze purchase patterns
    product_analysis = {}
    
    for invoice in invoices:
        invoice_date = invoice.get('invoice_date')
        if isinstance(invoice_date, str):
            invoice_date = datetime.fromisoformat(invoice_date)
        
        for item in invoice.get('items', []):
            product_name = item.get('product_name')
            quantity = item.get('quantity', 0)
            
            if product_name not in product_analysis:
                product_analysis[product_name] = {
                    'product_name': product_name,
                    'total_quantity': 0,
                    'total_spent': 0,
                    'purchase_count': 0,
                    'purchases': [],
                    'last_purchase': None
                }
            
            product_analysis[product_name]['total_quantity'] += quantity
            product_analysis[product_name]['total_spent'] += item.get('total_price', 0)
            product_analysis[product_name]['purchase_count'] += 1
            product_analysis[product_name]['purchases'].append({
                'date': invoice_date.isoformat(),
                'quantity': quantity,
                'price': item.get('total_price', 0)
            })
            product_analysis[product_name]['last_purchase'] = invoice_date.isoformat()
    
    # Calculate predictions and trends
    analysis_result = []
    for product_name, data in product_analysis.items():
        avg_quantity = data['total_quantity'] / data['purchase_count']
        
        # Simple trend calculation
        purchases = sorted(data['purchases'], key=lambda x: x['date'])
        trend = "stable"
        if len(purchases) >= 2:
            recent_avg = sum(p['quantity'] for p in purchases[-3:]) / min(3, len(purchases[-3:]))
            older_avg = sum(p['quantity'] for p in purchases[:3]) / min(3, len(purchases[:3]))
            if recent_avg > older_avg * 1.2:
                trend = "increasing"
            elif recent_avg < older_avg * 0.8:
                trend = "decreasing"
        
        # Predict next purchase (simple: add average interval)
        if len(purchases) >= 2:
            dates = [datetime.fromisoformat(p['date']) for p in purchases]
            intervals = [(dates[i+1] - dates[i]).days for i in range(len(dates)-1)]
            avg_interval = sum(intervals) / len(intervals)
            last_date = dates[-1]
            predicted_next = last_date + timedelta(days=avg_interval)
        else:
            predicted_next = None
        
        analysis_result.append({
            'product_name': product_name,
            'total_quantity': data['total_quantity'],
            'total_spent': data['total_spent'],
            'purchase_count': data['purchase_count'],
            'average_quantity': round(avg_quantity, 2),
            'trend': trend,
            'last_purchase': data['last_purchase'],
            'predicted_next_purchase': predicted_next.isoformat() if predicted_next else None,
            'purchases': data['purchases']
        })
    
    # Sort by total spent
    analysis_result.sort(key=lambda x: x['total_spent'], reverse=True)
    
    return {
        "total_invoices": len(invoices),
        "analysis_period": period,
        "analysis": analysis_result,
        "summary": {
            "total_products": len(analysis_result),
            "total_spent": sum(a['total_spent'] for a in analysis_result),
            "total_purchases": sum(a['purchase_count'] for a in analysis_result)
        }
    }

@router.get("/recommendations")
async def get_purchase_recommendations(
    current_user: User = Depends(require_role([UserRole.CUSTOMER]))
):
    """Get AI-powered purchase recommendations based on patterns"""
    # Get analysis
    analysis_data = await get_purchase_analysis("monthly", current_user)
    
    if analysis_data['total_invoices'] == 0:
        return {
            "recommendations": [],
            "message": "Yeterli veri bulunmuyor"
        }
    
    recommendations = []
    today = datetime.now()
    
    for product in analysis_data['analysis']:
        # Recommendation 1: Predict when to reorder
        if product['predicted_next_purchase']:
            predicted_date = datetime.fromisoformat(product['predicted_next_purchase'])
            days_until = (predicted_date - today).days
            
            if days_until <= 7 and days_until >= 0:
                recommendations.append({
                    'type': 'urgent',
                    'priority': 'high',
                    'product': product['product_name'],
                    'message': f"Bu ürünü yakında sipariş etmeniz önerilir (tahmini: {days_until} gün sonra)",
                    'suggested_quantity': product['average_quantity'],
                    'reason': 'Geçmiş alım deseninize göre'
                })
            elif days_until < 0:
                recommendations.append({
                    'type': 'overdue',
                    'priority': 'critical',
                    'product': product['product_name'],
                    'message': f"Bu ürün için sipariş zamanı geçmiş ({abs(days_until)} gün)",
                    'suggested_quantity': product['average_quantity'],
                    'reason': 'Normal alım süreniz geçti'
                })
        
        # Recommendation 2: Trend-based
        if product['trend'] == 'increasing':
            recommendations.append({
                'type': 'trend',
                'priority': 'medium',
                'product': product['product_name'],
                'message': f"Tüketiminiz artıyor, daha fazla stok düşünebilirsiniz",
                'suggested_quantity': product['average_quantity'] * 1.5,
                'reason': 'Artan tüketim trendi'
            })
    
    return {
        "recommendations": recommendations,
        "total_recommendations": len(recommendations)
    }

@router.get("/customer-stats/{customer_id}")
async def get_customer_invoice_stats(
    customer_id: str,
    current_user: User = Depends(get_current_user)
):
    """Get invoice statistics for a specific customer - For Customer and Logistics"""
    # Check permissions
    if current_user.role not in [UserRole.CUSTOMER, UserRole.WAREHOUSE_MANAGER, UserRole.ADMIN, UserRole.SALES_AGENT]:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    # If customer, can only see their own stats
    if current_user.role == UserRole.CUSTOMER and current_user.id != customer_id:
        raise HTTPException(status_code=403, detail="Can only view your own statistics")
    
    # Get all invoices for this customer
    invoices = await db.invoices.find({"customer_id": customer_id}, {"_id": 0}).to_list(1000)
    
    if not invoices:
        return {
            "customer_id": customer_id,
            "total_invoices": 0,
            "message": "Henüz fatura kaydı bulunmuyor"
        }
    
    # Calculate statistics
    total_amount = sum(inv.get('total_amount', 0) for inv in invoices)
    total_count = len(invoices)
    
    # Get date range
    dates = [datetime.fromisoformat(inv['invoice_date']) if isinstance(inv['invoice_date'], str) else inv['invoice_date'] 
             for inv in invoices if inv.get('invoice_date')]
    
    first_invoice = min(dates) if dates else None
    last_invoice = max(dates) if dates else None
    
    # Monthly breakdown
    monthly_stats = {}
    for invoice in invoices:
        inv_date = invoice.get('invoice_date')
        if isinstance(inv_date, str):
            inv_date = datetime.fromisoformat(inv_date)
        
        month_key = inv_date.strftime('%Y-%m')
        if month_key not in monthly_stats:
            monthly_stats[month_key] = {'count': 0, 'amount': 0}
        
        monthly_stats[month_key]['count'] += 1
        monthly_stats[month_key]['amount'] += invoice.get('total_amount', 0)
    
    # Calculate average
    avg_invoice_amount = total_amount / total_count if total_count > 0 else 0
    
    # Recent invoices (last 5)
    recent_invoices = sorted(invoices, key=lambda x: x.get('invoice_date', ''), reverse=True)[:5]
    
    return {
        "customer_id": customer_id,
        "total_invoices": total_count,
        "total_amount": round(total_amount, 2),
        "average_invoice_amount": round(avg_invoice_amount, 2),
        "first_invoice_date": first_invoice.isoformat() if first_invoice else None,
        "last_invoice_date": last_invoice.isoformat() if last_invoice else None,
        "monthly_breakdown": [
            {
                "month": month,
                "invoice_count": data['count'],
                "total_amount": round(data['amount'], 2)
            }
            for month, data in sorted(monthly_stats.items())
        ],
        "recent_invoices": [
            {
                "invoice_number": inv.get('invoice_number'),
                "invoice_date": inv.get('invoice_date'),
                "total_amount": inv.get('total_amount', 0),
                "supplier": inv.get('supplier_name')
            }
            for inv in recent_invoices
        ]
    }

async def update_purchase_patterns(customer_id: str, items: List[InvoiceItem]):
    """Update purchase patterns based on new invoice"""
    for item in items:
        pattern = await db.purchase_patterns.find_one({
            "customer_id": customer_id,
            "product_name": item.product_name
        }, {"_id": 0})
        
        if pattern:
            # Update existing pattern
            await db.purchase_patterns.update_one(
                {"customer_id": customer_id, "product_name": item.product_name},
                {"$set": {
                    "total_quantity": pattern['total_quantity'] + item.quantity,
                    "frequency": pattern['frequency'] + 1,
                    "last_purchase_date": datetime.now(timezone.utc).isoformat(),
                    "updated_at": datetime.now(timezone.utc).isoformat()
                }}
            )
        else:
            # Create new pattern
            pattern_obj = PurchasePattern(
                customer_id=customer_id,
                product_name=item.product_name,
                analysis_period="monthly",
                total_quantity=item.quantity,
                average_quantity_per_period=item.quantity,
                frequency=1,
                last_purchase_date=datetime.now(timezone.utc)
            )
            doc = pattern_obj.model_dump()
            doc['created_at'] = doc['created_at'].isoformat()
            doc['updated_at'] = doc['updated_at'].isoformat()
            doc['last_purchase_date'] = doc['last_purchase_date'].isoformat()
            await db.purchase_patterns.insert_one(doc)
