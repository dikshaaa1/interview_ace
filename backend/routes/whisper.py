import io
import os

from fastapi import APIRouter, File, UploadFile

router = APIRouter()


@router.post("/whisper")
async def transcribe_audio(file: UploadFile = File(...)):
    api_key = os.getenv("OPENAI_API_KEY", "")
    if not api_key:
        return {"transcript": "", "error": "Whisper not configured — add OPENAI_API_KEY to .env"}

    try:
        from openai import OpenAI

        client = OpenAI(api_key=api_key)
        content = await file.read()
        audio_file = io.BytesIO(content)
        audio_file.name = file.filename or "audio.webm"
        transcript = client.audio.transcriptions.create(model="whisper-1", file=audio_file)
        return {"transcript": transcript.text}
    except Exception as e:
        return {"transcript": "", "error": str(e)}
