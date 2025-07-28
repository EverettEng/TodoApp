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

# ===================================
# IMPORTS AND DEPENDENCIES
# ===================================

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
from datetime import datetime

# ===================================
# APPLICATION INITIALIZATION
# ===================================

# Create the FastAPI application instance
# This is the main entry point for the web application
app = FastAPI()

# Load environment variables from .env file
# This allows us to store sensitive configuration like SECRET_KEY outside of code
load_dotenv()

# JWT Configuration
# SECRET_KEY is used to sign JWT tokens. It should be a long, random string and kept secret.
# If someone knows your SECRET_KEY, they can forge valid tokens for any user.
SECRET_KEY = os.getenv("SECRET_KEY")
ALGORITHM = "HS256"  # JWT signing algorithm (HMAC with SHA-256)
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24 * 14  # 14 days expiration for access tokens

# Create the database tables if they don't exist
# This runs on application startup and ensures all required tables are present
Base.metadata.create_all(bind=engine)

# Password hashing context using bcrypt
# bcrypt is a secure password hashing function that includes salt generation
# The "deprecated=auto" parameter ensures older hashing schemes are automatically upgraded
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# ===================================
# CORS MIDDLEWARE CONFIGURATION
# ===================================

# Enable CORS (Cross-Origin Resource Sharing) for frontend-backend communication
# This allows the React frontend to make requests to the FastAPI backend
# when they're served from different origins (different ports or domains)
app.add_middleware(
    CORSMiddleware,
    # List of origins that are allowed to make cross-origin requests
    # localhost:3000 is for development, the render.com URL is for production
    allow_origins=["http://localhost:3000", "https://todoapp-8zlz.onrender.com"],
    
    # Allow cookies and authorization headers to be sent with requests
    # This is necessary for JWT token authentication
    allow_credentials=True,
    
    # Allow all HTTP methods (GET, POST, PUT, DELETE, etc.)
    # In production, you might want to be more restrictive
    allow_methods=["*"],
    
    # Allow all headers in requests
    # This includes custom headers like Authorization for JWT tokens
    allow_headers=["*"],
)

# ===================================
# DATABASE SESSION DEPENDENCY
# ===================================

def get_db():
    """
    Dependency that provides a database session to path operations.
    Ensures the session is closed after the request is handled.
    
    This function is used with FastAPI's Depends() to inject a database session
    into endpoint functions. The session is automatically created at the start
    of each request and properly closed when the request completes.
    
    The try/finally pattern ensures that even if an exception occurs during
    request processing, the database session will still be closed properly.
    
    Yields:
        Session: SQLAlchemy session object for database operations
        
    Usage:
        @app.get("/example")
        def example_endpoint(db: Session = Depends(get_db)):
            # db is now available for database operations
            users = db.query(User).all()
            return users
    """
    # Create a new database session for this request
    db = SessionLocal()
    try:
        # Yield the session to the endpoint function
        # The function will pause here until the endpoint completes
        yield db
    finally:
        # This always runs after the endpoint completes (success or error)
        # Close the session to free up database connections
        db.close()

# ===================================
# AUTHENTICATION HELPER FUNCTIONS
# ===================================

def hash_password(password: str) -> str:
    """
    Hashes a plain text password using bcrypt with automatic salt generation.
    
    bcrypt automatically handles salt generation and provides protection against
    rainbow table attacks. The salt is embedded in the hash, so no separate
    salt storage is needed. Each password gets a unique salt.
    
    The resulting hash can be safely stored in the database and used later
    for password verification during login.
    
    Args:
        password (str): The plain text password to hash
        
    Returns:
        str: The hashed password with salt included (safe to store in database)
        
    Example:
        hashed = hash_password("mypassword123")
        # Result looks like: $2b$12$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeG6Lruj3vjPGga31lW
    """
    # Use the global password context to hash the password
    # This automatically generates a unique salt for each password
    return pwd_context.hash(password)

