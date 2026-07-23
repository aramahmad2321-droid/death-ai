/**
 * Zana AI — User Model
 */

'use strict';

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Name is required'],
    trim: true,
    minlength: [2, 'Name must be at least 2 characters'],
    maxlength: [50, 'Name cannot exceed 50 characters'],
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,})+$/, 'Invalid email format'],
  },
  password: {
    type: String,
    minlength: [8, 'Password must be at least 8 characters'],
    select: false,
  },
  googleId: { type: String, sparse: true },
  avatar: { type: String, default: null },
  role: {
    type: String,
    enum: ['user', 'admin'],
    default: 'user',
  },

  // Preferences
  language: {
    type: String,
    enum: ['en', 'ku', 'ar'],
    default: 'en',
  },
  theme: {
    type: String,
    enum: ['dark', 'light', 'system'],
    default: 'dark',
  },
  fontSize: {
    type: String,
    enum: ['small', 'medium', 'large'],
    default: 'medium',
  },
  aiSpeed: {
    type: String,
    enum: ['fast', 'balanced', 'thorough'],
    default: 'balanced',
  },

  // Account status
  verified: { type: Boolean, default: false },
  isActive: { type: Boolean, default: true },
  lastActive: { type: Date, default: Date.now },

  // Tokens
  verificationToken: { type: String, select: false },
  verificationTokenExpiry: { type: Date, select: false },
  resetPasswordToken: { type: String, select: false },
  resetPasswordExpiry: { type: Date, select: false },
  refreshToken: { type: String, select: false },

  // Usage stats
  totalMessages: { type: Number, default: 0 },
  totalTokens: { type: Number, default: 0 },
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
});

// ─── Indexes (email + googleId already indexed via unique/sparse in schema) ─
userSchema.index({ role: 1 });
userSchema.index({ createdAt: -1 });

// ─── Pre-save: Hash password ──────────────────────────────────────────────────
userSchema.pre('save', async function (next) {
  if (!this.isModified('password') || !this.password) return next();
  try {
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// ─── Methods ──────────────────────────────────────────────────────────────────
userSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

userSchema.methods.generateVerificationToken = function () {
  const token = crypto.randomBytes(32).toString('hex');
  this.verificationToken = crypto.createHash('sha256').update(token).digest('hex');
  this.verificationTokenExpiry = Date.now() + 24 * 60 * 60 * 1000; // 24h
  return token;
};

userSchema.methods.generatePasswordResetToken = function () {
  const token = crypto.randomBytes(32).toString('hex');
  this.resetPasswordToken = crypto.createHash('sha256').update(token).digest('hex');
  this.resetPasswordExpiry = Date.now() + 60 * 60 * 1000; // 1h
  return token;
};

userSchema.methods.toSafeObject = function () {
  const obj = this.toObject();
  delete obj.password;
  delete obj.verificationToken;
  delete obj.verificationTokenExpiry;
  delete obj.resetPasswordToken;
  delete obj.resetPasswordExpiry;
  delete obj.refreshToken;
  return obj;
};

// ─── Virtual: avatar URL with fallback ───────────────────────────────────────
userSchema.virtual('avatarUrl').get(function () {
  if (this.avatar) return this.avatar;
  const initial = encodeURIComponent(this.name?.charAt(0) || 'Z');
  return `https://ui-avatars.com/api/?name=${initial}&background=7c3aed&color=fff&bold=true`;
});

module.exports = mongoose.model('User', userSchema);
