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
    
    // Initialize stats object with default values
    const stats = {
      taste: 0,
      variety: 0,
      value: 0,
      dietary: 0,
      portion: 0,
      speed: 0,
      cleanliness: 0,
      service: 0,
      totalFeedbacks: feedback.length || 0 // Ensure it's never undefined
    };

    // Only calculate if there are feedbacks
    if (feedback.length > 0) {
      // Calculate total ratings for each category
      feedback.forEach(item => {
        if (item.ratings) { // Check if ratings exist
          Object.keys(item.ratings).forEach(category => {
            const rating = Number(item.ratings[category]);
            // Only add valid numbers
            if (!isNaN(rating) && rating >= 1 && rating <= 5) {
              stats[category] += rating;
            }
          });
        }
      });
    }

    // Ensure all values are numbers
    Object.keys(stats).forEach(key => {
      if (key !== 'totalFeedbacks') {
        stats[key] = Number(stats[key]) || 0;
      }
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

// Export feedback data with date filtering
export const exportFeedback = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    console.log('Received feedback export date range:', { startDate, endDate });
    let query = {};

    if (startDate && endDate) {
      // Create UTC dates to avoid timezone issues
      const start = new Date(startDate + 'T00:00:00.000Z');
      const end = new Date(endDate + 'T23:59:59.999Z');

      console.log('Feedback query date range:', {
        start: start.toISOString(),
        end: end.toISOString()
      });

      query.createdAt = {
        $gte: start,
        $lte: end
      };
    }

    const feedback = await Feedback.find(query)
      .populate('studentId', 'name idNumber')
      .sort({ createdAt: -1 });

    console.log('Found feedback items:', feedback.length);
    if (feedback.length > 0) {
      console.log('Sample feedback creation time:', feedback[0].createdAt);
    }

    res.status(200).json({
      success: true,
      data: feedback
    });
  } catch (error) {
    console.error('Error exporting feedback:', error);
    res.status(500).json({
      success: false,
      message: 'Error exporting feedback data'
    });
  }
}; 