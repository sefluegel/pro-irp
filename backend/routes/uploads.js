// backend/routes/uploads.js - HIPAA-compliant file upload handler
const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const crypto = require("crypto");
const db = require("../db");

const router = express.Router();

// ============================================================================
// MIDDLEWARE - Require Authentication
// ============================================================================
function requireAuth(req, res, next) {
  if (!req.user || !req.user.id) {
    return res.status(401).json({ ok: false, error: "Unauthorized" });
  }
  next();
}

router.use(requireAuth);

// ============================================================================
// FILE STORAGE CONFIGURATION (HIPAA-compliant)
// ============================================================================

// Ensure uploads directory exists
const UPLOADS_DIR = path.join(__dirname, "..", "uploads");
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true, mode: 0o700 }); // Restricted permissions
}

// Configure multer for secure file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, UPLOADS_DIR);
  },
  filename: function (req, file, cb) {
    // Generate cryptographically secure random filename
    const uniqueSuffix = crypto.randomBytes(16).toString('hex');
    const ext = path.extname(file.originalname);
    cb(null, `${Date.now()}-${uniqueSuffix}${ext}`);
  }
});

// File filter - restrict to safe file types
const fileFilter = (req, file, cb) => {
  const allowedTypes = [
    'application/pdf',
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/gif',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/plain',
    'text/csv'
  ];

  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error(`File type ${file.mimetype} not allowed. Allowed types: PDF, images, Word, Excel, text files`), false);
  }
};

// Multer configuration with file size limits (10MB max)
const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB max
    files: 1 // One file at a time
  }
});

