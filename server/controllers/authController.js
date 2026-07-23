/**
 * Zana AI — Auth Controller
 */

'use strict';

const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { sendVerificationEmail, sendPasswordResetEmail, sendWelcomeEmail } = require('../services/emailService');

// ─── JWT Helpers ──────────────────────────────────────────────────────────────
const signAccessToken = (userId) => jwt.sign(
  { id: userId },
  process.env.JWT_SECRET || 'death-ai-default-jwt-secret-key-2025',
  { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
);

const signRefreshToken = (userId) => jwt.sign(
  { id: userId },
  process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET || 'death-ai-default-jwt-secret-key-2025',
  { expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '30d' }
);

const setCookies = (res, accessToken, refreshToken) => {
  const isProduction = process.env.NODE_ENV === 'production';
  const cookieOptions = {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? 'strict' : 'lax',
  };
  res.cookie('accessToken', accessToken, { ...cookieOptions, maxAge: 7 * 24 * 60 * 60 * 1000 });
  res.cookie('refreshToken', refreshToken, { ...cookieOptions, maxAge: 30 * 24 * 60 * 60 * 1000 });
};

const sendAuthResponse = (res, user, statusCode = 200, warning = undefined) => {
  const accessToken = signAccessToken(user._id);
  const refreshToken = signRefreshToken(user._id);
  setCookies(res, accessToken, refreshToken);

  const payload = {
    success: true,
    accessToken,
    user: user.toSafeObject(),
  };
  if (warning) payload.warning = warning;

  return res.status(statusCode).json(payload);
};

// ─── Register ─────────────────────────────────────────────────────────────────
exports.register = async (req, res, next) => {
  try {
    const { name, email, password, language } = req.body;

    // Check if email already exists
    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing) {
      return res.status(409).json({ success: false, error: 'An account with this email already exists.' });
    }

    // Default to verified so users can use the app immediately without email setup
    const user = new User({ 
      name: name.trim(), 
      email: email.toLowerCase(), 
      password,
      language: language || 'en',
      verified: true 
    });
    await user.save();

    // Send welcome email (non-blocking)
    sendWelcomeEmail(user.email, user.name).catch(console.error);

    return sendAuthResponse(res, user, 201);
  } catch (error) {
    next(error);
  }
};

// ─── Demo / Guest Instant Login ───────────────────────────────────────────────
exports.demoLogin = async (req, res, next) => {
  try {
    let demoUser = await User.findOne({ email: 'demo@zana-ai.com' });
    if (!demoUser) {
      demoUser = new User({
        name: 'Demo User',
        email: 'demo@zana-ai.com',
        password: 'DemoUserPassword123!',
        verified: true,
        role: 'user',
      });
      await demoUser.save();
    }
    demoUser.lastActive = new Date();
    await demoUser.save();
    return sendAuthResponse(res, demoUser, 200);
  } catch (error) {
    next(error);
  }
};

// ─── Login ────────────────────────────────────────────────────────────────────
exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email: email.toLowerCase() }).select('+password');
    if (!user || !user.password) {
      return res.status(401).json({ success: false, error: 'Invalid email or password.' });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ success: false, error: 'Invalid email or password.' });
    }

    if (!user.isActive) {
      return res.status(403).json({ success: false, error: 'Your account has been deactivated.' });
    }

    // Warn if not verified but allow login
    // Update last active
    user.lastActive = new Date();
    await user.save();

    const warning = !user.verified ? 'Email not verified. Some features may be limited.' : undefined;
    return sendAuthResponse(res, user, 200, warning);
  } catch (error) {
    next(error);
  }
};

// ─── Logout ───────────────────────────────────────────────────────────────────
exports.logout = (req, res) => {
  res.clearCookie('accessToken');
  res.clearCookie('refreshToken');
  return res.json({ success: true, message: 'Logged out successfully.' });
};

