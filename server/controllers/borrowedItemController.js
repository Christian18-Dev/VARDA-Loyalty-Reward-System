import BorrowedItem from '../models/BorrowedItem.js';
import User from '../models/User.js';

export const createBorrowedItem = async (req, res) => {
  try {
    const { items, studentName, studentId } = req.body;
    console.log('Creating borrowed item for student:', { studentName, studentId });

    // First verify the user exists
    const user = await User.findById(studentId);
    if (!user) {
      console.log('User not found with ID:', studentId);
      return res.status(404).json({
        success: false,
        message: 'Student not found'
      });
    }

    const borrowedItem = new BorrowedItem({
      studentId: user._id, // Use the verified user's ID
      studentName: user.name, // Use the verified user's name
      items,
      status: 'borrowed',
      borrowTime: new Date()
    });

    await borrowedItem.save();
    console.log('Created borrowed item:', borrowedItem);

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
    const borrowedItems = await BorrowedItem.find()
      .sort({ borrowTime: -1 }); // Sort by borrow time, newest first
    
    res.status(200).json({
      success: true,
      data: borrowedItems
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

    const borrowedItem = await BorrowedItem.findById(id);
    console.log('Found borrowed item:', borrowedItem);
    
    if (!borrowedItem) {
      return res.status(404).json({
        success: false,
        message: 'Borrowed item not found'
      });
    }

    if (borrowedItem.status === 'returned') {
      return res.status(400).json({
        success: false,
        message: 'Item is already returned'
      });
    }

    // Update borrowed item status
    borrowedItem.status = 'returned';
    borrowedItem.returnTime = new Date();
    await borrowedItem.save();
    console.log('Updated borrowed item status to returned');

    // Add points to user's account
    try {
      console.log('Looking for user with ID:', borrowedItem.studentId);
      const user = await User.findById(borrowedItem.studentId);
      
      if (user) {
        console.log('Found user:', user.name, 'Current points:', user.points);
        // Ensure points is a number
        const currentPoints = Number(user.points) || 0;
        user.points = currentPoints + 1;
        await user.save();
        console.log('Updated user points. New points:', user.points);
      } else {
        console.log('User not found for studentId:', borrowedItem.studentId);
        // Try to find user by email or other identifier if needed
        const alternativeUser = await User.findOne({ email: borrowedItem.studentName });
        if (alternativeUser) {
          console.log('Found user by alternative method:', alternativeUser.name);
          const currentPoints = Number(alternativeUser.points) || 0;
          alternativeUser.points = currentPoints + 1;
          await alternativeUser.save();
          console.log('Updated user points. New points:', alternativeUser.points);
        }
      }
    } catch (userError) {
      console.error('Error updating user points:', userError);
      // Continue with the return process even if points update fails
    }

    res.status(200).json({
      success: true,
      data: borrowedItem,
      pointsAdded: true
    });
  } catch (error) {
    console.error('Error returning borrowed item:', error);
    res.status(500).json({
      success: false,
      message: 'Error returning borrowed item'
    });
  }
}; 