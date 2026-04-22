from datetime import datetime
from sqlalchemy import Column, Integer, String, Float, Text, DateTime, ForeignKey
from database import Base


class User(Base):
    __tablename__ = "users"

    id             = Column(Integer, primary_key=True, index=True)
    email          = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    name           = Column(String, nullable=True)
    created_at     = Column(DateTime, default=datetime.utcnow)


class Session(Base):
    __tablename__ = "sessions"

    id             = Column(Integer, primary_key=True, index=True)
    user_id        = Column(Integer, ForeignKey("users.id"), nullable=False)
    job_title      = Column(String, nullable=True)
    num_questions  = Column(Integer, default=0)
    avg_score      = Column(Float, default=0.0)
    evaluations    = Column(Text, nullable=True)
    created_at     = Column(DateTime, default=datetime.utcnow)
