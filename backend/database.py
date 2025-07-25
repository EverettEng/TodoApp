import os
from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker

# Use /data in Render, local file otherwise
db_path = "/data/todo_app.db" if os.environ.get("RENDER") else "./todo_app.db"
SQLALCHEMY_DATABASE_URL = f"sqlite:///{db_path}"

# Create empty DB file if it doesn't exist (optional)
if not os.path.exists(db_path):
    open(db_path, "a").close()

engine = create_engine(
    SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False}
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()
