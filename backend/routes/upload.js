import express from 'express';
import multer from 'multer';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

// Note the explicit '.js' extension here for local files in ESM
import upload from '../middleware/upload.js'; 
import FileSanitizer from '../utils/sanitizer.js';
import { verifyToken } from '../auth/middleware.js'; 

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const router = express.Router();

/**
 * POST /api/v1/submissions/submit
 * Securely accepts code binary / zip, validates it, and prepares it for Sandbox orchestration
 */
router.post('/submit', verifyToken, upload.single('submission_file'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: 'No file uploaded.' });
    }

    const tempPath = req.file.path;
    let safeName;

    try {
      // Apply strict Sanitizer
      safeName = FileSanitizer.sanitizeFilename(req.file.originalname);
    } catch (sanitizationError) {
      // Clean up local temp file instantly if sanitization fails
      if (fs.existsSync(tempPath)) {
        fs.unlinkSync(tempPath);
      }
      return res.status(400).json({ success: false, error: sanitizationError.message });
    }

    const finalPath = path.join(__dirname, '..', 'uploads', safeName);

    // Rename file to its sanitized format
    fs.renameSync(tempPath, finalPath);

    return res.status(201).json({
      success: true,
      message: 'Binary successfully submitted & validated for sandboxing.',
      payload: {
        filename: safeName,
        teamId: req.user?.uid || 'anonymous', // from verified auth middleware
        submittedAt: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Upload route error:', error);
    return res.status(500).json({ success: false, error: 'Internal system storage error.' });
  }
});

// Graceful error handling middleware for Multer limits
router.use((err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    return res.status(400).json({ success: false, error: `Upload error: ${err.message}` });
  } else if (err) {
    return res.status(400).json({ success: false, error: err.message });
  }
  next();
});

export default router;