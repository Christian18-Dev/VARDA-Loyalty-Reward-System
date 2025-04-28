import { useEffect, useState } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';

export default function StudentPage() {
  const { user } = useAuth();
  const [points, setPoints] = useState(0);
  const [rewards, setRewards] = useState([]);
  const [code, setCode] = useState('');
  const [showFeedback, setShowFeedback] = useState(false);
  const [rating, setRating] = useState(0);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      const token = user.token;
      const res = await axios.get('http://localhost:5000/api/student/points', {
        headers: { Authorization: `Bearer ${token}` },
      });
      setPoints(res.data.points);

      const rewardRes = await axios.get('http://localhost:5000/api/rewards', {
        headers: { Authorization: `Bearer ${token}` },
      });
      setRewards(rewardRes.data);
    };

    fetchData();
  }, [user.token]);

  const handleCodeSubmit = async () => {
    try {
      const token = user.token;
      const response = await axios.post(
        'http://localhost:5000/api/student/claim-code',
        { code },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      console.log('Code submitted successfully:', response.data.message);
      setShowFeedback(true);
      setErrorMessage('');
    } catch (error) {
      console.error('Error submitting code:', error);
      if (error.response && error.response.status === 400) {
        setErrorMessage(error.response.data.message || 'Code is invalid or already used.');
      } else {
        setErrorMessage('An unexpected error occurred. Please try again.');
      }
    }
  };

  const submitFeedback = async () => {
    if (!rating) {
      alert('Please select a rating!');
      return;
    }

    try {
      const token = user.token;
      const res = await axios.post(
        'http://localhost:5000/api/student/submit-feedback',
        { code, rating },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      alert('Feedback submitted! You earned points.');
      setShowFeedback(false);
      setCode('');
      setRating(0);

      const updated = await axios.get('http://localhost:5000/api/student/points', {
        headers: { Authorization: `Bearer ${token}` },
      });
      setPoints(updated.data.points);
    } catch (err) {
      console.error('Error submitting feedback:', err);
      alert(err.response?.data?.message || 'Failed to submit feedback');
    }
  };

  const claimReward = async (rewardId) => {
    try {
      const response = await axios.post(
        `http://localhost:5000/api/student/claim-reward/${rewardId}`,
        {},
        { headers: { Authorization: `Bearer ${user.token}` } }
      );
      
      alert(response.data.message);
      setPoints(response.data.newPoints); // Update points display
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to claim reward');
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-6 space-y-6">
      <h1 className="text-2xl font-bold">Welcome, {user.name}!</h1>
      <p className="text-lg">Points: <span className="font-semibold">{points}</span></p>

      <div className="space-y-2">
        <h2 className="text-xl font-semibold">Claim Code</h2>
        <input
          className="w-full border p-2 rounded"
          placeholder="Enter code"
          value={code}
          onChange={(e) => setCode(e.target.value)}
        />
        {errorMessage && (
          <p className="text-red-500 mt-2">{errorMessage}</p>
        )}
        <button
          onClick={handleCodeSubmit}
          className="bg-blue-500 text-white px-4 py-2 rounded"
        >
          Submit Code
        </button>
      </div>

      {showFeedback && (
        <div className="space-y-2">
          <h3 className="text-lg font-medium">Rate your experience</h3>
          <div className="flex gap-2">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                className={`p-2 rounded-full border ${rating >= star ? 'bg-yellow-400' : 'bg-gray-200'}`}
                onClick={() => setRating(star)}
              >
                {star}⭐
              </button>
            ))}
          </div>
          <button
            onClick={submitFeedback}
            disabled={!rating}
            className={`text-white px-4 py-2 rounded ${!rating ? 'bg-gray-400' : 'bg-green-500'}`}
          >
            Submit Feedback
          </button>
        </div>
      )}

      <div>
        <h2 className="text-xl font-semibold mt-6">Available Rewards</h2>
        <ul className="space-y-3 mt-2">
          {rewards.map((reward) => (
            <li key={reward._id} className="p-4 border rounded flex justify-between items-center">
              <div>
                <p className="font-medium">{reward.name}</p>
                <p className="text-sm text-gray-600">Cost: {reward.cost} pts</p>
              </div>
              <button
                onClick={() => claimReward(reward._id)}
                disabled={points < reward.cost}
                className="bg-purple-500 text-white px-3 py-1 rounded disabled:bg-gray-400"
              >
                Claim
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
