from fastapi import Header, HTTPException
from sqlalchemy.orm import Session
from database import SessionLocal
import uuid


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def get_session_id(x_session_id: str = Header(...)) -> str:
    try:
        uuid.UUID(x_session_id, version=4)
        return x_session_id
    except (ValueError, AttributeError):
        raise HTTPException(status_code=400, detail="Invalid X-Session-ID: must be UUID v4")
