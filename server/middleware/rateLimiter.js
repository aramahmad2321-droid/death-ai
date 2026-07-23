/**
 * Zana AI — Rate Limiters
 */

'use strict';

const rateLimit = require('express-rate-limit');

// ─── Message helper ───────────────────────────────────────────────────────────
const createLimitMessage = (windowMin, max) => ({
  success: false,
  error: `Too many requests. You can make ${max} requests per ${windowMin} minutes. Please try again later.`,
  code: 'RATE_LIMITED',
});

// ─── Global API rate limiter ─────────────────────────────────────────────────
const globalRateLimiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: createLimitMessage(15, 200),
  skip: (req) => req.path === '/api/health',
});

// ─── Auth routes rate limiter (stricter) ─────────────────────────────────────
const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 min
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: createLimitMessage(15, 20),
  skipSuccessfulRequests: false,
});

// ─── AI generation rate limiter ──────────────────────────────────────────────
const aiRateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: parseInt(process.env.AI_RATE_LIMIT_MAX) || 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: createLimitMessage(1, 30),
});

// ─── Password reset rate limiter (very strict) ────────────────────────────────
const passwordResetLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: createLimitMessage(60, 5),
});

module.exports = {
  globalRateLimiter,
  authRateLimiter,
  aiRateLimiter,
  passwordResetLimiter,
};
