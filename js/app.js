function renderSidebar() {
  document.getElementById('notes-tab').classList.remove('active');
  const el = document.getElementById('plane-list');
  el.innerHTML = '';
  if (!db.planes.length) {
    el.innerHTML = '<div style="padding:12px 18px;font-size:12px;color:var(--text-faint);font-family:var(--mono);">No aircraft yet</div>';
    return;
  }
  db.planes.forEach((plane, idx) => {
    const done = plane.checklists.reduce((n,cl) => n + cl.items.filter(i=>i.done).length, 0);
    const total = plane.checklists.reduce((n,cl) => n + cl.items.length, 0);
    const pct = total ? Math.round((done / total) * 100) : 0;
    const circleColor = !total ? 'var(--border)' : pct <= 20 ? '#d9534f' : pct < 100 ? '#e8a020' : '#4caf7d';
    const circ = 62.83;
    const offset = (circ * (1 - pct / 100)).toFixed(2);
    const div = document.createElement('div');
    div.innerHTML = `
      <div class="plane-row ${plane.id===activePlaneId?'active':''}" data-id="${plane.id}">
        <div class="plane-row-top">
          <div class="plane-icon"><i class="bi bi-airplane"></i></div>
          <div class="plane-info">
            <div class="plane-name">${plane.name}</div>
            <div class="plane-meta">${plane.checklists.length} lists · ${done}/${total}</div>
          </div>
          <svg width="28" height="28" viewBox="0 0 28 28" style="flex-shrink:0;" title="${pct}%">
            <circle cx="14" cy="14" r="10" fill="none" stroke="var(--bg4)" stroke-width="2.5"/>
            <circle cx="14" cy="14" r="10" fill="none" stroke="${circleColor}" stroke-width="2.5"
              stroke-dasharray="${circ}" stroke-dashoffset="${offset}"
              stroke-linecap="round" transform="rotate(-90 14 14)"/>
          </svg>
        </div>
        <div class="plane-row-btns">
          <button class="plane-del" data-plane-up="${plane.id}" title="Move up" ${idx===0?'style="opacity:0.2;pointer-events:none"':''}><i class="bi bi-chevron-up"></i></button>
          <button class="plane-del" data-plane-down="${plane.id}" title="Move down" ${idx===db.planes.length-1?'style="opacity:0.2;pointer-events:none"':''}><i class="bi bi-chevron-down"></i></button>
          <button class="plane-del" data-ren="${plane.id}" title="Rename"><i class="bi bi-pencil"></i></button>
          <button class="plane-del" data-dup="${plane.id}" title="Duplicate"><i class="bi bi-copy"></i></button>
          <button class="plane-del" data-del="${plane.id}" title="Delete"><i class="bi bi-trash"></i></button>
        </div>
      </div>`;
    el.appendChild(div);
  });
}

function addPlane(name) {
  if (!name.trim()) return;
  const plane = { id: uid(), name: name.trim(), checklists: [] };
  db.planes.push(plane);
  activePlaneId = plane.id; activeChecklistId = null;
  save(); renderSidebar(); renderMain();
}

function uniquePlaneName(name, excludeId) {
  const others = db.planes.filter(p => p.id !== excludeId).map(p => p.name);
  if (!others.includes(name)) return name;
  let i = 1;
  while (others.includes(`${name} (${i})`)) i++;
  return `${name} (${i})`;
}

function deletePlane(id) {
  if (!confirm('Delete this aircraft and all its checklists?')) return;
  db.planes = db.planes.filter(p => p.id !== id);
  if (activePlaneId === id) { activePlaneId = db.planes[0]?.id || null; activeChecklistId = null; }
  save(); renderSidebar(); renderMain();
}

