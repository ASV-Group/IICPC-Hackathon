import express from 'express';
import multer from 'multer';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

import upload from '../middleware/upload.js'; 
import FileSanitizer from '../utils/sanitizer.js';
import { verifyToken } from '../auth/middleware.js'; 
import DockerSandboxManager from '../services/sandbox.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const router = express.Router();

/**
 * POST /api/v1/submissions/submit
 * Accepts compiled binary, sanitizes it, and spawns container with dynamic port mapping.
 */
router.post('/submit', verifyToken, upload.single('submission_file'), async (req, res) => {
  let tempPath;
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: 'No binary file uploaded.' });
    }

    tempPath = req.file.path;
    let safeName;

    try {
      // 1. Sanitize file name
      safeName = FileSanitizer.sanitizeFilename(req.file.originalname);
    } catch (sanitizationError) {
      if (fs.existsSync(tempPath)) {
        fs.unlinkSync(tempPath);
      }
      return res.status(400).json({ success: false, error: sanitizationError.message });
    }

    const finalPath = path.join(__dirname, '..', 'uploads', safeName);

    // 2. Save binary permanently inside uploads folder
    fs.renameSync(tempPath, finalPath);

    const teamId = req.user?.uid || 'anonymous';
    const submissionId = Date.now().toString(); 

    // 3. TRIGGER DOCKER SANDBOX (Non-blocking background run)
    DockerSandboxManager.runContainer(teamId, submissionId, finalPath)
      .then(async (sandboxResult) => {
        console.log(`[SYSTEM] Testing started on sandbox: ${sandboxResult.containerName}`);
        console.log(`[SYSTEM] Live Endpoint active at: http://localhost:${sandboxResult.mappedPort}`);
        
        // TODO: Is endpoint par bot fleet requests fire karega metrics capture karne ke liye.
        
        // Auto-cleanup after evaluation (currently set to 20 seconds for basic tests)
        setTimeout(async () => {
          await DockerSandboxManager.stopAndCleanup(sandboxResult.containerName);
        }, 20000); 
      })
      .catch((sandboxError) => {
        console.error(`[CRITICAL ERROR] Failed to run binary inside sandbox:`, sandboxError.message);
      });

    // Fast, responsive JSON payload sent to user
    return res.status(201).json({
      success: true,
      message: 'Binary successfully submitted, verified and spawned in a secure Sandbox.',
      payload: {
        filename: safeName,
        teamId: teamId,
        submittedAt: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Upload & Spawning route error:', error);
    if (tempPath && fs.existsSync(tempPath)) {
      fs.unlinkSync(tempPath);
    }
    return res.status(500).json({ success: false, error: 'Internal sandbox processing error.' });
  }
});

// Multer error handling middleware
router.use((err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    return res.status(400).json({ success: false, error: `Upload error: ${err.message}` });
  } else if (err) {
    return res.status(400).json({ success: false, error: err.message });
  }
  next();
});

export default router;