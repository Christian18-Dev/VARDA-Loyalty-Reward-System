import mongoose from 'mongoose';

const borrowedItemSchema = new mongoose.Schema({
  studentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  studentName: {
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
      required: true
    }
  }],
  status: {
    type: String,
    enum: ['borrowed', 'returned'],
    default: 'borrowed'
  },
  borrowTime: {
    type: Date,
    default: Date.now
  },
  returnTime: {
    type: Date
  }
}, { timestamps: true });

const BorrowedItem = mongoose.model('BorrowedItem', borrowedItemSchema);

export default BorrowedItem;