import express from 'express';
import { protect, admin } from '../middleware/authMiddleware.js';
import { getStats, createReward, getUsers, getClaimedRewards, updateUserRole } from '../controllers/adminController.js';

const router = express.Router();

router.get('/stats', protect, admin, getStats);
router.post('/reward', protect, admin, createReward);
router.get('/users', protect, admin, getUsers);
router.get('/claimed-rewards', protect, admin, getClaimedRewards);
router.put('/users/:userId/role', protect, admin, updateUserRole);

export default router;
