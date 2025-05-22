import express from 'express';
import { generateCode, getClaimedRewards } from '../controllers/cashierController.js';
import { getBorrowedItems, createBorrowedItem, returnBorrowedItem } from '../controllers/borrowedItemController.js';
import { protect, cashierOnly } from '../middleware/authMiddleware.js';

const router = express.Router();

// Protect all routes with both authentication and cashier role check
router.use(protect, cashierOnly);

router.post('/generate-code', generateCode);
router.get('/claimed-rewards', getClaimedRewards);
router.get('/borrowed-items', getBorrowedItems);
router.post('/scan-item', createBorrowedItem);
router.put('/return-item/:id', returnBorrowedItem);

export default router;