def create_access_token(data: dict, expires_delta: timedelta = None):
    """
    Creates a JWT access token with an expiration time.
    
    The token contains the provided data (typically user identification) and
    an expiration timestamp. It's signed with the SECRET_KEY to prevent tampering.
    Anyone with the SECRET_KEY can verify the token's authenticity.
    
    JWT tokens are stateless - the server doesn't need to store them.
    All necessary information is encoded in the token itself.
    
    Args:
        data (dict): The payload data to encode in the token (e.g., {"sub": "username"})
                    "sub" (subject) is a standard JWT claim for user identification
        expires_delta (timedelta, optional): Custom expiration time. 
                                           If None, uses ACCESS_TOKEN_EXPIRE_MINUTES
        
    Returns:
        str: The encoded JWT token string that can be sent to the client
        
    Example:
        token = create_access_token(data={"sub": "john_doe"})
        # Client will send this token in Authorization header: "Bearer <token>"
    """
    # Create a copy of the data to avoid modifying the original
    to_encode = data.copy()
    
    # Calculate expiration time
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    
    # Add expiration time to the token payload
    # "exp" is a standard JWT claim for expiration time
    to_encode.update({"exp": expire})
    
    # Encode and sign the token with our secret key
    # The ALGORITHM parameter specifies how to sign the token
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

def get_current_user(token: str = Header(..., alias="Authorization"), db: Session = Depends(get_db)) -> User:
    """
    Extracts and validates the JWT token from the Authorization header to get the current user.
    
    This dependency is used to protect endpoints that require authentication. It validates
    the JWT token and returns the corresponding user object from the database.
    
    The Authorization header should be in the format: "Bearer <jwt_token>"
    This is the standard format for Bearer token authentication.
    
    Parameters:
        token (str): The Authorization header value, expected format: 'Bearer <jwt_token>'
            - Header(..., alias="Authorization"): Tells FastAPI to extract the 'Authorization' header
            - The ... makes this parameter required (request fails if header is missing)
            - alias="Authorization" maps the header name to the parameter
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
        
    Usage:
        @app.get("/protected")
        def protected_endpoint(current_user: User = Depends(get_current_user)):
            # current_user is now available and guaranteed to be authenticated
            return {"message": f"Hello {current_user.username}"}
    """
    # Check if Authorization header has correct format
    if not token.startswith("Bearer "):
        raise HTTPException(
            status_code=401, 
            detail="Invalid authorization header",
            headers={"WWW-Authenticate": "Bearer"}
        )
    
    # Extract the token part (remove "Bearer " prefix which is 7 characters)
    token = token[7:]

    try:
        # Decode the JWT token using our secret key
        # This will raise JWTError if the token is invalid, expired, or tampered with
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        
        # Extract the username from the token payload
        # "sub" (subject) is the standard JWT claim for user identification
        username: str = payload.get("sub")
        if username is None:
            raise HTTPException(
                status_code=401, 
                detail="Invalid token payload",
                headers={"WWW-Authenticate": "Bearer"}
            )
    except JWTError:
        # This catches all JWT-related errors: expired, invalid signature, malformed, etc.
        raise HTTPException(
            status_code=401, 
            detail="Could not validate token",
            headers={"WWW-Authenticate": "Bearer"}
        )

    # Query the database for the user referenced in the token
    user = db.query(User).filter(User.username == username).first()
    if not user:
        # User was deleted after token was issued
        raise HTTPException(
            status_code=401, 
            detail="User not found",
            headers={"WWW-Authenticate": "Bearer"}
        )
    
    # Return the authenticated user object
    return user

# ===================================
# USER AUTHENTICATION ENDPOINTS
# ===================================

