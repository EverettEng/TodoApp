"""
main.py - FastAPI backend for a todo app with JWT authentication

This file contains:
- FastAPI app setup
- Database session management
- User signup and login endpoints
- Password hashing
- JWT token creation
- CORS configuration for frontend-backend communication

Environment variables:
- SECRET_KEY: Used for JWT signing (should be set in a .env file)
"""

from fastapi import FastAPI, HTTPException, Depends
from pydantic import BaseModel
from passlib.context import CryptContext
from sqlalchemy.orm import Session
from database import Base, engine, SessionLocal
from models import User
from jose import JWTError, jwt
from datetime import datetime, timedelta, timezone
import secrets
import os
from dotenv import load_dotenv
from fastapi.middleware.cors import CORSMiddleware

# Load environment variables from .env file
load_dotenv()
SECRET_KEY = os.getenv("SECRET_KEY")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 *24 * 14  # 14 days expiration

# Initialize FastAPI app
app = FastAPI()

# Create the tables in the database if they don't exist
Base.metadata.create_all(bind=engine)

# Password hashing context using bcrypt
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# Enable CORS for frontend-backend communication
app.add_middleware(
  CORSMiddleware,
  allow_origins=["http://localhost:3000"],  # or "*" for testing
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
        expires_delta (timedelta): Optional expiration time for the token.
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
    - Checks if the username already exists.
    - Hashes the password and stores the user in the database.
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
    - Verifies the username and password.
    - Returns a JWT token for use in authenticated requests.
    Returns:
        dict: The JWT access token and token type.
    Raises:
        HTTPException: If authentication fails.
    """
    db_user = db.query(User).filter(User.username == user.username).first()
    if not db_user or not pwd_context.verify(user.password, db_user.hashed_password):
        raise HTTPException(status_code=401, detail="Invalid username or password")

    token = create_access_token(data={"sub": db_user.username})
    return {"access_token": token, "token_type": "bearer"}
