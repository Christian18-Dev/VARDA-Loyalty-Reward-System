import express from 'express';
import { getRewards, deleteReward } from '../controllers/rewardController.js';
import { protect, admin } from '../middleware/authMiddleware.js';

const router = express.Router();
router.get('/', protect, getRewards);
router.delete('/:id', protect, admin, deleteReward);

export default router;
