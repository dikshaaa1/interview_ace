import json

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session as DBSession

from database import get_db
from models import Session as SessionModel, User
from routes.auth import get_current_user

router = APIRouter()


class SaveSessionBody(BaseModel):
    job_title:     str = ""
    num_questions: int = 0
    avg_score:     float = 0.0
    evaluations:   list = []


@router.post("/sessions")
def save_session(
    body: SaveSessionBody,
    db:   DBSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    session = SessionModel(
        user_id       = user.id,
        job_title     = body.job_title,
        num_questions = body.num_questions,
        avg_score     = round(body.avg_score, 2),
        evaluations   = json.dumps(body.evaluations),
    )
    db.add(session)
    db.commit()
    db.refresh(session)
    return {"id": session.id, "created_at": session.created_at}


@router.get("/sessions")
def list_sessions(
    db:   DBSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    rows = (
        db.query(SessionModel)
        .filter(SessionModel.user_id == user.id)
        .order_by(SessionModel.created_at.desc())
        .limit(20)
        .all()
    )
    result = []
    for r in rows:
        result.append({
            "id":            r.id,
            "job_title":     r.job_title or "Untitled",
            "num_questions": r.num_questions,
            "avg_score":     r.avg_score,
            "created_at":    r.created_at.isoformat(),
        })
    return {"sessions": result}
