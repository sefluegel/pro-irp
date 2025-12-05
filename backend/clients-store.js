// backend/clients-store.js
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const DATA_DIR = path.join(__dirname, "data");
const FILE = path.join(DATA_DIR, "clients.json");

function ensure() {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(FILE)) {
    fs.writeFileSync(FILE, JSON.stringify({ users: {} }, null, 2));
  }
}
function load() {
  ensure();
  const raw = fs.readFileSync(FILE, "utf8");
  try { return JSON.parse(raw); } catch { return { users: {} }; }
}
function save(db) {
  fs.writeFileSync(FILE, JSON.stringify(db, null, 2));
}

function list(userId) {
  const db = load();
  return db.users[userId] || [];
}
function getById(userId, clientId) {
  return list(userId).find(c => c.id === clientId) || null;
}

const FIELDS = [
  "firstName","lastName","email","phone","notes",
  "dob","address","city","state","zip","effectiveDate","preferredLanguage",
  "carrier","plan","primaryCare","specialists","medications",
  "soaOnFile","soaSigned","ptcOnFile","ptcSigned","enrollmentOnFile",
  "riskScore","lastContact"
];

function sanitize(input = {}) {
  const out = {};
  for (const k of FIELDS) {
    if (input[k] !== undefined) out[k] = String(input[k]).trim();
  }
  return out;
}

function add(userId, input) {
  const db = load();
  const arr = db.users[userId] || [];
  const id = (crypto.randomUUID?.() || Date.now().toString(36) + Math.random().toString(36).slice(2));
  const createdAt = new Date().toISOString();
  const client = {
    id, createdAt,
    uploads: [],
    comms: [],           // <-- automatic comms log lives here
    outreach: [],        // (kept for backward compatibility; unused for UI)
    ...sanitize(input)
  };
  if (!client.firstName && !client.lastName) { client.firstName = "New"; client.lastName = "Client"; }
  arr.push(client);
  db.users[userId] = arr;
  save(db);
  return client;
}

function update(userId, clientId, patch) {
  const db = load();
  const arr = db.users[userId] || [];
  const idx = arr.findIndex(c => c.id === clientId);
  if (idx < 0) return null;
  const before = arr[idx];
  const clean = sanitize(patch);
  const after = { ...before, ...clean };
  arr[idx] = after;
  db.users[userId] = arr;
  save(db);
  return after;
}

function remove(userId, clientId) {
  const db = load();
  const arr = db.users[userId] || [];
  const idx = arr.findIndex(c => c.id === clientId);
  if (idx < 0) return false;
  arr.splice(idx, 1);
  db.users[userId] = arr;
  save(db);
  return true;
}

/* ---------- Upload helpers (unchanged) ---------- */
function addUpload(userId, clientId, { label, filename, originalName, size }) {
  const db = load();
  const arr = db.users[userId] || [];
  const idx = arr.findIndex(c => c.id === clientId);
  if (idx < 0) return null;
  const now = new Date().toISOString();
  const entry = { id: (crypto.randomUUID?.() || String(Date.now())), label, file: filename, originalName, size, date: now };
  const c = arr[idx];
  c.uploads = Array.isArray(c.uploads) ? c.uploads : [];
  c.uploads.unshift(entry);
  arr[idx] = c;
  db.users[userId] = arr;
  save(db);
  return entry;
}
function listUploads(userId, clientId) {
  return getById(userId, clientId)?.uploads || [];
}
function removeUpload(userId, clientId, uploadId) {
  const db = load();
  const arr = db.users[userId] || [];
  const idx = arr.findIndex(c => c.id === clientId);
  if (idx < 0) return false;
  const c = arr[idx];
  const before = c.uploads?.length || 0;
  c.uploads = (c.uploads || []).filter(u => u.id !== uploadId);
  arr[idx] = c;
  db.users[userId] = arr;
  save(db);
  return (c.uploads.length !== before);
}

/* ---------- Automatic Communications (new) ---------- */
// Shape: { id, type: 'sms'|'email'|'call'|'appointment', direction: 'out'|'in',
//          subject, preview, at, meta? { duration, recordingUrl, threadId, ... } }
function addComm(userId, clientId, payload = {}) {
  const db = load();
  const arr = db.users[userId] || [];
  const idx = arr.findIndex(c => c.id === clientId);
  if (idx < 0) return null;

  const entry = {
    id: crypto.randomUUID?.() || String(Date.now()),
    type: String(payload.type || "note").toLowerCase(),
    direction: payload.direction === "in" ? "in" : "out",
    subject: String(payload.subject || "").trim(),
    preview: String(payload.preview || "").trim(),
    at: payload.at ? new Date(payload.at).toISOString() : new Date().toISOString(),
    meta: typeof payload.meta === "object" && payload.meta ? payload.meta : undefined
  };

  const c = arr[idx];
  c.comms = Array.isArray(c.comms) ? c.comms : [];
  c.comms.unshift(entry);
  // maintain a cap to avoid unbounded growth (optional)
  if (c.comms.length > 5000) c.comms.length = 5000;

  // optionally bump lastContact for outbound interactions
  if (entry.direction === "out") c.lastContact = entry.at;

  arr[idx] = c;
  db.users[userId] = arr;
  save(db);
  return entry;
}
function listComms(userId, clientId, limit) {
  const c = getById(userId, clientId);
  const rows = c?.comms || [];
  if (!limit || limit <= 0) return rows;
  return rows.slice(0, limit);
}

module.exports = {
  list, getById, add, update, remove,
  addUpload, listUploads, removeUpload,
  addComm, listComms
};