// ─── Verify Email ─────────────────────────────────────────────────────────────
exports.verifyEmail = async (req, res, next) => {
  try {
    const { token } = req.params;
    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

    const user = await User.findOne({
      verificationToken: hashedToken,
      verificationTokenExpiry: { $gt: Date.now() },
    }).select('+verificationToken +verificationTokenExpiry');

    if (!user) {
      return res.status(400).json({ success: false, error: 'Invalid or expired verification link.' });
    }

    user.verified = true;
    user.verificationToken = undefined;
    user.verificationTokenExpiry = undefined;
    await user.save();

    sendWelcomeEmail(user.email, user.name).catch(console.error);

    return res.json({ success: true, message: 'Email verified successfully! You can now log in.' });
  } catch (error) {
    next(error);
  }
};

// ─── Resend Verification ──────────────────────────────────────────────────────
exports.resendVerification = async (req, res, next) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email: email.toLowerCase() }).select('+verificationToken +verificationTokenExpiry');

    if (!user) return res.json({ success: true, message: 'If this email exists, a verification link has been sent.' });
    if (user.verified) return res.json({ success: true, message: 'This email is already verified.' });

    const token = user.generateVerificationToken();
    await user.save();
    sendVerificationEmail(user.email, user.name, token).catch(console.error);

    return res.json({ success: true, message: 'Verification email sent! Please check your inbox.' });
  } catch (error) {
    next(error);
  }
};

// ─── Forgot Password ──────────────────────────────────────────────────────────
exports.forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email: email.toLowerCase() }).select('+resetPasswordToken +resetPasswordExpiry');

    // Always return success to prevent email enumeration
    if (!user) {
      return res.json({ success: true, message: 'If this email is registered, you will receive a reset link.' });
    }

    const token = user.generatePasswordResetToken();
    await user.save();
    sendPasswordResetEmail(user.email, user.name, token).catch(console.error);

    return res.json({ success: true, message: 'Password reset email sent. Please check your inbox.' });
  } catch (error) {
    next(error);
  }
};

// ─── Reset Password ───────────────────────────────────────────────────────────
exports.resetPassword = async (req, res, next) => {
  try {
    const { token } = req.params;
    const { password } = req.body;
    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

    const user = await User.findOne({
      resetPasswordToken: hashedToken,
      resetPasswordExpiry: { $gt: Date.now() },
    }).select('+resetPasswordToken +resetPasswordExpiry +password');

    if (!user) {
      return res.status(400).json({ success: false, error: 'Invalid or expired reset link.' });
    }

    user.password = password;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpiry = undefined;
    await user.save();

    return res.json({ success: true, message: 'Password reset successfully. You can now log in.' });
  } catch (error) {
    next(error);
  }
};

// ─── Get Current User ─────────────────────────────────────────────────────────
exports.getMe = async (req, res) => {
  return res.json({ success: true, user: req.user.toSafeObject() });
};

// ─── Refresh Token ────────────────────────────────────────────────────────────
exports.refreshToken = async (req, res, next) => {
  try {
    const token = req.cookies?.refreshToken || req.body?.refreshToken;
    if (!token) return res.status(401).json({ success: false, error: 'No refresh token provided.' });

    const decoded = jwt.verify(token, process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET);
    const user = await User.findById(decoded.id);
    if (!user || !user.isActive) return res.status(401).json({ success: false, error: 'Invalid token.' });

    const newAccessToken = signAccessToken(user._id);
    res.cookie('accessToken', newAccessToken, { httpOnly: true, maxAge: 7 * 24 * 60 * 60 * 1000 });

    return res.json({ success: true, accessToken: newAccessToken });
  } catch (error) {
    return res.status(401).json({ success: false, error: 'Invalid or expired refresh token.' });
  }
};

// ─── Google OAuth callback handler ────────────────────────────────────────────
exports.googleCallback = async (req, res) => {
  try {
    if (!req.user) return res.redirect('/auth.html?error=google_failed');
    const accessToken = signAccessToken(req.user._id);
    const refreshToken = signRefreshToken(req.user._id);
    setCookies(res, accessToken, refreshToken);
    return res.redirect(`/chat.html?token=${accessToken}`);
  } catch {
    return res.redirect('/auth.html?error=google_failed');
  }
};
