import mongoose from 'mongoose';

const returnedItemHistorySchema = new mongoose.Schema({
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
      required: true
    }
  }],
  borrowTime: {
    type: Date,
    required: true
  },
  returnTime: {
    type: Date,
    default: Date.now
  },
  status: {
    type: String,
    enum: ['returned'],
    default: 'returned'
  }
}, { timestamps: true });

const ReturnedItemHistory = mongoose.model('ReturnedItemHistory', returnedItemHistorySchema);

export { ReturnedItemHistory }; 