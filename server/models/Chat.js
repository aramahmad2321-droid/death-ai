/**
 * Zana AI — Chat & Message Models
 */

'use strict';

const mongoose = require('mongoose');

// ─── Message Sub-document Schema ──────────────────────────────────────────────
const messageSchema = new mongoose.Schema({
  role: {
    type: String,
    enum: ['user', 'assistant', 'system'],
    required: true,
  },
  content: {
    type: String,
    required: true,
    maxlength: [32000, 'Message too long'],
  },
  tokens: { type: Number, default: 0 },
  model: { type: String, default: null },
  isEdited: { type: Boolean, default: false },
  attachments: [{
    type: { type: String, enum: ['image', 'pdf', 'docx', 'text'] },
    filename: String,
    url: String,
    size: Number,
  }],
}, {
  timestamps: true,
  _id: true,
});

// ─── Chat Schema ──────────────────────────────────────────────────────────────
const chatSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  title: {
    type: String,
    trim: true,
    maxlength: [200, 'Title too long'],
    default: 'New Conversation',
  },
  messages: [messageSchema],

  // Organization
  pinned: { type: Boolean, default: false },
  favorite: { type: Boolean, default: false },
  tags: [{ type: String, trim: true, maxlength: 30 }],

  // Stats
  tokenCount: { type: Number, default: 0 },
  messageCount: { type: Number, default: 0 },
  model: { type: String, default: 'gpt-4o-mini' },

  // Auto-generated title flag
  titleGenerated: { type: Boolean, default: false },

  // Soft delete
  deleted: { type: Boolean, default: false },
  deletedAt: { type: Date, default: null },
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
});

// ─── Indexes ──────────────────────────────────────────────────────────────────
chatSchema.index({ userId: 1, updatedAt: -1 });
chatSchema.index({ userId: 1, pinned: 1 });
chatSchema.index({ userId: 1, favorite: 1 });
chatSchema.index({ userId: 1, deleted: 1 });
chatSchema.index({ 'messages.content': 'text', title: 'text' }); // Full-text search

// ─── Virtual: last message ────────────────────────────────────────────────────
chatSchema.virtual('lastMessage').get(function () {
  if (!this.messages || this.messages.length === 0) return null;
  return this.messages[this.messages.length - 1];
});

// ─── Pre-save: update message count ──────────────────────────────────────────
chatSchema.pre('save', function (next) {
  this.messageCount = this.messages.length;
  next();
});

// ─── Static: get user chats with pagination ───────────────────────────────────
chatSchema.statics.getUserChats = async function (userId, { page = 1, limit = 20, search = '' } = {}) {
  const query = { userId, deleted: false };
  if (search) {
    query.$text = { $search: search };
  }

  const total = await this.countDocuments(query);
  const chats = await this.find(query)
    .select('title pinned favorite messageCount tokenCount model updatedAt createdAt')
    .sort({ pinned: -1, updatedAt: -1 })
    .skip((page - 1) * limit)
    .limit(limit)
    .lean();

  return { chats, total, page, totalPages: Math.ceil(total / limit) };
};

module.exports = mongoose.model('Chat', chatSchema);
