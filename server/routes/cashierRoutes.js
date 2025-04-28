import express from 'express';
import { generateCode, getClaimedRewards } from '../controllers/cashierController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.post('/generate-code', protect, generateCode);
router.get('/claimed-rewards', protect, getClaimedRewards);

export default router;
