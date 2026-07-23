/**
 * Zana AI — Chat Routes
 */

'use strict';

const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const chatController = require('../controllers/chatController');

// All chat routes require authentication
router.use(protect);

router.get('/', chatController.getChats);
router.post('/', chatController.createChat);

router.get('/:id', chatController.getChat);
router.put('/:id', chatController.updateChat);
router.delete('/:id', chatController.deleteChat);

// Messages
router.post('/:id/messages', chatController.addMessage);
router.put('/:id/messages/:messageId', chatController.updateMessage);
router.post('/:id/ai-message', chatController.saveAiMessage);

// Export
router.get('/:id/export', chatController.exportChat);

module.exports = router;
