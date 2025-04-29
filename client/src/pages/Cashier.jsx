import { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';

export default function CashierPage() {
  const { user } = useAuth();
  const [generatedCode, setGeneratedCode] = useState('');
  const [studentId, setStudentId] = useState('');
  const [claimedRewards, setClaimedRewards] = useState([]);

  const baseUrl = import.meta.env.VITE_API_BASE_URL;
  const token = user.token;

  const handleGenerateCode = async () => {
    try {
      const res = await axios.post(
        `${baseUrl}/api/cashier/generate-code`,
        {}, // empty body
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      setGeneratedCode(res.data.code.code); // Show the generated code
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
      setClaimedRewards(res.data);
    } catch (err) {
      console.error('Error fetching claimed rewards:', err);
    }
  };

  useEffect(() => {
    fetchClaimed();
  }, []);

  return (
    <div className="max-w-2xl mx-auto p-6 space-y-6">
      <h1 className="text-2xl font-bold">Cashier Panel</h1>

      <div className="space-y-2">
        <button
          onClick={handleGenerateCode}
          className="bg-blue-500 text-white px-4 py-2 rounded"
        >
          Generate Code
        </button>
        {generatedCode && (
          <p className="text-green-600 mt-2">Generated Code: <strong>{generatedCode}</strong></p>
        )}
      </div>

      <div className="mb-8">
        <h2 className="text-xl font-semibold mb-2">Claimed Rewards</h2>
        <table className="w-full border table-auto">
          <thead>
            <tr className="bg-gray-200">
              <th className="p-2">Student Name</th>
              <th className="p-2">Reward Name</th>
              <th className="p-2">Points Used</th>
              <th className="p-2">Date Claimed</th>
            </tr>
          </thead>
          <tbody>
            {claimedRewards.map((claim) => (
              <tr key={claim._id} className="text-center">
                <td className="p-2">{claim.name}</td>
                <td className="p-2">{claim.reward}</td>
                <td className="p-2">{claim.pointsUsed}</td>
                <td className="p-2">{new Date(claim.dateClaimed).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
