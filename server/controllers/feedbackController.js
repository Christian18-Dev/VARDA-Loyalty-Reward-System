import Feedback from '../models/Feedback.js';

export const submitFeedback = async (req, res) => {
  try {
    const { ratings, overallComment } = req.body;
    const studentId = req.user._id;
    const studentIdNumber = req.user.idNumber;

    // Check for existing feedback from the same student within the last 5 minutes
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    const existingFeedback = await Feedback.findOne({
      studentId,
      createdAt: { $gte: fiveMinutesAgo }
    });

    if (existingFeedback) {
      return res.status(400).json({
        success: false,
        message: 'You have already submitted feedback recently. Please wait a few minutes before submitting again.'
      });
    }

    const feedback = new Feedback({
      studentId,
      studentIdNumber,
      ratings,
      overallComment
    });

    await feedback.save();

    res.status(201).json({
      success: true,
      message: 'Feedback submitted successfully',
      data: feedback
    });
  } catch (error) {
    console.error('Error submitting feedback:', error);
    res.status(500).json({
      success: false,
      message: 'Error submitting feedback'
    });
  }
};

export const getFeedback = async (req, res) => {
  try {
    const feedback = await Feedback.find()
      .populate('studentId', 'name idNumber')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      data: feedback
    });
  } catch (error) {
    console.error('Error fetching feedback:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching feedback'
    });
  }
};

export const getFeedbackStats = async (req, res) => {
  try {
    const feedback = await Feedback.find();
    
    // Initialize stats object
    const stats = {
      taste: 0,
      variety: 0,
      value: 0,
      dietary: 0,
      portion: 0,
      speed: 0,
      cleanliness: 0,
      service: 0,
      totalFeedbacks: feedback.length
    };

    // Calculate total ratings for each category
    feedback.forEach(item => {
      Object.keys(item.ratings).forEach(category => {
        stats[category] += item.ratings[category];
      });
    });

    res.status(200).json(stats);
  } catch (error) {
    console.error('Error fetching feedback stats:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching feedback statistics'
    });
  }
}; 