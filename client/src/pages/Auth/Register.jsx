import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

export default function Register() {
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const { data } = await axios.post(`${API_BASE_URL}/api/auth/register`, {
        name,
        password,
      });

      login(data);
      navigate('/student'); // default role is student
    } catch (err) {
      alert('Registration failed');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="max-w-md mx-auto mt-20 space-y-4">
      <h1 className="text-2xl font-bold">Register</h1>
      <input
        className="w-full p-2 border rounded"
        placeholder="Username"
        value={name}
        onChange={(e) => setName(e.target.value)}
        required
      />
      <input
        className="w-full p-2 border rounded"
        placeholder="Password"
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        required
      />
      <button className="w-full bg-green-500 text-white p-2 rounded">Register</button>
    </form>
  );
}
