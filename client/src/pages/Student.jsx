import { useEffect, useState, useCallback, useRef } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { HomeIcon, TicketIcon, GiftIcon, LogoutIcon, TrashIcon } from '@heroicons/react/outline';
import { motion, AnimatePresence } from 'framer-motion';
import confetti from 'canvas-confetti';
import logo from '../assets/varda.svg';
import bgImage from '../assets/vardabg.png';
import FeedbackForm from '../components/FeedbackForm';

// Level configuration system
const LOYALTY_LEVELS = {
  BRONZE: {
    name: 'Bronze',
    minPoints: 0,
    maxPoints: 49,
    color: '#CD7F32',
    gradient: 'from-amber-600 via-orange-500 to-amber-700',
    bgGradient: 'from-amber-100 via-orange-200 to-amber-300',
    textColor: 'text-amber-900',
    borderColor: 'border-amber-400',
    icon: '🥉',
    description: 'Getting Started',
    perks: ['Basic rewards access', 'Standard support']
  },
  SILVER: {
    name: 'Silver',
    minPoints: 50,
    maxPoints: 149,
    color: '#C0C0C0',
    gradient: 'from-gray-400 via-gray-300 to-gray-500',
    bgGradient: 'from-gray-100 via-gray-200 to-gray-300',
    textColor: 'text-gray-800',
    borderColor: 'border-gray-400',
    icon: '🥈',
    description: 'Loyal Customer',
    perks: ['Priority support', 'Exclusive rewards', 'Faster processing']
  },
  GOLD: {
    name: 'Gold',
    minPoints: 150,
    maxPoints: 299,
    color: '#FFD700',
    gradient: 'from-yellow-400 via-yellow-300 to-yellow-600',
    bgGradient: 'from-yellow-100 via-yellow-200 to-yellow-300',
    textColor: 'text-yellow-900',
    borderColor: 'border-yellow-400',
    icon: '🥇',
    description: 'VIP Member',
    perks: ['Premium rewards', 'VIP support', 'Special events', 'Bonus points']
  },
  PLATINUM: {
    name: 'Platinum',
    minPoints: 300,
    maxPoints: 499,
    color: '#E5E4E2',
    gradient: 'from-gray-200 via-gray-100 to-gray-300',
    bgGradient: 'from-gray-50 via-gray-100 to-gray-200',
    textColor: 'text-gray-700',
    borderColor: 'border-gray-300',
    icon: '💠',
    description: 'Elite Member',
    perks: ['Elite rewards', 'Personal concierge', 'Exclusive events', 'Double points']
  },
  DIAMOND: {
    name: 'Diamond',
    minPoints: 500,
    maxPoints: Infinity,
    color: '#B9F2FF',
    gradient: 'from-cyan-300 via-blue-200 to-cyan-400',
    bgGradient: 'from-cyan-50 via-blue-100 to-cyan-200',
    textColor: 'text-cyan-900',
    borderColor: 'border-cyan-300',
    icon: '💎',
    description: 'Legendary',
    perks: ['Legendary rewards', 'Unlimited access', 'Founder benefits', 'Triple points']
  }
};

// Helper function to get user's current level
const getUserLevel = (pointsUsed) => {
  for (const [key, level] of Object.entries(LOYALTY_LEVELS)) {
    if (pointsUsed >= level.minPoints && pointsUsed <= level.maxPoints) {
      return { key, ...level };
    }
  }
  return { key: 'BRONZE', ...LOYALTY_LEVELS.BRONZE };
};

// Helper function to get next level
const getNextLevel = (currentLevel) => {
  const levels = Object.entries(LOYALTY_LEVELS);
  const currentIndex = levels.findIndex(([key]) => key === currentLevel.key);
  if (currentIndex < levels.length - 1) {
    const [nextKey, nextLevel] = levels[currentIndex + 1];
    return { key: nextKey, ...nextLevel };
  }
  return null;
};

// Helper function to check for level up
const checkLevelUp = (oldPointsUsed, newPointsUsed, setNewLevel, setPreviousLevel, setShowLevelUpModal) => {
  const oldLevel = getUserLevel(oldPointsUsed);
  const newLevel = getUserLevel(newPointsUsed);
  
  if (oldLevel.key !== newLevel.key) {
    setPreviousLevel(oldLevel);
    setNewLevel(newLevel);
    setShowLevelUpModal(true);
    
    // Trigger confetti celebration
    confetti({
      particleCount: 200,
      spread: 120,
      origin: { y: 0.6 },
      colors: [newLevel.color, '#ffffff', '#f0f0f0']
    });
  }
};

