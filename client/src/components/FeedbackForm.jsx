import React, { useState } from 'react';
import { motion } from 'framer-motion';
import twoGonzLogo from '../assets/2gonzlogo.png';

const FeedbackForm = ({ onSubmit, onClose }) => {
  const [ratings, setRatings] = useState({
    taste: 0,
    variety: 0,
    value: 0,
    dietary: 0,
    portion: 0,
    speed: 0,
    cleanliness: 0,
    service: 0
  });
  const [overallComment, setOverallComment] = useState('');
  const [showThankYou, setShowThankYou] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const categories = [
    { key: 'taste', label: 'Taste/Flavor' },
    { key: 'variety', label: 'Variety' },
    { key: 'value', label: 'Value for Money' },
    { key: 'dietary', label: 'Special Dietary Needs' },
    { key: 'portion', label: 'Portion Size' },
    { key: 'speed', label: 'Speed of Service' },
    { key: 'cleanliness', label: 'Cleanliness' },
    { key: 'service', label: 'Customer Service' }
  ];

  const handleRatingChange = (category, value) => {
    if (isSubmitting) return; // Prevent changes while submitting
    setRatings(prev => ({
      ...prev,
      [category]: value
    }));
    setError(''); // Clear error when user makes changes
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isSubmitting) return; // Prevent multiple submissions
    setError(''); // Clear any previous errors

    // Validate that all ratings are provided
    const allRatingsProvided = Object.values(ratings).every(rating => rating > 0);
    if (!allRatingsProvided) {
      setError('Please provide ratings for all categories');
      return;
    }

    if (!overallComment.trim()) {
      setError('Please provide an overall comment');
      return;
    }

    try {
      setIsSubmitting(true);
      const success = await onSubmit({
        ratings,
        overallComment
      });
      
      if (success) {
        setShowThankYou(true);
      }
    } catch (error) {
      console.error('Error submitting feedback:', error);
      setError(error.message || 'Failed to submit feedback. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (showThankYou) {
    return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm">
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          className="bg-[#1e293b] rounded-2xl p-6 max-w-sm w-full shadow-xl border-2 border-gray-700/50"
        >
          <div className="text-center space-y-4">
            <div className="w-16 h-16 bg-green-900/50 rounded-full flex items-center justify-center mx-auto">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h3 className="text-xl font-bold text-gray-200">Thank You!</h3>
            <p className="text-gray-300">Thank you for submitting your feedback!</p>
            <button
              onClick={onClose}
              className="w-full py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-all"
            >
              Close
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="bg-[#1e293b] rounded-2xl p-4 sm:p-6 max-w-[95%] sm:max-w-md md:max-w-lg lg:max-w-2xl w-full shadow-xl border-2 border-gray-700/50 overflow-y-auto max-h-[90vh]"
      >
        <div className="text-center mb-4 sm:mb-6">
          <div className="flex justify-center mb-4">
            <img src={twoGonzLogo} alt="2Gonz Logo" className="h-12 sm:h-16" />
          </div>
          <h3 className="text-xl sm:text-2xl font-bold text-gray-200">Feedback Form</h3>
          <p className="text-gray-400 mt-2 text-sm">Please rate your experience with our service.</p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-900/30 border border-red-700/50 rounded-lg">
            <p className="text-red-400 text-sm">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
          {categories.map(({ key, label }) => (
            <div key={key} className="space-y-2">
              <label className="block text-gray-200 font-bold text-sm sm:text-base">{label}</label>
              <div className="flex space-x-2 sm:space-x-3 justify-center sm:justify-start">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => handleRatingChange(key, star)}
                    disabled={isSubmitting}
                    className={`p-2 rounded-full transition-all transform hover:scale-110 ${
                      ratings[key] >= star
                        ? 'bg-yellow-400/20 text-yellow-400 hover:bg-yellow-400/30'
                        : 'bg-gray-700/50 text-gray-400 hover:bg-gray-600/50'
                    } ${isSubmitting ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    <svg
                      className="w-7 h-7 sm:w-8 sm:h-8"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                  </button>
                ))}
              </div>
            </div>
          ))}

          <div className="space-y-2">
            <label className="block text-gray-200 font-bold text-sm sm:text-base">
              Overall Satisfaction 
            </label>
            <textarea
              value={overallComment}
              onChange={(e) => setOverallComment(e.target.value)}
              disabled={isSubmitting}
              required
              className={`w-full px-3 py-2 bg-gray-800 text-gray-200 rounded-xl border border-gray-700 focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm ${
                isSubmitting ? 'opacity-50 cursor-not-allowed' : ''
              }`}
              rows="3"
              placeholder="Please share your overall experience..."
            />
          </div>

          <div className="pt-4">
            <div className="flex gap-4">
              <button
                type="button"
                onClick={onClose}
                disabled={isSubmitting}
                className={`w-full px-4 py-2 sm:px-6 sm:py-3 bg-gray-600 text-white rounded-xl font-bold hover:bg-gray-700 transition-all text-sm sm:text-base ${
                  isSubmitting ? 'opacity-50 cursor-not-allowed' : ''
                }`}
              >
                Skip
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className={`w-full px-4 py-2 sm:px-6 sm:py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-all text-sm sm:text-base ${
                  isSubmitting ? 'opacity-50 cursor-not-allowed' : ''
                }`}
              >
                {isSubmitting ? 'Submitting...' : 'Submit Feedback'}
              </button>
            </div>
          </div>
        </form>
      </motion.div>
    </div>
  );
};

export default FeedbackForm; 