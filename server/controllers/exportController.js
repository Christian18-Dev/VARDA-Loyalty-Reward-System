import { BorrowedItemHistory } from '../models/BorrowedItemHistory.js';
import { ReturnedItemHistory } from '../models/ReturnedItemHistory.js';

// Export borrowed items
export const exportBorrowedItems = async (req, res) => {
  try {
    const { startDate, endDate, limit = 1000 } = req.query;
    console.log('Received date range:', { startDate, endDate, limit });
    let query = {};

    if (startDate && endDate) {
      // Create UTC dates to avoid timezone issues
      const start = new Date(startDate + 'T00:00:00.000Z');
      const end = new Date(endDate + 'T23:59:59.999Z');

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

    // Parse limit and ensure it's reasonable
    const parsedLimit = Math.min(parseInt(limit) || 1000, 5000); // Max 5000 items

    // Get borrowed items with lean() for better performance and limit
    const borrowedItems = await BorrowedItemHistory.find(query)
      .sort({ borrowTime: -1 })
      .limit(parsedLimit)
      .lean();

    // Get returned items for filtering (also with limit for performance)
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

    // Get total count for information
    const totalCount = await BorrowedItemHistory.countDocuments(query);
    
    if (activeBorrowedItems.length < totalCount) {
      console.log(`Warning: Limited to ${activeBorrowedItems.length} items out of ${totalCount} total`);
    }

    res.status(200).json({
      success: true,
      data: activeBorrowedItems,
      totalCount,
      limited: activeBorrowedItems.length < totalCount
    });
  } catch (error) {
    console.error('Error exporting borrowed items:', error);
    res.status(500).json({
      success: false,
      message: 'Error exporting borrowed items'
    });
  }
};

// Export returned items
export const exportReturnedItems = async (req, res) => {
  try {
    const { startDate, endDate, limit = 1000 } = req.query;
    console.log('Received date range:', { startDate, endDate, limit });
    let query = {};

    if (startDate && endDate) {
      // Create UTC dates to avoid timezone issues
      const start = new Date(startDate + 'T00:00:00.000Z');
      const end = new Date(endDate + 'T23:59:59.999Z');

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

    // Parse limit and ensure it's reasonable
    const parsedLimit = Math.min(parseInt(limit) || 1000, 5000); // Max 5000 items

    const returnedItems = await ReturnedItemHistory.find(query)
      .sort({ returnTime: -1 })
      .limit(parsedLimit)
      .lean(); // Use lean() for better performance

    // Get total count for information
    const totalCount = await ReturnedItemHistory.countDocuments(query);
    
    if (returnedItems.length < totalCount) {
      console.log(`Warning: Limited to ${returnedItems.length} items out of ${totalCount} total`);
    }

    res.status(200).json({
      success: true,
      data: returnedItems,
      totalCount,
      limited: returnedItems.length < totalCount
    });
  } catch (error) {
    console.error('Error exporting returned items:', error);
    res.status(500).json({
      success: false,
      message: 'Error exporting returned items'
    });
  }
}; 