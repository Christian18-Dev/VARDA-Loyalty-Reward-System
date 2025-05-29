import { BorrowedItemHistory } from '../models/BorrowedItemHistory.js';
import { ReturnedItemHistory } from '../models/ReturnedItemHistory.js';

// Export borrowed items
export const exportBorrowedItems = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    let query = { status: 'borrowed' };

    if (startDate && endDate) {
      query.borrowTime = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    }

    const borrowedItems = await BorrowedItemHistory.find(query)
      .sort({ borrowTime: -1 });

    res.status(200).json({
      success: true,
      data: borrowedItems
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
    const { startDate, endDate } = req.query;
    let query = {};

    if (startDate && endDate) {
      query.returnTime = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    }

    const returnedItems = await ReturnedItemHistory.find(query)
      .sort({ returnTime: -1 });

    res.status(200).json({
      success: true,
      data: returnedItems
    });
  } catch (error) {
    console.error('Error exporting returned items:', error);
    res.status(500).json({
      success: false,
      message: 'Error exporting returned items'
    });
  }
}; 