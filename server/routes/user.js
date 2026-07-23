/**
 * Zana AI — User Routes
 */

'use strict';

const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const userController = require('../controllers/userController');

router.use(protect);

router.get('/profile', userController.getProfile);
router.put('/profile', userController.updateProfile);
router.put('/settings', userController.updateSettings);
router.put('/change-password', userController.changePassword);
router.delete('/account', userController.deleteAccount);

module.exports = router;
