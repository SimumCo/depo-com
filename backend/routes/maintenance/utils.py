"""
Maintenance Module - Ortak Yardımcı Fonksiyonlar
"""
from fastapi import HTTPException
from models.user import UserRole


def check_maintenance_access(user):
    """Check if user has maintenance management access"""
    allowed_roles = [
        UserRole.ADMIN,
        UserRole.PRODUCTION_MANAGER,
        UserRole.MAINTENANCE_TECHNICIAN,
        UserRole.WAREHOUSE_SUPERVISOR
    ]
    # Handle both dict and Pydantic model
    user_role = user.role if hasattr(user, 'role') else user.get("role")
    if user_role not in allowed_roles:
        raise HTTPException(status_code=403, detail="Yetkisiz erişim")


def serialize_mongo_doc(doc):
    """Convert MongoDB document _id to string"""
    if doc and "_id" in doc:
        doc["_id"] = str(doc["_id"])
    return doc


def serialize_mongo_list(docs):
    """Convert MongoDB documents _id to string"""
    for doc in docs:
        serialize_mongo_doc(doc)
    return docs