// ── Modal ──────────────────────────────────────────────
let _modalCb = null;
function openModal(title, cb, defaultVal) {
  _modalCb = cb || null;
  document.getElementById('modal-title').textContent = title || 'New checklist';
  document.getElementById('modal-input').value = defaultVal || '';
  document.getElementById('modal').style.display = 'flex';
  setTimeout(() => document.getElementById('modal-input').focus(), 50);
}
function closeModal() { document.getElementById('modal').style.display = 'none'; _modalCb = null; }
document.getElementById('modal-confirm').addEventListener('click', () => {
  const val = document.getElementById('modal-input').value;
  const cb = _modalCb;
  closeModal();
  if (cb) cb(val); else addCL(val);
});
document.getElementById('modal-cancel').addEventListener('click', closeModal);
document.getElementById('modal').addEventListener('click', e => { if(e.target===document.getElementById('modal')) closeModal(); });
document.getElementById('modal-input').addEventListener('keydown', e => { if(e.key==='Enter') document.getElementById('modal-confirm').click(); });

// ── Sidebar events ─────────────────────────────────────
document.getElementById('plane-list').addEventListener('click', e => {
  const del = e.target.closest('[data-del]');
  if (del) { e.stopPropagation(); deletePlane(+del.dataset.del); return; }

  const ren = e.target.closest('[data-ren]');
  if (ren) {
    e.stopPropagation();
    const plane = getPlane(+ren.dataset.ren);
    openModal('Rename aircraft', name => {
      if (name.trim()) { plane.name = uniquePlaneName(name.trim(), plane.id); save(); renderSidebar(); if (activePlaneId === plane.id) renderMain(); }
    }, plane.name);
    return;
  }

  const planeUp = e.target.closest('[data-plane-up]');
  if (planeUp) {
    e.stopPropagation();
    const i = db.planes.findIndex(p => p.id === +planeUp.dataset.planeUp);
    if (i > 0) { [db.planes[i-1], db.planes[i]] = [db.planes[i], db.planes[i-1]]; save(); renderSidebar(); }
    return;
  }

  const planeDown = e.target.closest('[data-plane-down]');
  if (planeDown) {
    e.stopPropagation();
    const i = db.planes.findIndex(p => p.id === +planeDown.dataset.planeDown);
    if (i < db.planes.length - 1) { [db.planes[i], db.planes[i+1]] = [db.planes[i+1], db.planes[i]]; save(); renderSidebar(); }
    return;
  }

  const dup = e.target.closest('[data-dup]');
  if (dup) {
    e.stopPropagation();
    const src = getPlane(+dup.dataset.dup);
    const copy = JSON.parse(JSON.stringify(src));
    copy.id = uid();
    copy.name = uniquePlaneName(src.name + ' (copy)');
    copy.checklists.forEach(cl => { cl.id = uid(); cl.items.forEach(i => { i.id = uid(); i.done = false; }); });
    db.planes.push(copy);
    activePlaneId = copy.id;
    activeChecklistId = copy.checklists[0]?.id || null;
    save(); renderSidebar(); renderMain();
    return;
  }

  const row = e.target.closest('.plane-row[data-id]');
  if (row) {
    activePlaneId = +row.dataset.id;
    activeChecklistId = getPlane(activePlaneId)?.checklists[0]?.id || null;
    renderSidebar(); renderMain();
  }
});
document.getElementById('add-plane-btn').addEventListener('click', () => {
  const inp = document.getElementById('new-plane-input');
  addPlane(inp.value); inp.value = '';
});
document.getElementById('new-plane-input').addEventListener('keydown', e => {
  if (e.key==='Enter') document.getElementById('add-plane-btn').click();
});

// ── Toast ──────────────────────────────────────────────
function showToast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg; t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 2500);
}

