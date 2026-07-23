/**
 * Zana AI — Authentication Middleware
 */

'use strict';

const jwt = require('jsonwebtoken');
const User = require('../models/User');

/**
 * Verify JWT and attach user to request.
 * Checks Authorization header Bearer token OR cookie.
 */
const protect = async (req, res, next) => {
  try {
    let token = null;

    // 1. Check Authorization header
    if (req.headers.authorization?.startsWith('Bearer ')) {
      token = req.headers.authorization.split(' ')[1];
    }
    // 2. Fall back to cookie
    else if (req.cookies?.accessToken) {
      token = req.cookies.accessToken;
    }

    if (!token) {
      return res.status(401).json({ success: false, error: 'Not authenticated. Please log in.' });
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'death-ai-default-jwt-secret-key-2025');

    // Fetch fresh user data
    const user = await User.findById(decoded.id).select('-password -verificationToken -resetPasswordToken');
    if (!user) {
      return res.status(401).json({ success: false, error: 'User no longer exists.' });
    }

    if (!user.isActive) {
      return res.status(401).json({ success: false, error: 'Account has been deactivated.' });
    }

    // Update last active (non-blocking)
    User.findByIdAndUpdate(user._id, { lastActive: new Date() }).exec();

    req.user = user;
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ success: false, error: 'Session expired. Please log in again.', code: 'TOKEN_EXPIRED' });
    }
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ success: false, error: 'Invalid token.', code: 'INVALID_TOKEN' });
    }
    next(error);
  }
};

/**
 * Restrict access to specific roles.
 * Usage: restrictTo('admin')
 */
const restrictTo = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user?.role)) {
      return res.status(403).json({
        success: false,
        error: 'You do not have permission to perform this action.',
      });
    }
    next();
  };
};

/**
 * Optional auth — attaches user if token present but doesn't block.
 */
const optionalAuth = async (req, res, next) => {
  try {
    let token = null;
    if (req.headers.authorization?.startsWith('Bearer ')) {
      token = req.headers.authorization.split(' ')[1];
    } else if (req.cookies?.accessToken) {
      token = req.cookies.accessToken;
    }

    if (token) {
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'death-ai-default-jwt-secret-key-2025');
      const user = await User.findById(decoded.id).select('-password');
      if (user && user.isActive) req.user = user;
    }
  } catch (_) {
    // Silently fail for optional auth
  }
  next();
};

module.exports = { protect, restrictTo, optionalAuth };
