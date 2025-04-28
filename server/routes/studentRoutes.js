import express from 'express';
import { claimCode, submitFeedback, getPoints, claimReward } from '../controllers/studentController.js';
import { protect } from '../middleware/authMiddleware.js';
import { getRewards } from '../controllers/rewardController.js';

const router = express.Router();

// Route for claiming a generated code
router.post('/claim-code', protect, claimCode);

// Route for submitting feedback
router.post('/submit-feedback', protect, submitFeedback);

// Route for getting points
router.get('/points', protect, getPoints);

// Route for claiming a reward with points
router.post('/claim-reward/:id', protect, claimReward);

router.get('/rewards', protect, getRewards);

export default router;
