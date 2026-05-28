// ── Voice Mode ──────────────────────────────────────────
let _voiceActive   = false;
let _voiceIdx      = 0;
let _voiceRec      = null;
let _voicePlaneId  = null;
let _voiceClId     = null;
let _voiceTTS      = localStorage.getItem('flightcheck-voice-tts') !== '0';
let _voiceSpeaking = false;

function startVoiceMode() {
  const plane = getPlane(activePlaneId);
  const cl = getCL(plane, activeChecklistId);
  if (!cl || !cl.items.length) return;

  _voicePlaneId = activePlaneId;
  _voiceClId = activeChecklistId;
  _voiceActive = true;

  _voiceIdx = cl.items.findIndex(i => !i.done);
  if (_voiceIdx === -1) _voiceIdx = cl.items.length;

  document.getElementById('voice-overlay').style.display = 'flex';
  document.addEventListener('keydown', _voiceKeyHandler);
  _voiceRender();
  _voiceStartRec();
}

function _voiceClose() {
  _voiceActive = false;
  if (_voiceRec) { try { _voiceRec.stop(); } catch {} _voiceRec = null; }
  if (window.speechSynthesis) window.speechSynthesis.cancel();
  _voiceSpeaking = false;
  document.removeEventListener('keydown', _voiceKeyHandler);
  document.getElementById('voice-overlay').style.display = 'none';
  save();
  renderSidebar();
  renderMain();
}

function _voiceSpeak(text) {
  if (!_voiceTTS || !window.speechSynthesis) return;
  window.speechSynthesis.cancel();
  const utt = new SpeechSynthesisUtterance(text);
  utt.rate = 0.88;
  utt.pitch = 1;
  utt.lang = 'en-US';
  utt.onstart = () => { _voiceSpeaking = true; };
  utt.onend = utt.onerror = () => { _voiceSpeaking = false; };
  window.speechSynthesis.speak(utt);
}

function _voiceUpdateTTSBtn() {
  const btn = document.getElementById('voice-tts-btn');
  const icon = document.getElementById('voice-tts-icon');
  if (!btn) return;
  btn.style.borderColor = _voiceTTS ? 'var(--amber)' : 'var(--border)';
  btn.style.color       = _voiceTTS ? 'var(--amber)' : 'var(--text-faint)';
  icon.className = _voiceTTS ? 'bi bi-volume-up' : 'bi bi-volume-mute';
}

function _voiceCL() { return getCL(getPlane(_voicePlaneId), _voiceClId); }

function _voiceRender() {
  const cl = _voiceCL();
  if (!cl) { _voiceClose(); return; }

  const total = cl.items.length;
  const done = cl.items.filter(i => i.done).length;
  document.getElementById('voice-cl-name').textContent = cl.name.toUpperCase();
  document.getElementById('voice-progress').textContent = done + ' / ' + total + ' done';

  const complete = _voiceIdx >= total;
  document.getElementById('voice-item-card').style.display = complete ? 'none' : 'flex';
  document.getElementById('voice-complete-card').style.display = complete ? 'flex' : 'none';
  document.getElementById('voice-check-btn').disabled = complete;
  document.getElementById('voice-skip-btn').disabled = complete;
  _voiceUpdateTTSBtn();

  if (!complete) {
    const item = cl.items[_voiceIdx];
    document.getElementById('voice-item-num').textContent = 'Item ' + (_voiceIdx + 1) + ' of ' + total;
    document.getElementById('voice-item-text').textContent = item.text;
    const valEl = document.getElementById('voice-item-value');
    if (item.value) { valEl.textContent = '→ ' + item.value; valEl.style.display = 'block'; }
    else { valEl.style.display = 'none'; }
    _voiceSpeak(item.text);
  }
}

function _voiceCheck() {
  const cl = _voiceCL();
  if (!cl || _voiceIdx >= cl.items.length) return;
  cl.items[_voiceIdx].done = true;
  haptic();
  _voiceIdx++;
  _voiceFlash('check');
  if (_voiceIdx >= cl.items.length) { setTimeout(_voiceClose, 900); return; }
  _voiceRender();
}

function _voiceComplete() {
  const cl = _voiceCL();
  if (!cl) return;
  cl.items.forEach(i => { i.done = true; });
  haptic();
  _voiceFlash('check');
  setTimeout(_voiceClose, 900);
}

