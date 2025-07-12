import { BorrowedItemHistory } from '../models/BorrowedItemHistory.js';
import { ReturnedItemHistory } from '../models/ReturnedItemHistory.js';
import User from '../models/User.js';

// Add caching for frequently accessed data
const cache = new Map();
const CACHE_TTL = 30000; // 30 seconds
const MAX_CACHE_SIZE = 100; // Maximum number of cache entries

// Helper function to generate unique order ID
const generateOrderId = () => {
  const randomDigits = Math.floor(Math.random() * 1000000000).toString().padStart(9, '0');
  return `ORD-${randomDigits}`;
};

// Helper function to clear cache with size limits
const clearCache = () => {
  // Only clear cache keys that might be affected by returns
  // This is more efficient than clearing the entire cache
  const keysToClear = Array.from(cache.keys()).filter(key => 
    key.includes('borrowed_') || key.includes('returned_')
  );
  keysToClear.forEach(key => cache.delete(key));
};

// Helper function to manage cache size
const manageCacheSize = () => {
  if (cache.size > MAX_CACHE_SIZE) {
    // Remove oldest entries (first 20% of cache)
    const keysToRemove = Array.from(cache.keys()).slice(0, Math.floor(MAX_CACHE_SIZE * 0.2));
    keysToRemove.forEach(key => cache.delete(key));
  }
};

export const createBorrowedItem = async (req, res) => {
  try {
    const { items, studentId, timestamp } = req.body;

    // First verify the user exists
    const user = await User.findById(studentId).lean();
    if (!user) {
      console.log('User not found with ID:', studentId);
      return res.status(404).json({
        success: false,
        message: 'Student not found'
      });
    }

    // Generate unique order ID
    const orderId = generateOrderId();

    // Check for existing borrow with the same timestamp and items
    const existingBorrow = await BorrowedItemHistory.findOne({
      studentId: user._id,
      borrowTime: new Date(timestamp),
      'items': { $all: items.map(item => ({ 
        name: item.name,
        quantity: item.quantity 
      }))},
      status: 'borrowed'
    }).lean();

    if (existingBorrow) {
      console.log('Duplicate borrow attempt detected for student:', user.idNumber);
      return res.status(400).json({
        success: false,
        message: 'This borrow request has already been processed'
      });
    }

    // Create borrowed item record
    const borrowedItem = new BorrowedItemHistory({
      orderId: orderId,
      studentId: user._id,
      studentIdNumber: user.idNumber,
      items,
      status: 'borrowed',
      borrowTime: new Date(timestamp)
    });

    await borrowedItem.save();
    
    // Format items for logging
    const itemsList = items.map(item => `${item.name} (x${item.quantity})`).join(', ');
    console.log('Created borrowed item record for student:', user.idNumber, 'with orderId:', orderId, 'Items:', itemsList);

    // Clear cache after new borrow
    clearCache();

    res.status(201).json({
      success: true,
      data: borrowedItem
    });
  } catch (error) {
    console.error('Error creating borrowed item:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating borrowed item'
    });
  }
};

export const getBorrowedItems = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const cacheKey = `borrowed_${startDate}_${endDate}_${req.user?._id || 'all'}`;
    
    // Check cache first
    const cachedData = cache.get(cacheKey);
    if (cachedData && Date.now() - cachedData.timestamp < CACHE_TTL) {
      return res.status(200).json({
        success: true,
        data: cachedData.data
      });
    }

    let query = {};

    // Filter by user's ID for student, teacher, and ateneo staff roles
    if (req.user && ['student', 'teacher', 'ateneostaff'].includes(req.user.role.toLowerCase())) {
      query.studentId = req.user._id;
    }

    if (startDate && endDate) {
      query.borrowTime = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    }

    // Get all borrowed items with lean() for better performance
    const borrowedItems = await BorrowedItemHistory.find(query)
      .sort({ borrowTime: -1 })
      .lean();

    // Get all returned items with lean() for better performance
    const returnedItems = await ReturnedItemHistory.find({
      studentId: { $in: borrowedItems.map(item => item.studentId) }
    }).lean();

    // Filter out items that have been returned using orderId for more accurate matching
    const activeBorrowedItems = borrowedItems.filter(borrowedItem => {
      return !returnedItems.some(returnedItem => {
        // If both have orderId, use orderId for matching
        if (borrowedItem.orderId && returnedItem.orderId) {
          return returnedItem.orderId === borrowedItem.orderId;
        }
        // Fallback to old matching logic for records without orderId
        return returnedItem.studentId.toString() === borrowedItem.studentId.toString() &&
               returnedItem.borrowTime.getTime() === borrowedItem.borrowTime.getTime() &&
               returnedItem.items[0].name === borrowedItem.items[0].name;
      });
    });
    
    // Cache the results
    cache.set(cacheKey, {
      data: activeBorrowedItems,
      timestamp: Date.now()
    });

    // Manage cache size
    manageCacheSize();

    res.status(200).json({
      success: true,
      data: activeBorrowedItems
    });
  } catch (error) {
    console.error('Error fetching borrowed items:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching borrowed items'
    });
  }
};

