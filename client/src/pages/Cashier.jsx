import { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { 
  KeyIcon, 
  GiftIcon, 
  LogoutIcon, 
  CameraIcon, 
  ArrowLeftIcon, 
  ArrowRightIcon,
  ExclamationIcon,
  ClipboardCopyIcon,
  CheckIcon
} from '@heroicons/react/outline';
import { Html5Qrcode } from 'html5-qrcode';
import { motion, AnimatePresence } from 'framer-motion';

export default function CashierPage() {
  const { user, logout } = useAuth();
  const [activeTab, setActiveTab] = useState('scanner');
  const [generatedCode, setGeneratedCode] = useState('');
  const [claimedRewards, setClaimedRewards] = useState([]);
  const [scanning, setScanning] = useState(false);
  const [borrowedItems, setBorrowedItems] = useState([]);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [html5QrCode, setHtml5QrCode] = useState(null);
  const [lastScannedCode, setLastScannedCode] = useState('');
  const [isCooldown, setIsCooldown] = useState(false);
  const [scannedCodes, setScannedCodes] = useState(() => {
    // Initialize from localStorage if available
    const savedCodes = localStorage.getItem('scannedCodes');
    return savedCodes ? new Set(JSON.parse(savedCodes)) : new Set();
  });
  const [returnedItems, setReturnedItems] = useState([]);
  const [borrowedSearchTerm, setBorrowedSearchTerm] = useState('');
  const [returnedSearchTerm, setReturnedSearchTerm] = useState('');
  const [currentBorrowedPage, setCurrentBorrowedPage] = useState(1);
  const [currentReturnedPage, setCurrentReturnedPage] = useState(1);
  const [currentRewardsPage, setCurrentRewardsPage] = useState(1);
  const [rewardsSearchTerm, setRewardsSearchTerm] = useState('');
  const itemsPerPage = 5;
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isCopied, setIsCopied] = useState(false);

  const baseUrl = import.meta.env.VITE_API_BASE_URL;
  const token = user.token;

  const fetchBorrowedItems = async () => {
    try {
      const res = await axios.get(`${baseUrl}/api/cashier/borrowed-items`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const items = res.data.data;
      // Sort borrowed items by borrow time (newest first)
      const sortedBorrowed = items
        .filter(item => item.status === 'borrowed')
        .sort((a, b) => new Date(b.borrowTime) - new Date(a.borrowTime));
      // Sort returned items by return time (newest first)
      const sortedReturned = items
        .filter(item => item.status === 'returned')
        .sort((a, b) => new Date(b.returnTime) - new Date(a.returnTime));
      
      setBorrowedItems(sortedBorrowed);
      setReturnedItems(sortedReturned);
    } catch (err) {
      console.error('Error fetching borrowed items:', err);
      setError('Failed to fetch borrowed items');
    }
  };

  // Filter items based on search terms
  const filteredBorrowedItems = borrowedItems.filter(item =>
    item?.studentIdNumber?.toLowerCase().includes(borrowedSearchTerm.toLowerCase())
  );

  const filteredReturnedItems = returnedItems.filter(item =>
    item?.studentIdNumber?.toLowerCase().includes(returnedSearchTerm.toLowerCase())
  );

  // Pagination calculations
  const totalBorrowedPages = Math.ceil(filteredBorrowedItems.length / itemsPerPage);
  const totalReturnedPages = Math.ceil(filteredReturnedItems.length / itemsPerPage);

  const paginatedBorrowedItems = filteredBorrowedItems.slice(
    (currentBorrowedPage - 1) * itemsPerPage,
    currentBorrowedPage * itemsPerPage
  );

  const paginatedReturnedItems = filteredReturnedItems.slice(
    (currentReturnedPage - 1) * itemsPerPage,
    currentReturnedPage * itemsPerPage
  );

  // Handle page changes
  const handleBorrowedPageChange = (page) => {
    setCurrentBorrowedPage(page);
  };

  const handleReturnedPageChange = (page) => {
    setCurrentReturnedPage(page);
  };

  // Handle search
  const handleBorrowedSearch = (e) => {
    setBorrowedSearchTerm(e.target.value);
    setCurrentBorrowedPage(1);
  };

  const handleReturnedSearch = (e) => {
    setReturnedSearchTerm(e.target.value);
    setCurrentReturnedPage(1);
  };

  // Filter rewards based on search term
  const filteredRewards = claimedRewards.filter(reward => 
    reward?.name?.toLowerCase().includes(rewardsSearchTerm.toLowerCase()) ||
    reward?.reward?.toLowerCase().includes(rewardsSearchTerm.toLowerCase())
  );

  // Pagination calculations for rewards
  const totalRewardsPages = Math.ceil(filteredRewards.length / itemsPerPage);
  const paginatedRewards = filteredRewards.slice(
    (currentRewardsPage - 1) * itemsPerPage,
    currentRewardsPage * itemsPerPage
  );

  // Handle rewards page change
  const handleRewardsPageChange = (page) => {
    setCurrentRewardsPage(page);
  };

  // Handle rewards search
  const handleRewardsSearch = (e) => {
    setRewardsSearchTerm(e.target.value);
    setCurrentRewardsPage(1);
  };

  // Set up polling for active tab
  useEffect(() => {
    let pollInterval;

    const startPolling = () => {
      // Clear any existing interval
      if (pollInterval) {
        clearInterval(pollInterval);
      }

      // Set up new interval based on active tab
      switch (activeTab) {
        case 'borrowed':
        case 'returned':
          pollInterval = setInterval(fetchBorrowedItems, 3000);
          break;
        case 'rewards':
          pollInterval = setInterval(fetchClaimed, 3000);
          break;
        default:
          break;
      }
    };

    // Start polling when component mounts or tab changes
    startPolling();

    // Cleanup interval on component unmount or tab change
    return () => {
      if (pollInterval) {
      clearInterval(pollInterval);
      }
    };
  }, [activeTab, token]);

  // Initial fetch for all data
  useEffect(() => {
    fetchBorrowedItems();
    fetchClaimed();
  }, [token]);

  const startScanner = async () => {
    try {
      const qrCode = new Html5Qrcode("reader");
      setHtml5QrCode(qrCode);

      await qrCode.start(
        { facingMode: "environment" },
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
          aspectRatio: 1.0,
          disableFlip: false,
          delayBetweenScanAttempts: 1000
        },
        (decodedText) => {
          handleScan(decodedText);
          stopScanner();
        },
        (errorMessage) => {
          // Ignore errors during scanning
        }
      );
    } catch (err) {
      console.error('Error starting scanner:', err);
      setError('Failed to start camera');
      setScanning(false);
    }
  };

  const stopScanner = async () => {
    if (html5QrCode) {
      try {
        await html5QrCode.stop();
        setHtml5QrCode(null);
      } catch (err) {
        console.error('Error stopping scanner:', err);
      }
    }
  };

  useEffect(() => {
    if (scanning) {
      startScanner();
    } else {
      stopScanner();
    }
  }, [scanning]);

  const handleGenerateCode = async () => {
    try {
      setIsGenerating(true);
      
      // Add minimum loading time of 1.5 seconds
      const loadingPromise = new Promise(resolve => setTimeout(resolve, 1500));
      
      // Generate code
      const codePromise = axios.post(
        `${baseUrl}/api/cashier/generate-code`,
        {},
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      // Wait for both the minimum loading time and code generation
      const [codeResponse] = await Promise.all([codePromise, loadingPromise]);
      
      setGeneratedCode(codeResponse.data.code.code);
    } catch (err) {
      console.error('Error generating code:', err);
      setError('Error generating code');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(generatedCode);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy code:', err);
      setError('Failed to copy code');
    }
  };

  const fetchClaimed = async () => {
    try {
      const res = await axios.get(`${baseUrl}/api/cashier/claimed-rewards`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      // Sort newest first
      const sorted = res.data.sort(
        (a, b) => new Date(b.dateClaimed) - new Date(a.dateClaimed)
      );
      setClaimedRewards(sorted);
    } catch (err) {
      console.error('Error fetching claimed rewards:', err);
    }
  };

  // Save scanned codes to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('scannedCodes', JSON.stringify([...scannedCodes]));
  }, [scannedCodes]);

  const handleScan = async (decodedText) => {
    try {
      // Stop scanning immediately to prevent multiple scans
      setScanning(false);
      
      // Check if we're in cooldown
      if (isCooldown) {
        return;
      }

      const orderData = JSON.parse(decodedText);
      
      // Create a unique identifier using studentId and timestamp
      const scanIdentifier = `${orderData.studentId}-${orderData.timestamp}`;

      // Check if this specific QR code has been scanned before
      if (scannedCodes.has(scanIdentifier)) {
        setError('This QR code has already been scanned.');
        setTimeout(() => setError(''), 5000);
        return;
      }

      // Set cooldown and add identifier to scanned set
      setIsCooldown(true);
      setScannedCodes(prev => new Set([...prev, scanIdentifier]));
      
      // Save to database
      const response = await axios.post(
        `${baseUrl}/api/cashier/scan-item`,
        {
          items: orderData.items,
          studentName: orderData.studentName,
          studentId: orderData.studentId
        },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      // Update local state with the saved item at the beginning of the list
      setBorrowedItems(prev => [response.data.data, ...prev]);

      setSuccess('QR Code scanned successfully! Items have been borrowed.');
      setTimeout(() => setError(''), 5000);

      // Reset cooldown after 5 seconds
      setTimeout(() => {
        setIsCooldown(false);
      }, 5000);

    } catch (err) {
      console.error('Error scanning QR code:', err);
      setError('Invalid QR Code or failed to save');
      setTimeout(() => setError(''), 5000);
    }
  };

  const handleError = (err) => {
    console.error(err);
    setError('Error scanning QR Code');
    setTimeout(() => setError(''), 3000);
  };

  const handleReturnItem = async (itemId) => {
    try {
      const response = await axios.put(
        `${baseUrl}/api/cashier/return-item/${itemId}`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );

      // Update the local state
      setBorrowedItems(prev => prev.filter(item => item._id !== itemId));
      setReturnedItems(prev => [response.data.data, ...prev]);
      
      setSuccess('Item returned successfully! Student earned 1 loyalty point.');
      setTimeout(() => setSuccess(''), 5000);
    } catch (err) {
      console.error('Error returning item:', err);
      setError(err.response?.data?.message || 'Failed to return item');
      setTimeout(() => setError(''), 5000);
    }
  };

  // Add a function to clear scanned codes (optional, can be used if needed)
  const clearScannedCodes = () => {
    setScannedCodes(new Set());
    localStorage.removeItem('scannedCodes');
  };

  const handleLogoutClick = () => {
    setShowLogoutModal(true);
  };

  const handleConfirmLogout = () => {
    logout();
    setShowLogoutModal(false);
  };

  const handleCancelLogout = () => {
    setShowLogoutModal(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50">
      {/* Header with Welcome Message and Logout */}
      <div className="bg-white shadow-lg fixed top-0 left-0 right-0 z-[100]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-3">
              <div className="h-10 w-10 rounded-full bg-purple-600 flex items-center justify-center">
                <span className="text-white font-bold text-lg">{user?.name?.[0] || 'U'}</span>
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-800">Employee Dashboard</h1>
                <p className="text-sm text-gray-600">Welcome, {user?.name || 'User'}</p>
              </div>
            </div>
            <button
              onClick={handleLogoutClick}
              className="flex items-center space-x-2 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors shadow-sm"
            >
              <LogoutIcon className="w-5 h-5" />
              <span className="hidden sm:inline">Logout</span>
            </button>
          </div>
        </div>
      </div>

      {/* Logout Confirmation Modal */}
      <AnimatePresence>
        {showLogoutModal && (
          <div className="fixed inset-0 z-[100] overflow-y-auto">
            <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 backdrop-blur-sm bg-white/30 transition-opacity"
                aria-hidden="true"
                onClick={handleCancelLogout}
              />

              <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>

              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="relative inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full"
                role="dialog"
                aria-modal="true"
                aria-labelledby="modal-headline"
              >
                <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                  <div className="sm:flex sm:items-start">
                    <div className="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-red-100 sm:mx-0 sm:h-10 sm:w-10">
                      <ExclamationIcon className="h-6 w-6 text-red-600" aria-hidden="true" />
                    </div>
                    <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left">
                      <h3 className="text-lg leading-6 font-medium text-gray-900" id="modal-headline">
                        Confirm Logout
                      </h3>
                      <div className="mt-2">
                        <p className="text-sm text-gray-500">
                          Are you sure you want to logout? You will need to login again to access the dashboard.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                  <button
                    type="button"
                    onClick={handleConfirmLogout}
                    className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-red-600 text-base font-medium text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 sm:ml-3 sm:w-auto sm:text-sm"
                  >
                    Logout
                  </button>
                  <button
                    type="button"
                    onClick={handleCancelLogout}
                    className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
                  >
                    Cancel
                  </button>
                </div>
              </motion.div>
            </div>
          </div>
        )}
      </AnimatePresence>

      {/* Tab Navigation */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 bg-white fixed top-[72px] left-0 right-0 z-[90] shadow-sm">
        <div className="flex space-x-2 overflow-x-auto pb-2 scrollbar-hide">
          {[
            { id: 'scanner', icon: CameraIcon, label: 'Scanner' },
            { id: 'generator', icon: KeyIcon, label: 'Generate Code' },
            { id: 'borrowed', icon: ArrowLeftIcon, label: 'Borrowed' },
            { id: 'returned', icon: ArrowRightIcon, label: 'Returned' },
            { id: 'rewards', icon: GiftIcon, label: 'Rewards' }
          ].map(({ id, icon: Icon, label }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl whitespace-nowrap transition-all ${
                activeTab === id
                  ? 'bg-purple-600 text-white shadow-md'
                  : 'bg-white text-gray-700 hover:bg-gray-50'
              }`}
            >
              <Icon className="w-5 h-5" />
              <span>{label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 mt-[144px]">
        {/* Scanner Tab */}
        {activeTab === 'scanner' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-2xl shadow-lg p-4 sm:p-6"
          >
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 space-y-4 sm:space-y-0">
              <div>
                <h2 className="text-2xl font-bold text-gray-800">QR Scanner</h2>
                <p className="text-gray-600 mt-1">Scan student QR codes to process requests</p>
              </div>
              <button
                onClick={() => setScanning(!scanning)}
                className={`w-full sm:w-auto px-6 py-3 rounded-xl transition-all flex items-center justify-center space-x-2 ${
                  scanning
                    ? 'bg-red-500 hover:bg-red-600 text-white'
                    : 'bg-purple-600 hover:bg-purple-700 text-white'
                }`}
              >
                <CameraIcon className="w-5 h-5" />
                <span>{scanning ? 'Stop Scanning' : 'Start Scanning'}</span>
            </button>
          </div>

          {scanning && (
              <div className="relative">
                <div id="reader" className="max-w-md mx-auto rounded-xl overflow-hidden shadow-lg"></div>
                <div className="absolute inset-0 pointer-events-none border-2 border-purple-500 rounded-xl"></div>
              </div>
          )}

          {/* Messages */}
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
                className="mt-4 p-4 bg-red-50 text-red-700 rounded-xl border border-red-200"
            >
              {error}
            </motion.div>
          )}
          {success && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
                className="mt-4 p-4 bg-green-50 text-green-700 rounded-xl border border-green-200"
            >
              {success}
            </motion.div>
          )}
          </motion.div>
        )}

        {/* Code Generator Tab */}
        {activeTab === 'generator' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-2xl shadow-lg p-4 sm:p-6"
          >
            <div className="max-w-2xl mx-auto">
              <div className="text-center mb-8">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-purple-100 mb-4">
                  <KeyIcon className="w-8 h-8 text-purple-600" />
                </div>
                <h2 className="text-2xl font-bold text-gray-800">Generate Redeem Code</h2>
                <p className="text-gray-600 mt-2">
                  Create a unique code for students to redeem their rewards
                </p>
        </div>

              <div className="space-y-6">
                <button
                  onClick={handleGenerateCode}
                  disabled={isGenerating}
                  className={`w-full px-6 py-4 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white rounded-xl transition-all flex items-center justify-center space-x-3 shadow-lg hover:shadow-xl disabled:opacity-70 disabled:cursor-not-allowed`}
                >
                  {isGenerating ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      <span className="text-lg font-medium">Generating Code...</span>
                    </>
                  ) : (
                    <>
                      <KeyIcon className="w-6 h-6" />
                      <span className="text-lg font-medium">Generate New Code</span>
                    </>
                  )}
                </button>

                {generatedCode && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mt-6 p-6 bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl border border-green-200"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-lg font-medium text-green-800">Generated Code</h3>
                      <button
                        onClick={handleCopyCode}
                        className="p-2 text-green-600 hover:text-green-700 hover:bg-green-100 rounded-lg transition-colors"
                        title="Copy to clipboard"
                      >
                        {isCopied ? (
                          <CheckIcon className="w-5 h-5" />
                        ) : (
                          <ClipboardCopyIcon className="w-5 h-5" />
                        )}
                      </button>
                    </div>
                    <div className="relative">
                      <div className="font-mono text-3xl text-green-700 bg-white p-6 rounded-xl border border-green-300 text-center tracking-wider shadow-inner">
                        {generatedCode}
                      </div>
                      <div className="mt-4 text-center">
                        <div className="inline-flex items-center space-x-2 text-sm text-green-600 bg-white px-3 py-1 rounded-full shadow-sm border border-green-200">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          <span>Expires in 24 hours</span>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}

                {error && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mt-4 p-4 bg-red-50 text-red-700 rounded-xl border border-red-200"
                  >
                    {error}
                  </motion.div>
                )}
              </div>
            </div>
          </motion.div>
        )}

        {/* Borrowed Items Tab */}
        {activeTab === 'borrowed' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-2xl shadow-lg p-4 sm:p-6"
          >
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 space-y-4 sm:space-y-0">
              <div>
                <h2 className="text-2xl font-bold text-gray-800">Borrowed Items</h2>
                <p className="text-gray-600 mt-1">Track all currently borrowed items</p>
              </div>
              <div className="w-full sm:w-64">
                <div className="relative">
              <input
                type="text"
                placeholder="Search by student ID..."
                value={borrowedSearchTerm}
                onChange={handleBorrowedSearch}
                    className="w-full px-4 py-2 pl-10 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
                  <svg className="w-5 h-5 text-gray-400 absolute left-3 top-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
              </div>
            </div>
            <div className="overflow-x-auto rounded-xl border border-gray-200">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                    <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    ID Number
                  </th>
                    <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Items
                  </th>
                    <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Borrow Time
                  </th>
                    <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                    <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Action
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {paginatedBorrowedItems.map((item) => (
                    <tr key={item._id} className="hover:bg-gray-50">
                      <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {item.studentIdNumber}
                      </td>
                      <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {item.items.map((i, index) => (
                          <div key={index}>
                            {i.name} (x{i.quantity})
                          </div>
                        ))}
                      </td>
                      <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(item.borrowTime).toLocaleString()}
                      </td>
                      <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          item.status === 'borrowed' ? 'bg-yellow-100 text-yellow-800' : 'bg-green-100 text-green-800'
                        }`}>
                          {item.status}
                        </span>
                      </td>
                      <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {item.status === 'borrowed' && (
                          <button
                            onClick={() => handleReturnItem(item._id)}
                            className="text-blue-600 hover:text-blue-900"
                          >
                            Return
                          </button>
                        )}
                      </td>
                    </tr>
                ))}
              </tbody>
            </table>
            {paginatedBorrowedItems.length === 0 && (
                <div className="text-center py-12">
                  <p className="text-gray-500">No borrowed items found.</p>
                </div>
            )}
            </div>
            
            {/* Pagination for Borrowed Items */}
            {totalBorrowedPages > 1 && (
              <div className="flex justify-center items-center mt-6 space-x-4">
                <button
                  onClick={() => handleBorrowedPageChange(Math.max(1, currentBorrowedPage - 1))}
                  disabled={currentBorrowedPage === 1}
                  className={`p-2 rounded-lg transition-colors ${
                    currentBorrowedPage === 1
                      ? 'text-gray-400 cursor-not-allowed'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  <ArrowLeftIcon className="w-5 h-5" />
                </button>
                <span className="text-gray-700 font-medium">
                  Page {currentBorrowedPage} of {totalBorrowedPages}
                </span>
                  <button
                  onClick={() => handleBorrowedPageChange(Math.min(totalBorrowedPages, currentBorrowedPage + 1))}
                  disabled={currentBorrowedPage === totalBorrowedPages}
                  className={`p-2 rounded-lg transition-colors ${
                    currentBorrowedPage === totalBorrowedPages
                      ? 'text-gray-400 cursor-not-allowed'
                      : 'text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                  <ArrowRightIcon className="w-5 h-5" />
                  </button>
              </div>
            )}
          </motion.div>
        )}

        {/* Returned Items Tab */}
        {activeTab === 'returned' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-2xl shadow-lg p-4 sm:p-6"
          >
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 space-y-4 sm:space-y-0">
              <div>
                <h2 className="text-2xl font-bold text-gray-800">Returned Items History</h2>
                <p className="text-gray-600 mt-1">View history of all returned items</p>
          </div>
              <div className="w-full sm:w-64">
                <div className="relative">
              <input
                type="text"
                placeholder="Search by student ID..."
                value={returnedSearchTerm}
                onChange={handleReturnedSearch}
                    className="w-full px-4 py-2 pl-10 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
                  <svg className="w-5 h-5 text-gray-400 absolute left-3 top-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
              </div>
            </div>
            <div className="overflow-x-auto rounded-xl border border-gray-200">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                    <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    ID Number
                  </th>
                    <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Items
                  </th>
                    <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Borrow Time
                  </th>
                    <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Return Time
                  </th>
                    <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {paginatedReturnedItems.map((item) => (
                    <tr key={item._id} className="hover:bg-gray-50">
                      <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {item.studentIdNumber}
                      </td>
                      <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {item.items.map((i, index) => (
                          <div key={index}>
                            {i.name} (x{i.quantity})
                          </div>
                        ))}
                      </td>
                      <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(item.borrowTime).toLocaleString()}
                      </td>
                      <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(item.returnTime).toLocaleString()}
                      </td>
                      <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                          {item.status}
                        </span>
                      </td>
                    </tr>
                ))}
              </tbody>
            </table>
            {paginatedReturnedItems.length === 0 && (
                <div className="text-center py-12">
                  <p className="text-gray-500">No returned items found.</p>
                </div>
            )}
            </div>
            
            {/* Pagination for Returned Items */}
            {totalReturnedPages > 1 && (
              <div className="flex justify-center items-center mt-6 space-x-4">
                <button
                  onClick={() => handleReturnedPageChange(Math.max(1, currentReturnedPage - 1))}
                  disabled={currentReturnedPage === 1}
                  className={`p-2 rounded-lg transition-colors ${
                    currentReturnedPage === 1
                      ? 'text-gray-400 cursor-not-allowed'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  <ArrowLeftIcon className="w-5 h-5" />
                </button>
                <span className="text-gray-700 font-medium">
                  Page {currentReturnedPage} of {totalReturnedPages}
                </span>
                  <button
                  onClick={() => handleReturnedPageChange(Math.min(totalReturnedPages, currentReturnedPage + 1))}
                  disabled={currentReturnedPage === totalReturnedPages}
                  className={`p-2 rounded-lg transition-colors ${
                    currentReturnedPage === totalReturnedPages
                      ? 'text-gray-400 cursor-not-allowed'
                      : 'text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                  <ArrowRightIcon className="w-5 h-5" />
                  </button>
              </div>
            )}
          </motion.div>
        )}

        {/* Rewards Tab */}
        {activeTab === 'rewards' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-2xl shadow-lg p-4 sm:p-6"
          >
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 space-y-4 sm:space-y-0">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-pink-100 rounded-lg">
                  <GiftIcon className="w-6 h-6 text-pink-600" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-gray-800">Claimed Rewards</h2>
                  <p className="text-gray-600 mt-1">View all claimed rewards by students</p>
                </div>
              </div>
              <div className="w-full sm:w-64">
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Search rewards..."
                    value={rewardsSearchTerm}
                    onChange={handleRewardsSearch}
                    className="w-full px-4 py-2 pl-10 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  />
                  <svg className="w-5 h-5 text-gray-400 absolute left-3 top-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
              </div>
            </div>
            <div className="overflow-x-auto rounded-xl border border-gray-200">
              <table className="min-w-full table-auto">
              <thead>
                  <tr className="bg-gray-50">
                    <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ID Number</th>
                    <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Reward</th>
                    <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Points Used</th>
                    <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date Claimed</th>
                </tr>
              </thead>
                <tbody className="divide-y divide-gray-200">
                  {paginatedRewards.map((claim) => (
                    <tr key={claim._id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 sm:px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{claim.idNumber}</div>
                      </td>
                      <td className="px-4 sm:px-6 py-4">
                        <div className="text-sm text-gray-900">{claim.reward}</div>
                      </td>
                      <td className="px-4 sm:px-6 py-4 whitespace-nowrap">
                        <span className="px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-purple-100 text-purple-800">
                          {claim.pointsUsed} points
                        </span>
                      </td>
                      <td className="px-4 sm:px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {new Date(claim.dateClaimed).toLocaleString()}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {paginatedRewards.length === 0 && (
                <div className="text-center py-12">
                  <p className="text-gray-500">No claimed rewards found.</p>
                </div>
            )}
          </div>
            
            {/* Pagination for Rewards */}
            {totalRewardsPages > 1 && (
              <div className="flex justify-center items-center mt-6 space-x-4">
                <button
                  onClick={() => handleRewardsPageChange(Math.max(1, currentRewardsPage - 1))}
                  disabled={currentRewardsPage === 1}
                  className={`p-2 rounded-lg transition-colors ${
                    currentRewardsPage === 1
                      ? 'text-gray-400 cursor-not-allowed'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  <ArrowLeftIcon className="w-5 h-5" />
                </button>
                <span className="text-gray-700 font-medium">
                  Page {currentRewardsPage} of {totalRewardsPages}
                </span>
                <button
                  onClick={() => handleRewardsPageChange(Math.min(totalRewardsPages, currentRewardsPage + 1))}
                  disabled={currentRewardsPage === totalRewardsPages}
                  className={`p-2 rounded-lg transition-colors ${
                    currentRewardsPage === totalRewardsPages
                      ? 'text-gray-400 cursor-not-allowed'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  <ArrowRightIcon className="w-5 h-5" />
                </button>
        </div>
            )}
          </motion.div>
        )}
      </div>
    </div>
  );
}