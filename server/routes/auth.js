/**
 * Zana AI — Auth Routes
 */

'use strict';

const express = require('express');
const router = express.Router();
const passport = require('../config/passport');
const { protect } = require('../middleware/auth');
const { authRateLimiter, passwordResetLimiter } = require('../middleware/rateLimiter');
const authController = require('../controllers/authController');

// Register, Login & Demo
router.post('/register', authRateLimiter, authController.register);
router.post('/login', authRateLimiter, authController.login);
router.post('/demo', authController.demoLogin);
router.post('/logout', authController.logout);

// Email verification
router.get('/verify/:token', authController.verifyEmail);
router.post('/resend-verification', authRateLimiter, authController.resendVerification);

// Password reset
router.post('/forgot-password', passwordResetLimiter, authController.forgotPassword);
router.post('/reset-password/:token', passwordResetLimiter, authController.resetPassword);

// Token management
router.post('/refresh', authController.refreshToken);

// Current user (protected)
router.get('/me', protect, authController.getMe);

// Google OAuth
router.get('/google', passport.authenticate('google', { scope: ['profile', 'email'], session: false }));
router.get('/google/callback',
  passport.authenticate('google', { session: false, failureRedirect: '/auth.html?error=google_failed' }),
  authController.googleCallback
);

module.exports = router;
