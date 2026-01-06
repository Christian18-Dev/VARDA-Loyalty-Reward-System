  import mongoose from 'mongoose';

const feedbackSchema = new mongoose.Schema({
  studentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  studentIdNumber: {
    type: String,
    required: true
  },
  university: {
    type: String,
    required: true
  },
  ratings: {
    taste: { type: Number, required: true, min: 1, max: 5 },
    variety: { type: Number, required: true, min: 1, max: 5 },
    value: { type: Number, required: true, min: 1, max: 5 },
    dietary: { type: Number, required: true, min: 1, max: 5 },
    portion: { type: Number, required: true, min: 1, max: 5 },
    speed: { type: Number, required: true, min: 1, max: 5 },
    cleanliness: { type: Number, required: true, min: 1, max: 5 },
    service: { type: Number, required: true, min: 1, max: 5 }
  },
  overallComment: {
    type: String,
    required: true
  },
  submissionType: {
    type: String,
    enum: ['points', 'survey'],
    default: 'points'
  }
}, { timestamps: true });

const Feedback = mongoose.model('Feedback', feedbackSchema);

export default Feedback;
