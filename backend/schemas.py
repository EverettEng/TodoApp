"""
schemas.py - Pydantic schemas for the todo app API

This file defines the data validation and serialization models (schemas) used by FastAPI endpoints.

Key Concepts:
- Pydantic BaseModel: Used for data validation, parsing, and serialization.
- Inheritance: ToDoCreate and ToDoOut inherit from ToDoBase to avoid code duplication.
- orm_mode: Allows Pydantic models to work seamlessly with SQLAlchemy ORM objects.

Schemas:
- ToDoBase: Shared fields for todos (used as a base for other schemas)
- ToDoCreate: Schema for creating a new todo (inherits all fields from ToDoBase)
- ToDoUpdate: Schema for updating a todo (all fields optional)
- ToDoOut: Schema for returning todo data to the client (includes id and owner_id)

Field Explanations:
- title (str): The title of the todo item (required)
- description (Optional[str]): A longer description of the todo (optional)
- due_date (Optional[datetime]): When the todo is due (optional)
- completed (Optional[bool]): Whether the todo is completed (default: False)
- id (int): The unique identifier for the todo (output only)
- owner_id (int): The user id of the todo's owner (output only)
"""

from pydantic import BaseModel
from typing import Optional
from datetime import datetime

# Pydantic model for user signup and login requests
class UserSignup(BaseModel):
    """
    Schema for user signup and login requests.
    Fields:
        username (str): The user's unique username.
        password (str): The user's password (will be hashed before storage).
    """
    username: str
    password: str

class ToDoBase(BaseModel):
    """
    Base schema for todo items.
    Fields:
        title (str): The title of the todo item (required).
        description (Optional[str]): A longer description of the todo (optional).
        due_date (Optional[datetime]): When the todo is due (optional).
        completed (Optional[bool]): Whether the todo is completed (default: False).
    """
    title: str
    description: Optional[str] = None
    due_date: datetime
    completed: bool
    
class PasswordCheck(BaseModel):
    password: str

class ToDoCreate(ToDoBase):
    """
    Schema for creating a new todo item.
    Inherits all fields from ToDoBase.
    Used as the request body for creating todos.
    """
    pass


class ToDoOut(ToDoBase):
    """
    Schema for returning todo data to the client.
    Inherits all fields from ToDoBase and adds:
        id (int): The unique identifier for the todo.
        owner_id (int): The user id of the todo's owner.
    The inner Config class enables orm_mode for compatibility with SQLAlchemy ORM objects.
    """
    id: int
    title: str
    description: Optional[str] = None
    due_date: datetime
    completed: bool
    owner_id: int

    class Config:
        model_config = {
            "orm_mode": True  # Allows Pydantic to work with SQLAlchemy ORM objects
        }
        
class ToDoUpdate(BaseModel):
    """
    Schema for updating an existing todo item.
    All fields are optional to allow partial updates.
    Fields:
        title (Optional[str]): The new title (optional).
        description (Optional[str]): The new description (optional).
        due_date (Optional[datetime]): The new due date (optional).
        completed (Optional[bool]): The new completion status (optional).
    """
    title: Optional[str] = None
    description: Optional[str] = None
    due_date: Optional[datetime] = None
    completed: Optional[bool] = None