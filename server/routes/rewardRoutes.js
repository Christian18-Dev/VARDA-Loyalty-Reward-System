import express from 'express';
import { getRewards } from '../controllers/rewardController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();
router.get('/', protect, getRewards);

export default router;
