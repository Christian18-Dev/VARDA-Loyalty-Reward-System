import express from 'express';
import { generateCode, getClaimedRewards } from '../controllers/cashierController.js';
import { getBorrowedItems } from '../controllers/borrowedItemController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.post('/generate-code', protect, generateCode);
router.get('/claimed-rewards', protect, getClaimedRewards);
router.get('/borrowed-items', protect, getBorrowedItems);

export default router;
