import Feedback from '../models/Feedback.js';
import User from '../models/User.js';

export const submitFeedback = async (req, res) => {
  try {
    const { ratings, overallComment } = req.body;
    const studentId = req.user._id;
    const studentIdNumber = req.user.idNumber;

    // Get current time in Philippine Time (UTC+8)
    const now = new Date();
    
    // Create a date object for 6 AM today in Philippine Time
    const resetTime = new Date(now);
    resetTime.setHours(6, 0, 0, 0); // 6 AM Philippine Time
    
    // If it's before 6 AM, check from yesterday's 6 AM
    if (now < resetTime) {
      resetTime.setDate(resetTime.getDate() - 1);
    }
    
    // Check for existing feedback from the same student since last reset time
    const existingFeedback = await Feedback.findOne({
      studentId,
      createdAt: { $gte: resetTime }
    });

    if (existingFeedback) {
      return res.status(400).json({
        success: false,
        message: 'You have already submitted feedback today. You can submit again tomorrow.'
      });
    }

    const feedback = new Feedback({
      studentId,
      studentIdNumber,
      ratings,
      overallComment
    });

    await feedback.save();

    // Award 3 points for submitting feedback
    const pointsToAward = 3;
    const user = await User.findById(studentId);
    if (user) {
      user.points += pointsToAward;
      await user.save();
    }

    res.status(201).json({
      success: true,
      message: 'Feedback submitted successfully',
      pointsAwarded: pointsToAward,
      newPoints: user ? user.points : 0,
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

export const submitSurveyFeedback = async (req, res) => {
  try {
    const { ratings, overallComment } = req.body;
    const studentId = req.user._id;
    const studentIdNumber = req.user.idNumber;

    const feedback = new Feedback({
      studentId,
      studentIdNumber,
      ratings,
      overallComment,
      submissionType: 'survey'
    });

    await feedback.save();

    res.status(201).json({
      success: true,
      message: 'Feedback submitted successfully',
      data: feedback
    });
  } catch (error) {
    console.error('Error submitting survey feedback:', error);
    res.status(500).json({
      success: false,
      message: 'Error submitting feedback'
    });
  }
};

export const getFeedbackComments = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    // Build the date filter
    let dateFilter = {};
    if (startDate && endDate) {
      const start = new Date(startDate);
      start.setHours(0, 0, 0, 0); // Start of day
      
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999); // End of day
      
      dateFilter.createdAt = {
        $gte: start,
        $lte: end
      };
    }

    // Fetch feedback comments with date filtering and populate user data
    const feedbackComments = await Feedback.find(dateFilter)
      .populate('studentId', 'name idNumber')
      .sort({ createdAt: -1 })
      .lean(); // Use lean() for better performance

    // Transform the data for export
    const transformedComments = feedbackComments.map(feedback => ({
      createdAt: feedback.createdAt,
      studentIdNumber: feedback.studentId?.idNumber || feedback.studentIdNumber || 'N/A',
      studentName: feedback.studentId?.name || 'N/A',
      taste: feedback.ratings?.taste || 0,
      variety: feedback.ratings?.variety || 0,
      value: feedback.ratings?.value || 0,
      dietary: feedback.ratings?.dietary || 0,
      portion: feedback.ratings?.portion || 0,
      speed: feedback.ratings?.speed || 0,
      cleanliness: feedback.ratings?.cleanliness || 0,
      service: feedback.ratings?.service || 0,
      comments: feedback.overallComment || 'No comments',
      overallRating: feedback.ratings ? 
        Object.values(feedback.ratings).reduce((sum, rating) => sum + (Number(rating) || 0), 0) / 
        Object.keys(feedback.ratings).length : 0
    }));

    res.status(200).json({
      success: true,
      feedbackComments: transformedComments,
      totalCount: transformedComments.length,
      dateRange: {
        startDate,
        endDate
      }
    });
  } catch (error) {
    console.error('Error fetching feedback comments:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching feedback comments'
    });
  }
};
