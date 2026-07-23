/**
 * Zana AI — Admin Routes
 */

'use strict';

const express = require('express');
const router = express.Router();
const { protect, restrictTo } = require('../middleware/auth');
const adminController = require('../controllers/adminController');

// All admin routes require auth + admin role
router.use(protect, restrictTo('admin'));

router.get('/stats', adminController.getStats);
router.get('/users', adminController.getUsers);
router.put('/users/:id', adminController.updateUser);
router.delete('/users/:id', adminController.deleteUser);
router.get('/logs', adminController.getApiLogs);

module.exports = router;
