import express from 'express';
import { claimCode, submitFeedback, getPoints, claimReward, updateProfile } from '../controllers/studentController.js';
import { protect } from '../middleware/authMiddleware.js';
import { getRewards } from '../controllers/rewardController.js';
import { createBorrowedItem, getBorrowedItems } from '../controllers/borrowedItemController.js';

const router = express.Router();

// Route for claiming a generated code
router.post('/claim-code', protect, claimCode);

// Route for submitting feedback
router.post('/submit-feedback', protect, submitFeedback);

// Route for getting points
router.get('/points', protect, getPoints);

// Route for creating borrowed items
router.post('/borrow-items', protect, createBorrowedItem);

// Route for getting student's borrowed items
router.get('/borrowed-items', protect, getBorrowedItems);

// Route for claiming a reward with points
router.post('/claim-reward/:id', protect, claimReward);

// Route for updating profile
router.put('/profile', protect, updateProfile);

router.get('/rewards', protect, getRewards);

export default router;
