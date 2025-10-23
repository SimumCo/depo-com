from pydantic import BaseModel
from typing import Optional
from datetime import datetime
from models.task import TaskStatus

class TaskCreate(BaseModel):
    title: str
    description: str
    assigned_to: str
    priority: str = "medium"
    due_date: Optional[datetime] = None

class TaskUpdate(BaseModel):
    status: Optional[TaskStatus] = None
    feedback: Optional[str] = None
