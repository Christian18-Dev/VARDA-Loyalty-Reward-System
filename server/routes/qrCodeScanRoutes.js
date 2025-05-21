import express from 'express';
import { saveQRCodeScan, getQRCodeScans } from '../controllers/qrCodeScanController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

// Debug middleware for QR code routes
router.use((req, res, next) => {
  console.log(`[QR Code Route] ${req.method} ${req.path}`);
  next();
});

// Test route to verify the router is working
router.get('/test', (req, res) => {
  res.json({ message: 'QR Code routes are working' });
});

// QR Code scan routes
router.post('/save-scan', protect, async (req, res, next) => {
  console.log('Save scan route hit with data:', req.body);
  try {
    await saveQRCodeScan(req, res);
  } catch (error) {
    console.error('Error in save-scan route:', error);
    next(error);
  }
});

router.get('/scans', protect, async (req, res, next) => {
  console.log('Get scans route hit');
  try {
    await getQRCodeScans(req, res);
  } catch (error) {
    console.error('Error in get-scans route:', error);
    next(error);
  }
});

export default router; 