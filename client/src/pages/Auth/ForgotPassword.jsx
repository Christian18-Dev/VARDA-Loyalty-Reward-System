import { useState } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import logo from '../../assets/varda.svg';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage('');
    setIsLoading(true);

    if (!email.trim()) {
      setMessage('Please enter your email address');
      setIsSuccess(false);
      setIsLoading(false);
      return;
    }

    try {
      const { data } = await axios.post(`${API_BASE_URL}/api/auth/forgot-password`, {
        email: email.trim()
      });

      setMessage(data.message);
      setIsSuccess(true);
      setEmail('');
    } catch (err) {
      setMessage(err.response?.data?.message || 'An error occurred. Please try again.');
      setIsSuccess(false);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#0f172a] to-[#1e293b] p-4">
      <div className="max-w-md w-full bg-gradient-to-br from-[#1e293b] to-[#334155] rounded-3xl shadow-xl p-8 space-y-6 border border-gray-700/50">
        <div className="flex flex-col items-center">
        <img src={logo} alt="Varda Food Group Logo" className="w-32 h-32 rounded-full bg-gray-200 object-contain p-2"/>
          <p className="text-gray-400 text-center pt-4">
            Enter your email address and we'll send you a link to reset your password.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block mb-1 text-sm font-medium text-gray-200">Email Address</label>
            <input
              type="email"
              className="w-full px-4 py-2 bg-gray-800/50 border border-gray-700 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none transition text-white placeholder-gray-400"
              placeholder="Enter your email address"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                setMessage('');
              }}
              required
            />
          </div>

          {message && (
            <div className={`p-3 border-l-4 rounded-lg flex items-start space-x-2 ${
              isSuccess 
                ? 'bg-green-900/50 border-green-500' 
                : 'bg-red-900/50 border-red-500'
            }`}>
              <svg 
                xmlns="http://www.w3.org/2000/svg" 
                className={`h-5 w-5 mt-0.5 ${
                  isSuccess ? 'text-green-500' : 'text-red-500'
                }`} 
                viewBox="0 0 20 20" 
                fill="currentColor"
              >
                {isSuccess ? (
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                ) : (
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                )}
              </svg>
              <span className={`font-medium ${
                isSuccess ? 'text-green-200' : 'text-red-200'
              }`}>
                {message}
              </span>
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 rounded-xl transition shadow-md disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <div className="flex items-center justify-center">
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                Sending...
              </div>
            ) : (
              'Send Reset Link'
            )}
          </button>
        </form>

        <div className="flex flex-col items-center space-y-2">
          <div className="text-center text-sm text-gray-400">
            Remember your password?{' '}
            <Link to="/login" className="text-blue-400 hover:text-blue-300 hover:underline font-semibold">
              Back to Login
            </Link>
          </div>
          <div className="text-center text-sm text-gray-400">
            Need help?{' '}
            <a
              href="https://web.facebook.com/people/VARDA-I-T-Support/61575392403660/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-400 hover:text-blue-300 hover:underline font-semibold"
            >
              Contact Support
            </a>
          </div>
        </div>
      </div>
    </div>
  );
} 