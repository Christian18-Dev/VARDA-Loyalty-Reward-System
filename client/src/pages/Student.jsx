import { useEffect, useState } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { HomeIcon, TicketIcon, GiftIcon, LogoutIcon} from '@heroicons/react/outline';
import { motion } from 'framer-motion';
import confetti from 'canvas-confetti';

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

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        const token = user.token;
        const [pointsRes, rewardsRes] = await Promise.all([
          axios.get('http://localhost:5000/api/student/points', {
            headers: { Authorization: `Bearer ${token}` },
          }),
          axios.get('http://localhost:5000/api/rewards', {
            headers: { Authorization: `Bearer ${token}` },
          })
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
        'http://localhost:5000/api/student/claim-code',
        { code },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setShowFeedback(true);
      setErrorMessage('');
      setSuccessMessage('Code accepted! Please rate your experience.');
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 }
      });
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
    localStorage.removeItem('user'); // or your auth token/session
    // Redirect to login page or homepage
    window.location.href = '/VARDA-Loyalty-Reward-System/login'; 
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
        'http://localhost:5000/api/student/submit-feedback',
        { code, rating },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      const updated = await axios.get('http://localhost:5000/api/student/points', {
        headers: { Authorization: `Bearer ${token}` },
      });
      
      setPoints(updated.data.points);
      setSuccessMessage(`Feedback submitted!`);
      setShowFeedback(false);
      setCode('');
      setRating(0);
      
      confetti({
        particleCount: rating * 20,
        spread: 70,
        origin: { y: 0.6 }
      });

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
        `http://localhost:5000/api/student/claim-reward/${rewardId}`,
        {},
        { headers: { Authorization: `Bearer ${user.token}` } }
      );
  
      setPoints(response.data.newPoints);
  
      // Set claimed reward name for modal
      const claimed = rewards.find((r) => r._id === rewardId);
      setClaimedRewardName(claimed?.name || 'Reward');
      setClaimTime(new Date().toLocaleString()); 
      // Show congrats modal
      setShowClaimModal(true);
  
      // Trigger confetti
      confetti({
        particleCount: 150,
        spread: 100,
        origin: { y: 0.6 }
      });
  
    } catch (err) {
      setErrorMessage(err.response?.data?.message || 'Failed to claim reward');
    } finally {
      setIsLoading(false);
    }
  };  

  // Animation variants
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.1 } }
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: { y: 0, opacity: 1 }
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
              className="relative mx-auto p-6 md:p-7 w-full max-w-md bg-gradient-to-br from-indigo-600 via-purple-700 to-purple-800 rounded-2xl shadow-2xl text-white overflow-hidden aspect-[85.6/54]"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              style={{
                perspective: "1000px",
                transformStyle: "preserve-3d"
              }}
            >

              {/* Card Content */}
              <div className="relative z-10 flex flex-col justify-between h-full">
                {/* Card issuer and chip */}
                <div className="flex justify-between items-start">
                  <div className="text-xs font-medium opacity-80">LOYALTY CARD</div>
                  <div className="w-10 h-8 bg-gradient-to-br from-yellow-300 to-yellow-500 rounded-md flex items-center justify-center">
                    <div className="w-8 h-6 bg-gradient-to-br from-yellow-400 to-yellow-600 rounded-sm border border-yellow-200/50 flex items-center justify-center">
                      <div className="w-5 h-4 bg-gradient-to-br from-yellow-500 to-yellow-700 rounded-xs border border-yellow-300/50"></div>
                    </div>
                  </div>
                </div>

                {/* Points display with animation */}
                <motion.div 
                  key={points}
                  initial={{ scale: 1.1, opacity: 0.8 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="text-center my-4"
                >
                  <p className="text-xs opacity-80 mb-1">POINTS BALANCE:</p>
                  <p className="text-4xl md:text-5xl font-bold tracking-tight flex items-center justify-center">
                    {points} <span className="text-2xl ml-2">⭐</span>
                  </p>
                </motion.div>

                {/* Card footer */}
                <div className="flex justify-between items-end">
                  <div>
                    <p className="font-medium tracking-wider">{user.name.toUpperCase()}</p>
                  </div>
                  
                  <div className="text-right">
                    <p className="text-xs opacity-80">STATUS</p>
                    <div className="flex items-center justify-end space-x-1">
                      <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                      <p className="font-medium">ACTIVE</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Shine effect on hover */}
              <div className="absolute inset-0 pointer-events-none overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-r from-transparent via-white/30 to-transparent opacity-0 hover:opacity-30 transition-opacity duration-300"></div>
              </div>
            </motion.div>
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
            You’ve successfully claimed:
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

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t-2 border-purple-200 shadow-lg flex justify-around py-3 z-40">
        <button 
          onClick={() => {
            setCurrentPage('home');
            setErrorMessage('');
            setSuccessMessage('');
          }} 
          className={`flex flex-col items-center text-sm p-2 rounded-xl transition-all ${currentPage === 'home' ? 'text-purple-700 bg-purple-100' : 'text-gray-500'}`}
          aria-label="Home"
        >
          <HomeIcon className="h-7 w-7" />
          <span className="mt-1 font-medium">Home</span>
        </button>
        <button 
          onClick={() => {
            setCurrentPage('claim');
            setCode('');
            setShowFeedback(false);
            setErrorMessage('');
            setSuccessMessage('');
          }} 
          className={`flex flex-col items-center text-sm p-2 rounded-xl transition-all ${currentPage === 'claim' ? 'text-blue-700 bg-blue-100' : 'text-gray-500'}`}
          aria-label="Claim Code"
        >
          <TicketIcon className="h-7 w-7" />
          <span className="mt-1 font-medium">Redeem</span>
        </button>
        <button 
          onClick={() => {
            setCurrentPage('rewards');
            setErrorMessage('');
            setSuccessMessage('');
          }} 
          className={`flex flex-col items-center text-sm p-2 rounded-xl transition-all ${currentPage === 'rewards' ? 'text-pink-700 bg-pink-100' : 'text-gray-500'}`}
          aria-label="Rewards"
        >
          <GiftIcon className="h-7 w-7" />
          <span className="mt-1 font-medium">Rewards</span>
        </button>

         {/* Logout Button */}
        <button 
          onClick={() => setShowLogoutModal(true)}
          className="flex flex-col items-center text-sm p-2 rounded-xl text-red-500 transition-all"
          aria-label="Logout"
        >
          <LogoutIcon className="h-7 w-7" />
          <span className="mt-1 font-medium">Logout</span>
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