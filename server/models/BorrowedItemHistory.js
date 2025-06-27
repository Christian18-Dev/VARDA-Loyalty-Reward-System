import mongoose from 'mongoose';

const borrowedItemHistorySchema = new mongoose.Schema({
  studentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  studentIdNumber: {
    type: String,
    required: true
  },
  items: [{
    name: {
      type: String,
      required: true
    },
    quantity: {
      type: Number,
      required: true,
      min: 1
    }
  }],
  borrowTime: {
    type: Date,
    default: Date.now
  },
  returnTime: {
    type: Date
  },
  status: {
    type: String,
    enum: ['borrowed', 'returned'],
    default: 'borrowed'
  }
}, {
  timestamps: true
});

// Add indexes for better query performance
borrowedItemHistorySchema.index({ studentId: 1, status: 1 });
borrowedItemHistorySchema.index({ studentId: 1, borrowTime: 1, status: 1 });
borrowedItemHistorySchema.index({ borrowTime: -1 });
borrowedItemHistorySchema.index({ status: 1, borrowTime: -1 });

const BorrowedItemHistory = mongoose.model('BorrowedItemHistory', borrowedItemHistorySchema);

export { BorrowedItemHistory }; 