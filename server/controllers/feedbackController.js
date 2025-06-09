import Feedback from '../models/Feedback.js';

export const submitFeedback = async (req, res) => {
  try {
    const { ratings, overallComment } = req.body;
    const studentId = req.user._id;
    const studentIdNumber = req.user.idNumber;

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