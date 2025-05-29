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

const BorrowedItemHistory = mongoose.model('BorrowedItemHistory', borrowedItemHistorySchema);

export { BorrowedItemHistory }; 