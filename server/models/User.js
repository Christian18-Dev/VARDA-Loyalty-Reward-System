import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
  firstName: { type: String, required: true },
  lastName: { type: String, required: true },
  password: { type: String, required: true },
  idNumber: { type: String, required: true, unique: true },
  role: {
    type: String,
    enum: ['student', 'teacher', 'ateneoStaff', 'cashier', 'admin'],
    default: 'student'
  },
  points: { type: Number, default: 0 },   // Current available points
  pointsUsed: { type: Number, default: 0 }, // Total points spent by user
  termsAccepted: { type: Boolean, default: false },
  termsAcceptedAt: { type: Date }
}, {
  // Ensure we don't have any unwanted indexes
  autoIndex: false
});

const User = mongoose.model('User', userSchema);

// Drop any existing indexes on the collection
User.collection.dropIndexes().catch(err => {
  console.log('No indexes to drop or error dropping indexes:', err);
});

export default User;
