/**
 * Zana AI — Chat Controller
 */

'use strict';

const Chat = require('../models/Chat');
const User = require('../models/User');
const { generateChatTitle } = require('../services/aiService');
const { exportAsTxt, exportAsPdf } = require('../services/exportService');

// In-memory fallback store for when MongoDB is offline
const memoryChats = new Map();

// ─── List user chats ──────────────────────────────────────────────────────────
exports.getChats = async (req, res, next) => {
  try {
    const userId = String(req.user._id);
    const { page = 1, limit = 20, search = '', filter = 'all' } = req.query;

    try {
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
    } catch (_) {
      // In-memory fallback
      const userChats = Array.from(memoryChats.values())
        .filter(c => c.userId === userId && !c.deleted)
        .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));

      return res.json({
        success: true,
        chats: userChats,
        pagination: { total: userChats.length, page: 1, totalPages: 1 },
      });
    }
  } catch (error) {
    next(error);
  }
};

// ─── Get single chat ──────────────────────────────────────────────────────────
exports.getChat = async (req, res, next) => {
  try {
    const userId = String(req.user._id);
    try {
      const chat = await Chat.findOne({ _id: req.params.id, userId: req.user._id, deleted: false });
      if (chat) return res.json({ success: true, chat });
    } catch (_) {}

    // In-memory fallback
    const memChat = memoryChats.get(req.params.id);
    if (memChat && memChat.userId === userId && !memChat.deleted) {
      return res.json({ success: true, chat: memChat });
    }

    // Default mock chat if requested
    const newMemChat = {
      _id: req.params.id,
      userId,
      title: 'New Conversation',
      messages: [],
      pinned: false,
      favorite: false,
      messageCount: 0,
      tokenCount: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    memoryChats.set(req.params.id, newMemChat);
    return res.json({ success: true, chat: newMemChat });
  } catch (error) {
    next(error);
  }
};

// ─── Create new chat ──────────────────────────────────────────────────────────
exports.createChat = async (req, res, next) => {
  try {
    const userId = String(req.user._id);
    try {
      const chat = await Chat.create({ userId: req.user._id, messages: [] });
      return res.status(201).json({ success: true, chat });
    } catch (_) {
      // In-memory fallback
      const id = 'chat-' + Date.now() + '-' + Math.random().toString(36).substr(2, 6);
      const newChat = {
        _id: id,
        userId,
        title: 'New Conversation',
        messages: [],
        pinned: false,
        favorite: false,
        messageCount: 0,
        tokenCount: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      memoryChats.set(id, newChat);
      return res.status(201).json({ success: true, chat: newChat });
    }
  } catch (error) {
    next(error);
  }
};

// ─── Add message to chat & get AI response ─────────────────────────────────
exports.addMessage = async (req, res, next) => {
  try {
    const userId = String(req.user._id);
    const { content, role = 'user' } = req.body;

    try {
      const chat = await Chat.findOne({ _id: req.params.id, userId: req.user._id, deleted: false });
      if (chat) {
        chat.messages.push({ role, content });
        if (!chat.titleGenerated && role === 'user' && chat.messages.length === 1) {
          generateChatTitle(content).then(async (title) => {
            chat.title = title;
            chat.titleGenerated = true;
            await chat.save();
          }).catch(console.error);
        }
        await chat.save();
        User.findByIdAndUpdate(req.user._id, { $inc: { totalMessages: 1 } }).exec();
        return res.json({ success: true, message: chat.messages[chat.messages.length - 1] });
      }
    } catch (_) {}

    // In-memory fallback
    let memChat = memoryChats.get(req.params.id);
    if (!memChat) {
      memChat = {
        _id: req.params.id,
        userId,
        title: content.slice(0, 30) || 'New Conversation',
        messages: [],
        pinned: false,
        favorite: false,
        messageCount: 0,
        tokenCount: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      memoryChats.set(req.params.id, memChat);
    }
    const msg = { role, content, createdAt: new Date() };
    memChat.messages.push(msg);
    memChat.messageCount = memChat.messages.length;
    memChat.updatedAt = new Date();
    return res.json({ success: true, message: msg });
  } catch (error) {
    next(error);
  }
};

// ─── Update message (edit) ───────────────────────────────────────────────────
exports.updateMessage = async (req, res, next) => {
  try {
    const { messageId } = req.params;
    const { content } = req.body;
    try {
      const chat = await Chat.findOne({ _id: req.params.id, userId: req.user._id, deleted: false });
      if (chat) {
        const message = chat.messages.id(messageId);
        if (message && message.role === 'user') {
          const msgIndex = chat.messages.indexOf(message);
          chat.messages.splice(msgIndex + 1);
          message.content = content.trim();
          message.isEdited = true;
          await chat.save();
          return res.json({ success: true, message, chat });
        }
      }
    } catch (_) {}

    // In-memory fallback
    const memChat = memoryChats.get(req.params.id);
    if (memChat) {
      memChat.messages = memChat.messages.filter(m => m.role === 'user');
      const lastMsg = memChat.messages[memChat.messages.length - 1];
      if (lastMsg) lastMsg.content = content.trim();
      return res.json({ success: true, message: lastMsg, chat: memChat });
    }
    return res.status(404).json({ success: false, error: 'Chat not found.' });
  } catch (error) {
    next(error);
  }
};

// ─── Save AI message ──────────────────────────────────────────────────────────
exports.saveAiMessage = async (req, res, next) => {
  try {
    const { content, tokens, model } = req.body;
    try {
      const chat = await Chat.findOne({ _id: req.params.id, userId: req.user._id, deleted: false });
      if (chat) {
        chat.messages.push({ role: 'assistant', content, tokens: tokens?.total || 0, model });
        chat.tokenCount += tokens?.total || 0;
        await chat.save();
        User.findByIdAndUpdate(req.user._id, { $inc: { totalTokens: tokens?.total || 0 } }).exec();
        return res.json({ success: true, message: chat.messages[chat.messages.length - 1] });
      }
    } catch (_) {}

    // In-memory fallback
    let memChat = memoryChats.get(req.params.id);
    if (!memChat) {
      memChat = {
        _id: req.params.id,
        userId: String(req.user._id),
        title: 'Conversation',
        messages: [],
        pinned: false,
        favorite: false,
        messageCount: 0,
        tokenCount: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      memoryChats.set(req.params.id, memChat);
    }
    const msg = { role: 'assistant', content, model, tokens: tokens?.total || 0, createdAt: new Date() };
    memChat.messages.push(msg);
    memChat.messageCount = memChat.messages.length;
    memChat.tokenCount += tokens?.total || 0;
    memChat.updatedAt = new Date();
    return res.json({ success: true, message: msg });
  } catch (error) {
    next(error);
  }
};

// ─── Update chat metadata ─────────────────────────────────────────────────────
exports.updateChat = async (req, res, next) => {
  try {
    const { title, pinned, favorite, tags } = req.body;
    try {
      const chat = await Chat.findOne({ _id: req.params.id, userId: req.user._id, deleted: false });
      if (chat) {
        if (title !== undefined) chat.title = title.trim();
        if (pinned !== undefined) chat.pinned = pinned;
        if (favorite !== undefined) chat.favorite = favorite;
        if (tags !== undefined) chat.tags = tags;
        await chat.save();
        return res.json({ success: true, chat });
      }
    } catch (_) {}

    // In-memory fallback
    const memChat = memoryChats.get(req.params.id);
    if (memChat) {
      if (title !== undefined) memChat.title = title.trim();
      if (pinned !== undefined) memChat.pinned = pinned;
      if (favorite !== undefined) memChat.favorite = favorite;
      return res.json({ success: true, chat: memChat });
    }
    return res.status(404).json({ success: false, error: 'Chat not found.' });
  } catch (error) {
    next(error);
  }
};

// ─── Delete chat ─────────────────────────────────────────────────────────────
exports.deleteChat = async (req, res, next) => {
  try {
    try {
      const chat = await Chat.findOne({ _id: req.params.id, userId: req.user._id });
      if (chat) {
        chat.deleted = true;
        chat.deletedAt = new Date();
        await chat.save();
        return res.json({ success: true, message: 'Conversation deleted.' });
      }
    } catch (_) {}

    const memChat = memoryChats.get(req.params.id);
    if (memChat) {
      memChat.deleted = true;
    }
    return res.json({ success: true, message: 'Conversation deleted.' });
  } catch (error) {
    next(error);
  }
};

// ─── Export chat ──────────────────────────────────────────────────────────────
exports.exportChat = async (req, res, next) => {
  try {
    const { format = 'txt' } = req.query;
    let chat = null;
    try {
      chat = await Chat.findOne({ _id: req.params.id, userId: req.user._id, deleted: false });
    } catch (_) {}

    if (!chat) {
      chat = memoryChats.get(req.params.id);
    }
    if (!chat) return res.status(404).json({ success: false, error: 'Chat not found.' });

    if (format === 'pdf') {
      exportAsPdf(chat, res);
    } else {
      const txt = exportAsTxt(chat);
      res.setHeader('Content-Type', 'text/plain; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="death-chat-${chat._id}.txt"`);
      res.send(txt);
    }
  } catch (error) {
    next(error);
  }
};