@app.post("/api/signup")
def signup(user: UserSignup, db: Session = Depends(get_db)):
    """
    Registers a new user account with username and password.
    
    This endpoint creates a new user in the database after validating that
    the username is unique. The password is hashed before storage for security.
    
    Decorator:
        @app.post("/api/signup"): Registers a POST endpoint at /api/signup path
        
    Parameters:
        user (UserSignup): The request body, validated by Pydantic schema containing:
            - username: Unique identifier for the user (string, required)
            - password: Plain text password (string, required, will be hashed before storage)
        db (Session): SQLAlchemy session injected by Depends(get_db) for database operations
        
    Returns:
        dict: JSON response containing:
            - id: The new user's database ID (integer)
            - username: The username that was registered (string)
            
    Raises:
        HTTPException 400: If the username already exists in the database
        HTTPException 422: If the request body doesn't match UserSignup schema (automatic)
        
    Process:
        1. Validate request body against UserSignup schema (automatic by FastAPI)
        2. Check if username already exists in database
        3. Hash the password using bcrypt for secure storage
        4. Create new User record in database
        5. Handle potential race condition with try/catch on commit
        6. Return user information (password excluded for security)
        
    Security Notes:
        - Passwords are never stored in plain text
        - Username uniqueness is enforced at database level
        - No sensitive information is returned in response
    """
    # Check if a user with this username already exists
    # This prevents duplicate usernames
    existing_user = db.query(User).filter(User.username == user.username).first()
    if existing_user:
        raise HTTPException(status_code=400, detail="Username already exists")
    
    # Hash the password before storing it in the database
    # Never store plain text passwords - this is a critical security requirement
    hashed_password = hash_password(user.password)
    
    # Create a new User object with the provided username and hashed password
    db_user = User(username=user.username, hashed_password=hashed_password)
    
    # Add the user to the database session (doesn't save yet)
    db.add(db_user)
    
    try:
        # Attempt to commit the transaction (actually save to database)
        db.commit()
        # Refresh the object to get the auto-generated ID from the database
        db.refresh(db_user)
    except IntegrityError:
        # This handles race conditions where another request creates the same username
        # between our check above and the commit
        db.rollback()  # Undo the transaction
        raise HTTPException(status_code=400, detail="Username already exists")
    
    # Return user information (excluding password for security)
    return {"id": db_user.id, "username": db_user.username}

@app.post("/api/login")
def login(user: UserSignup, db: Session = Depends(get_db)):
    """
    Authenticates a user and returns a JWT access token if credentials are valid.
    
    This endpoint verifies the user's credentials and, if valid, returns a JWT token
    that can be used for subsequent authenticated requests.
    
    Decorator:
        @app.post("/api/login"): Registers a POST endpoint at /api/login path
        
    Parameters:
        user (UserSignup): The request body, validated by Pydantic schema containing:
            - username: The username to authenticate (string, required)
            - password: The plain text password to verify (string, required)
        db (Session): SQLAlchemy session injected by Depends(get_db) for database operations
        
    Returns:
        dict: JSON response containing:
            - access_token: JWT token for authenticated requests (string)
            - token_type: Always "bearer" for Bearer token authentication (string)
            - username: The authenticated user's username (string)
            - userID: The authenticated user's database ID (integer)
            
    Raises:
        HTTPException 401: If username doesn't exist or password is incorrect
        HTTPException 422: If the request body doesn't match UserSignup schema (automatic)
        
    Process:
        1. Validate request body against UserSignup schema (automatic by FastAPI)
        2. Query database for user with provided username
        3. Verify password using bcrypt against stored hash
        4. Generate JWT token containing user identifier
        5. Return token and user information for client storage
        
    Security Notes:
        - Password verification uses secure bcrypt comparison
        - Timing attacks are mitigated by bcrypt's constant-time comparison
        - JWT tokens have expiration time to limit exposure if compromised
        - User ID and username returned for client-side user context
    """
    # Find the user in the database by username
    db_user = db.query(User).filter(User.username == user.username).first()
    
    # Verify both user exists and password is correct
    # We check both conditions together to prevent username enumeration attacks
    # (attacker can't tell if username exists vs password is wrong)
    if not db_user or not pwd_context.verify(user.password, db_user.hashed_password):
        raise HTTPException(status_code=401, detail="Invalid username or password")

    # Create a JWT token for the authenticated user
    # The token contains the username as the "subject" (sub claim)
    token = create_access_token(data={"sub": db_user.username})
    
    # Return the token and user information
    # Client should store the token and include it in future requests
    return {
        "access_token": token, 
        "token_type": "bearer",  # Indicates this is a Bearer token
        "username": db_user.username, 
        "userID": db_user.id
    }

# ===================================
# TODO CRUD ENDPOINTS
# ===================================

