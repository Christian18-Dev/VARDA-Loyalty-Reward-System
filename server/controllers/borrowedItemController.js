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