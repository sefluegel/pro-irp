const express = require('express');
const { baseRisk } = require('../services/risk');
const { requireAuth } = require('../services/authz');
const router = express.Router();
router.use(requireAuth);
router.post('/score', (req, res) => res.json({ score: baseRisk(req.body || {}) }));
module.exports = router;
