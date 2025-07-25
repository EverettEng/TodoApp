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
- Static file serving for React frontend

Environment variables:
- SECRET_KEY: Used for JWT signing (should be set in a .env file)

Key Concepts:
- JWT (JSON Web Token): Used for stateless authentication. Tokens are signed with SECRET_KEY and include an expiration.
- Dependency Injection: FastAPI's Depends is used to inject database sessions and current user into endpoints.
- Password Hashing: User passwords are hashed with bcrypt before storage for security.
- CORS: Cross-Origin Resource Sharing is enabled for frontend-backend communication.
- Static File Serving: React build files are served from the /build directory.

Endpoints:
- POST /signup: Register a new user
- POST /login: Authenticate and receive a JWT token
- POST /create_todo: Create a todo (requires authentication)
- GET /todos/: Get all todos for the current user
- PUT /update_todo/{todo_id}: Update a todo (requires authentication)
- DELETE /delete_todo/{todo_id}: Delete a todo (requires authentication)
- GET /{full_path:path}: Serve React app for any unmatched routes (SPA fallback)

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
- StaticFiles: Serves static files from a directory for frontend assets.

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
from sqlalchemy.exc import IntegrityError
from pathlib import Path

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
# Allows requests from localhost:3000 (development) and the production domain
app.add_middleware(
  CORSMiddleware,
  allow_origins=["http://localhost:3000", "https://todoapp-8zlz.onrender.com"],
  allow_credentials=True,  # Allow cookies and authorization headers
  allow_methods=["*"],     # Allow all HTTP methods (GET, POST, PUT, DELETE, etc.)
  allow_headers=["*"],     # Allow all headers
)

# Dependency to get DB session
# Yields a SQLAlchemy session for each request and ensures it is closed after use
def get_db():
    """
    Dependency that provides a database session to path operations.
    Ensures the session is closed after the request is handled.
    
    This function is used with FastAPI's Depends() to inject a database session
    into endpoint functions. The session is automatically created at the start
    of each request and properly closed when the request completes.
    
    Yields:
        Session: SQLAlchemy session object for database operations
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
    Hashes a plain text password using bcrypt with automatic salt generation.
    
    bcrypt automatically handles salt generation and provides protection against
    rainbow table attacks. The hashed password can be safely stored in the database.
    
    Args:
        password (str): The plain text password to hash
        
    Returns:
        str: The hashed password with salt included
    """
    return pwd_context.hash(password)

# JWT token creation helper
def create_access_token(data: dict, expires_delta: timedelta = None):
    """
    Creates a JWT access token with an expiration time.
    
    The token contains the provided data (typically user identification) and
    an expiration timestamp. It's signed with the SECRET_KEY to prevent tampering.
    
    Args:
        data (dict): The payload data to encode in the token (e.g., {"sub": "username"})
        expires_delta (timedelta, optional): Custom expiration time. If None, uses ACCESS_TOKEN_EXPIRE_MINUTES
        
    Returns:
        str: The encoded JWT token string
    """
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + (expires_delta or timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES))
    to_encode.update({"exp": expire})  # Add expiration to token payload
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

# Signup endpoint
@app.post("/api/signup")
def signup(user: UserSignup, db: Session = Depends(get_db)):
    """
    Registers a new user account with username and password.
    
    Decorator:
        @app.post("/signup"): Registers a POST endpoint at /signup path
        
    Parameters:
        user (UserSignup): The request body, validated by Pydantic schema containing:
            - username: Unique identifier for the user
            - password: Plain text password (will be hashed before storage)
        db (Session): SQLAlchemy session injected by Depends(get_db) for database operations
        
    Returns:
        dict: JSON response containing:
            - id: The new user's database ID
            - username: The username that was registered
            
    Raises:
        HTTPException 400: If the username already exists in the database
        HTTPException 422: If the request body doesn't match UserSignup schema
        
    Process:
        1. Validate request body against UserSignup schema
        2. Check if username already exists in database
        3. Hash the password using bcrypt
        4. Create new User record in database
        5. Return user information (password excluded for security)
    """
    existing_user = db.query(User).filter(User.username == user.username).first()
    if existing_user:
        raise HTTPException(status_code=400, detail="Username already exists")
    hashed_password = hash_password(user.password)
    db_user = User(username=user.username, hashed_password=hashed_password)
    db.add(db_user)
    try:
        db.commit()
        db.refresh(db_user)
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=400, detail="Username already exists")
    return {"id": db_user.id, "username": db_user.username}

