import mongoose from 'mongoose';

const qrCodeScanSchema = new mongoose.Schema({
  scannedData: { type: Object, required: true },
  scannedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  scannedAt: { type: Date, default: Date.now },
  status: { type: String, enum: ['pending', 'processed'], default: 'pending' }
});

const QRCodeScan = mongoose.model('QRCodeScan', qrCodeScanSchema);

export default QRCodeScan; 