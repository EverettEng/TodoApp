import os
from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker

# Use /data on Render, ./todo_app.db locally
db_path = "/data/todo_app.db" if os.environ.get("RENDER") else "./todo_app.db"
SQLALCHEMY_DATABASE_URL = f"sqlite:///{db_path}"

# Ensure /data exists (just in case)
if os.environ.get("RENDER"):
    os.makedirs("/data", exist_ok=True)

# Create the DB file if it doesn't exist
if not os.path.exists(db_path):
    open(db_path, "a").close()

# Set up SQLAlchemy engine/session
engine = create_engine(
    SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False}
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()
