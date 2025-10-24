from fastapi import FastAPI, APIRouter, HTTPException, Depends, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict, EmailStr
from typing import List, Optional, Dict, Any
import uuid
from datetime import datetime, timezone, timedelta
from passlib.context import CryptContext
import jwt
from enum import Enum


ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Security
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
security = HTTPBearer()
SECRET_KEY = os.environ.get("SECRET_KEY", "your-secret-key-change-in-production")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24  # 24 hours

# Create the main app without a prefix
app = FastAPI()

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")


# ===============================
# ENUMS
# ===============================
class UserRole(str, Enum):
    ADMIN = "admin"
    WAREHOUSE_MANAGER = "warehouse_manager"
    WAREHOUSE_STAFF = "warehouse_staff"
    SALES_REP = "sales_rep"
    CUSTOMER = "customer"
    ACCOUNTING = "accounting"
    SALES_AGENT = "sales_agent"  # Plasiyer

class ChannelType(str, Enum):
    LOGISTICS = "logistics"  # Hotels, Government
    DEALER = "dealer"  # Supermarkets, End-users

class OrderStatus(str, Enum):
    PENDING = "pending"
    APPROVED = "approved"
    PREPARING = "preparing"
    READY = "ready"
    DISPATCHED = "dispatched"
    DELIVERED = "delivered"
    CANCELLED = "cancelled"

class TaskStatus(str, Enum):
    PENDING = "pending"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    APPROVED = "approved"

class ShipmentStatus(str, Enum):
    EXPECTED = "expected"
    ARRIVED = "arrived"
    PROCESSED = "processed"


