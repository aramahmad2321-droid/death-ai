/**
 * Zana AI — Chat Controller
 */

'use strict';

const Chat = require('../models/Chat');
const User = require('../models/User');
const { generateChatTitle } = require('../services/aiService');
const { exportAsTxt, exportAsPdf } = require('../services/exportService');

// ─── List user chats ──────────────────────────────────────────────────────────
exports.getChats = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, search = '', filter = 'all' } = req.query;
    const query = { userId: req.user._id, deleted: false };

    if (search) query.$text = { $search: search };
    if (filter === 'pinned') query.pinned = true;
    if (filter === 'favorites') query.favorite = true;

    const total = await Chat.countDocuments(query);
    const chats = await Chat.find(query)
      .select('title pinned favorite messageCount tokenCount model updatedAt createdAt')
      .sort({ pinned: -1, updatedAt: -1 })
      .skip((parseInt(page) - 1) * parseInt(limit))
      .limit(parseInt(limit))
      .lean();

    return res.json({
      success: true,
      chats,
      pagination: { total, page: parseInt(page), totalPages: Math.ceil(total / parseInt(limit)) },
    });
  } catch (error) {
    next(error);
  }
};

// ─── Get single chat ──────────────────────────────────────────────────────────
exports.getChat = async (req, res, next) => {
  try {
    const chat = await Chat.findOne({ _id: req.params.id, userId: req.user._id, deleted: false });
    if (!chat) return res.status(404).json({ success: false, error: 'Chat not found.' });

    return res.json({ success: true, chat });
  } catch (error) {
    next(error);
  }
};

// ─── Create new chat ──────────────────────────────────────────────────────────
exports.createChat = async (req, res, next) => {
  try {
    const chat = await Chat.create({ userId: req.user._id, messages: [] });
    return res.status(201).json({ success: true, chat });
  } catch (error) {
    next(error);
  }
};

// ─── Add message to chat & get AI response ─────────────────────────────────
exports.addMessage = async (req, res, next) => {
  try {
    const { content, role = 'user' } = req.body;
    const chat = await Chat.findOne({ _id: req.params.id, userId: req.user._id, deleted: false });
    if (!chat) return res.status(404).json({ success: false, error: 'Chat not found.' });

    chat.messages.push({ role, content });

    // Auto-generate title from first user message
    if (!chat.titleGenerated && role === 'user' && chat.messages.length === 1) {
      generateChatTitle(content).then(async (title) => {
        chat.title = title;
        chat.titleGenerated = true;
        await chat.save();
      }).catch(console.error);
    }

    await chat.save();

    // Update user stats
    User.findByIdAndUpdate(req.user._id, { $inc: { totalMessages: 1 } }).exec();

    return res.json({ success: true, message: chat.messages[chat.messages.length - 1] });
  } catch (error) {
    next(error);
  }
};

// ─── Update message (edit) ───────────────────────────────────────────────────
exports.updateMessage = async (req, res, next) => {
  try {
    const { messageId } = req.params;
    const { content } = req.body;

    const chat = await Chat.findOne({ _id: req.params.id, userId: req.user._id, deleted: false });
    if (!chat) return res.status(404).json({ success: false, error: 'Chat not found.' });

    const message = chat.messages.id(messageId);
    if (!message) return res.status(404).json({ success: false, error: 'Message not found.' });
    if (message.role !== 'user') return res.status(400).json({ success: false, error: 'Only user messages can be edited.' });

    // Remove all messages after this one (user edited, need fresh AI response)
    const msgIndex = chat.messages.indexOf(message);
    chat.messages.splice(msgIndex + 1);
    message.content = content.trim();
    message.isEdited = true;

    await chat.save();
    return res.json({ success: true, message, chat });
  } catch (error) {
    next(error);
  }
};

// ─── Save AI message ──────────────────────────────────────────────────────────
exports.saveAiMessage = async (req, res, next) => {
  try {
    const { content, tokens, model } = req.body;
    const chat = await Chat.findOne({ _id: req.params.id, userId: req.user._id, deleted: false });
    if (!chat) return res.status(404).json({ success: false, error: 'Chat not found.' });

    chat.messages.push({ role: 'assistant', content, tokens: tokens?.total || 0, model });
    chat.tokenCount += tokens?.total || 0;
    await chat.save();

    // Update user stats
    User.findByIdAndUpdate(req.user._id, { $inc: { totalTokens: tokens?.total || 0 } }).exec();

    return res.json({ success: true, message: chat.messages[chat.messages.length - 1] });
  } catch (error) {
    next(error);
  }
};

// ─── Update chat metadata ─────────────────────────────────────────────────────
exports.updateChat = async (req, res, next) => {
  try {
    const { title, pinned, favorite, tags } = req.body;
    const chat = await Chat.findOne({ _id: req.params.id, userId: req.user._id, deleted: false });
    if (!chat) return res.status(404).json({ success: false, error: 'Chat not found.' });

    if (title !== undefined) chat.title = title.trim();
    if (pinned !== undefined) chat.pinned = pinned;
    if (favorite !== undefined) chat.favorite = favorite;
    if (tags !== undefined) chat.tags = tags;

    await chat.save();
    return res.json({ success: true, chat });
  } catch (error) {
    next(error);
  }
};

// ─── Delete chat (soft delete) ────────────────────────────────────────────────
exports.deleteChat = async (req, res, next) => {
  try {
    const chat = await Chat.findOne({ _id: req.params.id, userId: req.user._id });
    if (!chat) return res.status(404).json({ success: false, error: 'Chat not found.' });

    chat.deleted = true;
    chat.deletedAt = new Date();
    await chat.save();

    return res.json({ success: true, message: 'Conversation deleted.' });
  } catch (error) {
    next(error);
  }
};

// ─── Export chat ──────────────────────────────────────────────────────────────
exports.exportChat = async (req, res, next) => {
  try {
    const { format = 'txt' } = req.query;
    const chat = await Chat.findOne({ _id: req.params.id, userId: req.user._id, deleted: false });
    if (!chat) return res.status(404).json({ success: false, error: 'Chat not found.' });

    if (format === 'pdf') {
      exportAsPdf(chat, res);
    } else {
      const txt = exportAsTxt(chat);
      res.setHeader('Content-Type', 'text/plain; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="zana-chat-${chat._id}.txt"`);
      res.send(txt);
    }
  } catch (error) {
    next(error);
  }
};
