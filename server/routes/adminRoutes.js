import express from 'express';
import { protect, admin } from '../middleware/authMiddleware.js';
import { getStats, createReward, getUsers, getClaimedRewards, updateUserRole, updateUserPassword, getAllPointsUsage } from '../controllers/adminController.js';
import { getBorrowedItems, getBorrowedItemHistory, getReturnedItemHistory, deleteReturnedItem } from '../controllers/borrowedItemController.js';
import { exportBorrowedItems, exportReturnedItems } from '../controllers/exportController.js';
import { getFeedbackStats } from '../controllers/feedbackController.js';

const router = express.Router();

router.get('/stats', protect, admin, getStats);
router.post('/reward', protect, admin, createReward);
router.get('/users', protect, admin, getUsers);
router.get('/claimed-rewards', protect, admin, getClaimedRewards);
router.put('/users/:userId/role', protect, admin, updateUserRole);
router.put('/users/:userId/password', protect, admin, updateUserPassword);

// Borrowed items routes
router.get('/borrowed-items', protect, admin, getBorrowedItems);
router.get('/borrowed-history', protect, admin, getBorrowedItemHistory);
router.get('/returned-history', protect, admin, getReturnedItemHistory);
router.delete('/returned-history/:id', protect, admin, deleteReturnedItem);

// Export routes
router.get('/export/borrowed-items', protect, admin, exportBorrowedItems);
router.get('/export/returned-items', protect, admin, exportReturnedItems);

// Points usage route
router.get('/points-usage', protect, admin, getAllPointsUsage);

// Get feedback statistics
router.get('/feedback-stats', protect, admin, getFeedbackStats);

export default router;
