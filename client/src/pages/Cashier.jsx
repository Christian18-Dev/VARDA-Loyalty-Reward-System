import { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { KeyIcon, GiftIcon } from '@heroicons/react/outline';

export default function CashierPage() {
  const { user } = useAuth();
  const [generatedCode, setGeneratedCode] = useState('');
  const [claimedRewards, setClaimedRewards] = useState([]);

  const baseUrl = import.meta.env.VITE_API_BASE_URL;
  const token = user.token;

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

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-100 to-white p-6">
      <div className="max-w-3xl mx-auto space-y-6">

        {/* Title Section */}
        <div className="flex items-center space-x-3">
          <KeyIcon className="w-8 h-8 text-indigo-600" />
          <h1 className="text-3xl font-bold text-indigo-800">Cashier Panel</h1>
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
