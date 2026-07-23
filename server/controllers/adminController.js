/**
 * Zana AI — Admin Controller
 */

'use strict';

const User = require('../models/User');
const Chat = require('../models/Chat');
const ApiLog = require('../models/ApiLog');

// ─── Dashboard Stats ──────────────────────────────────────────────────────────
exports.getStats = async (req, res, next) => {
  try {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const [
      totalUsers, activeUsers, newUsersToday, newUsersMonth,
      totalChats, totalMessages,
      apiCallsToday, totalTokensToday,
      errorLogs,
    ] = await Promise.all([
      User.countDocuments({ isActive: true }),
      User.countDocuments({ lastActive: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }, isActive: true }),
      User.countDocuments({ createdAt: { $gte: today } }),
      User.countDocuments({ createdAt: { $gte: thisMonth } }),
      Chat.countDocuments({ deleted: false }),
      Chat.aggregate([{ $group: { _id: null, total: { $sum: '$messageCount' } } }]),
      ApiLog.countDocuments({ createdAt: { $gte: today } }),
      ApiLog.aggregate([{ $match: { createdAt: { $gte: today } } }, { $group: { _id: null, tokens: { $sum: '$totalTokens' } } }]),
      ApiLog.countDocuments({ status: 'error', createdAt: { $gte: thisMonth } }),
    ]);

    const dailyStats = await ApiLog.getDailyStats(30);

    return res.json({
      success: true,
      stats: {
        users: { total: totalUsers, active: activeUsers, newToday: newUsersToday, newThisMonth: newUsersMonth },
        chats: { total: totalChats, totalMessages: totalMessages[0]?.total || 0 },
        api: { callsToday: apiCallsToday, tokensToday: totalTokensToday[0]?.tokens || 0, errorsThisMonth: errorLogs },
        daily: dailyStats,
      },
    });
  } catch (error) {
    next(error);
  }
};

// ─── List users ───────────────────────────────────────────────────────────────
exports.getUsers = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, search = '', role } = req.query;
    const query = {};
    if (search) query.$or = [{ name: { $regex: search, $options: 'i' } }, { email: { $regex: search, $options: 'i' } }];
    if (role) query.role = role;

    const total = await User.countDocuments(query);
    const users = await User.find(query)
      .select('-password -verificationToken -resetPasswordToken -refreshToken')
      .sort({ createdAt: -1 })
      .skip((parseInt(page) - 1) * parseInt(limit))
      .limit(parseInt(limit))
      .lean();

    return res.json({
      success: true,
      users,
      pagination: { total, page: parseInt(page), totalPages: Math.ceil(total / parseInt(limit)) },
    });
  } catch (error) {
    next(error);
  }
};

// ─── Update user (admin) ──────────────────────────────────────────────────────
exports.updateUser = async (req, res, next) => {
  try {
    const { role, isActive } = req.body;
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ success: false, error: 'User not found.' });

    if (role && ['user', 'admin'].includes(role)) user.role = role;
    if (isActive !== undefined) user.isActive = isActive;
    await user.save();

    return res.json({ success: true, user: user.toSafeObject() });
  } catch (error) {
    next(error);
  }
};

// ─── Delete user (admin) ──────────────────────────────────────────────────────
exports.deleteUser = async (req, res, next) => {
  try {
    if (req.params.id === req.user._id.toString()) {
      return res.status(400).json({ success: false, error: 'You cannot delete your own account via admin panel.' });
    }
    await User.findByIdAndUpdate(req.params.id, { isActive: false });
    return res.json({ success: true, message: 'User deactivated.' });
  } catch (error) {
    next(error);
  }
};

// ─── API Logs ─────────────────────────────────────────────────────────────────
exports.getApiLogs = async (req, res, next) => {
  try {
    const { page = 1, limit = 50, status } = req.query;
    const query = status ? { status } : {};

    const total = await ApiLog.countDocuments(query);
    const logs = await ApiLog.find(query)
      .populate('userId', 'name email')
      .sort({ createdAt: -1 })
      .skip((parseInt(page) - 1) * parseInt(limit))
      .limit(parseInt(limit))
      .lean();

    return res.json({
      success: true,
      logs,
      pagination: { total, page: parseInt(page), totalPages: Math.ceil(total / parseInt(limit)) },
    });
  } catch (error) {
    next(error);
  }
};
