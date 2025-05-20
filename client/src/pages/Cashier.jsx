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

  const baseUrl = import.meta.env.VITE_API_BASE_URL;
  const token = user.token;

  const startScanner = async () => {
    try {
      const qrCode = new Html5Qrcode("reader");
      setHtml5QrCode(qrCode);

      // Get all cameras
      const devices = await Html5Qrcode.getCameras();
      
      // Find the back camera (usually the last one in the list)
      const backCamera = devices[devices.length - 1];

      await qrCode.start(
        backCamera.id,
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
          aspectRatio: 1.0,
          disableFlip: false,
          formatsToSupport: [ Html5Qrcode.FORMATS.QR_CODE ],
          videoConstraints: {
            focusMode: "continuous",
            zoom: 2.0
          }
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

  const handleScan = async (decodedText) => {
    try {
      const orderData = JSON.parse(decodedText);
      
      // Add the scanned order to borrowed items
      setBorrowedItems(prev => [...prev, {
        ...orderData,
        id: Date.now(), // Temporary ID for the list
        status: 'pending'
      }]);

      setSuccess('QR Code scanned successfully!');
      setScanning(false);
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError('Invalid QR Code');
      setTimeout(() => setError(''), 3000);
    }
  };

  const handleError = (err) => {
    console.error(err);
    setError('Error scanning QR Code');
    setTimeout(() => setError(''), 3000);
  };

  const handleConfirmBorrow = async (itemId) => {
    try {
      // Here you would typically make an API call to confirm the borrow
      setBorrowedItems(prev => 
        prev.map(item => 
          item.id === itemId 
            ? { ...item, status: 'confirmed' }
            : item
        )
      );
      setSuccess('Borrow confirmed successfully!');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError('Failed to confirm borrow');
      setTimeout(() => setError(''), 3000);
    }
  };

  useEffect(() => {
    fetchClaimed();
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-purple-50 p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-purple-800">Cashier Dashboard</h1>
          <p className="text-gray-600 mt-2">Scan QR codes to process borrow requests</p>
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
          <h2 className="text-xl font-semibold text-gray-800 mb-4">Borrowed Items</h2>
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
                    Time
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
                {borrowedItems.map((item) => (
                  <tr key={item.id}>
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
                        {new Date(item.timestamp).toLocaleString()}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        item.status === 'confirmed' 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-yellow-100 text-yellow-800'
                      }`}>
                        {item.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      {item.status === 'pending' && (
                        <button
                          onClick={() => handleConfirmBorrow(item.id)}
                          className="text-purple-600 hover:text-purple-900"
                        >
                          Confirm
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
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
