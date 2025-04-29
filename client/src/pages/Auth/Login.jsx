import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import axios from 'axios';
import { Link } from 'react-router-dom';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

export default function Login() {
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const { data } = await axios.post(`${API_BASE_URL}/api/auth/login`, {
        name,
        password,
      });

      login(data);
      if (data.role === 'student') navigate('/student');
      else if (data.role === 'cashier') navigate('/cashier');
      else if (data.role === 'admin') navigate('/admin');
    } catch (err) {
      alert('Login failed');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="max-w-md mx-auto mt-20 space-y-4">
      <h1 className="text-2xl font-bold ">Login</h1>
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
      <button className="w-full bg-blue-500 text-white p-2 rounded">Login</button>

      {/* Add a link to the register page */}
      <div className="mt-4 text-center">
        <p>
          Don't have an account?{' '}
          <Link to="/register" className="text-blue-500 hover:underline">
            Sign up here
          </Link>
        </p>
      </div>
    </form>
  );
}
