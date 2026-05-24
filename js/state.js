let db = null;
let activePlaneId = null;
let activeChecklistId = null;
let notesDB = JSON.parse(localStorage.getItem('flightcheck-notes-db') || 'null') || { nextId: 2, notes: [{ id: 1, name: 'Note 1' }], activeNoteId: 1 };

function save() { localStorage.setItem('flightcheck-db', JSON.stringify(db)); }
function uid() { return db.nextId++; }
function getPlane(id) { return db.planes.find(p => p.id === id); }
function getCL(plane, id) { return plane?.checklists.find(c => c.id === id); }
function saveNotesDB() { localStorage.setItem('flightcheck-notes-db', JSON.stringify(notesDB)); }
function saveNoteCanvas(id, url) { localStorage.setItem('flightcheck-note-' + id, url); }
function getNoteCanvas(id) { return localStorage.getItem('flightcheck-note-' + id); }
function notesUid() { return notesDB.nextId++; }
function haptic() { if ('vibrate' in navigator) navigator.vibrate(10); }
