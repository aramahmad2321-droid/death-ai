/**
 * Zana AI — Security Headers Middleware
 */

'use strict';

/**
 * Additional security headers beyond Helmet defaults.
 */
const securityHeaders = (req, res, next) => {
  // Remove fingerprinting headers
  res.removeHeader('X-Powered-By');

  // Prevent MIME-type sniffing
  res.setHeader('X-Content-Type-Options', 'nosniff');

  // Referrer policy
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');

  // Permissions policy
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(self), geolocation=()');

  next();
};

module.exports = securityHeaders;
