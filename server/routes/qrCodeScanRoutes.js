import express from 'express';
import { saveQRCodeScan, getQRCodeScans } from '../controllers/qrCodeScanController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

// Debug middleware for QR code routes
router.use((req, res, next) => {
  console.log('QR Code Route accessed:', req.method, req.path);
  next();
});

// QR Code scan routes
router.post('/save-scan', protect, async (req, res, next) => {
  console.log('Save scan route hit');
  try {
    await saveQRCodeScan(req, res);
  } catch (error) {
    next(error);
  }
});

router.get('/scans', protect, async (req, res, next) => {
  console.log('Get scans route hit');
  try {
    await getQRCodeScans(req, res);
  } catch (error) {
    next(error);
  }
});

export default router; 