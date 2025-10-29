const fs = require('fs');
const path = require('path');
const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, '..', 'data');
function ensureDir(p) { if (!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true }); }
function fileFor(name) { ensureDir(DATA_DIR); return path.join(DATA_DIR, `${name}.json`); }
function read(name) { const f = fileFor(name); if (!fs.existsSync(f)) return []; try { return JSON.parse(fs.readFileSync(f,'utf-8')); } catch { return []; } }
function write(name, arr) { const f = fileFor(name); fs.writeFileSync(f, JSON.stringify(arr,null,2),'utf-8'); }
function upsert(name, predicate, obj) { const arr = read(name); const idx = arr.findIndex(predicate); if (idx>=0) arr[idx] = { ...arr[idx], ...obj }; else arr.push(obj); write(name, arr); return obj; }
module.exports = { read, write, upsert };
