import express from 'express';
import { protect } from '../middleware/authMiddleware.js';
import {
  createNotification,
  getUserNotifications,
  markNotificationAsRead
} from '../controllers/notificationController.js';

const router = express.Router();

// Create notification (admin only)
router.post('/', protect, createNotification);

// Get user's notifications
router.get('/user', protect, getUserNotifications);

// Mark notification as read
router.put('/:id/read', protect, markNotificationAsRead);

export default router; 