export const returnBorrowedItem = async (req, res) => {
  try {
    const { id } = req.params;
    console.log('Processing return for item ID:', id);

    const borrowedItem = await BorrowedItemHistory.findById(id).lean();
    console.log('Found borrowed item:', borrowedItem);
    
    if (!borrowedItem) {
      return res.status(404).json({
        success: false,
        message: 'Borrowed item not found'
      });
    }

    // Check if item is already in ReturnedItemHistory using orderId
    const existingReturn = await ReturnedItemHistory.findOne({
      $or: [
        // If orderId exists, use it for matching
        ...(borrowedItem.orderId ? [{ orderId: borrowedItem.orderId }] : []),
        // Fallback to old matching logic for records without orderId
        {
          studentId: borrowedItem.studentId,
          borrowTime: borrowedItem.borrowTime,
          'items': { $all: borrowedItem.items.map(item => ({ 
            name: item.name,
            quantity: item.quantity 
          }))}
        }
      ],
      status: 'returned'
    }).lean();

    if (existingReturn) {
      return res.status(400).json({
        success: false,
        message: 'Item is already returned'
      });
    }

    const returnTime = new Date();

    // Create returned history record
    const returnedItemHistory = new ReturnedItemHistory({
      orderId: borrowedItem.orderId,
      studentId: borrowedItem.studentId,
      studentIdNumber: borrowedItem.studentIdNumber,
      items: borrowedItem.items,
      borrowTime: borrowedItem.borrowTime,
      returnTime: returnTime,
      status: 'returned'
    });
    await returnedItemHistory.save();

    // Clear cache after return
    clearCache();

    res.status(200).json({
      success: true,
      data: returnedItemHistory
    });
  } catch (error) {
    console.error('Error returning borrowed item:', error);
    res.status(500).json({
      success: false,
      message: 'Error returning borrowed item'
    });
  }
};

export const getBorrowedItemHistory = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    let query = {};

    if (startDate && endDate) {
      // Create Philippine Time dates (UTC+8)
      const start = new Date(startDate + 'T00:00:00+08:00');
      const end = new Date(endDate + 'T23:59:59+08:00');

      // Validate dates before using toISOString()
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

    const history = await BorrowedItemHistory.find(query)
      .sort({ borrowTime: -1 });
    
    res.status(200).json({
      success: true,
      data: history
    });
  } catch (error) {
    console.error('Error fetching borrowed item history:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching borrowed item history'
    });
  }
};

export const getReturnedItemHistory = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    let query = {};

    if (startDate && endDate) {
      // Create Philippine Time dates (UTC+8)
      const start = new Date(startDate + 'T00:00:00+08:00');
      const end = new Date(endDate + 'T23:59:59+08:00');

      // Validate dates before using toISOString()
      if (isNaN(start.getTime()) || isNaN(end.getTime())) {
        return res.status(400).json({
          success: false,
          message: 'Invalid date format provided'
        });
      }

      query.returnTime = {
        $gte: start,
        $lte: end
      };
    }

    const history = await ReturnedItemHistory.find(query)
      .sort({ returnTime: -1 })
      .limit(1000);
    
    res.status(200).json({
      success: true,
      data: history
    });
  } catch (error) {
    console.error('Error fetching returned item history:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching returned item history'
    });
  }
};

export const processReturnQR = async (req, res) => {
  try {
    const { studentId, items, timestamp } = req.body;
    
    // Find the borrowed item for this student that matches the timestamp
    const borrowedItem = await BorrowedItemHistory.findOne({
      studentId,
      borrowTime: new Date(timestamp),
      status: 'borrowed'
    }).lean();

    if (!borrowedItem) {
      return res.status(404).json({
        success: false,
        message: 'No borrowed item found for this student with the given timestamp'
      });
    }

    // Check if item is already in ReturnedItemHistory using orderId
    const existingReturn = await ReturnedItemHistory.findOne({
      $or: [
        // If orderId exists, use it for matching
        ...(borrowedItem.orderId ? [{ orderId: borrowedItem.orderId }] : []),
        // Fallback to old matching logic for records without orderId
        {
          studentId: borrowedItem.studentId,
          borrowTime: borrowedItem.borrowTime,
          'items': { $all: items.map(item => ({ 
            name: item.name,
            quantity: item.quantity 
          }))}
        }
      ],
      status: 'returned'
    }).lean();

    if (existingReturn) {
      return res.status(400).json({
        success: false,
        message: 'This order has already been returned'
      });
    }

    const returnTime = new Date();

    // Use database transaction for atomic operations
    const session = await BorrowedItemHistory.startSession();
    let returnedItemHistory;

    try {
      await session.withTransaction(async () => {
        // Create returned history record
        returnedItemHistory = new ReturnedItemHistory({
          orderId: borrowedItem.orderId,
          studentId: borrowedItem.studentId,
          studentIdNumber: borrowedItem.studentIdNumber,
          items: borrowedItem.items,
          borrowTime: borrowedItem.borrowTime,
          returnTime: returnTime,
          status: 'returned'
        });
        await returnedItemHistory.save({ session });

        // Update the status of the borrowed item to 'returned'
        await BorrowedItemHistory.findByIdAndUpdate(
          borrowedItem._id,
          { 
            status: 'returned',
            returnTime: returnTime 
          },
          { session }
        );
      });
    } finally {
      await session.endSession();
    }

    // Clear cache after return (only clear relevant cache keys)
    clearCache();

    res.status(200).json({
      success: true,
      data: returnedItemHistory
    });
  } catch (error) {
    console.error('Error processing return:', error);
    res.status(500).json({
      success: false,
      message: 'Error processing return'
    });
  }
};

export const deleteReturnedItem = async (req, res) => {
  try {
    const { id } = req.params;
    console.log('Deleting returned item with ID:', id);

    // Find the returned item first
    const returnedItem = await ReturnedItemHistory.findById(id);
    if (!returnedItem) {
      return res.status(404).json({
        success: false,
        message: 'Returned item not found'
      });
    }

    // Delete only the returned item record
    await ReturnedItemHistory.findByIdAndDelete(id);
    console.log('Successfully deleted returned item record');

    res.status(200).json({
      success: true,
      message: 'Returned item record deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting returned item:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting returned item'
    });
  }
}; 