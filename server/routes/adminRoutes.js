import express from 'express';
import { protect } from '../middleware/authMiddleware.js';
import { authorizeRoles } from '../middleware/roleMiddleware.js';
import { getStats, createReward, getUsers, getClaimedRewards, } from '../controllers/adminController.js';



const router = express.Router();

router.get('/stats', protect, getStats);
router.post('/reward', protect, createReward);
router.get('/users', protect, getUsers);
router.get('/claimed-rewards', protect, getClaimedRewards);

router.get('/stats', protect, authorizeRoles('admin'), (req, res) => {
  res.json({ message: 'Welcome, Admin!' });
});

export default router;
