let drawColor = '#e8e6df', drawSize = 4, drawTool = 'pen';

function renderNotes() {
  document.getElementById('main-title').textContent = 'Notes';
  document.getElementById('main-sub').textContent = 'Scratch pad';
  document.getElementById('top-actions').innerHTML = `
    <button class="pill-btn" id="undo-btn"><i class="bi bi-arrow-counterclockwise"></i> Undo</button>
    <button class="pill-btn danger" id="clear-canvas-btn"><i class="bi bi-trash"></i> Clear</button>`;

  const tabsEl = document.getElementById('cl-tabs');
  tabsEl.innerHTML = '';
  notesDB.notes.forEach(note => {
    const btn = document.createElement('button');
    btn.className = 'cl-tab' + (note.id === notesDB.activeNoteId ? ' active' : '');
    btn.dataset.noteId = note.id;
    btn.innerHTML = `${note.name}${notesDB.notes.length > 1
      ? ` <span data-note-del="${note.id}" style="margin-left:5px;font-size:13px;line-height:1;opacity:0.45;vertical-align:middle;">&times;</span>`
      : ''}`;
    tabsEl.appendChild(btn);
  });
  const addNoteBtn = document.createElement('button');
  addNoteBtn.className = 'cl-tab-add';
  addNoteBtn.title = 'New note';
  addNoteBtn.innerHTML = '<i class="bi bi-plus-lg"></i>';
  addNoteBtn.addEventListener('click', () => openModal('New note', name => {
    const note = { id: notesUid(), name: name.trim() || ('Note ' + (notesDB.notes.length + 1)) };
    notesDB.notes.push(note);
    notesDB.activeNoteId = note.id;
    saveNotesDB();
    renderNotes();
  }));
  tabsEl.appendChild(addNoteBtn);

  tabsEl.onclick = e => {
    const del = e.target.closest('[data-note-del]');
    if (del) {
      e.stopPropagation();
      const id = +del.dataset.noteDel;
      if (notesDB.notes.length === 1) return;
      if (!confirm('Delete this note?')) return;
      notesDB.notes = notesDB.notes.filter(n => n.id !== id);
      localStorage.removeItem('flightcheck-note-' + id);
      localStorage.removeItem('flightcheck-note-bg-' + id);
      if (notesDB.activeNoteId === id) notesDB.activeNoteId = notesDB.notes[0].id;
      saveNotesDB();
      renderNotes();
      return;
    }
    const tab = e.target.closest('[data-note-id]');
    if (tab && +tab.dataset.noteId !== notesDB.activeNoteId) {
      notesDB.activeNoteId = +tab.dataset.noteId;
      saveNotesDB();
      renderNotes();
    }
  };

  tabsEl.ondblclick = e => {
    const tab = e.target.closest('[data-note-id]');
    if (!tab) return;
    const note = notesDB.notes.find(n => n.id === +tab.dataset.noteId);
    if (!note) return;
    openModal('Rename note', name => {
      if (name.trim()) { note.name = name.trim(); saveNotesDB(); renderNotes(); }
    }, note.name);
  };

  const noteId = notesDB.activeNoteId;
  const existingBg = getNoteBg(noteId);

  const contentEl = document.getElementById('content');
  contentEl.innerHTML = `
    <div id="draw-toolbar" style="display:flex;align-items:center;gap:6px;padding:0 0 12px;flex-wrap:wrap;">
      <span style="font-size:11px;color:var(--text-faint);font-family:var(--mono);margin-right:2px;">COLOR</span>
      ${['#e8e6df','#e8a020','#4caf7d','#d9534f','#5b9bd5'].map(c => `<button class="color-btn" data-color="${c}" style="width:22px;height:22px;border-radius:50%;background:${c};border:2px solid ${c === '#e8e6df' ? '#e8a020' : 'transparent'};cursor:pointer;flex-shrink:0;"></button>`).join('')}
      <span style="font-size:11px;color:var(--text-faint);font-family:var(--mono);margin-left:8px;margin-right:2px;">SIZE</span>
      ${[1,2,4,8,14].map(s => `<button class="size-btn" data-size="${s}" style="width:${s+14}px;height:${s+14}px;border-radius:50%;background:var(--text-muted);border:2px solid ${s === drawSize ? '#e8a020' : 'transparent'};cursor:pointer;flex-shrink:0;"></button>`).join('')}
      <span style="font-size:11px;color:var(--text-faint);font-family:var(--mono);margin-left:8px;margin-right:2px;">TOOL</span>
      <button class="tool-btn" data-tool="pen" style="height:28px;padding:0 10px;border-radius:4px;border:1px solid var(--amber);background:var(--amber-glow);color:var(--amber);font-family:var(--mono);font-size:11px;cursor:pointer;">PEN</button>
      <button class="tool-btn" data-tool="eraser" style="height:28px;padding:0 10px;border-radius:4px;border:1px solid var(--border);background:transparent;color:var(--text-muted);font-family:var(--mono);font-size:11px;cursor:pointer;">ERASER</button>
      <span style="font-size:11px;color:var(--text-faint);font-family:var(--mono);margin-left:8px;margin-right:2px;">BG</span>
      <button id="bg-upload-btn" style="height:28px;padding:0 10px;border-radius:4px;border:1px solid ${existingBg ? 'var(--amber)' : 'var(--border)'};background:${existingBg ? 'var(--amber-glow)' : 'transparent'};color:${existingBg ? 'var(--amber)' : 'var(--text-muted)'};font-family:var(--mono);font-size:11px;cursor:pointer;" title="Upload background template"><i class="bi bi-image"></i> ${existingBg ? 'Replace' : 'Upload'}</button>
      ${existingBg ? `<button id="bg-remove-btn" style="height:28px;padding:0 10px;border-radius:4px;border:1px solid var(--red);background:transparent;color:var(--red);font-family:var(--mono);font-size:11px;cursor:pointer;" title="Remove background"><i class="bi bi-x-lg"></i></button>` : ''}
    </div>
    <input type="file" id="note-bg-file" accept="image/*" style="display:none" />
    <div id="canvas-wrap" style="position:relative;border-radius:var(--r);overflow:hidden;background:#1a1c18;">
      <img id="note-bg-img" src="${existingBg || ''}" style="position:absolute;inset:0;width:100%;height:100%;object-fit:contain;object-position:top left;pointer-events:none;display:${existingBg ? 'block' : 'none'};" />
      <canvas id="draw-canvas" style="display:block;width:100%;touch-action:none;cursor:crosshair;position:relative;"></canvas>
    </div>`;

  const canvas = document.getElementById('draw-canvas');
  const dpr = window.devicePixelRatio || 1;
  const cssW = contentEl.clientWidth;
  const cssH = Math.max(contentEl.clientHeight - 60, 500);
  canvas.width = cssW * dpr;
  canvas.height = cssH * dpr;
  canvas.style.width = cssW + 'px';
  canvas.style.height = cssH + 'px';
  document.getElementById('canvas-wrap').style.height = cssH + 'px';

  const ctx = canvas.getContext('2d');
  const saved = getNoteCanvas(noteId);
  if (saved) {
    const img = new Image();
    img.onload = () => ctx.drawImage(img, 0, 0);
    img.src = saved;
  }

  let drawing = false;
  let history = [];

  document.querySelectorAll('.color-btn').forEach(b => b.style.borderColor = b.dataset.color === drawColor ? '#e8a020' : 'transparent');
  updateToolBtns();

  function persistCanvas() { saveNoteCanvas(noteId, canvas.toDataURL()); }

  function saveState() {
    history.push(ctx.getImageData(0, 0, canvas.width, canvas.height));
    if (history.length > 40) history.shift();
  }

  function getPos(e) {
    const r = canvas.getBoundingClientRect();
    const src = e.touches ? e.touches[0] : e;
    return { x: (src.clientX - r.left) * dpr, y: (src.clientY - r.top) * dpr };
  }

  function startDraw(e) { e.preventDefault(); saveState(); drawing = true; const p = getPos(e); ctx.beginPath(); ctx.moveTo(p.x, p.y); }
  function draw(e) {
    e.preventDefault();
    if (!drawing) return;
    const p = getPos(e);
    ctx.lineTo(p.x, p.y);
    if (drawTool === 'eraser') {
      ctx.globalCompositeOperation = 'destination-out';
      ctx.strokeStyle = 'rgba(0,0,0,1)';
      ctx.lineWidth = drawSize * 5 * dpr;
    } else {
      ctx.globalCompositeOperation = 'source-over';
      ctx.strokeStyle = drawColor;
      ctx.lineWidth = drawSize * dpr;
    }
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.stroke();
  }
  function endDraw(e) {
    e.preventDefault();
    drawing = false;
    ctx.beginPath();
    ctx.globalCompositeOperation = 'source-over';
    persistCanvas();
  }

  canvas.addEventListener('mousedown', startDraw);
  canvas.addEventListener('mousemove', draw);
  canvas.addEventListener('mouseup', endDraw);
  canvas.addEventListener('touchstart', startDraw, { passive: false });
  canvas.addEventListener('touchmove', draw, { passive: false });
  canvas.addEventListener('touchend', endDraw, { passive: false });

  document.getElementById('clear-canvas-btn').addEventListener('click', () => {
    saveState();
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    persistCanvas();
  });

  document.getElementById('undo-btn').addEventListener('click', () => {
    if (history.length) { ctx.putImageData(history.pop(), 0, 0); persistCanvas(); }
  });

  document.getElementById('bg-upload-btn').addEventListener('click', () => {
    document.getElementById('note-bg-file').click();
  });

  document.getElementById('note-bg-file').addEventListener('change', e => {
    const file = e.target.files[0];
    e.target.value = '';
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => { saveNoteBg(noteId, ev.target.result); renderNotes(); };
    reader.readAsDataURL(file);
  });

  const removeBgBtn = document.getElementById('bg-remove-btn');
  if (removeBgBtn) {
    removeBgBtn.addEventListener('click', () => { removeNoteBg(noteId); renderNotes(); });
  }

  document.querySelectorAll('.color-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      drawColor = btn.dataset.color;
      drawTool = 'pen';
      document.querySelectorAll('.color-btn').forEach(b => b.style.borderColor = 'transparent');
      btn.style.borderColor = '#e8a020';
      updateToolBtns();
    });
  });

  document.querySelectorAll('.size-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      drawSize = +btn.dataset.size;
      document.querySelectorAll('.size-btn').forEach(b => b.style.borderColor = 'transparent');
      btn.style.borderColor = '#e8a020';
    });
  });

  document.querySelectorAll('.tool-btn').forEach(btn => {
    btn.addEventListener('click', () => { drawTool = btn.dataset.tool; updateToolBtns(); });
  });

  function updateToolBtns() {
    document.querySelectorAll('.tool-btn').forEach(b => {
      const on = b.dataset.tool === drawTool;
      b.style.borderColor = on ? 'var(--amber)' : 'var(--border)';
      b.style.background  = on ? 'var(--amber-glow)' : 'transparent';
      b.style.color       = on ? 'var(--amber)' : 'var(--text-muted)';
    });
  }
}

document.getElementById('notes-tab').addEventListener('click', () => {
  document.querySelectorAll('.plane-row').forEach(r => r.classList.remove('active'));
  document.getElementById('notes-tab').classList.add('active');
  activePlaneId = null;
  renderNotes();
});