export default function StudentPage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [points, setPoints] = useState(0);
  const [pointsUsed, setPointsUsed] = useState(0);
  const [userLevel, setUserLevel] = useState(LOYALTY_LEVELS.BRONZE);
  const [rewards, setRewards] = useState([]);
  const [code, setCode] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [currentPage, setCurrentPage] = useState('home');
  const [isLoading, setIsLoading] = useState(false);
  const [showClaimModal, setShowClaimModal] = useState(false);
  const [claimedRewardName, setClaimedRewardName] = useState('');
  const [claimTime, setClaimTime] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [verificationError, setVerificationError] = useState('');
  const [showSuccessPopup, setShowSuccessPopup] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [showFeedbackConfirmation, setShowFeedbackConfirmation] = useState(false);
  const [showFeedbackSuccess, setShowFeedbackSuccess] = useState(false);
  const [feedbackSuccessMessage, setFeedbackSuccessMessage] = useState('');
  const [showDailyLimit, setShowDailyLimit] = useState(false);
  const [showCodeSuccessModal, setShowCodeSuccessModal] = useState(false);
  const [codeSuccessMessage, setCodeSuccessMessage] = useState('');
  const [showCodeErrorModal, setShowCodeErrorModal] = useState(false);
  const [codeErrorMessage, setCodeErrorMessage] = useState('');
  const [message, setMessage] = useState({ type: '', text: '' });
  const [error, setError] = useState('');
  const [showFeedbackForm, setShowFeedbackForm] = useState(false);
  const [showMealFeedbackConfirmation, setShowMealFeedbackConfirmation] = useState(false);
  const [showMealFeedbackForm, setShowMealFeedbackForm] = useState(false);
  const [claimedRewards, setClaimedRewards] = useState([]);
  const [isLoadingClaimedRewards, setIsLoadingClaimedRewards] = useState(false);
  const [showLevelUpModal, setShowLevelUpModal] = useState(false);
  const [newLevel, setNewLevel] = useState(null);
  const [previousLevel, setPreviousLevel] = useState(null);
  const [showLevelDetailsModal, setShowLevelDetailsModal] = useState(false);
  const [showClaimedRewardModal, setShowClaimedRewardModal] = useState(false);
  const [selectedClaimedReward, setSelectedClaimedReward] = useState(null);
  const [mealRegistration, setMealRegistration] = useState({
    breakfast: false,
    lunch: false,
    dinner: false
  });
  const [mealsAvailed, setMealsAvailed] = useState({
    breakfast: false,
    lunch: false,
    dinner: false
  });
  const [isLoadingMealRegistration, setIsLoadingMealRegistration] = useState(false);
  const [mealRegistrationMessage, setMealRegistrationMessage] = useState({ type: '', text: '' });
  const [showAvailNotification, setShowAvailNotification] = useState(false);
  const [availedMealType, setAvailedMealType] = useState('');
  const [notifiedMeals, setNotifiedMeals] = useState({ breakfast: false, lunch: false, dinner: false });

  const baseUrl = import.meta.env.VITE_API_BASE_URL;
  const token = user.token;

  // Add fetchUserPoints function
  const fetchUserPoints = async () => {
    try {
      const response = await axios.get(`${baseUrl}/api/student/points`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setPoints(response.data.points);
      setPointsUsed(response.data.pointsUsed || 0);
      
      // Update user level based on points used
      const currentLevel = getUserLevel(response.data.pointsUsed || 0);
      setUserLevel(currentLevel);
    } catch (error) {
      console.error('Error fetching user points:', error);
      setError('Failed to fetch points balance');
    }
  };

  // Add fetchClaimedRewards function
  const fetchClaimedRewards = async () => {
    try {
      setIsLoadingClaimedRewards(true);
      const response = await axios.get(`${baseUrl}/api/student/claimed-rewards`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setClaimedRewards(response.data.data || []);
    } catch (error) {
      console.error('Error fetching claimed rewards:', error);
      setErrorMessage('Failed to fetch claimed rewards');
    } finally {
      setIsLoadingClaimedRewards(false);
    }
  };

  const handleClaimedRewardClick = (claimedReward) => {
    setSelectedClaimedReward(claimedReward);
    setShowClaimedRewardModal(true);
  };

  const closeClaimedRewardModal = () => {
    console.log('Closing claimed reward modal');
    setShowClaimedRewardModal(false);
    setSelectedClaimedReward(null);
  };

  // Call fetchUserPoints when component mounts and when token changes
  useEffect(() => {
    fetchUserPoints();
  }, [token]);

  // Call fetchClaimedRewards when component mounts and when token changes
  useEffect(() => {
    fetchClaimedRewards();
  }, [token]);

  // Use ref to track previous mealsAvailed state to avoid stale closures
  const prevMealsAvailedRef = useRef(mealsAvailed);
  const notifiedMealsRef = useRef({ breakfast: false, lunch: false, dinner: false });
  const hasLocalMealChangesRef = useRef(false); // Track if user has unsaved meal selections

  // Function to show avail notification (can be called from anywhere)
  const showAvailNotificationForMeal = useCallback((mealType) => {
    setAvailedMealType(mealType);
    setShowAvailNotification(true);
  }, []);

  // Fetch meal registration - memoized with useCallback to prevent unnecessary recreations
  const fetchMealRegistration = useCallback(async () => {
    try {
      const response = await axios.get(`${baseUrl}/api/student/meal-registration`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.data.success && response.data.registration) {
        const newMealRegistration = {
          breakfast: response.data.registration.meals.breakfast || false,
          lunch: response.data.registration.meals.lunch || false,
          dinner: response.data.registration.meals.dinner || false
        };
        const newMealsAvailed = {
          breakfast: response.data.registration.mealsAvailed?.breakfast || false,
          lunch: response.data.registration.mealsAvailed?.lunch || false,
          dinner: response.data.registration.mealsAvailed?.dinner || false
        };

        // Get previous state from ref to avoid stale closure issues
        const prevMealsAvailed = prevMealsAvailedRef.current;
        const notifiedMeals = notifiedMealsRef.current;

        // Update ref before state updates
        prevMealsAvailedRef.current = newMealsAvailed;

        // Only update mealRegistration state if:
        // 1. Values actually changed, AND
        // 2. User doesn't have unsaved local changes (on meal registration page)
        setMealRegistration(prev => {
          // Don't overwrite if user has unsaved changes and is on meal registration page
          if (hasLocalMealChangesRef.current && currentPage === 'lima-meal-registration') {
            return prev; // Keep local changes
          }
          
          if (prev.breakfast === newMealRegistration.breakfast &&
              prev.lunch === newMealRegistration.lunch &&
              prev.dinner === newMealRegistration.dinner) {
            return prev; // No change, return previous state
          }
          return newMealRegistration;
        });

        setMealsAvailed(prev => {
          if (prev.breakfast === newMealsAvailed.breakfast &&
              prev.lunch === newMealsAvailed.lunch &&
              prev.dinner === newMealsAvailed.dinner) {
            return prev; // No change, return previous state
          }
          return newMealsAvailed;
        });
      } else {
        // Only reset if there was previous data AND no local unsaved changes
        setMealRegistration(prev => {
          // Don't reset if user has unsaved changes and is on meal registration page
          if (hasLocalMealChangesRef.current && currentPage === 'lima-meal-registration') {
            return prev; // Keep local changes
          }
          
          if (prev.breakfast || prev.lunch || prev.dinner) {
            return { breakfast: false, lunch: false, dinner: false };
          }
          return prev;
        });
        setMealsAvailed(prev => {
          if (prev.breakfast || prev.lunch || prev.dinner) {
            prevMealsAvailedRef.current = { breakfast: false, lunch: false, dinner: false };
            notifiedMealsRef.current = { breakfast: false, lunch: false, dinner: false };
            return { breakfast: false, lunch: false, dinner: false };
          }
          return prev;
        });
      }
    } catch (error) {
      console.error('Error fetching meal registration:', error);
      // Don't reset state on error to avoid flickering
    }
  }, [token, baseUrl, currentPage]);

  // Reset meal registration form when navigating to the meal registration page
  useEffect(() => {
    if (currentPage === 'lima-meal-registration' && user.university === 'lima') {
      // Clear the form when opening the page
      setMealRegistration({
        breakfast: false,
        lunch: false,
        dinner: false
      });
      setMealRegistrationMessage({ type: '', text: '' });
      hasLocalMealChangesRef.current = false; // Reset the flag
      // Fetch meal registration when page opens
      fetchMealRegistration();
    }
  }, [currentPage, user.university, fetchMealRegistration]);

  // Set up polling for meal registration to check for availed meals (works on all pages)
  useEffect(() => {
    let pollInterval;
    if (user.university === 'lima') {
      // Poll every 5 seconds (optimized from 3 seconds to reduce server load)
      // Poll on all pages, not just meal registration page
      pollInterval = setInterval(fetchMealRegistration, 5000);
    }
    return () => {
      if (pollInterval) clearInterval(pollInterval);
    };
  }, [user.university, fetchMealRegistration]);

  // Submit meal registration
  const handleMealRegistrationSubmit = async () => {
    // Check if at least one meal is selected
    if (!mealRegistration.breakfast && !mealRegistration.lunch && !mealRegistration.dinner) {
      setMealRegistrationMessage({
        type: 'error',
        text: 'Please select at least one meal (Breakfast, Lunch, or Dinner)'
      });
      return;
    }

    try {
      setIsLoadingMealRegistration(true);
      setMealRegistrationMessage({ type: '', text: '' });

      const response = await axios.post(
        `${baseUrl}/api/student/meal-registration`,
        { meals: mealRegistration },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (response.data.success) {
        setMealRegistrationMessage({
          type: 'success',
          text: response.data.message || 'Meal registration successful!'
        });
        // Clear the form after successful submission
        setMealRegistration({
          breakfast: false,
          lunch: false,
          dinner: false
        });
        hasLocalMealChangesRef.current = false; // Clear the flag after successful submission
        // Refresh meal registration data
        await fetchMealRegistration();
        // Show feedback confirmation popup
        setShowMealFeedbackConfirmation(true);
        // Clear message after 3 seconds
        setTimeout(() => {
          setMealRegistrationMessage({ type: '', text: '' });
        }, 3000);
      }
    } catch (error) {
      console.error('Error submitting meal registration:', error);
      setMealRegistrationMessage({
        type: 'error',
        text: error.response?.data?.message || 'Failed to register meals. Please try again.'
      });
    } finally {
      setIsLoadingMealRegistration(false);
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        const [pointsRes, rewardsRes] = await Promise.all([
          axios.get(`${baseUrl}/api/student/points`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
          axios.get(`${baseUrl}/api/rewards`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
        ]);
        setPoints(pointsRes.data.points);
        setPointsUsed(pointsRes.data.pointsUsed || 0);
        setRewards(rewardsRes.data);
        
        // Update user level based on points used
        const currentLevel = getUserLevel(pointsRes.data.pointsUsed || 0);
        setUserLevel(currentLevel);
      } catch (error) {
        console.error('Error fetching data:', error);
        setErrorMessage('Failed to load data. Please try again.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [user.token]);

  // Add retry utility function
  const retryOperation = async (operation, maxRetries = 3) => {
    let lastError;
    for (let i = 0; i < maxRetries; i++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error;
        if (error.code === 'ECONNABORTED' || error.code === 'ECONNRESET') {
          // Exponential backoff: wait 2^i * 1000ms before retrying
          const delay = Math.min(1000 * Math.pow(2, i), 10000);
          console.log(`Attempt ${i + 1} failed, retrying in ${delay}ms...`);
          await new Promise(resolve => setTimeout(resolve, delay));
          continue;
        }
        throw error;
      }
    }
    throw lastError;
  };

  const handleCodeSubmit = async () => {
    if (isLoading) return; // Prevent multiple submissions
    
    if (!code.trim()) {
      setShowCodeErrorModal(true);
      return;
    }

    try {
      setIsLoading(true);
      const token = user.token;
      const response = await axios.post(
        `${baseUrl}/api/student/claim-code`,
        { code },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setErrorMessage('');
      setCodeSuccessMessage(`Code claimed successfully! You earned 1 point!`);
      setPoints(response.data.newPoints);
      
      // Clear the input field on success
      setCode('');
    
      // Show success modal first
      setShowCodeSuccessModal(true);
      
      confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
    } catch (error) {
      console.error('Error submitting code:', error);
      let errorMsg = 'An unexpected error occurred. Please try again.';
      
      if (error.response && error.response.status === 400) {
        errorMsg = error.response.data.message || 'Code is invalid or already used.';
      }
      
      // Show error popup and clear input field
      setCodeErrorMessage(errorMsg);
      setShowCodeErrorModal(true);
      setCode(''); // Clear the input field
      setErrorMessage(''); // Clear any existing error message
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  // handleFeedbackSubmit function is now defined below with the reward claim functionality

  const claimReward = async (rewardId) => {
    try {
      setIsLoading(true);

      const response = await axios.post(
        `${baseUrl}/api/student/claim-reward/${rewardId}`,
        {},
        { headers: { Authorization: `Bearer ${user.token}` } }
      );

      setPoints(response.data.newPoints);
      
      // Update points used and user level
      const oldPointsUsed = pointsUsed;
      const newPointsUsed = pointsUsed + (rewards.find(r => r._id === rewardId)?.cost || 0);
      setPointsUsed(newPointsUsed);
      const newLevel = getUserLevel(newPointsUsed);
      setUserLevel(newLevel);
      
      // Store level up data for later use (don't show immediately)
      const oldLevel = getUserLevel(oldPointsUsed);
      const newLevelData = getUserLevel(newPointsUsed);
      if (oldLevel.key !== newLevelData.key) {
        setPreviousLevel(oldLevel);
        setNewLevel(newLevelData);
        // Don't show level up modal yet - will show after verification
      }

      const claimed = rewards.find((r) => r._id === rewardId);
      setClaimedRewardName(claimed?.name || 'Reward');
      setClaimTime(new Date().toLocaleString());
      setShowClaimModal(true);

      // Refresh claimed rewards list
      await fetchClaimedRewards();

      confetti({ particleCount: 150, spread: 100, origin: { y: 0.6 } });
    } catch (err) {
      setErrorMessage(err.response?.data?.message || 'Failed to claim reward');
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerification = async () => {
    try {
      setIsLoading(true);
      setVerificationError('');

      const response = await axios.post(
        `${baseUrl}/api/student/verify-reward-claim`,
        { verificationCode },
        { headers: { Authorization: `Bearer ${user.token}` } }
      );

      if (response.data.success) {
        setVerificationCode('');
        setShowClaimModal(false);
        setShowSuccessPopup(true);
        
        // Level up modal will be shown when user clicks Continue on success popup
        // (handled in the success popup button click handler)
      }
    } catch (err) {
      setVerificationError(err.response?.data?.message || 'Verification failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleFeedbackSubmit = async (feedbackData) => {
    try {
      setIsLoading(true);
      const response = await axios.post(
        `${baseUrl}/api/student/feedback`,
        { ...feedbackData, studentId: user._id },
        { 
          headers: { Authorization: `Bearer ${user.token}` },
          validateStatus: (status) => status < 500 // Don't throw for 4xx errors
        }
      );

      if (response.status === 400 && response.data.message?.includes('already submitted feedback today')) {
        // If daily limit reached, show the daily limit message
        setShowFeedbackForm(false);
        setShowDailyLimit(true);
        return;
      }
      
      if (response.status >= 200 && response.status < 300) {
        // Update points if the response includes the new points
        if (response.data.newPoints !== undefined) {
          setPoints(response.data.newPoints);
        } else {
          // Fallback: Manually add 3 points if not provided by the server
          setPoints(prev => prev + 3);
        }
        
        // Show success message
        setShowFeedbackForm(false);
        setFeedbackSuccessMessage('Thank you for your feedback! You earned 3 extra points!');
        setShowFeedbackSuccess(true);
        
        // Show confetti for a nice effect
        confetti({ particleCount: 150, spread: 100, origin: { y: 0.6 } });
      } else {
        throw new Error(response.data.message || 'Failed to submit feedback');
      }
      
    } catch (err) {
      setErrorMessage(err.response?.data?.message || err.message || 'Failed to submit feedback');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSurveyFeedbackSubmit = async (feedbackData) => {
    try {
      setIsLoading(true);
      const response = await axios.post(
        `${baseUrl}/api/student/survey-feedback`,
        feedbackData,
        { 
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      if (response.data.success) {
        setShowMealFeedbackForm(false);
        // Show simple thank you message
        setMealRegistrationMessage({
          type: 'success',
          text: 'Thank you for your feedback!'
        });
        setTimeout(() => {
          setMealRegistrationMessage({ type: '', text: '' });
        }, 3000);
      } else {
        throw new Error(response.data.message || 'Failed to submit feedback');
      }
    } catch (err) {
      setErrorMessage(err.response?.data?.message || err.message || 'Failed to submit feedback');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddToCart = (itemId) => {
    setAvailableItems(prevItems => 
      prevItems.map(item => {
        if (item.id === itemId) {
          return { ...item, cartQuantity: item.cartQuantity + 1 };
        }
        return item;
      })
    );
  };

  const handleRemoveFromCart = (itemId) => {
    setAvailableItems(prevItems => 
      prevItems.map(item => {
        if (item.id === itemId && item.cartQuantity > 0) {
          return { ...item, cartQuantity: item.cartQuantity - 1 };
        }
        return item;
      })
    );
  };

  // Animation variants
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.1 } },
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: { y: 0, opacity: 1 },
  };

  // Add message display component
  const MessageDisplay = () => {
    if (!message.text) return null;

    return (
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        className={`fixed top-4 left-1/2 transform -translate-x-1/2 px-4 py-2 rounded-lg shadow-lg z-50 ${
          message.type === 'error' ? 'bg-red-600' : 'bg-green-600'
        }`}
      >
        <p className="text-white font-medium">{message.text}</p>
      </motion.div>
    );
  };

  // Add useEffect to clear message after 3 seconds
  useEffect(() => {
    if (message.text) {
      const timer = setTimeout(() => {
        setMessage({ type: '', text: '' });
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [message]);

  return (
    <div
      className="min-h-screen bg-center bg-cover"
      style={{ backgroundImage: `url(${bgImage})` }}
    >
      <AnimatePresence>
        {message.text && <MessageDisplay />}
      </AnimatePresence>
      <motion.div
        key={currentPage}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        transition={{ duration: 0.3 }}
        className="container mx-auto px-2 sm:px-4 py-6 sm:py-8 pb-20 sm:pb-24"
      >
        {/* Home Page */}
        {currentPage === 'home' && (
          <motion.div variants={itemVariants} className="space-y-6">
            <motion.div 
              className={`relative mx-auto p-3 sm:p-4 md:p-6 w-full max-w-md bg-gradient-to-br ${userLevel.bgGradient} rounded-2xl shadow-2xl text-black overflow-hidden border-2 ${userLevel.borderColor} cursor-pointer ${
                userLevel.key === 'DIAMOND' ? 'ring-4 ring-cyan-300/50 ring-opacity-75' : ''
              }`}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setShowLevelDetailsModal(true)}
              style={{
                perspective: "1000px",
                transformStyle: "preserve-3d",
                height: "clamp(220px, 50vw, 280px)",
                width: "clamp(280px, 85vw, 400px)",
                margin: "0 auto 2rem auto",
                ...(userLevel.key === 'DIAMOND' && {
                  boxShadow: '0 0 30px rgba(34, 211, 238, 0.5), 0 0 60px rgba(34, 211, 238, 0.3), 0 0 90px rgba(34, 211, 238, 0.1)'
                })
              }}
            >
              {/* Level-based Background Design */}
              <div className="absolute inset-0 pointer-events-none overflow-hidden">
                {/* Level-specific decorative elements */}
                <div className={`absolute -bottom-8 left-0 w-full h-16 bg-gradient-to-r ${userLevel.gradient} opacity-50 rounded-full blur-sm animate-pulse`}></div>
                
                {/* Multiple wave layers for depth */}
                <div className={`absolute -bottom-4 left-0 w-full h-12 bg-gradient-to-r ${userLevel.gradient} opacity-40 rounded-full blur-sm animate-pulse`} style={{ animationDelay: '0.5s' }}></div>
                
                {/* Top wave accent */}
                <div className={`absolute top-4 left-0 w-full h-8 bg-gradient-to-r from-transparent via-current to-transparent opacity-30 rounded-full blur-sm`} style={{ color: userLevel.color }}></div>
                
                {/* Side wave accents */}
                <div className={`absolute top-1/2 -left-4 w-8 h-8 bg-gradient-to-br ${userLevel.gradient} opacity-40 rounded-full blur-sm animate-pulse`} style={{ animationDelay: '1s' }}></div>
                <div className={`absolute top-1/3 -right-2 w-6 h-6 bg-gradient-to-br ${userLevel.gradient} opacity-40 rounded-full blur-sm animate-pulse`} style={{ animationDelay: '1.5s' }}></div>
                
                {/* Floating level elements */}
                <div className={`absolute top-6 right-6 w-4 h-4 bg-gradient-to-br ${userLevel.gradient} opacity-50 rounded-full blur-sm animate-bounce`} style={{ animationDelay: '0.3s' }}></div>
                <div className={`absolute bottom-6 left-8 w-3 h-3 bg-gradient-to-br ${userLevel.gradient} opacity-50 rounded-full blur-sm animate-bounce`} style={{ animationDelay: '0.7s' }}></div>
                
                {/* Curved wave paths */}
                <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
                  <path 
                    d="M0,80 Q25,60 50,80 T100,80 L100,100 L0,100 Z" 
                    fill="url(#waveGradient1)" 
                    opacity="0.4"
                    className="animate-pulse"
                  />
                  <path 
                    d="M0,85 Q30,65 60,85 T100,85 L100,100 L0,100 Z" 
                    fill="url(#waveGradient2)" 
                    opacity="0.3"
                    className="animate-pulse"
                    style={{ animationDelay: '0.8s' }}
                  />
                  <path 
                    d="M0,90 Q35,70 65,90 T100,90 L100,100 L0,100 Z" 
                    fill="url(#waveGradient3)" 
                    opacity="0.25"
                    className="animate-pulse"
                    style={{ animationDelay: '1.2s' }}
                  />
                  
                  {/* Gradient definitions */}
                  <defs>
                    <linearGradient id="waveGradient1" x1="0%" y1="0%" x2="100%" y2="0%">
                      <stop offset="0%" stopColor="rgba(59, 130, 246, 0.5)" />
                      <stop offset="50%" stopColor="rgba(37, 99, 235, 0.5)" />
                      <stop offset="100%" stopColor="rgba(59, 130, 246, 0.5)" />
                    </linearGradient>
                    <linearGradient id="waveGradient2" x1="0%" y1="0%" x2="100%" y2="0%">
                      <stop offset="0%" stopColor="rgba(37, 99, 235, 0.4)" />
                      <stop offset="50%" stopColor="rgba(29, 78, 216, 0.4)" />
                      <stop offset="100%" stopColor="rgba(37, 99, 235, 0.4)" />
                    </linearGradient>
                    <linearGradient id="waveGradient3" x1="0%" y1="0%" x2="100%" y2="0%">
                      <stop offset="0%" stopColor="rgba(29, 78, 216, 0.3)" />
                      <stop offset="50%" stopColor="rgba(30, 64, 175, 0.3)" />
                        <stop offset="100%" stopColor="rgba(29, 78, 216, 0.3)" />
                    </linearGradient>
                  </defs>
                </svg>
                
                {/* Shimmer effect - enhanced for Diamond level */}
                <div className={`absolute inset-0 bg-gradient-to-r from-transparent via-current to-transparent transform -skew-x-12 animate-pulse opacity-40`} style={{ color: userLevel.color }}>
                  {userLevel.key === 'DIAMOND' && (
                    <div className="absolute inset-0 bg-gradient-to-r from-cyan-300/30 via-blue-200/30 to-cyan-300/30 animate-pulse"></div>
                  )}
                </div>
              </div>

               {/* Card Content */}
                <div className="relative z-10 flex flex-col justify-between h-full">
                  {/* Card issuer and level chip */}
                  <div className="flex justify-between items-start">
                    <div className="flex items-center space-x-3">
                      <img src={logo} alt="Varda Food Group Logo" className="h-8 sm:h-10 md:h-12 w-auto" />
                      <div className="text-xs sm:text-sm font-bold text-black/90">LOYALTY CARD</div>
                    </div>
                    <div className={`w-8 sm:w-10 h-6 sm:h-8 bg-gradient-to-br ${userLevel.gradient} rounded-md flex items-center justify-center`}>
                      <div className={`w-6 sm:w-8 h-4 sm:h-6 bg-gradient-to-br ${userLevel.gradient} rounded-sm border border-white/50 flex items-center justify-center`}>
                        <div className="text-xs sm:text-sm font-bold">{userLevel.icon}</div>
                      </div>
                    </div>
                  </div>  

                  {/* Points display with animation */}
                  <motion.div 
                    key={points}
                    initial={{ scale: 1.1, opacity: 0.8 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="text-center flex-grow flex flex-col justify-center py-2 sm:py-4"
                  >
                    <p className="text-xs font-bold text-black/80 mb-1">POINTS BALANCE:</p>
                    <p className="text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight text-black flex items-center justify-center">
                      {points} <span className="text-lg sm:text-xl ml-2">⭐</span>
                    </p>
                  </motion.div>

                  {/* Card footer */}
                  <div className="flex justify-between items-end mt-auto pt-2 sm:pt-3">
                    <div className="max-w-[60%]">
                      <p className="text-xs font-bold tracking-wider text-black/90 truncate">
                        {`${user.firstName} ${user.lastName}`.toUpperCase()}
                      </p>
                      {user.accountID && (
                        <div className="mt-1.5">
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold font-mono bg-black/10 text-black/80 border border-black/20">
                            {user.accountID}
                          </span>
                        </div>
                      )}
                    </div>
                    
                    <div className="text-right">
                      <div className="flex items-center justify-end space-x-1">
                        <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                        <p className="text-xs sm:text-sm font-bold text-black/90">ACTIVE</p>
                      </div>
                    </div>
                  </div>
                </div>

              {/* Shine effect on hover */}
              <div className="absolute inset-0 pointer-events-none overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-r from-transparent via-white/30 to-transparent opacity-0 hover:opacity-30 transition-opacity duration-300"></div>
              </div>
            </motion.div>

            {/* Navigation Buttons */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4 px-2 sm:px-0">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setCurrentPage('claim')}
                className="flex flex-col items-center p-3 sm:p-4 bg-gradient-to-br from-orange-100 via-orange-200 to-orange-100 rounded-lg sm:rounded-xl shadow-md hover:shadow-lg transition-all border border-gray-200 min-h-[80px] sm:min-h-[100px]"
              >
                <TicketIcon className="h-6 w-6 sm:h-8 sm:w-8 text-blue-600" />
                <span className="mt-1.5 sm:mt-2 font-medium text-black text-sm sm:text-base">Redeem</span>
              </motion.button>

              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setCurrentPage('rewards')}
                className="flex flex-col items-center p-3 sm:p-4 bg-gradient-to-br from-orange-100 via-orange-200 to-orange-100 rounded-lg sm:rounded-xl shadow-md hover:shadow-lg transition-all border border-gray-200 min-h-[80px] sm:min-h-[100px]"
              >
                <GiftIcon className="h-6 w-6 sm:h-8 sm:w-8 text-blue-600" />
                <span className="mt-1.5 sm:mt-2 font-medium text-black text-sm sm:text-base">Rewards</span>
              </motion.button>
              
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setCurrentPage('claimed-rewards')}
                className="flex flex-col items-center p-3 sm:p-4 bg-gradient-to-br from-orange-100 via-orange-200 to-orange-100 rounded-lg sm:rounded-xl shadow-md hover:shadow-lg transition-all border border-gray-200 min-h-[80px] sm:min-h-[100px] col-span-2 sm:col-span-1"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 sm:h-8 sm:w-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="mt-1.5 sm:mt-2 font-medium text-black text-sm sm:text-base">Claimed Rewards</span>
              </motion.button>

              {user.university === 'lima' && (
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setCurrentPage('lima-meal-registration')}
                  className="flex flex-col items-center p-3 sm:p-4 bg-gradient-to-br from-orange-100 via-orange-200 to-orange-100 rounded-lg sm:rounded-xl shadow-md hover:shadow-lg transition-all border border-gray-200 min-h-[80px] sm:min-h-[100px] col-span-2 sm:col-span-1"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 sm:h-8 sm:w-8 text-orange-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                  <span className="mt-1.5 sm:mt-2 font-medium text-black text-sm sm:text-base">LIMA - Meal Registration</span>
                </motion.button>
              )}
            </div>


            {/* Claimed Rewards Summary Section */}
            {claimedRewards.length > 0 && (
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-6 sm:mt-8"
              >
                <div className="bg-gradient-to-br from-orange-50 via-orange-100 to-orange-50 p-4 sm:p-6 rounded-xl sm:rounded-2xl shadow-lg border border-gray-200 mx-2 sm:mx-0">
                  <div className="mb-3 sm:mb-4">
                    <h3 className="text-lg sm:text-xl font-semibold text-black">Recent Claimed Rewards</h3>
                  </div>
                  <div className="space-y-2 sm:space-y-3">
                    {claimedRewards.slice(0, 3).map((claimedReward, index) => (
                      <motion.div 
                        key={claimedReward._id || index}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.1 }}
                        className="flex items-center space-x-3 p-2.5 sm:p-3 bg-white/80 rounded-lg hover:bg-white transition-colors border border-gray-200"
                      >
                        <div className="w-7 h-7 sm:w-8 sm:h-8 bg-green-500 rounded-full flex items-center justify-center flex-shrink-0">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                        </div>
                        <div className="flex-grow min-w-0">
                          <h4 className="font-medium text-gray-800 text-xs sm:text-sm truncate">
                            {claimedReward.reward?.name || 'Reward'}
                          </h4>
                          <p className="text-xs text-gray-500">
                            Claimed {new Date(claimedReward.claimedAt).toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric'
                            })}
                          </p>
                        </div>
                        <div className="flex-shrink-0">
                          <span className="text-xs text-green-400 font-medium">
                            {claimedReward.reward?.cost || claimedReward.pointsUsed || 'N/A'} pts
                          </span>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}
          </motion.div>
        )}

        {/* Claim Code Page */}
        {currentPage === 'claim' && (
          <motion.div variants={itemVariants} className="space-y-8">
            <div className="text-center relative">
              {/* Glow aura behind logo */}
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-32 h-32 sm:w-40 sm:h-40 bg-gradient-to-r from-blue-400/30 via-purple-500/30 to-blue-600/30 rounded-full blur-3xl animate-pulse"></div>
                <div className="absolute w-24 h-24 sm:w-32 sm:h-32 bg-gradient-to-r from-blue-500/20 via-purple-400/20 to-blue-500/20 rounded-full blur-2xl animate-pulse" style={{ animationDelay: '1s' }}></div>
                <div className="absolute w-16 h-16 sm:w-20 sm:h-20 bg-gradient-to-r from-purple-400/25 to-blue-400/25 rounded-full blur-xl animate-pulse" style={{ animationDelay: '2s' }}></div>
              </div>
              
              {/* Logo with enhanced styling */}
              <div className="relative z-10">
                <img src={logo} alt="Varda Food Group Logo" className="h-16 sm:h-20 mx-auto mb-6 drop-shadow-2xl" />
              </div>
              
              {/* Enhanced title with gradient */}
              <div className="relative z-10">
                <h2 className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-blue-400 via-purple-400 to-blue-500 bg-clip-text text-transparent mb-2">
                  Redeem Your Code
                </h2>
                <div className="w-24 h-1 bg-gradient-to-r from-blue-400 via-purple-400 to-blue-500 rounded-full mx-auto"></div>
                <p className="text-gray-400 mt-3 text-sm sm:text-base">Enter your unique code to earn points</p>
              </div>
            </div>
            
            <motion.div 
              className="bg-gradient-to-br from-orange-100 via-orange-200 to-orange-100 p-8 rounded-3xl shadow-2xl border border-gray-200 relative overflow-hidden"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.5 }}
            >
              {/* Subtle background pattern */}
              <div className="absolute inset-0 opacity-5">
                <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-blue-400/20 via-purple-400/20 to-blue-400/20"></div>
              </div>
              
              <div className="relative z-10 space-y-6">
                <div className="text-center mb-6">
                  <div className="inline-block bg-gradient-to-r from-blue-900/60 via-purple-900/60 to-blue-900/60 px-6 py-3 rounded-full border border-blue-500/30 shadow-lg">
                    <span className="font-bold text-blue-300 text-lg">✨ Enter Your Code ✨</span>
                  </div>
                </div>
                
                <div className="space-y-4">
                  <div className="relative">
                    <input
                      id="code-input"
                      className="w-full border border-gray-200 bg-white p-5 rounded-2xl text-center font-mono text-2xl focus:ring-4 focus:ring-rose-400/60 focus:border-rose-400 text-black placeholder-gray-400 transition-all duration-300 shadow-lg"
                      placeholder="ex. 123456"
                      value={code}
                      onChange={(e) => setCode(e.target.value.toUpperCase())}
                      disabled={isLoading}
                      style={{ letterSpacing: '3px' }}
                    />
                    {/* Input glow effect */}
                    <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-blue-500/20 via-purple-500/20 to-blue-500/20 blur-xl opacity-0 transition-opacity duration-300 pointer-events-none"></div>
                  </div>
                  
                    <button
                    onClick={handleCodeSubmit}
                    disabled={isLoading}
                      className={`w-full py-4 bg-blue-600 text-white rounded-2xl font-bold text-lg hover:bg-blue-700 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-[1.02] active:scale-[0.98] ${
                      isLoading ? 'opacity-50 cursor-not-allowed' : ''
                    }`}
                  >
                    {isLoading ? (
                      <div className="flex items-center justify-center">
                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-3"></div>
                        Processing...
                      </div>
                    ) : (
                      <span className="flex items-center justify-center">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        Submit Code
                      </span>
                    )}
                  </button>
                </div>
                
                {/* Decorative elements */}
                <div className="flex justify-center space-x-2 mt-6">
                  <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce"></div>
                  <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                  <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}

        {/* Rewards Page */}
        {currentPage === 'rewards' && (
          <motion.div variants={itemVariants} className="space-y-6">
            <div className="text-center">
              <img src={logo} alt="Varda Food Group Logo" className="h-16 sm:h-20 mx-auto mb-8" />
              <h2 className="text-2xl font-bold text-blue-700">Rewards Available!</h2>
              <p className="text-gray-700 mt-1">Claim your Rewards and go to the Cashier for Assistance!</p>
            </div>
            
            <motion.div 
              className="bg-gradient-to-br from-orange-50 via-orange-100 to-orange-50 p-4 rounded-2xl shadow-inner border border-gray-200"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              <div className="text-center mb-4">
                <div className="inline-block bg-blue-50 px-4 py-2 rounded-full border border-blue-200">
                  <span className="font-bold text-blue-700">🌟 You have: {points} points 🌟</span>
                </div>
              </div>
              
              {rewards.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-gray-400 text-lg">No rewards available right now</p>
                  <p className="text-gray-500 mt-2">Check back later!</p>
                </div>
              ) : (
                <div className="grid gap-4">
              {rewards
                .sort((a, b) => a.cost - b.cost)
                .map((reward) => (
                  <motion.div 
                    key={reward._id}
                    variants={itemVariants}
                    whileHover={{ scale: 1.03 }}
                    className={`p-1 rounded-xl ${points >= reward.cost ? 'bg-gradient-to-r from-blue-500 via-blue-600 to-blue-700' : 'bg-gray-200'}`}
                  >
                    <div className="bg-white p-4 rounded-lg border border-gray-200 relative overflow-hidden">
                      <div className="absolute top-0 left-0 w-2 h-full bg-blue-500/80"></div>
                      <div className="absolute top-2 right-2 text-xs font-bold bg-blue-50 px-2 py-1 rounded text-blue-700 border border-blue-200">
                        {reward.cost} pts
                      </div>
                      
                      <div className="flex justify-between items-center pl-0">
                        <div className="flex items-center space-x-2">
                          {reward.imageUrl && (
                            <img
                              src={reward.imageUrl}
                              alt={reward.name}
                              className="h-14 w-14 rounded-lg object-cover"
                            />
                          )}
                          <div>
                            <h3 className="text-base font-bold text-gray-900">{reward.name}</h3>
                            <p className="text-xs text-gray-600">{reward.description || 'Awesome reward!'}</p>
                          </div>
                        </div>
                        <button
                          onClick={() => claimReward(reward._id)}
                          disabled={points < reward.cost || isLoading}
                          className={`px-4 py-2 rounded-lg font-bold shadow-md transition-all ${points >= reward.cost ? 
                            'bg-blue-600 hover:bg-blue-700 text-white' : 
                            'bg-gray-300 text-gray-500'}`}
                        >
                          Claim!
                        </button>
                      </div>
                    </div>
                  </motion.div>
              ))}
                </div>
              )}
            </motion.div>
          </motion.div>
        )}

        {/* Claimed Rewards Page */}
        {currentPage === 'claimed-rewards' && (
          <motion.div variants={itemVariants} className="space-y-4 sm:space-y-6">
            <div className="text-center px-2">
              <img src={logo} alt="Varda Food Group Logo" className="h-12 sm:h-16 md:h-20 mx-auto mb-4 sm:mb-6 md:mb-8" />
              <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-green-700 mb-2">Your Claimed Rewards</h2>
              <p className="text-sm sm:text-base text-gray-700 px-4">Track all the rewards you've successfully claimed!</p>
              <button
                onClick={fetchClaimedRewards}
                disabled={isLoadingClaimedRewards}
                className="mt-3 sm:mt-4 px-3 sm:px-4 py-2 bg-green-600 text-white text-sm sm:text-base rounded-lg hover:bg-green-700 transition-colors flex items-center mx-auto space-x-2"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className={`h-4 w-4 ${isLoadingClaimedRewards ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                <span>{isLoadingClaimedRewards ? 'Refreshing...' : 'Refresh'}</span>
              </button>
            </div>
            
            <motion.div 
              className="bg-gradient-to-br from-orange-50 via-orange-100 to-orange-50 p-3 sm:p-4 md:p-6 rounded-xl sm:rounded-2xl shadow-inner border border-gray-200 mx-2 sm:mx-0"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              {isLoadingClaimedRewards ? (
                <div className="text-center py-8 sm:py-12">
                  <div className="inline-flex items-center px-3 sm:px-4 py-2 font-semibold leading-6 text-blue-700 transition ease-in-out duration-150 text-sm sm:text-base">
                    <svg className="animate-spin -ml-1 mr-2 sm:mr-3 h-4 w-4 sm:h-5 sm:w-5 text-blue-700" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <span className="hidden sm:inline">Loading your claimed rewards...</span>
                    <span className="sm:hidden">Loading...</span>
                  </div>
                </div>
              ) : claimedRewards.length === 0 ? (
                <div className="text-center py-8 sm:py-12 px-4">
                  <div className="w-16 h-16 sm:w-24 sm:h-24 bg-white rounded-full flex items-center justify-center mx-auto mb-3 sm:mb-4 shadow">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 sm:h-12 sm:w-12 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <h3 className="text-lg sm:text-xl font-semibold text-gray-800 mb-2">No Rewards Claimed Yet</h3>
                  <p className="text-sm sm:text-base text-gray-600 mb-4 px-2">Start earning points and claim your first reward!</p>
                  <button
                    onClick={() => setCurrentPage('rewards')}
                    className="px-4 sm:px-6 py-2 bg-blue-600 text-white text-sm sm:text-base rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    Browse Rewards
                  </button>
                </div>
              ) : (
                <div className="space-y-3 sm:space-y-4">
                  <div className="text-center mb-4 sm:mb-6">
                    <div className="inline-block bg-green-900/50 px-3 sm:px-4 py-2 rounded-full">
                      <span className="font-bold text-green-300 text-sm sm:text-base">🎉 Total Claimed: {claimedRewards.length} rewards 🎉</span>
                    </div>
                  </div>
                  
                  {claimedRewards.map((claimedReward, index) => (
                    <motion.div 
                      key={claimedReward._id || index}
                      variants={itemVariants}
                      whileHover={{ scale: 1.02 }}
                      onClick={() => handleClaimedRewardClick(claimedReward)}
                      className="bg-gradient-to-r from-green-900/30 via-green-800/30 to-green-900/30 p-3 sm:p-4 rounded-lg sm:rounded-xl border border-green-700/50 relative overflow-hidden cursor-pointer"
                    >
                      {/* Success indicator */}
                      <div className="absolute top-2 right-2 sm:top-3 sm:right-3">
                        <div className="w-6 h-6 sm:w-8 sm:h-8 bg-green-500 rounded-full flex items-center justify-center">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 sm:h-5 sm:w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                        </div>
                      </div>
                      
                      <div className="flex items-start space-x-3 sm:space-x-4 pr-8 sm:pr-10">
                        <div className="flex-shrink-0">
                          {claimedReward.reward?.imageUrl && (
                            <img
                              src={claimedReward.reward.imageUrl}
                              alt={claimedReward.reward.name}
                              className="h-12 w-12 sm:h-16 sm:w-16 rounded-lg object-cover border-2 border-green-500/50"
                              onError={(e) => {
                                console.log('Image failed to load:', claimedReward.reward.imageUrl);
                              }}
                            />
                          )}
                          {!claimedReward.reward?.imageUrl && (
                            <div className="h-12 w-12 sm:h-16 sm:w-16 bg-gray-600/20 rounded-lg flex items-center justify-center border-2 border-gray-500/50">
                              <span className="text-xs text-gray-400">No Image</span>
                            </div>
                          )}
                        </div>
                        
                        <div className="flex-grow min-w-0">
                          <h3 className="text-base sm:text-lg font-bold text-green-300 mb-1 truncate">
                            {claimedReward.reward?.name || 'Reward'}
                          </h3>
                          <p className="text-xs sm:text-sm text-gray-300 mb-2 line-clamp-2">
                            {claimedReward.reward?.description || 'Awesome reward claimed!'}
                          </p>
                          
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-4 text-xs sm:text-sm">
                            <div>
                              <span className="text-gray-400 block sm:inline">Claimed on:</span>
                              <p className="text-green-200 font-medium text-xs sm:text-sm">
                                {new Date(claimedReward.claimedAt).toLocaleDateString('en-US', {
                                  year: 'numeric',
                                  month: 'short',
                                  day: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit'
                                })}
                              </p>
                            </div>
                            <div>
                              <span className="text-gray-400 block sm:inline">Points spent:</span>
                              <p className="text-green-200 font-medium text-xs sm:text-sm">
                                {claimedReward.reward?.cost || claimedReward.pointsUsed || 'N/A'} pts
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                      
                      {/* Status badge */}
                      <div className="mt-2 sm:mt-3 pt-2 sm:pt-3 border-t border-green-700/30">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-1 sm:space-y-0">
                          <span className="text-xs text-green-400 font-medium">
                            Status: Claimed Successfully
                          </span>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </motion.div>
          </motion.div>
        )}

        {/* LIMA Meal Registration Page */}
        {currentPage === 'lima-meal-registration' && (
          <motion.div variants={itemVariants} className="space-y-4 sm:space-y-6">
            <div className="text-center px-2">
              <img src={logo} alt="Varda Food Group Logo" className="h-12 sm:h-16 md:h-20 mx-auto mb-4 sm:mb-6 md:mb-8" />
              <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-orange-400 mb-2">LIMA - Meal Registration</h2>
              <p className="text-sm sm:text-base text-gray-400 px-4">Select the meals you want to register for today</p>
              {user.accountID && (
                <div className="mt-4 mx-auto max-w-md">
                  <div className="bg-gradient-to-r from-purple-600/20 to-indigo-600/20 border-2 border-purple-500/50 rounded-xl p-4">
                    <p className="text-xs font-medium text-black uppercase tracking-wider mb-1">Your Account ID</p>
                    <p className="text-2xl sm:text-3xl font-bold text-black font-mono tracking-wider">{user.accountID}</p>
                    <p className="text-xs text-gray-400 mt-2">Show this to staff when confirming your meal</p>
                  </div>
                </div>
              )}
            </div>

            <motion.div 
              className="bg-[#1e293b] p-4 sm:p-6 md:p-8 rounded-xl sm:rounded-2xl shadow-inner border-2 border-gray-700/50 mx-2 sm:mx-0"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              {/* Message Display */}
              {mealRegistrationMessage.text && (
                <div className={`mb-4 sm:mb-6 p-3 sm:p-4 rounded-lg ${
                  mealRegistrationMessage.type === 'success' 
                    ? 'bg-green-900/50 border border-green-700/50' 
                    : 'bg-red-900/50 border border-red-700/50'
                }`}>
                  <p className={`text-sm sm:text-base ${
                    mealRegistrationMessage.type === 'success' ? 'text-green-300' : 'text-red-300'
                  }`}>
                    {mealRegistrationMessage.text}
                  </p>
                </div>
              )}

              {/* Meal Selection */}
              <div className="space-y-4 sm:space-y-6">
                <h3 className="text-lg sm:text-xl font-semibold text-gray-200 mb-4">Select Your Meals</h3>
                
                {/* Breakfast */}
                <motion.label
                  whileHover={mealsAvailed.breakfast ? {} : { scale: 1.02 }}
                  whileTap={mealsAvailed.breakfast ? {} : { scale: 0.98 }}
                  className={`flex items-center p-4 sm:p-5 bg-gray-800/50 rounded-xl border-2 transition-all ${
                    mealsAvailed.breakfast 
                      ? 'border-green-500/50 bg-green-900/20 cursor-pointer hover:bg-green-900/30' 
                      : mealRegistration.breakfast 
                        ? 'border-orange-500/50 cursor-pointer hover:border-orange-500/50' 
                        : 'border-gray-700/50 cursor-pointer hover:border-orange-500/50'
                  }`}
                  onClick={mealsAvailed.breakfast ? (e) => {
                    e.preventDefault();
                    showAvailNotificationForMeal('Breakfast');
                  } : undefined}
                >
                  <input
                    type="checkbox"
                    checked={mealRegistration.breakfast}
                    onChange={(e) => {
                      hasLocalMealChangesRef.current = true; // Mark that user has unsaved changes
                      setMealRegistration({ ...mealRegistration, breakfast: e.target.checked });
                    }}
                    disabled={mealsAvailed.breakfast}
                    className="w-5 h-5 sm:w-6 sm:h-6 text-orange-500 bg-gray-700 border-gray-600 rounded focus:ring-orange-500 focus:ring-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  />
                  <div className="ml-4 flex-1">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 sm:h-8 sm:w-8 text-yellow-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                        </svg>
                        <div>
                          <h4 className="text-base sm:text-lg font-bold text-white">Breakfast</h4>
                        </div>
                      </div>
                      {mealsAvailed.breakfast && (
                        <div className="flex items-center space-x-2">
                          <svg className="w-5 h-5 sm:w-6 sm:h-6 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" />
                          </svg>
                          <span className="text-sm sm:text-base font-semibold text-green-400">Availed</span>
                        </div>
                      )}
                    </div>
                  </div>
                </motion.label>

                {/* Lunch */}
                <motion.label
                  whileHover={mealsAvailed.lunch ? {} : { scale: 1.02 }}
                  whileTap={mealsAvailed.lunch ? {} : { scale: 0.98 }}
                  className={`flex items-center p-4 sm:p-5 bg-gray-800/50 rounded-xl border-2 transition-all ${
                    mealsAvailed.lunch 
                      ? 'border-green-500/50 bg-green-900/20 cursor-pointer hover:bg-green-900/30' 
                      : mealRegistration.lunch 
                        ? 'border-orange-500/50 cursor-pointer hover:border-orange-500/50' 
                        : 'border-gray-700/50 cursor-pointer hover:border-orange-500/50'
                  }`}
                  onClick={mealsAvailed.lunch ? (e) => {
                    e.preventDefault();
                    showAvailNotificationForMeal('Lunch');
                  } : undefined}
                >
                  <input
                    type="checkbox"
                    checked={mealRegistration.lunch}
                    onChange={(e) => {
                      hasLocalMealChangesRef.current = true; // Mark that user has unsaved changes
                      setMealRegistration({ ...mealRegistration, lunch: e.target.checked });
                    }}
                    disabled={mealsAvailed.lunch}
                    className="w-5 h-5 sm:w-6 sm:h-6 text-orange-500 bg-gray-700 border-gray-600 rounded focus:ring-orange-500 focus:ring-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  />
                  <div className="ml-4 flex-1">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 sm:h-8 sm:w-8 text-orange-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <div>
                          <h4 className="text-base sm:text-lg font-bold text-white">Lunch</h4>
                        </div>
                      </div>
                      {mealsAvailed.lunch && (
                        <div className="flex items-center space-x-2">
                          <svg className="w-5 h-5 sm:w-6 sm:h-6 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" />
                          </svg>
                          <span className="text-sm sm:text-base font-semibold text-green-400">Availed</span>
                        </div>
                      )}
                    </div>
                  </div>
                </motion.label>

                {/* Dinner */}
                <motion.label
                  whileHover={mealsAvailed.dinner ? {} : { scale: 1.02 }}
                  whileTap={mealsAvailed.dinner ? {} : { scale: 0.98 }}
                  className={`flex items-center p-4 sm:p-5 bg-gray-800/50 rounded-xl border-2 transition-all ${
                    mealsAvailed.dinner 
                      ? 'border-green-500/50 bg-green-900/20 cursor-pointer hover:bg-green-900/30' 
                      : mealRegistration.dinner 
                        ? 'border-orange-500/50 cursor-pointer hover:border-orange-500/50' 
                        : 'border-gray-700/50 cursor-pointer hover:border-orange-500/50'
                  }`}
                  onClick={mealsAvailed.dinner ? (e) => {
                    e.preventDefault();
                    showAvailNotificationForMeal('Dinner');
                  } : undefined}
                >
                  <input
                    type="checkbox"
                    checked={mealRegistration.dinner}
                    onChange={(e) => {
                      hasLocalMealChangesRef.current = true; // Mark that user has unsaved changes
                      setMealRegistration({ ...mealRegistration, dinner: e.target.checked });
                    }}
                    disabled={mealsAvailed.dinner}
                    className="w-5 h-5 sm:w-6 sm:h-6 text-orange-500 bg-gray-700 border-gray-600 rounded focus:ring-orange-500 focus:ring-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  />
                  <div className="ml-4 flex-1">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 sm:h-8 sm:w-8 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                        </svg>
                        <div>
                          <h4 className="text-base sm:text-lg font-bold text-white">Dinner</h4>
                        </div>
                      </div>
                      {mealsAvailed.dinner && (
                        <div className="flex items-center space-x-2">
                          <svg className="w-5 h-5 sm:w-6 sm:h-6 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" />
                          </svg>
                          <span className="text-sm sm:text-base font-semibold text-green-400">Availed</span>
                        </div>
                      )}
                    </div>
                  </div>
                </motion.label>
              </div>

              {/* Submit Button */}
              <div className="mt-6 sm:mt-8">
                {mealsAvailed.breakfast && mealsAvailed.lunch && mealsAvailed.dinner && (
                  <p className="mb-3 text-xs sm:text-sm text-green-300 text-center">
                    All your meals for today have been availed. Please come back tomorrow to avail again.
                  </p>
                )}
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleMealRegistrationSubmit}
                  disabled={
                    isLoadingMealRegistration ||
                    (mealsAvailed.breakfast && mealsAvailed.lunch && mealsAvailed.dinner)
                  }
                  className="w-full bg-gradient-to-r from-orange-600 to-orange-700 hover:from-orange-700 hover:to-orange-800 text-white font-bold py-3 sm:py-4 rounded-xl shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed text-sm sm:text-base"
                >
                  {isLoadingMealRegistration ? (
                    <div className="flex items-center justify-center space-x-2">
                      <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      <span>Registering...</span>
                    </div>
                  ) : (
                    'Register Meals'
                  )}
                </motion.button>
              </div>

            </motion.div>
          </motion.div>
        )}

        {/* Settings Page */}
        {currentPage === 'settings' && (
          <SettingsPage user={user} onBack={() => setCurrentPage('home')} />
        )}
      </motion.div>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-[#1e293b] border-t border-gray-700/50 shadow-md flex justify-around py-2 z-40">
        <button 
          onClick={() => setCurrentPage('settings')}
          className="flex items-center justify-center p-2 rounded-full bg-gray-800/50 hover:bg-gray-700/50 text-gray-400 hover:text-gray-200 transition-all"
          aria-label="Settings"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        </button>

        <div className="relative">
          <button
            onClick={() => {
              setCurrentPage('home');
              setErrorMessage('');
              setSuccessMessage('');
            }}
            className={`absolute -top-8 left-1/2 transform -translate-x-1/2 flex flex-col items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-blue-600 to-blue-800 text-white shadow-lg hover:shadow-xl transition-all ${currentPage === 'home' ? 'ring-4 ring-blue-500/50' : ''}`}
            aria-label="Home"
          >
            <HomeIcon className="h-8 w-8" />
          </button>
        </div>

        <button
          onClick={() => setShowLogoutModal(true)}
          className="flex items-center justify-center p-2 rounded-full bg-gray-800/50 hover:bg-red-900/50 text-red-400 hover:text-red-300 transition-all"
          aria-label="Logout"
        >
          <LogoutIcon className="h-8 w-8" />
        </button>
      </nav>

      {/* Modals */}
      {showClaimModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-[#1e293b] rounded-2xl p-6 max-w-sm w-full shadow-lg border-2 border-gray-700/50 text-center space-y-4"
          >
            <h3 className="text-2xl font-bold text-green-400">🎉 Reward Claimed!</h3>
            <p className="text-gray-200">
              You've claimed:
              <br />
              <span className="font-bold text-blue-400">{claimedRewardName}</span>
            </p>

            <div className="text-sm text-gray-400 mt-2">
              Time: <span className="font-medium text-gray-300">{claimTime}</span>
            </div>

            <div className="mt-4 text-left">
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Cashier Verification Code
              </label>
              <input
                type="password"
                value={verificationCode}
                onChange={(e) => {
                  setVerificationCode(e.target.value);
                  setVerificationError('');
                }}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-center text-lg font-mono tracking-widest"
                placeholder="_ _ _ _"
                maxLength={4}
                autoFocus
              />
              {verificationError && (
                <p className="text-red-400 text-sm mt-1">{verificationError}</p>
              )}
              <p className="text-s text-gray-500 mt-2">
                The cashier will input the verification code
              </p>
            </div>

            <button
              onClick={handleVerification}
              className="mt-2 w-full bg-blue-600 text-white px-4 py-2 rounded-full hover:bg-blue-700 transition disabled:opacity-50"
              disabled={verificationCode.length !== 4 || isLoading}
            >
              {isLoading ? 'Verifying...' : 'Verify & Continue'}
            </button>
          </motion.div>
        </div>
      )}

      {/* Code Success Modal */}
      {showCodeSuccessModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-[#1e293b] rounded-2xl p-6 max-w-sm w-full shadow-xl border-2 border-gray-700/50"
          >
            <div className="text-center space-y-4">
              <div className="w-16 h-16 bg-green-900/50 rounded-full flex items-center justify-center mx-auto">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-gray-200">
                Congratulations!
              </h3>
              <p className="text-gray-300">
                {codeSuccessMessage}
              </p>
              <button 
                onClick={() => {
                  setShowCodeSuccessModal(false);
                  setCodeSuccessMessage('');
                  setShowFeedbackConfirmation(true);
                }}
                className="w-full py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-all"
              >
                OK
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Code Error Modal */}
      {showCodeErrorModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <motion.div 
            initial={{ scale: 0.8, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.8, opacity: 0, y: 20 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-3xl p-8 max-w-sm w-full mx-4 shadow-2xl border border-red-500/30 relative overflow-hidden"
          >
            {/* Animated background gradient */}
            <div className="absolute inset-0 bg-gradient-to-r from-red-500/10 via-orange-500/10 to-red-500/10 animate-pulse"></div>
            
            <div className="relative z-10 text-center space-y-6">
              {/* Enhanced icon with animation */}
              <motion.div 
                initial={{ scale: 0, rotate: -180 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ delay: 0.2, type: "spring", damping: 15 }}
                className="w-20 h-20 bg-gradient-to-br from-red-500/20 to-orange-500/20 rounded-full flex items-center justify-center mx-auto border-2 border-red-400/30 shadow-lg"
              >
                <motion.div
                  animate={{ rotate: [0, -10, 10, -10, 0] }}
                  transition={{ duration: 0.5, delay: 0.5 }}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </motion.div>
              </motion.div>
              
              {/* Enhanced title */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
              >
                <h3 className="text-2xl font-bold bg-gradient-to-r from-red-400 to-orange-400 bg-clip-text text-transparent">
                  Oops! Code Not Found
                </h3>
                <div className="w-16 h-1 bg-gradient-to-r from-red-500 to-orange-500 rounded-full mx-auto mt-2"></div>
              </motion.div>
              
              {/* Enhanced message */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="bg-slate-800/50 p-4 rounded-2xl border border-slate-700/50"
              >
                <p className="text-gray-300 text-base leading-relaxed">
                  {codeErrorMessage.includes('invalid') || codeErrorMessage.includes('used') || codeErrorMessage.includes('not found') ? 
                    "The code you entered doesn't seem to be valid. Please double-check and try again!" : 
                    codeErrorMessage
                  }
                </p>
                <div className="flex items-center justify-center mt-3 text-xs text-gray-400">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Enter the correct code
                </div>
              </motion.div>
              
              {/* Enhanced button */}
              <motion.button 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                whileHover={{ scale: 1.05, boxShadow: "0 10px 25px rgba(239, 68, 68, 0.3)" }}
                whileTap={{ scale: 0.95 }}
                onClick={() => {
                  setShowCodeErrorModal(false);
                  setCodeErrorMessage('');
                }}
                className="w-full py-4 bg-gradient-to-r from-red-500 to-orange-500 text-white rounded-2xl font-bold text-lg shadow-lg hover:from-red-600 hover:to-orange-600 transition-all duration-300 border border-red-400/30"
              >
                <span className="flex items-center justify-center">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  Try Again
                </span>
              </motion.button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Feedback Confirmation Dialog */}
      {showFeedbackConfirmation && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-[#1e293b] rounded-2xl p-6 max-w-sm w-full shadow-xl border-2 border-gray-700/50"
          >
            <div className="text-center space-y-4">
              <div className="w-16 h-16 bg-blue-900/50 rounded-full flex items-center justify-center mx-auto">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-gray-200">
                Want to earn more Points?
              </h3>
              <p className="text-gray-300">
                Submit a Feedback and get extra points!
              </p>
              <div className="flex space-x-4">
                <button 
                  onClick={() => {
                    setShowFeedbackConfirmation(false);
                  }}
                  className="flex-1 py-2 bg-gray-600 text-white rounded-lg font-medium hover:bg-gray-700 transition-all"
                >
                  Cancel
                </button>
                <button 
                  onClick={() => {
                    setShowFeedbackConfirmation(false);
                    setShowFeedbackForm(true);
                  }}
                  className="flex-1 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-all"
                >
                  Submit Feedback
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}

      {/* Daily Limit Reached Modal */}
      {showDailyLimit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-[#1e293b] rounded-2xl p-6 max-w-sm w-full shadow-xl border-2 border-yellow-700/50"
          >
            <div className="text-center space-y-4">
              <div className="w-16 h-16 bg-yellow-900/50 rounded-full flex items-center justify-center mx-auto">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-yellow-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-gray-200">
                Daily Limit Reached
              </h3>
              <p className="text-gray-300">
                You already submitted feedback today. Come back tomorrow and try again!
              </p>
              <button 
                onClick={() => setShowDailyLimit(false)}
                className="w-full py-3 bg-yellow-600 text-white rounded-xl font-bold hover:bg-yellow-700 transition-all"
              >
                OK
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Meal Feedback Confirmation Dialog */}
      {showMealFeedbackConfirmation && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-[#1e293b] rounded-2xl p-6 max-w-sm w-full shadow-xl border-2 border-gray-700/50"
          >
            <div className="text-center space-y-4">
              <div className="w-16 h-16 bg-green-900/50 rounded-full flex items-center justify-center mx-auto">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-gray-200">
                Help us improve!
              </h3>
              <p className="text-gray-300">
                Would you like to share your feedback about your meal experience?
              </p>
              <div className="flex space-x-4">
                <button 
                  onClick={() => {
                    setShowMealFeedbackConfirmation(false);
                  }}
                  className="flex-1 py-2 bg-gray-600 text-white rounded-lg font-medium hover:bg-gray-700 transition-all"
                >
                  No, thanks
                </button>
                <button 
                  onClick={() => {
                    setShowMealFeedbackConfirmation(false);
                    setShowMealFeedbackForm(true);
                  }}
                  className="flex-1 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-all"
                >
                  Give Feedback
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}

      {/* Feedback Success Modal */}
      {showFeedbackSuccess && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-[#1e293b] rounded-2xl p-6 max-w-sm w-full shadow-xl border-2 border-gray-700/50"
          >
            <div className="text-center space-y-4">
              <div className="w-16 h-16 bg-green-900/50 rounded-full flex items-center justify-center mx-auto">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-gray-200">
                Thank You!
              </h3>
              <p className="text-gray-300">
                {feedbackSuccessMessage}
              </p>
              <button 
                onClick={() => {
                  setShowFeedbackSuccess(false);
                  setFeedbackSuccessMessage('');
                  setCurrentPage('home');
                }}
                className="w-full py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-all"
              >
                OK
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Logout Confirmation Modal */}
      {showLogoutModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-[#1e293b] rounded-2xl p-6 w-80 shadow-2xl space-y-4 border border-gray-700/50">
            <h2 className="text-lg font-bold text-gray-200">Confirm Logout</h2>
            <p className="text-sm text-gray-400">Are you sure you want to log out?</p>

            <div className="flex justify-end space-x-4 pt-4">
              <button 
                onClick={() => setShowLogoutModal(false)}
                className="px-4 py-2 text-sm rounded-full border border-gray-300 bg-gray-100 text-gray-700 hover:bg-gray-200 transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleLogout}
                className="px-4 py-2 text-sm rounded-full bg-red-600 text-white hover:bg-red-700 transition-all"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      )}

      {showSuccessPopup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-[#1e293b] rounded-2xl p-6 max-w-sm w-full shadow-lg border-2 border-green-500/50 text-center space-y-4"
          >
            <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h3 className="text-2xl font-bold text-green-400">Successfully Claimed!</h3>
            <p className="text-gray-300">
              Your reward has been successfully verified and claimed.
            </p>
            <button
              onClick={() => {
                setShowSuccessPopup(false);
                setCurrentPage('home');
                // If there's a level up waiting, show it now
                if (newLevel && previousLevel) {
                  // Trigger confetti celebration for level up
                  confetti({
                    particleCount: 200,
                    spread: 120,
                    origin: { y: 0.6 },
                    colors: [newLevel.color, '#ffffff', '#f0f0f0']
                  });
                  setTimeout(() => {
                    setShowLevelUpModal(true);
                  }, 500);
                }
              }}
              className="mt-4 bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-full font-medium transition-colors"
            >
              Continue
            </button>
          </motion.div>
        </div>
      )}

      {showFeedbackForm && (
        <FeedbackForm
          onSubmit={handleFeedbackSubmit}
          onClose={() => setShowFeedbackForm(false)}
        />
      )}

      {showMealFeedbackForm && (
        <FeedbackForm
          onSubmit={handleSurveyFeedbackSubmit}
          onClose={() => setShowMealFeedbackForm(false)}
        />
      )}

      {/* Meal Avail Notification Modal */}
      {showAvailNotification && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.8, opacity: 0 }}
            className="bg-[#1e293b] rounded-2xl p-6 sm:p-8 max-w-sm w-full mx-4 shadow-xl border-2 border-green-500/50"
          >
            <div className="text-center space-y-6">
              {/* Success Icon */}
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", damping: 15 }}
                className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mx-auto"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </motion.div>

              {/* Message */}
              <div>
                <h3 className="text-2xl sm:text-3xl font-bold text-green-400 mb-2">
                  Your avail for {availedMealType} has been confirmed!
                </h3>
              </div>

              {/* Account ID Display */}
              {user.accountID && (
                <div className="bg-gradient-to-r from-purple-600/20 to-indigo-600/20 border-2 border-purple-500/50 rounded-xl p-4">
                  <p className="text-xs font-medium text-purple-300 uppercase tracking-wider mb-2">Your Account ID</p>
                  <p className="text-3xl sm:text-4xl font-bold text-white font-mono tracking-wider">{user.accountID}</p>
                </div>
              )}

              {/* Close Button */}
              <button
                onClick={() => {
                  setShowAvailNotification(false);
                  setAvailedMealType('');
                }}
                className="w-full py-3 bg-green-600 text-white rounded-xl font-bold hover:bg-green-700 transition-all"
              >
                OK
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Level Details Modal */}
      {showLevelDetailsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="bg-[#1e293b] rounded-2xl p-6 max-w-md w-full mx-4 shadow-2xl border-2 border-gray-700/50"
          >
            <div className="text-center space-y-6">
              {/* Header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <span className="text-2xl">{userLevel.icon}</span>
                  <div>
                    <h2 className="text-xl font-bold text-gray-200">{userLevel.name} Level</h2>
                    <p className="text-sm text-gray-400">{userLevel.description}</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowLevelDetailsModal(false)}
                  className="text-gray-400 hover:text-gray-200 transition-colors"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              
              {/* Progress Bar */}
              <div className="space-y-3">
                <div className="flex justify-between text-sm text-gray-400">
                  <span>{pointsUsed} points used</span>
                  {getNextLevel(userLevel) && (
                    <span>{getNextLevel(userLevel).minPoints} for next level</span>
                  )}
                </div>
                <div className="w-full bg-gray-700 rounded-full h-3">
                  <motion.div 
                    className={`h-3 rounded-full bg-gradient-to-r ${userLevel.gradient}`}
                    initial={{ width: 0 }}
                    animate={{ 
                      width: getNextLevel(userLevel) 
                        ? `${Math.min(100, ((pointsUsed - userLevel.minPoints) / (getNextLevel(userLevel).minPoints - userLevel.minPoints)) * 100)}%`
                        : '100%'
                    }}
                    transition={{ duration: 1, ease: "easeOut" }}
                  />
                </div>
                {getNextLevel(userLevel) && (
                  <p className="text-xs text-gray-500">
                    {getNextLevel(userLevel).minPoints - pointsUsed} more points to reach {getNextLevel(userLevel).name} level
                  </p>
                )}
                {!getNextLevel(userLevel) && (
                  <p className="text-xs text-yellow-400 font-semibold">
                    🎉 You've reached the highest level!
                  </p>
                )}
              </div>
              
              {/* Level Benefits */}
              <div className="space-y-3">
                <h3 className="text-lg font-semibold text-gray-200">Current Benefits</h3>
                <div className="space-y-2">
                  {userLevel.perks.map((perk, index) => (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.1 }}
                      className="flex items-center space-x-3 p-2 bg-gray-800/50 rounded-lg"
                    >
                      <span className="text-green-400">✓</span>
                      <span className="text-gray-300 text-sm">{perk}</span>
                    </motion.div>
                  ))}
                </div>
              </div>
              
              {/* All Levels Overview */}
              <div className="space-y-3">
                <h3 className="text-lg font-semibold text-gray-200">All Levels</h3>
                <div className="space-y-2">
                  {Object.entries(LOYALTY_LEVELS).map(([key, level]) => (
                    <div
                      key={key}
                      className={`flex items-center justify-between p-2 rounded-lg ${
                        userLevel.key === key 
                          ? `bg-gradient-to-r ${level.gradient} text-white` 
                          : 'bg-gray-800/30 text-gray-400'
                      }`}
                    >
                      <div className="flex items-center space-x-2">
                        <span>{level.icon}</span>
                        <span className="text-sm font-medium">{level.name}</span>
                      </div>
                      <span className="text-xs">
                        {level.minPoints === Infinity ? '500+' : `${level.minPoints}-${level.maxPoints}`} pts
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      )}

      {/* Level Up Modal */}
      {showLevelUpModal && newLevel && previousLevel && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
          <motion.div
            initial={{ scale: 0.5, opacity: 0, rotateY: -180 }}
            animate={{ scale: 1, opacity: 1, rotateY: 0 }}
            transition={{ 
              type: "spring", 
              damping: 15, 
              stiffness: 300,
              duration: 0.8 
            }}
            className="bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 rounded-3xl p-8 max-w-md w-full mx-4 shadow-2xl border-2 border-gray-600 relative overflow-hidden"
          >
            {/* Animated background */}
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent transform -skew-x-12 animate-pulse"></div>
            
            <div className="relative z-10 text-center space-y-6">
              {/* Level up icon */}
              <motion.div
                initial={{ scale: 0, rotate: -180 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ delay: 0.3, type: "spring", damping: 15 }}
                className="w-24 h-24 mx-auto bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full flex items-center justify-center shadow-2xl"
              >
                <span className="text-4xl">🎉</span>
              </motion.div>
              
              {/* Level up text */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
              >
                <h2 className="text-3xl font-bold text-white mb-2">LEVEL UP!</h2>
                <div className="flex items-center justify-center space-x-4 mb-4">
                  <div className={`px-4 py-2 rounded-full bg-gradient-to-r ${previousLevel.gradient} text-white font-bold`}>
                    {previousLevel.icon} {previousLevel.name}
                  </div>
                  <div className="text-2xl text-gray-400">→</div>
                  <div className={`px-4 py-2 rounded-full bg-gradient-to-r ${newLevel.gradient} text-white font-bold`}>
                    {newLevel.icon} {newLevel.name}
                  </div>
                </div>
                <p className="text-gray-300 text-lg">{newLevel.description}</p>
              </motion.div>
              
              {/* New benefits */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.7 }}
                className="bg-gray-800/50 p-4 rounded-xl border border-gray-600"
              >
                <h3 className="text-lg font-semibold text-white mb-3">New Benefits Unlocked!</h3>
                <div className="space-y-2">
                  {newLevel.perks.map((perk, index) => (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.8 + index * 0.1 }}
                      className="flex items-center space-x-2 text-gray-300"
                    >
                      <span className="text-green-400">✓</span>
                      <span>{perk}</span>
                    </motion.div>
                  ))}
                </div>
              </motion.div>
              
              {/* Continue button */}
              <motion.button
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 1 }}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => {
                  setShowLevelUpModal(false);
                  setNewLevel(null);
                  setPreviousLevel(null);
                }}
                className={`w-full py-4 bg-gradient-to-r ${newLevel.gradient} text-white rounded-xl font-bold text-lg shadow-lg hover:shadow-xl transition-all duration-300`}
              >
                Continue Your Journey! 🚀
              </motion.button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Claimed Reward Details Modal */}
      {showClaimedRewardModal && selectedClaimedReward && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm"
          onClick={closeClaimedRewardModal}
        >
          <motion.div
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.5, opacity: 0 }}
            transition={{ 
              type: "spring", 
              damping: 20, 
              stiffness: 300
            }}
            onClick={(e) => e.stopPropagation()}
            className="bg-gradient-to-br from-gray-900/95 via-slate-800/95 to-gray-700/95 rounded-xl sm:rounded-2xl p-4 sm:p-6 max-w-sm sm:max-w-md w-full mx-2 sm:mx-4 shadow-2xl border-2 border-blue-500/50 relative overflow-hidden max-h-[90vh] overflow-y-auto"

          >
            {/* Close button */}
            <button
              onClick={closeClaimedRewardModal}
              className="absolute top-3 right-3 sm:top-4 sm:right-4 text-gray-300 hover:text-white transition-colors z-20 p-2 rounded-full hover:bg-gray-700/50"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 sm:h-6 sm:w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            
            <div className="relative z-10 space-y-4 sm:space-y-6">
              {/* Header */}
              <div className="text-center">
                <div className="w-12 h-12 sm:w-16 sm:h-16 mx-auto bg-green-500 rounded-full flex items-center justify-center mb-3 sm:mb-4">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 sm:h-8 sm:w-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <h2 className="text-xl sm:text-2xl font-bold text-green-300 mb-1 sm:mb-2">Reward Details</h2>
                <p className="text-gray-300 text-sm sm:text-base">Here are the details of your claimed reward</p>
              </div>

              {/* Reward Image */}
              {selectedClaimedReward.reward?.imageUrl && (
                <div className="flex justify-center">
                  <img
                    src={selectedClaimedReward.reward.imageUrl}
                    alt={selectedClaimedReward.reward.name}
                    className="h-24 w-24 sm:h-32 sm:w-32 rounded-lg sm:rounded-xl object-cover border-2 sm:border-4 border-green-500/50 shadow-lg"
                    onError={(e) => {
                      e.target.style.display = 'none';
                    }}
                  />
                </div>
              )}

              {/* Reward Information */}
              <div className="bg-green-800/30 p-3 sm:p-4 rounded-lg sm:rounded-xl border border-green-700/50 space-y-3 sm:space-y-4">
                <div>
                  <h3 className="text-lg sm:text-xl font-bold text-green-300 mb-1 sm:mb-2">
                    {selectedClaimedReward.reward?.name || 'Reward'}
                  </h3>
                  <p className="text-gray-300 text-xs sm:text-sm">
                    {selectedClaimedReward.reward?.description || 'Awesome reward claimed!'}
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 text-xs sm:text-sm">
                  <div className="bg-green-900/30 p-2 sm:p-3 rounded-lg">
                    <span className="text-gray-400 block text-xs sm:text-sm">Points Spent</span>
                    <span className="text-green-300 font-bold text-sm sm:text-lg">
                      {selectedClaimedReward.reward?.cost || selectedClaimedReward.pointsUsed || 'N/A'} pts
                    </span>
                  </div>
                  <div className="bg-green-900/30 p-2 sm:p-3 rounded-lg">
                    <span className="text-gray-400 block text-xs sm:text-sm">Claimed Date</span>
                    <span className="text-green-300 font-bold text-xs sm:text-sm">
                      {new Date(selectedClaimedReward.claimedAt).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric'
                      })}
                    </span>
                  </div>
                </div>

                <div className="bg-green-900/30 p-2 sm:p-3 rounded-lg">
                  <span className="text-gray-400 block text-xs sm:text-sm">Claimed Time</span>
                  <span className="text-green-300 font-medium text-xs sm:text-sm">
                    {new Date(selectedClaimedReward.claimedAt).toLocaleTimeString('en-US', {
                      hour: '2-digit',
                      minute: '2-digit',
                      hour12: true
                    })}
                  </span>
                </div>

                <div className="flex items-center justify-center space-x-2 bg-green-500/20 p-2 sm:p-3 rounded-lg border border-green-500/30">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 sm:h-5 sm:w-5 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span className="text-green-300 font-medium text-xs sm:text-sm">Successfully Claimed</span>
                </div>
              </div>

            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}

function SettingsPage({ user, onBack }) {
  const [currentPassword, setCurrentPassword] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [section, setSection] = useState('profile');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const baseUrl = import.meta.env.VITE_API_BASE_URL;
  const { logout } = useAuth();
  const navigate = useNavigate();

  const handleProfileUpdate = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (!currentPassword) {
      setErrorMsg('Please enter your current password');
      return;
    }

    if (password !== confirmPassword) {
      setErrorMsg('New passwords do not match');
      return;
    }

    try {
      setIsLoading(true);
      const token = user.token;
      await axios.put(
        `${baseUrl}/api/student/profile`,
        { 
          currentPassword,
          newPassword: password
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setSuccessMsg('Password updated successfully!');
      setCurrentPassword('');
      setPassword('');
      setConfirmPassword('');
    } catch (err) {
      if (err.response?.data?.message === 'Current password is incorrect') {
        setErrorMsg('Current password is incorrect. Please try again.');
      } else {
        setErrorMsg(err.response?.data?.message || 'Failed to update profile');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteAccount = async () => {
    try {
      setIsDeleting(true);
      const token = user.token;
      await axios.delete(
        `${baseUrl}/api/student/account`,
        { 
          headers: { 
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          data: { password: currentPassword }
        }
      );
      
      // Logout and redirect on successful deletion
      await logout();
      navigate('/login', { state: { message: 'Your account has been successfully deleted.' } });
    } catch (err) {
      setErrorMsg(err.response?.data?.message || 'Failed to delete account. Please try again.');
      setShowDeleteConfirm(false);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-4 sm:p-6 bg-gradient-to-br from-gray-50 to-gray-100 min-h-screen">
      <div className="max-w-2xl mx-auto">
      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
        >
          <motion.div 
            initial={{ scale: 0.95, y: 20, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            transition={{ type: 'spring', damping: 25, stiffness: 500 }}
            className="bg-white rounded-2xl shadow-xl max-w-md w-full overflow-hidden"
          >
            <div className="h-1.5 bg-gradient-to-r from-red-500 to-red-600"></div>
            
            <div className="p-6">
              <div className="flex items-start">
                <div className="flex-shrink-0 p-3 bg-red-100 rounded-xl">
                  <svg className="h-6 w-6 text-red-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>
                <div className="ml-4">
                  <h3 className="text-xl font-bold text-gray-900">Delete Your Account</h3>
                  <p className="mt-1 text-gray-600">
                    This action is permanent and cannot be undone. All your data will be permanently removed.
                  </p>
                </div>
              </div>

              <div className="mt-6 space-y-1">
                <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700">
                  Enter your password to confirm
                </label>
                <div className="relative mt-1">
                  <input
                    type="password"
                    id="confirmPassword"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    className="block w-full px-4 py-3 pr-10 border text-black border-gray-300 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-red-500 shadow-sm transition duration-150"
                    placeholder="Current password"
                    required
                    autoComplete="current-password"
                  />
                  <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                    <svg className="h-5 w-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                    </svg>
                  </div>
                </div>
              </div>

              {errorMsg && (
                <motion.div 
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-4 p-3 bg-red-50 text-red-700 rounded-lg flex items-start text-sm"
                >
                  <svg className="h-5 w-5 mr-2 text-red-500 flex-shrink-0 mt-0.5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                  <span>{errorMsg}</span>
                </motion.div>
              )}

              <div className="mt-6 flex flex-col-reverse sm:flex-row sm:justify-end space-y-3 sm:space-y-0 sm:space-x-3">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  type="button"
                  onClick={() => setShowDeleteConfirm(false)}
                  className="px-5 py-2.5 border border-gray-300 rounded-xl text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-400 font-medium transition-all duration-200"
                  disabled={isDeleting}
                >
                  Cancel
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  type="button"
                  onClick={handleDeleteAccount}
                  className="px-5 py-2.5 border border-transparent rounded-xl shadow-sm text-white bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 font-medium flex items-center justify-center transition-all duration-200 disabled:opacity-70 disabled:cursor-not-allowed"
                  disabled={isDeleting || !currentPassword}
                >
                  {isDeleting ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Deleting...
                    </>
                  ) : (
                    <>
                      <svg className="h-5 w-5 mr-2 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 22H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                      Delete Account
                    </>
                  )}
                </motion.button>
              </div>
            </div>
            
            <div className="bg-gray-50 px-6 py-4 border-t border-gray-100 rounded-b-2xl">
              <p className="text-xs text-gray-500 text-center">
                Having trouble? Contact support at infotechvarda@gmail.com
              </p>
            </div>
          </motion.div>
        </motion.div>
      )}
        {/* Header */}
        <div className="flex items-center mb-8">
          <button 
            onClick={onBack} 
            className="p-2 mr-4 text-purple-600 hover:bg-purple-50 rounded-full transition-colors duration-200"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div>
            <h1 className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent">
              Account Settings
            </h1>
            <p className="text-gray-500 text-sm">Manage your account preferences</p>
          </div>
        </div>

        {/* Navigation Tabs - Responsive */}
        <div className="mb-8">
          <div className="flex flex-nowrap overflow-x-auto pb-1 -mb-px hide-scrollbar">
            <div className="inline-flex space-x-1">
              <button 
                onClick={() => setSection('profile')} 
                className={`px-3 sm:px-4 py-2 text-xs sm:text-sm font-medium rounded-t-lg transition-all duration-200 flex items-center space-x-1.5 whitespace-nowrap ${
                  section === 'profile' 
                    ? 'text-purple-700 bg-white border-t border-l border-r border-gray-200 shadow-sm' 
                    : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                }`}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 sm:h-5 sm:w-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <span>Profile</span>
              </button>
              
              <button 
                onClick={() => setSection('about')} 
                className={`px-3 sm:px-4 py-2 text-xs sm:text-sm font-medium rounded-t-lg transition-all duration-200 flex items-center space-x-1.5 whitespace-nowrap ${
                  section === 'about' 
                    ? 'text-purple-700 bg-white border-t border-l border-r border-gray-200 shadow-sm' 
                    : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                }`}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 sm:h-5 sm:w-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>About</span>
              </button>
              
              <button 
                onClick={() => setSection('help')} 
                className={`px-3 sm:px-4 py-2 text-xs sm:text-sm font-medium rounded-t-lg transition-all duration-200 flex items-center space-x-1.5 whitespace-nowrap ${
                  section === 'help' 
                    ? 'text-purple-700 bg-white border-t border-l border-r border-gray-200 shadow-sm' 
                    : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                }`}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 sm:h-5 sm:w-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>Help</span>
              </button>
              
              <button 
                onClick={() => setSection('danger')} 
                className={`px-3 sm:px-4 py-2 text-xs sm:text-sm font-medium rounded-t-lg transition-all duration-200 flex items-center space-x-1.5 whitespace-nowrap ${
                  section === 'danger' 
                    ? 'text-red-700 bg-white border-t border-l border-r border-gray-200 shadow-sm' 
                    : 'text-red-500 hover:text-red-700 hover:bg-red-50'
                }`}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 sm:h-5 sm:w-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <span>Danger Zone</span>
              </button>
            </div>
          </div>
        </div>
        
        {/* Add this to your global styles or in a style tag */}
        <style jsx={"true"} global={"true"}>{`
          .hide-scrollbar::-webkit-scrollbar {
            display: none; /* Hide scrollbar for Chrome, Safari and Opera */
          }
          .hide-scrollbar {
            -ms-overflow-style: none;  /* IE and Edge */
            scrollbar-width: none;  /* Firefox */
          }
        `}</style>
      {section === 'profile' && (
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6"
        >
          <div className="mb-8">
            <h2 className="text-lg font-semibold text-gray-900 flex items-center mb-4">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.121 17.804A13.937 13.937 0 0112 16c2.5 0 4.847.655 6.879 1.804M15 10a3 3 0 11-6 0 3 3 0 016 0zm6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Profile Information
            </h2>
            <motion.div 
              className="bg-gradient-to-r from-indigo-50 to-purple-50 p-5 rounded-xl border border-indigo-100 shadow-sm"
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.1 }}
            >
              <div className="space-y-4">
                <div className="flex items-center space-x-3">
                  <div className="flex-shrink-0">
                    <div className="h-10 w-10 rounded-full bg-indigo-100 flex items-center justify-center">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-indigo-600" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                      </svg>
                    </div>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-indigo-600 uppercase tracking-wider mb-1">Student ID</p>
                    <div className="flex items-center">
                      <span className="text-xl font-bold text-gray-900 font-mono tracking-tight">{user.idNumber}</span>
                    </div>
                  </div>
                </div>
                {user.accountID && (
                  <div className="flex items-center space-x-3">
                    <div className="flex-shrink-0">
                      <div className="h-10 w-10 rounded-full bg-purple-100 flex items-center justify-center">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-purple-600" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
                        </svg>
                      </div>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-purple-600 uppercase tracking-wider mb-1">Account ID</p>
                      <div className="flex items-center">
                        <span className="text-xl font-bold text-gray-900 font-mono tracking-tight">{user.accountID}</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
          
          <h3 className="text-md font-semibold text-gray-900 mb-4 flex items-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
            Change Password
          </h3>
          
          <form onSubmit={handleProfileUpdate} className="space-y-5">
            <div className="space-y-1">
              <label className="block text-sm font-medium text-gray-700">Current Password</label>
              <input 
                type="password" 
                className="w-full px-4 py-2.5 border text-black border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all" 
                value={currentPassword} 
                onChange={e => setCurrentPassword(e.target.value)} 
                placeholder="Enter your current password"
                required
              />
            </div>
            
            <div className="space-y-1">
              <label className="block text-sm font-medium text-gray-700">New Password</label>
              <input 
                type="password" 
                className="w-full px-4 py-2.5 border text-black border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all" 
                value={password} 
                onChange={e => setPassword(e.target.value)} 
                placeholder="Choose a new password"
                required
              />
            </div>
            
            <div className="space-y-1">
              <label className="block text-sm font-medium text-gray-700">Confirm New Password</label>
              <input 
                type="password" 
                className="w-full px-4 py-2.5 border text-black border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all" 
                value={confirmPassword} 
                onChange={e => setConfirmPassword(e.target.value)} 
                placeholder="Confirm your new password"
                required
              />
            </div>
            
            {/* Status Messages */}
            {errorMsg && (
              <motion.div 
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-4 bg-red-50 border-l-4 border-red-500 rounded-r-lg flex items-start space-x-3"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                <div>
                  <h4 className="text-sm font-medium text-red-800">Error updating password</h4>
                  <p className="text-sm text-red-600">{errorMsg}</p>
                </div>
              </motion.div>
            )}
            
            {successMsg && (
              <motion.div 
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-4 bg-green-50 border-l-4 border-green-500 rounded-r-lg flex items-start space-x-3"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <div>
                  <h4 className="text-sm font-medium text-green-800">Password updated</h4>
                  <p className="text-sm text-green-600">Your password has been updated successfully.</p>
                </div>
              </motion.div>
            )}
            
            <div className="pt-2">
              <button 
                type="submit" 
                disabled={isLoading} 
                className="w-full py-3 px-4 bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-medium rounded-lg hover:from-purple-700 hover:to-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 disabled:opacity-70 transition-all flex items-center justify-center shadow-sm hover:shadow-md"
              >
                {isLoading ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Updating...
                  </>
                ) : (
                  <>
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                    </svg>
                    Update Password
                  </>
                )}
              </button>
            </div>
          </form>
        </motion.div>
      )}
      {section === 'danger' && (
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="space-y-6"
        >
          <div className="bg-gradient-to-r from-red-50 to-red-50 border-l-4 border-red-500 p-5 rounded-lg shadow-sm">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-6 w-6 text-red-500" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-base font-medium text-red-800">Danger Zone</h3>
                <p className="text-sm text-red-700 mt-1">
                  This area contains sensitive account actions. Proceed with extreme caution. Changes made here are permanent and cannot be undone.
                </p>
              </div>
            </div>
          </div>
          
          <div className="border border-red-100 rounded-xl p-6 bg-white shadow-sm relative overflow-hidden">
            <div className="absolute top-0 right-0 w-full h-1 bg-gradient-to-r from-red-500 to-red-600"></div>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
              <div className="mb-4 sm:mb-0">
                <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-red-500 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                  Delete Account
                </h3>
                <p className="text-sm text-gray-600 mt-1">
                  Permanently delete your account and all associated data. This action cannot be undone.
                </p>
              </div>
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="inline-flex items-center justify-center px-5 py-2.5 border border-transparent text-sm font-medium rounded-lg text-white bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-all shadow-sm hover:shadow-md"
              >
                <TrashIcon className="h-4 w-4 mr-2" />
                Delete My Account
              </button>
            </div>
            
            <div className="mt-6 pt-6 border-t border-gray-100">
              <h4 className="text-sm font-medium text-gray-900 mb-3">Before you go...</h4>
              <ul className="text-sm text-gray-600 space-y-2">
                <li className="flex items-start">
                  <svg className="h-5 w-5 text-red-400 mr-2 mt-0.5 flex-shrink-0" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  <span>All your data will be permanently removed from our servers</span>
                </li>
                <li className="flex items-start">
                  <svg className="h-5 w-5 text-red-400 mr-2 mt-0.5 flex-shrink-0" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  <span>This action cannot be undone or recovered</span>
                </li>
                <li className="flex items-start">
                  <svg className="h-5 w-5 text-red-400 mr-2 mt-0.5 flex-shrink-0" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  <span>You will lose access to all your rewards and points</span>
                </li>
              </ul>
            </div>
          </div>
        </motion.div>
      )}
      {section === 'about' && (
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="bg-white rounded-xl shadow-sm border border-gray-100 p-6"
        >
          <div className="flex items-center mb-6">
            <div className="p-3 rounded-full bg-purple-50 text-purple-600 mr-4">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent">
              About Varda Group
            </h2>
          </div>
          
          <div className="space-y-5">
            <div className="p-5 bg-purple-50 rounded-xl border border-purple-100">
              <p className="text-gray-700 leading-relaxed">
                Varda Group Web Application is a loyalty reward system designed to promote sustainable practices among students by encouraging the borrowing and proper return of reusable items.
              </p>
            </div>
            
            <div className="grid md:grid-cols-2 gap-5 mt-6">
              <div className="p-5 bg-white border border-gray-100 rounded-xl shadow-sm hover:shadow-md transition-shadow">
                <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mb-4">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h3 className="font-semibold text-gray-900 mb-2">Our Mission</h3>
                <p className="text-sm text-gray-600">To create a sustainable environment by reducing single-use items and promoting responsible consumption.</p>
              </div>
              
              <div className="p-5 bg-white border border-gray-100 rounded-xl shadow-sm hover:shadow-md transition-shadow">
                <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mb-4">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
                <h3 className="font-semibold text-gray-900 mb-2">How It Works</h3>
                <p className="text-sm text-gray-600">Earn points by borrowing and returning items. Redeem points for exciting rewards.</p>
              </div>
            </div>
          </div>
        </motion.div>
      )}
      
      {section === 'help' && (
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="bg-white rounded-xl shadow-sm border border-gray-100 p-6"
        >
          <div className="flex items-center mb-6">
            <div className="p-3 rounded-full bg-indigo-50 text-indigo-600 mr-4">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
              Help & Support
            </h2>
          </div>
          
          <div className="space-y-6">
            <div className="p-5 bg-indigo-50 rounded-xl border border-indigo-100">
              <h3 className="font-semibold text-indigo-900 mb-3">Need Assistance?</h3>
              <p className="text-gray-700 mb-4">
                We're here to help! Visit the cashier for immediate assistance or contact our support team.
              </p>
              <div className="bg-white p-4 rounded-lg border border-indigo-100">
                <div className="flex items-start">
                  <div className="flex-shrink-0 mt-1">
                    <svg className="h-5 w-5 text-indigo-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <p className="text-sm text-indigo-600">infotechvarda@gmail.com</p>
                    <p className="text-xs text-gray-500 mt-1">Open Monday to Saturday, 7:00 AM - 6:00 PM</p>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="space-y-4">
              <h3 className="font-semibold text-gray-900">Quick Help</h3>
              
              <div className="border border-gray-200 rounded-xl overflow-hidden">
                <div className="p-4 border-b border-gray-100 bg-gray-50">
                  <h4 className="font-medium text-gray-900">How do I earn points?</h4>
                </div>
                <div className="p-4 bg-white">
                  <p className="text-sm text-gray-600">Earn points by borrowing and returning items. Each successful return with all items in good condition will recieve a redeemable code.</p>
                </div>
              </div>
              
              <div className="border border-gray-200 rounded-xl overflow-hidden">
                <div className="p-4 border-b border-gray-100 bg-gray-50">
                  <h4 className="font-medium text-gray-900">What can I do with my points?</h4>
                </div>
                <div className="p-4 bg-white">
                  <p className="text-sm text-gray-600">Points can be redeemed for various rewards. Check the Rewards section to see what's available and how many points you need.</p>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  </div>
  );
}