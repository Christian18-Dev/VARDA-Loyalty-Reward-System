import mongoose from 'mongoose';

const voucherSchema = new mongoose.Schema(
  {
    voucherCode: {
      type: String,
      required: true,
      unique: true,
      index: true
    },
    idNumber: {
      type: String,
      required: true,
      index: true
    },
    accountID: {
      type: Number,
      default: null
    },
    limaBatch: {
      type: String,
      default: null
    },
    firstName: {
      type: String,
      default: ''
    },
    lastName: {
      type: String,
      default: ''
    },
    studentName: {
      type: String,
      required: true
    },
    mealDate: {
      // YYYY-MM-DD in Philippine Time
      type: String,
      required: true,
      index: true
    },
    voucherType: {
      type: String,
      default: 'unclaimed_breakfast'
    },
    title: {
      type: String,
      default: 'Breakfast'
    },
    description: {
      type: String,
      default: 'Breakfast compensation voucher — valid until 11:00 PM PH time today'
    },
    status: {
      type: String,
      enum: ['unclaimed', 'claimed', 'expired'],
      default: 'unclaimed',
      index: true
    },
    issuedAt: {
      type: Date,
      default: Date.now
    },
    expiresAt: {
      type: Date,
      required: true
    },
    claimedAt: {
      type: Date,
      default: null
    }
  },
  { timestamps: true }
);

// Ensure at most one unclaimed_breakfast voucher per student per PH mealDate
voucherSchema.index({ idNumber: 1, mealDate: 1, voucherType: 1 }, { unique: true });

export default mongoose.model('Voucher', voucherSchema);

