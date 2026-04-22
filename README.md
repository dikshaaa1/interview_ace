# Interview Ace — AI Mock Interview Platform

AI-powered mock interviews with real-time voice recognition, webcam recording, and personalised feedback from Gemini.

## Quick Start

### 1. Get a Gemini API Key
Visit [Google AI Studio](https://aistudio.google.com/) → Create API key (free tier available).

### 2. Configure the environment
```bash
cd backend
# Edit .env and replace the placeholder with your real key
```

Open `backend/.env` and set:
```
GEMINI_API_KEY=your-actual-key-here
```

### 3. Install Python dependencies
```bash
cd backend
pip install -r requirements.txt
```

### 4. Run the server
```bash
cd backend
python main.py
```

Open **http://localhost:8000** in Chrome (recommended for voice features).

---

## How It Works

1. **Upload** your resume + job description (PDF or TXT)
2. Click **Generate Questions & Begin** — Gemini creates 8 personalised questions
3. Answer each question using the **microphone** or by typing
4. Gemini scores every answer: 0–10, grade A–F, strengths, gaps, model answer
5. View your full **results** — download the video recording and a text report

---

## Project Structure

```
interview_ace/
├── backend/
│   ├── main.py              FastAPI server + static file serving
│   ├── requirements.txt
│   ├── .env                 Your API keys (not committed)
│   ├── .env.example         Template
│   └── routes/
│       ├── parse.py         POST /api/parse   — PDF/TXT extraction
│       ├── questions.py     POST /api/questions — Gemini question gen
│       ├── evaluate.py      POST /api/evaluate  — Gemini scoring
│       └── whisper.py       POST /api/whisper   — optional Whisper STT
└── frontend/
    ├── index.html           Upload page
    ├── interview.html       Live interview room
    ├── results.html         Scores & feedback
    ├── config.js            API_BASE URL (change here for deployment)
    ├── state.js             sessionStorage wrapper
    ├── css/style.css        Dark SaaS stylesheet
    └── js/
        ├── upload.js        File upload + question generation
        ├── interview.js     Interview flow controller
        ├── voice.js         Web Speech API (TTS + STT)
        ├── video.js         Webcam + MediaRecorder + IndexedDB
        └── results.js       Results renderer + downloads
```

---

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/health` | Health check → `{"status":"ok"}` |
| POST | `/api/parse` | Upload PDF/TXT → `{text, page_count, file_name}` |
| POST | `/api/questions` | `{resume_text, jd_text}` → `{questions:[...]}` |
| POST | `/api/evaluate` | `{question, answer, type}` → `{score, grade, strengths, gaps, model_answer}` |
| POST | `/api/whisper` | Audio file → `{transcript}` (needs OPENAI_API_KEY) |

---

## Browser Support

- **Chrome / Edge**: Full support (voice + video)
- **Firefox**: No `webkitSpeechRecognition` — mic button hidden, typing still works
- **Safari**: Limited SpeechRecognition support

## Optional: Whisper Server-Side Transcription

Add `OPENAI_API_KEY` to `backend/.env`. The frontend uses browser-native speech recognition by default; Whisper is an optional enhancement for browsers without speech support.

## Deployment

For production, update `frontend/config.js`:
```js
const API_BASE = "https://your-backend-url.com";
```

Then deploy the `backend/` folder to any Python host (Railway, Render, Fly.io, etc.).
The FastAPI server serves the frontend as static files — no separate frontend deployment needed.
