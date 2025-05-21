import express from 'express';
import { saveQRCodeScan, getQRCodeScans } from '../controllers/qrCodeScanController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.post('/save-scan', protect, saveQRCodeScan);
router.get('/scans', protect, getQRCodeScans);

export default router; 