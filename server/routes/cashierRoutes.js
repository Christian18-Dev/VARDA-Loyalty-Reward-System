import express from 'express';
import { generateCode, getClaimedRewards, getPointsUsageHistory } from '../controllers/cashierController.js';
import { 
  getBorrowedItems, 
  createBorrowedItem, 
  returnBorrowedItem,
  getBorrowedItemHistory,
  getReturnedItemHistory
} from '../controllers/borrowedItemController.js';
import { protect, cashierOnly } from '../middleware/authMiddleware.js';

const router = express.Router();

// Protect all routes with both authentication and cashier role check
router.use(protect, cashierOnly);

router.post('/generate-code', generateCode);
router.get('/claimed-rewards', getClaimedRewards);
router.get('/borrowed-items', getBorrowedItems);
router.post('/scan-item', protect, createBorrowedItem);
router.put('/return-item/:id', returnBorrowedItem);

// New history routes
router.get('/borrowed-history', getBorrowedItemHistory);
router.get('/returned-history', getReturnedItemHistory);

// Points usage routes
router.get('/points-usage', getPointsUsageHistory);

export default router;
