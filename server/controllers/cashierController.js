import Code from '../models/Code.js'; // Make sure this line is at the top of your file
import ClaimedReward from '../models/ClaimedReward.js';
import PointsUsage from '../models/PointsUsage.js';
import User from '../models/User.js';
import MealRegistration from '../models/MealRegistration.js';
import AvailHistory from '../models/AvailHistory.js';

const computeMealWindowUTC = (inputDate) => {
  const now = inputDate instanceof Date ? inputDate : new Date(inputDate);
  if (Number.isNaN(now.getTime())) {
    throw new Error('Invalid date');
  }

  // Convert to PH time (UTC+8)
  const utcTime = now.getTime() + (now.getTimezoneOffset() * 60000);
  const philNow = new Date(utcTime + (8 * 3600000));

  // Compute the start of the current 5 AM–5 AM window in PH time
  const windowStartPH = new Date(philNow);
  windowStartPH.setHours(5, 0, 0, 0);
  if (philNow.getHours() < 5) {
    windowStartPH.setDate(windowStartPH.getDate() - 1);
  }

  // Convert window boundaries back to UTC
  const windowStartUTC = new Date(windowStartPH.getTime() - (8 * 3600000));
  const windowEndUTC = new Date(windowStartUTC.getTime() + (24 * 3600000));

  return { windowStartUTC, windowEndUTC };
};

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
    
    // Add pagination
    const { page = 1, limit = 10 } = req.query;
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;
    
    // Get total count
    const total = await PointsUsage.countDocuments({ storeName });
    
    // Find points usage records for this store only with pagination
    const pointsUsage = await PointsUsage.find({ storeName })
      .sort({ dateUsed: -1 })
      .skip(skip)
      .limit(limitNum)
      .lean();

    // Batch query: Get all unique idNumbers and fetch users in one query
    const idNumbers = [...new Set(pointsUsage.map(usage => usage.idNumber))];
    const users = await User.find({ idNumber: { $in: idNumbers } })
      .select('idNumber firstName lastName')
      .lean();
    
    // Create a map for O(1) lookup
    const userMap = new Map(users.map(u => [u.idNumber, u]));

    // Map points usage with user details
    const pointsUsageWithUserDetails = pointsUsage.map((usage) => {
      const user = userMap.get(usage.idNumber);
      return {
        ...usage,
        firstName: user?.firstName || 'Unknown',
        lastName: user?.lastName || 'Unknown'
      };
    });

    res.json({
      data: pointsUsageWithUserDetails,
      pagination: {
        currentPage: pageNum,
        totalPages: Math.ceil(total / limitNum),
        totalItems: total,
        itemsPerPage: limitNum
      }
    });
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

    // Get pagination parameters
    const { page = 1, limit = 10, search = '' } = req.query;
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    // Build query
    const query = {
      university: 'lima',
      status: 'active'
    };

    // Add search filter if provided
    if (search) {
      query.$or = [
        { firstName: { $regex: search, $options: 'i' } },
        { lastName: { $regex: search, $options: 'i' } },
        { idNumber: { $regex: search, $options: 'i' } }
      ];
    }

    // Get total count
    const total = await MealRegistration.countDocuments(query);

    // Get meal registrations with pagination
    const mealRegistrations = await MealRegistration.find(query)
      .sort({ registrationDate: -1 })
      .skip(skip)
      .limit(limitNum)
      .lean();

    // Populate accountID from User model (batch query for better performance)
    const idNumbers = mealRegistrations.map(r => r.idNumber);
    const users = await User.find({ idNumber: { $in: idNumbers } })
      .select('idNumber accountID')
      .lean();
    
    const userMap = new Map(users.map(u => [u.idNumber, u.accountID]));

    const mealRegistrationsWithAccountID = mealRegistrations.map((registration) => ({
      ...registration,
      accountID: userMap.get(registration.idNumber) || null
    }));

    res.json({
      data: mealRegistrationsWithAccountID,
      pagination: {
        currentPage: pageNum,
        totalPages: Math.ceil(total / limitNum),
        totalItems: total,
        itemsPerPage: limitNum
      }
    });
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

    // Get user's accountID and limaBatch
    const user = await User.findOne({ idNumber: registration.idNumber })
      .select('accountID limaBatch')
      .lean();

    // Mark the meal as availed
    registration.mealsAvailed[mealType] = true;
    await registration.save();

    // Create history entry
    await AvailHistory.create({
      registrationId: registration._id,
      idNumber: registration.idNumber,
      accountID: user?.accountID || null,
      limaBatch: user?.limaBatch || null,
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

export const getAvailHistory = async (req, res) => {
  try {
    // Check if user has cashierlima role
    if (req.user.role !== 'cashierlima') {
      return res.status(403).json({ message: 'Access denied. Only cashierlima role can access this endpoint.' });
    }

    // Get query parameters for filtering and pagination
    const { startDate, endDate, mealType, accountID, search, limaBatch, page = 1, limit = 10 } = req.query;
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    // Build query
    const query = {};

    // Use proper timezone handling for date filters (using 5 AM window logic)
    if (startDate || endDate) {
      query.registrationDate = {};
      if (startDate) {
        // Convert start date to Asia/Manila timezone using 5 AM window logic
        const start = new Date(startDate);
        const utcTime = start.getTime() + (start.getTimezoneOffset() * 60000);
        const startPH = new Date(utcTime + (8 * 3600000));

        // Use 5 AM as start of day (same as meal registration logic)
        const windowStart = new Date(startPH);
        windowStart.setHours(5, 0, 0, 0); // 5:00 AM PH time

        // Convert back to UTC for database query
        const startUTC = new Date(windowStart.getTime() - (8 * 3600000));
        query.registrationDate.$gte = startUTC;
      }
      if (endDate) {
        // Convert end date to Asia/Manila timezone using 5 AM window logic
        const end = new Date(endDate);
        const utcTime = end.getTime() + (end.getTimezoneOffset() * 60000);
        const endPH = new Date(utcTime + (8 * 3600000));

        // Use next day's 5 AM as end boundary (same as meal registration logic)
        const windowEnd = new Date(endPH);
        windowEnd.setHours(5, 0, 0, 0); // 5:00 AM next day PH time
        windowEnd.setDate(windowEnd.getDate() + 1);

        // Convert back to UTC for database query
        const endUTC = new Date(windowEnd.getTime() - (8 * 3600000));
        query.registrationDate.$lt = endUTC; // Use $lt instead of $lte for exact window
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

    // LIMA batch filter
    if (limaBatch && (limaBatch === 'B29' || limaBatch === 'B31' || limaBatch === 'B32')) {
      const usersWithBatch = await User.find({ university: 'lima', limaBatch })
        .select('idNumber')
        .lean();
      const idNumbersWithBatch = usersWithBatch.map((u) => u.idNumber).filter(Boolean);

      query.$and = query.$and || [];
      query.$and.push({
        $or: [
          { limaBatch },
          { limaBatch: null, idNumber: { $in: idNumbersWithBatch } },
          { limaBatch: { $exists: false }, idNumber: { $in: idNumbersWithBatch } }
        ]
      });
    }

    // Get total count for pagination
    const total = await AvailHistory.countDocuments(query);

    // Fetch only the current page with pagination
    const history = await AvailHistory.find(query)
      .sort({ availedAt: -1 })
      .skip(skip)
      .limit(limitNum)
      .lean();

    const missingBatch = history.some((h) => !h.limaBatch);
    let enrichedHistory = history;

    if (missingBatch && history.length > 0) {
      const idNumbers = [...new Set(history.map((h) => h.idNumber).filter(Boolean))];
      const users = await User.find({ idNumber: { $in: idNumbers } })
        .select('idNumber limaBatch')
        .lean();
      const batchMap = new Map(users.map((u) => [u.idNumber, u.limaBatch]));

      enrichedHistory = history.map((h) => ({
        ...h,
        limaBatch: h.limaBatch || batchMap.get(h.idNumber) || null
      }));
    }

    res.json({
      data: enrichedHistory,
      pagination: {
        currentPage: pageNum,
        totalPages: Math.ceil(total / limitNum),
        totalItems: total,
        itemsPerPage: limitNum
      }
    });
  } catch (error) {
    console.error('Error fetching avail history:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Manually add an availment to history with a custom date/time (only accessible by cashierlima)
export const manualAvailment = async (req, res) => {
  try {
    if (req.user.role !== 'cashierlima') {
      return res.status(403).json({ message: 'Access denied. Only cashierlima role can access this endpoint.' });
    }

    const { idNumber, mealType, availedAt } = req.body;

    if (!idNumber || typeof idNumber !== 'string') {
      return res.status(400).json({ message: 'idNumber is required.' });
    }

    if (!['breakfast', 'lunch', 'dinner'].includes(mealType)) {
      return res.status(400).json({ message: 'Invalid meal type. Must be breakfast, lunch, or dinner.' });
    }

    if (!availedAt) {
      return res.status(400).json({ message: 'availedAt is required.' });
    }

    const parsedAvailedAt = new Date(availedAt);
    if (Number.isNaN(parsedAvailedAt.getTime())) {
      return res.status(400).json({ message: 'availedAt must be a valid date.' });
    }

    const student = await User.findOne({ idNumber })
      .select('idNumber accountID firstName lastName university limaBatch')
      .lean();

    if (!student) {
      return res.status(404).json({ message: 'Student not found.' });
    }

    if (student.university !== 'lima') {
      return res.status(400).json({ message: 'Meal registration is only available for LIMA students.' });
    }

    const { windowStartUTC, windowEndUTC } = computeMealWindowUTC(parsedAvailedAt);

    let registration = await MealRegistration.findOne({
      idNumber,
      registrationDate: {
        $gte: windowStartUTC,
        $lt: windowEndUTC
      },
      status: 'active'
    });

    if (!registration) {
      registration = await MealRegistration.create({
        idNumber: student.idNumber,
        firstName: student.firstName,
        lastName: student.lastName,
        university: student.university,
        meals: {
          breakfast: mealType === 'breakfast',
          lunch: mealType === 'lunch',
          dinner: mealType === 'dinner'
        },
        mealsAvailed: {
          breakfast: mealType === 'breakfast',
          lunch: mealType === 'lunch',
          dinner: mealType === 'dinner'
        },
        registrationDate: parsedAvailedAt
      });
    } else {
      registration.meals = {
        ...registration.meals,
        [mealType]: true
      };
      registration.mealsAvailed = {
        ...registration.mealsAvailed,
        [mealType]: true
      };
      await registration.save();
    }

    const existingHistory = await AvailHistory.findOne({
      registrationId: registration._id,
      mealType
    })
      .select('_id')
      .lean();

    if (existingHistory) {
      return res.status(400).json({ message: 'This meal already exists in avail history for that registration window.' });
    }

    const historyEntry = await AvailHistory.create({
      registrationId: registration._id,
      idNumber: student.idNumber,
      accountID: student.accountID || null,
      limaBatch: student.limaBatch || null,
      firstName: student.firstName,
      lastName: student.lastName,
      mealType,
      availedBy: {
        idNumber: student.idNumber,
        name: `${student.firstName} ${student.lastName}`
      },
      availedAt: parsedAvailedAt,
      registrationDate: registration.registrationDate
    });

    return res.status(201).json({
      success: true,
      message: 'Manual availment added to history successfully.',
      historyEntry
    });
  } catch (error) {
    console.error('Error creating manual availment:', error);
    return res.status(500).json({ message: 'Server error' });
  }
};