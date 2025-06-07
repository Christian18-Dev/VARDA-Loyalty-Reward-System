import express from 'express';
import { 
  getBorrowedItems, 
  returnBorrowedItem,
  getBorrowedItemHistory,
  getReturnedItemHistory,
  processReturnQR
} from '../controllers/borrowedItemController.js';
import { exportBorrowedItems, exportReturnedItems } from '../controllers/exportController.js';
import { protect, conciergeOnly } from '../middleware/authMiddleware.js';

const router = express.Router();

// Protect all routes with both authentication and concierge role check
router.use(protect, conciergeOnly);

// Get borrowed items
router.get('/borrowed-items', getBorrowedItems);

// Process returns
router.post('/return-item', processReturnQR);
router.post('/manual-return', processReturnQR);

// Get history
router.get('/borrowed-history', getBorrowedItemHistory);
router.get('/returned-history', getReturnedItemHistory);

// Export routes
router.get('/export/borrowed-items', exportBorrowedItems);
router.get('/export/returned-items', exportReturnedItems);

export default router; 