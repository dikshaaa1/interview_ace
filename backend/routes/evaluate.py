import json
import os
import re

from google import genai
from google.genai import types
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

router = APIRouter()


class EvaluateRequest(BaseModel):
    question: str
    answer: str
    type: str


def _grade(score: int) -> str:
    if score >= 9: return "A"
    if score >= 7: return "B"
    if score >= 5: return "C"
    if score >= 3: return "D"
    return "F"


@router.post("/evaluate")
async def evaluate_answer(req: EvaluateRequest):
    if not req.answer or len(req.answer.strip()) < 10:
        return {
            "score": 0,
            "grade": "F",
            "strengths": [],
            "gaps": ["No answer provided"],
            "model_answer": "A complete answer addressing the question directly.",
        }

    api_key = os.getenv("GEMINI_API_KEY", "")
    if not api_key or api_key == "your-gemini-api-key-here":
        raise HTTPException(status_code=500, detail="API key not configured")

    prompt = f"""You are a senior interviewer evaluating a candidate's answer.

Return ONLY a JSON object:
{{
  "score": 7,
  "grade": "B",
  "strengths": ["point 1", "point 2"],
  "gaps": ["gap 1", "gap 2"],
  "model_answer": "What a perfect answer would look like...",
  "star_feedback": "STAR feedback here only if behavioural question"
}}

Score: 0-10 integer
Grade: A (9-10), B (7-8), C (5-6), D (3-4), F (0-2)
Only include star_feedback key if question type is "behavioural"

QUESTION: {req.question}
CANDIDATE ANSWER: {req.answer}
QUESTION TYPE: {req.type}"""

    try:
        client = genai.Client(api_key=api_key)
        response = client.models.generate_content(
            model="gemini-3-flash-preview",
            contents=prompt,
            config=types.GenerateContentConfig(response_mime_type="application/json"),
        )
        text = response.text.strip()
        text = re.sub(r"^```json\s*", "", text)
        text = re.sub(r"\s*```$", "", text)
        data = json.loads(text)
        data["grade"] = _grade(int(data.get("score", 0)))
        return data
    except json.JSONDecodeError as e:
        raise HTTPException(status_code=500, detail=f"Failed to parse evaluation response: {e}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Evaluation failed: {e}")