# Login endpoint
@app.post("/api/login")
def login(user: UserSignup, db: Session = Depends(get_db)):
    """
    Authenticates a user and returns a JWT access token if credentials are valid.
    
    Decorator:
        @app.post("/login"): Registers a POST endpoint at /login path
        
    Parameters:
        user (UserSignup): The request body, validated by Pydantic schema containing:
            - username: The username to authenticate
            - password: The plain text password to verify
        db (Session): SQLAlchemy session injected by Depends(get_db) for database operations
        
    Returns:
        dict: JSON response containing:
            - access_token: JWT token for authenticated requests
            - token_type: Always "bearer" for Bearer token authentication
            - username: The authenticated user's username
            - userID: The authenticated user's database ID
            
    Raises:
        HTTPException 401: If username doesn't exist or password is incorrect
        HTTPException 422: If the request body doesn't match UserSignup schema
        
    Process:
        1. Validate request body against UserSignup schema
        2. Query database for user with provided username
        3. Verify password using bcrypt against stored hash
        4. Generate JWT token containing user identifier
        5. Return token and user information for client storage
    """
    db_user = db.query(User).filter(User.username == user.username).first()
    if not db_user or not pwd_context.verify(user.password, db_user.hashed_password):
        raise HTTPException(status_code=401, detail="Invalid username or password")

    token = create_access_token(data={"sub": db_user.username})
    return {"access_token": token, "token_type": "bearer", "username": db_user.username, "userID": db_user.id}

# Dependency to get the current authenticated user from the JWT token
def get_current_user(token: str = Header(..., alias="Authorization"), db: Session = Depends(get_db)) -> User:
    """
    Extracts and validates the JWT token from the Authorization header to get the current user.
    
    This dependency is used to protect endpoints that require authentication. It validates
    the JWT token and returns the corresponding user object.
    
    Parameters:
        token (str): The Authorization header value, expected format: 'Bearer <jwt_token>'
            - Header(..., alias="Authorization"): Tells FastAPI to extract the 'Authorization' header
            - The ... makes this parameter required (request fails if header is missing)
        db (Session): SQLAlchemy session injected by Depends(get_db) for database operations
        
    Returns:
        User: The authenticated user object from the database
        
    Raises:
        HTTPException 401: If:
            - Authorization header doesn't start with "Bearer "
            - JWT token is invalid, expired, or malformed
            - Token payload doesn't contain required user identifier
            - User referenced in token no longer exists in database
            
    Process:
        1. Validate Authorization header format
        2. Extract JWT token (remove "Bearer " prefix)
        3. Decode and validate token using SECRET_KEY
        4. Extract username from token payload
        5. Query database for user with that username
        6. Return user object for use in protected endpoints
    """
    if not token.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Invalid authorization header")
    token = token[7:]  # Remove "Bearer " prefix (7 characters)

    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username: str = payload.get("sub")  # "sub" is the standard JWT claim for subject (user identifier)
        if username is None:
            raise HTTPException(status_code=401, detail="Invalid token payload")
    except JWTError:
        raise HTTPException(status_code=401, detail="Could not validate token")

    user = db.query(User).filter(User.username == username).first()
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    return user

# CRUD Endpoints for Todo Management

