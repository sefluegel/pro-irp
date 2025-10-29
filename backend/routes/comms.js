const express = require('express');
const { read, write } = require('../services/store');
const { requireAuth } = require('../services/authz');
const router = express.Router();
router.use(requireAuth);

router.get('/:clientId', (req, res) => {
  const all = read('comms');
  res.json(all.filter(c => c.userId === req.user.id && c.clientId === req.params.clientId));
});

router.post('/:clientId', (req, res) => {
  const all = read('comms');
  const rec = { id: Date.now().toString(), userId: req.user.id, clientId: req.params.clientId, type: req.body.type, content: req.body.content || '', at: new Date().toISOString() };
  all.push(rec); write('comms', all); res.status(201).json(rec);
});

module.exports = router;
