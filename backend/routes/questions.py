import json
import os
import re

from google import genai
from google.genai import types
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

router = APIRouter()


class QuestionsRequest(BaseModel):
    resume_text:   str
    jd_text:       str
    num_questions: int = 8


@router.post("/questions")
async def generate_questions(req: QuestionsRequest):
    api_key = os.getenv("GEMINI_API_KEY", "")
    if not api_key or api_key == "your-gemini-api-key-here":
        raise HTTPException(status_code=500, detail="API key not configured — add GEMINI_API_KEY to backend/.env")

    n = max(1, min(req.num_questions, 15))

    prompt = f"""You are an expert technical interviewer. Based on the resume and job description below, generate exactly {n} interview questions personalised to this candidate and role.

Return ONLY a JSON object:
{{
  "questions": [
    {{"id": 1, "text": "question text here", "type": "technical"}},
    ...
  ]
}}

Types: "technical", "behavioural", "role-specific", "situational"
Distribute types evenly across the {n} questions.
Make questions specific to the actual resume and JD content — not generic.

RESUME:
{req.resume_text}

JOB DESCRIPTION:
{req.jd_text}"""

    try:
        client   = genai.Client(api_key=api_key)
        response = client.models.generate_content(
            model="gemini-3-flash-preview",
            contents=prompt,
            config=types.GenerateContentConfig(response_mime_type="application/json"),
        )
        text = response.text.strip()
        text = re.sub(r"^```json\s*", "", text)
        text = re.sub(r"\s*```$", "", text)
        data = json.loads(text)
        return data
    except json.JSONDecodeError as e:
        raise HTTPException(status_code=500, detail=f"Failed to parse Gemini response as JSON: {e}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Question generation failed: {e}")
