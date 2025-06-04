import express from 'express';
import { protect, admin } from '../middleware/authMiddleware.js';
import { getStats, createReward, getUsers, getClaimedRewards, updateUserRole, updateUserPassword } from '../controllers/adminController.js';
import { getBorrowedItems, getBorrowedItemHistory, getReturnedItemHistory, cleanupStudentBorrows } from '../controllers/borrowedItemController.js';

const router = express.Router();

router.get('/stats', protect, admin, getStats);
router.post('/reward', protect, admin, createReward);
router.get('/users', protect, admin, getUsers);
router.get('/claimed-rewards', protect, admin, getClaimedRewards);
router.put('/users/:userId/role', protect, admin, updateUserRole);
router.put('/users/:userId/password', protect, admin, updateUserPassword);

// Borrowed items routes
router.get('/borrowed-items', protect, admin, getBorrowedItems);
router.get('/borrowed-history', protect, admin, getBorrowedItemHistory);
router.get('/returned-history', protect, admin, getReturnedItemHistory);

// Temporary cleanup route
router.delete('/cleanup-borrows', protect, admin, cleanupStudentBorrows);

export default router;
