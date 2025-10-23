from .user import UserCreate, UserLogin
from .product import ProductCreate
from .inventory import InventoryUpdate
from .shipment import IncomingShipmentCreate
from .order import OrderCreate
from .task import TaskCreate, TaskUpdate
from .feedback import ProductFeedbackCreate
from .customer_profile import CustomerProfileCreate

__all__ = [
    'UserCreate', 'UserLogin',
    'ProductCreate',
    'InventoryUpdate',
    'IncomingShipmentCreate',
    'OrderCreate',
    'TaskCreate', 'TaskUpdate',
    'ProductFeedbackCreate',
    'CustomerProfileCreate'
]
