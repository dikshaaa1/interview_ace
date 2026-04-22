(function () {
  'use strict';

  let questions     = [];
  let currentIndex  = 0;
  let answers       = [];      // collected locally, no API call per answer
  let timerInterval = null;
  let elapsed       = 0;
  let transcriptBuf = '';

  function init() {
    questions = State.get('questions');

    if (!questions || !questions.length) {
      document.body.innerHTML = `
        <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:100vh;
                    background:#0a0a0f;color:#f1f5f9;font-family:'Inter',sans-serif;gap:1rem;padding:2rem;text-align:center">
          <h2>Session expired</h2>
          <p style="color:#64748b">Your session data is no longer available.</p>
          <a href="/app.html" style="background:#6366f1;color:#fff;padding:.75rem 1.5rem;border-radius:8px;
                             text-decoration:none;font-weight:600;margin-top:.5rem">
            Start New Interview &rarr;
          </a>
        </div>`;
      return;
    }

    currentIndex = State.get('currentIndex') || 0;
    answers      = State.get('answers')      || [];

    buildProgressBar();
    startTimer();
    setupMic();
    setupCamera();
    loadQuestion(currentIndex);

    document.getElementById('submitBtn').addEventListener('click', submitAnswer);
  }

  function buildProgressBar() {
    const bar = document.getElementById('progressSegments');
    bar.innerHTML = '';
    questions.forEach((_, i) => {
      const seg = document.createElement('div');
      seg.className = 'progress-segment';
      seg.id = 'seg-' + i;
      bar.appendChild(seg);
    });
    updateProgress();
  }

  function updateProgress() {
    questions.forEach((_, i) => {
      const seg = document.getElementById('seg-' + i);
      if (!seg) return;
      if (i < currentIndex)        seg.className = 'progress-segment answered';
      else if (i === currentIndex) seg.className = 'progress-segment current';
      else                         seg.className = 'progress-segment';
    });
    document.getElementById('questionCounter').textContent =
      'Question ' + (currentIndex + 1) + ' of ' + questions.length;
  }

  function startTimer() {
    timerInterval = setInterval(() => {
      elapsed++;
      const m = Math.floor(elapsed / 60);
      const s = elapsed % 60;
      document.getElementById('timer').textContent =
        m + ':' + String(s).padStart(2, '0');
    }, 1000);
  }

  function loadQuestion(idx) {
    const q = questions[idx];
    if (!q) return;

    const badge = document.getElementById('questionTypeBadge');
    badge.textContent = q.type;
    badge.className   = 'question-type-badge badge-' + (q.type || '').replace(/[^a-z0-9]/gi, '-');

    document.getElementById('questionText').textContent = q.text;
    document.getElementById('answerText').value = '';
    transcriptBuf = '';

    const tts = document.getElementById('ttsIndicator');
    tts.style.display = 'flex';
    Voice.speak(q.text, () => { tts.style.display = 'none'; });

    updateProgress();
  }

  function setupMic() {
    if (!Voice.isSupported()) {
      document.getElementById('micBtn').style.display = 'none';
      const lbl = document.getElementById('micLabel');
      lbl.textContent = 'Voice not supported in this browser';
      lbl.className   = 'mic-unavailable';
      return;
    }
    document.getElementById('micBtn').addEventListener('click', toggleMic);
  }

  function toggleMic() {
    const micBtn   = document.getElementById('micBtn');
    const micLabel = document.getElementById('micLabel');
    const textarea = document.getElementById('answerText');

    if (Voice.getIsListening()) {
      Voice.stopListening();
      micBtn.classList.remove('recording');
      micLabel.textContent = 'Click to record';
      return;
    }

    const started = Voice.startListening(
      interim => { textarea.value = transcriptBuf + ' ' + interim; },
      final   => { transcriptBuf += ' ' + final; textarea.value = transcriptBuf.trim(); },
      err     => {
        showToast('Microphone error: ' + err, 'error');
        micBtn.classList.remove('recording');
        micLabel.textContent = 'Click to record';
      }
    );

    if (started) {
      micBtn.classList.add('recording');
      micLabel.textContent = 'Recording…';
    }
  }

  async function setupCamera() {
    const videoEl    = document.getElementById('webcamFeed');
    const recBadge   = document.getElementById('recBadge');
    const fallbackEl = document.getElementById('cameraFallback');
    const s = await VideoCapture.init(videoEl, recBadge, fallbackEl);
    if (s) VideoCapture.startRecording();
  }

  async function submitAnswer() {
    const answer  = document.getElementById('answerText').value.trim();
    const btn     = document.getElementById('submitBtn');
    const btnText = document.getElementById('submitBtnText');
    const spinner = document.getElementById('submitSpinner');

    Voice.stopListening();
    Voice.stopSpeaking();
    document.getElementById('micBtn').classList.remove('recording');
    document.getElementById('micLabel').textContent = 'Click to record';
    document.getElementById('ttsIndicator').style.display = 'none';

    answers.push({ question: questions[currentIndex], answer });
    State.set('answers', answers);
    State.set('currentIndex', currentIndex + 1);

    const isLast = currentIndex + 1 >= questions.length;

    if (isLast) {
      clearInterval(timerInterval);
      showEvalOverlay();
      await VideoCapture.stopRecording();
      VideoCapture.stopCamera();
      await evaluateAll(btn, btnText, spinner);
    } else {
      currentIndex++;
      transcriptBuf = '';
      loadQuestion(currentIndex);
      btn.disabled          = false;
      btnText.style.display = '';
      spinner.style.display = 'none';
    }
  }

  function showEvalOverlay() {
    const overlay = document.createElement('div');
    overlay.id = 'evalOverlay';
    overlay.style.cssText = `
      position:fixed;inset:0;background:rgba(2,8,23,0.97);
      display:flex;flex-direction:column;align-items:center;justify-content:center;
      gap:1.5rem;z-index:9999;font-family:'Inter',sans-serif;text-align:center;padding:2rem;
    `;
    overlay.innerHTML = `
      <div style="width:48px;height:48px;border:3px solid rgba(56,189,248,0.2);
                  border-top-color:#38bdf8;border-radius:50%;animation:spin .8s linear infinite"></div>
      <style>@keyframes spin{to{transform:rotate(360deg)}}</style>
      <h2 style="font-size:1.5rem;font-weight:700;color:#f8fafc">Evaluating your answers...</h2>
      <p style="color:rgba(203,213,225,0.55);font-size:0.9rem;max-width:320px">
        The AI is reviewing all your answers in one pass. This takes about 10 to 15 seconds.
      </p>
    `;
    document.body.appendChild(overlay);
  }

  async function evaluateAll(btn, btnText, spinner) {
    const payload = {
      answers: answers.map(a => ({
        question: a.question.text,
        answer:   a.answer,
        type:     a.question.type,
      })),
    };

    try {
      const res = await fetch(`${API_BASE}/api/evaluate-all`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(payload),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ detail: 'Evaluation failed' }));
        throw new Error(err.detail || 'Evaluation failed');
      }
      const data = await res.json();
      State.set('scores', data.evaluations);
      window.location.href = '/results.html';
    } catch (err) {
      // Remove overlay and let user retry
      const overlay = document.getElementById('evalOverlay');
      if (overlay) overlay.remove();
      showToast(err.message, 'error');
      btn.disabled          = false;
      btnText.style.display = '';
      spinner.style.display = 'none';
    }
  }

  function showToast(msg, type) {
    const toast = document.getElementById('toast');
    toast.textContent = msg;
    toast.className = 'toast ' + (type || '') + ' show';
    clearTimeout(toast._timer);
    toast._timer = setTimeout(() => toast.classList.remove('show'), 4500);
  }

  init();
})();
