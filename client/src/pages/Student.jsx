import { useEffect, useState } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { HomeIcon, TicketIcon, GiftIcon, LogoutIcon, ShoppingBagIcon } from '@heroicons/react/outline';
import { motion } from 'framer-motion';
import confetti from 'canvas-confetti';
import { QRCodeSVG } from 'qrcode.react';
import completeSetImage from '../assets/completeset.png';
import spoonImage from '../assets/spoon.png';
import forkImage from '../assets/fork.png';
import plateImage from '../assets/plate.png';

export default function StudentPage() {
  const { user } = useAuth();
  const [points, setPoints] = useState(0);
  const [rewards, setRewards] = useState([]);
  const [code, setCode] = useState('');
  const [showFeedback, setShowFeedback] = useState(false);
  const [rating, setRating] = useState(0);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [currentPage, setCurrentPage] = useState('home');
  const [isLoading, setIsLoading] = useState(false);
  const [showClaimModal, setShowClaimModal] = useState(false);
  const [claimedRewardName, setClaimedRewardName] = useState('');
  const [claimTime, setClaimTime] = useState('');
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [borrowedItems, setBorrowedItems] = useState([]);
  const [availableItems, setAvailableItems] = useState([
    {
      id: 1,
      name: 'Complete Set',
      image: completeSetImage,
      description: 'Complete dining set (1 Plate, 1 Spoon, 1 Fork)',
      cartQuantity: 0,
      isSet: true
    },
    { 
      id: 2, 
      name: 'Spoon', 
      image: spoonImage,
      description: 'Stainless steel spoon for your dining needs',
      cartQuantity: 0
    },
    { 
      id: 3, 
      name: 'Fork', 
      image: forkImage,
      description: 'Stainless steel fork for your dining needs',
      cartQuantity: 0
    },
    { 
      id: 4, 
      name: 'Plate', 
      image: plateImage,
      description: 'Standard ceramic plate for your meals',
      cartQuantity: 0
    },
  ]);
  const [showQRModal, setShowQRModal] = useState(false);
  const [qrData, setQrData] = useState(null);
  const [showCart, setShowCart] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  const baseUrl = import.meta.env.VITE_API_BASE_URL;

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        const token = user.token;
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

  const handleCodeSubmit = async () => {
    if (!code.trim()) {
      setErrorMessage('Please enter a code');
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

      setShowFeedback(true);
      setErrorMessage('');
      setSuccessMessage('Code accepted! Please rate your experience.');
      confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
    } catch (error) {
      console.error('Error submitting code:', error);
      if (error.response && error.response.status === 400) {
        setErrorMessage(error.response.data.message || 'Code is invalid or already used.');
      } else {
        setErrorMessage('An unexpected error occurred. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('user');
    window.location.href = `${window.location.origin}/VARDA-Loyalty-Reward-System/#/login`;
  };

  const submitFeedback = async () => {
    if (!rating) {
      setErrorMessage('Please select a rating!');
      return;
    }

    try {
      setIsLoading(true);
      const token = user.token;
      await axios.post(
        `${baseUrl}/api/student/submit-feedback`,
        { code, rating },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      const updated = await axios.get(`${baseUrl}/api/student/points`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      setPoints(updated.data.points);
      setSuccessMessage('Feedback submitted!');
      setShowFeedback(false);
      setCode('');
      setRating(0);

      confetti({ particleCount: rating * 20, spread: 70, origin: { y: 0.6 } });

      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err) {
      console.error('Error submitting feedback:', err);
      setErrorMessage(err.response?.data?.message || 'Failed to submit feedback');
    } finally {
      setIsLoading(false);
    }
  };

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

  const handleConfirmOrder = async () => {
    const itemsToBorrow = availableItems.filter(item => item.cartQuantity > 0);
    const orderDetails = {
      studentName: user.name,
      studentId: user._id,
      items: itemsToBorrow.map(item => ({
        name: item.name,
        quantity: item.cartQuantity
      })),
      timestamp: new Date().toISOString()
    };

    try {
      // Generate QR code data
      setQrData(JSON.stringify(orderDetails));
      setShowQRModal(true);
      setShowSuccessModal(true);

      // Reset cart quantities
      setAvailableItems(prevItems => 
        prevItems.map(item => ({ ...item, cartQuantity: 0 }))
      );
    } catch (error) {
      console.error('Error creating order:', error);
      setErrorMessage('Failed to create order. Please try again.');
    }
  };

  const handleBorrow = (itemId) => {
    setAvailableItems(prevItems => 
      prevItems.map(item => {
        if (item.id === itemId && item.quantity > item.borrowed) {
          return { ...item, borrowed: item.borrowed + 1 };
        }
        return item;
      })
    );
    setBorrowedItems(prev => [...prev, { ...availableItems.find(item => item.id === itemId), borrowTime: new Date() }]);
    setSuccessMessage('Item borrowed successfully!');
    setTimeout(() => setSuccessMessage(''), 3000);
  };

  const handleReturn = (itemId) => {
    setAvailableItems(prevItems =>
      prevItems.map(item => {
        if (item.id === itemId) {
          return { ...item, borrowed: item.borrowed - 1 };
        }
        return item;
      })
    );
    setBorrowedItems(prev => prev.filter(item => item.id !== itemId));
    setSuccessMessage('Item returned successfully!');
    setTimeout(() => setSuccessMessage(''), 3000);
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

  return (
    <div className="flex flex-col min-h-screen bg-gradient-to-b from-blue-50 to-purple-50">
      {/* Main Content */}
      <motion.div 
        className="flex-grow p-6 pb-24 space-y-6 max-w-2xl mx-auto w-full"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {/* Success/Error Messages */}
        {successMessage && (
          <motion.div 
            className="p-4 bg-green-100 border-2 border-green-300 text-green-800 rounded-lg shadow-md"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
          >
            🎉 {successMessage}
          </motion.div>
        )}
        {errorMessage && (
          <motion.div 
            className="p-4 bg-red-100 border-2 border-red-300 text-red-800 rounded-lg shadow-md"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
          >
            ⚠️ {errorMessage}
          </motion.div>
        )}

        {/* Loading State */}
        {isLoading && (
          <div className="fixed inset-0 flex items-center justify-center bg-black/30 backdrop-blur-sm z-50 p-2 sm:p-4">
            <div className="bg-white p-6 rounded-xl shadow-xl flex flex-col items-center">
              <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-3"></div>
              <p className="text-lg font-medium">Loading...</p>
            </div>
          </div>
        )}

        {/* Home Page */}
        {currentPage === 'home' && (
          <motion.div variants={itemVariants} className="space-y-6">
            <motion.div 
              className="relative mx-auto p-3 sm:p-4 md:p-6 w-full max-w-md bg-gradient-to-br from-indigo-600 via-purple-700 to-purple-800 rounded-2xl shadow-2xl text-white overflow-hidden"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              style={{
                perspective: "1000px",
                transformStyle: "preserve-3d",
                height: "clamp(220px, 50vw, 280px)",
                width: "clamp(280px, 85vw, 400px)",
                margin: "0 auto"
              }}
            >
              {/* Card Content */}
              <div className="relative z-10 flex flex-col justify-between h-full">
                {/* Card issuer and chip */}
                <div className="flex justify-between items-start">
                  <div className="text-xs font-medium opacity-80">LOYALTY CARD</div>
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
                  <p className="text-xs opacity-80 mb-1">POINTS BALANCE:</p>
                  <p className="text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight flex items-center justify-center">
                    {points} <span className="text-lg sm:text-xl ml-2">⭐</span>
                  </p>
                </motion.div>

                {/* Card footer */}
                <div className="flex justify-between items-end mt-auto pt-2 sm:pt-3">
                  <div className="max-w-[60%]">
                    <p className="text-xs sm:text-sm font-medium tracking-wider truncate">{user.name.toUpperCase()}</p>
                  </div>
                  
                  <div className="text-right">
                    <p className="text-xs opacity-80">STATUS</p>
                    <div className="flex items-center justify-end space-x-1">
                      <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                      <p className="text-xs sm:text-sm font-medium">ACTIVE</p>
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
            <div className="grid grid-cols-3 gap-4 mt-6">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => {
                  setCurrentPage('claim');
                  setCode('');
                  setShowFeedback(false);
                  setErrorMessage('');
                  setSuccessMessage('');
                }}
                className="flex flex-col items-center p-4 bg-white rounded-xl shadow-md hover:shadow-lg transition-all"
              >
                <TicketIcon className="h-8 w-8 text-blue-600" />
                <span className="mt-2 font-medium text-gray-700">Redeem</span>
              </motion.button>

              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => {
                  setCurrentPage('rewards');
                  setErrorMessage('');
                  setSuccessMessage('');
                }}
                className="flex flex-col items-center p-4 bg-white rounded-xl shadow-md hover:shadow-lg transition-all"
              >
                <GiftIcon className="h-8 w-8 text-pink-600" />
                <span className="mt-2 font-medium text-gray-700">Rewards</span>
              </motion.button>

              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setCurrentPage('borrow')}
                className="flex flex-col items-center p-4 bg-white rounded-xl shadow-md hover:shadow-lg transition-all"
              >
                <ShoppingBagIcon className="h-8 w-8 text-purple-600" />
                <span className="mt-2 font-medium text-gray-700">Borrow</span>
              </motion.button>
            </div>
          </motion.div>
        )}

        {/* Claim Code Page */}
        {currentPage === 'claim' && (
          <motion.div variants={itemVariants} className="space-y-6">
            <div className="text-center">
              <h2 className="text-2xl font-bold text-purple-800">Redeem Your Code</h2>
            </div>
            
            <motion.div 
              className="bg-white p-6 rounded-2xl shadow-lg border-2 border-dashed border-yellow-400"
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
            >
              <div className="space-y-4">
                <div className="text-center mb-4">
                  <div className="inline-block bg-yellow-100 px-4 py-2 rounded-full">
                    <span className="font-bold text-yellow-800">✨  Enter Code ✨</span>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <input
                    id="code-input"
                    className="w-full border-2 border-purple-300 p-4 rounded-xl text-center font-mono text-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
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
                  className="w-full bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white px-4 py-4 rounded-xl font-bold text-lg shadow-lg transition-all disabled:opacity-70"
                >
                  {isLoading ? (
                    <span className="flex items-center justify-center">
                      <span className="animate-pulse">🔍 Checking Code...</span>
                    </span>
                  ) : (
                    '🎁 Redeem Now!'
                  )}
                </button>
              </div>
            </motion.div>

            {showFeedback && (
            <motion.div 
              className="mt-6 w-full max-w-md mx-auto p-4 sm:p-6 bg-white rounded-2xl shadow-lg border-2 border-blue-300 space-y-6"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <div className="text-center">
                <h3 className="text-xl font-bold text-blue-800">How was it? 🤔</h3>
                <p className="text-gray-600 mt-1">Rate your experience to earn bonus points!</p>
              </div>
              
              <div className="flex justify-center gap-2 flex-wrap">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    aria-label={`Rate ${star} star`}
                    className={`p-4 rounded-full border-4 text-2xl ${rating >= star ? 'bg-yellow-200 border-yellow-400 scale-110' : 'bg-gray-100 border-gray-300'} transition-all`}
                    onClick={() => setRating(star)}
                    disabled={isLoading}
                  >
                    {star}⭐
                  </button>
                ))}
              </div>
              
              <div className="text-center">
                <button
                  onClick={submitFeedback}
                  disabled={!rating || isLoading}
                  className={`px-6 py-3 w-full rounded-xl font-bold text-lg shadow-md transition-all ${!rating || isLoading ? 'bg-gray-300 text-gray-500' : 'bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white'}`}
                >
                  {isLoading ? 'Sending...' : (
                    <span className="flex items-center justify-center gap-2">
                      Submit
                    </span>
                  )}
                </button>
              </div>
            </motion.div>
          )}
          </motion.div>
        )}

        {/* Rewards Page */}
        {currentPage === 'rewards' && (
          <motion.div variants={itemVariants} className="space-y-6">
            <div className="text-center">
              <h2 className="text-2xl font-bold text-purple-800"> Rewards Available!</h2>
              <p className="text-gray-600 mt-1">Redeem your points for awesome rewards!</p>
            </div>
            
            <motion.div 
              className="bg-white p-4 rounded-2xl shadow-inner border-2 border-purple-200"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              <div className="text-center mb-4">
                <div className="inline-block bg-purple-100 px-4 py-2 rounded-full">
                  <span className="font-bold text-purple-800">🌟 You have: {points} points 🌟</span>
                </div>
              </div>
              
              {rewards.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-gray-500 text-lg">No rewards available right now</p>
                  <p className="text-gray-400 mt-2">Check back later!</p>
                </div>
              ) : (
                <div className="grid gap-4">
              {rewards
                .sort((a, b) => a.cost - b.cost) // sort by cost ascending
                .map((reward) => (
                  <motion.div 
                    key={reward._id}
                    variants={itemVariants}
                    whileHover={{ scale: 1.03 }}
                    className={`p-1 rounded-xl ${points >= reward.cost ? 'bg-gradient-to-r from-yellow-100 to-pink-100' : 'bg-gray-100'}`}
                  >
                    <div className="bg-white p-4 rounded-lg border-2 border-dashed border-purple-300 relative overflow-hidden">
                      {/* Coupon design elements */}
                      <div className="absolute top-0 left-0 w-2 h-full bg-purple-500"></div>
                      <div className="absolute top-2 right-2 text-xs font-bold bg-yellow-400 px-2 py-1 rounded">
                        {reward.cost} pts
                      </div>
                      
                      <div className="flex justify-between items-center pl-4">
                        <div>
                          <h3 className="text-lg font-bold text-purple-800">{reward.name}</h3>
                          <p className="text-sm text-gray-600">{reward.description || 'Awesome reward!'}</p>
                        </div>
                        <button
                          onClick={() => claimReward(reward._id)}
                          disabled={points < reward.cost || isLoading}
                          className={`px-4 py-2 rounded-lg font-bold shadow-md transition-all ${points >= reward.cost ? 
                            'bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white' : 
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

        {/* Borrowing Page */}
        {currentPage === 'borrow' && (
          <motion.div variants={itemVariants} className="space-y-6">
            <div className="text-center">
              <h2 className="text-2xl font-bold text-purple-800">Order Items</h2>
              <p className="text-gray-600 mt-1">Select items to borrow for your needs</p>
            </div>

            {/* Available Items Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {availableItems.map((item) => (
                <motion.div 
                  key={item.id}
                  whileHover={{ scale: 1.02 }}
                  className={`bg-white rounded-xl shadow-md overflow-hidden border border-gray-100 ${
                    item.isSet ? 'md:col-span-2' : ''
                  }`}
                >
                  <div className="relative h-48 overflow-hidden">
                    <img 
                      src={item.image} 
                      alt={item.name}
                      className="w-full h-full object-cover"
                    />
                    {item.isSet && (
                      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-4">
                        <div className="flex items-center space-x-2">
                          <span className="text-white text-sm">Includes:</span>
                          <span className="text-white/90 text-sm">1 Plate</span>
                          <span className="text-white/90 text-sm">•</span>
                          <span className="text-white/90 text-sm">1 Spoon</span>
                          <span className="text-white/90 text-sm">•</span>
                          <span className="text-white/90 text-sm">1 Fork</span>
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="p-4">
                    <h4 className="font-bold text-lg text-gray-800">{item.name}</h4>
                    <p className="text-sm text-gray-600 mb-3">{item.description}</p>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => handleRemoveFromCart(item.id)}
                          disabled={item.cartQuantity === 0}
                          className={`w-8 h-8 rounded-full flex items-center justify-center text-lg font-bold transition-all ${
                            item.cartQuantity === 0
                              ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                              : 'bg-red-500 text-white hover:bg-red-600'
                          }`}
                        >
                          -
                        </button>
                        <span className="w-8 text-center font-medium">{item.cartQuantity}</span>
                        <button
                          onClick={() => handleAddToCart(item.id)}
                          className="w-8 h-8 rounded-full flex items-center justify-center text-lg font-bold transition-all bg-green-500 text-white hover:bg-green-600"
                        >
                          +
                        </button>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>

            {/* Floating Cart Button */}
            {availableItems.some(item => item.cartQuantity > 0) && (
              <motion.button
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                onClick={() => setShowCart(true)}
                className="fixed bottom-24 right-6 bg-purple-600 text-white p-4 rounded-full shadow-lg hover:bg-purple-700 transition-all flex items-center space-x-2"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
                <span className="font-bold">
                  {availableItems.reduce((total, item) => total + item.cartQuantity, 0)}
                </span>
              </motion.button>
            )}

            {/* Slide-out Cart Panel */}
            {showCart && (
              <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50">
                <motion.div 
                  initial={{ x: '100%' }}
                  animate={{ x: 0 }}
                  exit={{ x: '100%' }}
                  className="absolute right-0 top-0 h-full w-full max-w-md bg-white shadow-xl"
                >
                  <div className="p-6 h-full flex flex-col">
                    <div className="flex justify-between items-center mb-6">
                      <h3 className="text-xl font-bold text-gray-800">Your Cart</h3>
                      <button 
                        onClick={() => setShowCart(false)}
                        className="text-gray-500 hover:text-gray-700"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>

                    <div className="flex-grow overflow-y-auto">
                      {availableItems
                        .filter(item => item.cartQuantity > 0)
                        .map(item => (
                          <div key={item.id} className="flex items-center space-x-4 p-4 bg-gray-50 rounded-xl mb-4">
                            <img 
                              src={item.image} 
                              alt={item.name}
                              className="w-20 h-20 object-cover rounded-lg"
                            />
                            <div className="flex-grow">
                              <h4 className="font-medium text-gray-800">{item.name}</h4>
                              <div className="flex items-center space-x-2 mt-2">
                                <button
                                  onClick={() => handleRemoveFromCart(item.id)}
                                  className="w-6 h-6 rounded-full flex items-center justify-center text-sm font-bold bg-red-500 text-white hover:bg-red-600"
                                >
                                  -
                                </button>
                                <span className="w-8 text-center">{item.cartQuantity}</span>
                                <button
                                  onClick={() => handleAddToCart(item.id)}
                                  className="w-6 h-6 rounded-full flex items-center justify-center text-sm font-bold bg-green-500 text-white hover:bg-green-600"
                                >
                                  +
                                </button>
                              </div>
                            </div>
                          </div>
                        ))}
                    </div>

                    <div className="mt-6">
                      <button
                        onClick={() => {
                          handleConfirmOrder();
                          setShowCart(false);
                        }}
                        className="w-full py-4 bg-purple-600 text-white rounded-xl font-bold hover:bg-purple-700 transition-all"
                      >
                        Confirm Order
                      </button>
                    </div>
                  </div>
                </motion.div>
              </div>
            )}

            {/* Borrowed Items */}
            {borrowedItems.length > 0 && (
              <div className="bg-white p-6 rounded-2xl shadow-lg mt-6">
                <h3 className="text-xl font-semibold text-gray-800 mb-4">Your Orders</h3>
                <div className="space-y-4">
                  {borrowedItems.map((item) => (
                    <motion.div 
                      key={item.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="flex items-center justify-between p-4 bg-gray-50 rounded-xl"
                    >
                      <div className="flex items-center space-x-4">
                        <img 
                          src={item.image} 
                          alt={item.name}
                          className="w-16 h-16 object-cover rounded-lg"
                        />
                        <div>
                          <h4 className="font-medium text-gray-800">{item.name}</h4>
                          <p className="text-sm text-gray-600">
                            Ordered: {new Date(item.borrowTime).toLocaleString()}
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={() => handleReturn(item.id)}
                        className="px-4 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700"
                      >
                        Return
                      </button>
                    </motion.div>
                  ))}
                </div>
              </div>
            )}
          </motion.div>
        )}

        {/* Settings Page */}
        {currentPage === 'settings' && (
          <SettingsPage user={user} onBack={() => setCurrentPage('home')} />
        )}
      </motion.div>

      {showClaimModal && (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-opacity-50">
        <motion.div 
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-lg border-2 border-purple-300 text-center space-y-4"
        >
          <h3 className="text-2xl font-bold text-green-600">🎉 Congrats!</h3>
          <p className="text-gray-800">
            You've successfully claimed:
            <br />
            <span className="font-bold text-purple-800">{claimedRewardName}</span>
          </p>

          <div className="text-sm text-gray-600 mt-2">
            Claimed on: <span className="font-medium">{claimTime}</span>
          </div>

          <p className="text-xs text-gray-500 mt-1">
            Please show this screen to the cashier as proof of reward redemption.
          </p>

          <button 
            onClick={() => setShowClaimModal(false)}
            className="mt-4 bg-purple-600 text-white px-4 py-2 rounded-full hover:bg-purple-700 transition"
          >
            Got it!
          </button>
        </motion.div>
      </div>
    )}

      {/* QR Code Modal */}
      {showQRModal && qrData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-xl border-2 border-purple-300"
          >
            <div className="text-center space-y-4">
              <h3 className="text-xl font-bold text-purple-800">Scan Me!</h3>
              
              <div className="bg-white p-4 rounded-xl border-2 border-dashed border-purple-200">
                <QRCodeSVG 
                  value={qrData}
                  size={200}
                  level="H"
                  includeMargin={true}
                  className="mx-auto"
                />
              </div>

              <div className="text-left bg-gray-50 p-4 rounded-xl">
                <h4 className="font-semibold text-gray-800 mb-2">Order Details:</h4>
                <ul className="space-y-1 text-sm text-gray-600">
                  {JSON.parse(qrData).items.map((item, index) => (
                    <li key={index}>
                      • {item.name} (x{item.quantity})
                    </li>
                  ))}
                </ul>
              </div>

              <button 
                onClick={() => setShowQRModal(false)}
                className="w-full bg-purple-600 text-white px-4 py-2 rounded-xl hover:bg-purple-700 transition"
              >
                Close
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Success Modal */}
      {showSuccessModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-xl border-2 border-green-300"
          >
            <div className="text-center space-y-4">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-gray-800">Order Created!</h3>
              <p className="text-gray-600">Show the QR code to the cashier</p>
              <button 
                onClick={() => {
                  setShowSuccessModal(false);
                  setShowCart(false);
                }}
                className="w-full py-3 bg-green-600 text-white rounded-xl font-bold hover:bg-green-700 transition-all"
              >
                OK
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-purple-200 shadow-md flex justify-around py-2 z-40">
        <button 
          onClick={() => setCurrentPage('settings')}
          className="flex items-center justify-center p-2 rounded-full bg-gray-50 hover:bg-purple-50 text-gray-500 hover:text-purple-700 transition-all"
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
            className={`absolute -top-8 left-1/2 transform -translate-x-1/2 flex flex-col items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-purple-600 to-purple-800 text-white shadow-lg hover:shadow-xl transition-all ${currentPage === 'home' ? 'ring-4 ring-purple-200' : ''}`}
            aria-label="Home"
          >
            <HomeIcon className="h-8 w-8" />
          </button>
        </div>

        <button 
          onClick={() => setShowLogoutModal(true)}
          className="flex items-center justify-center p-2 rounded-full bg-gray-50 hover:bg-red-50 text-red-500 hover:text-red-600 transition-all"
          aria-label="Logout"
        >
          <LogoutIcon className="h-8 w-8" />
        </button>
      </nav>

      {/* Logout Confirmation Modal */}
      {showLogoutModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-6 w-80 shadow-2xl space-y-4">
            <h2 className="text-lg font-bold text-gray-800">Confirm Logout</h2>
            <p className="text-sm text-gray-500">Are you sure you want to log out?</p>

            <div className="flex justify-end space-x-4 pt-4">
              <button 
                onClick={() => setShowLogoutModal(false)}
                className="px-4 py-2 text-sm rounded-full border border-gray-300 text-gray-700 hover:bg-gray-100 transition-all"
              >
                Cancel
              </button>
              <button 
                onClick={handleLogout}
                className="px-4 py-2 text-sm rounded-full bg-red-500 text-white hover:bg-red-400 transition-all"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function SettingsPage({ user, onBack }) {
  const [section, setSection] = useState('profile');
  const [username, setUsername] = useState(user.name);
  const [currentPassword, setCurrentPassword] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [profileTab, setProfileTab] = useState('username');
  const baseUrl = import.meta.env.VITE_API_BASE_URL;

  const handleProfileUpdate = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    // If trying to change password, require current password
    if (profileTab === 'password') {
      if (!currentPassword) {
        setErrorMsg('Please enter your current password to change it');
        return;
      }

      if (password !== confirmPassword) {
        setErrorMsg('New passwords do not match');
        return;
      }
    }

    // If trying to change username, require current password
    if (profileTab === 'username') {
      if (!currentPassword) {
        setErrorMsg('Please enter your current password to change username');
        return;
      }
    }

    try {
      setIsLoading(true);
      const token = user.token;
      await axios.put(
        `${baseUrl}/api/student/profile`,
        { 
          name: profileTab === 'username' ? username : undefined,
          currentPassword: currentPassword,
          ...(profileTab === 'password' ? { newPassword: password } : {})
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setSuccessMsg(profileTab === 'username' ? 'Username updated successfully!' : 'Password updated successfully!');
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
          <div className="flex space-x-4 mb-6">
            <button 
              onClick={() => setProfileTab('username')}
              className={`flex-1 py-3 px-4 rounded-xl font-semibold transition-all ${
                profileTab === 'username' 
                  ? 'bg-purple-600 text-white shadow-md' 
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              Change Username
            </button>
            <button 
              onClick={() => setProfileTab('password')}
              className={`flex-1 py-3 px-4 rounded-xl font-semibold transition-all ${
                profileTab === 'password' 
                  ? 'bg-purple-600 text-white shadow-md' 
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              Change Password
            </button>
          </div>

          {profileTab === 'username' && (
            <form onSubmit={handleProfileUpdate} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Current Username</label>
                <input 
                  type="text" 
                  className="w-full border-2 border-purple-200 rounded-lg p-2 bg-gray-50" 
                  value={user.name}
                  disabled
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">New Username</label>
                <input 
                  type="text" 
                  className="w-full border-2 border-purple-200 rounded-lg p-2" 
                  value={username} 
                  onChange={e => setUsername(e.target.value)} 
                  required 
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Current Password</label>
                <input 
                  type="password" 
                  className="w-full border-2 border-purple-200 rounded-lg p-2" 
                  value={currentPassword} 
                  onChange={e => setCurrentPassword(e.target.value)} 
                  placeholder="Enter password"
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
                {isLoading ? 'Saving...' : 'Update'}
              </button>
            </form>
          )}

          {profileTab === 'password' && (
            <form onSubmit={handleProfileUpdate} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Current Password</label>
                <input 
                  type="password" 
                  className="w-full border-2 border-purple-200 rounded-lg p-2" 
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
                  className="w-full border-2 border-purple-200 rounded-lg p-2" 
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
                  className="w-full border-2 border-purple-200 rounded-lg p-2" 
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
                {isLoading ? 'Saving...' : 'Update'}
              </button>
            </form>
          )}
        </div>
      )}
      {section === 'about' && (
        <div className="space-y-3 text-gray-700">
          <h3 className="text-lg font-bold text-purple-700">About </h3>
          <p>
            This Website designed to encourage sustainable dining habits by rewarding students for borrowing and returning reusable dining sets. Earn points by participating, redeem them for rewards, and help reduce single-use waste on campus!
          </p>
          <ul className="list-disc ml-6">
            <li>Borrow dining sets (plate, spoon, fork) using the app</li>
            <li>Earn points for responsible use and returns</li>
            <li>Redeem points for exciting rewards</li>
            <li>Track your points and activity</li>
          </ul>
          <p>
            This app is part of our commitment to a greener, cleaner campus. Thank you for participating!
          </p>
        </div>
      )}
      {section === 'help' && (
        <div className="space-y-3 text-gray-700">
          <h3 className="text-lg font-bold text-purple-700">Need Help?</h3>
          <p>If you need assistance with your account or have questions, please contact a staff member:</p>
          <ul className="list-disc ml-6">
            <li>Go to any of the Cashier during for assistance.</li>
          </ul>
          <p>We're here to help you make the most of the VARDA Loyalty Reward System!</p>
        </div>
      )}
    </div>
  );
}