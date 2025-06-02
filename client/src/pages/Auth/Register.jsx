import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import axios from 'axios';
import logo from '../../assets/2gonzlogo.png';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

export default function Register() {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [idNumber, setIdNumber] = useState('');
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [showTerms, setShowTerms] = useState(false);
  const [showPrivacy, setShowPrivacy] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showUserTypeModal, setShowUserTypeModal] = useState(true);
  const [userType, setUserType] = useState('');
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleIdNumberChange = (e) => {
    const value = e.target.value;
    // Only allow numbers
    if (value === '' || /^\d+$/.test(value)) {
      setIdNumber(value);
      setErrorMessage('');
    }
  };

  const validateForm = () => {
    if (!firstName.trim()) {
      setErrorMessage('Please enter your First Name');
      return false;
    }
    if (!lastName.trim()) {
      setErrorMessage('Please enter your Last Name');
      return false;
    }
    if (!idNumber.trim()) {
      setErrorMessage(`Please enter your ${userType === 'guest' ? 'Phone Number' : 'ID Number'}`);
      return false;
    }
    if (!password) {
      setErrorMessage('Please enter a password');
      return false;
    }
    if (password.length < 6) {
      setErrorMessage('Password must be at least 6 characters long');
      return false;
    }
    if (!confirmPassword) {
      setErrorMessage('Please confirm your password');
      return false;
    }
    if (password !== confirmPassword) {
      setErrorMessage('Passwords do not match');
      return false;
    }
    if (!termsAccepted) {
      setErrorMessage('Please accept the terms and conditions to continue');
      return false;
    }
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');

    if (!validateForm()) {
      return;
    }

    try {
      const userData = {
        firstName,
        lastName,
        password,
        idNumber,
        termsAccepted: true,
        role: userType === 'guest' ? 'guest' : 'student'
      };
      
      console.log('Sending registration data:', userData);
      
      const { data } = await axios.post(`${API_BASE_URL}/api/auth/register`, userData);
      console.log('Registration response:', data);

      // Verify that firstName and lastName are in the response
      if (!data.firstName || !data.lastName) {
        console.error('Missing firstName or lastName in response:', data);
        setErrorMessage('Registration failed: Missing user data');
        return;
      }

      login(data);
      // Navigate based on role
      if (data.role === 'cashier') {
        navigate('/cashier');
      } else if (data.role === 'concierge') {
        navigate('/concierge');
      } else {
        // All other roles (student, guest) go to student page
        navigate('/student');
      }
    } catch (err) {
      console.error('Registration error:', err.response?.data);
      setErrorMessage(err.response?.data?.message || 'Registration failed');
    }
  };

  const UserTypeModal = () => {
    if (!showUserTypeModal) return null;

    return (
      <div className="fixed inset-0 backdrop-blur-md bg-black/20 flex items-center justify-center p-4 z-50">
        <div className="max-w-md w-full bg-gradient-to-br from-[#1e293b] to-[#334155] rounded-3xl shadow-xl p-8 space-y-6 border border-gray-700/50">
          <div className="flex flex-col items-center">
            <img src={logo} alt="2Gonz Logo" className="w-32 h-32 object-contain mb-4" />

            <p className="text-gray-400 mt-2 text-lg">Choose to register</p>
          </div>
          <div className="space-y-4">
            <button
              onClick={() => {
                setUserType('student');
                setShowUserTypeModal(false);
              }}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-xl transition shadow-md"
            >
              Ateneans
            </button>
            <button
              onClick={() => {
                setUserType('guest');
                setShowUserTypeModal(false);
              }}
              className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-3 rounded-xl transition shadow-md"
            >
              Guest
            </button>
          </div>
        </div>
      </div>
    );
  };

  const Modal = ({ isOpen, onClose, title, children }) => {
    if (!isOpen) return null;

    return (
      <div className="fixed inset-0 backdrop-blur-sm bg-white/30 flex items-center justify-center p-4 z-50">
        <div className="bg-white rounded-xl shadow-xl max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col">
          <div className="flex justify-between items-center p-6 border-b">
            <h2 className="text-2xl font-bold text-gray-900">{title}</h2>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <div className="p-6 overflow-y-auto">
            <div className="prose prose-green max-w-none">
              {children}
            </div>
          </div>
          <div className="p-6 border-t bg-gray-50">
            <button
              onClick={onClose}
              className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-2 rounded-xl transition"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#0f172a] to-[#1e293b] p-4">
      <UserTypeModal />
      {!showUserTypeModal && (
        <div className="max-w-md w-full bg-gradient-to-br from-[#1e293b] to-[#334155] rounded-3xl shadow-xl p-8 space-y-6 border border-gray-700/50">
          <div className="flex flex-col items-center">
            <img src={logo} alt="2Gonz Logo" className="w-32 h-32 object-contain mb-4" />
            <h1 className="text-3xl font-bold text-center text-white">Create {userType === 'guest' ? 'Guest' : 'Student'} Account</h1>
          </div>
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block mb-1 text-sm font-medium text-gray-200">First Name</label>
              <input
                className="w-full px-4 py-2 bg-gray-800/50 border border-gray-700 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none transition text-white placeholder-gray-400"
                placeholder="Enter your first name"
                value={firstName}
                onChange={(e) => {
                  setFirstName(e.target.value);
                  setErrorMessage('');
                }}
                required
              />
            </div>
            <div>
              <label className="block mb-1 text-sm font-medium text-gray-200">Last Name</label>
              <input
                className="w-full px-4 py-2 bg-gray-800/50 border border-gray-700 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none transition text-white placeholder-gray-400"
                placeholder="Enter your last name"
                value={lastName}
                onChange={(e) => {
                  setLastName(e.target.value);
                  setErrorMessage('');
                }}
                required
              />
            </div>
            <div>
              <label className="block mb-1 text-sm font-medium text-gray-200">
                {userType === 'guest' ? 'Phone Number' : 'ID Number'}
              </label>
              <input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                className="w-full px-4 py-2 bg-gray-800/50 border border-gray-700 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none transition text-white placeholder-gray-400"
                placeholder={`Enter your ${userType === 'guest' ? 'Phone Number' : 'ID Number'}`}
                value={idNumber}
                onChange={handleIdNumberChange}
                required
                minLength={4}
              />
            </div>
            <div>
              <label className="block mb-1 text-sm font-medium text-gray-200">Password</label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  className="w-full px-4 py-2 bg-gray-800/50 border border-gray-700 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none transition text-white placeholder-gray-400"
                  placeholder="Enter password"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    setErrorMessage('');
                  }}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-200"
                >
                  {showPassword ? (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                      <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                      <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
                    </svg>
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M3.707 2.293a1 1 0 00-1.414 1.414l14 14a1 1 0 001.414-1.414l-1.473-1.473A10.014 10.014 0 0019.542 10C18.268 5.943 14.478 3 10 3a9.958 9.958 0 00-4.512 1.074l-1.78-1.781zm4.261 4.26l1.514 1.515a2.003 2.003 0 012.45 2.45l1.514 1.514a4 4 0 00-5.478-5.478z" clipRule="evenodd" />
                      <path d="M12.454 16.697L9.75 13.992a4 4 0 01-3.742-3.741L2.335 6.578A9.98 9.98 0 00.458 10c1.274 4.057 5.065 7 9.542 7 .847 0 1.669-.105 2.454-.303z" />
                    </svg>
                  )}
                </button>
              </div>
            </div>
            <div>
              <label className="block mb-1 text-sm font-medium text-gray-200">Confirm Password</label>
              <div className="relative">
                <input
                  type={showConfirmPassword ? "text" : "password"}
                  className="w-full px-4 py-2 bg-gray-800/50 border border-gray-700 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none transition text-white placeholder-gray-400"
                  placeholder="Confirm password"
                  value={confirmPassword}
                  onChange={(e) => {
                    setConfirmPassword(e.target.value);
                    setErrorMessage('');
                  }}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-200"
                >
                  {showConfirmPassword ? (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                      <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                      <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
                    </svg>
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M3.707 2.293a1 1 0 00-1.414 1.414l14 14a1 1 0 001.414-1.414l-1.473-1.473A10.014 10.014 0 0019.542 10C18.268 5.943 14.478 3 10 3a9.958 9.958 0 00-4.512 1.074l-1.78-1.781zm4.261 4.26l1.514 1.515a2.003 2.003 0 012.45 2.45l1.514 1.514a4 4 0 00-5.478-5.478z" clipRule="evenodd" />
                      <path d="M12.454 16.697L9.75 13.992a4 4 0 01-3.742-3.741L2.335 6.578A9.98 9.98 0 00.458 10c1.274 4.057 5.065 7 9.542 7 .847 0 1.669-.105 2.454-.303z" />
                    </svg>
                  )}
                </button>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="terms"
                checked={termsAccepted}
                onChange={(e) => setTermsAccepted(e.target.checked)}
                className="w-4 h-4 text-blue-500 border-gray-600 rounded focus:ring-blue-500 bg-gray-700"
              />
              <label htmlFor="terms" className="text-sm text-gray-300">
                I accept the{' '}
                <button
                  type="button"
                  onClick={() => setShowTerms(true)}
                  className="text-blue-400 hover:text-blue-300 hover:underline"
                >
                  Terms and Conditions
                </button>{' '}
                and{' '}
                <button
                  type="button"
                  onClick={() => setShowPrivacy(true)}
                  className="text-blue-400 hover:text-blue-300 hover:underline"
                >
                  Privacy Policy
                </button>
              </label>
            </div>
            {errorMessage && (
              <div className="p-3 bg-red-900/50 border-l-4 border-red-500 rounded-lg flex items-start space-x-2">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-red-500 mt-0.5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                <span className="text-red-200 font-medium">{errorMessage}</span>
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
                  Registering...
                </div>
              ) : (
                'Register'
              )}
            </button>
          </form>

          <div className="text-center text-sm text-gray-400 mt-4">
            Already have an account?{' '}
            <Link to="/login" className="text-blue-400 hover:text-blue-300 hover:underline font-semibold">
              Login
            </Link>
          </div>
        </div>
      )}

      <Modal isOpen={showTerms} onClose={() => setShowTerms(false)} title="Terms and Conditions">
        <h2>1. Acceptance of Terms</h2>
        <p>
          By accessing and using the Webiste, you agree to be bound by these Terms and Conditions.
          If you do not agree to these terms, please do not use our service.
        </p>

        <h2>2. User Account</h2>
        <p>
          You are responsible for maintaining the confidentiality of your account credentials and for all activities
          that occur under your account. You agree to notify us immediately of any unauthorized use of your account.
        </p>

        <h2>3. Points System</h2>
        <p>
          Points earned through the loyalty program are subject to the following conditions:
        </p>
        <ul>
          <li>Points are non-transferable and cannot be exchanged for cash</li>
          <li>Points may expire according to the program rules</li>
          <li>We reserve the right to modify the points system at any time</li>
        </ul>

        <h2>4. Code Usage</h2>
        <p>
          Reward codes are:
        </p>
        <ul>
          <li>Single-use only</li>
          <li>Non-transferable</li>
          <li>Subject to verification</li>
          <li>Must be used within the specified validity period</li>
        </ul>

        <h2>5. Prohibited Activities</h2>
        <p>
          Users are prohibited from:
        </p>
        <ul>
          <li>Sharing account credentials</li>
          <li>Attempting to manipulate the points system</li>
          <li>Using automated systems to access the service</li>
          <li>Engaging in any fraudulent activities</li>
        </ul>

        <h2>6. Termination</h2>
        <p>
          We reserve the right to terminate or suspend your account if you violate these terms or engage in
          fraudulent activities.
        </p>

        <h2>7. Changes to Terms</h2>
        <p>
          We may modify these terms at any time. Continued use of the service after changes constitutes
          acceptance of the modified terms.
        </p>

        <h2>8. Contact</h2>
        <p>
          For questions about these terms, please contact our support team.
        </p>
      </Modal>

      <Modal isOpen={showPrivacy} onClose={() => setShowPrivacy(false)} title="Privacy Policy">
        <h2>1. Information We Collect</h2>
        <p>
          We collect the following types of information:
        </p>
        <ul>
          <li>Account information (First Name, Last Name, ID Number/Phone Number, password)</li>
          <li>Points and reward history</li>
          <li>Usage data and interactions with the system</li>
        </ul>

        <h2>2. How We Use Your Information</h2>
        <p>
          We use your information to:
        </p>
        <ul>
          <li>Provide and maintain the loyalty reward system</li>
          <li>Process your points and rewards</li>
          <li>Send you important updates about the system</li>
          <li>Improve our services</li>
          <li>Personalize your experience using your name</li>
        </ul>

        <h2>3. Data Security</h2>
        <p>
          We implement appropriate security measures to protect your personal information:
        </p>
        <ul>
          <li>Encryption of sensitive data</li>
          <li>Secure password storage</li>
          <li>Regular security assessments</li>
          <li>Access controls and authentication</li>
        </ul>

        <h2>4. Data Sharing</h2>
        <p>
          We do not sell or share your personal information with third parties except:
        </p>
        <ul>
          <li>When required by law</li>
          <li>To protect our rights and safety</li>
          <li>With your explicit consent</li>
        </ul>

        <h2>5. Your Rights</h2>
        <p>
          You have the right to:
        </p>
        <ul>
          <li>Access your personal information</li>
          <li>Correct inaccurate data</li>
          <li>Request deletion of your account</li>
          <li>Opt-out of communications</li>
        </ul>

        <h2>6. Cookies and Tracking</h2>
        <p>
          We use cookies and similar technologies to:
        </p>
        <ul>
          <li>Maintain your session</li>
          <li>Remember your preferences</li>
          <li>Analyze system usage</li>
        </ul>

        <h2>7. Changes to Privacy Policy</h2>
        <p>
          We may update this privacy policy from time to time. We will notify you of any changes by posting the
          new policy on this page.
        </p>

        <h2>8. Contact Us</h2>
        <p>
          If you have questions about this privacy policy, please contact our support team.
        </p>
      </Modal>
    </div>
  );
}
