const VideoCapture = (() => {
  'use strict';

  let stream   = null;
  let recorder = null;
  let chunks   = [];

  async function init(videoEl, recBadge, fallbackEl) {
    try {
      stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      videoEl.srcObject = stream;
      recBadge.style.display = 'flex';
      return stream;
    } catch (err) {
      console.warn('Camera/mic unavailable:', err.message);
      videoEl.style.display      = 'none';
      fallbackEl.style.display   = 'flex';
      recBadge.style.display     = 'none';
      return null;
    }
  }

  function startRecording() {
    if (!stream) return;
    chunks = [];

    const mimeTypes = [
      'video/webm;codecs=vp8,opus',
      'video/webm;codecs=vp9,opus',
      'video/webm',
      'video/mp4',
    ];
    let mimeType = '';
    for (const mt of mimeTypes) {
      if (MediaRecorder.isTypeSupported(mt)) { mimeType = mt; break; }
    }

    try {
      recorder = mimeType
        ? new MediaRecorder(stream, { mimeType })
        : new MediaRecorder(stream);
    } catch {
      recorder = new MediaRecorder(stream);
    }

    recorder.ondataavailable = e => {
      if (e.data && e.data.size > 0) chunks.push(e.data);
    };
    recorder.start(1000);
  }

  async function stopRecording() {
    if (!recorder || recorder.state === 'inactive') return null;

    return new Promise(resolve => {
      recorder.onstop = async () => {
        const blob = new Blob(chunks, { type: recorder.mimeType || 'video/webm' });
        window.__interviewVideoBlob = blob;
        await _saveToIDB(blob);
        resolve(blob);
      };
      recorder.stop();
    });
  }

  function stopCamera() {
    if (stream) {
      stream.getTracks().forEach(t => t.stop());
      stream = null;
    }
  }

  async function _saveToIDB(blob) {
    return new Promise(resolve => {
      try {
        const req = indexedDB.open('interviewAce', 1);
        req.onupgradeneeded = e => e.target.result.createObjectStore('blobs');
        req.onsuccess = e => {
          const db = e.target.result;
          const tx = db.transaction('blobs', 'readwrite');
          tx.objectStore('blobs').put(blob, 'videoBlob');
          tx.oncomplete = () => { db.close(); resolve(); };
          tx.onerror    = () => { db.close(); resolve(); };
        };
        req.onerror = () => resolve();
      } catch { resolve(); }
    });
  }

  return { init, startRecording, stopRecording, stopCamera };
})();
