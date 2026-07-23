/**
 * Zana AI — Passport.js Configuration
 * JWT + Google OAuth2 strategies
 */

'use strict';

const passport = require('passport');
const { Strategy: JwtStrategy, ExtractJwt } = require('passport-jwt');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const User = require('../models/User');

// ─── JWT Strategy ─────────────────────────────────────────────────────────────
const jwtOptions = {
  jwtFromRequest: ExtractJwt.fromExtractors([
    // 1. Try Authorization header Bearer token
    ExtractJwt.fromAuthHeaderAsBearerToken(),
    // 2. Try cookie
    (req) => req?.cookies?.accessToken || null,
  ]),
  secretOrKey: process.env.JWT_SECRET,
};

passport.use('jwt', new JwtStrategy(jwtOptions, async (payload, done) => {
  try {
    const user = await User.findById(payload.id).select('-password');
    if (!user) return done(null, false);
    if (!user.isActive) return done(null, false, { message: 'Account deactivated' });
    return done(null, user);
  } catch (error) {
    return done(error, false);
  }
}));

// ─── Google OAuth2 Strategy ───────────────────────────────────────────────────
if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  passport.use('google', new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: `${process.env.CLIENT_URL || 'http://localhost:3000'}/api/auth/google/callback`,
    scope: ['profile', 'email'],
  }, async (accessToken, refreshToken, profile, done) => {
    try {
      const email = profile.emails?.[0]?.value;
      if (!email) return done(null, false, { message: 'No email from Google' });

      // Check if user exists by googleId or email
      let user = await User.findOne({
        $or: [{ googleId: profile.id }, { email }]
      });

      if (user) {
        // Link Google account if not already linked
        if (!user.googleId) {
          user.googleId = profile.id;
          user.verified = true;
          await user.save();
        }
        user.lastActive = new Date();
        await user.save();
        return done(null, user);
      }

      // Create new user from Google profile
      user = await User.create({
        name: profile.displayName,
        email,
        googleId: profile.id,
        avatar: profile.photos?.[0]?.value,
        verified: true,
        isActive: true,
      });

      return done(null, user);
    } catch (error) {
      return done(error, false);
    }
  }));
}

module.exports = passport;
