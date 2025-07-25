import os
from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker

# Use persistent /data dir on Render, else use local relative path
db_filename = "todo_app.db"
if os.environ.get("RENDER"):
    db_path = f"/data/{db_filename}"
else:
    db_path = os.path.join(os.path.dirname(__file__), db_filename)

SQLALCHEMY_DATABASE_URL = f"sqlite:///{db_path}"

engine = create_engine(
    SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False}
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()
