let editMode = false;

function renderMain() {
  const plane = getPlane(activePlaneId);
  const titleEl = document.getElementById('main-title');
  const subEl = document.getElementById('main-sub');
  const tabsEl = document.getElementById('cl-tabs');
  const contentEl = document.getElementById('content');
  const actionsEl = document.getElementById('top-actions');

  if (!plane) {
    titleEl.textContent = 'Select an aircraft';
    subEl.textContent = '← Choose or add an aircraft';
    tabsEl.innerHTML = ''; actionsEl.innerHTML = '';
    contentEl.innerHTML = '<div class="empty-state"><i class="bi bi-airplane"></i><h3>No aircraft selected</h3><p>Select an aircraft from the sidebar.</p></div>';
    return;
  }

  titleEl.textContent = plane.name;
  subEl.textContent = `${plane.checklists.length} checklists · Always refer to POH`;

  actionsEl.innerHTML = `<button class="pill-btn danger" id="reset-btn"><i class="bi bi-arrow-clockwise"></i> Reset all</button>`;
  document.getElementById('reset-btn').addEventListener('click', () => {
    if (confirm('Reset all checklists for this aircraft?')) {
      plane.checklists.forEach(cl => cl.items.forEach(i => i.done = false));
      save(); renderSidebar(); renderMain();
    }
  });

  tabsEl.innerHTML = '';
  plane.checklists.forEach(cl => {
    const done = cl.items.filter(i=>i.done).length;
    const btn = document.createElement('button');
    btn.className = 'cl-tab' + (cl.id===activeChecklistId?' active':'');
    btn.dataset.id = cl.id;
    const dotColor = cl.color || null;
    btn.innerHTML = `<span data-color-pick="${cl.id}" style="display:inline-block;width:8px;height:8px;border-radius:50%;margin-right:6px;vertical-align:middle;flex-shrink:0;background:${dotColor||'transparent'};border:1.5px solid ${dotColor?'transparent':'var(--border)'};cursor:pointer;"></span>${cl.name} <span class="badge">${done}/${cl.items.length}</span><span class="tab-del-btn" data-del-cl="${cl.id}" title="Delete section" role="button"><i class="bi bi-x"></i></span>`;
    tabsEl.appendChild(btn);
  });
  const addTab = document.createElement('button');
  addTab.className = 'cl-tab-add'; addTab.title = 'New checklist';
  addTab.innerHTML = '<i class="bi bi-plus-lg"></i>';
  addTab.addEventListener('click', openModal);
  tabsEl.appendChild(addTab);

  tabsEl.ondblclick = e => {
    const tab = e.target.closest('.cl-tab[data-id]');
    if (!tab) return;
    const target = getCL(plane, +tab.dataset.id);
    if (!target) return;
    openModal('Rename section', name => {
      if (name.trim()) { target.name = name.trim(); save(); renderSidebar(); renderMain(); }
    }, target.name);
  };

  if (!activeChecklistId && plane.checklists.length) activeChecklistId = plane.checklists[0].id;
  const cl = getCL(plane, activeChecklistId);

  if (!cl) {
    contentEl.innerHTML = '<div class="empty-state"><i class="bi bi-list-check"></i><h3>No checklists</h3><p>Tap + to add a checklist.</p></div>';
    return;
  }

  actionsEl.insertAdjacentHTML('beforeend', `
    <button class="pill-btn" id="check-all-btn"><i class="bi bi-check2-all"></i> Complete</button>
    <button class="pill-btn" id="uncheck-all-btn"><i class="bi bi-square"></i> Uncheck</button>
    <button class="pill-btn${editMode ? ' pill-active' : ''}" id="edit-section-btn"><i class="bi bi-${editMode ? 'check-lg' : 'pencil'}"></i> ${editMode ? 'Done' : 'Edit'}</button>`);
  document.getElementById('check-all-btn').addEventListener('click', () => {
    cl.items.forEach(i => i.done = true);
    save(); renderSidebar(); renderMain();
  });
  document.getElementById('uncheck-all-btn').addEventListener('click', () => {
    cl.items.forEach(i => i.done = false);
    save(); renderSidebar(); renderMain();
  });
  document.getElementById('edit-section-btn').addEventListener('click', () => {
    editMode = !editMode; renderMain();
  });

  const done = cl.items.filter(i=>i.done).length;
  const total = cl.items.length;
  const pct = total ? Math.round((done/total)*100) : 0;
  const complete = done===total && total>0;

  let html = `<div class="prog-strip">
    <span class="prog-label">${cl.name.toUpperCase()}</span>
    <div class="prog-bar"><div class="prog-fill ${complete?'complete':''}" style="width:${pct}%"></div></div>
    <span class="prog-pct ${complete?'complete':''}">${pct}%</span>
  </div>`;

  if (complete) html += `<div class="complete-banner"><i class="bi bi-check-circle"></i><div><h4>Checklist complete</h4><p>All items verified. Safe flying!</p></div></div>`;

  if (!cl.items.length) {
    html += '<div class="empty-state" style="padding:2rem"><i class="bi bi-card-list"></i><h3>No items yet</h3><p>Add items below.</p></div>';
  } else {
    cl.items.forEach((item, idx) => {
      html += `<div class="cl-item ${item.done?'checked':''} ${item.important?'important':''}" data-item="${item.id}">
        <button class="cl-checkbox" data-check="${item.id}" aria-label="Toggle"><i class="bi bi-check"></i></button>
        <div class="cl-item-body">
          <div class="cl-item-text">${item.text}</div>
          ${item.value?`<div class="cl-item-value">&#8594; ${item.value}</div>`:''}
          <div class="cl-item-edit" id="edit-${item.id}">
            <input class="edit-text-input" type="text" value="${item.text}" placeholder="Step text" />
            <div class="cl-item-edit-row">
              <input class="edit-value-input" type="text" value="${item.value||''}" placeholder="Expected value" list="value-suggestions" />
              <button class="edit-save" data-save="${item.id}">Save</button>
              <button class="edit-cancel" data-cancel="${item.id}">Cancel</button>
            </div>
          </div>
        </div>
        <div class="cl-item-actions">
          <button class="ia-btn drag-handle" title="Drag to reorder"><i class="bi bi-grip-vertical"></i></button>
          <button class="ia-btn important-btn ${item.important?'on':''}" data-important="${item.id}" title="Mark important"><i class="bi bi-exclamation-triangle"></i></button>
          <button class="ia-btn" data-edit="${item.id}" title="Edit"><i class="bi bi-pencil"></i></button>
          <button class="ia-btn del-btn" data-del-item="${item.id}" title="Delete"><i class="bi bi-x-lg"></i></button>
        </div>
      </div>`;
    });
  }

  html += `<div class="add-item-row">
    <input type="text" id="new-item-text" placeholder="New item…" />
    <input type="text" id="new-item-value" class="val-in" placeholder="Expected value" list="value-suggestions" />
    <button class="add-item-btn" id="add-item-btn"><i class="bi bi-plus-lg"></i> Add</button>
  </div>`;

  contentEl.innerHTML = html;
  contentEl.classList.toggle('edit-mode', editMode);
  document.getElementById('add-item-btn').addEventListener('click', addItem);
  document.getElementById('new-item-text').addEventListener('keydown', e => { if(e.key==='Enter') addItem(); });
}

function addCL(name) {
  const plane = getPlane(activePlaneId);
  if (!plane || !name.trim()) return;
  const cl = { id: uid(), name: name.trim(), items: [] };
  plane.checklists.push(cl);
  activeChecklistId = cl.id;
  save(); renderSidebar(); renderMain();
}

function addItem() {
  const plane = getPlane(activePlaneId);
  const cl = getCL(plane, activeChecklistId);
  if (!cl) return;
  const text = document.getElementById('new-item-text')?.value.trim();
  if (!text) return;
  const value = document.getElementById('new-item-value')?.value.trim();
  cl.items.push({ id: uid(), text, value, done: false });
  save(); renderSidebar(); renderMain();
  setTimeout(() => document.getElementById('new-item-text')?.focus(), 50);
}

function toggleItem(itemId) {
  const plane = getPlane(activePlaneId);
  const cl = getCL(plane, activeChecklistId);
  const item = cl?.items.find(i => i.id === +itemId);
  if (item) { item.done = !item.done; haptic(); save(); renderSidebar(); renderMain(); }
}

function deleteItem(itemId) {
  const plane = getPlane(activePlaneId);
  const cl = getCL(plane, activeChecklistId);
  if (!cl) return;
  cl.items = cl.items.filter(i => i.id !== +itemId);
  save(); renderSidebar(); renderMain();
}

document.getElementById('cl-tabs').addEventListener('click', e => {
  const delCl = e.target.closest('[data-del-cl]');
  if (delCl) {
    e.stopPropagation();
    const plane = getPlane(activePlaneId);
    const cl = getCL(plane, +delCl.dataset.delCl);
    if (!cl) return;
    const itemCount = cl.items.length;
    openConfirm(
      'Delete section?',
      `"${cl.name}" and all its ${itemCount} item${itemCount !== 1 ? 's' : ''} will be permanently deleted.`,
      () => {
        plane.checklists = plane.checklists.filter(c => c.id !== cl.id);
        if (activeChecklistId === cl.id) activeChecklistId = plane.checklists[0]?.id || null;
        save(); renderMain();
      }
    );
    return;
  }

  const colorPick = e.target.closest('[data-color-pick]');
  if (colorPick) {
    e.stopPropagation();
    const plane = getPlane(activePlaneId);
    const cl = getCL(plane, +colorPick.dataset.colorPick);
    if (!cl) return;
    const colors = [null, '#e8a020', '#4caf7d', '#d9534f', '#5b9bd5'];
    const idx = colors.indexOf(cl.color || null);
    cl.color = colors[(idx + 1) % colors.length];
    save(); renderMain();
    return;
  }
  const tab = e.target.closest('.cl-tab[data-id]');
  if (tab) { editMode = false; activeChecklistId = +tab.dataset.id; renderMain(); }
});

document.getElementById('content').addEventListener('click', e => {
  const cb = e.target.closest('[data-check]');
  if (cb) { toggleItem(cb.dataset.check); return; }

  const del = e.target.closest('[data-del-item]');
  if (del) { if (confirm('Delete this item?')) deleteItem(del.dataset.delItem); return; }

  const imp = e.target.closest('[data-important]');
  if (imp) {
    const plane = getPlane(activePlaneId);
    const cl = getCL(plane, activeChecklistId);
    const item = cl?.items.find(i => i.id === +imp.dataset.important);
    if (item) { item.important = !item.important; save(); renderMain(); }
    return;
  }

  const editBtn = e.target.closest('[data-edit]');
  if (editBtn) {
    const id = editBtn.dataset.edit;
    const editEl = document.getElementById('edit-' + id);
    if (editEl) { editEl.classList.toggle('open'); editEl.querySelector('.edit-text-input')?.focus(); }
    return;
  }

  const saveBtn = e.target.closest('[data-save]');
  if (saveBtn) {
    const id = +saveBtn.dataset.save;
    const plane = getPlane(activePlaneId);
    const cl = getCL(plane, activeChecklistId);
    const item = cl?.items.find(i => i.id === id);
    if (item) {
      const editEl = document.getElementById('edit-' + id);
      const newText = editEl.querySelector('.edit-text-input').value.trim();
      const newVal = editEl.querySelector('.edit-value-input').value.trim();
      if (newText) { item.text = newText; item.value = newVal; save(); renderMain(); }
    }
    return;
  }

  const cancelBtn = e.target.closest('[data-cancel]');
  if (cancelBtn) {
    const editEl = document.getElementById('edit-' + cancelBtn.dataset.cancel);
    if (editEl) editEl.classList.remove('open');
    return;
  }

  const item = e.target.closest('.cl-item');
  if (item && !e.target.closest('.cl-item-actions') && !e.target.closest('.cl-item-edit')) {
    if (!_didSwipe && !editMode) toggleItem(item.dataset.item);
    _didSwipe = false;
  }
});

// ── Swipe to check / uncheck ───────────────────────────
let _swipeStartX = null, _swipeStartY = null, _swipeEl = null, _didSwipe = false, _swipeLocked = false;

function _swipeReset(el) {
  if (!el) return;
  el.style.transition = 'transform 0.25s cubic-bezier(0.34,1.56,0.64,1), background 0.2s';
  el.style.transform = 'translateX(0)';
  el.style.background = '';
}

document.getElementById('content').addEventListener('touchstart', e => {
  if (editMode) return;
  const item = e.target.closest('.cl-item');
  if (!item) return;
  _swipeStartX = e.touches[0].clientX;
  _swipeStartY = e.touches[0].clientY;
  _swipeEl = item;
  _didSwipe = false;
  _swipeLocked = false;
}, { passive: true });

document.getElementById('content').addEventListener('touchmove', e => {
  if (!_swipeEl || _swipeStartX === null) return;
  const dx = e.touches[0].clientX - _swipeStartX;
  const dy = e.touches[0].clientY - _swipeStartY;
  if (!_swipeLocked && Math.abs(dy) > Math.abs(dx) + 5) { _swipeReset(_swipeEl); _swipeEl = null; return; }
  if (Math.abs(dx) > 8) {
    _swipeLocked = true;
    e.preventDefault();
    _swipeEl.style.transition = 'none';
    _swipeEl.style.transform = `translateX(${(dx * 0.65).toFixed(1)}px)`;
    _swipeEl.style.background = dx > 0
      ? `rgba(76,175,125,${Math.min(Math.abs(dx) / 120, 0.28)})`
      : `rgba(232,160,32,${Math.min(Math.abs(dx) / 120, 0.28)})`;
  }
}, { passive: false });

document.getElementById('content').addEventListener('touchend', e => {
  if (!_swipeEl || _swipeStartX === null) { _swipeStartX = null; _swipeEl = null; return; }
  const dx = e.changedTouches[0].clientX - _swipeStartX;
  const dy = e.changedTouches[0].clientY - _swipeStartY;
  const el = _swipeEl;
  _swipeStartX = null; _swipeEl = null;
  if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.5) {
    _didSwipe = true;
    const plane = getPlane(activePlaneId);
    const cl = getCL(plane, activeChecklistId);
    const it = cl?.items.find(i => i.id === +el.dataset.item);
    if (it && it.done !== (dx > 0)) {
      haptic();
      el.style.transition = 'transform 0.15s ease-out, opacity 0.15s';
      el.style.transform = `translateX(${dx > 0 ? '110%' : '-110%'})`;
      el.style.opacity = '0';
      it.done = dx > 0;
      setTimeout(() => { save(); renderSidebar(); renderMain(); }, 160);
      return;
    }
  }
  _swipeReset(el);
}, { passive: true });

document.getElementById('content').addEventListener('touchcancel', () => {
  _swipeReset(_swipeEl); _swipeStartX = null; _swipeEl = null;
}, { passive: true });

// ── Drag to reorder (edit mode) ────────────────────────
let _dragId = null, _dragClone = null, _dragOriginY = null, _dragCloneOriginTop = null, _dragItemEls = null;

function _getDragTargetIdx(centerY) {
  for (let i = 0; i < _dragItemEls.length; i++) {
    const r = _dragItemEls[i].getBoundingClientRect();
    if (centerY < r.top + r.height / 2) return i;
  }
  return _dragItemEls.length;
}

function _clearDragHighlight() {
  _dragItemEls?.forEach(el => { el.style.borderTop = ''; el.style.borderBottom = ''; });
}

function _startDrag(e) {
  if (!editMode || !e.target.closest('.drag-handle')) return;
  const itemEl = e.target.closest('.cl-item');
  if (!itemEl) return;
  const clientY = e.touches ? e.touches[0].clientY : e.clientY;
  _dragId = +itemEl.dataset.item;
  _dragOriginY = clientY;
  const rect = itemEl.getBoundingClientRect();
  _dragCloneOriginTop = rect.top;
  _dragClone = itemEl.cloneNode(true);
  Object.assign(_dragClone.style, {
    position: 'fixed', left: rect.left + 'px', top: rect.top + 'px',
    width: rect.width + 'px', opacity: '0.95', zIndex: '1000',
    pointerEvents: 'none', boxShadow: '0 8px 28px rgba(0,0,0,0.5)',
    transition: 'none',
  });
  document.body.appendChild(_dragClone);
  itemEl.style.opacity = '0.2';
  _dragItemEls = [...document.querySelectorAll('.cl-item')];
}

function _moveDrag(e) {
  if (!_dragClone) return;
  e.preventDefault();
  const clientY = e.touches ? e.touches[0].clientY : e.clientY;
  const dy = clientY - _dragOriginY;
  _dragClone.style.top = (_dragCloneOriginTop + dy) + 'px';
  _clearDragHighlight();
  const centerY = _dragCloneOriginTop + dy + _dragClone.offsetHeight / 2;
  const tgt = _getDragTargetIdx(centerY);
  if (tgt < _dragItemEls.length) {
    if (+_dragItemEls[tgt].dataset.item !== _dragId) _dragItemEls[tgt].style.borderTop = '2px solid var(--amber)';
  } else {
    const last = _dragItemEls[_dragItemEls.length - 1];
    if (last && +last.dataset.item !== _dragId) last.style.borderBottom = '2px solid var(--amber)';
  }
}

function _endDrag(e) {
  if (!_dragClone || _dragId === null) return;
  const clientY = e.changedTouches ? e.changedTouches[0].clientY : e.clientY;
  const dy = clientY - _dragOriginY;
  const centerY = _dragCloneOriginTop + dy + _dragClone.offsetHeight / 2;
  const tgt = _getDragTargetIdx(centerY);
  const plane = getPlane(activePlaneId);
  const cl = getCL(plane, activeChecklistId);
  if (cl) {
    const fromIdx = cl.items.findIndex(i => i.id === _dragId);
    const toIdx = fromIdx < tgt ? tgt - 1 : tgt;
    if (fromIdx !== -1 && fromIdx !== toIdx) {
      const [item] = cl.items.splice(fromIdx, 1);
      cl.items.splice(toIdx, 0, item);
      save();
    }
  }
  _dragClone.remove();
  _dragClone = null; _dragId = null; _dragOriginY = null;
  _clearDragHighlight(); _dragItemEls = null;
  renderMain();
}

document.getElementById('content').addEventListener('mousedown', _startDrag);
document.getElementById('content').addEventListener('touchstart', _startDrag, { passive: true });
document.addEventListener('mousemove', e => { if (_dragClone) _moveDrag(e); });
document.addEventListener('mouseup',   e => { if (_dragClone) _endDrag(e); });
document.addEventListener('touchmove', e => { if (_dragClone) _moveDrag(e); }, { passive: false });
document.addEventListener('touchend',  e => { if (_dragClone) _endDrag(e); });
document.addEventListener('touchcancel', () => {
  if (!_dragClone) return;
  _dragClone.remove(); _dragClone = null; _dragId = null;
  _clearDragHighlight(); _dragItemEls = null; renderMain();
});

