import User from '../models/User.js';
import Reward from '../models/Reward.js';
import ClaimedReward from '../models/ClaimedReward.js';
import bcrypt from 'bcryptjs';
import PointsUsage from '../models/PointsUsage.js';
import Code from '../models/Code.js';

export const getStats = async (req, res) => {
  try {
    // Use aggregation to calculate totals without loading all documents into memory
    const userStats = await User.aggregate([
      {
        $group: {
          _id: null,
          totalUsers: { $sum: 1 },
          totalPointsUnused: { $sum: '$points' }
        }
      }
    ]);

    const claimedRewardsStats = await ClaimedReward.aggregate([
      {
        $group: {
          _id: null,
          totalPointsUsed: { $sum: { $max: ['$pointsUsed', 0] } }
        }
      }
    ]);

    const stats = {
      totalPointsUnused: userStats[0]?.totalPointsUnused || 0,
      totalPointsUsed: claimedRewardsStats[0]?.totalPointsUsed || 0,
      totalUsers: userStats[0]?.totalUsers || 0
    };

    res.json(stats);
  } catch (error) {
    console.error('Error fetching stats:', error);
    res.status(500).json({ message: error.message });
  }
};

export const createReward = async (req, res) => {
  try {
    const { name, cost, description, imageBase64 } = req.body || {};

    if (!name || !cost || !description) {
      return res.status(400).json({ message: 'Missing fields' });
    }

    const reward = new Reward({
      name,
      cost,
      description,
      imageUrl: imageBase64 || null
    });

    await reward.save();
    res.status(201).json(reward);
  } catch (error) {
    console.error('Error creating reward:', error);
    res.status(500).json({ message: 'Error creating reward' });
  }
};

export const getUsers = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const search = req.query.search || '';

    // Create search query
    const searchQuery = search ? { idNumber: { $regex: search, $options: 'i' } } : {};

    // Get total count for pagination
    const total = await User.countDocuments(searchQuery);

    // Get paginated users
    const users = await User.find(searchQuery)
      .select('idNumber points role firstName lastName')
      .skip((page - 1) * limit)
      .limit(limit)
      .sort({ idNumber: 1 });

    res.json({
      users,
      currentPage: page,
      totalPages: Math.ceil(total / limit),
      totalUsers: total
    });
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ message: 'Error fetching users' });
  }
};

