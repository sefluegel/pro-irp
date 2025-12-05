// backend/services/s3-storage.js - AWS S3 Storage Service for HIPAA-compliant file uploads
// Handles file uploads to S3 with server-side encryption

const { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const crypto = require('crypto');
const path = require('path');

// Determine if we should use S3 or local storage
const USE_S3 = process.env.USE_S3_STORAGE === 'true';

// S3 Configuration (only initialize if using S3)
let s3Client = null;
const S3_BUCKET = process.env.AWS_S3_BUCKET;
const S3_REGION = process.env.AWS_REGION || 'us-east-1';

if (USE_S3) {
  s3Client = new S3Client({
    region: S3_REGION,
    credentials: process.env.AWS_ACCESS_KEY_ID ? {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
    } : undefined // Use IAM role if no explicit credentials
  });
  console.log('[s3-storage] S3 storage enabled, bucket:', S3_BUCKET);
} else {
  console.log('[s3-storage] Using local file storage (S3 disabled)');
}

/**
 * Generate a secure unique filename
 */
function generateSecureFilename(originalName) {
  const uniqueSuffix = crypto.randomBytes(16).toString('hex');
  const ext = path.extname(originalName);
  const timestamp = Date.now();
  return `${timestamp}-${uniqueSuffix}${ext}`;
}

/**
 * Generate S3 key (path within bucket)
 * Organizes files by client for easy access control
 */
function generateS3Key(clientId, filename) {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  return `clients/${clientId}/${year}/${month}/${filename}`;
}

/**
 * Upload file to S3
 * @param {Object} options
 * @param {Buffer|Stream} options.body - File content
 * @param {string} options.originalName - Original filename
 * @param {string} options.mimeType - File MIME type
 * @param {string} options.clientId - Client ID for organizing files
 * @returns {Object} Upload result with key and URL
 */
async function uploadToS3({ body, originalName, mimeType, clientId }) {
  if (!USE_S3) {
    throw new Error('S3 storage is not enabled. Set USE_S3_STORAGE=true');
  }

  const filename = generateSecureFilename(originalName);
  const key = generateS3Key(clientId, filename);

  const command = new PutObjectCommand({
    Bucket: S3_BUCKET,
    Key: key,
    Body: body,
    ContentType: mimeType,
    // HIPAA: Server-side encryption
    ServerSideEncryption: 'AES256',
    // Metadata for audit trail
    Metadata: {
      'original-name': originalName,
      'uploaded-at': new Date().toISOString()
    }
  });

  await s3Client.send(command);

  return {
    key,
    filename,
    bucket: S3_BUCKET,
    region: S3_REGION,
    url: `https://${S3_BUCKET}.s3.${S3_REGION}.amazonaws.com/${key}`
  };
}

/**
 * Get a presigned URL for secure file download
 * URL expires after specified duration (default 15 minutes)
 */
async function getPresignedDownloadUrl(key, expiresInSeconds = 900) {
  if (!USE_S3) {
    throw new Error('S3 storage is not enabled');
  }

  const command = new GetObjectCommand({
    Bucket: S3_BUCKET,
    Key: key
  });

  const url = await getSignedUrl(s3Client, command, { expiresIn: expiresInSeconds });
  return url;
}

/**
 * Delete file from S3
 */
async function deleteFromS3(key) {
  if (!USE_S3) {
    throw new Error('S3 storage is not enabled');
  }

  const command = new DeleteObjectCommand({
    Bucket: S3_BUCKET,
    Key: key
  });

  await s3Client.send(command);
  return { ok: true };
}

/**
 * Check if S3 is properly configured
 */
function isS3Configured() {
  return USE_S3 && S3_BUCKET && s3Client !== null;
}

/**
 * Get storage type being used
 */
function getStorageType() {
  return USE_S3 ? 's3' : 'local';
}

module.exports = {
  USE_S3,
  isS3Configured,
  getStorageType,
  generateSecureFilename,
  generateS3Key,
  uploadToS3,
  getPresignedDownloadUrl,
  deleteFromS3
};
