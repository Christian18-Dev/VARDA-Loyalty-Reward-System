import express from 'express';
import { claimCode, submitFeedback, getPoints, claimReward, updateProfile } from '../controllers/studentController.js';
import { protect, borrowAccess } from '../middleware/authMiddleware.js';
import { getRewards } from '../controllers/rewardController.js';
import { createBorrowedItem, getBorrowedItems, processReturnQR } from '../controllers/borrowedItemController.js';
import { recordPointsUsage, getPointsUsageHistory, getPointsUsageStats } from '../controllers/pointsUsageController.js';
import { submitFeedback as feedbackSubmit } from '../controllers/feedbackController.js';

const router = express.Router();

// Protect all routes with authentication
router.use(protect);

// Route for claiming a generated code
router.post('/claim-code', protect, claimCode);

// Route for submitting feedback
router.post('/submit-feedback', protect, submitFeedback);

// Route for getting points
router.get('/points', protect, getPoints);

// Route for creating borrowed items
router.post('/borrow-items', borrowAccess, createBorrowedItem);

// Route for getting student's borrowed items
router.get('/borrowed-items', protect, getBorrowedItems);

// Route for claiming a reward with points
router.post('/claim-reward/:id', protect, claimReward);

// Route for updating profile
router.put('/profile', protect, updateProfile);

router.get('/rewards', protect, getRewards);

// Routes for points usage tracking
router.post('/points-usage', protect, recordPointsUsage);
router.get('/points-usage/history', protect, getPointsUsageHistory);
router.get('/points-usage/stats', protect, getPointsUsageStats);

// Add return items route with borrowAccess middleware
router.post('/return-items', borrowAccess, processReturnQR);

// Add feedback route
router.post('/feedback', protect, feedbackSubmit);

export default router;
