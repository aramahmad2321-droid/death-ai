/**
 * Zana AI — AI Controller (Streaming)
 */

'use strict';

const { v4: uuidv4 } = require('uuid');
const { streamResponse, stopGeneration } = require('../services/aiService');
const Chat = require('../models/Chat');

// ─── Generate AI response (SSE stream) ───────────────────────────────────────
exports.generate = async (req, res, next) => {
  try {
    const { chatId, messages, language } = req.body;
    const requestId = uuidv4();

    // Validate messages array
    if (!Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ success: false, error: 'Messages array is required.' });
    }

    // Sanitize messages — only pass role and content
    const sanitized = messages.map((m) => ({
      role: m.role === 'assistant' ? 'assistant' : 'user',
      content: String(m.content).slice(0, 16000),
    }));

    await streamResponse({
      messages: sanitized,
      model: req.user?.aiModel || process.env.OPENAI_MODEL,
      language: language || req.user?.language || 'en',
      userId: req.user?._id,
      requestId,
      res,
    });
  } catch (error) {
    if (!res.headersSent) next(error);
  }
};

// ─── Stop active generation ───────────────────────────────────────────────────
exports.stop = (req, res) => {
  const { requestId } = req.body;
  if (!requestId) return res.status(400).json({ success: false, error: 'requestId required.' });

  const stopped = stopGeneration(requestId);
  return res.json({ success: true, stopped });
};

// ─── Upload file for analysis ─────────────────────────────────────────────────
exports.upload = async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, error: 'No file uploaded.' });

    // For now, return file metadata. Full analysis can be done in the chat.
    return res.json({
      success: true,
      file: {
        filename: req.file.originalname,
        mimetype: req.file.mimetype,
        size: req.file.size,
        content: req.file.buffer?.toString('utf-8')?.slice(0, 5000) || null,
      },
    });
  } catch (error) {
    next(error);
  }
};
