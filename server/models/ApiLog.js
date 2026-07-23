/**
 * Zana AI — API Log Model
 * Tracks AI API usage for admin analytics
 */

'use strict';

const mongoose = require('mongoose');

const apiLogSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null,
    index: true,
  },
  endpoint: {
    type: String,
    required: true,
    trim: true,
  },
  method: {
    type: String,
    enum: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
    default: 'POST',
  },
  model: { type: String, default: null },
  promptTokens: { type: Number, default: 0 },
  completionTokens: { type: Number, default: 0 },
  totalTokens: { type: Number, default: 0 },
  latencyMs: { type: Number, default: 0 },
  status: {
    type: String,
    enum: ['success', 'error', 'timeout', 'rate_limited'],
    default: 'success',
  },
  errorMessage: { type: String, default: null },
  ip: { type: String, default: null },
}, {
  timestamps: true,
});

// ─── Indexes ──────────────────────────────────────────────────────────────────
apiLogSchema.index({ createdAt: -1 });
apiLogSchema.index({ status: 1 });
apiLogSchema.index({ userId: 1, createdAt: -1 });

// ─── Auto-expire logs after 90 days ──────────────────────────────────────────
apiLogSchema.index({ createdAt: 1 }, { expireAfterSeconds: 90 * 24 * 60 * 60 });

// ─── Statics for analytics ────────────────────────────────────────────────────
apiLogSchema.statics.getDailyStats = async function (days = 30) {
  const since = new Date();
  since.setDate(since.getDate() - days);

  return this.aggregate([
    { $match: { createdAt: { $gte: since } } },
    {
      $group: {
        _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
        requests: { $sum: 1 },
        tokens: { $sum: '$totalTokens' },
        errors: { $sum: { $cond: [{ $eq: ['$status', 'error'] }, 1, 0] } },
        avgLatency: { $avg: '$latencyMs' },
      }
    },
    { $sort: { _id: 1 } },
  ]);
};

module.exports = mongoose.model('ApiLog', apiLogSchema);
