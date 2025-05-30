import { BorrowedItemHistory } from '../models/BorrowedItemHistory.js';
import { ReturnedItemHistory } from '../models/ReturnedItemHistory.js';

// Export borrowed items
export const exportBorrowedItems = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    let query = { status: 'borrowed' };

    if (startDate && endDate) {
      // Set start date to beginning of day (00:00:00)
      const start = new Date(startDate);
      start.setHours(0, 0, 0, 0);

      // Set end date to end of day (23:59:59.999)
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);

      query.borrowTime = {
        $gte: start,
        $lte: end
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
      // Set start date to beginning of day (00:00:00)
      const start = new Date(startDate);
      start.setHours(0, 0, 0, 0);

      // Set end date to end of day (23:59:59.999)
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);

      query.returnTime = {
        $gte: start,
        $lte: end
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