import QRCodeScan from '../models/QRCodeScan.js';

export const saveQRCodeScan = async (req, res) => {
  try {
    console.log('Received QR code scan request:', req.body);
    const { scannedData } = req.body;
    const userId = req.user._id; // From auth middleware

    console.log('Creating QR code scan with data:', {
      scannedData,
      userId
    });

    const qrCodeScan = await QRCodeScan.create({
      scannedData,
      scannedBy: userId
    });

    console.log('Successfully saved QR code scan:', qrCodeScan);

    res.status(201).json({
      success: true,
      data: qrCodeScan
    });
  } catch (error) {
    console.error('Error saving QR code scan:', error);
    res.status(500).json({
      success: false,
      message: 'Error saving QR code scan',
      error: error.message
    });
  }
};

export const getQRCodeScans = async (req, res) => {
  try {
    const userId = req.user._id;
    console.log('Fetching QR code scans for user:', userId);
    
    const scans = await QRCodeScan.find({ scannedBy: userId })
      .sort({ scannedAt: -1 });

    console.log('Found scans:', scans);

    res.status(200).json({
      success: true,
      data: scans
    });
  } catch (error) {
    console.error('Error fetching QR code scans:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching QR code scans',
      error: error.message
    });
  }
}; 