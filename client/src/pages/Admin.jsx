import { useEffect, useState, useRef } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { 
  ChartBarIcon, 
  UserGroupIcon, 
  GiftIcon, 
  LogoutIcon,
  ExclamationIcon,
  ArrowLeftIcon,
  ArrowRightIcon,
  BellIcon,
  CurrencyDollarIcon,
  DocumentReportIcon,
  ChatAltIcon
} from '@heroicons/react/outline';
import { motion, AnimatePresence } from 'framer-motion';
import ExcelJS from 'exceljs';
import { PDFDownloadLink, Document, Page, Text, View, StyleSheet, Image } from '@react-pdf/renderer';
import { pdf } from '@react-pdf/renderer';
import logo from '../assets/2gonzlogo.png';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';

// Register ChartJS components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

// More robust Buffer polyfill
if (typeof window !== 'undefined' && !window.Buffer) {
  window.Buffer = class Buffer extends Uint8Array {
    constructor(input, encodingOrOffset, length) {
      if (typeof input === 'string') {
        const encoder = new TextEncoder();
        const bytes = encoder.encode(input);
        super(bytes);
      } else if (input instanceof ArrayBuffer || ArrayBuffer.isView(input)) {
        super(input);
      } else if (Array.isArray(input)) {
        super(input);
      } else {
        super(input || 0);
      }
    }

    static from(input, encodingOrOffset, length) {
      return new Buffer(input, encodingOrOffset, length);
    }

    static isBuffer(obj) {
      return obj instanceof Buffer;
    }

    toString(encoding = 'utf8') {
      const decoder = new TextDecoder(encoding);
      return decoder.decode(this);
    }
  };
}

