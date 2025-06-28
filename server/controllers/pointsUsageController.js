import PointsUsage from '../models/PointsUsage.js';
import User from '../models/User.js';

// Valid store names
const VALID_STORES = [
  'varda',
  'blueCafe',
  'colonelsCurry',
  'chillers',
  'luckyShawarma',
  'yumdimdum'
];

// Record points usage
export const recordPointsUsage = async (req, res) => {
  try {
    const { mealType, storeName, pointsUsed, items, totalAmount } = req.body;
    const idNumber = req.user.idNumber;

    console.log('Received request:', {
      mealType,
      storeName,
      pointsUsed,
      items,
      totalAmount,
      idNumber
    });

    // Validate meal type
    if (!mealType || !['breakfast', 'lunch', 'dinner'].includes(mealType)) {
      return res.status(400).json({ 
        message: 'Invalid meal type. Must be breakfast, lunch, or dinner' 
      });
    }

    // Validate store name
    if (!storeName || !VALID_STORES.includes(storeName)) {
      return res.status(400).json({ 
        message: 'Invalid store name' 
      });
    }

    // Validate items array
    if (!Array.isArray(items)) {
      return res.status(400).json({ 
        message: 'Items must be an array' 
      });
    }

    // Validate pointsUsed is reasonable (positive and not zero)
    if (!pointsUsed || pointsUsed <= 0) {
      return res.status(400).json({ 
        message: 'Invalid Points' 
      });
    }

    // Validate totalAmount matches pointsUsed
    if (totalAmount !== pointsUsed) {
      return res.status(400).json({ 
        message: 'Total amount must match points used' 
      });
    }

    // Find user first
    const user = await User.findOne({ idNumber });
    if (!user) {
      console.log('User not found:', idNumber);
      return res.status(404).json({ message: 'User not found' });
    }

    console.log('Found user:', {
      idNumber: user.idNumber,
      points: user.points
    });

    // Check if user has enough points
    if (user.points < pointsUsed) {
      console.log('Insufficient loyalty points');
      return res.status(400).json({ 
        message: 'Insufficient loyalty points',
        currentPoints: user.points,
        pointsNeeded: pointsUsed
      });
    }

    // Create new points usage record
    const pointsUsage = await PointsUsage.create({
      idNumber,
      firstName: user.firstName,
      lastName: user.lastName,
      mealType,
      storeName,
      pointsUsed,
      items,
      totalAmount,
      dateUsed: new Date()
    });

    console.log('Created points usage record:', pointsUsage);

    // Update user's points
    user.points -= pointsUsed;
    user.pointsUsed += pointsUsed;
    
    await user.save();
    console.log('Updated user points:', {
      points: user.points
    });

    res.status(201).json({
      message: 'Points usage recorded successfully',
      pointsUsage,
      newPoints: user.points
    });
  } catch (error) {
    console.error('Error recording points usage:', error);
    res.status(500).json({ 
      message: 'Server error',
      error: error.message
    });
  }
};

// Get points usage history
export const getPointsUsageHistory = async (req, res) => {
  try {
    const idNumber = req.user.idNumber;
    const pointsUsage = await PointsUsage.find({ idNumber })
      .sort({ dateUsed: -1 });
    res.json(pointsUsage);
  } catch (error) {
    console.error('Error fetching points usage history:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get points usage statistics
export const getPointsUsageStats = async (req, res) => {
  try {
    const idNumber = req.user.idNumber;
    
    // Get total points used per meal type
    const mealTypeStats = await PointsUsage.aggregate([
      { $match: { idNumber } },
      { $group: {
        _id: '$mealType',
        totalPoints: { $sum: '$pointsUsed' },
        count: { $sum: 1 }
      }}
    ]);

    // Get total points used per store
    const storeStats = await PointsUsage.aggregate([
      { $match: { idNumber } },
      { $group: {
        _id: '$storeName',
        totalPoints: { $sum: '$pointsUsed' },
        count: { $sum: 1 }
      }}
    ]);

    res.json({
      mealTypeStats,
      storeStats
    });
  } catch (error) {
    console.error('Error fetching points usage statistics:', error);
    res.status(500).json({ message: 'Server error' });
  }
}; 