# ===============================
# MODELS
# ===============================
class User(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    username: str
    password_hash: str
    email: Optional[EmailStr] = None
    full_name: str
    role: UserRole
    customer_number: Optional[str] = None  # For customers only
    channel_type: Optional[ChannelType] = None  # For customers/sales reps
    is_active: bool = True
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class Product(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    sku: str
    category: str
    weight: float  # in kg
    units_per_case: int
    image_url: Optional[str] = None
    description: Optional[str] = None
    logistics_price: float = 0.0  # Price for logistics channel
    dealer_price: float = 0.0  # Price for dealer channel
    is_active: bool = True
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class ProductFeedback(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    product_id: str
    customer_id: str
    order_id: Optional[str] = None
    rating: int  # 1-5
    comment: Optional[str] = None
    is_defective: bool = False
    defect_description: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class CustomerProfile(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    company_name: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    tax_number: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class Inventory(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    product_id: str
    total_units: int = 0
    expiry_date: Optional[datetime] = None
    last_supply_date: Optional[datetime] = None
    next_shipment_date: Optional[datetime] = None
    is_out_of_stock: bool = False
    location: Optional[str] = None  # Warehouse location
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class IncomingShipment(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    shipment_number: str
    expected_date: datetime
    arrival_date: Optional[datetime] = None
    status: ShipmentStatus = ShipmentStatus.EXPECTED
    products: List[Dict[str, Any]] = []  # [{product_id, expected_units, received_units, expiry_date}]
    notes: Optional[str] = None
    processed_by: Optional[str] = None  # User ID
    created_by: str  # User ID
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class Order(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    order_number: str
    customer_id: str
    sales_rep_id: Optional[str] = None
    channel_type: ChannelType
    status: OrderStatus = OrderStatus.PENDING
    products: List[Dict[str, Any]] = []  # [{product_id, units, cases, unit_price, total_price}]
    total_amount: float = 0.0
    notes: Optional[str] = None
    approved_by: Optional[str] = None  # User ID
    prepared_by: Optional[str] = None  # User ID
    dispatched_date: Optional[datetime] = None
    delivered_date: Optional[datetime] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class Task(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    title: str
    description: str
    assigned_to: str  # User ID (warehouse staff)
    assigned_by: str  # User ID (warehouse manager)
    status: TaskStatus = TaskStatus.PENDING
    priority: str = "medium"  # low, medium, high
    due_date: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    feedback: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


# ===============================
# INPUT MODELS
# ===============================
class UserCreate(BaseModel):
    username: str
    password: str
    email: Optional[EmailStr] = None
    full_name: str
    role: UserRole
    customer_number: Optional[str] = None
    channel_type: Optional[ChannelType] = None

class UserLogin(BaseModel):
    username: str
    password: str

class ProductCreate(BaseModel):
    name: str
    sku: str
    category: str
    weight: float
    units_per_case: int
    logistics_price: float = 0.0
    dealer_price: float = 0.0
    image_url: Optional[str] = None
    description: Optional[str] = None

class InventoryUpdate(BaseModel):
    product_id: str
    units_change: int  # Can be positive or negative
    expiry_date: Optional[datetime] = None
    location: Optional[str] = None

class IncomingShipmentCreate(BaseModel):
    shipment_number: str
    expected_date: datetime
    products: List[Dict[str, Any]]
    notes: Optional[str] = None

class OrderCreate(BaseModel):
    customer_id: str
    channel_type: ChannelType
    products: List[Dict[str, Any]]
    notes: Optional[str] = None

class TaskCreate(BaseModel):
    title: str
    description: str
    assigned_to: str
    priority: str = "medium"
    due_date: Optional[datetime] = None

class TaskUpdate(BaseModel):
    status: Optional[TaskStatus] = None
    feedback: Optional[str] = None

class ProductFeedbackCreate(BaseModel):
    product_id: str
    order_id: Optional[str] = None
    rating: int  # 1-5
    comment: Optional[str] = None
    is_defective: bool = False
    defect_description: Optional[str] = None

class CustomerProfileCreate(BaseModel):
    company_name: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    tax_number: Optional[str] = None


# ===============================
# HELPER FUNCTIONS
# ===============================
def hash_password(password: str) -> str:
    return pwd_context.hash(password)

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)) -> User:
    try:
        token = credentials.credentials
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id: str = payload.get("sub")
        if user_id is None:
            raise HTTPException(status_code=401, detail="Invalid authentication credentials")
    except jwt.PyJWTError:
        raise HTTPException(status_code=401, detail="Invalid authentication credentials")
    
    user_doc = await db.users.find_one({"id": user_id}, {"_id": 0})
    if user_doc is None:
        raise HTTPException(status_code=401, detail="User not found")
    
    # Convert ISO strings back to datetime
    if isinstance(user_doc.get('created_at'), str):
        user_doc['created_at'] = datetime.fromisoformat(user_doc['created_at'])
    
    return User(**user_doc)

def require_role(allowed_roles: List[UserRole]):
    async def role_checker(current_user: User = Depends(get_current_user)):
        if current_user.role not in allowed_roles:
            raise HTTPException(status_code=403, detail="Not authorized to perform this action")
        return current_user
    return role_checker


# ===============================
# AUTHENTICATION ROUTES
# ===============================
@api_router.post("/auth/register", response_model=Dict[str, str])
async def register(user_input: UserCreate):
    # Check if username exists
    existing_user = await db.users.find_one({"username": user_input.username}, {"_id": 0})
    if existing_user:
        raise HTTPException(status_code=400, detail="Username already registered")
    
    # Create user
    user_dict = user_input.model_dump()
    password = user_dict.pop("password")
    user_dict["password_hash"] = hash_password(password)
    
    user_obj = User(**user_dict)
    doc = user_obj.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    
    await db.users.insert_one(doc)
    
    return {"message": "User registered successfully", "user_id": user_obj.id}

@api_router.post("/auth/login")
async def login(credentials: UserLogin):
    # Find user
    user_doc = await db.users.find_one({"username": credentials.username}, {"_id": 0})
    if not user_doc:
        raise HTTPException(status_code=401, detail="Invalid username or password")
    
    # Verify password
    if not verify_password(credentials.password, user_doc["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid username or password")
    
    # Check if active
    if not user_doc.get("is_active", True):
        raise HTTPException(status_code=401, detail="User account is deactivated")
    
    # Create access token
    access_token = create_access_token(data={"sub": user_doc["id"], "role": user_doc["role"]})
    
    # Convert datetime for response
    if isinstance(user_doc.get('created_at'), str):
        user_doc['created_at'] = datetime.fromisoformat(user_doc['created_at'])
    
    user_obj = User(**user_doc)
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": user_obj.model_dump(exclude={"password_hash"})
    }

@api_router.get("/auth/me", response_model=User)
async def get_me(current_user: User = Depends(get_current_user)):
    return current_user


# ===============================
# PRODUCT ROUTES
# ===============================
@api_router.post("/products", response_model=Product)
async def create_product(
    product_input: ProductCreate,
    current_user: User = Depends(require_role([UserRole.ADMIN, UserRole.WAREHOUSE_MANAGER]))
):
    product_obj = Product(**product_input.model_dump())
    doc = product_obj.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    
    await db.products.insert_one(doc)
    
    # Initialize inventory
    inventory_obj = Inventory(product_id=product_obj.id)
    inv_doc = inventory_obj.model_dump()
    inv_doc['updated_at'] = inv_doc['updated_at'].isoformat()
    await db.inventory.insert_one(inv_doc)
    
    return product_obj

@api_router.get("/products", response_model=List[Product])
async def get_products(current_user: User = Depends(get_current_user)):
    products = await db.products.find({"is_active": True}, {"_id": 0}).to_list(1000)
    
    for product in products:
        if isinstance(product.get('created_at'), str):
            product['created_at'] = datetime.fromisoformat(product['created_at'])
    
    return products

@api_router.get("/products/{product_id}", response_model=Product)
async def get_product(product_id: str, current_user: User = Depends(get_current_user)):
    product = await db.products.find_one({"id": product_id}, {"_id": 0})
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    
    if isinstance(product.get('created_at'), str):
        product['created_at'] = datetime.fromisoformat(product['created_at'])
    
    return Product(**product)


# ===============================
# INVENTORY ROUTES
# ===============================
@api_router.get("/inventory")
async def get_inventory(current_user: User = Depends(get_current_user)):
    inventory_items = await db.inventory.find({}, {"_id": 0}).to_list(1000)
    
    # Get product details for each inventory item
    result = []
    for item in inventory_items:
        if isinstance(item.get('updated_at'), str):
            item['updated_at'] = datetime.fromisoformat(item['updated_at'])
        if isinstance(item.get('expiry_date'), str):
            item['expiry_date'] = datetime.fromisoformat(item['expiry_date'])
        if isinstance(item.get('last_supply_date'), str):
            item['last_supply_date'] = datetime.fromisoformat(item['last_supply_date'])
        if isinstance(item.get('next_shipment_date'), str):
            item['next_shipment_date'] = datetime.fromisoformat(item['next_shipment_date'])
        
        product = await db.products.find_one({"id": item["product_id"]}, {"_id": 0})
        if product:
            if isinstance(product.get('created_at'), str):
                product['created_at'] = datetime.fromisoformat(product['created_at'])
            
            # Calculate cases and remaining units
            units_per_case = product.get('units_per_case', 1)
            total_units = item.get('total_units', 0)
            full_cases = total_units // units_per_case
            remaining_units = total_units % units_per_case
            
            # Apply stock visibility rules based on user role
            visible_units = total_units
            if current_user.role in [UserRole.SALES_REP, UserRole.CUSTOMER]:
                # Show limited stock (1/3 of actual)
                visible_units = max(1, total_units // 3) if total_units > 0 else 0
            
            visible_full_cases = visible_units // units_per_case
            visible_remaining_units = visible_units % units_per_case
            
            result.append({
                **item,
                "product": product,
                "full_cases": full_cases,
                "remaining_units": remaining_units,
                "visible_units": visible_units,
                "visible_full_cases": visible_full_cases,
                "visible_remaining_units": visible_remaining_units
            })
    
    return result

@api_router.put("/inventory/update")
async def update_inventory(
    update: InventoryUpdate,
    current_user: User = Depends(require_role([UserRole.ADMIN, UserRole.WAREHOUSE_MANAGER, UserRole.WAREHOUSE_STAFF]))
):
    inventory = await db.inventory.find_one({"product_id": update.product_id}, {"_id": 0})
    if not inventory:
        raise HTTPException(status_code=404, detail="Inventory not found")
    
    new_total = inventory['total_units'] + update.units_change
    if new_total < 0:
        raise HTTPException(status_code=400, detail="Insufficient stock")
    
    update_doc = {
        "total_units": new_total,
        "is_out_of_stock": new_total == 0,
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    
    if update.expiry_date:
        update_doc["expiry_date"] = update.expiry_date.isoformat()
    if update.location:
        update_doc["location"] = update.location
    if update.units_change > 0:
        update_doc["last_supply_date"] = datetime.now(timezone.utc).isoformat()
    
    await db.inventory.update_one({"product_id": update.product_id}, {"$set": update_doc})
    
    return {"message": "Inventory updated successfully"}


# ===============================
# INCOMING SHIPMENT ROUTES
# ===============================
@api_router.post("/shipments/incoming", response_model=IncomingShipment)
async def create_incoming_shipment(
    shipment_input: IncomingShipmentCreate,
    current_user: User = Depends(require_role([UserRole.ADMIN, UserRole.WAREHOUSE_MANAGER]))
):
    shipment_dict = shipment_input.model_dump()
    shipment_dict['created_by'] = current_user.id
    shipment_obj = IncomingShipment(**shipment_dict)
    
    doc = shipment_obj.model_dump()
    doc['expected_date'] = doc['expected_date'].isoformat()
    doc['created_at'] = doc['created_at'].isoformat()
    doc['updated_at'] = doc['updated_at'].isoformat()
    
    await db.incoming_shipments.insert_one(doc)
    
    return shipment_obj

@api_router.get("/shipments/incoming", response_model=List[IncomingShipment])
async def get_incoming_shipments(
    current_user: User = Depends(require_role([UserRole.ADMIN, UserRole.WAREHOUSE_MANAGER, UserRole.WAREHOUSE_STAFF]))
):
    shipments = await db.incoming_shipments.find({}, {"_id": 0}).to_list(1000)
    
    for shipment in shipments:
        if isinstance(shipment.get('expected_date'), str):
            shipment['expected_date'] = datetime.fromisoformat(shipment['expected_date'])
        if isinstance(shipment.get('arrival_date'), str):
            shipment['arrival_date'] = datetime.fromisoformat(shipment['arrival_date'])
        if isinstance(shipment.get('created_at'), str):
            shipment['created_at'] = datetime.fromisoformat(shipment['created_at'])
        if isinstance(shipment.get('updated_at'), str):
            shipment['updated_at'] = datetime.fromisoformat(shipment['updated_at'])
    
    return shipments

@api_router.put("/shipments/incoming/{shipment_id}/process")
async def process_incoming_shipment(
    shipment_id: str,
    current_user: User = Depends(require_role([UserRole.ADMIN, UserRole.WAREHOUSE_MANAGER, UserRole.WAREHOUSE_STAFF]))
):
    shipment = await db.incoming_shipments.find_one({"id": shipment_id}, {"_id": 0})
    if not shipment:
        raise HTTPException(status_code=404, detail="Shipment not found")
    
    # Update inventory for each product
    for product_item in shipment.get('products', []):
        product_id = product_item.get('product_id')
        received_units = product_item.get('received_units', product_item.get('expected_units', 0))
        expiry_date = product_item.get('expiry_date')
        
        inventory = await db.inventory.find_one({"product_id": product_id}, {"_id": 0})
        if inventory:
            new_total = inventory['total_units'] + received_units
            update_doc = {
                "total_units": new_total,
                "is_out_of_stock": False,
                "last_supply_date": datetime.now(timezone.utc).isoformat(),
                "updated_at": datetime.now(timezone.utc).isoformat()
            }
            if expiry_date:
                update_doc["expiry_date"] = expiry_date if isinstance(expiry_date, str) else expiry_date.isoformat()
            
            await db.inventory.update_one({"product_id": product_id}, {"$set": update_doc})
    
    # Update shipment status
    await db.incoming_shipments.update_one(
        {"id": shipment_id},
        {"$set": {
            "status": ShipmentStatus.PROCESSED.value,
            "arrival_date": datetime.now(timezone.utc).isoformat(),
            "processed_by": current_user.id,
            "updated_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    return {"message": "Shipment processed successfully"}


# ===============================
# ORDER ROUTES
# ===============================
@api_router.post("/orders", response_model=Order)
async def create_order(
    order_input: OrderCreate,
    current_user: User = Depends(get_current_user)
):
    # Calculate total
    total_amount = sum(item.get('total_price', 0) for item in order_input.products)
    
    order_dict = order_input.model_dump()
    order_dict['order_number'] = f"ORD-{datetime.now().strftime('%Y%m%d')}-{str(uuid.uuid4())[:8]}"
    order_dict['total_amount'] = total_amount
    
    if current_user.role == UserRole.SALES_REP:
        order_dict['sales_rep_id'] = current_user.id
    
    order_obj = Order(**order_dict)
    doc = order_obj.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    doc['updated_at'] = doc['updated_at'].isoformat()
    
    await db.orders.insert_one(doc)
    
    return order_obj

@api_router.get("/orders", response_model=List[Order])
async def get_orders(current_user: User = Depends(get_current_user)):
    query = {}
    if current_user.role == UserRole.CUSTOMER:
        query['customer_id'] = current_user.id
    elif current_user.role == UserRole.SALES_REP:
        query['sales_rep_id'] = current_user.id
    elif current_user.role == UserRole.SALES_AGENT:
        # Sales agent kendi depot siparişlerini ve müşterilerinin siparişlerini görsün
        routes = await db.sales_routes.find({"sales_agent_id": current_user.id, "is_active": True}, {"_id": 0}).to_list(1000)
        customer_ids = [route['customer_id'] for route in routes]
        customer_ids.append(current_user.id)  # Kendi depot siparişleri
        query['customer_id'] = {"$in": customer_ids}
    # Admin ve Warehouse Manager tüm siparişleri görür (query boş kalır)
    
    orders = await db.orders.find(query, {"_id": 0}).to_list(1000)
    
    for order in orders:
        if isinstance(order.get('created_at'), str):
            order['created_at'] = datetime.fromisoformat(order['created_at'])
        if isinstance(order.get('updated_at'), str):
            order['updated_at'] = datetime.fromisoformat(order['updated_at'])
        if isinstance(order.get('dispatched_date'), str):
            order['dispatched_date'] = datetime.fromisoformat(order['dispatched_date'])
        if isinstance(order.get('delivered_date'), str):
            order['delivered_date'] = datetime.fromisoformat(order['delivered_date'])
    
    return orders

@api_router.put("/orders/{order_id}/status")
async def update_order_status(
    order_id: str,
    status: OrderStatus,
    current_user: User = Depends(require_role([UserRole.ADMIN, UserRole.WAREHOUSE_MANAGER, UserRole.SALES_REP]))
):
    order = await db.orders.find_one({"id": order_id}, {"_id": 0})
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    update_doc = {
        "status": status.value,
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    
    if status == OrderStatus.APPROVED:
        update_doc['approved_by'] = current_user.id
    elif status == OrderStatus.DISPATCHED:
        update_doc['dispatched_date'] = datetime.now(timezone.utc).isoformat()
    elif status == OrderStatus.DELIVERED:
        update_doc['delivered_date'] = datetime.now(timezone.utc).isoformat()
    
    await db.orders.update_one({"id": order_id}, {"$set": update_doc})
    
    return {"message": "Order status updated successfully"}


# ===============================
# TASK ROUTES
# ===============================
@api_router.post("/tasks", response_model=Task)
async def create_task(
    task_input: TaskCreate,
    current_user: User = Depends(require_role([UserRole.ADMIN, UserRole.WAREHOUSE_MANAGER]))
):
    task_dict = task_input.model_dump()
    task_dict['assigned_by'] = current_user.id
    task_obj = Task(**task_dict)
    
    doc = task_obj.model_dump()
    if doc.get('due_date'):
        doc['due_date'] = doc['due_date'].isoformat()
    doc['created_at'] = doc['created_at'].isoformat()
    doc['updated_at'] = doc['updated_at'].isoformat()
    
    await db.tasks.insert_one(doc)
    
    return task_obj

@api_router.get("/tasks", response_model=List[Task])
async def get_tasks(current_user: User = Depends(get_current_user)):
    query = {}
    if current_user.role == UserRole.WAREHOUSE_STAFF:
        query['assigned_to'] = current_user.id
    elif current_user.role == UserRole.WAREHOUSE_MANAGER:
        query['assigned_by'] = current_user.id
    
    tasks = await db.tasks.find(query, {"_id": 0}).to_list(1000)
    
    for task in tasks:
        if isinstance(task.get('due_date'), str):
            task['due_date'] = datetime.fromisoformat(task['due_date'])
        if isinstance(task.get('completed_at'), str):
            task['completed_at'] = datetime.fromisoformat(task['completed_at'])
        if isinstance(task.get('created_at'), str):
            task['created_at'] = datetime.fromisoformat(task['created_at'])
        if isinstance(task.get('updated_at'), str):
            task['updated_at'] = datetime.fromisoformat(task['updated_at'])
    
    return tasks

@api_router.put("/tasks/{task_id}")
async def update_task(
    task_id: str,
    task_update: TaskUpdate,
    current_user: User = Depends(get_current_user)
):
    task = await db.tasks.find_one({"id": task_id}, {"_id": 0})
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    
    update_doc = {"updated_at": datetime.now(timezone.utc).isoformat()}
    
    if task_update.status:
        update_doc['status'] = task_update.status.value
        if task_update.status == TaskStatus.COMPLETED:
            update_doc['completed_at'] = datetime.now(timezone.utc).isoformat()
    
    if task_update.feedback:
        update_doc['feedback'] = task_update.feedback
    
    await db.tasks.update_one({"id": task_id}, {"$set": update_doc})
    
    return {"message": "Task updated successfully"}


# ===============================
# DASHBOARD/STATS ROUTES
# ===============================
@api_router.get("/dashboard/stats")
async def get_dashboard_stats(current_user: User = Depends(get_current_user)):
    stats = {}
    
    if current_user.role in [UserRole.ADMIN, UserRole.WAREHOUSE_MANAGER]:
        # Total products
        stats['total_products'] = await db.products.count_documents({"is_active": True})
        
        # Total inventory value
        inventory_items = await db.inventory.find({}, {"_id": 0}).to_list(1000)
        stats['total_inventory_units'] = sum(item.get('total_units', 0) for item in inventory_items)
        
        # Out of stock count
        stats['out_of_stock_count'] = await db.inventory.count_documents({"is_out_of_stock": True})
        
        # Pending orders
        stats['pending_orders'] = await db.orders.count_documents({"status": OrderStatus.PENDING.value})
        
        # Orders to prepare
        stats['orders_to_prepare'] = await db.orders.count_documents({"status": OrderStatus.APPROVED.value})
        
        # Pending tasks
        stats['pending_tasks'] = await db.tasks.count_documents({"status": TaskStatus.PENDING.value})
        
        # Expected shipments
        stats['expected_shipments'] = await db.incoming_shipments.count_documents({"status": ShipmentStatus.EXPECTED.value})
    
    return stats


# ===============================
# PRODUCT CATALOG & PRICING ROUTES
# ===============================
@api_router.get("/catalog")
async def get_product_catalog(current_user: User = Depends(get_current_user)):
    """Get product catalog with pricing based on user's channel"""
    products = await db.products.find({"is_active": True}, {"_id": 0}).to_list(1000)
    inventory_items = await db.inventory.find({}, {"_id": 0}).to_list(1000)
    
    # Create inventory lookup
    inventory_lookup = {item['product_id']: item for item in inventory_items}
    
    catalog = []
    for product in products:
        if isinstance(product.get('created_at'), str):
            product['created_at'] = datetime.fromisoformat(product['created_at'])
        
        # Get inventory info
        inv = inventory_lookup.get(product['id'], {})
        total_units = inv.get('total_units', 0)
        units_per_case = product.get('units_per_case', 1)
        
        # Calculate visible stock based on role
        visible_units = total_units
        if current_user.role in [UserRole.SALES_REP, UserRole.CUSTOMER]:
            visible_units = max(1, total_units // 3) if total_units > 0 else 0
        
        # Determine price based on channel
        price = 0.0
        if current_user.channel_type == ChannelType.LOGISTICS:
            price = product.get('logistics_price', 0.0)
        elif current_user.channel_type == ChannelType.DEALER:
            price = product.get('dealer_price', 0.0)
        
        catalog.append({
            **product,
            "available_units": visible_units,
            "available_cases": visible_units // units_per_case,
            "price": price,
            "in_stock": total_units > 0
        })
    
    return catalog


# ===============================
# CUSTOMER PROFILE ROUTES
# ===============================
@api_router.post("/customer/profile", response_model=CustomerProfile)
async def create_customer_profile(
    profile_input: CustomerProfileCreate,
    current_user: User = Depends(require_role([UserRole.CUSTOMER]))
):
    profile_dict = profile_input.model_dump()
    profile_dict['user_id'] = current_user.id
    profile_obj = CustomerProfile(**profile_dict)
    
    doc = profile_obj.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    doc['updated_at'] = doc['updated_at'].isoformat()
    
    await db.customer_profiles.insert_one(doc)
    
    return profile_obj

@api_router.get("/customer/profile")
async def get_customer_profile(current_user: User = Depends(require_role([UserRole.CUSTOMER]))):
    profile = await db.customer_profiles.find_one({"user_id": current_user.id}, {"_id": 0})
    
    if not profile:
        return None
    
    if isinstance(profile.get('created_at'), str):
        profile['created_at'] = datetime.fromisoformat(profile['created_at'])
    if isinstance(profile.get('updated_at'), str):
        profile['updated_at'] = datetime.fromisoformat(profile['updated_at'])
    
    return profile

@api_router.put("/customer/profile")
async def update_customer_profile(
    profile_input: CustomerProfileCreate,
    current_user: User = Depends(require_role([UserRole.CUSTOMER]))
):
    update_doc = profile_input.model_dump()
    update_doc['updated_at'] = datetime.now(timezone.utc).isoformat()
    
    result = await db.customer_profiles.update_one(
        {"user_id": current_user.id},
        {"$set": update_doc}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Profile not found")
    
    return {"message": "Profile updated successfully"}


# ===============================
# PRODUCT FEEDBACK ROUTES
# ===============================
@api_router.post("/feedback", response_model=ProductFeedback)
async def create_product_feedback(
    feedback_input: ProductFeedbackCreate,
    current_user: User = Depends(require_role([UserRole.CUSTOMER]))
):
    feedback_dict = feedback_input.model_dump()
    feedback_dict['customer_id'] = current_user.id
    feedback_obj = ProductFeedback(**feedback_dict)
    
    doc = feedback_obj.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    
    await db.product_feedback.insert_one(doc)
    
    return feedback_obj

@api_router.get("/feedback/product/{product_id}")
async def get_product_feedback(product_id: str, current_user: User = Depends(get_current_user)):
    feedbacks = await db.product_feedback.find({"product_id": product_id}, {"_id": 0}).to_list(1000)
    
    for feedback in feedbacks:
        if isinstance(feedback.get('created_at'), str):
            feedback['created_at'] = datetime.fromisoformat(feedback['created_at'])
        
        # Get customer name
        customer = await db.users.find_one({"id": feedback['customer_id']}, {"_id": 0})
        if customer:
            feedback['customer_name'] = customer.get('full_name', 'Anonymous')
    
    return feedbacks

@api_router.get("/feedback/my")
async def get_my_feedback(current_user: User = Depends(require_role([UserRole.CUSTOMER]))):
    feedbacks = await db.product_feedback.find({"customer_id": current_user.id}, {"_id": 0}).to_list(1000)
    
    for feedback in feedbacks:
        if isinstance(feedback.get('created_at'), str):
            feedback['created_at'] = datetime.fromisoformat(feedback['created_at'])
        
        # Get product name
        product = await db.products.find_one({"id": feedback['product_id']}, {"_id": 0})
        if product:
            feedback['product_name'] = product.get('name', 'Unknown')
    
    return feedbacks


# ===============================
# SALES REP ROUTES
# ===============================
@api_router.get("/salesrep/customers")
async def get_customers_for_sales_rep(current_user: User = Depends(require_role([UserRole.SALES_REP, UserRole.ADMIN]))):
    """Get list of customers for sales representative"""
    customers = await db.users.find({"role": UserRole.CUSTOMER.value, "is_active": True}, {"_id": 0, "password_hash": 0}).to_list(1000)
    
    result = []
    for customer in customers:
        if isinstance(customer.get('created_at'), str):
            customer['created_at'] = datetime.fromisoformat(customer['created_at'])
        
        # Get customer profile
        profile = await db.customer_profiles.find_one({"user_id": customer['id']}, {"_id": 0})
        
        # Get order count
        order_count = await db.orders.count_documents({"customer_id": customer['id']})
        
        result.append({
            **customer,
            "profile": profile,
            "order_count": order_count
        })
    
    return result

@api_router.post("/salesrep/order", response_model=Order)
async def create_order_for_customer(
    order_input: OrderCreate,
    current_user: User = Depends(require_role([UserRole.SALES_REP]))
):
    """Sales rep creates order on behalf of customer"""
    # Calculate total
    total_amount = sum(item.get('total_price', 0) for item in order_input.products)
    
    order_dict = order_input.model_dump()
    order_dict['order_number'] = f"ORD-{datetime.now().strftime('%Y%m%d')}-{str(uuid.uuid4())[:8]}"
    order_dict['total_amount'] = total_amount
    order_dict['sales_rep_id'] = current_user.id
    
    order_obj = Order(**order_dict)
    doc = order_obj.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    doc['updated_at'] = doc['updated_at'].isoformat()
    
    await db.orders.insert_one(doc)
    
    return order_obj

@api_router.get("/salesrep/stats")
async def get_sales_rep_stats(current_user: User = Depends(require_role([UserRole.SALES_REP]))):
    """Get statistics for sales representative"""
    # Total customers assigned
    total_customers = await db.users.count_documents({"role": UserRole.CUSTOMER.value})
    
    # Orders created by this sales rep
    my_orders = await db.orders.count_documents({"sales_rep_id": current_user.id})
    
    # Pending orders
    pending_orders = await db.orders.count_documents({
        "sales_rep_id": current_user.id,
        "status": OrderStatus.PENDING.value
    })
    
    # Delivered orders
    delivered_orders = await db.orders.count_documents({
        "sales_rep_id": current_user.id,
        "status": OrderStatus.DELIVERED.value
    })
    
    return {
        "total_customers": total_customers,
        "my_orders": my_orders,
        "pending_orders": pending_orders,
        "delivered_orders": delivered_orders
    }


# ===============================
# SALES AGENT ROUTES (Plasiyer)
# ===============================
@api_router.post("/salesagent/warehouse-order", response_model=Order)
async def create_warehouse_order_for_sales_agent(
    order_input: OrderCreate,
    current_user: User = Depends(require_role([UserRole.SALES_AGENT]))
):
    """Plasiyer depoya kendi stoğu için sipariş verir"""
    # Calculate total
    total_amount = sum(item.get('total_price', 0) for item in order_input.products)
    
    order_dict = order_input.model_dump()
    order_dict['order_number'] = f"WHS-{datetime.now().strftime('%Y%m%d')}-{str(uuid.uuid4())[:8]}"
    order_dict['total_amount'] = total_amount
    order_dict['sales_rep_id'] = current_user.id
    order_dict['customer_id'] = current_user.id  # Plasiyer kendisi için alıyor
    
    order_obj = Order(**order_dict)
    doc = order_obj.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    doc['updated_at'] = doc['updated_at'].isoformat()
    
    await db.orders.insert_one(doc)
    
    return order_obj

@api_router.get("/salesagent/my-customers")
async def get_my_customers(current_user: User = Depends(require_role([UserRole.SALES_AGENT]))):
    """Plasiyerin kendi müşterilerini getir (sales_routes üzerinden)"""
    # Get sales routes for this agent
    routes = await db.sales_routes.find({"sales_agent_id": current_user.id, "is_active": True}, {"_id": 0}).to_list(1000)
    
    result = []
    for route in routes:
        if isinstance(route.get('created_at'), str):
            route['created_at'] = datetime.fromisoformat(route['created_at'])
        if isinstance(route.get('updated_at'), str):
            route['updated_at'] = datetime.fromisoformat(route['updated_at'])
        
        # Get customer info
        customer = await db.users.find_one({"id": route['customer_id']}, {"_id": 0, "password_hash": 0})
        if customer:
            if isinstance(customer.get('created_at'), str):
                customer['created_at'] = datetime.fromisoformat(customer['created_at'])
            
            # Get customer profile
            profile = await db.customer_profiles.find_one({"user_id": customer['id']}, {"_id": 0})
            
            # Get order count for this customer
            order_count = await db.orders.count_documents({"customer_id": customer['id']})
            
            result.append({
                "route": route,
                "customer": customer,
                "profile": profile,
                "order_count": order_count
            })
    
    return result

@api_router.get("/salesagent/my-routes")
async def get_my_routes(current_user: User = Depends(require_role([UserRole.SALES_AGENT]))):
    """Plasiyerin rotalarını getir"""
    routes = await db.sales_routes.find({"sales_agent_id": current_user.id, "is_active": True}, {"_id": 0}).to_list(1000)
    
    for route in routes:
        if isinstance(route.get('created_at'), str):
            route['created_at'] = datetime.fromisoformat(route['created_at'])
        if isinstance(route.get('updated_at'), str):
            route['updated_at'] = datetime.fromisoformat(route['updated_at'])
    
    return routes

@api_router.get("/salesagent/stats")
async def get_sales_agent_stats(current_user: User = Depends(require_role([UserRole.SALES_AGENT]))):
    """Plasiyer istatistikleri"""
    # Total assigned customers
    my_customers_count = await db.sales_routes.count_documents({
        "sales_agent_id": current_user.id,
        "is_active": True
    })
    
    # My warehouse orders (depoya verilen siparişler)
    my_warehouse_orders = await db.orders.count_documents({
        "sales_rep_id": current_user.id,
        "customer_id": current_user.id
    })
    
    # Customer orders (müşteri siparişleri - route'daki müşterilerden)
    routes = await db.sales_routes.find({"sales_agent_id": current_user.id, "is_active": True}, {"_id": 0}).to_list(1000)
    customer_ids = [route['customer_id'] for route in routes]
    customer_orders = await db.orders.count_documents({"customer_id": {"$in": customer_ids}})
    
    return {
        "my_customers_count": my_customers_count,
        "my_warehouse_orders": my_warehouse_orders,
        "customer_orders": customer_orders,
        "total_orders": my_warehouse_orders + customer_orders
    }


# ===============================
# SALES ROUTE ROUTES
# ===============================
class WeekDay(str, Enum):
    MONDAY = "monday"
    TUESDAY = "tuesday"
    WEDNESDAY = "wednesday"
    THURSDAY = "thursday"
    FRIDAY = "friday"
    SATURDAY = "saturday"
    SUNDAY = "sunday"

class SalesRoute(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    sales_agent_id: str
    customer_id: str
    delivery_day: WeekDay
    route_order: int = 1
    is_active: bool = True
    notes: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class SalesRouteCreate(BaseModel):
    sales_agent_id: str
    customer_id: str
    delivery_day: WeekDay
    route_order: int = 1
    notes: Optional[str] = None

@api_router.post("/sales-routes", response_model=SalesRoute)
async def create_sales_route(
    route_input: SalesRouteCreate,
    current_user: User = Depends(require_role([UserRole.ADMIN, UserRole.WAREHOUSE_MANAGER]))
):
    """Yeni sales route oluştur"""
    route_obj = SalesRoute(**route_input.model_dump())
    doc = route_obj.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    doc['updated_at'] = doc['updated_at'].isoformat()
    
    await db.sales_routes.insert_one(doc)
    
    return route_obj

@api_router.get("/sales-routes", response_model=List[SalesRoute])
async def get_sales_routes(current_user: User = Depends(require_role([UserRole.ADMIN, UserRole.WAREHOUSE_MANAGER, UserRole.SALES_AGENT]))):
    """Tüm sales route'ları getir"""
    query = {}
    if current_user.role == UserRole.SALES_AGENT:
        query['sales_agent_id'] = current_user.id
    
    routes = await db.sales_routes.find(query, {"_id": 0}).to_list(1000)
    
    for route in routes:
        if isinstance(route.get('created_at'), str):
            route['created_at'] = datetime.fromisoformat(route['created_at'])
        if isinstance(route.get('updated_at'), str):
            route['updated_at'] = datetime.fromisoformat(route['updated_at'])
    
    return routes

@api_router.get("/sales-routes/customer/{customer_id}")
async def get_customer_delivery_day(
    customer_id: str,
    current_user: User = Depends(get_current_user)
):
    """Müşterinin teslimat gününü getir"""
    route = await db.sales_routes.find_one({"customer_id": customer_id, "is_active": True}, {"_id": 0})
    
    if not route:
        return {"delivery_day": None, "sales_agent_id": None}
    
    if isinstance(route.get('created_at'), str):
        route['created_at'] = datetime.fromisoformat(route['created_at'])
    if isinstance(route.get('updated_at'), str):
        route['updated_at'] = datetime.fromisoformat(route['updated_at'])
    
    return route

@api_router.put("/sales-routes/{route_id}")
async def update_sales_route(
    route_id: str,
    route_update: SalesRouteCreate,
    current_user: User = Depends(require_role([UserRole.ADMIN, UserRole.WAREHOUSE_MANAGER]))
):
    """Sales route güncelle"""
    route = await db.sales_routes.find_one({"id": route_id}, {"_id": 0})
    if not route:
        raise HTTPException(status_code=404, detail="Route not found")
    
    update_doc = route_update.model_dump()
    update_doc['updated_at'] = datetime.now(timezone.utc).isoformat()
    
    await db.sales_routes.update_one({"id": route_id}, {"$set": update_doc})
    
    return {"message": "Route updated successfully"}

@api_router.delete("/sales-routes/{route_id}")
async def delete_sales_route(
    route_id: str,
    current_user: User = Depends(require_role([UserRole.ADMIN, UserRole.WAREHOUSE_MANAGER]))
):
    """Sales route sil (soft delete)"""
    route = await db.sales_routes.find_one({"id": route_id}, {"_id": 0})
    if not route:
        raise HTTPException(status_code=404, detail="Route not found")
    
    await db.sales_routes.update_one(
        {"id": route_id},
        {"$set": {"is_active": False, "updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    
    return {"message": "Route deleted successfully"}


# Add your routes to the router instead of directly to app
@api_router.get("/")
async def root():
    return {"message": "Distribution Management System API"}


# ===============================
# CONSUMPTION STATISTICS ROUTES
# ===============================
@api_router.get("/consumption/customer/{customer_id}")
async def get_customer_consumption(
    customer_id: str,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    current_user: User = Depends(get_current_user)
):
    """Müşterinin dönemlik sarfiyat hesaplaması - siparişlere göre"""
    # Default to last 30 days
    if not end_date:
        end_datetime = datetime.now(timezone.utc)
    else:
        end_datetime = datetime.fromisoformat(end_date)
    
    if not start_date:
        start_datetime = end_datetime - timedelta(days=30)
    else:
        start_datetime = datetime.fromisoformat(start_date)
    
    # Get orders in date range
    orders = await db.orders.find({
        "customer_id": customer_id,
        "created_at": {
            "$gte": start_datetime.isoformat(),
            "$lte": end_datetime.isoformat()
        }
    }, {"_id": 0}).to_list(1000)
    
    # Calculate consumption by product
    product_consumption = {}
    total_amount = 0.0
    total_orders = len(orders)
    
    for order in orders:
        total_amount += order.get('total_amount', 0)
        
        for item in order.get('products', []):
            product_id = item.get('product_id')
            product_name = item.get('product_name', 'Unknown')
            units = item.get('units', 0)
            total_price = item.get('total_price', 0)
            
            if product_id not in product_consumption:
                product_consumption[product_id] = {
                    'product_id': product_id,
                    'product_name': product_name,
                    'total_units': 0,
                    'total_amount': 0,
                    'order_count': 0
                }
            
            product_consumption[product_id]['total_units'] += units
            product_consumption[product_id]['total_amount'] += total_price
            product_consumption[product_id]['order_count'] += 1
    
    # Get customer info
    customer = await db.users.find_one({"id": customer_id}, {"_id": 0, "password_hash": 0})
    
    return {
        "customer": customer,
        "period": {
            "start_date": start_datetime.isoformat(),
            "end_date": end_datetime.isoformat(),
            "days": (end_datetime - start_datetime).days
        },
        "summary": {
            "total_orders": total_orders,
            "total_amount": total_amount,
            "average_order_amount": total_amount / total_orders if total_orders > 0 else 0
        },
        "products": list(product_consumption.values())
    }

@api_router.get("/consumption/all-customers")
async def get_all_customers_consumption(
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    current_user: User = Depends(require_role([UserRole.ADMIN, UserRole.WAREHOUSE_MANAGER, UserRole.SALES_AGENT]))
):
    """Tüm müşterilerin dönemlik sarfiyat özeti"""
    # Default to last 30 days
    if not end_date:
        end_datetime = datetime.now(timezone.utc)
    else:
        end_datetime = datetime.fromisoformat(end_date)
    
    if not start_date:
        start_datetime = end_datetime - timedelta(days=30)
    else:
        start_datetime = datetime.fromisoformat(start_date)
    
    # Get all customers
    customers = await db.users.find({"role": UserRole.CUSTOMER.value}, {"_id": 0, "password_hash": 0}).to_list(1000)
    
    result = []
    for customer in customers:
        # Get customer orders in period
        orders = await db.orders.find({
            "customer_id": customer['id'],
            "created_at": {
                "$gte": start_datetime.isoformat(),
                "$lte": end_datetime.isoformat()
            }
        }, {"_id": 0}).to_list(1000)
        
        total_amount = sum(order.get('total_amount', 0) for order in orders)
        total_units = sum(
            sum(item.get('units', 0) for item in order.get('products', []))
            for order in orders
        )
        
        # Get customer profile
        profile = await db.customer_profiles.find_one({"user_id": customer['id']}, {"_id": 0})
        
        result.append({
            "customer": customer,
            "profile": profile,
            "consumption": {
                "order_count": len(orders),
                "total_amount": total_amount,
                "total_units": total_units,
                "average_order_amount": total_amount / len(orders) if len(orders) > 0 else 0
            }
        })
    
    # Sort by total amount descending
    result.sort(key=lambda x: x['consumption']['total_amount'], reverse=True)
    
    return {
        "period": {
            "start_date": start_datetime.isoformat(),
            "end_date": end_datetime.isoformat(),
            "days": (end_datetime - start_datetime).days
        },
        "customers": result
    }


# Import and include invoice routes - REMOVED (fatura sistemi kaldırıldı)
import sys
sys.path.insert(0, '/app/backend')
try:
    from routes.invoices import router as invoices_router
    api_router.include_router(invoices_router, tags=["Invoices"])
    print("✅ Invoice routes loaded successfully")
except Exception as e:
    print(f"⚠️ Could not load invoice routes: {e}")

# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()