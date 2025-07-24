"""
main.py - FastAPI backend for a full-featured todo app with JWT authentication

This file contains:
- FastAPI app setup and configuration
- Database session management using SQLAlchemy
- User signup and login endpoints with password hashing
- JWT token creation and validation for authentication
- CORS configuration for frontend-backend communication
- Dependency injection for user authentication
- CRUD endpoints for todos (protected)

Environment variables:
- SECRET_KEY: Used for JWT signing (should be set in a .env file)

Key Concepts:
- JWT (JSON Web Token): Used for stateless authentication. Tokens are signed with SECRET_KEY and include an expiration.
- Dependency Injection: FastAPI's Depends is used to inject database sessions and current user into endpoints.
- Password Hashing: User passwords are hashed with bcrypt before storage for security.
- CORS: Cross-Origin Resource Sharing is enabled for frontend-backend communication.

Endpoints:
- POST /signup: Register a new user
- POST /login: Authenticate and receive a JWT token
- POST /todos: Create a todo (requires authentication)
- GET /todos/: Get all todos for the current user
- PUT /todos/{todo_id}: Update a todo (requires authentication)
- DELETE /todos/{todo_id}: Delete a todo (requires authentication)

Helper Functions:
- get_db: Yields a database session for each request
- hash_password: Hashes a password using bcrypt
- create_access_token: Creates a JWT token with expiration
- get_current_user: Validates JWT token and returns the current user

Decorator/Parameter Explanations:
- @app.<method>("/route", ...): Registers an endpoint at the given path. Optional parameters:
    - response_model: The Pydantic model used to serialize the response.
    - status_code: The HTTP status code returned on success.
- Depends(...): Tells FastAPI to inject the result of a dependency (e.g., database session, current user).
- Header(...): Extracts a value from the request headers (e.g., Authorization).

Each endpoint and helper function below includes detailed docstrings explaining parameters, decorators, and return values.
"""

from fastapi import FastAPI, HTTPException, Depends, status, Header
from typing import List
from pydantic import BaseModel
from passlib.context import CryptContext
from sqlalchemy.orm import Session
from database import Base, engine, SessionLocal
from models import User, Todo
from jose import JWTError, jwt
from datetime import datetime, timedelta, timezone
import secrets
import os
from dotenv import load_dotenv
from fastapi.middleware.cors import CORSMiddleware
from schemas import ToDoOut, ToDoCreate, ToDoUpdate, UserSignup, PasswordCheck
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse

app = FastAPI()

# Load environment variables from .env file
load_dotenv()
# SECRET_KEY is used to sign JWT tokens. It should be a long, random string and kept secret.
SECRET_KEY = os.getenv("SECRET_KEY")
ALGORITHM = "HS256"  # JWT signing algorithm
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24 * 14  # 14 days expiration for access tokens

# Create the tables in the database if they don't exist
Base.metadata.create_all(bind=engine)

# Password hashing context using bcrypt
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# Enable CORS for frontend-backend communication
app.add_middleware(
  CORSMiddleware,
  allow_origins=["http://localhost:3000", "https://todoapp-8zlz.onrender.com"],
  allow_credentials=True,
  allow_methods=["*"],
  allow_headers=["*"],
)

