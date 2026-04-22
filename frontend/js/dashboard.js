(function () {
  'use strict';

  if (!Auth.guard('/login.html')) return;

  const user = Auth.getUser();

  function gradeFor(avg) {
    if (avg >= 9) return 'A';
    if (avg >= 7) return 'B';
    if (avg >= 5) return 'C';
    if (avg >= 3) return 'D';
    return 'F';
  }

  function init() {
    const nameEl = document.getElementById('userName');
    if (nameEl && user) nameEl.textContent = user.name || user.email.split('@')[0];

    document.getElementById('logoutBtn').addEventListener('click', () => Auth.logout());

    loadSessions();
  }

  async function loadSessions() {
    const body   = document.getElementById('sessionsBody');
    const empty  = document.getElementById('emptyState');
    const totalEl = document.getElementById('statTotal');
    const avgEl   = document.getElementById('statAvg');
    const bestEl  = document.getElementById('statBest');

    try {
      const res = await fetch(`${API_BASE}/api/sessions`, {
        headers: Auth.authHeaders(),
      });

      if (res.status === 401) { Auth.logout(); return; }
      if (!res.ok) throw new Error('Failed to load sessions');

      const data = await res.json();
      const sessions = data.sessions || [];

      totalEl.textContent = sessions.length;

      if (!sessions.length) {
        empty.style.display = 'block';
        avgEl.textContent  = 'n/a';
        bestEl.textContent = 'n/a';
        return;
      }

      const avg  = sessions.reduce((s, r) => s + r.avg_score, 0) / sessions.length;
      const best = Math.max(...sessions.map(r => r.avg_score));

      avgEl.textContent  = avg.toFixed(1);
      bestEl.textContent = best.toFixed(1);

      body.innerHTML = sessions.map(s => {
        const grade = gradeFor(s.avg_score);
        const date  = new Date(s.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
        return `
          <tr>
            <td>${s.job_title || 'Untitled'}</td>
            <td style="color:var(--muted)">${s.num_questions} Q</td>
            <td><span class="score-pill ${grade}">${s.avg_score.toFixed(1)}</span></td>
            <td style="color:var(--muted)">${date}</td>
          </tr>`;
      }).join('');

    } catch (err) {
      if (body) body.innerHTML = `<tr><td colspan="4" style="text-align:center;color:var(--muted);padding:2rem">Failed to load sessions</td></tr>`;
    }
  }

  init();
})();
