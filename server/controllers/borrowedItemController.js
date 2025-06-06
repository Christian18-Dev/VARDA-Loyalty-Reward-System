import { BorrowedItemHistory } from '../models/BorrowedItemHistory.js';
import { ReturnedItemHistory } from '../models/ReturnedItemHistory.js';
import User from '../models/User.js';

export const createBorrowedItem = async (req, res) => {
  try {
    const { items, studentId, timestamp } = req.body;
    console.log('Creating borrowed item for student ID:', studentId);

    // First verify the user exists
    const user = await User.findById(studentId);
    if (!user) {
      console.log('User not found with ID:', studentId);
      return res.status(404).json({
        success: false,
        message: 'Student not found'
      });
    }

    // Check for existing borrow with the same timestamp
    const existingBorrow = await BorrowedItemHistory.findOne({
      studentId: user._id,
      borrowTime: new Date(timestamp),
      status: 'borrowed'
    });

    if (existingBorrow) {
      console.log('Duplicate borrow attempt detected for student:', user.idNumber);
      return res.status(400).json({
        success: false,
        message: 'This borrow request has already been processed'
      });
    }

    // Create borrowed item record
    const borrowedItem = new BorrowedItemHistory({
      studentId: user._id,
      studentIdNumber: user.idNumber,
      items,
      status: 'borrowed',
      borrowTime: new Date(timestamp) // Use the timestamp from the QR code
    });

    await borrowedItem.save();
    console.log('Created borrowed item record for student:', user.idNumber);

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
    let query = {};

    // Filter by user's ID for student, teacher, and ateneo staff roles
    if (req.user && ['student', 'teacher', 'ateneostaff', 'catering'].includes(req.user.role.toLowerCase())) {
      query.studentId = req.user._id;
    }

    if (startDate && endDate) {
      query.borrowTime = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    }

    // Get all borrowed items
    const borrowedItems = await BorrowedItemHistory.find(query)
      .sort({ borrowTime: -1 });

    // Get all returned items
    const returnedItems = await ReturnedItemHistory.find({
      studentId: { $in: borrowedItems.map(item => item.studentId) }
    });

    // Filter out items that have been returned
    const activeBorrowedItems = borrowedItems.filter(borrowedItem => {
      return !returnedItems.some(returnedItem => 
        returnedItem.studentId.toString() === borrowedItem.studentId.toString() &&
        returnedItem.borrowTime.getTime() === borrowedItem.borrowTime.getTime() &&
        returnedItem.items[0].name === borrowedItem.items[0].name
      );
    });
    
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

    const borrowedItem = await BorrowedItemHistory.findById(id);
    console.log('Found borrowed item:', borrowedItem);
    
    if (!borrowedItem) {
      return res.status(404).json({
        success: false,
        message: 'Borrowed item not found'
      });
    }

    // Check if item is already in ReturnedItemHistory
    const existingReturn = await ReturnedItemHistory.findOne({
      studentId: borrowedItem.studentId,
      'items.name': borrowedItem.items[0].name,
      borrowTime: borrowedItem.borrowTime
    });

    if (existingReturn) {
      return res.status(400).json({
        success: false,
        message: 'Item is already returned'
      });
    }

    const returnTime = new Date();

    // Create returned history record
    const returnedItemHistory = new ReturnedItemHistory({
      studentId: borrowedItem.studentId,
      studentIdNumber: borrowedItem.studentIdNumber,
      items: borrowedItem.items,
      borrowTime: borrowedItem.borrowTime,
      returnTime: returnTime,
      status: 'returned'
    });
    await returnedItemHistory.save();

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
      query.borrowTime = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
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
      query.returnTime = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    }

    const history = await ReturnedItemHistory.find(query)
      .sort({ returnTime: -1 });
    
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
    console.log('Processing return QR for student ID:', studentId);

    // Find the borrowed item for this student that matches the timestamp
    const borrowedItem = await BorrowedItemHistory.findOne({
      studentId,
      borrowTime: new Date(timestamp),
      status: 'borrowed'
    });

    if (!borrowedItem) {
      return res.status(404).json({
        success: false,
        message: 'No borrowed item found for this student with the given timestamp'
      });
    }

    // Check if item is already in ReturnedItemHistory
    const existingReturn = await ReturnedItemHistory.findOne({
      studentId: borrowedItem.studentId,
      borrowTime: borrowedItem.borrowTime,
      status: 'returned'
    });

    if (existingReturn) {
      return res.status(400).json({
        success: false,
        message: 'This order has already been returned'
      });
    }

    const returnTime = new Date();

    // Create returned history record
    const returnedItemHistory = new ReturnedItemHistory({
      studentId: borrowedItem.studentId,
      studentIdNumber: borrowedItem.studentIdNumber,
      items: borrowedItem.items,
      borrowTime: borrowedItem.borrowTime,
      returnTime: returnTime,
      status: 'returned'
    });
    await returnedItemHistory.save();

    res.status(200).json({
      success: true,
      data: returnedItemHistory
    });
  } catch (error) {
    console.error('Error processing return QR:', error);
    res.status(500).json({
      success: false,
      message: 'Error processing return QR'
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