export default function AdminPage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState({});
  const [rewards, setRewards] = useState({ name: '', cost: '', description: '' });
  const [users, setUsers] = useState([]);
  const [claimedRewards, setClaimedRewards] = useState([]);
  const [availableRewards, setAvailableRewards] = useState([]);
  const [activeTab, setActiveTab] = useState('overview');
  const [isLoading, setIsLoading] = useState(true);
  const [isPageLoading, setIsPageLoading] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [rewardToDelete, setRewardToDelete] = useState(null);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [modalMessage, setModalMessage] = useState('');
  const [totalBorrowedItems, setTotalBorrowedItems] = useState(0);
  
  // Add new state for pagination and search
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalUsers, setTotalUsers] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  // Add rewards pagination state
  const [rewardsCurrentPage, setRewardsCurrentPage] = useState(1);
  const [rewardsTotalPages, setRewardsTotalPages] = useState(1);
  const [rewardsPerPage] = useState(5); // Number of rewards per page

  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showAdminCodeModal, setShowAdminCodeModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [adminCode, setAdminCode] = useState('');
  const [passwordError, setPasswordError] = useState('');

  // Add new state for borrow and return
  const [borrowedItems, setBorrowedItems] = useState([]);
  const [borrowedSearchTerm, setBorrowedSearchTerm] = useState('');
  const [currentBorrowedPage, setCurrentBorrowedPage] = useState(1);
  const [returnedItems, setReturnedItems] = useState([]);
  const [returnedSearchTerm, setReturnedSearchTerm] = useState('');
  const [currentReturnedPage, setCurrentReturnedPage] = useState(1);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const itemsPerPage = 10;

  // Add new state for search input
  const [searchInput, setSearchInput] = useState('');

  // Add new state for filtered users
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [showDropdown, setShowDropdown] = useState(false);

  // Add new state for all users
  const [allUsers, setAllUsers] = useState([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);
  const [userError, setUserError] = useState('');

  // Add new state for overview polling
  const [isOverviewPolling, setIsOverviewPolling] = useState(false);

  // Add new state for cleanup
  const [isCleaningUp, setIsCleaningUp] = useState(false);
  const [cleanupMessage, setCleanupMessage] = useState('');

  // Add new state for points usage
  const [pointsUsage, setPointsUsage] = useState([]);
  const [pointsUsagePage, setPointsUsagePage] = useState(1);
  const [pointsUsageTotalPages, setPointsUsageTotalPages] = useState(1);
  const [pointsUsageSearchTerm, setPointsUsageSearchTerm] = useState('');
  const [isPointsUsageLoading, setIsPointsUsageLoading] = useState(false);

  // Add new state for status modal
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [statusModalData, setStatusModalData] = useState({ type: '', message: '' });

  const [logoDataUrl, setLogoDataUrl] = useState('');
  const [logoError, setLogoError] = useState(null);

  const [feedbackStats, setFeedbackStats] = useState({
    taste: 0,
    variety: 0,
    value: 0,
    dietary: 0,
    portion: 0,
    speed: 0,
    cleanliness: 0,
    service: 0,
    totalFeedbacks: 0
  });

  const [borrowedItemsData, setBorrowedItemsData] = useState([]);
  const [timeRange, setTimeRange] = useState('day'); // 'day' or 'month'

  const [analyticsStartDate, setAnalyticsStartDate] = useState('');
  const [analyticsEndDate, setAnalyticsEndDate] = useState('');

  const token = user.token;
  const baseUrl = import.meta.env.VITE_API_BASE_URL;

  // Add StatusModal component
  const StatusModal = ({ isOpen, onClose, type, message }) => {
    if (!isOpen) return null;

    return (
      <div className="fixed inset-0 z-[100] overflow-y-auto">
        <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
          <div
            className="fixed inset-0 backdrop-blur-sm bg-white/30"
            aria-hidden="true"
            onClick={onClose}
          />
          <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
          <div
            className="relative inline-block align-bottom bg-white rounded-2xl text-left overflow-hidden shadow-xl transform sm:my-8 sm:align-middle sm:max-w-lg sm:w-full"
            role="dialog"
            aria-modal="true"
            aria-labelledby="modal-headline"
          >
            <div className="bg-white px-6 pt-6 pb-4 sm:p-8">
              <div className="sm:flex sm:items-start">
                <div 
                  className={`mx-auto flex-shrink-0 flex items-center justify-center h-16 w-16 rounded-full sm:mx-0 sm:h-14 sm:w-14 ${
                    type === 'success' ? 'bg-green-100' : 'bg-red-100'
                  }`}
                >
                  {type === 'success' ? (
                    <svg className="h-8 w-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                    </svg>
                  ) : (
                    <ExclamationIcon className="h-8 w-8 text-red-600" aria-hidden="true" />
                  )}
                </div>
                <div className="mt-4 text-center sm:mt-0 sm:ml-6 sm:text-left flex-1">
                  <h3 className={`text-2xl font-bold ${type === 'success' ? 'text-green-700' : 'text-red-700'}`} id="modal-headline">
                    {type === 'success' ? 'Success!' : 'Error'}
                  </h3>
                  <div className="mt-4">
                    <p className="text-lg text-gray-700 whitespace-pre-line font-medium leading-relaxed">
                      {message}
                    </p>
                  </div>
                </div>
              </div>
            </div>
            <div className="bg-gray-50 px-6 py-4 sm:px-8 sm:flex sm:flex-row-reverse">
              <button
                onClick={onClose}
                className={`w-full inline-flex justify-center rounded-xl border border-transparent shadow-sm px-6 py-3 text-lg font-semibold text-white focus:outline-none focus:ring-2 focus:ring-offset-2 transition-colors sm:ml-3 sm:w-auto ${
                  type === 'success' 
                    ? 'bg-green-600 hover:bg-green-700 focus:ring-green-500' 
                    : 'bg-red-600 hover:bg-red-700 focus:ring-red-500'
                }`}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Add showStatusMessage function
  const showStatusMessage = (type, message) => {
    setStatusModalData({ type, message });
    setShowStatusModal(true);
  };

  // Update fetchData to handle pagination and search
  const fetchData = async (page = 1, search = '') => {
    try {
      // Only show loading state for initial load or user search, not during polling
      if (page === 1 && !search && !isOverviewPolling) {
        setIsLoading(true);
      } else if (search) {
        setIsPageLoading(true);
      }

      const [statsRes, usersRes, claimedRes, rewardsRes, borrowedRes] = await Promise.all([
        axios.get(`${baseUrl}/api/admin/stats`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        axios.get(`${baseUrl}/api/admin/users?page=${page}&limit=10&search=${search}`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        axios.get(`${baseUrl}/api/admin/claimed-rewards`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        axios.get(`${baseUrl}/api/rewards`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        axios.get(`${baseUrl}/api/admin/borrowed-items`, {
          headers: { Authorization: `Bearer ${token}` },
        })
      ]);

      setStats(statsRes.data);
      setUsers(usersRes.data.users);
      setCurrentPage(usersRes.data.currentPage);
      setTotalPages(usersRes.data.totalPages);
      setTotalUsers(usersRes.data.totalUsers);
      setClaimedRewards(claimedRes.data);
      setAvailableRewards(rewardsRes.data);
      setTotalBorrowedItems(borrowedRes.data.data.length);
      // Calculate total pages for rewards
      setRewardsTotalPages(Math.ceil(rewardsRes.data.length / rewardsPerPage));
    } catch (error) {
      console.error("Error fetching data:", error);
      setError("Failed to fetch data. Please try again.");
    } finally {
      // Only clear loading states if we're not in polling mode
      if (!isOverviewPolling) {
        setIsLoading(false);
      }
      setIsPageLoading(false);
    }
  };

  // Add polling effect for overview tab
  useEffect(() => {
    let pollInterval;
    
    if (activeTab === 'overview') {
      // Set polling state to true before initial fetch
      setIsOverviewPolling(true);
      // Initial fetch
      fetchData();
      // Set up polling every 10 seconds
      pollInterval = setInterval(() => {
        fetchData();
      }, 10000); // 10 seconds
    }

    // Cleanup interval on unmount or tab change
    return () => {
      if (pollInterval) {
        clearInterval(pollInterval);
      }
      setIsOverviewPolling(false);
    };
  }, [activeTab, token]);

  // Add search handler with debounce
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchTerm) {
        setIsSearching(true);
        fetchData(1, searchTerm);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Add page change handler
  const handlePageChange = (newPage) => {
    setCurrentPage(newPage);
    fetchData(newPage, searchTerm);
  };

  // Add search input handler
  const handleSearch = (e) => {
    setSearchTerm(e.target.value);
    setCurrentPage(1);
  };

  const handleCreateReward = async () => {
    if (!rewards.name.trim() || !rewards.cost || !rewards.description.trim()) {
      setModalMessage('Please fill all fields including the description');
      setShowErrorModal(true);
      return;
    }

    try {
      await axios.post(
        `${baseUrl}/api/admin/reward`,
        rewards,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setRewards({ name: '', cost: '', description: '' });
      // Refresh rewards list
      const rewardsRes = await axios.get(`${baseUrl}/api/rewards`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setAvailableRewards(rewardsRes.data);
      setRewardsTotalPages(Math.ceil(rewardsRes.data.length / rewardsPerPage));
      setModalMessage('Reward created successfully!');
      setShowSuccessModal(true);
    } catch (error) {
      console.error('Error creating reward:', error);
      setModalMessage(error.response?.data?.message || 'Error creating reward');
      setShowErrorModal(true);
    }
  };

  const handleLogoutClick = () => {
    setShowLogoutModal(true);
  };

  const handleConfirmLogout = () => {
    logout();
    setShowLogoutModal(false);
    navigate('/login');
  };

  const handleCancelLogout = () => {
    setShowLogoutModal(false);
  };

  const closeMobileMenu = () => {
    setMobileMenuOpen(false);
  };

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    closeMobileMenu();
  };

  const handleRoleChange = (userId, newRole) => {
    // Prevent role change for admin users
    const user = users.find(u => u._id === userId);
    if (user && user.role === 'admin') {
      return;
    }
    
    // Update the users state with the new role
    setUsers(users.map(u => 
      u._id === userId ? { ...u, role: newRole } : u
    ));
  };

  const handleSaveRole = async (userId) => {
    // Prevent role change for admin users
    const user = users.find(u => u._id === userId);
    if (user && user.role === 'admin') {
      return;
    }

    try {
      setError('');
      setSuccess('');
      
      // Get the updated role from the users state
      const updatedUser = users.find(u => u._id === userId);
      if (!updatedUser) return;

      // Make API call to update the role
      const response = await axios.put(
        `${baseUrl}/api/admin/users/${userId}/role`,
        { role: updatedUser.role },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      // Show success message
      setSuccess('Role updated successfully');
      
      // Refresh the users list after 1 second
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    } catch (error) {
      console.error('Error updating role:', error);
      setError(error.response?.data?.message || 'Error updating role');
      
      // Revert the role change in the UI
      const originalUser = users.find(u => u._id === userId);
      if (originalUser) {
        setUsers(users.map(u => 
          u._id === userId ? { ...u, role: originalUser.role } : u
        ));
      }
    }
  };

  const handleDeleteClick = (reward) => {
    setRewardToDelete(reward);
    setShowDeleteModal(true);
  };

  const handleConfirmDelete = async () => {
    try {
      await axios.delete(
        `${baseUrl}/api/rewards/${rewardToDelete._id}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      // Refresh rewards list
      const rewardsRes = await axios.get(`${baseUrl}/api/rewards`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setAvailableRewards(rewardsRes.data);
      setRewardsTotalPages(Math.ceil(rewardsRes.data.length / rewardsPerPage));
      setShowDeleteModal(false);
      setRewardToDelete(null);
      setModalMessage('Reward deleted successfully!');
      setShowSuccessModal(true);
    } catch (error) {
      console.error('Error deleting reward:', error);
      setModalMessage(error.response?.data?.message || 'Error deleting reward. Please try again.');
      setShowErrorModal(true);
    }
  };

  const handleCancelDelete = () => {
    setShowDeleteModal(false);
    setRewardToDelete(null);
  };

  // Add rewards pagination handler
  const handleRewardsPageChange = (newPage) => {
    setRewardsCurrentPage(newPage);
  };

  // Calculate current rewards to display
  const getCurrentRewards = () => {
    const startIndex = (rewardsCurrentPage - 1) * rewardsPerPage;
    const endIndex = startIndex + rewardsPerPage;
    // Sort rewards by creation date (newest first) using _id which contains timestamp
    const sortedRewards = [...availableRewards].sort((a, b) => b._id.localeCompare(a._id));
    return sortedRewards.slice(startIndex, endIndex);
  };

  const handleCloseSuccessModal = () => {
    setShowSuccessModal(false);
    setModalMessage('');
  };

  const handleCloseErrorModal = () => {
    setShowErrorModal(false);
    setModalMessage('');
  };

  const handlePasswordChange = async () => {
    if (!newPassword || newPassword.length < 6) {
      setPasswordError('Password must be at least 6 characters long');
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError('Passwords do not match');
      return;
    }

    // Show admin code modal instead of direct verification
    setShowPasswordModal(false);
    setShowAdminCodeModal(true);
  };

  const handleAdminCodeVerification = async () => {
    if (!adminCode || adminCode !== '696969') {
      setPasswordError('Invalid admin code');
      return;
    }

    try {
      await axios.put(
        `${baseUrl}/api/admin/users/${selectedUser._id}/password`,
        { password: newPassword },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setShowAdminCodeModal(false);
      setNewPassword('');
      setConfirmPassword('');
      setAdminCode('');
      setPasswordError('');
      setModalMessage('Password updated successfully!');
      setShowSuccessModal(true);
    } catch (error) {
      console.error('Error updating password:', error);
      setPasswordError(error.response?.data?.message || 'Error updating password');
    }
  };

  const handleOpenPasswordModal = (user) => {
    setSelectedUser(user);
    setNewPassword('');
    setConfirmPassword('');
    setAdminCode('');
    setPasswordError('');
    setShowPasswordModal(true);
  };

  const handleClosePasswordModal = () => {
    setShowPasswordModal(false);
    setSelectedUser(null);
    setNewPassword('');
    setConfirmPassword('');
    setAdminCode('');
    setPasswordError('');
  };

  const handleCloseAdminCodeModal = () => {
    setShowAdminCodeModal(false);
    setAdminCode('');
    setPasswordError('');
  };

  // Add new functions for borrow and return
  const fetchBorrowedItems = async () => {
    try {
      const queryParams = new URLSearchParams();
      if (startDate) queryParams.append('startDate', startDate);
      if (endDate) queryParams.append('endDate', endDate);
      
      const res = await axios.get(`${baseUrl}/api/admin/borrowed-items?${queryParams}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const items = res.data.data;
      const sortedBorrowed = items
        .filter(item => item.status === 'borrowed')
        .sort((a, b) => new Date(b.borrowTime) - new Date(a.borrowTime));
      setBorrowedItems(sortedBorrowed);
    } catch (err) {
      setError('Failed to fetch borrowed items');
    }
  };

  // Polling for borrowed tab
  useEffect(() => {
    let pollInterval;
    if (activeTab === 'borrowed') {
      fetchBorrowedItems();
      pollInterval = setInterval(fetchBorrowedItems, 3000);
    }
    return () => {
      if (pollInterval) clearInterval(pollInterval);
    };
  }, [activeTab, token]);

  // Filter and paginate borrowed items
  const filteredBorrowedItems = borrowedItems.filter(item =>
    item?.studentIdNumber?.toLowerCase().includes(borrowedSearchTerm.toLowerCase())
  );
  const totalBorrowedPages = Math.ceil(filteredBorrowedItems.length / itemsPerPage);
  const paginatedBorrowedItems = filteredBorrowedItems.slice(
    (currentBorrowedPage - 1) * itemsPerPage,
    currentBorrowedPage * itemsPerPage
  );
  const handleBorrowedPageChange = (page) => setCurrentBorrowedPage(page);
  const handleBorrowedSearch = (e) => {
    setBorrowedSearchTerm(e.target.value);
    setCurrentBorrowedPage(1);
  };

  // Fetch returned items with date filter
  const fetchReturnedItems = async () => {
    try {
      const queryParams = new URLSearchParams();
      if (startDate) queryParams.append('startDate', startDate);
      if (endDate) queryParams.append('endDate', endDate);
      
      const res = await axios.get(`${baseUrl}/api/admin/returned-history?${queryParams}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const items = res.data.data;
      const sortedReturned = items.sort((a, b) => new Date(b.returnTime) - new Date(a.returnTime));
      setReturnedItems(sortedReturned);
    } catch (err) {
      setError('Failed to fetch returned items');
    }
  };

  // Polling for returned tab
  useEffect(() => {
    let pollInterval;
    if (activeTab === 'returned') {
      fetchReturnedItems();
      pollInterval = setInterval(fetchReturnedItems, 3000);
    }
    return () => {
      if (pollInterval) clearInterval(pollInterval);
    };
  }, [activeTab, token]);

  // Filter and paginate returned items
  const filteredReturnedItems = returnedItems.filter(item =>
    item?.studentIdNumber?.toLowerCase().includes(returnedSearchTerm.toLowerCase())
  );
  const totalReturnedPages = Math.ceil(filteredReturnedItems.length / itemsPerPage);
  const paginatedReturnedItems = filteredReturnedItems.slice(
    (currentReturnedPage - 1) * itemsPerPage,
    currentReturnedPage * itemsPerPage
  );
  const handleReturnedPageChange = (page) => setCurrentReturnedPage(page);
  const handleReturnedSearch = (e) => {
    setReturnedSearchTerm(e.target.value);
    setCurrentReturnedPage(1);
  };

  // Add function to fetch all users with proper error handling
  const fetchAllUsers = async () => {
    try {
      setIsLoadingUsers(true);
      setUserError('');
      const response = await axios.get(`${baseUrl}/api/admin/users?limit=1000`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setAllUsers(response.data.users);
    } catch (error) {
      console.error('Error fetching all users:', error);
      setUserError('Failed to fetch users. Please try again.');
    } finally {
      setIsLoadingUsers(false);
    }
  };

  // Add useEffect with cleanup
  useEffect(() => {
    let isMounted = true;

    const loadUsers = async () => {
      if (isMounted) {
        await fetchAllUsers();
      }
    };

    loadUsers();

    return () => {
      isMounted = false;
    };
  }, [token]);

  // Add click outside handler to close dropdown
  useEffect(() => {
    const handleClickOutside = (event) => {
      const dropdown = document.getElementById('user-search-dropdown');
      const input = document.getElementById('user-search-input');
      if (dropdown && input && !dropdown.contains(event.target) && !input.contains(event.target)) {
        setShowDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Add cleanup function
  const handleCleanupBorrows = async () => {
    if (!window.confirm('Are you sure you want to delete all borrowed items for student ID 11209976? This action cannot be undone.')) {
      return;
    }

    setIsCleaningUp(true);
    setCleanupMessage('');
    
    try {
      const res = await axios.delete(`${baseUrl}/api/admin/cleanup-borrows`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setCleanupMessage(`Successfully cleaned up ${res.data.deletedCount} borrowed items for student ID 11209976`);
      fetchBorrowedItems(); // Refresh the list
    } catch (error) {
      setCleanupMessage(error.response?.data?.message || 'Error cleaning up borrowed items');
    } finally {
      setIsCleaningUp(false);
    }
  };

  // Add new function to fetch points usage
  const fetchPointsUsage = async (page = 1, search = '') => {
    try {
      setIsPointsUsageLoading(true);
      const response = await axios.get(
        `${baseUrl}/api/admin/points-usage?page=${page}&limit=10&search=${search}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setPointsUsage(response.data.pointsUsage);
      setPointsUsagePage(response.data.currentPage);
      setPointsUsageTotalPages(response.data.totalPages);
    } catch (error) {
      console.error('Error fetching points usage:', error);
      setError('Failed to fetch points usage records');
    } finally {
      setIsPointsUsageLoading(false);
    }
  };

  // Add effect for points usage tab
  useEffect(() => {
    if (activeTab === 'points-usage') {
      fetchPointsUsage(pointsUsagePage, pointsUsageSearchTerm);
    }
  }, [activeTab, pointsUsagePage, pointsUsageSearchTerm]);

  // Add points usage search handler
  const handlePointsUsageSearch = (e) => {
    setPointsUsageSearchTerm(e.target.value);
    setPointsUsagePage(1);
  };

  // Add points usage page change handler
  const handlePointsUsagePageChange = (newPage) => {
    setPointsUsagePage(newPage);
  };

  // PDF styles and component
  const styles = StyleSheet.create({
    page: { padding: 10 },
    header: { 
      marginTop: 5,
      fontSize: 20, 
      marginBottom: 5, 
      textAlign: 'center',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: 2
    },
    logo: {
      width: 150,
      height: 150,
      marginBottom: 0,
      objectFit: 'contain'
    },
    table: { display: 'table', width: 'auto', borderStyle: 'solid', borderWidth: 1, borderColor: '#bfbfbf', marginTop: 5 },
    tableRow: { flexDirection: 'row' },
    tableCol: { borderStyle: 'solid', borderWidth: 1, borderColor: '#bfbfbf' },
    tableCell: { padding: 5, fontSize: 10, fontFamily: 'Helvetica' },
    headerCell: { padding: 5, fontSize: 12, fontWeight: 'bold', backgroundColor: '#f0f0f0', fontFamily: 'Helvetica-Bold' },
    title: {
      fontSize: 18,
      fontFamily: 'Helvetica-Bold',
      color: '#1a1a1a',
      marginTop: 2
    },
    subtitle: {
      fontSize: 12,
      fontFamily: 'Helvetica',
      color: '#666666',
      marginTop: 1
    }
  });

  const PDFDocument = ({ data, type }) => {
    if (!data || data.length === 0) {
      return (
        <Document>
          <Page size="A4" style={styles.page}>
            <Text style={styles.header}>No data available</Text>
          </Page>
        </Document>
      );
    }

    // Format date for display
    const formatDate = (dateString) => {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      });
    };

    // Calculate column widths based on type
    const columnWidths = type === 'borrowed' 
      ? { studentId: '25%', items: '35%', borrowTime: '25%', status: '15%' }
      : { studentId: '20%', items: '30%', borrowTime: '20%', returnTime: '20%', status: '10%' };

    return (
      <Document>
        <Page size="A4" style={styles.page}>
          <View style={styles.header}>
            {logoDataUrl && !logoError && (
              <Image 
                src={logoDataUrl}
                style={styles.logo}
              />
            )}
            <Text style={styles.title}>{type === 'borrowed' ? 'Borrowed Items Report' : 'Returned Items Report'}</Text>
            <Text style={styles.subtitle}>
              {`From ${formatDate(startDate)} to ${formatDate(endDate)}`}
            </Text>
          </View>
          <View style={styles.table}>
            <View style={styles.tableRow}>
              <View style={[styles.tableCol, { width: columnWidths.studentId }]}>
                <Text style={styles.headerCell}>Student ID</Text>
              </View>
              <View style={[styles.tableCol, { width: columnWidths.items }]}>
                <Text style={styles.headerCell}>Items</Text>
              </View>
              <View style={[styles.tableCol, { width: columnWidths.borrowTime }]}>
                <Text style={styles.headerCell}>Borrow Time</Text>
              </View>
              {type === 'returned' && (
                <View style={[styles.tableCol, { width: columnWidths.returnTime }]}>
                  <Text style={styles.headerCell}>Return Time</Text>
                </View>
              )}
              <View style={[styles.tableCol, { width: columnWidths.status }]}>
                <Text style={styles.headerCell}>Status</Text>
              </View>
            </View>
            {data.map((item, index) => (
              <View key={index} style={styles.tableRow}>
                <View style={[styles.tableCol, { width: columnWidths.studentId }]}>
                  <Text style={styles.tableCell}>{item.studentIdNumber}</Text>
                </View>
                <View style={[styles.tableCol, { width: columnWidths.items }]}>
                  <Text style={styles.tableCell}>{item.items.map(i => `${i.name} (x${i.quantity})`).join('; ')}</Text>
                </View>
                <View style={[styles.tableCol, { width: columnWidths.borrowTime }]}>
                  <Text style={styles.tableCell}>{new Date(item.borrowTime).toLocaleString()}</Text>
                </View>
                {type === 'returned' && (
                  <View style={[styles.tableCol, { width: columnWidths.returnTime }]}>
                    <Text style={styles.tableCell}>{new Date(item.returnTime).toLocaleString()}</Text>
                  </View>
                )}
                <View style={[styles.tableCol, { width: columnWidths.status }]}>
                  <Text style={styles.tableCell}>{type === 'borrowed' ? 'borrowed' : 'returned'}</Text>
                </View>
              </View>
            ))}
          </View>
        </Page>
      </Document>
    );
  };

  // Export logic with enhanced error handling
  const handleExport = async (type, format) => {
    if (!validateDates()) {
      showStatusMessage('error', 'Please select both start and end dates');
      return;
    }

    try {
      const queryParams = new URLSearchParams();
      if (startDate) queryParams.append('startDate', startDate);
      if (endDate) queryParams.append('endDate', endDate);
      const endpoint = type === 'borrowed' ? 'export/borrowed-items' : 'export/returned-items';
      
      // Add timeout to the request
      const res = await axios.get(`${baseUrl}/api/admin/${endpoint}?${queryParams}`, {
        headers: { Authorization: `Bearer ${token}` },
        timeout: 30000 // 30 second timeout
      });
      
      const data = res.data.data;

      if (!data || data.length === 0) {
        showStatusMessage('error', 'No data found for the selected date range');
        return;
      }

      if (format === 'excel') {
        try {
          const workbook = new ExcelJS.Workbook();
          const worksheet = workbook.addWorksheet('Items Report');
          
          // Define columns based on type with exact PDF widths
          const columns = type === 'borrowed' 
            ? [
                { header: 'Student ID', key: 'studentId', width: 25 },
                { header: 'Items', key: 'items', width: 35 },
                { header: 'Borrow Time', key: 'borrowTime', width: 25 },
                { header: 'Status', key: 'status', width: 15 }
              ]
            : [
                { header: 'Student ID', key: 'studentId', width: 20 },
                { header: 'Items', key: 'items', width: 30 },
                { header: 'Borrow Time', key: 'borrowTime', width: 20 },
                { header: 'Return Time', key: 'returnTime', width: 20 },
                { header: 'Status', key: 'status', width: 10 }
              ];
          
          worksheet.columns = columns;

          // Style the header row
          const headerRow = worksheet.getRow(1);
          headerRow.height = 25;
          headerRow.eachCell((cell) => {
            cell.font = { 
              bold: true,
              size: 12,
              color: { argb: '1a1a1a' },
              name: 'Helvetica-Bold'
            };
            cell.fill = {
              type: 'pattern',
              pattern: 'solid',
              fgColor: { argb: 'f0f0f0' }
            };
            cell.alignment = {
              vertical: 'middle',
              horizontal: 'center'
            };
            cell.border = {
              top: { style: 'thin', color: { argb: 'bfbfbf' } },
              left: { style: 'thin', color: { argb: 'bfbfbf' } },
              bottom: { style: 'thin', color: { argb: 'bfbfbf' } },
              right: { style: 'thin', color: { argb: 'bfbfbf' } }
            };
          });

          // Add data rows
          data.forEach(item => {
            worksheet.addRow({
              studentId: item.studentIdNumber,
              items: item.items.map(i => `${i.name} (x${i.quantity})`).join('; '),
              borrowTime: new Date(item.borrowTime).toLocaleString(),
              returnTime: type === 'returned' ? new Date(item.returnTime).toLocaleString() : undefined,
              status: item.status
            });
          });

          // Style data rows
          worksheet.eachRow((row, rowNumber) => {
            if (rowNumber > 1) {
              row.eachCell((cell) => {
                cell.font = { 
                  size: 11,
                  name: 'Helvetica'
                };
                cell.alignment = {
                  vertical: 'middle',
                  horizontal: 'left'
                };
                cell.border = {
                  top: { style: 'thin', color: { argb: 'bfbfbf' } },
                  left: { style: 'thin', color: { argb: 'bfbfbf' } },
                  bottom: { style: 'thin', color: { argb: 'bfbfbf' } },
                  right: { style: 'thin', color: { argb: 'bfbfbf' } }
                };
              });
            }
          });

          // Auto-fit columns
          worksheet.columns.forEach(column => {
            const maxLength = column.values.reduce((max, value) => {
              return Math.max(max, value ? value.toString().length : 0);
            }, 0);
            column.width = Math.min(maxLength + 2, 50);
          });

          // Generate and download the Excel file
          const buffer = await workbook.xlsx.writeBuffer();
          const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
          const url = window.URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `${type}-items-report.xlsx`;
          document.body.appendChild(a);
          a.click();
          window.URL.revokeObjectURL(url);
          document.body.removeChild(a);
        } catch (error) {
          console.error('Error generating Excel file:', error);
          showStatusMessage('error', 'Error generating Excel file');
        }
      } else if (format === 'pdf') {
        try {
          if (logoError) {
            console.warn('Logo error:', logoError);
          }

          const doc = (
            <Document>
              <Page size="A4" style={styles.page}>
                <View style={styles.header}>
                  {logoDataUrl && !logoError && (
                    <Image 
                      src={logoDataUrl}
                      style={styles.logo}
                    />
                  )}
                  <Text style={styles.title}>{type === 'borrowed' ? 'Borrowed Items Report' : 'Returned Items Report'}</Text>
                  <Text style={styles.subtitle}>
                    {`From ${new Date(startDate).toLocaleDateString()} to ${new Date(endDate).toLocaleDateString()}`}
                  </Text>
                </View>
                <View style={styles.table}>
                  <View style={styles.tableRow}>
                    <View style={[styles.tableCol, { width: '25%' }]}>
                      <Text style={styles.headerCell}>Student ID</Text>
                    </View>
                    <View style={[styles.tableCol, { width: '35%' }]}>
                      <Text style={styles.headerCell}>Items</Text>
                    </View>
                    <View style={[styles.tableCol, { width: '25%' }]}>
                      <Text style={styles.headerCell}>Borrow Time</Text>
                    </View>
                    {type === 'returned' && (
                      <View style={[styles.tableCol, { width: '25%' }]}>
                        <Text style={styles.headerCell}>Return Time</Text>
                      </View>
                    )}
                    <View style={[styles.tableCol, { width: '15%' }]}>
                      <Text style={styles.headerCell}>Status</Text>
                    </View>
                  </View>
                  {data.map((item, index) => (
                    <View key={index} style={styles.tableRow}>
                      <View style={[styles.tableCol, { width: '25%' }]}>
                        <Text style={styles.tableCell}>{item.studentIdNumber}</Text>
                      </View>
                      <View style={[styles.tableCol, { width: '35%' }]}>
                        <Text style={styles.tableCell}>
                          {item.items.map(i => `${i.name} (x${i.quantity})`).join('; ')}
                        </Text>
                      </View>
                      <View style={[styles.tableCol, { width: '25%' }]}>
                        <Text style={styles.tableCell}>
                          {new Date(item.borrowTime).toLocaleString()}
                        </Text>
                      </View>
                      {type === 'returned' && (
                        <View style={[styles.tableCol, { width: '25%' }]}>
                          <Text style={styles.tableCell}>
                            {new Date(item.returnTime).toLocaleString()}
                          </Text>
                        </View>
                      )}
                      <View style={[styles.tableCol, { width: '15%' }]}>
                        <Text style={styles.tableCell}>{item.status}</Text>
                      </View>
                    </View>
                  ))}
                </View>
              </Page>
            </Document>
          );

          const blob = await pdf(doc).toBlob();
          const url = window.URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `${type}-items-report.pdf`;
          document.body.appendChild(a);
          a.click();
          window.URL.revokeObjectURL(url);
          document.body.removeChild(a);
        } catch (error) {
          console.error('Error generating PDF:', error);
          showStatusMessage('error', 'Error generating PDF file');
        }
      }
    } catch (error) {
      console.error('Error exporting data:', error);
      showStatusMessage('error', 'Error exporting data');
    }
  };

  // Add handleExportAnalytics function
  const handleExportAnalytics = async (format) => {
    try {
      if (!validateDates(true)) {
        showStatusMessage('error', 'Please select both start and end dates');
        return;
      }

      if (!borrowedItemsData || Object.keys(borrowedItemsData).length === 0) {
        showStatusMessage('error', 'No analytics data available to export');
        return;
      }

      // Filter data based on date range
      const filteredData = {};
      const start = new Date(analyticsStartDate);
      start.setHours(0, 0, 0, 0); // Set to start of day
      const end = new Date(analyticsEndDate);
      end.setHours(23, 59, 59, 999); // Set to end of day

      Object.entries(borrowedItemsData).forEach(([date, count]) => {
        const currentDate = new Date(date);
        currentDate.setHours(0, 0, 0, 0); // Normalize the current date to start of day
        if (currentDate >= start && currentDate <= end) {
          filteredData[date] = count;
        }
      });

      if (Object.keys(filteredData).length === 0) {
        showStatusMessage('error', 'No data found for the selected date range');
        return;
      }

      if (format === 'excel') {
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('Borrowed Items Analytics');
        
        // Add headers
        worksheet.columns = [
          { header: 'Date', key: 'date', width: 20 },
          { header: 'Borrowed Items Count', key: 'count', width: 20 }
        ];

        // Style the header row
        const headerRow = worksheet.getRow(1);
        headerRow.height = 25;
        headerRow.eachCell((cell) => {
          cell.font = { 
            bold: true,
            size: 12,
            color: { argb: '1a1a1a' },
            name: 'Helvetica-Bold'
          };
          cell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'f0f0f0' }
          };
          cell.alignment = {
            vertical: 'middle',
            horizontal: 'center'
          };
          cell.border = {
            top: { style: 'thin', color: { argb: 'bfbfbf' } },
            left: { style: 'thin', color: { argb: 'bfbfbf' } },
            bottom: { style: 'thin', color: { argb: 'bfbfbf' } },
            right: { style: 'thin', color: { argb: 'bfbfbf' } }
          };
        });

        // Add data rows
        Object.entries(filteredData).forEach(([date, count]) => {
          worksheet.addRow({
            date: date,
            count: count
          });
        });

        // Style data rows
        worksheet.eachRow((row, rowNumber) => {
          if (rowNumber > 1) {
            row.eachCell((cell) => {
              cell.font = { 
                size: 11,
                name: 'Helvetica'
              };
              cell.alignment = {
                vertical: 'middle',
                horizontal: 'left'
              };
              cell.border = {
                top: { style: 'thin', color: { argb: 'bfbfbf' } },
                left: { style: 'thin', color: { argb: 'bfbfbf' } },
                bottom: { style: 'thin', color: { argb: 'bfbfbf' } },
                right: { style: 'thin', color: { argb: 'bfbfbf' } }
              };
            });
          }
        });

        // Generate and download the Excel file
        const buffer = await workbook.xlsx.writeBuffer();
        const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'borrowed-items-analytics.xlsx';
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      } else if (format === 'pdf') {
        const doc = (
          <Document>
            <Page size="A4" style={styles.page}>
              <View style={styles.header}>
                {logoDataUrl && !logoError && (
                  <Image 
                    src={logoDataUrl}
                    style={styles.logo}
                  />
                )}
                <Text style={styles.title}>Borrowed Items Analytics</Text>
                <Text style={styles.subtitle}>
                  {`From ${new Date(analyticsStartDate).toLocaleDateString()} to ${new Date(analyticsEndDate).toLocaleDateString()}`}
                </Text>
              </View>
              <View style={styles.table}>
                <View style={styles.tableRow}>
                  <View style={[styles.tableCol, { width: '50%' }]}>
                    <Text style={styles.headerCell}>Date</Text>
                  </View>
                  <View style={[styles.tableCol, { width: '50%' }]}>
                    <Text style={styles.headerCell}>Borrowed Items Count</Text>
                  </View>
                </View>
                {Object.entries(filteredData).map(([date, count], index) => (
                  <View key={index} style={styles.tableRow}>
                    <View style={[styles.tableCol, { width: '50%' }]}>
                      <Text style={styles.tableCell}>{date}</Text>
                    </View>
                    <View style={[styles.tableCol, { width: '50%' }]}>
                      <Text style={styles.tableCell}>{count}</Text>
                    </View>
                  </View>
                ))}
              </View>
            </Page>
          </Document>
        );

        const blob = await pdf(doc).toBlob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'borrowed-items-analytics.pdf';
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      }
    } catch (error) {
      console.error('Error exporting analytics:', error);
      showStatusMessage('error', 'Error exporting analytics data');
    }
  };

  // Update the PDFExportButton to show loading state
  const PDFExportButton = ({ type }) => {
    const [isLoading, setIsLoading] = useState(false);

    const handleClick = async () => {
      setIsLoading(true);
      try {
        await handleExport(type, 'pdf');
      } finally {
        setIsLoading(false);
      }
    };

    return (
      <button
        onClick={handleClick}
        disabled={isLoading}
        className={`w-full px-4 py-3 bg-red-600 text-white rounded-xl hover:bg-red-700 flex items-center justify-center space-x-2 transition-all transform hover:scale-105 ${
          isLoading ? 'opacity-50 cursor-not-allowed' : ''
        }`}
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
        </svg>
        <span>{isLoading ? 'Generating...' : 'PDF'}</span>
      </button>
    );
  };

  // Add function to validate dates
  const validateDates = (isAnalytics = false) => {
    const start = isAnalytics ? analyticsStartDate : startDate;
    const end = isAnalytics ? analyticsEndDate : endDate;
    
    if (!start || !end) {
      return false;
    }
    const startDateObj = new Date(start);
    const endDateObj = new Date(end);
    return startDateObj <= endDateObj;
  };

  // Add date input handlers
  const handleStartDateChange = (e) => {
    setStartDate(e.target.value);
    setError('');
  };

  const handleEndDateChange = (e) => {
    setEndDate(e.target.value);
    setError('');
  };

  // Convert logo to data URL
  const convertLogoToDataUrl = async () => {
    try {
      // Convert the imported logo to a data URL
      const response = await fetch(logo);
      const blob = await response.blob();
      const reader = new FileReader();
      
      reader.onloadend = () => {
        setLogoDataUrl(reader.result);
        setLogoError(null);
      };
      
      reader.onerror = () => {
        setLogoError('Failed to convert logo to data URL');
      };
      
      reader.readAsDataURL(blob);
    } catch (error) {
      console.error('Error loading logo:', error);
      setLogoError(error.message);
    }
  };

  // Load logo on component mount
  useEffect(() => {
    convertLogoToDataUrl();
  }, []);

  // Add fetchFeedbackStats function
  const fetchFeedbackStats = async () => {
    try {
      const response = await axios.get(`${baseUrl}/api/admin/feedback-stats`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setFeedbackStats(response.data);
    } catch (error) {
      console.error('Error fetching feedback stats:', error);
      setError('Failed to fetch feedback statistics');
    }
  };

  // Add useEffect for feedback stats
  useEffect(() => {
    if (activeTab === 'feedback') {
      fetchFeedbackStats();
    }
  }, [activeTab]);

  // Process borrowed items data for graph
  const processBorrowedItemsData = (items) => {
    const now = new Date();
    const data = {};
    
    items.forEach(item => {
      const borrowDate = new Date(item.borrowTime);
      let key;
      
      if (timeRange === 'hour') {
        // Group by hour, showing only time in 12-hour format
        key = borrowDate.toLocaleString('en-US', {
          hour: 'numeric',
          hour12: true
        });
      } else if (timeRange === 'day') {
        // Group by day
        key = borrowDate.toLocaleDateString();
      } else {
        // Group by month
        key = `${borrowDate.getFullYear()}-${borrowDate.getMonth() + 1}`;
      }
      
      if (!data[key]) {
        data[key] = 0;
      }
      data[key]++;
    });
    
    // Sort the data chronologically
    const sortedData = {};
    Object.keys(data)
      .sort((a, b) => {
        if (timeRange === 'hour') {
          // Convert 12-hour format to 24-hour for sorting
          const getHour = (timeStr) => {
            const [time, period] = timeStr.split(' ');
            const hour = parseInt(time);
            return period === 'PM' && hour !== 12 ? hour + 12 : 
                   period === 'AM' && hour === 12 ? 0 : hour;
          };
          // Sort in ascending order (earlier hours on left)
          return getHour(a) - getHour(b);
        } else if (timeRange === 'day') {
          return new Date(a) - new Date(b);
        } else {
          const [yearA, monthA] = a.split('-').map(Number);
          const [yearB, monthB] = b.split('-').map(Number);
          return yearA === yearB ? monthA - monthB : yearA - yearB;
        }
      })
      .forEach(key => {
        sortedData[key] = data[key];
      });
    
    return sortedData;
  };

  // Add function to fetch borrowed items for the graph
  const fetchBorrowedItemsForGraph = async () => {
    try {
      const queryParams = new URLSearchParams();
      
      // For hourly view, only fetch today's data
      if (timeRange === 'hour') {
        const today = new Date();
        const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
        const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59);
        queryParams.append('startDate', startOfDay.toISOString());
        queryParams.append('endDate', endOfDay.toISOString());
      }
      
      const res = await axios.get(`${baseUrl}/api/admin/borrowed-history?${queryParams}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const items = res.data.data;
      const processedData = processBorrowedItemsData(items);
      setBorrowedItemsData(processedData);
    } catch (err) {
      console.error('Error fetching borrowed items for graph:', err);
    }
  };

  // Add useEffect for fetching borrowed items data
  useEffect(() => {
    if (activeTab === 'overview') {
      fetchBorrowedItemsForGraph();
      const interval = setInterval(fetchBorrowedItemsForGraph, 30000); // Update every 30 seconds
      return () => clearInterval(interval);
    }
  }, [activeTab, timeRange]);

  // Add new handlers for analytics date changes
  const handleAnalyticsStartDateChange = (e) => {
    setAnalyticsStartDate(e.target.value);
  };

  const handleAnalyticsEndDateChange = (e) => {
    setAnalyticsEndDate(e.target.value);
  };

  if (isLoading && !isOverviewPolling) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50">
      {/* Header with Welcome Message and Logout */}
      <div className="bg-white shadow-lg fixed top-0 left-0 right-0 z-[100]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-3">
              <div className="h-10 w-10 rounded-full bg-purple-600 flex items-center justify-center">
                <span className="text-white font-bold text-lg">{user?.name?.[0] || 'U'}</span>
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-800">Admin Dashboard</h1>
                <p className="text-sm text-gray-600">Welcome, {user?.name || 'User'}</p>
              </div>
            </div>
            <button
              onClick={handleLogoutClick}
              className="flex items-center space-x-2 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors shadow-sm"
            >
              <LogoutIcon className="w-5 h-5" />
              <span className="hidden sm:inline">Logout</span>
            </button>
          </div>
        </div>
      </div>

      {/* Success Message */}
      <AnimatePresence>
        {success && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-4 right-4 z-[100] bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded-lg shadow-lg"
          >
            {success}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Error Message */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-4 right-4 z-[100] bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg shadow-lg"
          >
            {error}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Success Modal */}
      <AnimatePresence>
        {showSuccessModal && (
          <div className="fixed inset-0 z-[100] overflow-y-auto">
            <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 backdrop-blur-sm bg-white/30 transition-opacity"
                aria-hidden="true"
                onClick={handleCloseSuccessModal}
              />
              <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="relative inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full"
                role="dialog"
                aria-modal="true"
                aria-labelledby="modal-headline"
              >
                <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                  <div className="sm:flex sm:items-start">
                    <div className="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-green-100 sm:mx-0 sm:h-10 sm:w-10">
                      <svg className="h-6 w-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left">
                      <h3 className="text-lg leading-6 font-medium text-gray-900" id="modal-headline">
                        Success
                      </h3>
                      <div className="mt-2">
                        <p className="text-sm text-gray-500">
                          {modalMessage}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                  <button
                    type="button"
                    onClick={handleCloseSuccessModal}
                    className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-green-600 text-base font-medium text-white hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 sm:ml-3 sm:w-auto sm:text-sm"
                  >
                    Close
                  </button>
                </div>
              </motion.div>
            </div>
          </div>
        )}
      </AnimatePresence>

      {/* Error Modal */}
      <AnimatePresence>
        {showErrorModal && (
          <div className="fixed inset-0 z-[100] overflow-y-auto">
            <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 backdrop-blur-sm bg-white/30 transition-opacity"
                aria-hidden="true"
                onClick={handleCloseErrorModal}
              />
              <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="relative inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full"
                role="dialog"
                aria-modal="true"
                aria-labelledby="modal-headline"
              >
                <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                  <div className="sm:flex sm:items-start">
                    <div className="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-red-100 sm:mx-0 sm:h-10 sm:w-10">
                      <ExclamationIcon className="h-6 w-6 text-red-600" aria-hidden="true" />
                    </div>
                    <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left">
                      <h3 className="text-lg leading-6 font-medium text-gray-900" id="modal-headline">
                        Error
                      </h3>
                      <div className="mt-2">
                        <p className="text-sm text-gray-500">
                          {modalMessage}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                  <button
                    type="button"
                    onClick={handleCloseErrorModal}
                    className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-red-600 text-base font-medium text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 sm:ml-3 sm:w-auto sm:text-sm"
                  >
                    Close
                  </button>
                </div>
              </motion.div>
            </div>
          </div>
        )}
      </AnimatePresence>

      {/* Logout Confirmation Modal */}
      <AnimatePresence>
        {showLogoutModal && (
          <div className="fixed inset-0 z-[100] overflow-y-auto">
            <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 backdrop-blur-sm bg-white/30 transition-opacity"
                aria-hidden="true"
                onClick={handleCancelLogout}
              />
              <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="relative inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full"
                role="dialog"
                aria-modal="true"
                aria-labelledby="modal-headline"
              >
                <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                  <div className="sm:flex sm:items-start">
                    <div className="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-red-100 sm:mx-0 sm:h-10 sm:w-10">
                      <ExclamationIcon className="h-6 w-6 text-red-600" aria-hidden="true" />
                    </div>
                    <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left">
                      <h3 className="text-lg leading-6 font-medium text-gray-900" id="modal-headline">
                        Confirm Logout
                      </h3>
                      <div className="mt-2">
                        <p className="text-sm text-gray-500">
                          Are you sure you want to logout? You will need to login again to access the admin dashboard.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                  <button
                    type="button"
                    onClick={handleConfirmLogout}
                    className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-red-600 text-base font-medium text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 sm:ml-3 sm:w-auto sm:text-sm"
                  >
                    Logout
                  </button>
                  <button
                    type="button"
                    onClick={handleCancelLogout}
                    className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
                  >
                    Cancel
                  </button>
                </div>
              </motion.div>
            </div>
          </div>
        )}
      </AnimatePresence>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {showDeleteModal && (
          <div className="fixed inset-0 z-[100] overflow-y-auto">
            <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 backdrop-blur-sm bg-white/30 transition-opacity"
                aria-hidden="true"
                onClick={handleCancelDelete}
              />
              <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="relative inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full"
                role="dialog"
                aria-modal="true"
                aria-labelledby="modal-headline"
              >
                <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                  <div className="sm:flex sm:items-start">
                    <div className="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-red-100 sm:mx-0 sm:h-10 sm:w-10">
                      <ExclamationIcon className="h-6 w-6 text-red-600" aria-hidden="true" />
                    </div>
                    <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left">
                      <h3 className="text-lg leading-6 font-medium text-gray-900" id="modal-headline">
                        Delete Reward
                      </h3>
                      <div className="mt-2">
                        <p className="text-sm text-gray-500">
                          Are you sure you want to delete the reward "{rewardToDelete?.name}"? This action cannot be undone.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                  <button
                    type="button"
                    onClick={handleConfirmDelete}
                    className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-red-600 text-base font-medium text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 sm:ml-3 sm:w-auto sm:text-sm"
                  >
                    Delete
                  </button>
                  <button
                    type="button"
                    onClick={handleCancelDelete}
                    className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
                  >
                    Cancel
                  </button>
                </div>
              </motion.div>
            </div>
          </div>
        )}
      </AnimatePresence>

      {/* Password Change Modal */}
      <AnimatePresence>
        {showPasswordModal && (
          <div className="fixed inset-0 z-[100] overflow-y-auto">
            <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 backdrop-blur-sm bg-white/30 transition-opacity"
                aria-hidden="true"
                onClick={handleClosePasswordModal}
              />
              <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="relative inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full"
                role="dialog"
                aria-modal="true"
                aria-labelledby="modal-headline"
              >
                <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                  <div className="sm:flex sm:items-start">
                    <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left w-full">
                      <h3 className="text-lg leading-6 font-medium text-gray-900" id="modal-headline">
                        Change Password for {selectedUser?.firstName} {selectedUser?.lastName}
                      </h3>
                      <div className="mt-4 space-y-4">
                        <div>
                          <label htmlFor="new-password" className="block text-sm font-medium text-gray-700">
                            New Password
                          </label>
                          <input
                            type="password"
                            id="new-password"
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            placeholder="Enter new password"
                            className="mt-1 w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                          />
                        </div>
                        <div>
                          <label htmlFor="confirm-password" className="block text-sm font-medium text-gray-700">
                            Confirm Password
                          </label>
                          <input
                            type="password"
                            id="confirm-password"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            placeholder="Confirm new password"
                            className="mt-1 w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                          />
                        </div>
                        {passwordError && (
                          <p className="mt-2 text-sm text-red-600">{passwordError}</p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
                <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                  <button
                    type="button"
                    onClick={handlePasswordChange}
                    className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-purple-600 text-base font-medium text-white hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 sm:ml-3 sm:w-auto sm:text-sm"
                  >
                    Update Password
                  </button>
                  <button
                    type="button"
                    onClick={handleClosePasswordModal}
                    className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
                  >
                    Cancel
                  </button>
                </div>
              </motion.div>
            </div>
          </div>
        )}
      </AnimatePresence>

      {/* Admin Code Verification Modal */}
      <AnimatePresence>
        {showAdminCodeModal && (
          <div className="fixed inset-0 z-[100] overflow-y-auto">
            <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 backdrop-blur-sm bg-white/30 transition-opacity"
                aria-hidden="true"
                onClick={handleCloseAdminCodeModal}
              />
              <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="relative inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full"
                role="dialog"
                aria-modal="true"
                aria-labelledby="modal-headline"
              >
                <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                  <div className="sm:flex sm:items-start">
                    <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left w-full">
                      <h3 className="text-lg leading-6 font-medium text-gray-900" id="modal-headline">
                        Admin Verification Required
                      </h3>
                      <div className="mt-4">
                        <p className="text-sm text-gray-500 mb-4">
                          Please enter the admin code to confirm the password change for {selectedUser?.firstName} {selectedUser?.lastName}
                        </p>
                        <div>
                          <label htmlFor="admin-code" className="block text-sm font-medium text-gray-700">
                            Admin Code
                          </label>
                          <input
                            type="password"
                            id="admin-code"
                            value={adminCode}
                            onChange={(e) => setAdminCode(e.target.value)}
                            placeholder="Enter admin code"
                            className="mt-1 w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                          />
                        </div>
                        {passwordError && (
                          <p className="mt-2 text-sm text-red-600">{passwordError}</p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
                <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                  <button
                    type="button"
                    onClick={handleAdminCodeVerification}
                    className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-purple-600 text-base font-medium text-white hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 sm:ml-3 sm:w-auto sm:text-sm"
                  >
                    Verify & Update
                  </button>
                  <button
                    type="button"
                    onClick={handleCloseAdminCodeModal}
                    className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
                  >
                    Cancel
                  </button>
                </div>
              </motion.div>
            </div>
          </div>
        )}
      </AnimatePresence>

      {/* Tab Navigation */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 bg-white fixed top-[72px] left-0 right-0 z-[90] shadow-sm">
        <div className="flex space-x-2 overflow-x-auto pb-2 scrollbar-hide">
          {[
            { id: 'overview', icon: ChartBarIcon, label: 'Overview' },
            { id: 'users', icon: UserGroupIcon, label: 'Users' },
            { id: 'rewards', icon: GiftIcon, label: 'Rewards' },
            { id: 'borrowed', icon: ArrowLeftIcon, label: 'Borrowed' },
            { id: 'returned', icon: ArrowRightIcon, label: 'Returned' },
            { id: 'points-usage', icon: CurrencyDollarIcon, label: 'Points Usage' },
            { id: 'reports', icon: DocumentReportIcon, label: 'Reports' },
            { id: 'feedback', icon: ChatAltIcon, label: 'Feedback' }
          ].map(({ id, icon: Icon, label }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl whitespace-nowrap transition-all ${
                activeTab === id
                  ? 'bg-purple-600 text-white shadow-md'
                  : 'bg-white text-gray-700 hover:bg-gray-50'
              }`}
            >
              <Icon className="w-5 h-5" />
              <span>{label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 mt-[144px] min-h-[calc(100vh-144px)] flex flex-col">
        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-2xl shadow-lg p-4 sm:p-6"
          >
            <div className="flex items-center space-x-3 mb-6">
              <div className="p-2 bg-purple-100 rounded-lg">
                <ChartBarIcon className="w-6 h-6 text-purple-600" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-gray-800">Overview</h2>
                <p className="text-gray-600 mt-1">View statistics and metrics</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
              <div className="bg-gradient-to-br from-blue-50 to-indigo-50 p-6 rounded-xl border border-blue-100">
                <h3 className="text-sm font-medium text-blue-800">Total Users</h3>
                <p className="text-3xl font-bold text-blue-600">{stats.totalUsers || 0}</p>
              </div>
              <div className="bg-gradient-to-br from-green-50 to-emerald-50 p-6 rounded-xl border border-green-100">
                <h3 className="text-sm font-medium text-green-800">Unused Points</h3>
                <p className="text-3xl font-bold text-green-600">{stats.totalPointsUnused || 0}</p>
              </div>
              <div className="bg-gradient-to-br from-purple-50 to-pink-50 p-6 rounded-xl border border-purple-100">
                <h3 className="text-sm font-medium text-purple-800">Used Points</h3>
                <p className="text-3xl font-bold text-purple-600">{stats.totalPointsUsed || 0}</p>
              </div>
              <div className="bg-gradient-to-br from-yellow-50 to-orange-50 p-6 rounded-xl border border-yellow-100">
                <h3 className="text-sm font-medium text-yellow-800">Current Borrowed Items</h3>
                <p className="text-3xl font-bold text-yellow-600">{totalBorrowedItems}</p>
              </div>
            </div>

            {/* Borrowed Items Graph */}
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-semibold text-gray-800">Borrow Graph</h3>
                <div className="flex space-x-2">
                  <button
                    onClick={() => setTimeRange('hour')}
                    className={`px-3 py-1 rounded-lg text-sm font-medium ${
                      timeRange === 'hour'
                        ? 'bg-purple-600 text-white'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    Hourly
                  </button>
                  <button
                    onClick={() => setTimeRange('day')}
                    className={`px-3 py-1 rounded-lg text-sm font-medium ${
                      timeRange === 'day'
                        ? 'bg-purple-600 text-white'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    Daily
                  </button>
                  <button
                    onClick={() => setTimeRange('month')}
                    className={`px-3 py-1 rounded-lg text-sm font-medium ${
                      timeRange === 'month'
                        ? 'bg-purple-600 text-white'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    Monthly
                  </button>
                </div>
              </div>
              <div className="h-[300px]">
                <Line
                  data={{
                    labels: Object.keys(borrowedItemsData),
                    datasets: [
                      {
                        label: 'Borrowed Items',
                        data: Object.values(borrowedItemsData),
                        borderColor: 'rgb(147, 51, 234)',
                        backgroundColor: 'rgba(147, 51, 234, 0.1)',
                        tension: 0.4,
                        fill: true,
                      },
                    ],
                  }}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                      legend: {
                        display: false,
                      },
                    },
                    scales: {
                      y: {
                        beginAtZero: true,
                        ticks: {
                          stepSize: 1,
                        },
                      },
                    },
                  }}
                />
              </div>
            </div>
          </motion.div>
        )}

        {/* Users Tab */}
        {activeTab === 'users' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-2xl shadow-lg p-4 sm:p-6"
          >
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 space-y-4 sm:space-y-0">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <UserGroupIcon className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-gray-800">User Management</h2>
                  <p className="text-gray-600 mt-1">Manage user roles and permissions</p>
                </div>
              </div>
              <div className="w-full sm:w-64">
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Search by ID number..."
                    value={searchTerm}
                    onChange={handleSearch}
                    className="w-full px-4 py-2 pl-10 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  />
                  <svg className="w-5 h-5 text-gray-400 absolute left-3 top-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
              </div>
            </div>

            <div className="overflow-x-auto">
              {isPageLoading ? (
                <div className="flex justify-center items-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-purple-500"></div>
                </div>
              ) : (
                <>
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          ID Number
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          First Name
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Last Name
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Points
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Role
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {users.map((u) => (
                        <tr key={u._id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            {u.idNumber}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {u.firstName}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {u.lastName}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                              {u.points}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            <select
                              value={u.role}
                              onChange={(e) => handleRoleChange(u._id, e.target.value)}
                              className="px-2 py-1 text-sm border rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500"
                              disabled={u.role === 'admin'}
                            >
                              <option value="student">Student</option>
                              <option value="teacher">Teacher</option>
                              <option value="ateneoStaff">Ateneo Staff</option>
                              <option value="cashier">Cashier</option>
                              <option value="concierge">Concierge</option>
                              <option value="catering">Catering</option>
                              <option value="varda">Varda</option>
                              <option value="blueCafe">Blue Cafe</option>
                              <option value="colonelsCurry">Colonel's Curry</option>
                              <option value="chillers">Chillers</option>
                              <option value="luckyShawarma">Lucky Shawarma</option>
                              <option value="yumdimdum">Yumdimdum</option>
                              <option value="admin">Admin</option>
                            </select>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 space-x-2">
                            {u.role !== 'admin' && (
                              <>
                                <button
                                  onClick={() => handleSaveRole(u._id)}
                                  className="px-3 py-1 text-sm font-medium text-white bg-purple-600 rounded-lg hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 transition-colors"
                                >
                                  Save
                                </button>
                                <button
                                  onClick={() => handleOpenPasswordModal(u)}
                                  className="px-3 py-1 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors ml-2"
                                >
                                  Update
                                </button>
                              </>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {users.length === 0 && (
                    <div className="text-center py-12">
                      <p className="text-gray-500">No users found.</p>
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex justify-center items-center mt-6 space-x-4">
                <button
                  onClick={() => handlePageChange(Math.max(1, currentPage - 1))}
                  disabled={currentPage === 1 || isPageLoading}
                  className={`p-2 rounded-lg transition-colors ${
                    currentPage === 1 || isPageLoading
                      ? 'text-gray-400 cursor-not-allowed'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
                <span className="text-gray-700 font-medium">
                  Page {currentPage} of {totalPages}
                </span>
                <button
                  onClick={() => handlePageChange(Math.min(totalPages, currentPage + 1))}
                  disabled={currentPage === totalPages || isPageLoading}
                  className={`p-2 rounded-lg transition-colors ${
                    currentPage === totalPages || isPageLoading
                      ? 'text-gray-400 cursor-not-allowed'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </div>
            )}
          </motion.div>
        )}

        {/* Rewards Tab */}
        {activeTab === 'rewards' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-2xl shadow-lg p-4 sm:p-6"
          >
            <div className="flex items-center space-x-3 mb-6">
              <div className="p-2 bg-purple-100 rounded-lg">
                <GiftIcon className="w-6 h-6 text-purple-600" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-gray-800">Rewards Management</h2>
                <p className="text-gray-600 mt-1">Create and manage rewards, view claims</p>
              </div>
            </div>

            {/* Create Reward Form */}
            <div className="bg-gradient-to-br from-purple-50 to-indigo-50 p-6 rounded-xl border border-purple-100 mb-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">Create New Reward</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Reward Name</label>
                  <input
                    type="text"
                    value={rewards.name}
                    onChange={(e) => setRewards({ ...rewards, name: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    placeholder="Enter reward name"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Point Cost</label>
                  <input
                    type="number"
                    value={rewards.cost}
                    onChange={(e) => setRewards({ ...rewards, cost: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    placeholder="Enter point cost"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                  <input
                    type="text"
                    value={rewards.description}
                    onChange={(e) => setRewards({ ...rewards, description: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    placeholder="Enter reward description"
                  />
                </div>
              </div>
              <div className="mt-4">
                <button
                  onClick={handleCreateReward}
                  className="px-4 py-2 bg-purple-600 text-white rounded-xl hover:bg-purple-700 transition-colors"
                >
                  Create Reward
                </button>
              </div>
            </div>

            {/* Available Rewards */}
            <div className="mb-8">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">Available Rewards</h3>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Reward Name
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Point Cost
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Description
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {getCurrentRewards().map((reward) => (
                      <tr key={reward._id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {reward.name}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-purple-100 text-purple-800">
                            {reward.cost} points
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {reward.description}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          <button
                            onClick={() => handleDeleteClick(reward)}
                            className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 text-red-800 hover:bg-red-200 transition-colors cursor-pointer"
                          >
                            Delete
                          </button>
                        </td>
                      </tr>
                    ))}
                    {availableRewards.length === 0 && (
                      <tr>
                        <td colSpan="4" className="px-6 py-4 text-center text-sm text-gray-500">
                          No rewards available
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>

                {/* Rewards Pagination */}
                {rewardsTotalPages > 1 && (
                  <div className="flex justify-center items-center mt-6 space-x-4">
                    <button
                      onClick={() => handleRewardsPageChange(Math.max(1, rewardsCurrentPage - 1))}
                      disabled={rewardsCurrentPage === 1}
                      className={`p-2 rounded-lg transition-colors ${
                        rewardsCurrentPage === 1
                          ? 'text-gray-400 cursor-not-allowed'
                          : 'text-gray-700 hover:bg-gray-100'
                      }`}
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
                      </svg>
                    </button>
                    <span className="text-gray-700 font-medium">
                      Page {rewardsCurrentPage} of {rewardsTotalPages}
                    </span>
                    <button
                      onClick={() => handleRewardsPageChange(Math.min(rewardsTotalPages, rewardsCurrentPage + 1))}
                      disabled={rewardsCurrentPage === rewardsTotalPages}
                      className={`p-2 rounded-lg transition-colors ${
                        rewardsCurrentPage === rewardsTotalPages
                          ? 'text-gray-400 cursor-not-allowed'
                          : 'text-gray-700 hover:bg-gray-100'
                      }`}
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                      </svg>
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Claimed Rewards */}
            <div>
              <h3 className="text-lg font-semibold text-gray-800 mb-4">Claimed Rewards</h3>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Student ID
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Reward Name
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Points Used
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Claimed Date
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {claimedRewards.map((claim) => (
                      <tr key={claim._id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {claim.studentIdNumber}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {claim.rewardName}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-purple-100 text-purple-800">
                            {claim.pointsUsed} points
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {new Date(claim.claimedAt).toLocaleDateString()}
                        </td>
                      </tr>
                    ))}
                    {claimedRewards.length === 0 && (
                      <tr>
                        <td colSpan="4" className="px-6 py-4 text-center text-sm text-gray-500">
                          No rewards claimed yet
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </motion.div>
        )}

        {/* Borrowed Tab */}
        {activeTab === 'borrowed' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-2xl shadow-lg p-4 sm:p-6"
          >
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 space-y-4 sm:space-y-0">
              <div>
                <h2 className="text-2xl font-bold text-gray-800">Borrowed Items</h2>
                <p className="text-gray-600 mt-1">Track all currently borrowed items</p>
              </div>
              <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2">
                <div className="w-full sm:w-64">
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="Search by student ID..."
                      value={borrowedSearchTerm}
                      onChange={handleBorrowedSearch}
                      className="w-full px-4 py-2 pl-10 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    />
                    <svg className="w-5 h-5 text-gray-400 absolute left-3 top-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  </div>
                </div>
              </div>
            </div>
            {cleanupMessage && (
              <div className={`mb-4 p-3 rounded-lg ${
                cleanupMessage.includes('Successfully') 
                  ? 'bg-green-100 text-green-800' 
                  : 'bg-red-100 text-red-800'
              }`}>
                {cleanupMessage}
              </div>
            )}
            <div className="overflow-x-auto rounded-xl border border-gray-200">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      ID Number
                    </th>
                    <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Items
                    </th>
                    <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Borrow Time
                    </th>
                    <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {paginatedBorrowedItems.map((item) => (
                    <tr key={item._id} className="hover:bg-gray-50">
                      <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {item.studentIdNumber}
                      </td>
                      <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {item.items.map((i, index) => (
                          <div key={index}>
                            {i.name} (x{i.quantity})
                          </div>
                        ))}
                      </td>
                      <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(item.borrowTime).toLocaleString()}
                      </td>
                      <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-yellow-100 text-yellow-800`}>
                          {item.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {paginatedBorrowedItems.length === 0 && (
                <div className="text-center py-12">
                  <p className="text-gray-500">No borrowed items found.</p>
                </div>
              )}
            </div>
            {/* Pagination for Borrowed Items */}
            {totalBorrowedPages > 1 && (
              <div className="flex justify-center items-center mt-6 space-x-4">
                <button
                  onClick={() => handleBorrowedPageChange(Math.max(1, currentBorrowedPage - 1))}
                  disabled={currentBorrowedPage === 1}
                  className={`p-2 rounded-lg transition-colors ${
                    currentBorrowedPage === 1
                      ? 'text-gray-400 cursor-not-allowed'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
                <span className="text-gray-700 font-medium">
                  Page {currentBorrowedPage} of {totalBorrowedPages}
                </span>
                <button
                  onClick={() => handleBorrowedPageChange(Math.min(totalBorrowedPages, currentBorrowedPage + 1))}
                  disabled={currentBorrowedPage === totalBorrowedPages}
                  className={`p-2 rounded-lg transition-colors ${
                    currentBorrowedPage === totalBorrowedPages
                      ? 'text-gray-400 cursor-not-allowed'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </div>
            )}
          </motion.div>
        )}

        {/* Returned Tab */}
        {activeTab === 'returned' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-2xl shadow-lg p-4 sm:p-6"
          >
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 space-y-4 sm:space-y-0">
              <div>
                <h2 className="text-2xl font-bold text-gray-800">Returned Items History</h2>
                <p className="text-gray-600 mt-1">View history of all returned items</p>
              </div>
              <div className="w-full sm:w-64">
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Search by student ID..."
                    value={returnedSearchTerm}
                    onChange={handleReturnedSearch}
                    className="w-full px-4 py-2 pl-10 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  />
                  <svg className="w-5 h-5 text-gray-400 absolute left-3 top-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
              </div>
            </div>
            <div className="overflow-x-auto rounded-xl border border-gray-200">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      ID Number
                    </th>
                    <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Items
                    </th>
                    <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Borrow Time
                    </th>
                    <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Return Time
                    </th>
                    <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {paginatedReturnedItems.map((item) => (
                    <tr key={item._id} className="hover:bg-gray-50">
                      <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {item.studentIdNumber}
                      </td>
                      <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {item.items.map((i, index) => (
                          <div key={index}>
                            {i.name} (x{i.quantity})
                          </div>
                        ))}
                      </td>
                      <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(item.borrowTime).toLocaleString()}
                      </td>
                      <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(item.returnTime).toLocaleString()}
                      </td>
                      <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                          {item.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {paginatedReturnedItems.length === 0 && (
                <div className="text-center py-12">
                  <p className="text-gray-500">No returned items found.</p>
                </div>
              )}
            </div>
            {/* Pagination for Returned Items */}
            {totalReturnedPages > 1 && (
              <div className="flex justify-center items-center mt-6 space-x-4">
                <button
                  onClick={() => handleReturnedPageChange(Math.max(1, currentReturnedPage - 1))}
                  disabled={currentReturnedPage === 1}
                  className={`p-2 rounded-lg transition-colors ${
                    currentReturnedPage === 1
                      ? 'text-gray-400 cursor-not-allowed'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
                <span className="text-gray-700 font-medium">
                  Page {currentReturnedPage} of {totalReturnedPages}
                </span>
                <button
                  onClick={() => handleReturnedPageChange(Math.min(totalReturnedPages, currentReturnedPage + 1))}
                  disabled={currentReturnedPage === totalReturnedPages}
                  className={`p-2 rounded-lg transition-colors ${
                    currentReturnedPage === totalReturnedPages
                      ? 'text-gray-400 cursor-not-allowed'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </div>
            )}
          </motion.div>
        )}

        {/* Points Usage Tab */}
        {activeTab === 'points-usage' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-2xl shadow-lg p-4 sm:p-6"
          >
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 space-y-4 sm:space-y-0">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <CurrencyDollarIcon className="w-6 h-6 text-purple-600" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-gray-800">Points Usage History</h2>
                  <p className="text-gray-600 mt-1">View all points usage records</p>
                </div>
              </div>
              <div className="w-full sm:w-64">
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Search records..."
                    value={pointsUsageSearchTerm}
                    onChange={handlePointsUsageSearch}
                    className="w-full px-4 py-2 pl-10 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  />
                  <svg className="w-5 h-5 text-gray-400 absolute left-3 top-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
              </div>
            </div>

            <div className="overflow-x-auto">
              {isPointsUsageLoading ? (
                <div className="flex justify-center items-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-purple-500"></div>
                </div>
              ) : (
                <>
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Date
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          ID Number
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Name
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Meal Type
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Store
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Points Used
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Items
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {pointsUsage.map((record) => (
                        <tr key={record._id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {new Date(record.dateUsed).toLocaleString()}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            {record.idNumber}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {record.firstName} {record.lastName}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-purple-100 text-purple-800">
                              {record.mealType}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {record.storeName}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                              {record.pointsUsed}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-500">
                            <div className="max-w-xs">
                              {record.items.map((item, index) => (
                                <div key={index} className="mb-1">
                                  {item.name} {item.quantity > 1 ? `(x${item.quantity})` : ''}
                                </div>
                              ))}
                            </div>
                          </td>
                        </tr>
                      ))}
                      {pointsUsage.length === 0 && (
                        <tr>
                          <td colSpan="7" className="px-6 py-4 text-center text-sm text-gray-500">
                            No points usage records found
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>

                  {/* Pagination */}
                  {pointsUsageTotalPages > 1 && (
                    <div className="flex justify-center items-center mt-6 space-x-4">
                      <button
                        onClick={() => handlePointsUsagePageChange(Math.max(1, pointsUsagePage - 1))}
                        disabled={pointsUsagePage === 1 || isPointsUsageLoading}
                        className={`p-2 rounded-lg transition-colors ${
                          pointsUsagePage === 1 || isPointsUsageLoading
                            ? 'text-gray-400 cursor-not-allowed'
                            : 'text-gray-700 hover:bg-gray-100'
                        }`}
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
                        </svg>
                      </button>
                      <span className="text-gray-700 font-medium">
                        Page {pointsUsagePage} of {pointsUsageTotalPages}
                      </span>
                      <button
                        onClick={() => handlePointsUsagePageChange(Math.min(pointsUsageTotalPages, pointsUsagePage + 1))}
                        disabled={pointsUsagePage === pointsUsageTotalPages || isPointsUsageLoading}
                        className={`p-2 rounded-lg transition-colors ${
                          pointsUsagePage === pointsUsageTotalPages || isPointsUsageLoading
                            ? 'text-gray-400 cursor-not-allowed'
                            : 'text-gray-700 hover:bg-gray-100'
                        }`}
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                        </svg>
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          </motion.div>
        )}

        {/* Reports Tab */}
        {activeTab === 'reports' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-2xl shadow-lg p-4 sm:p-6"
          >
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 space-y-4 sm:space-y-0">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <DocumentReportIcon className="w-6 h-6 text-purple-600" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-gray-800">History Reports</h2>
                  <p className="text-gray-600 mt-1">Generate and export reports for borrowed and returned items.</p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Date Range Selection */}
              <div className="bg-gradient-to-br from-purple-50 to-indigo-50 p-6 rounded-xl border border-purple-100">
                <div className="flex items-center space-x-2 mb-4">
                  <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <h3 className="text-lg font-semibold text-gray-800">Select Date Range</h3>
                </div>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
                    <input
                      type="date"
                      value={startDate}
                      onChange={handleStartDateChange}
                      className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
                    <input
                      type="date"
                      value={endDate}
                      onChange={handleEndDateChange}
                      className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white"
                    />
                  </div>
                </div>
              </div>

              {/* Export Options */}
              <div className="space-y-6">
                {/* Borrowed Items Export */}
                <div className="bg-gradient-to-br from-green-50 to-emerald-50 p-6 rounded-xl border border-green-100">
                  <div className="flex items-center space-x-2 mb-4">
                    <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                    </svg>
                    <h3 className="text-lg font-semibold text-gray-800">Borrowed Items History</h3>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <button
                      onClick={() => handleExport('borrowed', 'excel')}
                      className="w-full px-4 py-3 bg-green-600 text-white rounded-xl hover:bg-green-700 flex items-center justify-center space-x-2 transition-all transform hover:scale-105"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      <span>Excel</span>
                    </button>
                    <PDFExportButton type="borrowed" />
                  </div>
                </div>

                {/* Returned Items Export */}
                <div className="bg-gradient-to-br from-blue-50 to-indigo-50 p-6 rounded-xl border border-blue-100">
                  <div className="flex items-center space-x-2 mb-4">
                    <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                    </svg>
                    <h3 className="text-lg font-semibold text-gray-800">Returned Items History</h3>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <button
                      onClick={() => handleExport('returned', 'excel')}
                      className="w-full px-4 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 flex items-center justify-center space-x-2 transition-all transform hover:scale-105"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      <span>Excel</span>
                    </button>
                    <PDFExportButton type="returned" />
                  </div>
                </div>
              </div>
            </div>

            {/* Analytics Section */}
            <div className="mt-6">
              <div className="bg-gradient-to-br from-purple-50 to-indigo-50 p-6 rounded-xl border border-purple-100">
                <div className="flex items-center space-x-2 mb-4">
                  <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                  <h3 className="text-lg font-semibold text-gray-800">Analytics</h3>
                </div>
                <p className="text-gray-600 mb-4">Export the borrowed data from the Overview tab.</p>
                
                {/* Date Range Inputs */}
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
                    <input
                      type="date"
                      value={analyticsStartDate}
                      onChange={handleAnalyticsStartDateChange}
                      className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
                    <input
                      type="date"
                      value={analyticsEndDate}
                      onChange={handleAnalyticsEndDateChange}
                      className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <button
                    onClick={() => handleExportAnalytics('excel')}
                    className="w-full px-4 py-3 bg-purple-600 text-white rounded-xl hover:bg-purple-700 flex items-center justify-center space-x-2 transition-all transform hover:scale-105"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <span>Excel</span>
                  </button>
                  <button
                    onClick={() => handleExportAnalytics('pdf')}
                    className="w-full px-4 py-3 bg-purple-600 text-white rounded-xl hover:bg-purple-700 flex items-center justify-center space-x-2 transition-all transform hover:scale-105"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                    </svg>
                    <span>PDF</span>
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* Feedback Tab */}
        {activeTab === 'feedback' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-2xl shadow-lg p-4 sm:p-6"
          >
            <div className="flex items-center space-x-3 mb-6">
              <div className="p-2 bg-purple-100 rounded-lg">
                <ChatAltIcon className="w-6 h-6 text-purple-600" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-gray-800">Feedback Statistics</h2>
                <p className="text-gray-600 mt-1">Overall ratings from customer feedback</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {[
                { key: 'taste', label: 'Taste/Flavor', color: 'from-blue-50 to-indigo-50', border: 'border-blue-100' },
                { key: 'variety', label: 'Variety', color: 'from-green-50 to-emerald-50', border: 'border-green-100' },
                { key: 'value', label: 'Value for Money', color: 'from-purple-50 to-pink-50', border: 'border-purple-100' },
                { key: 'dietary', label: 'Special Dietary', color: 'from-yellow-50 to-amber-50', border: 'border-yellow-100' },
                { key: 'portion', label: 'Portion Size', color: 'from-red-50 to-rose-50', border: 'border-red-100' },
                { key: 'speed', label: 'Speed of Service', color: 'from-indigo-50 to-violet-50', border: 'border-indigo-100' },
                { key: 'cleanliness', label: 'Cleanliness', color: 'from-emerald-50 to-teal-50', border: 'border-emerald-100' },
                { key: 'service', label: 'Customer Service', color: 'from-pink-50 to-rose-50', border: 'border-pink-100' }
              ].map(({ key, label, color, border }) => (
                <div key={key} className={`bg-gradient-to-br ${color} p-6 rounded-xl border ${border}`}>
                  <h3 className="text-sm font-medium text-gray-800">{label}</h3>
                  <div className="mt-2 flex items-baseline">
                    <p className="text-3xl font-bold text-gray-900">
                      {feedbackStats[key] ? (feedbackStats[key] / feedbackStats.totalFeedbacks).toFixed(1) : '0.0'}
                    </p>
                    <p className="ml-2 text-sm text-gray-500">/ 5.0</p>
                  </div>
                  <div className="mt-2">
                    <div className="flex items-center">
                      <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-purple-500 to-pink-500"
                          style={{ width: `${(feedbackStats[key] / (feedbackStats.totalFeedbacks * 5)) * 100}%` }}
                        />
                      </div>
                      <span className="ml-2 text-sm text-gray-500">
                        {feedbackStats.totalFeedbacks} reviews
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </div>
      
      {/* Add Status Modal */}
      <AnimatePresence>
        {showStatusModal && (
          <StatusModal
            isOpen={showStatusModal}
            onClose={() => setShowStatusModal(false)}
            type={statusModalData.type}
            message={statusModalData.message}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