@app.post("/api/create_todo", response_model=ToDoOut, status_code=status.HTTP_201_CREATED)
def create_todo(todo: ToDoCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """
    Creates a new todo item associated with the authenticated user.
    
    This endpoint allows authenticated users to create new todo items.
    Each todo is automatically associated with the user who created it.
    
    Decorator:
        @app.post("/api/create_todo", response_model=ToDoOut, status_code=status.HTTP_201_CREATED):
            - Registers a POST endpoint at /api/create_todo path
            - response_model=ToDoOut: Serializes response using ToDoOut Pydantic schema
            - status_code=status.HTTP_201_CREATED: Returns HTTP 201 Created on success
            
    Parameters:
        todo (ToDoCreate): The request body, validated by Pydantic schema containing:
            - title: The todo item title (string, required)
            - description: Optional description text (string, optional)
            - completed: Boolean completion status (boolean, defaults to False)
        db (Session): SQLAlchemy session injected by Depends(get_db) for database operations
        current_user (User): The authenticated user object injected by Depends(get_current_user)
        
    Returns:
        ToDoOut: The created todo item serialized with ToDoOut schema containing:
            - id: Auto-generated database ID (integer)
            - title, description, completed: As provided in request
            - owner_id: ID of the authenticated user (integer)
            - created_at, updated_at: Timestamp fields (datetime)
            
    Authentication:
        Requires valid JWT token in Authorization header: "Bearer <token>"
        
    Process:
        1. Validate JWT token and get current user (via get_current_user dependency)
        2. Validate request body against ToDoCreate schema (automatic by FastAPI)
        3. Create new Todo object with provided data and current user's ID
        4. Save to database and refresh to get generated fields (ID, timestamps)
        5. Return serialized todo using ToDoOut schema (automatic by FastAPI)
        
    Security:
        - Only authenticated users can create todos
        - Each todo is automatically owned by the creating user
        - User cannot specify owner_id - it's set automatically for security
    """
    # Debug logging for development - helps troubleshoot request issues
    print("Received payload:", todo)
    
    # Create a new Todo object with the request data
    # **todo.model_dump() unpacks the Pydantic model to keyword arguments
    # owner_id is set to the current authenticated user's ID
    db_todo = Todo(**todo.model_dump(), owner_id=current_user.id)
    
    # Add the todo to the database session
    db.add(db_todo)
    
    # Commit the transaction to save the todo to the database
    db.commit()
    
    # Refresh the object to get auto-generated fields like ID and timestamps
    db.refresh(db_todo)
    
    # Return the created todo (automatically serialized by FastAPI using ToDoOut)
    return db_todo

@app.get('/api/todos', response_model=List[ToDoOut])
def get_todos(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """
    Retrieves all todo items belonging to the authenticated user.
    
    This endpoint returns a list of all todos owned by the current user.
    Users can only see their own todos, ensuring data privacy.
    
    Decorator:
        @app.get('/api/todos', response_model=List[ToDoOut]):
            - Registers a GET endpoint at /api/todos path
            - response_model=List[ToDoOut]: Serializes response as list of ToDoOut objects
            
    Parameters:
        db (Session): SQLAlchemy session injected by Depends(get_db) for database operations
        current_user (User): The authenticated user object injected by Depends(get_current_user)
        
    Returns:
        List[ToDoOut]: List of todo items owned by the current user, each serialized with ToDoOut schema
        
    Authentication:
        Requires valid JWT token in Authorization header: "Bearer <token>"
        
    Process:
        1. Validate JWT token and get current user (via get_current_user dependency)
        2. Query database for all todos where owner_id matches current user's ID
        3. Return list of todos (automatically serialized by FastAPI using List[ToDoOut])
        
    Security:
        - Only authenticated users can access this endpoint
        - User can only see their own todos due to owner_id filter
        - No way to access other users' todos through this endpoint
    """
    # Query database for todos owned by the current user
    # The filter ensures users can only see their own todos
    todos = db.query(Todo).filter(Todo.owner_id == current_user.id).all()
    
    # Return the list of todos (automatically serialized by FastAPI)
    return todos

@app.put('/api/update_todo/{todo_id}', response_model=ToDoOut)
def update_todo(todo_id: int, todo_update: ToDoUpdate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """
    Updates an existing todo item owned by the authenticated user.
    
    This endpoint allows partial updates - only the fields provided in the request
    will be updated. Users can only update their own todos.
    
    Decorator:
        @app.put('/api/update_todo/{todo_id}', response_model=ToDoOut):
            - Registers a PUT endpoint at /api/update_todo/{todo_id} path
            - {todo_id}: Path parameter for the todo ID to update
            - response_model=ToDoOut: Serializes response using ToDoOut schema
            
    Parameters:
        todo_id (int): Path parameter - the database ID of the todo to update
        todo_update (ToDoUpdate): The request body with fields to update, validated by Pydantic:
            - Only non-None fields will be updated (partial updates supported)
            - Can include title, description, completed status
            - All fields are optional in ToDoUpdate schema
        db (Session): SQLAlchemy session injected by Depends(get_db) for database operations
        current_user (User): The authenticated user object injected by Depends(get_current_user)
        
    Returns:
        ToDoOut: The updated todo item serialized with ToDoOut schema
        
    Raises:
        HTTPException 404: If todo doesn't exist or doesn't belong to current user
        
    Authentication:
        Requires valid JWT token in Authorization header: "Bearer <token>"
        
    Process:
        1. Validate JWT token and get current user (via get_current_user dependency)
        2. Query for todo with specified ID owned by current user
        3. Apply partial updates using exclude_unset=True (only update provided fields)
        4. Save changes to database and refresh object to get updated timestamp
        5. Return updated todo serialized with ToDoOut schema
        
    Security:
        - Only authenticated users can update todos
        - User can only update their own todos due to owner_id filter in query
        - Cannot update todos belonging to other users
        - Cannot change owner_id of a todo
    """
    # Query for the todo with security check - user can only access their own todos
    db_todo = db.query(Todo).filter(Todo.id == todo_id, Todo.owner_id == current_user.id).first()
    
    # If todo doesn't exist or doesn't belong to current user, return 404
    if not db_todo:
        raise HTTPException(status_code=404, detail="Todo not found")

    # Apply partial updates - only update fields that were provided in the request
    # exclude_unset=True means only fields explicitly set in the request are included
    # This allows partial updates where some fields can be omitted
    for key, value in todo_update.model_dump(exclude_unset=True).items():
        setattr(db_todo, key, value)

    # Commit changes to database
    db.commit()
    
    # Refresh to get updated timestamp and any other auto-updated fields
    db.refresh(db_todo)
    
    # Return the updated todo (automatically serialized by FastAPI)
    return db_todo

@app.delete('/api/delete_todo/{todo_id}', status_code=status.HTTP_204_NO_CONTENT)
def delete_todo(todo_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """
    Deletes a todo item owned by the authenticated user.
    
    This endpoint permanently removes a todo from the database.
    Users can only delete their own todos.
    
    Decorator:
        @app.delete('/api/delete_todo/{todo_id}', status_code=status.HTTP_204_NO_CONTENT):
            - Registers a DELETE endpoint at /api/delete_todo/{todo_id} path
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
        
    Authentication:
        Requires valid JWT token in Authorization header: "Bearer <token>"
        
    Process:
        1. Validate JWT token and get current user (via get_current_user dependency)
        2. Query for todo with specified ID owned by current user
        3. Delete todo from database
        4. Commit transaction
        5. Return HTTP 204 No Content status (no response body)
        
    Security:
        - Only authenticated users can delete todos
        - User can only delete their own todos due to owner_id filter in query
        - Cannot delete todos belonging to other users
        - Deletion is permanent - no soft delete implemented
    """
    # Query for the todo with security check - user can only access their own todos
    db_todo = db.query(Todo).filter(Todo.id == todo_id, Todo.owner_id == current_user.id).first()
    
    # If todo doesn't exist or doesn't belong to current user, return 404
    if not db_todo:
        raise HTTPException(status_code=404, detail="Todo not found")

    # Delete the todo from the database
    db.delete(db_todo)
    
    # Commit the transaction to permanently remove the todo
    db.commit()
    
    # No return statement needed - FastAPI will return 204 No Content automatically

# ===================================
# USER MANAGEMENT ENDPOINTS
# ===================================

@app.delete("/delete_user/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_user(user_id: int, data: PasswordCheck, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """
    Deletes a user account after password confirmation.
    
    This is a sensitive operation that permanently removes a user and all their data.
    Requires password confirmation for security.
    
    Decorator:
        @app.delete("/delete_user/{user_id}", status_code=status.HTTP_204_NO_CONTENT):
            - Registers a DELETE endpoint at /delete_user/{user_id} path
            - status_code=status.HTTP_204_NO_CONTENT: Returns HTTP 204 on success
            
    Parameters:
        user_id (int): Path parameter - ID of user to delete
        data (PasswordCheck): Request body containing password confirmation
        db (Session): Database session injected by Depends(get_db)
        current_user (User): Authenticated user injected by Depends(get_current_user)
        
    Returns:
        None: HTTP 204 No Content on successful deletion
        
    Raises:
        HTTPException 404: If user doesn't exist
        HTTPException 403: If trying to delete another user's account
        HTTPException 401: If password confirmation is incorrect
        
    Security:
        - Users can only delete their own accounts
        - Requires password re-confirmation
        - Deletion is permanent and irreversible
    """
    # Find the user to delete
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # Security check: users can only delete their own accounts
    if user.id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to delete this user")
    
    # Verify password before allowing deletion (additional security measure)
    if not pwd_context.verify(data.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Incorrect password")
    
    # Delete the user (this will also delete their todos due to cascade)
    db.delete(user)
    db.commit()

# ===================================
# STATIC FILE SERVING FOR REACT FRONTEND
# ===================================

# Configuration for serving the React build files
# These paths point to the React application's build output directory
build_dir = Path(__file__).parent / "build"  # Main build directory containing index.html
static_dir = build_dir / "static"            # Subdirectory with CSS, JS, and other assets
index_file = build_dir / "index.html"        # Main HTML file for the React app

# Mount static files directory if it exists
# This serves CSS, JavaScript, images, and other static assets from the React build
if static_dir.exists():
    # StaticFiles automatically handles caching headers and MIME types
    # Files will be available at /static/* URLs
    app.mount("/static", StaticFiles(directory=str(static_dir)), name="static")

@app.get("/{full_path:path}")
async def serve_react_app():
    """
    Catch-all route to serve the React application for client-side routing.
    
    This endpoint handles Single Page Application (SPA) routing by serving the main
    index.html file for any route that doesn't match API endpoints above.
    
    In a React SPA, the client-side router (like React Router) handles navigation
    between different "pages" without making new requests to the server. However,
    when users bookmark a URL or refresh the page, the browser makes a request
    to the server for that specific path.
    
    Without this catch-all route, requesting URLs like /todos or /login directly
    would return a 404 error because these routes don't exist on the server.
    This route ensures that all such requests receive the React app, which then
    handles the routing on the client side.
    
    Decorator:
        @app.get("/{full_path:path}"):
            - Catches all GET requests that don't match previous route patterns
            - {full_path:path}: Path parameter that captures any remaining path segments
            - This route has the lowest priority and only matches unhandled routes
            
    Returns:
        FileResponse: The React app's index.html file
        
    Purpose:
        - Enables client-side routing in React applications
        - Ensures that direct URLs (like /todos, /login) serve the React app
        - React Router handles the actual routing on the client side
        - API endpoints are handled by routes defined above this catch-all
        
    Flow:
        1. User visits /todos in browser or refreshes page
        2. Browser makes GET request to server for /todos
        3. No API routes match /todos, so this catch-all route handles it
        4. Server returns index.html containing the React application
        5. React app loads and React Router navigates to the /todos component
        
    Note:
        This route has the lowest priority and only matches routes that haven't
        been handled by the specific API endpoints defined earlier in the file.
        Order matters in FastAPI - more specific routes should be defined first.
    """
    # Check if the React build file exists
    if index_file.exists():
        # Return the main HTML file that contains the React application
        # FileResponse automatically sets appropriate headers for HTML files
        return FileResponse(str(index_file))
    else:
        # Fallback if the React build doesn't exist (development scenario)
        # This would happen if you're running the FastAPI server without building React
        return {"error": "App not found"}