export const getClaimedRewards = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const search = req.query.search || '';

    // Create search query
    const searchQuery = search ? {
      $or: [
        { idNumber: { $regex: search, $options: 'i' } },
        { reward: { $regex: search, $options: 'i' } }
      ]
    } : {};

    // Get total count for pagination
    const total = await ClaimedReward.countDocuments(searchQuery);

    // Get paginated claimed rewards with lean() for better performance
    const claimedRewards = await ClaimedReward.find(searchQuery)
      .sort({ dateClaimed: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();

    res.json({
      claimedRewards,
      currentPage: page,
      totalPages: Math.ceil(total / limit),
      totalRecords: total
    });
  } catch (error) {
    console.error('Error fetching claimed rewards:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

export const updateUserRole = async (req, res) => {
  try {
    const { userId } = req.params;
    const { role } = req.body;

    // Validate role
    const validRoles = [
      'student', 
      'teacher', 
      'ateneoStaff', 
      'cashier', 
      'concierge', 
    ];
    if (!validRoles.includes(role)) {
      return res.status(400).json({ message: 'Invalid role' });
    }

    // Find user and prevent admin role changes
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (user.role === 'admin') {
      return res.status(403).json({ message: 'Cannot change admin role' });
    }

    // Update the role
    user.role = role;
    await user.save();

    res.json({ message: 'Role updated successfully', user });
  } catch (error) {
    console.error('Error updating user role:', error);
    res.status(500).json({ message: 'Error updating user role' });
  }
};

export const updateUserPassword = async (req, res) => {
  try {
    const { userId } = req.params;
    const { password } = req.body;

    if (!password || password.length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters long' });
    }

    // Find user and prevent admin password changes
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (user.role === 'admin') {
      return res.status(403).json({ message: 'Cannot change admin password' });
    }

    // Hash the new password
    const hashedPassword = await bcrypt.hash(password, 10);
    
    // Update the password
    user.password = hashedPassword;
    await user.save();

    res.json({ message: 'Password updated successfully' });
  } catch (error) {
    console.error('Error updating password:', error);
    res.status(500).json({ message: 'Error updating password' });
  }
};

// Get all points usage records
export const getAllPointsUsage = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const search = req.query.search || '';

    // Create search query
    const searchQuery = search ? {
      $or: [
        { idNumber: { $regex: search, $options: 'i' } },
        { firstName: { $regex: search, $options: 'i' } },
        { lastName: { $regex: search, $options: 'i' } },
        { storeName: { $regex: search, $options: 'i' } },
        { mealType: { $regex: search, $options: 'i' } }
      ]
    } : {};

    // Get total count for pagination
    const total = await PointsUsage.countDocuments(searchQuery);

    // Get paginated points usage records
    const pointsUsage = await PointsUsage.find(searchQuery)
      .sort({ dateUsed: -1 })
      .skip((page - 1) * limit)
      .limit(limit);

    res.json({
      pointsUsage,
      currentPage: page,
      totalPages: Math.ceil(total / limit),
      totalRecords: total
    });
  } catch (error) {
    console.error('Error fetching points usage records:', error);
    res.status(500).json({ message: 'Error fetching points usage records' });
  }
};

// Get redemption history
export const getRedemptionHistory = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const search = req.query.search || '';

    // Create search query for redeemed codes only
    const searchQuery = {
      status: 'inactive', // Only get redeemed codes
      redeemedBy: { $exists: true }, // Ensure redeemedBy field exists
      ...(search && {
        $or: [
          { redeemedBy: { $regex: search, $options: 'i' } },
          { code: { $regex: search, $options: 'i' } }
        ]
      })
    };

    // Get total count for pagination
    const total = await Code.countDocuments(searchQuery);

    // Get paginated redemption history
    const redemptionHistory = await Code.find(searchQuery)
      .select('code redeemedBy redeemedAt')
      .sort({ redeemedAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();

    res.json({
      redemptionHistory,
      currentPage: page,
      totalPages: Math.ceil(total / limit),
      totalRecords: total
    });
  } catch (error) {
    console.error('Error fetching redemption history:', error);
    res.status(500).json({ message: 'Error fetching redemption history' });
  }
};

// Database diagnostic endpoint for borrow graph validation
export const validateBorrowGraphData = async (req, res) => {
  try {
    const { startDate, endDate, timeRange = 'day' } = req.query;
    
    // Build query for date range
    let query = {};
    if (startDate && endDate) {
      const start = new Date(startDate + 'T00:00:00+08:00');
      const end = new Date(endDate + 'T23:59:59+08:00');
      
      if (isNaN(start.getTime()) || isNaN(end.getTime())) {
        return res.status(400).json({
          success: false,
          message: 'Invalid date format provided'
        });
      }
      
      query.borrowTime = {
        $gte: start,
        $lte: end
      };
    }

    // Import BorrowedItemHistory model
    const { BorrowedItemHistory } = await import('../models/BorrowedItemHistory.js');
    
    // Get raw records
    const rawRecords = await BorrowedItemHistory.find(query)
      .sort({ borrowTime: -1 })
      .lean();

    // Get statistics
    const totalRecords = rawRecords.length;
    const borrowedCount = rawRecords.filter(r => r.status === 'borrowed').length;
    const returnedCount = rawRecords.filter(r => r.status === 'returned').length;
    
    // Analyze data integrity
    const recordsWithoutOrderId = rawRecords.filter(r => !r.orderId).length;
    const recordsWithoutStudentId = rawRecords.filter(r => !r.studentId).length;
    const recordsWithEmptyItems = rawRecords.filter(r => !r.items || r.items.length === 0).length;
    
    // Process data the same way the graph does
    const setBreakdowns = {
      'Basic Set': [
        { name: 'Plate', quantity: 1 },
        { name: 'Spoon', quantity: 1 },
        { name: 'Fork', quantity: 1 }
      ],
      'Complete Set': [
        { name: 'Plate', quantity: 1 },
        { name: 'Bowl', quantity: 1 },
        { name: 'Spoon', quantity: 1 },
        { name: 'Fork', quantity: 1 },
        { name: 'Glass', quantity: 1 }
      ],
      'Spoon & Fork': [
        { name: 'Spoon', quantity: 1 },
        { name: 'Fork', quantity: 1 }
      ]
    };

    const processedData = {};
    let totalItemsProcessed = 0;
    
    rawRecords.forEach(record => {
      const borrowDate = new Date(record.borrowTime);
      let key;
      
      if (timeRange === 'hour') {
        key = borrowDate.toLocaleString('en-US', {
          hour: 'numeric',
          hour12: true,
          timeZone: 'Asia/Manila'
        });
      } else if (timeRange === 'day') {
        key = borrowDate.toLocaleDateString('en-CA', { timeZone: 'Asia/Manila' });
      } else {
        const phDate = new Date(borrowDate.toLocaleString('en-US', { timeZone: 'Asia/Manila' }));
        key = `${phDate.getFullYear()}-${phDate.getMonth() + 1}`;
      }
      
      if (!processedData[key]) {
        processedData[key] = 0;
      }
      
      // Process each item in the borrow record
      record.items.forEach(borrowedItem => {
        if (setBreakdowns[borrowedItem.name]) {
          // This is a set, break it down into individual items
          setBreakdowns[borrowedItem.name].forEach(breakdownItem => {
            processedData[key] += breakdownItem.quantity * borrowedItem.quantity;
            totalItemsProcessed += breakdownItem.quantity * borrowedItem.quantity;
          });
        } else {
          // This is an individual item
          processedData[key] += borrowedItem.quantity;
          totalItemsProcessed += borrowedItem.quantity;
        }
      });
    });

    // Get recent records for manual verification
    const recentRecords = rawRecords.slice(0, 10).map(record => ({
      orderId: record.orderId,
      studentIdNumber: record.studentIdNumber,
      items: record.items,
      borrowTime: record.borrowTime,
      status: record.status,
      borrowTimeFormatted: new Date(record.borrowTime).toLocaleString('en-US', { 
        timeZone: 'Asia/Manila',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      })
    }));

    // Get unique students and items
    const uniqueStudents = [...new Set(rawRecords.map(r => r.studentIdNumber))];
    const allItems = rawRecords.flatMap(r => r.items.map(i => i.name));
    const uniqueItems = [...new Set(allItems)];
    const itemCounts = {};
    allItems.forEach(item => {
      itemCounts[item] = (itemCounts[item] || 0) + 1;
    });

    res.json({
      success: true,
      diagnostic: {
        query: query,
        dateRange: { startDate, endDate },
        timeRange,
        statistics: {
          totalRecords,
          borrowedCount,
          returnedCount,
          recordsWithoutOrderId,
          recordsWithoutStudentId,
          recordsWithEmptyItems,
          totalItemsProcessed,
          uniqueStudentCount: uniqueStudents.length,
          uniqueItemTypes: uniqueItems.length
        },
        processedGraphData: processedData,
        recentRecords,
        uniqueStudents: uniqueStudents.slice(0, 20), // Limit to first 20
        itemBreakdown: itemCounts,
        uniqueItems
      }
    });
  } catch (error) {
    console.error('Error in validateBorrowGraphData:', error);
    res.status(500).json({
      success: false,
      message: 'Error validating borrow graph data',
      error: error.message
    });
  }
};