# Endpoint to create a new todo (requires authentication)
@app.post("/api/create_todo", response_model=ToDoOut, status_code=status.HTTP_201_CREATED)
def create_todo(todo: ToDoCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """
    Creates a new todo item associated with the authenticated user.
    
    Decorator:
        @app.post("/create_todo", response_model=ToDoOut, status_code=status.HTTP_201_CREATED):
            - Registers a POST endpoint at /create_todo path
            - response_model=ToDoOut: Serializes response using ToDoOut Pydantic schema
            - status_code=status.HTTP_201_CREATED: Returns HTTP 201 Created on success
            
    Parameters:
        todo (ToDoCreate): The request body, validated by Pydantic schema containing:
            - title: The todo item title (required)
            - description: Optional description text
            - completed: Boolean completion status (defaults to False)
        db (Session): SQLAlchemy session injected by Depends(get_db) for database operations
        current_user (User): The authenticated user object injected by Depends(get_current_user)
        
    Returns:
        ToDoOut: The created todo item serialized with ToDoOut schema containing:
            - id: Auto-generated database ID
            - title, description, completed: As provided in request
            - owner_id: ID of the authenticated user
            - created_at, updated_at: Timestamp fields
            
    Process:
        1. Validate JWT token and get current user (via get_current_user dependency)
        2. Validate request body against ToDoCreate schema
        3. Create new Todo object with provided data and current user's ID
        4. Save to database and refresh to get generated fields
        5. Return serialized todo using ToDoOut schema
    """
    print("Received payload:", todo)  # Debug logging for development
    db_todo = Todo(**todo.model_dump(), owner_id=current_user.id)
    db.add(db_todo)
    db.commit()
    db.refresh(db_todo)  # Refresh to get auto-generated ID and timestamps
    return db_todo

@app.get('/api/todos', response_model=List[ToDoOut])
def get_todos(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """
    Retrieves all todo items belonging to the authenticated user.
    
    Decorator:
        @app.get('/todos/', response_model=List[ToDoOut]):
            - Registers a GET endpoint at /todos/ path
            - response_model=List[ToDoOut]: Serializes response as list of ToDoOut objects
            
    Parameters:
        db (Session): SQLAlchemy session injected by Depends(get_db) for database operations
        current_user (User): The authenticated user object injected by Depends(get_current_user)
        
    Returns:
        List[ToDoOut]: List of todo items owned by the current user, each serialized with ToDoOut schema
        
    Process:
        1. Validate JWT token and get current user (via get_current_user dependency)
        2. Query database for all todos where owner_id matches current user's ID
        3. Return list of todos (automatically serialized by FastAPI using ToDoOut schema)
        
    Security:
        - User can only see their own todos due to owner_id filter
        - Authentication required via get_current_user dependency
    """
    return db.query(Todo).filter(Todo.owner_id == current_user.id).all()

@app.put('/api/update_todo/{todo_id}', response_model=ToDoOut)
def update_todo(todo_id: int, todo_update: ToDoUpdate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """
    Updates an existing todo item owned by the authenticated user.
    
    Decorator:
        @app.put('/update_todo/{todo_id}', response_model=ToDoOut):
            - Registers a PUT endpoint at /update_todo/{todo_id} path
            - {todo_id}: Path parameter for the todo ID to update
            - response_model=ToDoOut: Serializes response using ToDoOut schema
            
    Parameters:
        todo_id (int): Path parameter - the database ID of the todo to update
        todo_update (ToDoUpdate): The request body with fields to update, validated by Pydantic:
            - Only non-None fields will be updated (partial updates supported)
            - Can include title, description, completed status
        db (Session): SQLAlchemy session injected by Depends(get_db) for database operations
        current_user (User): The authenticated user object injected by Depends(get_current_user)
        
    Returns:
        ToDoOut: The updated todo item serialized with ToDoOut schema
        
    Raises:
        HTTPException 404: If todo doesn't exist or doesn't belong to current user
        
    Process:
        1. Validate JWT token and get current user (via get_current_user dependency)
        2. Query for todo with specified ID owned by current user
        3. Apply partial updates using exclude_unset=True (only update provided fields)
        4. Save changes to database and refresh object
        5. Return updated todo serialized with ToDoOut schema
        
    Security:
        - User can only update their own todos due to owner_id filter in query
        - Authentication required via get_current_user dependency
    """
    db_todo = db.query(Todo).filter(Todo.id == todo_id, Todo.owner_id == current_user.id).first()
    if not db_todo:
        raise HTTPException(status_code=404, detail="Todo not found")

    # Apply partial updates - only update fields that were provided in the request
    for key, value in todo_update.model_dump(exclude_unset=True).items():
        setattr(db_todo, key, value)

    db.commit()
    db.refresh(db_todo)  # Refresh to get updated timestamp
    return db_todo

@app.delete('/api/delete_todo/{todo_id}', status_code=status.HTTP_204_NO_CONTENT)
def delete_todo(todo_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """
    Deletes a todo item owned by the authenticated user.
    
    Decorator:
        @app.delete('/delete_todo/{todo_id}', status_code=status.HTTP_204_NO_CONTENT):
            - Registers a DELETE endpoint at /delete_todo/{todo_id} path
            - {todo_id}: Path parameter for the todo ID to delete
            - status_code=status.HTTP_204_NO_CONTENT: Returns HTTP 204 No Content on success
            
    Parameters:
        todo_id (int): Path parameter - the database ID of the todo to delete
        db (Session): SQLAlchemy session injected by Depends(get_db) for database operations
        current_user (User): The authenticated user object injected by Depends(get_current_user)
        
    Returns:
        None: HTTP 204 No Content (successful deletion returns no body)
        
    Raises:
        HTTPException 404: If todo doesn't exist or doesn't belong to current user
        
    Process:
        1. Validate JWT token and get current user (via get_current_user dependency)
        2. Query for todo with specified ID owned by current user
        3. Delete todo from database
        4. Commit transaction
        5. Return HTTP 204 No Content status
        
    Security:
        - User can only delete their own todos due to owner_id filter in query
        - Authentication required via get_current_user dependency
    """
    db_todo = db.query(Todo).filter(Todo.id == todo_id, Todo.owner_id == current_user.id).first()
    if not db_todo:
        raise HTTPException(status_code=404, detail="Todo not found")

    db.delete(db_todo)
    db.commit()

# Static File Serving for React Frontend

# Mount the React build directory to serve static assets (CSS, JS, images)
app.mount("/api/static", StaticFiles(directory="/build/static"), name="static")
build_dir = Path(__file__).parent / "build"
static_dir = build_dir / "static"
index_file = build_dir / "index.html"

if static_dir.exists():
    app.mount("/static", StaticFiles(directory=str(static_dir)), name="static")


@app.get("/{full_path:path}")
async def serve_react_app():
    """
    Catch-all route to serve the React application for client-side routing.
    
    This endpoint handles Single Page Application (SPA) routing by serving the main
    index.html file for any route that doesn't match API endpoints above.
    
    Decorator:
        @app.get("/{full_path:path}"):
            - Catches all GET requests that don't match previous route patterns
            - {full_path:path}: Path parameter that captures any remaining path segments
            
    Returns:
        FileResponse: The React app's index.html file
        
    Purpose:
        - Enables client-side routing in React applications
        - Ensures that direct URLs (like /todos, /login) serve the React app
        - React Router handles the actual routing on the client side
        - API endpoints are handled by routes defined above this catch-all
        
    Note:
        This route has the lowest priority and only matches routes that haven't
        been handled by the specific API endpoints defined earlier in the file.
    """
    if index_file.exists():
        return FileResponse(str(index_file))
    else:
        return {"error": "App not found"}