/**
 * Zana AI — User Controller
 */

'use strict';

const User = require('../models/User');
const Chat = require('../models/Chat');

// ─── Get profile ──────────────────────────────────────────────────────────────
exports.getProfile = async (req, res) => {
  const chatCount = await Chat.countDocuments({ userId: req.user._id, deleted: false });
  return res.json({ success: true, user: req.user.toSafeObject(), stats: { chatCount } });
};

// ─── Update profile ───────────────────────────────────────────────────────────
exports.updateProfile = async (req, res, next) => {
  try {
    const { name, avatar } = req.body;
    const user = await User.findById(req.user._id);

    if (name) user.name = name.trim();
    if (avatar !== undefined) user.avatar = avatar;

    await user.save();
    return res.json({ success: true, user: user.toSafeObject() });
  } catch (error) {
    next(error);
  }
};

// ─── Update settings ──────────────────────────────────────────────────────────
exports.updateSettings = async (req, res, next) => {
  try {
    const { language, theme, fontSize, aiSpeed } = req.body;
    const user = await User.findById(req.user._id);

    if (language && ['en', 'ku', 'ar'].includes(language)) user.language = language;
    if (theme && ['dark', 'light', 'system'].includes(theme)) user.theme = theme;
    if (fontSize && ['small', 'medium', 'large'].includes(fontSize)) user.fontSize = fontSize;
    if (aiSpeed && ['fast', 'balanced', 'thorough'].includes(aiSpeed)) user.aiSpeed = aiSpeed;

    await user.save();
    return res.json({ success: true, user: user.toSafeObject() });
  } catch (error) {
    next(error);
  }
};

// ─── Change password ──────────────────────────────────────────────────────────
exports.changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const user = await User.findById(req.user._id).select('+password');

    if (!user.password) {
      return res.status(400).json({ success: false, error: 'This account uses Google login and has no password.' });
    }

    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) return res.status(401).json({ success: false, error: 'Current password is incorrect.' });

    user.password = newPassword;
    await user.save();
    return res.json({ success: true, message: 'Password updated successfully.' });
  } catch (error) {
    next(error);
  }
};

// ─── Delete account ───────────────────────────────────────────────────────────
exports.deleteAccount = async (req, res, next) => {
  try {
    const { password } = req.body;
    const user = await User.findById(req.user._id).select('+password');

    // Verify identity before deletion
    if (user.password) {
      const isMatch = await user.comparePassword(password);
      if (!isMatch) return res.status(401).json({ success: false, error: 'Password is incorrect.' });
    }

    // Soft-delete all chats
    await Chat.updateMany({ userId: user._id }, { deleted: true, deletedAt: new Date() });

    // Deactivate user
    user.isActive = false;
    user.email = `deleted_${Date.now()}_${user.email}`; // Free up email
    await user.save();

    res.clearCookie('accessToken');
    res.clearCookie('refreshToken');
    return res.json({ success: true, message: 'Account deleted successfully.' });
  } catch (error) {
    next(error);
  }
};
