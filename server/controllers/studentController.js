import Code from '../models/Code.js';
import Reward from '../models/Reward.js';
import Feedback from '../models/Feedback.js';
import ClaimedReward from '../models/ClaimedReward.js';
import User from '../models/User.js';
import bcrypt from 'bcryptjs';
import PointsUsage from '../models/PointsUsage.js';

export const claimCode = async (req, res) => {
  try {
    const { code } = req.body;

    if (!code) {
      return res.status(400).json({ message: 'Code is required' });
    }

    const foundCode = await Code.findOne({ code });

    if (!foundCode) {
      return res.status(400).json({ message: 'Invalid code' });
    }

    if (foundCode.status === 'inactive') {
      return res.status(400).json({ message: 'Code already used' });
    }

    foundCode.status = 'inactive';
    await foundCode.save();

    res.status(200).json({ message: 'Code claimed successfully' });
  } catch (error) {
    console.error('Error in claimCode:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

export const claimReward = async (req, res) => {
  try {
    const reward = await Reward.findById(req.params.id);

    if (!reward) {
      return res.status(404).json({ message: 'Reward not found' });
    }

    if (reward.cost <= 0) {
      return res.status(400).json({ message: 'Invalid reward cost' });
    }

    if (req.user.points < reward.cost) {
      return res.status(400).json({ message: 'Not enough points' });
    }

    // Deduct points and save user
    req.user.points -= reward.cost;
    await req.user.save();

    // Record the claim
    await ClaimedReward.create({
      idNumber: req.user.idNumber,
      reward: reward.name,
      pointsUsed: reward.cost,
      dateClaimed: new Date(),
    });

    res.json({ 
      message: 'Reward claimed successfully!',
      newPoints: req.user.points 
    });
  } catch (error) {
    console.error('Error claiming reward:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Helper function to calculate total points
const calculateTotalPoints = (items) => {
  return items.reduce((total, item) => total + (item.price * item.quantity), 0);
};

// Add function to check and reset points if needed
const checkAndResetPoints = async (user) => {
  try {
    const now = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Manila' }));
    
    if (!user.cateringPoints) {
      user.cateringPoints = {
        breakfast: 250,
        lunch: 250,
        dinner: 250,
        lastReset: now
      };
      await user.save();
      return;
    }

    const lastReset = new Date(user.cateringPoints.lastReset);
    const daysSinceLastReset = Math.floor((now - lastReset) / (1000 * 60 * 60 * 24));

    if (daysSinceLastReset >= 1) {
      user.cateringPoints = {
        breakfast: 250,
        lunch: 250,
        dinner: 250,
        lastReset: now
      };
      await user.save();
    }
  } catch (error) {
    console.error('Error checking/resetting points:', error);
    throw error;
  }
};

// Place order using pointsUsage
export const placeOrder = async (req, res) => {
  try {
    const { userId, items, mealType, storeName } = req.body;
    
    // Validate input
    if (!userId || !items || !mealType || !storeName) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    // Get user and check points
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Check and reset points if needed
    await checkAndResetPoints(user);

    // Calculate total points needed
    const totalPoints = calculateTotalPoints(items);

    // Check if user has enough points
    if (user.cateringPoints[mealType] < totalPoints) {
      return res.status(400).json({ 
        message: 'Insufficient points',
        required: totalPoints,
        available: user.cateringPoints[mealType]
      });
    }

    // Create points usage record
    const pointsUsage = await PointsUsage.create({
      idNumber: user.idNumber,
      firstName: user.firstName,
      lastName: user.lastName,
      mealType,
      storeName,
      pointsUsed: totalPoints,
      items: items.map(item => ({
        name: item.name,
        points: item.price,
        quantity: item.quantity
      })),
      totalAmount: totalPoints,
      dateUsed: new Date()
    });

    // Update user's points
    user.cateringPoints[mealType] -= totalPoints;
    user.cateringPointsUsed += totalPoints;
    await user.save();

    res.status(200).json({
      message: 'Order placed successfully',
      pointsUsage,
      remainingPoints: user.cateringPoints[mealType]
    });
  } catch (error) {
    console.error('Error placing order:', error);
    res.status(500).json({ message: 'Error placing order' });
  }
};

// Get user's order history using pointsUsage
export const getUserOrders = async (req, res) => {
  try {
    const { userId } = req.params;
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const orders = await PointsUsage.find({ idNumber: user.idNumber })
      .sort({ dateUsed: -1 })
      .limit(10);
    
    res.status(200).json(orders);
  } catch (error) {
    console.error('Error fetching orders:', error);
    res.status(500).json({ message: 'Error fetching orders' });
  }
};

// Add indexes for better performance
const addIndexes = async () => {
  try {
    await User.collection.createIndex({ 'cateringPoints.lastReset': 1 });
    await PointsUsage.collection.createIndex({ idNumber: 1, dateUsed: -1 });
    await PointsUsage.collection.createIndex({ storeName: 1 });
    console.log('Indexes created successfully');
  } catch (error) {
    console.error('Error creating indexes:', error);
  }
};

// Call addIndexes when the server starts
addIndexes();

// Update meal time checks to use Philippine timezone
const checkMealHours = () => {
  const now = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Manila' }));
  const currentTimeInMinutes = now.getHours() * 60 + now.getMinutes();

  // Breakfast: 6:00 AM - 11:00 AM (Philippine time)
  const breakfastStart = 6 * 60;    // 6:00 AM
  const breakfastEnd = 11 * 60;     // 11:00 AM

  // Lunch: 11:00 AM - 4:00 PM (Philippine time)
  const lunchStart = 11 * 60;       // 11:00 AM
  const lunchEnd = 16 * 60;         // 4:00 PM

  // Dinner: 4:00 PM - 12:00 AM (Philippine time)
  const dinnerStart = 16 * 60;      // 4:00 PM
  const dinnerEnd = 24 * 60;        // 12:00 AM (midnight)

  setMealStatus({
    breakfast: currentTimeInMinutes >= breakfastStart && currentTimeInMinutes <= breakfastEnd,
    lunch: currentTimeInMinutes >= lunchStart && currentTimeInMinutes <= lunchEnd,
    dinner: currentTimeInMinutes >= dinnerStart && currentTimeInMinutes <= dinnerEnd
  });
};

export const getPoints = async (req, res) => {
  try {
    // Find the user to get their current points
    const user = await User.findOne({ idNumber: req.user.idNumber });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // If cateringPoints doesn't exist, initialize it with default values
    if (!user.cateringPoints) {
      user.cateringPoints = {
        breakfast: 250,
        lunch: 250,
        dinner: 250,
        lastReset: new Date()
      };
      await user.save();
    }

    // Check and reset points if needed
    await checkAndResetPoints(user);

    res.json({ 
      points: user.points,
      cateringPoints: user.cateringPoints
    });
  } catch (error) {
    console.error('Error getting points:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

export const submitFeedback = async (req, res) => {
  const { code, rating } = req.body;

  console.log('Received feedback:', { code, rating });

  if (!code || !rating || rating < 1 || rating > 5) {
    return res.status(400).json({ message: 'Invalid feedback data' });
  }

  try {
    const foundCode = await Code.findOne({ code });

    if (!foundCode) {
      console.log('Code not found:', code);
      return res.status(400).json({ message: 'Invalid or expired code' });
    }

    // ✅ Check if feedback already exists for this code
    const existingFeedback = await Feedback.findOne({ code });
    if (existingFeedback) {
      return res.status(400).json({ message: 'Feedback already submitted for this code' });
    }

    // ✅ Proceed even if code is inactive (claimed already)
    const feedback = new Feedback({
      code,
      rating,
      idNumber: req.user.idNumber,
      date: new Date(),
    });

    await feedback.save();

    res.json({ message: 'Feedback submitted successfully' });
  } catch (error) {
    console.error('Error in submitFeedback:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

export const updateProfile = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // If trying to change password
    if (newPassword) {
      // Verify current password
      const isMatch = await bcrypt.compare(currentPassword, user.password);
      if (!isMatch) {
        return res.status(400).json({ message: 'Current password is incorrect' });
      }

      // Hash new password
      const salt = await bcrypt.genSalt(10);
      user.password = await bcrypt.hash(newPassword, salt);
    }

    await user.save();

    res.json({ 
      message: 'Profile updated successfully',
      user: {
        _id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        idNumber: user.idNumber,
        role: user.role
      }
    });
  } catch (error) {
    console.error('Error updating profile:', error);
    res.status(500).json({ message: 'Server error' });
  }
};



