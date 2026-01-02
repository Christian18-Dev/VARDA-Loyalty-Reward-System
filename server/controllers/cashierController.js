import Code from '../models/Code.js'; // Make sure this line is at the top of your file
import ClaimedReward from '../models/ClaimedReward.js';
import PointsUsage from '../models/PointsUsage.js';
import User from '../models/User.js';
import MealRegistration from '../models/MealRegistration.js';
import AvailHistory from '../models/AvailHistory.js';

export const generateCode = async (req, res) => {
  try {
    const newCode = Math.floor(100000 + Math.random() * 900000).toString(); // 6-digit code

    // Create a new code entry with status 'active'
    const code = await Code.create({
      code: newCode,
      status: 'active',  // Initially active
    });

    res.status(201).json({ message: 'Code generated', code });
  } catch (error) {
    console.error('Error generating code:', error);
    res.status(500).json({ message: 'Server error' });
  }
};


export const getClaimedRewards = async (req, res) => {
  try {
    const rewards = await ClaimedReward.find().sort({ time: -1 });
    res.json(rewards);
  } catch (error) {
    console.error('Error fetching claimed rewards:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get points usage history with user details
export const getPointsUsageHistory = async (req, res) => {
  try {
    // Get the cashier's store name from their role
    let storeName;
    switch (req.user.role) {
      case 'varda':
        storeName = 'Varda';
        break;
      case 'blueCafe':
        storeName = 'Blue Cafe';
        break;
      case 'colonelsCurry':
        storeName = "Colonel's Curry";
        break;
      case 'chillers':
        storeName = 'Chillers';
        break;
      case 'luckyShawarma':
        storeName = 'Lucky Shawarma';
        break;
      case 'yumdimdum':
        storeName = 'Yumdimdum';
        break;
      default:
        storeName = req.user.role.charAt(0).toUpperCase() + req.user.role.slice(1);
    }
    
    // Find points usage records for this store only
    const pointsUsage = await PointsUsage.find({ storeName })
      .sort({ dateUsed: -1 })
      .lean();

    // Get user details for each points usage record
    const pointsUsageWithUserDetails = await Promise.all(
      pointsUsage.map(async (usage) => {
        const user = await User.findOne({ idNumber: usage.idNumber })
          .select('firstName lastName')
          .lean();
        
        return {
          ...usage,
          firstName: user?.firstName || 'Unknown',
          lastName: user?.lastName || 'Unknown'
        };
      })
    );

    res.json(pointsUsageWithUserDetails);
  } catch (error) {
    console.error('Error fetching points usage history:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get meal registrations for LIMA students (only accessible by cashierlima)
export const getLimaMealRegistrations = async (req, res) => {
  try {
    // Check if user has cashierlima role
    if (req.user.role !== 'cashierlima') {
      return res.status(403).json({ message: 'Access denied. Only cashierlima role can access this endpoint.' });
    }

    // Get meal registrations for students with university = 'lima'
    const mealRegistrations = await MealRegistration.find({ 
      university: 'lima',
      status: 'active'
    })
      .sort({ registrationDate: -1 })
      .lean();

    // Populate accountID from User model
    const mealRegistrationsWithAccountID = await Promise.all(
      mealRegistrations.map(async (registration) => {
        const user = await User.findOne({ idNumber: registration.idNumber })
          .select('accountID')
          .lean();
        
        return {
          ...registration,
          accountID: user?.accountID || null
        };
      })
    );

    res.json(mealRegistrationsWithAccountID);
  } catch (error) {
    console.error('Error fetching LIMA meal registrations:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Mark a meal as availed (only accessible by cashierlima)
export const availMeal = async (req, res) => {
  try {
    // Check if user has cashierlima role
    if (req.user.role !== 'cashierlima') {
      return res.status(403).json({ message: 'Access denied. Only cashierlima role can access this endpoint.' });
    }

    const { registrationId, mealType } = req.body;

    // Validate meal type
    if (!['breakfast', 'lunch', 'dinner'].includes(mealType)) {
      return res.status(400).json({ message: 'Invalid meal type. Must be breakfast, lunch, or dinner.' });
    }

    // Find the meal registration
    const registration = await MealRegistration.findById(registrationId);
    if (!registration) {
      return res.status(404).json({ message: 'Meal registration not found' });
    }

    // Check if the meal was registered
    if (!registration.meals[mealType]) {
      return res.status(400).json({ message: `This student did not register for ${mealType}.` });
    }

    // Check if the meal was already availed
    if (registration.mealsAvailed[mealType]) {
      return res.status(400).json({ message: `${mealType.charAt(0).toUpperCase() + mealType.slice(1)} has already been availed.` });
    }

    // Get user's accountID
    const user = await User.findOne({ idNumber: registration.idNumber })
      .select('accountID')
      .lean();

    // Mark the meal as availed
    registration.mealsAvailed[mealType] = true;
    await registration.save();

    // Create history entry
    await AvailHistory.create({
      registrationId: registration._id,
      idNumber: registration.idNumber,
      accountID: user?.accountID || null,
      firstName: registration.firstName,
      lastName: registration.lastName,
      mealType: mealType,
      availedBy: {
        idNumber: registration.idNumber,
        name: `${registration.firstName} ${registration.lastName}`
      },
      registrationDate: registration.registrationDate
    });

    res.json({
      success: true,
      message: `${mealType.charAt(0).toUpperCase() + mealType.slice(1)} marked as availed successfully`,
      registration
    });
  } catch (error) {
    console.error('Error availing meal:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get avail history (only accessible by cashierlima)
export const getAvailHistory = async (req, res) => {
  try {
    // Check if user has cashierlima role
    if (req.user.role !== 'cashierlima') {
      return res.status(403).json({ message: 'Access denied. Only cashierlima role can access this endpoint.' });
    }

    // Get query parameters for filtering
    const { startDate, endDate, mealType, accountID, search } = req.query;

    // Build query
    const query = {};

    // Use proper timezone handling for date filters
    if (startDate || endDate) {
      query.availedAt = {};
      if (startDate) {
        const start = new Date(startDate);
        // Convert to Asia/Manila timezone (UTC+8) for consistent date handling
        const utcStart = start.getTime() + (start.getTimezoneOffset() * 60000);
        const startPH = new Date(utcStart + (8 * 3600000));
        startPH.setHours(0, 0, 0, 0);
        query.availedAt.$gte = startPH;
      }
      if (endDate) {
        const end = new Date(endDate);
        // Convert to Asia/Manila timezone (UTC+8) for consistent date handling
        const utcEnd = end.getTime() + (end.getTimezoneOffset() * 60000);
        const endPH = new Date(utcEnd + (8 * 3600000));
        endPH.setHours(23, 59, 59, 999);
        query.availedAt.$lte = endPH;
      }
    }

    // Meal type filter
    if (mealType && ['breakfast', 'lunch', 'dinner'].includes(mealType)) {
      query.mealType = mealType;
    }

    // AccountID filter
    if (accountID) {
      query.accountID = parseInt(accountID);
    }

    // Search filter (by name or idNumber)
    if (search) {
      query.$or = [
        { firstName: { $regex: search, $options: 'i' } },
        { lastName: { $regex: search, $options: 'i' } },
        { idNumber: { $regex: search, $options: 'i' } }
      ];
    }

    // Fetch history with sorting (newest first)
    const history = await AvailHistory.find(query)
      .sort({ availedAt: -1 })
      .lean();

    res.json(history);
  } catch (error) {
    console.error('Error fetching avail history:', error);
    res.status(500).json({ message: 'Server error' });
  }
};