function _voiceSkip() {
  const cl = _voiceCL();
  if (!cl || _voiceIdx >= cl.items.length) return;
  _voiceIdx++;
  _voiceFlash('skip');
  _voiceRender();
}

function _voiceBack() {
  if (_voiceIdx <= 0) return;
  _voiceIdx--;
  const cl = _voiceCL();
  if (cl?.items[_voiceIdx]) cl.items[_voiceIdx].done = false;
  haptic();
  _voiceFlash('back');
  _voiceRender();
}

function _voiceFlash(type) {
  const card = document.getElementById('voice-item-card');
  if (!card) return;
  const border = type === 'check' ? 'var(--green)' : type === 'back' ? 'var(--amber)' : 'rgba(255,255,255,0.18)';
  const bg     = type === 'check' ? 'var(--green-dim)' : 'var(--bg2)';
  card.style.transition = 'none';
  card.style.borderColor = border;
  card.style.background  = bg;
  setTimeout(() => {
    card.style.transition = 'border-color 0.5s ease, background 0.5s ease';
    card.style.borderColor = 'var(--border-amb)';
    card.style.background  = 'var(--bg2)';
  }, 280);
}

function _voiceStartRec() {
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  const statusEl = document.getElementById('voice-status-text');
  const micEl    = document.getElementById('voice-mic');

  if (!SR) {
    statusEl.textContent = 'Voice not supported — use buttons below';
    micEl.style.background  = 'var(--text-faint)';
    micEl.style.animation   = 'none';
    return;
  }

  function startOnce() {
    if (!_voiceActive) return;
    _voiceRec = new SR();
    _voiceRec.continuous      = false;
    _voiceRec.interimResults  = false;
    _voiceRec.lang            = 'en-US';
    _voiceRec.maxAlternatives = 3;

    _voiceRec.onstart = () => {
      statusEl.textContent = 'Listening…';
      micEl.classList.add('listening');
    };

    _voiceRec.onresult = e => {
      if (_voiceSpeaking) return;
      const alts = Array.from({ length: e.results[0].length }, (_, i) =>
        e.results[0][i].transcript.toLowerCase().trim()
      );
      document.getElementById('voice-transcript').textContent = '"' + alts[0] + '"';

      const words = alts.join(' ').split(/[\s,.!?]+/);
      if (words.some(w => w === 'complete')) {
        _voiceComplete();
      } else if (words.some(w => w === 'checked')) {
        _voiceCheck();
      } else if (words.some(w => w === 'back')) {
        _voiceBack();
      } else if (words.some(w => w === 'skip' || w === 'next')) {
        _voiceSkip();
      } else {
        statusEl.textContent = 'Say CHECKED · SKIP · BACK · COMPLETE';
        setTimeout(() => { if (_voiceActive) statusEl.textContent = 'Listening…'; }, 2000);
      }
    };

    _voiceRec.onerror = e => {
      micEl.classList.remove('listening');
      if (e.error === 'not-allowed' || e.error === 'service-not-allowed') {
        statusEl.textContent = 'Microphone access denied';
        micEl.style.background = 'var(--red)';
        micEl.style.animation  = 'none';
      }
    };

    _voiceRec.onend = () => {
      micEl.classList.remove('listening');
      if (_voiceActive) setTimeout(startOnce, 150);
    };

    try { _voiceRec.start(); } catch {}
  }

  startOnce();
}

function _voiceKeyHandler(e) {
  if (!_voiceActive) return;
  if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); _voiceCheck(); }
  else if (e.key === 'ArrowRight' || e.key.toLowerCase() === 's') _voiceSkip();
  else if (e.key === 'ArrowLeft'  || e.key.toLowerCase() === 'b') _voiceBack();
  else if (e.key === 'Escape') _voiceClose();
}

document.getElementById('voice-check-btn').addEventListener('click', _voiceCheck);
document.getElementById('voice-skip-btn').addEventListener('click', _voiceSkip);
document.getElementById('voice-back-btn').addEventListener('click', _voiceBack);
document.getElementById('voice-exit-btn').addEventListener('click', _voiceClose);
document.getElementById('voice-tts-btn').addEventListener('click', () => {
  _voiceTTS = !_voiceTTS;
  localStorage.setItem('flightcheck-voice-tts', _voiceTTS ? '1' : '0');
  if (!_voiceTTS) window.speechSynthesis?.cancel();
  _voiceUpdateTTSBtn();
});