# Dependency to get DB session
# Yields a SQLAlchemy session for each request and ensures it is closed after use
def get_db():
    """
    Dependency that provides a database session to path operations.
    Ensures the session is closed after the request is handled.
    Yields:
        Session: SQLAlchemy session object
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()



# Hash the password
# Uses bcrypt to securely hash user passwords before storing in the database
def hash_password(password: str) -> str:
    """
    Hashes a plain text password using bcrypt.
    Args:
        password (str): The plain text password.
    Returns:
        str: The hashed password.
    """
    return pwd_context.hash(password)

# JWT token creation helper
def create_access_token(data: dict, expires_delta: timedelta = None):
    """
    Creates a JWT access token with an expiration time.
    Args:
        data (dict): The data to encode in the token.
        expires_delta (timedelta, optional): How long the token is valid for. Defaults to ACCESS_TOKEN_EXPIRE_MINUTES.
    Returns:
        str: The encoded JWT token.
    """
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + (expires_delta or timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES))
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

# Signup endpoint
@app.post("/signup")
def signup(user: UserSignup, db: Session = Depends(get_db)):
    """
    Registers a new user.
    Decorator:
        @app.post("/signup"): Registers a POST endpoint at /signup.
    Parameters:
        user (UserSignup): The request body, validated by Pydantic, containing username and password.
        db (Session): SQLAlchemy session injected by Depends(get_db).
    Returns:
        dict: The new user's id and username.
    Raises:
        HTTPException: If the username already exists.
    """
    # Check if username already exists
    existing_user = db.query(User).filter(User.username == user.username).first()
    if existing_user:
        raise HTTPException(status_code=400, detail="Username already exists")

    # Hash password and create user
    hashed_password = hash_password(user.password)
    db_user = User(username=user.username, hashed_password=hashed_password)
    db.add(db_user)
    db.commit()
    db.refresh(db_user)

    return {"id": db_user.id, "username": db_user.username}

# Login endpoint
@app.post("/login")
def login(user: UserSignup, db: Session = Depends(get_db)):
    """
    Authenticates a user and returns a JWT access token if successful.
    Decorator:
        @app.post("/login"): Registers a POST endpoint at /login.
    Parameters:
        user (UserSignup): The request body, validated by Pydantic, containing username and password.
        db (Session): SQLAlchemy session injected by Depends(get_db).
    Returns:
        dict: The JWT access token and token type.
    Raises:
        HTTPException: If authentication fails.
    """
    db_user = db.query(User).filter(User.username == user.username).first()
    if not db_user or not pwd_context.verify(user.password, db_user.hashed_password):
        raise HTTPException(status_code=401, detail="Invalid username or password")

    token = create_access_token(data={"sub": db_user.username})
    return {"access_token": token, "token_type": "bearer", "username": db_user.username, "userID": db_user.id}

# Dependency to get the current authenticated user from the JWT token
def get_current_user(token: str = Header(..., alias="Authorization"), db: Session = Depends(get_db)) -> User:
    """
    Extracts and validates the JWT token from the Authorization header.
    Parameters:
        token (str): The Authorization header, expected as 'Bearer <token>'.
            - Header(..., alias="Authorization"): Tells FastAPI to extract the 'Authorization' header from the request.
        db (Session): SQLAlchemy session injected by Depends(get_db).
    Returns:
        User: The authenticated user object
    Raises:
        HTTPException: If the token is invalid, expired, or user not found.
    """
    if not token.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Invalid authorization header")
    token = token[7:]  # remove "Bearer "

    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username: str = payload.get("sub")
        if username is None:
            raise HTTPException(status_code=401, detail="Invalid token payload")
    except JWTError:
        raise HTTPException(status_code=401, detail="Could not validate token")

    user = db.query(User).filter(User.username == username).first()
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    return user

# Endpoint to create a new todo (requires authentication)
@app.post("/create_todo", response_model=ToDoOut, status_code=status.HTTP_201_CREATED)
def create_todo(todo: ToDoCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """
    Creates a new todo item for the authenticated user.
    Decorator:
        @app.post("/todos", response_model=ToDoOut, status_code=status.HTTP_201_CREATED):
            - Registers a POST endpoint at /todos.
            - response_model=ToDoOut: The response will be serialized using the ToDoOut Pydantic model.
            - status_code=status.HTTP_201_CREATED: Returns HTTP 201 on success.
    Parameters:
        todo (ToDoCreate): The request body, validated by Pydantic, containing todo details.
        db (Session): SQLAlchemy session injected by Depends(get_db).
        current_user (User): The authenticated user, injected by Depends(get_current_user).
    Returns:
        ToDoOut: The created todo item.
    """
    print("Received payload:", todo)
    db_todo = Todo(**todo.model_dump(), owner_id=current_user.id)
    db.add(db_todo)
    db.commit()
    db.refresh(db_todo)
    return db_todo

@app.get('/todos/', response_model=List[ToDoOut])
def get_todos(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """
    Retrieves all todos for the authenticated user.
    Decorator:
        @app.get('/todos/', response_model=List[ToDoOut]):
            - Registers a GET endpoint at /todos/.
            - response_model=List[ToDoOut]: The response will be serialized as a list of ToDoOut Pydantic models.
    Parameters:
        db (Session): SQLAlchemy session injected by Depends(get_db).
        current_user (User): The authenticated user, injected by Depends(get_current_user).
    Returns:
        List[ToDoOut]: A list of todos for the current user.
    """
    return db.query(Todo).filter(Todo.owner_id == current_user.id).all()

@app.put('/update_todo/{todo_id}', response_model=ToDoOut)
def update_todo(todo_id: int, todo_update: ToDoUpdate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """
    Updates an existing todo item for the authenticated user.
    Decorator:
        @app.put('/todos/{todo_id}', response_model=ToDoOut):
            - Registers a PUT endpoint at /todos/{todo_id}.
            - response_model=ToDoOut: The response will be serialized using the ToDoOut Pydantic model.
    Parameters:
        todo_id (int): The ID of the todo item to update.
        todo_update (ToDoUpdate): The request body, validated by Pydantic, containing updated todo details.
        db (Session): SQLAlchemy session injected by Depends(get_db).
        current_user (User): The authenticated user, injected by Depends(get_current_user).
    Returns:
        ToDoOut: The updated todo item.
    Raises:
        HTTPException: If the todo item does not exist or does not belong to the current user.
    """
    db_todo = db.query(Todo).filter(Todo.id == todo_id, Todo.owner_id == current_user.id).first()
    if not db_todo:
        raise HTTPException(status_code=404, detail="Todo not found")

    for key, value in todo_update.model_dump(exclude_unset=True).items():
        setattr(db_todo, key, value)

    db.commit()
    db.refresh(db_todo)
    return db_todo

@app.delete('/delete_todo/{todo_id}', status_code=status.HTTP_204_NO_CONTENT)
def delete_todo(todo_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """
    Deletes a todo item for the authenticated user.
    Decorator:
        @app.delete('/todos/{todo_id}', status_code=status.HTTP_204_NO_CONTENT):
            - Registers a DELETE endpoint at /todos/{todo_id}.
            - status_code=status.HTTP_204_NO_CONTENT: Returns HTTP 204 on success.
    Parameters:
        todo_id (int): The ID of the todo item to delete.
        db (Session): SQLAlchemy session injected by Depends(get_db).
        current_user (User): The authenticated user, injected by Depends(get_current_user).
    Raises:
        HTTPException: If the todo item does not exist or does not belong to the current user.
    """
    db_todo = db.query(Todo).filter(Todo.id == todo_id, Todo.owner_id == current_user.id).first()
    if not db_todo:
        raise HTTPException(status_code=404, detail="Todo not found")

    db.delete(db_todo)
    db.commit()

app.mount("/", StaticFiles(directory="build", html=True), name="static")

@app.get("/{full_path:path}")
async def serve_react_app():
    return FileResponse(os.path.join("build", "index.html"))