import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: {
    type: String,
    enum: ['student', 'cashier', 'admin'],
    default: 'student'
  },
  points: { type: Number, default: 0 },   // Current available points
  pointsUsed: { type: Number, default: 0 } // Total points spent by user
});

const User = mongoose.model('User', userSchema);
export default User;
