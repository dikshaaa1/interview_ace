import os
from pathlib import Path

from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
import uvicorn

load_dotenv()

from database import Base, engine
from routes import parse, questions, evaluate, evaluate_all, whisper
from routes import auth, sessions

Base.metadata.create_all(bind=engine)

FRONTEND_DIR = Path(__file__).parent.parent / "frontend"

app = FastAPI(title="Interview Ace", version="2.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(parse.router,        prefix="/api")
app.include_router(questions.router,    prefix="/api")
app.include_router(evaluate.router,     prefix="/api")
app.include_router(evaluate_all.router, prefix="/api")
app.include_router(whisper.router,      prefix="/api")
app.include_router(auth.router,         prefix="/api")
app.include_router(sessions.router,     prefix="/api")


@app.get("/api/health")
async def health():
    return {"status": "ok", "version": "2.0.0"}


app.mount("/", StaticFiles(directory=FRONTEND_DIR, html=True), name="frontend")


if __name__ == "__main__":
    print("Interview Ace running at http://localhost:8000")
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
