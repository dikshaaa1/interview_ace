import json
import os
import re

from google import genai
from google.genai import types
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

router = APIRouter()


class AnswerItem(BaseModel):
    question: str
    answer: str
    type: str


class EvaluateAllRequest(BaseModel):
    answers: list[AnswerItem]


def _grade(score: int) -> str:
    if score >= 9: return "A"
    if score >= 7: return "B"
    if score >= 5: return "C"
    if score >= 3: return "D"
    return "F"


@router.post("/evaluate-all")
async def evaluate_all(req: EvaluateAllRequest):
    api_key = os.getenv("GEMINI_API_KEY", "")
    if not api_key or api_key == "your-gemini-api-key-here":
        raise HTTPException(status_code=500, detail="API key not configured")

    n = len(req.answers)

    # Format all Q&As into one block
    qas = ""
    for i, item in enumerate(req.answers, 1):
        ans = item.answer.strip() if item.answer else ""
        qas += f"Q{i} [{item.type}]: {item.question}\nANSWER: {ans if ans else '(no answer given)'}\n\n"

    prompt = f"""You are a senior interviewer. Evaluate all {n} candidate answers below in one pass.

Return ONLY a JSON object with exactly {n} evaluation objects in order:
{{
  "evaluations": [
    {{
      "score": 7,
      "grade": "B",
      "strengths": ["specific strength 1", "specific strength 2"],
      "gaps": ["gap 1", "gap 2"],
      "model_answer": "What an ideal answer would include..."
    }},
    ...
  ]
}}

Rules:
- Exactly {n} objects, same order as the questions
- score: 0-10 integer | grade: A(9-10) B(7-8) C(5-6) D(3-4) F(0-2)
- strengths: 2-3 points | gaps: 2-3 points
- model_answer: concise ideal answer
- For "behavioural" type questions ONLY, add a "star_feedback" key with STAR method feedback
- If answer is empty or under 10 chars: score=0, grade="F", strengths=[], gaps=["No answer provided"]

INTERVIEW SESSION:
{qas}"""

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

        evals = data.get("evaluations", [])
        for ev in evals:
            ev["grade"] = _grade(int(ev.get("score", 0)))

        # Pad if Gemini returned fewer than expected
        while len(evals) < n:
            evals.append({"score": 0, "grade": "F", "strengths": [], "gaps": ["Not evaluated"], "model_answer": ""})

        return {"evaluations": evals[:n]}
    except json.JSONDecodeError as e:
        raise HTTPException(status_code=500, detail=f"Failed to parse evaluation response: {e}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Batch evaluation failed: {e}")
