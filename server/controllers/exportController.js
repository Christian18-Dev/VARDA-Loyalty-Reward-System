import { BorrowedItemHistory } from '../models/BorrowedItemHistory.js';
import { ReturnedItemHistory } from '../models/ReturnedItemHistory.js';

// Export borrowed items
export const exportBorrowedItems = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    console.log('Received date range:', { startDate, endDate });
    let query = { status: 'borrowed' };

    if (startDate && endDate) {
      // Create UTC dates to avoid timezone issues
      const start = new Date(startDate + 'T00:00:00.000Z');
      const end = new Date(endDate + 'T23:59:59.999Z');

      console.log('Query date range:', {
        start: start.toISOString(),
        end: end.toISOString()
      });

      query.borrowTime = {
        $gte: start,
        $lte: end
      };
    }

    const borrowedItems = await BorrowedItemHistory.find(query)
      .sort({ borrowTime: -1 });

    console.log('Found items:', borrowedItems.length);
    if (borrowedItems.length > 0) {
      console.log('Sample item borrow time:', borrowedItems[0].borrowTime);
    }

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
    console.log('Received date range:', { startDate, endDate });
    let query = {};

    if (startDate && endDate) {
      // Create UTC dates to avoid timezone issues
      const start = new Date(startDate + 'T00:00:00.000Z');
      const end = new Date(endDate + 'T23:59:59.999Z');

      console.log('Query date range:', {
        start: start.toISOString(),
        end: end.toISOString()
      });

      query.returnTime = {
        $gte: start,
        $lte: end
      };
    }

    const returnedItems = await ReturnedItemHistory.find(query)
      .sort({ returnTime: -1 });

    console.log('Found items:', returnedItems.length);
    if (returnedItems.length > 0) {
      console.log('Sample item return time:', returnedItems[0].returnTime);
    }

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