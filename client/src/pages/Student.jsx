import { useEffect, useState } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { HomeIcon, TicketIcon, GiftIcon, LogoutIcon, ShoppingBagIcon, XIcon, TrashIcon } from '@heroicons/react/outline';
import { motion, AnimatePresence } from 'framer-motion';
import confetti from 'canvas-confetti';
import completeSetImage from '../assets/completeset.png';
import basicSetImage from '../assets/basicset.png';
import spoonImage from '../assets/spoon.png';
import forkImage from '../assets/fork.png';
import plateImage from '../assets/plate.png';
import bowlImage from '../assets/bowl.png';
import glassImage from '../assets/glassofwater.png'; 
import saucerImage from '../assets/saucer.png';
import twoGonzLogo from '../assets/2gonzlogo.png';
import FeedbackForm from '../components/FeedbackForm';

export default function StudentPage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [points, setPoints] = useState(0);
  const [rewards, setRewards] = useState([]);
  const [code, setCode] = useState('');
  const [rating, setRating] = useState(0);
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
  const [borrowedItems, setBorrowedItems] = useState([]);
  const [availableItems, setAvailableItems] = useState([
    {
      id: 1,
      name: 'Basic Set',
      image: basicSetImage,
      description: 'Basic dining set (Plate, Spoon, Fork, Tray)',
      cartQuantity: 0,
      isSet: true
    },
    {
      id: 2,
      name: 'Complete Set',
      image: completeSetImage,
      description: 'Complete dining set (Plate, Bowl, Spoon, Fork, Glass, Tray)',
      cartQuantity: 0,
      isSet: true
    },
    { 
      id: 3, 
      name: 'Spoon', 
      image: spoonImage,
      description: 'Stainless steel spoon for your dining needs',
      cartQuantity: 0
    },
    { 
      id: 4, 
      name: 'Fork', 
      image: forkImage,
      description: 'Stainless steel fork for your dining needs',
      cartQuantity: 0
    },
    { 
      id: 5, 
      name: 'Plate', 
      image: plateImage,
      description: 'Ceramic plate',
      cartQuantity: 0
    },
    { 
      id: 6, 
      name: 'Bowl', 
      image: bowlImage,
      description: 'Ceramic bowl',
      cartQuantity: 0
    },
    { 
      id: 7, 
      name: 'Saucer', 
      image: saucerImage,
      description: 'Smaller plate',
      cartQuantity: 0
    },
    { 
      id: 8, 
      name: 'Glass', 
      image: glassImage,
      description: 'Glass for water and beverages',
      cartQuantity: 0
    },
  ]);
  const [showCart, setShowCart] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [showCodeSuccessModal, setShowCodeSuccessModal] = useState(false);
  const [codeSuccessMessage, setCodeSuccessMessage] = useState('');
  const [showCodeErrorModal, setShowCodeErrorModal] = useState(false);
  const [codeErrorMessage, setCodeErrorMessage] = useState('');
  const [message, setMessage] = useState({ type: '', text: '' });
  const [error, setError] = useState('');
  const [currentReturnItem, setCurrentReturnItem] = useState(null);
  const [modalType, setModalType] = useState('');
  const [modalItems, setModalItems] = useState([]);
  const [modalTime, setModalTime] = useState('');
  const [showFeedbackForm, setShowFeedbackForm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isReturning, setIsReturning] = useState(false);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [reviewItems, setReviewItems] = useState([]);

  const baseUrl = import.meta.env.VITE_API_BASE_URL;
  const token = user.token;

  // Add fetchUserPoints function
  const fetchUserPoints = async () => {
    try {
      const response = await axios.get(`${baseUrl}/api/student/points`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setPoints(response.data.points);
    } catch (error) {
      console.error('Error fetching user points:', error);
      setError('Failed to fetch points balance');
    }
  };

  // Call fetchUserPoints when component mounts and when token changes
  useEffect(() => {
    fetchUserPoints();
  }, [token]);

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
        setRewards(rewardsRes.data);
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

  // Update handleConfirmOrder function
  const handleConfirmOrder = async () => {
    if (isSubmitting) return; // Prevent multiple submissions
    
    const itemsToBorrow = availableItems.filter(item => item.cartQuantity > 0);
    
    if (itemsToBorrow.length === 0) {
      setErrorMessage('Your cart is empty. Please add items before confirming your borrow.');
      return;
    }

    console.log('Starting borrow process...');
    const timestamp = new Date().toISOString();
    const orderDetails = {
      studentId: user._id,
      studentIdNumber: user.idNumber,
      items: itemsToBorrow.map(item => ({
        name: item.name,
        quantity: item.cartQuantity
      })),
      timestamp: timestamp
    };

    try {
      setIsSubmitting(true);
      console.log('Making API call to borrow items...');
      // Use retry logic for the API call
      const response = await retryOperation(async () => {
        return await axios.post(
          `${baseUrl}/api/student/borrow-items`,
          orderDetails,
          {
            headers: { Authorization: `Bearer ${token}` },
            timeout: 30000 // Increased timeout to 30 seconds
          }
        );
      });
      console.log('API call successful:', response.data);

      // Store items and time for modal display
      console.log('Setting modal state...');
      setModalItems(itemsToBorrow);
      setModalTime(new Date().toLocaleString());
      setModalType('borrow');
      setSuccessMessage('Borrow Complete!');
      setShowSuccessModal(true);
      console.log('Modal state set:', {
        modalItems: itemsToBorrow,
        modalTime: new Date().toLocaleString(),
        modalType: 'borrow',
        showSuccessModal: true
      });
      setShowCart(false); // Close cart only after successful borrow

      // Reset cart quantities
      setAvailableItems(prevItems => 
        prevItems.map(item => ({ ...item, cartQuantity: 0 }))
      );

      // Fetch updated borrowed items with retry
      await retryOperation(fetchBorrowedItems);
    } catch (error) {
      console.error('Error creating borrow record:', error);
      if (error.code === 'ECONNABORTED') {
        setErrorMessage('Request timed out. Please check your connection and try again.');
      } else if (error.code === 'ECONNRESET') {
        setErrorMessage('Network connection was lost. Please refresh the page.');
      } else {
        setErrorMessage('Failed to create borrow record. Please try again.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // Update handleReturn function
  const handleReturn = async (item) => {
    if (isReturning) return; // Prevent multiple submissions
    
    try {
      setIsReturning(true);
      const returnData = {
        studentId: user._id,
        studentIdNumber: user.idNumber,
        items: item.items,
        timestamp: item.borrowTime
      };

      // Use retry logic for the API call
      await retryOperation(async () => {
        return await axios.post(
          `${baseUrl}/api/student/return-items`,
          returnData,
          {
            headers: { Authorization: `Bearer ${token}` },
            timeout: 30000 // Increased timeout to 30 seconds
          }
        );
      });

      // Store items and time for modal display
      setModalItems(item.items);
      setModalTime(new Date().toLocaleString());
      setModalType('return');
      setSuccessMessage('Return Complete!');
      setShowSuccessModal(true);

      // Fetch updated borrowed items with retry
      await retryOperation(fetchBorrowedItems);
    } catch (error) {
      console.error('Error returning items:', error);
      if (error.code === 'ECONNABORTED') {
        setErrorMessage('Request timed out. Please check your connection and try again.');
      } else if (error.code === 'ECONNRESET') {
        setErrorMessage('Network connection was lost. Please refresh the page.');
      } else {
        setErrorMessage('Failed to return items. Please try again.');
      }
    } finally {
      setIsReturning(false);
    }
  };

  // Update fetchBorrowedItems function with better error handling and caching
  const fetchBorrowedItems = async () => {
    try {
      const response = await axios.get(
        `${baseUrl}/api/student/borrowed-items`,
        {
          headers: { Authorization: `Bearer ${token}` },
          timeout: 10000 // Reduced timeout to 10 seconds
        }
      );
      
      // Only update state if we have new data
      if (response.data.data) {
        setBorrowedItems(response.data.data);
      }
    } catch (error) {
      console.error('Error fetching borrowed items:', error);
      if (error.code === 'ECONNABORTED') {
        setErrorMessage('Request timed out. Please check your connection and try again.');
      } else if (error.code === 'ECONNRESET') {
        setErrorMessage('Network connection was lost. Please refresh the page.');
      } else {
        setErrorMessage('Failed to fetch borrowed items. Please refresh the page.');
      }
    }
  };

  // Update polling interval for borrowed items
  useEffect(() => {
    if (currentPage === 'borrow' || currentPage === 'home') {
      fetchBorrowedItems();
      // Increase polling interval to 60 seconds
      const pollInterval = setInterval(fetchBorrowedItems, 60000);
      return () => clearInterval(pollInterval);
    }
  }, [currentPage, token]);

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

      const claimed = rewards.find((r) => r._id === rewardId);
      setClaimedRewardName(claimed?.name || 'Reward');
      setClaimTime(new Date().toLocaleString());
      setShowClaimModal(true);

      confetti({ particleCount: 150, spread: 100, origin: { y: 0.6 } });
    } catch (err) {
      setErrorMessage(err.response?.data?.message || 'Failed to claim reward');
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
    <div className="min-h-screen bg-[#0f172a] text-white">
      <AnimatePresence>
        {message.text && <MessageDisplay />}
      </AnimatePresence>
      <motion.div
        key={currentPage}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        transition={{ duration: 0.3 }}
        className="container mx-auto px-4 py-8 pb-24"
      >
        {/* Home Page */}
        {currentPage === 'home' && (
          <motion.div variants={itemVariants} className="space-y-6">
            <motion.div 
              className="relative mx-auto p-3 sm:p-4 md:p-6 w-full max-w-md bg-gradient-to-br from-purple-500 via-purple-700 to-purple-500 rounded-2xl shadow-2xl text-white overflow-hidden"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              style={{
                perspective: "1000px",
                transformStyle: "preserve-3d",
                height: "clamp(220px, 50vw, 280px)",
                width: "clamp(280px, 85vw, 400px)",
                margin: "0 auto 2rem auto"
              }}
            >
              {/* Card Content */}
              <div className="relative z-10 flex flex-col justify-between h-full">
                {/* Card issuer and chip */}
                <div className="flex justify-between items-start">
                  <div className="flex items-center space-x-3">
                    <img src={twoGonzLogo} alt="2gonz Logo" className="h-8 sm:h-10 md:h-12 w-auto" />
                    <div className="text-xs sm:text-sm font-medium text-white/80">LOYALTY CARD</div>
                  </div>
                  <div className="w-8 sm:w-10 h-6 sm:h-8 bg-gradient-to-br from-yellow-300 to-yellow-500 rounded-md flex items-center justify-center">
                    <div className="w-6 sm:w-8 h-4 sm:h-6 bg-gradient-to-br from-yellow-400 to-yellow-600 rounded-sm border border-yellow-200/50 flex items-center justify-center">
                      <div className="w-4 sm:w-5 h-3 sm:h-4 bg-gradient-to-br from-yellow-500 to-yellow-700 rounded-xs border border-yellow-300/50"></div>
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
                  <p className="text-xs text-white/80 mb-1">POINTS BALANCE:</p>
                  <p className="text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight text-white flex items-center justify-center">
                    {points} <span className="text-lg sm:text-xl ml-2">⭐</span>
                  </p>
                </motion.div>

                {/* Card footer */}
                <div className="flex justify-between items-end mt-auto pt-2 sm:pt-3">
                  <div className="max-w-[60%]">
                    <p className="text-xs sm:text-sm font-medium tracking-wider text-white/90 truncate">
                      {`${user.firstName} ${user.lastName}`.toUpperCase()}
                    </p>
                  </div>
                  
                  <div className="text-right">
                    <p className="text-xs text-white/80">STATUS</p>
                    <div className="flex items-center justify-end space-x-1">
                      <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                      <p className="text-xs sm:text-sm font-medium text-white/90">ACTIVE</p>
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
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setCurrentPage('claim')}
                className="flex flex-col items-center p-4 bg-[#1e293b] rounded-xl shadow-md hover:shadow-lg transition-all border border-gray-700/50"
              >
                <TicketIcon className="h-8 w-8 text-purple-400" />
                <span className="mt-2 font-medium text-gray-200">Redeem</span>
              </motion.button>

              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setCurrentPage('rewards')}
                className="flex flex-col items-center p-4 bg-[#1e293b] rounded-xl shadow-md hover:shadow-lg transition-all border border-gray-700/50"
              >
                <GiftIcon className="h-8 w-8 text-purple-400" />
                <span className="mt-2 font-medium text-gray-200">Rewards</span>
              </motion.button>
              
              {/*}
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setCurrentPage('borrow')}
                className="flex flex-col items-center p-4 bg-[#1e293b] rounded-xl shadow-md hover:shadow-lg transition-all border border-gray-700/50"
              >
                <ShoppingBagIcon className="h-8 w-8 text-purple-400" />
                <span className="mt-2 font-medium text-gray-200">Borrow</span>
              </motion.button>
              */}
            </div>

            {/* Borrowed Items Section */}
            {borrowedItems.length > 0 && (
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-8"
              >
                {/* Reminder Banner */}
                <div className="mb-4 p-4 rounded-xl bg-gradient-to-r from-blue-700 via-purple-700 to-blue-800 shadow-md border border-blue-600/40 flex items-center">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-blue-300 mr-3 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M12 20a8 8 0 100-16 8 8 0 000 16z" />
                  </svg>
                  <span className="text-blue-100 font-medium text-base">Reminder: Please Click the Return Button once you are done using the items.</span>
                </div>
                <div className="bg-[#1e293b] p-6 rounded-2xl shadow-lg border border-gray-700/50">
                  <h3 className="text-xl font-semibold text-gray-200 mb-4">Your Borrowed Items</h3>
                  <div className="space-y-4">
                    {borrowedItems.map((item) => (
                      <motion.div 
                        key={item._id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="flex items-center justify-between p-4 bg-gray-800/50 rounded-xl"
                      >
                        <div className="flex items-center space-x-4">
                          <div>
                            <h4 className="font-medium text-gray-200">{item.items.map(i => i.name).join(', ')}</h4>
                            <p className="text-sm text-gray-400">Borrowed on: {new Date(item.borrowTime).toLocaleString('en-US', { timeZone: 'Asia/Manila' })}</p>
                          </div>
                        </div>
                        <button
                          onClick={() => handleReturn(item)}
                          disabled={isReturning}
                          className={`px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors ${
                            isReturning ? 'opacity-50 cursor-not-allowed' : ''
                          }`}
                        >
                          {isReturning ? 'Processing...' : 'Return'}
                        </button>
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
          <motion.div variants={itemVariants} className="space-y-6">
            <div className="text-center">
              <img src={twoGonzLogo} alt="2gonz Logo" className="h-16 sm:h-20 mx-auto mb-8" />
              <h2 className="text-2xl font-bold text-blue-400">Redeem Your Code</h2>
            </div>
            
            <motion.div 
              className="bg-[#1e293b] p-6 rounded-2xl shadow-lg border-2 border-dashed border-gray-700/50"
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
            >
              <div className="space-y-4">
                <div className="text-center mb-4">
                  <div className="inline-block bg-blue-900/50 px-4 py-2 rounded-full">
                    <span className="font-bold text-blue-300">✨  Enter Code ✨</span>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <input
                    id="code-input"
                    className="w-full border-2 border-gray-700 bg-gray-800/50 p-4 rounded-xl text-center font-mono text-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-white placeholder-gray-500"
                    placeholder="ex. 123456"
                    value={code}
                    onChange={(e) => setCode(e.target.value.toUpperCase())}
                    disabled={isLoading}
                    style={{ letterSpacing: '2px' }}
                  />
                </div>
                
                <button
                  onClick={handleCodeSubmit}
                  disabled={isLoading}
                  className={`w-full py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-all ${
                    isLoading ? 'opacity-50 cursor-not-allowed' : ''
                  }`}
                >
                  {isLoading ? 'Processing...' : 'Submit Code'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}

        {/* Rewards Page */}
        {currentPage === 'rewards' && (
          <motion.div variants={itemVariants} className="space-y-6">
            <div className="text-center">
              <img src={twoGonzLogo} alt="2gonz Logo" className="h-16 sm:h-20 mx-auto mb-8" />
              <h2 className="text-2xl font-bold text-blue-400">Rewards Available!</h2>
              <p className="text-gray-400 mt-1">Claim your Rewards and go to the Cashier for Assistance!</p>
            </div>
            
            <motion.div 
              className="bg-[#1e293b] p-4 rounded-2xl shadow-inner border-2 border-gray-700/50"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              <div className="text-center mb-4">
                <div className="inline-block bg-blue-900/50 px-4 py-2 rounded-full">
                  <span className="font-bold text-blue-300">🌟 You have: {points} points 🌟</span>
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
                    className={`p-1 rounded-xl ${points >= reward.cost ? 'bg-gradient-to-r from-indigo-600 via-purple-700 to-purple-800' : 'bg-gray-800/50'}`}
                  >
                    <div className="bg-gradient-to-br from-indigo-400 via-purple-600 to-purple-700 p-4 rounded-lg border-2 border-dashed border-white/20 relative overflow-hidden">
                      <div className="absolute top-0 left-0 w-2 h-full bg-white"></div>
                      <div className="absolute top-2 right-2 text-xs font-bold bg-white/10 px-2 py-1 rounded text-white">
                        {reward.cost} pts
                      </div>
                      
                      <div className="flex justify-between items-center pl-4">
                        <div>
                          <h3 className="text-lg font-bold text-white">{reward.name}</h3>
                          <p className="text-sm text-white/80">{reward.description || 'Awesome reward!'}</p>
                        </div>
                        <button
                          onClick={() => claimReward(reward._id)}
                          disabled={points < reward.cost || isLoading}
                          className={`px-4 py-2 rounded-lg font-bold shadow-md transition-all ${points >= reward.cost ? 
                            'bg-blue-400 hover:bg-blue-500 text-white' : 
                            'bg-gray-800 text-gray-600'}`}
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

        {/* Borrowing Page */}
        {/*
        {currentPage === 'borrow' && (
          <motion.div variants={itemVariants} className="space-y-6">
            <div className="text-center">
              <img src={twoGonzLogo} alt="2gonz Logo" className="h-16 sm:h-20 mx-auto mb-8" />
              <h2 className="text-2xl font-bold text-blue-400">Borrow Items</h2>
              <p className="text-gray-400 mt-1">Select items to borrow for your needs</p>
            </div>
          
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {availableItems.map((item) => (
                <motion.div 
                  key={item.id}
                  whileHover={{ scale: 1.02 }}
                  className={`bg-[#1e293b] rounded-xl shadow-md overflow-hidden border border-gray-700/50 ${
                    item.isSet ? 'md:col-span-2' : ''
                  }`}
                >
                  <div className="relative h-48 overflow-hidden">
                    <img 
                      src={item.image} 
                      alt={item.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="p-4">
                    <h4 className="font-bold text-lg text-gray-200">{item.name}</h4>
                    <p className="text-sm text-gray-400 mb-3">{item.description}</p>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => handleRemoveFromCart(item.id)}
                          disabled={item.cartQuantity === 0}
                          className={`w-8 h-8 rounded-full flex items-center justify-center text-lg font-bold transition-all ${
                            item.cartQuantity === 0
                              ? 'bg-gray-800 text-gray-600 cursor-not-allowed'
                              : 'bg-red-600 text-white hover:bg-red-700'
                          }`}
                        >
                          -
                        </button>
                        <span className="w-8 text-center font-medium text-gray-200">{item.cartQuantity}</span>
                        <button
                          onClick={() => handleAddToCart(item.id)}
                          className="w-8 h-8 rounded-full flex items-center justify-center text-lg font-bold transition-all bg-blue-600 text-white hover:bg-blue-700"
                        >
                          +
                        </button>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>

            {availableItems.some(item => item.cartQuantity > 0) && (
              <motion.button
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                onClick={() => setShowCart(true)}
                className="fixed bottom-24 right-6 bg-blue-600 text-white p-4 rounded-full shadow-lg hover:bg-blue-700 transition-all flex items-center space-x-2"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
                <span className="font-bold">
                  {availableItems.reduce((total, item) => total + item.cartQuantity, 0)}
                </span>
              </motion.button>
            )}

            {showCart && (
              <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50">
                <motion.div 
                  initial={{ x: '100%' }}
                  animate={{ x: 0 }}
                  exit={{ x: '100%' }}
                  className="absolute right-0 top-0 h-full w-full max-w-md bg-[#1e293b] shadow-xl border-l border-gray-700/50"
                >
                  <div className="p-6 h-full flex flex-col">
                    <div className="flex justify-between items-center mb-6">
                      <h3 className="text-xl font-bold text-gray-200">Your Cart</h3>
                      <button 
                        onClick={() => setShowCart(false)}
                        className="text-gray-400 hover:text-gray-200"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>

                    <div className="flex-grow overflow-y-auto">
                      {availableItems.some(item => item.cartQuantity > 0) ? (
                        <>
                          <div className="bg-blue-900/50 p-4 rounded-xl mb-4">
                            <div className="flex justify-between items-center">
                              <span className="text-blue-300 font-medium">Total Items:</span>
                              <span className="text-blue-200 font-bold">
                                {availableItems.reduce((total, item) => total + item.cartQuantity, 0)}
                              </span>
                            </div>
                          </div>

                          {availableItems
                            .filter(item => item.cartQuantity > 0)
                            .map(item => (
                              <div key={item.id} className="flex items-center space-x-4 p-4 bg-gray-800/50 rounded-xl mb-4">
                                <img 
                                  src={item.image} 
                                  alt={item.name}
                                  className="w-20 h-20 object-cover rounded-lg"
                                />
                                <div className="flex-grow">
                                  <h4 className="font-medium text-gray-200">{item.name}</h4>
                                  <p className="text-sm text-gray-400 mt-1">{item.description}</p>
                                  <div className="flex items-center justify-between mt-2">
                                    <div className="flex items-center space-x-2">
                                      <button
                                        onClick={() => handleRemoveFromCart(item.id)}
                                        className="w-6 h-6 rounded-full flex items-center justify-center text-sm font-bold bg-red-600 text-white hover:bg-red-700"
                                      >
                                        -
                                      </button>
                                      <span className="w-8 text-center font-medium text-gray-200">{item.cartQuantity}</span>
                                      <button
                                        onClick={() => handleAddToCart(item.id)}
                                        className="w-6 h-6 rounded-full flex items-center justify-center text-sm font-bold bg-blue-600 text-white hover:bg-blue-700"
                                      >
                                        +
                                      </button>
                                    </div>
                                    <span className="text-sm font-medium text-gray-400">
                                      {item.isSet ? 'Complete Set' : 'Individual Item'}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            ))}
                        </>
                      ) : (
                        <div className="flex flex-col items-center justify-center h-64 text-center">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 text-gray-600 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                          </svg>
                          <h4 className="text-lg font-medium text-gray-400 mb-2">Your cart is empty</h4>
                          <p className="text-gray-500">Add items to your cart to proceed with your borrow</p>
                        </div>
                      )}
                    </div>

                    <div className="mt-6 space-y-4">
                      {availableItems.some(item => item.cartQuantity > 0) && (
                        <div className="bg-gray-800/50 p-4 rounded-xl">
                          <h4 className="font-medium text-gray-200 mb-2">Borrow Summary</h4>
                          <div className="space-y-2">
                            {availableItems
                              .filter(item => item.cartQuantity > 0)
                              .map(item => (
                                <div key={item.id} className="flex justify-between text-sm">
                                  <span className="text-gray-400">{item.name} x {item.cartQuantity}</span>
                                  <span className="font-medium text-gray-300">
                                    {item.isSet ? 'Complete Set' : 'Individual Item'}
                                  </span>
                                </div>
                              ))}
                          </div>
                        </div>
                      )}
                      
                      <button
                        onClick={() => {
                          const itemsToBorrow = availableItems.filter(item => item.cartQuantity > 0);
                          setReviewItems(itemsToBorrow);
                          setShowReviewModal(true);
                        }}
                        disabled={!availableItems.some(item => item.cartQuantity > 0) || isSubmitting}
                        className={`w-full py-4 rounded-xl font-bold transition-all ${
                          availableItems.some(item => item.cartQuantity > 0) && !isSubmitting
                            ? 'bg-blue-600 text-white hover:bg-blue-700'
                            : 'bg-gray-800 text-gray-600 cursor-not-allowed'
                        }`}
                      >
                        {isSubmitting ? (
                          <div className="flex items-center justify-center">
                            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                            Processing...
                          </div>
                        ) : (
                          'Confirm Borrow'
                        )}
                      </button>
                    </div>
                  </div>
                </motion.div>
              </div>
            )}
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
              onClick={() => {
                if (verificationCode === '0102') {
                  setVerificationError('');
                  setVerificationCode('');
                  setShowClaimModal(false);
                  setShowSuccessPopup(true);
                } else {
                  setVerificationError('Invalid verification code');
                }
              }}
              className="mt-2 w-full bg-blue-600 text-white px-4 py-2 rounded-full hover:bg-blue-700 transition disabled:opacity-50"
              disabled={verificationCode.length !== 4}
            >
              Verify & Continue
            </button>
          </motion.div>
        </div>
      )}

      {/* Success Modal */}
      {/*
      {showSuccessModal && (
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
                {modalType === 'borrow' ? 'Borrow Complete!' : 'Return Complete!'}
              </h3>
              <div className="bg-gray-800/50 p-4 rounded-xl">
                <p className="text-gray-300 mb-2">
                  <span className="font-bold text-gray-200">ID Number:</span> {user.idNumber}
                </p>
                <p className="text-gray-300 mb-2">
                  <span className="font-bold text-gray-200">
                    {modalType === 'borrow' ? 'Borrow Time:' : 'Return Time:'}
                  </span> {modalTime}
                </p>
                <p className="text-gray-300">
                  <span className="font-bold text-gray-200">
                    {modalType === 'borrow' ? 'Borrowed Items:' : 'Returned Items:'}
                  </span>
                </p>
                <ul className="text-gray-300 mt-2 space-y-1">
                  {modalItems.map((item, index) => (
                    <li key={index}>• {item.name} (x{item.quantity || item.cartQuantity})</li>
                  ))}
                </ul>
                <div className="mt-4 p-3 bg-blue-900/30 rounded-lg border border-blue-700/50">
                  <p className="text-blue-300 font-medium">
                    Please show this to the Concierge as Proof.
                  </p>
                </div>
              </div>
              <button 
                onClick={() => {
                  setShowSuccessModal(false);
                  if (modalType === 'return') {
                    setShowFeedbackForm(true);
                  }
                  if (modalType === 'borrow') {
                    setCurrentPage('home');
                  }
                  setModalItems([]); // Clear modal items
                  setModalTime(''); // Clear modal time
                }}
                className="w-full py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-all"
              >
                OK
              </button>
            </div>
          </motion.div>
        </div>
      )} */}

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
                setShowFeedbackForm(true);
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



      {showReviewModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-[#1e293b] rounded-2xl p-6 max-w-sm w-full shadow-xl border-2 border-blue-700/50"
          >
            <div className="text-center space-y-4">
              <h3 className="text-xl font-bold text-blue-300">Review & Confirm</h3>
              <p className="text-gray-300">You are about to borrow the following items:</p>
              <ul className="text-gray-200 mt-2 space-y-1">
                {reviewItems.map((item, idx) => (
                  <li key={idx}>• {item.name} (x{item.cartQuantity})</li>
                ))}
              </ul>
              <div className="flex gap-4 mt-6">
                <button
                  onClick={() => setShowReviewModal(false)}
                  className="flex-1 py-2 rounded-xl font-bold bg-gray-700 text-gray-200 hover:bg-gray-600 transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={async () => {
                    setShowReviewModal(false);
                    await handleConfirmOrder();
                  }}
                  className="flex-1 py-2 rounded-xl font-bold bg-blue-600 text-white hover:bg-blue-700 transition-all"
                >
                  Confirm
                </button>
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
  const baseUrl = import.meta.env.VITE_API_BASE_URL;

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

  return (
    <div className="max-w-md mx-auto p-6 bg-white rounded-2xl shadow-lg mt-8 mb-24">
      <div className="flex items-center mb-6">
        <button onClick={onBack} className="mr-4 text-purple-600 hover:text-purple-800">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <h2 className="text-2xl font-bold text-purple-800">Settings</h2>
      </div>
      <div className="flex space-x-2 mb-6">
        <button onClick={() => setSection('profile')} className={`flex-1 py-2 rounded-lg font-semibold ${section === 'profile' ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-600'}`}>Profile</button>
        <button onClick={() => setSection('about')} className={`flex-1 py-2 rounded-lg font-semibold ${section === 'about' ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-600'}`}>About</button>
        <button onClick={() => setSection('help')} className={`flex-1 py-2 rounded-lg font-semibold ${section === 'help' ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-600'}`}>Help</button>
      </div>
      {section === 'profile' && (
        <div className="space-y-6">
          <form onSubmit={handleProfileUpdate} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Current Password</label>
              <input 
                type="password" 
                className="w-full border-2 border-purple-200 rounded-lg p-2 text-gray-900" 
                value={currentPassword} 
                onChange={e => setCurrentPassword(e.target.value)} 
                placeholder="Enter current password"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">New Password</label>
              <input 
                type="password" 
                className="w-full border-2 border-purple-200 rounded-lg p-2 text-gray-900" 
                value={password} 
                onChange={e => setPassword(e.target.value)} 
                placeholder="Enter new password"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Confirm New Password</label>
              <input 
                type="password" 
                className="w-full border-2 border-purple-200 rounded-lg p-2 text-gray-900" 
                value={confirmPassword} 
                onChange={e => setConfirmPassword(e.target.value)} 
                placeholder="Confirm new password"
                required
              />
            </div>
            {errorMsg && (
              <div className="p-3 bg-red-50 border-l-4 border-red-500 rounded-lg flex items-start space-x-2">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-red-500 mt-0.5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                <span className="text-red-700 font-medium">{errorMsg}</span>
              </div>
            )}
            {successMsg && (
              <div className="p-3 bg-green-50 border-l-4 border-green-500 rounded-lg flex items-start space-x-2">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-green-500 mt-0.5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <span className="text-green-700 font-medium">{successMsg}</span>
              </div>
            )}
            <button 
              type="submit" 
              disabled={isLoading} 
              className="w-full py-2 bg-purple-600 text-white rounded-lg font-bold hover:bg-purple-700 transition-all"
            >
              {isLoading ? 'Saving...' : 'Update Password'}
            </button>
          </form>
        </div>
      )}
      {section === 'about' && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-900">About 2gonz</h3>
          <p className="text-gray-600">
            2gonz is a loyalty reward system designed to encourage sustainable practices
            by rewarding students for borrowing and returning items properly.
          </p>
        </div>
      )}
      {section === 'help' && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-900">Need Help?</h3>
          <p className="text-gray-600">
            If you need assistance, please head towards the cashier for assistance.
          </p>
        </div>
      )}
    </div>
  );
}