// ── Export ─────────────────────────────────────────────
document.getElementById('export-btn').addEventListener('click', () => {
  const json = JSON.stringify(db, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'flightcheck-backup-' + new Date().toISOString().slice(0,10) + '.json';
  a.click();
  URL.revokeObjectURL(url);
  showToast('Backup exported ✓');
});

// ── Import ─────────────────────────────────────────────
document.getElementById('import-btn').addEventListener('click', () => {
  document.getElementById('import-file').click();
});
document.getElementById('import-file').addEventListener('change', e => {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = ev => {
    try {
      const imported = JSON.parse(ev.target.result);
      if (!imported.planes || !Array.isArray(imported.planes)) throw new Error('Invalid file');
      if (!confirm('This will replace all current aircraft and checklists. Continue?')) return;
      db = imported;
      activePlaneId = db.planes[0]?.id || null;
      activeChecklistId = db.planes[0]?.checklists[0]?.id || null;
      save(); renderSidebar(); renderMain();
      showToast('Backup imported ✓');
    } catch {
      showToast('Invalid backup file ✗');
    }
  };
  reader.readAsText(file);
  e.target.value = '';
});

// ── Theme ──────────────────────────────────────────────
function applyTheme(light) {
  document.body.classList.toggle('light', light);
  document.getElementById('theme-icon').className = light ? 'bi bi-moon' : 'bi bi-sun';
}
if (localStorage.getItem('flightcheck-theme') === 'light') applyTheme(true);
document.getElementById('theme-btn').addEventListener('click', () => {
  const isLight = !document.body.classList.contains('light');
  localStorage.setItem('flightcheck-theme', isLight ? 'light' : 'dark');
  applyTheme(isLight);
});

// ── Factory reset ──────────────────────────────────────
document.getElementById('factory-reset-btn').addEventListener('click', () => {
  document.getElementById('factory-reset-input').value = '';
  document.getElementById('factory-reset-confirm').disabled = true;
  document.getElementById('factory-reset-confirm').style.opacity = '0.4';
  document.getElementById('factory-reset-confirm').style.cursor = 'not-allowed';
  document.getElementById('factory-reset-modal').style.display = 'flex';
  setTimeout(() => document.getElementById('factory-reset-input').focus(), 50);
});
document.getElementById('factory-reset-input').addEventListener('input', e => {
  const valid = e.target.value === 'RESET';
  const btn = document.getElementById('factory-reset-confirm');
  btn.disabled = !valid;
  btn.style.opacity = valid ? '1' : '0.4';
  btn.style.cursor = valid ? 'pointer' : 'not-allowed';
});
document.getElementById('factory-reset-cancel').addEventListener('click', () => {
  document.getElementById('factory-reset-modal').style.display = 'none';
});
document.getElementById('factory-reset-modal').addEventListener('click', e => {
  if (e.target === document.getElementById('factory-reset-modal')) document.getElementById('factory-reset-modal').style.display = 'none';
});
document.getElementById('factory-reset-confirm').addEventListener('click', () => {
  localStorage.clear();
  window.location.reload();
});

// ── Init ───────────────────────────────────────────────
(async () => {
  const seed = await fetch('seed.json').then(r => r.json());
  db = JSON.parse(localStorage.getItem('flightcheck-db') || 'null');
  if (!db) {
    db = JSON.parse(JSON.stringify(seed));
  } else {
    let changed = false;
    const knownPlaneIds = new Set(db.planes.map(p => p.id));
    for (const seedPlane of seed.planes) {
      if (!knownPlaneIds.has(seedPlane.id)) {
        db.planes.push(JSON.parse(JSON.stringify(seedPlane)));
        changed = true;
      } else {
        const userPlane = db.planes.find(p => p.id === seedPlane.id);
        const knownClIds = new Set(userPlane.checklists.map(cl => cl.id));
        const newCls = seedPlane.checklists.filter(cl => !knownClIds.has(cl.id));
        if (newCls.length) {
          userPlane.checklists.push(...JSON.parse(JSON.stringify(newCls)));
          changed = true;
        }
      }
    }
    if (changed) save();
  }
  activePlaneId = db.planes[0]?.id || null;
  activeChecklistId = db.planes[0]?.checklists[0]?.id || null;
  renderSidebar();
  renderMain();
})();
