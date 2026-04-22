(function () {
  'use strict';

  async function init() {
    const questions = State.get('questions');
    const scores    = State.get('scores');
    const answers   = State.get('answers');

    if (!questions || !scores || !questions.length || !scores.length) {
      document.getElementById('noData').style.display      = 'block';
      document.getElementById('resultsContent').style.display = 'none';
      return;
    }

    document.getElementById('noData').style.display         = 'none';
    document.getElementById('resultsContent').style.display = 'block';

    renderOverallScores(scores);
    renderQuestionCards(questions, answers, scores);
    await setupVideoSection();
    setupDownloads(questions, answers, scores);
    tryPersistSession(questions, scores);
  }

  function avg(scores) {
    if (!scores.length) return 0;
    return scores.reduce((a, s) => a + (Number(s.score) || 0), 0) / scores.length;
  }

  function gradeFor(score) {
    if (score >= 9) return 'A';
    if (score >= 7) return 'B';
    if (score >= 5) return 'C';
    if (score >= 3) return 'D';
    return 'F';
  }

  function esc(str) {
    return String(str || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function renderOverallScores(scores) {
    const average = avg(scores);
    const grade   = gradeFor(average);
    const best    = Math.max(...scores.map(s => Number(s.score) || 0));
    const worst   = Math.min(...scores.map(s => Number(s.score) || 0));

    document.getElementById('overallScores').innerHTML = `
      <div class="overall-score-card card-glow">
        <div class="overall-score-val">${average.toFixed(1)}</div>
        <div class="overall-score-label">Average Score</div>
      </div>
      <div class="overall-score-card">
        <div class="overall-score-val" style="color:var(--text-bright)">${grade}</div>
        <div class="overall-score-label">Grade</div>
      </div>
      <div class="overall-score-card">
        <div class="overall-score-val" style="color:var(--success)">${best}/10</div>
        <div class="overall-score-label">Best Answer</div>
      </div>
      <div class="overall-score-card">
        <div class="overall-score-val" style="color:var(--warning)">${worst}/10</div>
        <div class="overall-score-label">Needs Work</div>
      </div>
      <div class="overall-score-card">
        <div class="overall-score-val" style="color:var(--text-bright)">${scores.length}</div>
        <div class="overall-score-label">Questions</div>
      </div>`;
  }

  function renderQuestionCards(questions, answers, scores) {
    const container = document.getElementById('questionCards');
    container.innerHTML = '';

    questions.forEach((q, i) => {
      const score  = scores[i]  || {};
      const answer = answers[i] || {};
      const s      = Number(score.score) || 0;
      const grade  = score.grade || gradeFor(s);

      const item = document.createElement('div');
      item.className = 'acc-item';

      const ring = buildScoreRing(s);

      item.innerHTML = `
        <div class="acc-header">
          <span class="acc-q-num">Q${i + 1}</span>
          <span class="acc-q-text">${esc(q.text)}</span>
          <div class="acc-score-ring">${ring}</div>
          <svg class="acc-chevron" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="6 9 12 15 18 9"/>
          </svg>
        </div>
        <div class="acc-body">
          ${answer.answer ? `
            <div class="acc-section-title">Your Answer</div>
            <div class="acc-answer-block">${esc(answer.answer)}</div>` : ''}

          <div class="acc-two-col">
            ${score.strengths && score.strengths.length ? `
              <div>
                <div class="acc-section-title" style="color:var(--success)">Strengths</div>
                <ul class="acc-points">
                  ${score.strengths.map(s => `<li>${esc(s)}</li>`).join('')}
                </ul>
              </div>` : ''}
            ${score.gaps && score.gaps.length ? `
              <div>
                <div class="acc-section-title" style="color:var(--warning)">Areas to Improve</div>
                <ul class="acc-points">
                  ${score.gaps.map(g => `<li>${esc(g)}</li>`).join('')}
                </ul>
              </div>` : ''}
          </div>

          ${score.model_answer ? `
            <div class="acc-section-title">Model Answer</div>
            <div class="acc-model-answer">${esc(score.model_answer)}</div>` : ''}

          ${score.star_feedback ? `
            <div class="star-block">
              <div class="acc-section-title" style="margin-bottom:0.5rem">STAR Feedback</div>
              ${esc(score.star_feedback)}
            </div>` : ''}
        </div>`;

      item.querySelector('.acc-header').addEventListener('click', () => {
        item.classList.toggle('open');
      });

      container.appendChild(item);
    });
  }

  function buildScoreRing(score) {
    const pct   = score / 10;
    const r     = 18;
    const circ  = 2 * Math.PI * r;
    const dash  = circ * pct;
    const grade = gradeFor(score);
    const colors = { A: '#34d399', B: '#22d3ee', C: '#fbbf24', D: '#fb923c', F: '#f87171' };
    const color  = colors[grade] || '#22d3ee';

    return `<svg width="44" height="44" viewBox="0 0 44 44">
      <circle cx="22" cy="22" r="${r}" fill="none" stroke="rgba(255,255,255,0.06)" stroke-width="3"/>
      <circle cx="22" cy="22" r="${r}" fill="none" stroke="${color}" stroke-width="3"
        stroke-dasharray="${dash} ${circ}" stroke-linecap="round" transform="rotate(-90 22 22)"/>
      <text x="22" y="22" dominant-baseline="central" text-anchor="middle"
        fill="${color}" font-size="11" font-weight="700" font-family="Space Grotesk, sans-serif">${score}</text>
    </svg>`;
  }

  async function setupVideoSection() {
    const blob = window.__interviewVideoBlob || (await loadFromIDB());
    if (!blob) return;

    const section = document.getElementById('videoSection');
    const video   = document.getElementById('resultVideo');
    const dlBtn   = document.getElementById('downloadVideo');

    const url  = URL.createObjectURL(blob);
    video.src  = url;
    section.style.display = 'block';
    dlBtn.style.display   = '';

    dlBtn.addEventListener('click', () => {
      const a   = document.createElement('a');
      a.href     = url;
      a.download = 'interview-' + Date.now() + '.webm';
      a.click();
    });
  }

  function setupDownloads(questions, answers, scores) {
    document.getElementById('downloadReport').addEventListener('click', () => {
      const average = avg(scores);
      const lines   = [
        'INTERVIEW ACE: RESULTS REPORT',
        '='.repeat(44),
        'Date:          ' + new Date().toLocaleString(),
        'Overall Score: ' + average.toFixed(1) + '/10 (' + gradeFor(average) + ')',
        '',
        '='.repeat(44),
        'QUESTION BREAKDOWN',
        '='.repeat(44),
      ];

      questions.forEach((q, i) => {
        const s = scores[i]  || {};
        const a = answers[i] || {};
        lines.push('');
        lines.push(`Q${i + 1} [${q.type}]`);
        lines.push('Question:  ' + q.text);
        lines.push('Score:     ' + (s.score || 0) + '/10 (' + (s.grade || gradeFor(s.score || 0)) + ')');
        if (a.answer)        lines.push('Answer:    ' + String(a.answer).slice(0, 800));
        if (s.strengths?.length) lines.push('Strengths: ' + s.strengths.join(' | '));
        if (s.gaps?.length)      lines.push('Gaps:      ' + s.gaps.join(' | '));
        if (s.model_answer)  lines.push('Model:     ' + s.model_answer);
        if (s.star_feedback) lines.push('STAR:      ' + s.star_feedback);
      });

      const blob   = new Blob([lines.join('\n')], { type: 'text/plain' });
      const url    = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href      = url;
      anchor.download  = 'interview-report-' + Date.now() + '.txt';
      anchor.click();
      setTimeout(() => URL.revokeObjectURL(url), 8000);
    });
  }

  async function tryPersistSession(questions, scores) {
    if (!Auth.isLoggedIn()) return;

    const average  = avg(scores);
    const jobTitle = State.get('jobTitle') || '';

    try {
      await fetch(`${API_BASE}/api/sessions`, {
        method:  'POST',
        headers: Auth.authHeaders(),
        body:    JSON.stringify({
          job_title:     jobTitle,
          num_questions: questions.length,
          avg_score:     average,
          evaluations:   scores,
        }),
      });
    } catch (_) {}
  }

  async function loadFromIDB() {
    return new Promise(resolve => {
      try {
        const req = indexedDB.open('interviewAce', 1);
        req.onupgradeneeded = e => e.target.result.createObjectStore('blobs');
        req.onsuccess = e => {
          const db  = e.target.result;
          const tx  = db.transaction('blobs', 'readonly');
          const get = tx.objectStore('blobs').get('videoBlob');
          get.onsuccess = () => { db.close(); resolve(get.result || null); };
          get.onerror   = () => { db.close(); resolve(null); };
        };
        req.onerror = () => resolve(null);
      } catch { resolve(null); }
    });
  }

  init();
})();
