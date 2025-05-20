import BorrowedItem from '../models/BorrowedItem.js';

export const createBorrowedItem = async (req, res) => {
  try {
    const { items } = req.body;
    const studentId = req.user._id;
    const studentName = req.user.name;

    const borrowedItem = new BorrowedItem({
      studentId,
      studentName,
      items,
      status: 'borrowed',
      borrowTime: new Date()
    });

    await borrowedItem.save();

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