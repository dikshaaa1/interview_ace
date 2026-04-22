(function () {
  'use strict';

  let resumeText = null;
  let jdText     = null;

  function setupDropzone(zoneId, inputId, statusId, onParsed) {
    const zone   = document.getElementById(zoneId);
    const input  = document.getElementById(inputId);
    const status = document.getElementById(statusId);

    zone.addEventListener('click', () => input.click());

    zone.addEventListener('dragover', e => {
      e.preventDefault();
      zone.classList.add('drag-over');
    });
    zone.addEventListener('dragleave', () => zone.classList.remove('drag-over'));
    zone.addEventListener('drop', e => {
      e.preventDefault();
      zone.classList.remove('drag-over');
      const file = e.dataTransfer.files[0];
      if (file) handleFile(file, zone, status, onParsed);
    });

    input.addEventListener('change', () => {
      if (input.files[0]) handleFile(input.files[0], zone, status, onParsed);
      input.value = '';
    });
  }

  async function handleFile(file, zone, statusEl, onParsed) {
    const ext = file.name.split('.').pop().toLowerCase();
    if (!['pdf', 'txt'].includes(ext)) {
      showToast('Only PDF and TXT files are supported', 'error');
      return;
    }

    statusEl.innerHTML =
      '<span style="display:inline-block;width:12px;height:12px;border:2px solid rgba(34,211,238,.2);border-top-color:#22d3ee;border-radius:50%;animation:spin .6s linear infinite;vertical-align:middle;margin-right:6px"></span>Parsing…';

    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch(`${API_BASE}/api/parse`, { method: 'POST', body: formData });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ detail: 'Parse failed' }));
        throw new Error(err.detail || 'Parse failed');
      }
      const data = await res.json();
      if (!data.text || !data.text.trim()) throw new Error('No text could be extracted from this file');
      statusEl.textContent = file.name + ' ready';
      zone.style.borderColor = 'var(--primary)';
      zone.style.background  = 'var(--primary-dim)';
      onParsed(data.text);
      checkReady();
    } catch (err) {
      statusEl.textContent = '';
      zone.style.borderColor = '';
      zone.style.background  = '';
      showToast(err.message, 'error');
    }
  }

  function checkReady() {
    document.getElementById('startBtn').disabled = !(resumeText && jdText);
  }

  async function handleStart() {
    const btn     = document.getElementById('startBtn');
    const btnText = document.getElementById('startBtnText');
    const spinner = document.getElementById('startSpinner');

    btn.disabled          = true;
    btnText.style.display = 'none';
    spinner.style.display = 'block';

    const jobTitleEl = document.getElementById('jobTitleInput');
    const numQEl     = document.getElementById('numQuestionsInput');
    const jobTitle   = jobTitleEl ? jobTitleEl.value.trim() : '';
    const numQ       = numQEl ? parseInt(numQEl.value, 10) : 8;

    try {
      const res = await fetch(`${API_BASE}/api/questions`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ resume_text: resumeText, jd_text: jdText, num_questions: numQ }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ detail: 'Failed to generate questions' }));
        throw new Error(err.detail || 'Failed to generate questions');
      }
      const data = await res.json();
      if (!data.questions || !data.questions.length) throw new Error('No questions returned from AI');

      State.set('questions',    data.questions);
      State.set('currentIndex', 0);
      State.set('answers',      []);
      State.set('scores',       []);
      State.set('jobTitle',     jobTitle);
      window.location.href = '/interview.html';
    } catch (err) {
      showToast(err.message, 'error');
      btn.disabled          = false;
      btnText.style.display = '';
      spinner.style.display = 'none';
    }
  }

  function showToast(msg, type) {
    const toast = document.getElementById('toast');
    toast.textContent = msg;
    toast.className   = 'toast ' + (type || '') + ' show';
    clearTimeout(toast._timer);
    toast._timer = setTimeout(() => toast.classList.remove('show'), 4500);
  }

  State.clear();

  setupDropzone('resumeZone', 'resumeInput', 'resumeStatus', text => {
    resumeText = text;
    State.set('resumeText', text);
  });
  setupDropzone('jdZone', 'jdInput', 'jdStatus', text => {
    jdText = text;
    State.set('jdText', text);
  });

  document.getElementById('startBtn').addEventListener('click', handleStart);
})();