// ============================================================================
// HIPAA AUDIT LOGGING
// ============================================================================
async function logFileAccess(userId, clientId, uploadId, action, details = {}) {
  try {
    await db.query(
      `INSERT INTO audit_logs (user_id, client_id, action, resource_type, resource_id, details, ip_address)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        userId,
        clientId,
        action,
        'file_upload',
        uploadId,
        JSON.stringify(details),
        details.ip || null
      ]
    );
  } catch (error) {
    console.error('Audit log error:', error);
    // Don't fail the request if audit logging fails, but log the error
  }
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

// Check if user has access to client's files
async function checkClientAccess(userId, userRole, clientId) {
  const clientResult = await db.query(
    'SELECT owner_id, organization_id FROM clients WHERE id = $1',
    [clientId]
  );

  if (clientResult.rows.length === 0) {
    return { hasAccess: false, reason: 'Client not found' };
  }

  const client = clientResult.rows[0];

  // Admin and FMO can access all files
  if (userRole === 'admin' || userRole === 'fmo') {
    return { hasAccess: true };
  }

  // Agency role can access files for clients in their organization
  if (userRole === 'agency') {
    const userResult = await db.query(
      'SELECT organization_id FROM users WHERE id = $1',
      [userId]
    );
    if (userResult.rows[0]?.organization_id === client.organization_id) {
      return { hasAccess: true };
    }
  }

  // Agent can only access their own clients' files
  if (userRole === 'agent' && client.owner_id === userId) {
    return { hasAccess: true };
  }

  // Manager can access their team's files
  if (userRole === 'manager') {
    const teamResult = await db.query(
      'SELECT id FROM users WHERE manager_id = $1 OR id = $1',
      [userId]
    );
    const teamIds = teamResult.rows.map(r => r.id);
    if (teamIds.includes(client.owner_id)) {
      return { hasAccess: true };
    }
  }

  return { hasAccess: false, reason: 'Access denied' };
}

// ============================================================================
// ROUTES
// ============================================================================

// POST /uploads/:clientId - Upload file for client
router.post("/:clientId", upload.single('file'), async (req, res) => {
  try {
    const userId = req.user.id;
    const userRole = req.user.role || 'agent';
    const clientId = req.params.clientId;
    const label = req.body.label || 'Document';

    // Check access
    const access = await checkClientAccess(userId, userRole, clientId);
    if (!access.hasAccess) {
      // Delete uploaded file if access denied
      if (req.file) {
        fs.unlinkSync(req.file.path);
      }
      return res.status(403).json({ ok: false, error: access.reason || 'Access denied' });
    }

    if (!req.file) {
      return res.status(400).json({ ok: false, error: 'No file uploaded' });
    }

    // Store file metadata in database
    const result = await db.query(
      `INSERT INTO uploads (
        client_id, uploaded_by, label, filename, original_name, mime_type, size_bytes, storage_path
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *`,
      [
        clientId,
        userId,
        label,
        req.file.filename,
        req.file.originalname,
        req.file.mimetype,
        req.file.size,
        req.file.path
      ]
    );

    const upload = result.rows[0];

    // HIPAA Audit Log
    await logFileAccess(userId, clientId, upload.id, 'FILE_UPLOAD', {
      filename: req.file.originalname,
      size: req.file.size,
      mimetype: req.file.mimetype,
      ip: req.ip
    });

    return res.json({
      ok: true,
      data: {
        id: upload.id,
        label: upload.label,
        filename: upload.filename,
        originalName: upload.original_name,
        mimeType: upload.mime_type,
        size: upload.size_bytes,
        createdAt: upload.created_at
      }
    });

  } catch (error) {
    console.error('Upload error:', error);

    // Clean up file if database insert failed
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }

    return res.status(500).json({ ok: false, error: "File upload failed" });
  }
});

// GET /uploads/:clientId - List all files for a client
router.get("/:clientId", async (req, res) => {
  try {
    const userId = req.user.id;
    const userRole = req.user.role || 'agent';
    const clientId = req.params.clientId;

    // Check access
    const access = await checkClientAccess(userId, userRole, clientId);
    if (!access.hasAccess) {
      return res.status(403).json({ ok: false, error: access.reason || 'Access denied' });
    }

    // Get all uploads for this client
    const result = await db.query(
      `SELECT
        u.id, u.label, u.filename, u.original_name, u.mime_type, u.size_bytes, u.created_at,
        users.name as uploaded_by_name, users.email as uploaded_by_email
       FROM uploads u
       LEFT JOIN users ON u.uploaded_by = users.id
       WHERE u.client_id = $1
       ORDER BY u.created_at DESC`,
      [clientId]
    );

    const uploads = result.rows.map(row => ({
      id: row.id,
      label: row.label,
      filename: row.filename,
      originalName: row.original_name,
      mimeType: row.mime_type,
      size: row.size_bytes,
      uploadedBy: {
        name: row.uploaded_by_name,
        email: row.uploaded_by_email
      },
      createdAt: row.created_at
    }));

    // HIPAA Audit Log
    await logFileAccess(userId, clientId, null, 'FILE_LIST', {
      count: uploads.length,
      ip: req.ip
    });

    return res.json({ ok: true, data: uploads });

  } catch (error) {
    console.error('List uploads error:', error);
    return res.status(500).json({ ok: false, error: "Failed to list uploads" });
  }
});

// GET /uploads/download/:uploadId - Download a file
router.get("/download/:uploadId", async (req, res) => {
  try {
    const userId = req.user.id;
    const userRole = req.user.role || 'agent';
    const uploadId = req.params.uploadId;

    // Get upload info
    const uploadResult = await db.query(
      'SELECT * FROM uploads WHERE id = $1',
      [uploadId]
    );

    if (uploadResult.rows.length === 0) {
      return res.status(404).json({ ok: false, error: 'File not found' });
    }

    const upload = uploadResult.rows[0];

    // Check access to client
    const access = await checkClientAccess(userId, userRole, upload.client_id);
    if (!access.hasAccess) {
      return res.status(403).json({ ok: false, error: access.reason || 'Access denied' });
    }

    // Check if file exists
    if (!fs.existsSync(upload.storage_path)) {
      return res.status(404).json({ ok: false, error: 'File not found on disk' });
    }

    // HIPAA Audit Log
    await logFileAccess(userId, upload.client_id, uploadId, 'FILE_DOWNLOAD', {
      filename: upload.original_name,
      ip: req.ip
    });

    // Send file
    res.setHeader('Content-Disposition', `attachment; filename="${upload.original_name}"`);
    res.setHeader('Content-Type', upload.mime_type);
    res.sendFile(upload.storage_path);

  } catch (error) {
    console.error('Download error:', error);
    return res.status(500).json({ ok: false, error: "File download failed" });
  }
});

// DELETE /uploads/:clientId/:uploadId - Delete a file
router.delete("/:clientId/:uploadId", async (req, res) => {
  try {
    const userId = req.user.id;
    const userRole = req.user.role || 'agent';
    const clientId = req.params.clientId;
    const uploadId = req.params.uploadId;

    // Check access
    const access = await checkClientAccess(userId, userRole, clientId);
    if (!access.hasAccess) {
      return res.status(403).json({ ok: false, error: access.reason || 'Access denied' });
    }

    // Get upload info
    const uploadResult = await db.query(
      'SELECT * FROM uploads WHERE id = $1 AND client_id = $2',
      [uploadId, clientId]
    );

    if (uploadResult.rows.length === 0) {
      return res.status(404).json({ ok: false, error: 'File not found' });
    }

    const upload = uploadResult.rows[0];

    // Only the uploader, their manager, or admin/fmo can delete
    if (userRole === 'agent' && upload.uploaded_by !== userId) {
      return res.status(403).json({ ok: false, error: 'Only the uploader can delete this file' });
    }

    // Delete file from disk
    if (fs.existsSync(upload.storage_path)) {
      fs.unlinkSync(upload.storage_path);
    }

    // Delete from database
    await db.query('DELETE FROM uploads WHERE id = $1', [uploadId]);

    // HIPAA Audit Log
    await logFileAccess(userId, clientId, uploadId, 'FILE_DELETE', {
      filename: upload.original_name,
      ip: req.ip
    });

    return res.json({ ok: true });

  } catch (error) {
    console.error('Delete upload error:', error);
    return res.status(500).json({ ok: false, error: "File deletion failed" });
  }
});

module.exports = router;
