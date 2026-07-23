/**
 * Zana AI — AI Routes
 */

'use strict';

const express = require('express');
const multer = require('multer');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { aiRateLimiter } = require('../middleware/rateLimiter');
const aiController = require('../controllers/aiController');

// File upload config (memory storage, max 10MB)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = ['text/plain', 'application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (allowed.includes(file.mimetype)) cb(null, true);
    else cb(new Error('File type not supported'), false);
  },
});

router.post('/generate', protect, aiRateLimiter, aiController.generate);
router.post('/stop', protect, aiController.stop);
router.post('/upload', protect, upload.single('file'), aiController.upload);

module.exports = router;
