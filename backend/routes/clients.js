const express = require('express');
const { read, write } = require('../services/store');
const { requireAuth } = require('../services/authz');
const router = express.Router();
router.use(requireAuth);

function scope(clients, userId) { return clients.filter(c => c.userId === userId); }

router.get('/', (req, res) => { res.json(scope(read('clients'), req.user.id)); });

router.post('/', (req, res) => {
  const all = read('clients');
  const client = { id: Date.now().toString(), userId: req.user.id, ...req.body };
  all.push(client); write('clients', all); res.status(201).json(client);
});

router.put('/:id', (req, res) => {
  const all = read('clients');
  const idx = all.findIndex(c => c.id === req.params.id && c.userId === req.user.id);
  if (idx < 0) return res.status(404).json({ error: 'not found' });
  all[idx] = { ...all[idx], ...req.body }; write('clients', all); res.json(all[idx]);
});

router.delete('/:id', (req, res) => {
  const kept = read('clients').filter(c => !(c.id === req.params.id && c.userId === req.user.id));
  write('clients', kept); res.status(204).end();
});

module.exports = router;
