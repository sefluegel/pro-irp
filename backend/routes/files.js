const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { requireAuth } = require('../services/authz');
const upload = multer({ dest: path.join(__dirname, '..', 'uploads') });
const router = express.Router();
router.use(requireAuth);

router.get('/', (req, res) => {
  const dir = path.join(__dirname, '..', 'uploads');
  if (!fs.existsSync(dir)) return res.json([]);
  const files = fs.readdirSync(dir).map(f => ({ name: f, url: `/files/${f}` }));
  res.json(files);
});

router.post('/', upload.single('file'), (req, res) => res.status(201).json({ name: req.file.filename, original: req.file.originalname, url: `/files/${req.file.filename}` }));

module.exports = router;
