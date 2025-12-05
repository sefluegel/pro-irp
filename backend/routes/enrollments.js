// backend/routes/enrollments.js - PDF enrollment form parsing endpoint
const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const crypto = require("crypto");
const { parseEnrollmentPdf } = require("../services/pdfEnrollmentParser");

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
// FILE STORAGE CONFIGURATION
// ============================================================================

// Temp uploads directory for parsing (files are deleted after parsing)
const TEMP_DIR = path.join(__dirname, "..", "uploads", "temp");
if (!fs.existsSync(TEMP_DIR)) {
  fs.mkdirSync(TEMP_DIR, { recursive: true, mode: 0o700 });
}

// Configure multer for temporary PDF uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, TEMP_DIR);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = crypto.randomBytes(16).toString('hex');
    cb(null, `enrollment-${Date.now()}-${uniqueSuffix}.pdf`);
  }
});

// Only allow PDF files
const fileFilter = (req, file, cb) => {
  if (file.mimetype === 'application/pdf') {
    cb(null, true);
  } else {
    cb(new Error('Only PDF files are allowed for enrollment parsing'), false);
  }
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 15 * 1024 * 1024, // 15MB max for enrollment PDFs
    files: 1
  }
});

// ============================================================================
// ROUTES
// ============================================================================

/**
 * POST /enrollments/parse
 * Upload and parse an enrollment PDF, returning extracted client data
 * The file is deleted after parsing - this is just for data extraction
 */
router.post("/parse", upload.single('file'), async (req, res) => {
  let filePath = null;

  try {
    if (!req.file) {
      return res.status(400).json({ ok: false, error: 'No PDF file uploaded' });
    }

    filePath = req.file.path;

    // Parse the PDF
    const extractedData = await parseEnrollmentPdf(filePath);

    // Clean up the temp file
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    // Return extracted data
    return res.json({
      ok: true,
      data: extractedData,
      message: 'PDF parsed successfully. Review the extracted data before saving.'
    });

  } catch (error) {
    console.error('PDF parse error:', error);

    // Clean up temp file on error
    if (filePath && fs.existsSync(filePath)) {
      try {
        fs.unlinkSync(filePath);
      } catch (e) {
        console.error('Failed to clean up temp file:', e);
      }
    }

    // Handle specific errors
    if (error.message && error.message.includes('not a PDF')) {
      return res.status(400).json({ ok: false, error: 'Invalid PDF file' });
    }

    return res.status(500).json({
      ok: false,
      error: "Failed to parse enrollment PDF. Please ensure it's a valid enrollment form."
    });
  }
});

module.exports = router;
