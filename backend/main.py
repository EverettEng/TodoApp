from fastapi import FastAPI, HTTPException, Depends
from pydantic import BaseModel
from passlib.context import CryptContext
from sqlalchemy.orm import Session
from database import Base, engine, SessionLocal
from models import User

app = FastAPI()

# Create the tables in the database
Base.metadata.create_all(bind=engine)

# Password hashing context
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

from fastapi.middleware.cors import CORSMiddleware

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
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# Pydantic model for user signup request
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

# Login endpoint (to be implemented)
@app.post("/login")
def login(user: UserSignup, db: Session = Depends(get_db)):
    """
    Authenticates a user (implementation needed).
    """
    pass
    