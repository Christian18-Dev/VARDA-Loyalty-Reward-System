import express from 'express';
import { 
  getBorrowedItems, 
  createBorrowedItem, 
  returnBorrowedItem,
  getBorrowedItemHistory,
  getReturnedItemHistory,
  processReturnQR
} from '../controllers/borrowedItemController.js';
import { protect, conciergeOnly } from '../middleware/authMiddleware.js';
import { generateCode } from '../controllers/cashierController.js';
import { exportBorrowedItems, exportReturnedItems } from '../controllers/exportController.js';

const router = express.Router();

// Protect all routes with both authentication and concierge role check
router.use(protect, conciergeOnly);

// Borrowed items routes
router.get('/borrowed-items', getBorrowedItems);
router.post('/borrow-item', createBorrowedItem);
router.put('/return-item/:id', returnBorrowedItem);

// History routes
router.get('/borrowed-history', getBorrowedItemHistory);
router.get('/returned-history', getReturnedItemHistory);

// Scanner routes
router.post('/scan', createBorrowedItem);

// Reports routes
router.get('/export/borrowed-items', exportBorrowedItems);
router.get('/export/returned-items', exportReturnedItems);

// Add return QR code processing route
router.post('/return-item', processReturnQR);

export default router; 