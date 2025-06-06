import { Notification } from '../models/Notification.js';
import { BorrowedItemHistory } from '../models/BorrowedItemHistory.js';
import User from '../models/User.js';

// Create a notification for a specific user
export const createNotification = async (req, res) => {
  try {
    const { studentId, message, type, relatedBorrowedItem } = req.body;

    const user = await User.findById(studentId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const notification = new Notification({
      studentId: user._id,
      studentIdNumber: user.idNumber,
      message,
      type,
      relatedBorrowedItem
    });

    await notification.save();

    res.status(201).json({
      success: true,
      data: notification
    });
  } catch (error) {
    console.error('Error creating notification:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating notification'
    });
  }
};

// Get notifications for a specific user
export const getUserNotifications = async (req, res) => {
  try {
    if (!req.user || !req.user._id) {
      return res.status(401).json({
        success: false,
        message: 'User not authenticated'
      });
    }

    const notifications = await Notification.find({ studentId: req.user._id })
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      data: notifications
    });
  } catch (error) {
    console.error('Error fetching notifications:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching notifications'
    });
  }
};

// Mark notification as read
export const markNotificationAsRead = async (req, res) => {
  try {
    const { id } = req.params;
    const notification = await Notification.findByIdAndUpdate(
      id,
      { isRead: true },
      { new: true }
    );

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: 'Notification not found'
      });
    }

    res.status(200).json({
      success: true,
      data: notification
    });
  } catch (error) {
    console.error('Error marking notification as read:', error);
    res.status(500).json({
      success: false,
      message: 'Error marking notification as read'
    });
  }
};

// Create notifications for overdue items
export const createOverdueNotifications = async () => {
  try {
    const borrowedItems = await BorrowedItemHistory.find({ status: 'borrowed' });
    const now = new Date();
    const OVERDUE_THRESHOLD = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

    for (const item of borrowedItems) {
      const borrowTime = new Date(item.borrowTime);
      const timeDiff = now - borrowTime;

      if (timeDiff > OVERDUE_THRESHOLD) {
        // Check if notification already exists
        const existingNotification = await Notification.findOne({
          studentId: item.studentId,
          relatedBorrowedItem: item._id,
          type: 'overdue'
        });

        if (!existingNotification) {
          const message = `Reminder: You have overdue items that need to be returned. Please return the following items: ${item.items.map(i => i.name).join(', ')}`;
          
          await Notification.create({
            studentId: item.studentId,
            studentIdNumber: item.studentIdNumber,
            message,
            type: 'overdue',
            relatedBorrowedItem: item._id
          });
        }
      }
    }
  } catch (error) {
    console.error('Error creating overdue notifications:', error);
  }
}; 