import mongoose from 'mongoose';

const notificationSchema = new mongoose.Schema({
  studentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  studentIdNumber: {
    type: String,
    required: true
  },
  message: {
    type: String,
    required: true
  },
  type: {
    type: String,
    enum: ['overdue', 'reminder', 'warning'],
    default: 'reminder'
  },
  isRead: {
    type: Boolean,
    default: false
  },
  relatedBorrowedItem: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'BorrowedItemHistory'
  }
}, {
  timestamps: true
});

const Notification = mongoose.model('Notification', notificationSchema);

export { Notification }; 