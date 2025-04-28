import { useEffect, useState } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';

export default function AdminPage() {
  const { user } = useAuth();
  const [stats, setStats] = useState({});
  const [rewards, setRewards] = useState({ name: '', cost: '' });
  const [users, setUsers] = useState([]);
  const [claimedRewards, setClaimedRewards] = useState([]);

  const token = user.token;

  useEffect(() => {
    const fetchData = async () => {
      const res = await axios.get('http://localhost:5000/api/admin/stats', {
        headers: { Authorization: `Bearer ${token}` },
      });
      setStats(res.data);

      const userRes = await axios.get('http://localhost:5000/api/admin/users', {
        headers: { Authorization: `Bearer ${token}` },
      });
      setUsers(userRes.data);

      const claimedRes = await axios.get('http://localhost:5000/api/admin/claimed-rewards', {
        headers: { Authorization: `Bearer ${token}` },
      });
      setClaimedRewards(claimedRes.data);
    };

    fetchData();
  }, []);

  const handleCreateReward = async () => {
    await axios.post(
      'http://localhost:5000/api/admin/reward',
      rewards,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    alert('Reward created!');
    setRewards({ name: '', cost: '' });
  };

  return (
    <div className="max-w-6xl mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">Admin Dashboard</h1>

      <div className="mb-8 space-y-4">
        <h2 className="text-xl font-semibold">Points Overview</h2>
        <p>Total Users: {stats.totalUsers}</p>
        <p>Total Unused Points: {stats.totalPointsUnused}</p>
        <p>Total Used Points: {stats.totalPointsUsed}</p>
      </div>

      <div className="mb-8">
        <h2 className="text-xl font-semibold mb-2">Create New Reward</h2>
        <input
          className="border p-2 mr-2 rounded"
          placeholder="Reward Name"
          value={rewards.name}
          onChange={(e) => setRewards({ ...rewards, name: e.target.value })}
        />
        <input
          type="number"
          className="border p-2 mr-2 rounded"
          placeholder="Cost"
          value={rewards.cost}
          onChange={(e) => setRewards({ ...rewards, cost: e.target.value })}
        />
        <button
          onClick={handleCreateReward}
          className="bg-green-600 text-white px-4 py-2 rounded"
        >
          Create
        </button>
      </div>

      <div className="mb-8">
        <h2 className="text-xl font-semibold mb-2">All Users</h2>
        <table className="w-full border table-auto">
          <thead>
            <tr className="bg-gray-200">
              <th className="p-2">Name</th>
              <th className="p-2">Points</th>
              <th className="p-2">Role</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u._id} className="text-center">
                <td className="p-2">{u.name}</td>
                <td className="p-2">{u.points}</td>
                <td className="p-2">{u.role}</td>
              </tr>
            ))}
          </tbody>
        </table>
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
