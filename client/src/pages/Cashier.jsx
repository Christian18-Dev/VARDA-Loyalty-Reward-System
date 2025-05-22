import { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { KeyIcon, GiftIcon } from '@heroicons/react/outline';
import { Html5Qrcode } from 'html5-qrcode';
import { motion } from 'framer-motion';

export default function CashierPage() {
  const { user } = useAuth();
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
  const itemsPerPage = 5;

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
    item.studentName.toLowerCase().includes(borrowedSearchTerm.toLowerCase())
  );

  const filteredReturnedItems = returnedItems.filter(item =>
    item.studentName.toLowerCase().includes(returnedSearchTerm.toLowerCase())
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

  // Initial fetch on component mount
  useEffect(() => {
    fetchBorrowedItems();
  }, [token]);

  // Set up polling for auto-updates
  useEffect(() => {
    // Poll every 5 seconds
    const pollInterval = setInterval(fetchBorrowedItems, 5000);

    // Cleanup interval on component unmount
    return () => {
      clearInterval(pollInterval);
    };
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
      const res = await axios.post(
        `${baseUrl}/api/cashier/generate-code`,
        {},
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      setGeneratedCode(res.data.code.code);
    } catch (err) {
      console.error('Error generating code:', err);
      alert('Error generating code');
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

  useEffect(() => {
    fetchClaimed();
  }, []);

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
      setTimeout(() => setSuccess(''), 5000);

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
      setReturnedItems(prev => [...prev, response.data.data]);
      
      setSuccess('Item returned successfully!');
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

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-purple-50 p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-purple-800">Cashier Dashboard</h1>
          <p className="text-gray-600 mt-2">Scan QR codes to process requests</p>
        </div>

        {/* Scanner Section */}
        <div className="bg-white rounded-2xl shadow-lg p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold text-gray-800">QR Scanner</h2>
            <button
              onClick={() => setScanning(!scanning)}
              className="px-4 py-2 bg-purple-600 text-white rounded-xl hover:bg-purple-700 transition-all"
            >
              {scanning ? 'Stop Scanning' : 'Start Scanning'}
            </button>
          </div>

          {scanning && (
            <div id="reader" className="max-w-md mx-auto"></div>
          )}

          {/* Messages */}
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-4 p-4 bg-red-100 text-red-700 rounded-xl"
            >
              {error}
            </motion.div>
          )}
          {success && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-4 p-4 bg-green-100 text-green-700 rounded-xl"
            >
              {success}
            </motion.div>
          )}
        </div>

        {/* Borrowed Items Table */}
        <div className="bg-white rounded-2xl shadow-lg p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold text-gray-800">Borrowed Items</h2>
            <div className="w-64">
              <input
                type="text"
                placeholder="Search by student name..."
                value={borrowedSearchTerm}
                onChange={handleBorrowedSearch}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Student
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Items
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Borrow Time
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Action
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {paginatedBorrowedItems.map((item) => (
                  <tr key={item._id}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{item.studentName}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900">
                        {item.items.map(i => `${i.name} (${i.quantity})`).join(', ')}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {new Date(item.borrowTime).toLocaleString()}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-yellow-100 text-yellow-800">
                        {item.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <button
                        onClick={() => handleReturnItem(item._id)}
                        className="px-3 py-1 text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                      >
                        Return
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {paginatedBorrowedItems.length === 0 && (
              <p className="text-gray-500 text-center py-4">No borrowed items found.</p>
            )}
            
            {/* Pagination for Borrowed Items */}
            {totalBorrowedPages > 1 && (
              <div className="flex justify-center mt-4 space-x-2">
                {Array.from({ length: totalBorrowedPages }, (_, i) => i + 1).map((page) => (
                  <button
                    key={page}
                    onClick={() => handleBorrowedPageChange(page)}
                    className={`px-3 py-1 rounded-md ${
                      currentBorrowedPage === page
                        ? 'bg-purple-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {page}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Returned Items Table */}
        <div className="bg-white rounded-2xl shadow-lg p-6 mt-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold text-gray-800">Returned Items History</h2>
            <div className="w-64">
              <input
                type="text"
                placeholder="Search by student name..."
                value={returnedSearchTerm}
                onChange={handleReturnedSearch}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Student
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Items
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Borrow Time
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Return Time
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {paginatedReturnedItems.map((item) => (
                  <tr key={item._id}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{item.studentName}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900">
                        {item.items.map(i => `${i.name} (${i.quantity})`).join(', ')}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {new Date(item.borrowTime).toLocaleString()}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {new Date(item.returnTime).toLocaleString()}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                        {item.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {paginatedReturnedItems.length === 0 && (
              <p className="text-gray-500 text-center py-4">No returned items found.</p>
            )}
            
            {/* Pagination for Returned Items */}
            {totalReturnedPages > 1 && (
              <div className="flex justify-center mt-4 space-x-2">
                {Array.from({ length: totalReturnedPages }, (_, i) => i + 1).map((page) => (
                  <button
                    key={page}
                    onClick={() => handleReturnedPageChange(page)}
                    className={`px-3 py-1 rounded-md ${
                      currentReturnedPage === page
                        ? 'bg-purple-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {page}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Generate Code Section */}
        <div className="bg-white rounded-2xl shadow-md p-6 space-y-4">
          <h2 className="text-xl font-semibold text-gray-700">Generate Redeem Code</h2>
          <button
            onClick={handleGenerateCode}
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2 rounded-full transition"
          >
            Generate Code
          </button>
          {generatedCode && (
            <div className="mt-2 text-green-700 font-mono bg-green-100 px-4 py-2 rounded-lg border border-green-300 w-fit">
              Code: <strong>{generatedCode}</strong>
            </div>
          )}
        </div>

        {/* Claimed Rewards Table */}
        <div className="bg-white rounded-2xl shadow-md p-6">
          <div className="flex items-center space-x-2 mb-4">
            <GiftIcon className="w-6 h-6 text-pink-500" />
            <h2 className="text-xl font-semibold text-gray-800">Claimed Rewards</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full table-auto border border-gray-200">
              <thead>
                <tr className="bg-gray-100 text-gray-700">
                  <th className="p-3 text-left">Student</th>
                  <th className="p-3 text-left">Reward</th>
                  <th className="p-3 text-left">Points Used</th>
                  <th className="p-3 text-left">Date Claimed</th>
                </tr>
              </thead>
              <tbody>
                {claimedRewards.map((claim) => (
                  <tr key={claim._id} className="border-b hover:bg-indigo-50 transition">
                    <td className="p-3">{claim.name}</td>
                    <td className="p-3">{claim.reward}</td>
                    <td className="p-3">{claim.pointsUsed}</td>
                    <td className="p-3">
                      {new Date(claim.dateClaimed).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {claimedRewards.length === 0 && (
              <p className="text-gray-500 text-center py-4">No claimed rewards yet.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
