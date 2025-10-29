const express = require('express');
const { read, write } = require('../services/store');
const { requireAuth } = require('../services/authz');
const router = express.Router();
router.use(requireAuth);

router.get('/', (req, res) => { res.json(read('tasks').filter(t => t.userId === req.user.id)); });

router.post('/', (req, res) => {
  const all = read('tasks');
  const t = { id: Date.now().toString(), userId: req.user.id, title: req.body.title, due: req.body.due || null, status: 'open', priority: req.body.priority || 'normal' };
  all.push(t); write('tasks', all); res.status(201).json(t);
});

router.post('/auto/threshold', (req, res) => {
  const { score, clientId } = req.body || {};
  const thresholds = [50,60,75];
  const all = read('tasks');
  thresholds.forEach(th => {
    if (score >= th) {
      all.push({ id: `${Date.now()}-${th}`, userId: req.user.id, title: `Follow up client ${clientId} (risk ≥ ${th})`, due: new Date().toISOString(), status: 'open', priority: 'high' });
    }
  });
  write('tasks', all); res.json({ created: 'ok' });
});

router.patch('/:id/complete', (req, res) => {
  const all = read('tasks');
  const idx = all.findIndex(t => t.id === req.params.id && t.userId === req.user.id);
  if (idx < 0) return res.status(404).json({ error: 'not found' });
  all[idx].status = 'done'; write('tasks', all); res.json(all[idx]);
});

module.exports = router;
