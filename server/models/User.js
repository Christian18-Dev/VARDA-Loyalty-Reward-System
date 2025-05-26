import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  firstName: { type: String, required: true },
  lastName: { type: String, required: true },
  password: { type: String, required: true },
  idNumber: { type: String, required: true, unique: true },
  role: {
    type: String,
    enum: ['student', 'cashier', 'admin'],
    default: 'student'
  },
  points: { type: Number, default: 0 },   // Current available points
  pointsUsed: { type: Number, default: 0 }, // Total points spent by user
  termsAccepted: { type: Boolean, default: false },
  termsAcceptedAt: { type: Date }
});

const User = mongoose.model('User', userSchema);
export default User;
