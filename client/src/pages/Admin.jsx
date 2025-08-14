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
  
  // Smart caching system with memory management
  const [tabCache, setTabCache] = useState({});
  const [cacheExpiry, setCacheExpiry] = useState({});
  const [cacheTimestamps, setCacheTimestamps] = useState({});
  const [loadingStates, setLoadingStates] = useState({});
  
  // Cache configuration
  const MAX_CACHE_SIZE = 5;
  const CACHE_DURATION = 2 * 60 * 1000; // 2 minutes
  const isMountedRef = useRef(true);
  
  // Legacy state variables (will be gradually replaced by cache)
  const [stats, setStats] = useState({});
  const [rewards, setRewards] = useState({ name: '', cost: '', description: '' });
  const [rewardImage, setRewardImage] = useState(null);
  const [rewardImagePreview, setRewardImagePreview] = useState(null);
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

  // Feedback export state
  const [feedbackStartDate, setFeedbackStartDate] = useState('');
  const [feedbackEndDate, setFeedbackEndDate] = useState('');
  const [feedbackComments, setFeedbackComments] = useState([]);
  const [isExportingFeedback, setIsExportingFeedback] = useState(false);

  // Redemption history state
  const [redemptionHistory, setRedemptionHistory] = useState([]);
  const [redemptionPage, setRedemptionPage] = useState(1);
  const [redemptionTotalPages, setRedemptionTotalPages] = useState(1);
  const [redemptionSearchTerm, setRedemptionSearchTerm] = useState('');
  const [isRedemptionLoading, setIsRedemptionLoading] = useState(false);

  const token = user.token;
  const baseUrl = import.meta.env.VITE_API_BASE_URL;

  // Cache management functions
  const isCacheValid = (tabName) => {
    const expiry = cacheExpiry[tabName];
    return expiry && Date.now() < expiry;
  };

  const getCachedData = (tabName) => {
    return isCacheValid(tabName) ? tabCache[tabName] : null;
  };

  const cleanupCache = () => {
    const now = Date.now();
    const validEntries = Object.entries(cacheExpiry)
      .filter(([key, expiry]) => now < expiry)
      .sort(([,a], [,b]) => a - b); // Sort by expiry time

    // Remove oldest entries if cache is too large
    if (validEntries.length > MAX_CACHE_SIZE) {
      const toRemove = validEntries.slice(0, validEntries.length - MAX_CACHE_SIZE);
      setTabCache(prev => {
        const newCache = { ...prev };
        toRemove.forEach(([key]) => delete newCache[key]);
        return newCache;
      });
      setCacheExpiry(prev => {
        const newExpiry = { ...prev };
        toRemove.forEach(([key]) => delete newExpiry[key]);
        return newExpiry;
      });
      setCacheTimestamps(prev => {
        const newTimestamps = { ...prev };
        toRemove.forEach(([key]) => delete newTimestamps[key]);
        return newTimestamps;
      });
    }
  };

  const setCachedData = (tabName, data) => {
    if (!isMountedRef.current) return; // Don't update if component is unmounted
    
    cleanupCache(); // Clean before adding new data
    setTabCache(prev => ({ ...prev, [tabName]: data }));
    setCacheExpiry(prev => ({ 
      ...prev, 
      [tabName]: Date.now() + CACHE_DURATION 
    }));
    setCacheTimestamps(prev => ({ 
      ...prev, 
      [tabName]: Date.now() 
    }));
  };

  const clearCache = (tabName) => {
    setTabCache(prev => {
      const newCache = { ...prev };
      delete newCache[tabName];
      return newCache;
    });
    setCacheExpiry(prev => {
      const newExpiry = { ...prev };
      delete newExpiry[tabName];
      return newExpiry;
    });
    setCacheTimestamps(prev => {
      const newTimestamps = { ...prev };
      delete newTimestamps[tabName];
      return newTimestamps;
    });
  };

  const setLoadingState = (tabName, loading) => {
    if (!isMountedRef.current) return;
    setLoadingStates(prev => ({ ...prev, [tabName]: loading }));
  };

  // Component cleanup on unmount
  useEffect(() => {
    isMountedRef.current = true;
    
    return () => {
      isMountedRef.current = false;
    };
  }, []);

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
                    type === 'success' ? 'bg-green-100' : 
                    type === 'warning' ? 'bg-yellow-100' : 'bg-red-100'
                  }`}
                >
                  {type === 'success' ? (
                    <svg className="h-8 w-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                    </svg>
                  ) : type === 'warning' ? (
                    <ExclamationIcon className="h-8 w-8 text-yellow-600" aria-hidden="true" />
                  ) : (
                    <ExclamationIcon className="h-8 w-8 text-red-600" aria-hidden="true" />
                  )}
                </div>
                <div className="mt-4 text-center sm:mt-0 sm:ml-6 sm:text-left flex-1">
                  <h3 className={`text-2xl font-bold ${
                    type === 'success' ? 'text-green-700' : 
                    type === 'warning' ? 'text-yellow-700' : 'text-red-700'
                  }`} id="modal-headline">
                    {type === 'success' ? 'Success!' : type === 'warning' ? 'Warning' : 'Error'}
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
                    : type === 'warning'
                    ? 'bg-yellow-600 hover:bg-yellow-700 focus:ring-yellow-500'
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
    setTimeout(() => setShowStatusModal(false), 3000);
  };

  // Optimized fetchData function with caching and memory management
  const fetchData = async (page = 1, search = '', forceRefresh = false) => {
    const tabName = 'overview';

    // --- REMOVE CACHING FOR USERS ---
    // Always fetch fresh user data for each page/search

    try {
      // Only show loading state for initial load or user search, not during polling
      if (page === 1 && !search && !isOverviewPolling) {
        setIsLoading(true);
      } else if (search) {
        setIsPageLoading(true);
      }

      // Debug log
      console.log('[fetchData] Fetching users for page:', page, 'search:', search);

      // Use AbortController to prevent memory leaks
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 second timeout

      // Use Promise.allSettled instead of Promise.all to handle partial failures
      const [statsRes, usersRes, claimedRes, rewardsRes, borrowedRes] = await Promise.allSettled([
        axios.get(`${baseUrl}/api/admin/stats`, {
          headers: { Authorization: `Bearer ${token}` },
          signal: controller.signal
        }),
        axios.get(`${baseUrl}/api/admin/users?page=${page}&limit=10&search=${search}`, {
          headers: { Authorization: `Bearer ${token}` },
          signal: controller.signal
        }),
        axios.get(`${baseUrl}/api/admin/claimed-rewards`, {
          headers: { Authorization: `Bearer ${token}` },
          signal: controller.signal
        }),
        axios.get(`${baseUrl}/api/rewards`, {
          headers: { Authorization: `Bearer ${token}` },
          signal: controller.signal
        }),
        axios.get(`${baseUrl}/api/admin/borrowed-items`, {
          headers: { Authorization: `Bearer ${token}` },
          signal: controller.signal
        })
      ]);

      clearTimeout(timeoutId);

      // Only update state if component is still mounted
      if (!isMountedRef.current) return;

      // Process and store data efficiently
      const processedData = {
        stats: statsRes.status === 'fulfilled' ? statsRes.value.data : {},
        users: usersRes.status === 'fulfilled' ? usersRes.value.data.users : [],
        claimedRewards: claimedRes.status === 'fulfilled' ? (claimedRes.value.data.claimedRewards || []) : [],
        availableRewards: rewardsRes.status === 'fulfilled' ? rewardsRes.value.data : [],
        totalBorrowedItems: borrowedRes.status === 'fulfilled' ? borrowedRes.value.data.data.length : 0,
        // currentPage: usersRes.status === 'fulfilled' ? usersRes.value.data.currentPage : 1, // Do not set currentPage from API
        totalPages: usersRes.status === 'fulfilled' ? usersRes.value.data.totalPages : 1,
        totalUsers: usersRes.status === 'fulfilled' ? usersRes.value.data.totalUsers : 0
      };

      // Debug log API response for users
      if (usersRes.status === 'fulfilled') {
        console.log('[fetchData] API users response:', usersRes.value.data);
      } else {
        console.log('[fetchData] API users response error:', usersRes.reason);
      }

      // Update legacy state for backward compatibility
      setStats(processedData.stats);
      setUsers(processedData.users);
      setClaimedRewards(processedData.claimedRewards);
      setAvailableRewards(processedData.availableRewards);
      setTotalBorrowedItems(processedData.totalBorrowedItems);
      // setCurrentPage(processedData.currentPage); // Do not set currentPage from API
      setTotalPages(processedData.totalPages);
      setTotalUsers(processedData.totalUsers);

      // Do not cache users list for paginated data
      // setCachedData(tabName, processedData);

      return processedData;
    } catch (error) {
      if (error.name === 'AbortError') {
        console.log('Request was aborted due to timeout');
      } else {
        console.error("Error fetching data:", error);
        // setError("Failed to fetch data. Please try again."); // Remove this line to prevent popup
      }
    } finally {
      // Only clear loading states if we're not in polling mode and component is mounted
      if (!isOverviewPolling && isMountedRef.current) {
        setIsLoading(false);
      }
      if (isMountedRef.current) {
        setIsPageLoading(false);
      }
    }
  };

  // Optimized useEffect for overview tab with smart caching
  useEffect(() => {
    let pollInterval;
    let isMounted = true;

    if (activeTab === 'overview') {
      const loadData = async () => {
        if (!isMounted || !isMountedRef.current) return;
        
        try {
          // Check cache first
          const cached = getCachedData('overview');
          if (cached) {
            // Use cached data, no loading state
            setStats(cached.stats);
            setUsers(cached.users);
            setClaimedRewards(cached.claimedRewards);
            setAvailableRewards(cached.availableRewards);
            setTotalBorrowedItems(cached.totalBorrowedItems);
            setCurrentPage(cached.currentPage);
            setTotalPages(cached.totalPages);
            setTotalUsers(cached.totalUsers);
            setIsLoading(false);
          } else {
            // Fetch fresh data
            setIsOverviewPolling(true);
            await fetchData();
          }
        } catch (error) {
          console.error('Error loading overview data:', error);
        }
      };

      loadData();
      
      // Set up polling for background updates (silent refresh)
      pollInterval = setInterval(async () => {
        if (isMounted && isMountedRef.current) {
          try {
            await fetchData(1, '', true); // Force refresh for polling
          } catch (error) {
            console.error('Error during background refresh:', error);
          }
        }
      }, 120000); // 120 seconds
    }

    // Cleanup function
    return () => {
      isMounted = false;
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
  };

  // Add search input handler
  const handleSearch = (e) => {
    setSearchTerm(e.target.value);
    setCurrentPage(1); // Always reset to first page on new search
  };

  // Debounced effect for pagination and search
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchData(currentPage, searchTerm);
    }, 500);
    return () => clearTimeout(timer);
  }, [searchTerm, currentPage]);

  const handleRewardImageChange = (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setModalMessage('Please select a valid image file (JPEG/PNG).');
      setShowErrorModal(true);
      return;
    }

    const MAX_SIZE_BYTES = 5 * 1024 * 1024; // 5MB
    if (file.size > MAX_SIZE_BYTES) {
      setModalMessage('Image size should be less than 5MB.');
      setShowErrorModal(true);
      return;
    }

    setRewardImage(file);

    const reader = new FileReader();
    reader.onloadend = () => setRewardImagePreview(reader.result);
    reader.readAsDataURL(file);
  };

  const handleCreateReward = async () => {
    if (!rewards.name.trim() || !rewards.cost || !rewards.description.trim()) {
      setModalMessage('Please fill all fields including the description');
      setShowErrorModal(true);
      return;
    }

    try {
      // Prepare JSON payload; include base64 image if provided
      let imageBase64 = null;
      if (rewardImage) {
        // Prefer already generated preview
        if (rewardImagePreview) {
          imageBase64 = rewardImagePreview;
        } else {
          imageBase64 = await new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsDataURL(rewardImage);
          });
        }
      }

      const payload = {
        name: rewards.name,
        cost: rewards.cost,
        description: rewards.description,
        imageBase64
      };

      await axios.post(`${baseUrl}/api/admin/reward`, payload, { headers: { Authorization: `Bearer ${token}` } });

      setRewards({ name: '', cost: '', description: '' });
      setRewardImage(null);
      setRewardImagePreview(null);
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

  // Update borrowed items polling with caching
  useEffect(() => {
    let pollInterval;
    let isMounted = true;
    
    if (activeTab === 'borrowed') {
      const loadBorrowedData = async () => {
        if (!isMounted || !isMountedRef.current) return;
        
        try {
          // Check cache first
          const cached = getCachedData('borrowed');
          if (cached) {
            setBorrowedItems(cached.borrowedItems);
            return;
          }
          
          // Fetch fresh data
          await fetchBorrowedItems();
        } catch (error) {
          console.error('Error loading borrowed data:', error);
        }
      };

      loadBorrowedData();
      
      // Increase polling interval to 120 seconds
      pollInterval = setInterval(async () => {
        if (isMounted && isMountedRef.current) {
          try {
            await fetchBorrowedItems(true); // Force refresh
          } catch (error) {
            console.error('Error during borrowed items refresh:', error);
          }
        }
      }, 120000);
    }
    
    return () => {
      isMounted = false;
      if (pollInterval) clearInterval(pollInterval);
    };
  }, [activeTab, token]);

  // Enhanced fetchBorrowedItems with retry logic and better error handling
  const fetchBorrowedItems = async (forceRefresh = false, retryCount = 0) => {
    const tabName = 'borrowed';
    const maxRetries = 3;
    const retryDelay = 1000 * Math.pow(2, retryCount); // Exponential backoff
    
    // Check cache first (unless force refresh)
    if (!forceRefresh && retryCount === 0) {
      const cached = getCachedData(tabName);
      if (cached) {
        setBorrowedItems(cached.borrowedItems);
        setError(''); // Clear any previous errors
        return cached;
      }
    }

    try {
      // Only show loading state for initial load, not during retries
      if (retryCount === 0) {
        setLoadingState(tabName, true);
        setError(''); // Clear previous errors
      }

      // Use AbortController with longer timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // Increased to 30 seconds

      const queryParams = new URLSearchParams();
      if (startDate) queryParams.append('startDate', startDate);
      if (endDate) queryParams.append('endDate', endDate);
      
      const res = await axios.get(`${baseUrl}/api/admin/borrowed-items?${queryParams}`, {
        headers: { Authorization: `Bearer ${token}` },
        signal: controller.signal,
        timeout: 25000 // Axios timeout as backup
      });
      
      clearTimeout(timeoutId);

      if (!isMountedRef.current) return;

      // Validate response data
      if (!res.data || !Array.isArray(res.data.data)) {
        throw new Error('Invalid response format from server');
      }

      // Only process and update state if we have new data
      const items = res.data.data;
      const sortedBorrowed = items
        .filter(item => item.status === 'borrowed')
        .sort((a, b) => new Date(b.borrowTime) - new Date(a.borrowTime));
      
      setBorrowedItems(sortedBorrowed);
      setError(''); // Clear any previous errors
      
      // Cache the data
      setCachedData(tabName, { borrowedItems: sortedBorrowed });
      
      return { borrowedItems: sortedBorrowed };
    } catch (err) {
      console.error(`Error fetching borrowed items (attempt ${retryCount + 1}):`, err);
      
      // Handle different error types
      if (err.name === 'AbortError') {
        console.log('Request was aborted due to timeout');
      } else if (err.code === 'ECONNABORTED' || err.message.includes('timeout')) {
        console.log('Request timed out');
      } else if (err.response?.status === 401) {
        setError('Session expired. Please login again.');
        // Don't retry on auth errors
        return;
      }
      
      // Retry logic with exponential backoff
      if (retryCount < maxRetries && isMountedRef.current) {
        console.log(`Retrying in ${retryDelay}ms... (attempt ${retryCount + 1}/${maxRetries})`);
        await new Promise(resolve => setTimeout(resolve, retryDelay));
        
        // Only retry if component is still mounted and on the same tab
        if (isMountedRef.current && activeTab === 'borrowed') {
          return fetchBorrowedItems(forceRefresh, retryCount + 1);
        }
      } else {
        // Final failure after all retries
        const errorMessage = err.response?.status === 500 
          ? 'Server error. Please try again later.'
          : err.message.includes('Network Error')
          ? 'Network connection error. Please check your internet connection.'
          : 'Failed to fetch borrowed items. Please try refreshing the page.';
        
        setError(errorMessage);
      }
    } finally {
      // Only clear loading state if component is mounted and this is the initial request
      if (isMountedRef.current && retryCount === 0) {
        setLoadingState(tabName, false);
      }
    }
  };

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

  // Enhanced fetchReturnedItems with retry logic and better error handling
  const fetchReturnedItems = async (forceRefresh = false, retryCount = 0) => {
    const tabName = 'returned';
    const maxRetries = 3;
    const retryDelay = 1000 * Math.pow(2, retryCount); // Exponential backoff
    
    // Check cache first (unless force refresh)
    if (!forceRefresh && retryCount === 0) {
      const cached = getCachedData(tabName);
      if (cached) {
        setReturnedItems(cached.returnedItems);
        setError(''); // Clear any previous errors
        return cached;
      }
    }

    try {
      // Only show loading state for initial load, not during retries
      if (retryCount === 0) {
        setLoadingState(tabName, true);
        setError(''); // Clear previous errors
      }

      // Use AbortController with longer timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // Increased to 30 seconds

      const queryParams = new URLSearchParams();
      if (startDate) queryParams.append('startDate', startDate);
      if (endDate) queryParams.append('endDate', endDate);
      
      const res = await axios.get(`${baseUrl}/api/admin/returned-history?${queryParams}`, {
        headers: { Authorization: `Bearer ${token}` },
        signal: controller.signal,
        timeout: 25000 // Axios timeout as backup
      });
      
      clearTimeout(timeoutId);

      if (!isMountedRef.current) return;

      // Validate response data
      if (!res.data || !Array.isArray(res.data.data)) {
        throw new Error('Invalid response format from server');
      }

      const items = res.data.data;
      const sortedReturned = items.sort((a, b) => new Date(b.returnTime) - new Date(a.returnTime));
      setReturnedItems(sortedReturned);
      setError(''); // Clear any previous errors
      
      // Cache the data
      setCachedData(tabName, { returnedItems: sortedReturned });
      
      return { returnedItems: sortedReturned };
    } catch (err) {
      console.error(`Error fetching returned items (attempt ${retryCount + 1}):`, err);
      
      // Handle different error types
      if (err.name === 'AbortError') {
        console.log('Request was aborted due to timeout');
      } else if (err.code === 'ECONNABORTED' || err.message.includes('timeout')) {
        console.log('Request timed out');
      } else if (err.response?.status === 401) {
        setError('Session expired. Please login again.');
        // Don't retry on auth errors
        return;
      }
      
      // Retry logic with exponential backoff
      if (retryCount < maxRetries && isMountedRef.current) {
        console.log(`Retrying in ${retryDelay}ms... (attempt ${retryCount + 1}/${maxRetries})`);
        await new Promise(resolve => setTimeout(resolve, retryDelay));
        
        // Only retry if component is still mounted and on the same tab
        if (isMountedRef.current && activeTab === 'returned') {
          return fetchReturnedItems(forceRefresh, retryCount + 1);
        }
      } else {
        // Final failure after all retries
        const errorMessage = err.response?.status === 500 
          ? 'Server error. Please try again later.'
          : err.message.includes('Network Error')
          ? 'Network connection error. Please check your internet connection.'
          : 'Failed to fetch returned items. Please try refreshing the page.';
        
        setError(errorMessage);
      }
    } finally {
      // Only clear loading state if component is mounted and this is the initial request
      if (isMountedRef.current && retryCount === 0) {
        setLoadingState(tabName, false);
      }
    }
  };

  // Polling for returned tab with caching
  useEffect(() => {
    let pollInterval;
    let isMounted = true;
    
    if (activeTab === 'returned') {
      const loadReturnedData = async () => {
        if (!isMounted || !isMountedRef.current) return;
        
        try {
          // Check cache first
          const cached = getCachedData('returned');
          if (cached) {
            setReturnedItems(cached.returnedItems);
            return;
          }
          
          // Fetch fresh data
          await fetchReturnedItems();
        } catch (error) {
          console.error('Error loading returned data:', error);
        }
      };

      loadReturnedData();
      
      pollInterval = setInterval(async () => {
        if (isMounted && isMountedRef.current) {
          try {
            await fetchReturnedItems(true); // Force refresh
          } catch (error) {
            console.error('Error during returned items refresh:', error);
          }
        }
      }, 120000);
    }
    
    return () => {
      isMounted = false;
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

  // Add new function to fetch points usage with caching
  const fetchPointsUsage = async (page = 1, search = '', forceRefresh = false) => {
    const tabName = 'points-usage';
    
    // Check cache first (unless force refresh)
    if (!forceRefresh) {
      const cached = getCachedData(tabName);
      if (cached && cached.page === page && cached.search === search) {
        setPointsUsage(cached.pointsUsage);
        setPointsUsagePage(cached.currentPage);
        setPointsUsageTotalPages(cached.totalPages);
        return cached;
      }
    }

    try {
      setIsPointsUsageLoading(true);
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);

      const response = await axios.get(
        `${baseUrl}/api/admin/points-usage?page=${page}&limit=10&search=${search}`,
        { 
          headers: { Authorization: `Bearer ${token}` },
          signal: controller.signal
        }
      );
      
      clearTimeout(timeoutId);

      if (!isMountedRef.current) return;

      const data = {
        pointsUsage: response.data.pointsUsage,
        currentPage: response.data.currentPage,
        totalPages: response.data.totalPages,
        page,
        search
      };

      setPointsUsage(data.pointsUsage);
      setPointsUsagePage(data.currentPage);
      setPointsUsageTotalPages(data.totalPages);
      
      // Cache the data
      setCachedData(tabName, data);
      
      return data;
    } catch (error) {
      if (error.name === 'AbortError') {
        console.log('Points usage request was aborted');
      } else {
        console.error('Error fetching points usage:', error);
        setError('Failed to fetch points usage records');
      }
    } finally {
      if (isMountedRef.current) {
        setIsPointsUsageLoading(false);
      }
    }
  };

  // Add new function to fetch redemption history with caching
  const fetchRedemptionHistory = async (page = 1, search = '', forceRefresh = false) => {
    const tabName = 'redemption-history';
    
    // Check cache first (unless force refresh)
    if (!forceRefresh) {
      const cached = getCachedData(tabName);
      if (cached && cached.page === page && cached.search === search) {
        setRedemptionHistory(cached.redemptionHistory);
        setRedemptionPage(cached.currentPage);
        setRedemptionTotalPages(cached.totalPages);
        return cached;
      }
    }

    try {
      setIsRedemptionLoading(true);
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);

      const response = await axios.get(
        `${baseUrl}/api/admin/redemption-history?page=${page}&limit=10&search=${search}`,
        { 
          headers: { Authorization: `Bearer ${token}` },
          signal: controller.signal
        }
      );
      
      clearTimeout(timeoutId);

      if (!isMountedRef.current) return;

      const data = {
        redemptionHistory: response.data.redemptionHistory,
        currentPage: response.data.currentPage,
        totalPages: response.data.totalPages,
        page,
        search
      };

      setRedemptionHistory(data.redemptionHistory);
      setRedemptionPage(data.currentPage);
      setRedemptionTotalPages(data.totalPages);
      
      // Cache the data
      setCachedData(tabName, data);
      
      return data;
    } catch (error) {
      if (error.name === 'AbortError') {
        console.log('Redemption history request was aborted');
      } else {
        console.error('Error fetching redemption history:', error);
        setError('Failed to fetch redemption history records');
      }
    } finally {
      if (isMountedRef.current) {
        setIsRedemptionLoading(false);
      }
    }
  };

  // Add effect for points usage tab with caching
  useEffect(() => {
    let isMounted = true;
    
    if (activeTab === 'points-usage') {
      const loadPointsUsageData = async () => {
        if (!isMounted || !isMountedRef.current) return;
        
        try {
          // Check cache first
          const cached = getCachedData('points-usage');
          if (cached && cached.page === pointsUsagePage && cached.search === pointsUsageSearchTerm) {
            setPointsUsage(cached.pointsUsage);
            setPointsUsagePage(cached.currentPage);
            setPointsUsageTotalPages(cached.totalPages);
            return;
          }
          
          // Fetch fresh data
          await fetchPointsUsage(pointsUsagePage, pointsUsageSearchTerm);
        } catch (error) {
          console.error('Error loading points usage data:', error);
        }
      };

      loadPointsUsageData();
    }
    
    return () => {
      isMounted = false;
    };
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

  // Add effect for redemption history tab with caching
  useEffect(() => {
    let isMounted = true;
    
    if (activeTab === 'redemption-history') {
      const loadRedemptionHistoryData = async () => {
        if (!isMounted || !isMountedRef.current) return;
        
        try {
          // Check cache first
          const cached = getCachedData('redemption-history');
          if (cached && cached.page === redemptionPage && cached.search === redemptionSearchTerm) {
            setRedemptionHistory(cached.redemptionHistory);
            setRedemptionPage(cached.currentPage);
            setRedemptionTotalPages(cached.totalPages);
            return;
          }
          
          // Fetch fresh data
          await fetchRedemptionHistory(redemptionPage, redemptionSearchTerm);
        } catch (error) {
          console.error('Error loading redemption history data:', error);
        }
      };

      loadRedemptionHistoryData();
    }
    
    return () => {
      isMounted = false;
    };
  }, [activeTab, redemptionPage, redemptionSearchTerm]);

  // Add redemption history search handler
  const handleRedemptionHistorySearch = (e) => {
    setRedemptionSearchTerm(e.target.value);
    setRedemptionPage(1);
  };

  // Add redemption history page change handler
  const handleRedemptionHistoryPageChange = (newPage) => {
    setRedemptionPage(newPage);
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

    // Format date for display (Philippine Time)
    const formatDate = (dateString) => {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric',
        timeZone: 'Asia/Manila'
      });
    };

    // Calculate column widths based on type
    const columnWidths = type === 'borrowed' 
      ? { studentId: '15%', orderId: '15%', items: '35%', borrowTime: '35%' }
      : { studentId: '15%', orderId: '15%', items: '20%', borrowTime: '25%', returnTime: '25%' };

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
              <View style={[styles.tableCol, { width: columnWidths.orderId }]}>
                <Text style={styles.headerCell}>Order ID</Text>
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
            </View>
            {data.map((item, index) => (
              <View key={index} style={styles.tableRow}>
                <View style={[styles.tableCol, { width: columnWidths.studentId }]}>
                  <Text style={styles.tableCell}>{item.studentIdNumber}</Text>
                </View>
                <View style={[styles.tableCol, { width: columnWidths.orderId }]}>
                  <Text style={styles.tableCell}>{item.orderId || 'N/A'}</Text>
                </View>
                <View style={[styles.tableCol, { width: columnWidths.items }]}>
                  <Text style={styles.tableCell}>{item.items.map(i => `${i.name} (x${i.quantity})`).join('; ')}</Text>
                </View>
                <View style={[styles.tableCol, { width: columnWidths.borrowTime }]}>
                  <Text style={styles.tableCell}>{new Date(item.borrowTime).toLocaleString('en-US', { timeZone: 'Asia/Manila' })}</Text>
                </View>
                {type === 'returned' && (
                  <View style={[styles.tableCol, { width: columnWidths.returnTime }]}>
                    <Text style={styles.tableCell}>{new Date(item.returnTime).toLocaleString('en-US', { timeZone: 'Asia/Manila' })}</Text>
                  </View>
                )}
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
      
      // Add limit parameter based on format
      const limit = format === 'pdf' ? 1000 : 5000;
      queryParams.append('limit', limit);
      
      const endpoint = type === 'borrowed' ? 'export/borrowed-items' : 'export/returned-items';
      
      // Add timeout to the request
      const res = await axios.get(`${baseUrl}/api/admin/${endpoint}?${queryParams}`, {
        headers: { Authorization: `Bearer ${token}` },
        timeout: 30000 // 30 second timeout
      });
      
      const data = res.data.data;
      const totalCount = res.data.totalCount;
      const limited = res.data.limited;

      if (!data || data.length === 0) {
        showStatusMessage('error', 'No data found for the selected date range');
        return;
      }

      // Show warning if data was limited
      if (limited && totalCount) {
        console.warn(`[Export Debug] Data was limited: showing ${data.length} out of ${totalCount} total items`);
        showStatusMessage('warning', `Showing ${data.length} out of ${totalCount} total items. Consider using a smaller date range for complete data.`);
      }

      // Add data validation and size limits for PDF generation
      console.log(`[Export Debug] Processing ${data.length} items for ${type} export`);
      
      // Limit data size for PDF generation to prevent memory issues
      const MAX_PDF_ITEMS = 1000; // Limit to 1000 items for PDF
      const MAX_EXCEL_ITEMS = 10000; // Limit to 10000 items for Excel
      
      if (format === 'pdf' && data.length > MAX_PDF_ITEMS) {
        showStatusMessage('error', `Too many items (${data.length}) for PDF export. Please use Excel format or reduce the date range. Maximum allowed: ${MAX_PDF_ITEMS} items.`);
        return;
      }
      
      if (format === 'excel' && data.length > MAX_EXCEL_ITEMS) {
        showStatusMessage('error', `Too many items (${data.length}) for Excel export. Please reduce the date range. Maximum allowed: ${MAX_EXCEL_ITEMS} items.`);
        return;
      }

      if (format === 'excel') {
        try {
          const workbook = new ExcelJS.Workbook();
          const worksheet = workbook.addWorksheet('Items Report');
          
          // Define columns based on type with exact PDF widths
          const columns = type === 'borrowed' 
            ? [
                { header: 'Student ID', key: 'studentId', width: 15 },
                { header: 'Order ID', key: 'orderId', width: 15 },
                { header: 'Items', key: 'items', width: 35 },
                { header: 'Borrow Time', key: 'borrowTime', width: 35 }
              ]
            : [
                { header: 'Student ID', key: 'studentId', width: 15 },
                { header: 'Order ID', key: 'orderId', width: 15 },
                { header: 'Items', key: 'items', width: 20 },
                { header: 'Borrow Time', key: 'borrowTime', width: 25 },
                { header: 'Return Time', key: 'returnTime', width: 25 }
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
              orderId: item.orderId || 'N/A',
              items: item.items.map(i => `${i.name} (x${i.quantity})`).join('; '),
              borrowTime: new Date(item.borrowTime).toLocaleString('en-US', { timeZone: 'Asia/Manila' }),
              returnTime: type === 'returned' ? new Date(item.returnTime).toLocaleString('en-US', { timeZone: 'Asia/Manila' }) : undefined
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

          // Validate data structure before PDF generation
          const validData = data.filter(item => {
            return item && 
                   item.studentIdNumber && 
                   item.items && 
                   Array.isArray(item.items) && 
                   item.borrowTime &&
                   (type !== 'returned' || item.returnTime);
          });

          if (validData.length !== data.length) {
            console.warn(`[Export Debug] Filtered out ${data.length - validData.length} invalid items`);
          }

          if (validData.length === 0) {
            showStatusMessage('error', 'No valid data found for PDF generation');
            return;
          }

          // Additional validation for array length issues
          const problematicItems = validData.filter(item => {
            return !item.items || 
                   !Array.isArray(item.items) || 
                   item.items.length === 0 ||
                   item.items.some(subItem => !subItem || !subItem.name || !subItem.quantity);
          });

          if (problematicItems.length > 0) {
            console.warn(`[Export Debug] Found ${problematicItems.length} items with problematic data structure`);
            console.warn('[Export Debug] Sample problematic item:', problematicItems[0]);
          }

          // Clean data to prevent circular references and ensure all values are serializable
          const cleanData = validData.map(item => ({
            studentIdNumber: String(item.studentIdNumber || ''),
            items: item.items.map(subItem => ({
              name: String(subItem.name || ''),
              quantity: Number(subItem.quantity || 0)
            })),
            borrowTime: item.borrowTime ? new Date(item.borrowTime).toISOString() : '',
            returnTime: item.returnTime ? new Date(item.returnTime).toISOString() : '',
            status: String(item.status || '')
          }));

          console.log(`[Export Debug] Generating PDF with ${cleanData.length} valid items`);

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
                  {cleanData.map((item, index) => (
                    <View key={index} style={styles.tableRow}>
                      <View style={[styles.tableCol, { width: '25%' }]}>
                        <Text style={styles.tableCell}>{item.studentIdNumber || 'N/A'}</Text>
                      </View>
                      <View style={[styles.tableCol, { width: '35%' }]}>
                        <Text style={styles.tableCell}>
                          {item.items && Array.isArray(item.items) 
                            ? item.items.map(i => `${i.name || 'Unknown'} (x${i.quantity || 0})`).join('; ')
                            : 'No items'
                          }
                        </Text>
                      </View>
                      <View style={[styles.tableCol, { width: '25%' }]}>
                        <Text style={styles.tableCell}>
                          {item.borrowTime ? new Date(item.borrowTime).toLocaleString('en-US', { timeZone: 'Asia/Manila' }) : 'N/A'}
                        </Text>
                      </View>
                      {type === 'returned' && (
                        <View style={[styles.tableCol, { width: '25%' }]}>
                          <Text style={styles.tableCell}>
                            {item.returnTime ? new Date(item.returnTime).toLocaleString() : 'N/A'}
                          </Text>
                        </View>
                      )}
                      <View style={[styles.tableCol, { width: '15%' }]}>
                        <Text style={styles.tableCell}>{item.status || 'N/A'}</Text>
                      </View>
                    </View>
                  ))}
                </View>
              </Page>
            </Document>
          );

          console.log('[Export Debug] PDF document created, generating blob...');
          
          // Add additional error handling for PDF generation
          let blob;
          try {
            blob = await pdf(doc).toBlob();
            console.log('[Export Debug] PDF blob generated successfully');
          } catch (pdfError) {
            console.error('[Export Debug] PDF blob generation failed:', pdfError);
            throw new Error(`PDF generation failed: ${pdfError.message}`);
          }
          
          console.log('[Export Debug] Creating download...');
          const url = window.URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `${type}-items-report.pdf`;
          document.body.appendChild(a);
          a.click();
          window.URL.revokeObjectURL(url);
          document.body.removeChild(a);
          console.log('[Export Debug] PDF download completed');
        } catch (error) {
          console.error('Error generating PDF:', error);
          console.error('Error details:', {
            message: error.message,
            stack: error.stack,
            dataLength: data.length
          });
          
          // Provide more specific error messages
          if (error.message.includes('Invalid array length')) {
            showStatusMessage('error', 'PDF generation failed due to data size. Please try Excel format or reduce the date range.');
          } else if (error.message.includes('PDF generation failed')) {
            showStatusMessage('error', `PDF generation failed: ${error.message}`);
          } else {
            showStatusMessage('error', `Error generating PDF file: ${error.message}`);
          }
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

      // Fetch fresh data for analytics export with breakdown
      const queryParams = new URLSearchParams();
      if (analyticsStartDate) queryParams.append('startDate', analyticsStartDate);
      if (analyticsEndDate) queryParams.append('endDate', analyticsEndDate);
      
      const res = await axios.get(`${baseUrl}/api/admin/borrowed-history?${queryParams}`, {
        headers: { Authorization: `Bearer ${token}` },
        timeout: 30000
      });
      
      const items = res.data.data;
      if (!items || items.length === 0) {
        showStatusMessage('error', 'No data found for the selected date range');
        return;
      }

      // Process data with individual item breakdown
      const processedData = processBorrowedItemsDataWithBreakdown(items);

      if (Object.keys(processedData).length === 0) {
        showStatusMessage('error', 'No data found for the selected date range');
        return;
      }

      if (format === 'excel') {
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('Borrowed Items Analytics');
        
        // Add headers for individual items
        worksheet.columns = [
          { header: 'Date', key: 'date', width: 20 },
          { header: 'Plate', key: 'Plate', width: 15 },
          { header: 'Bowl', key: 'Bowl', width: 15 },
          { header: 'Glass', key: 'Glass', width: 15 },
          { header: 'Spoon', key: 'Spoon', width: 15 },
          { header: 'Fork', key: 'Fork', width: 15 },
          { header: 'Saucer', key: 'Saucer', width: 15 }
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

        // Calculate totals
        const totals = {
          Plate: 0,
          Bowl: 0,
          Glass: 0,
          Spoon: 0,
          Fork: 0,
          Saucer: 0
        };

        // Add data rows and calculate totals
        Object.entries(processedData).forEach(([date, itemCounts]) => {
          worksheet.addRow({
            date: date,
            Plate: itemCounts.Plate,
            Bowl: itemCounts.Bowl,
            Glass: itemCounts.Glass,
            Spoon: itemCounts.Spoon,
            Fork: itemCounts.Fork,
            Saucer: itemCounts.Saucer
          });
          
          // Add to totals
          totals.Plate += itemCounts.Plate;
          totals.Bowl += itemCounts.Bowl;
          totals.Glass += itemCounts.Glass;
          totals.Spoon += itemCounts.Spoon;
          totals.Fork += itemCounts.Fork;
          totals.Saucer += itemCounts.Saucer;
        });

        // Add subtotal row
        const subtotalRow = worksheet.addRow({
          date: 'SUBTOTAL',
          Plate: totals.Plate,
          Bowl: totals.Bowl,
          Glass: totals.Glass,
          Spoon: totals.Spoon,
          Fork: totals.Fork,
          Saucer: totals.Saucer
        });
        
        // Add grand total row
        const grandTotal = Object.values(totals).reduce((sum, value) => sum + value, 0);
        const grandTotalRow = worksheet.addRow({
          date: 'GRAND TOTAL',
          Plate: grandTotal,
          Bowl: '',
          Glass: '',
          Spoon: '',
          Fork: '',
          Saucer: ''
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
                horizontal: 'center'
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

        // Style the subtotal row
        subtotalRow.eachCell((cell) => {
          cell.font = { 
            bold: true,
            size: 11,
            name: 'Helvetica-Bold'
          };
          cell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'e6e6e6' }
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
        
        // Style the grand total row
        grandTotalRow.eachCell((cell, colNumber) => {
          cell.font = { 
            bold: true,
            size: 11,
            name: 'Helvetica-Bold'
          };
          cell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'e6e6e6' }
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
                  {`From ${new Date(analyticsStartDate).toLocaleDateString('en-US', { timeZone: 'Asia/Manila' })} to ${new Date(analyticsEndDate).toLocaleDateString('en-US', { timeZone: 'Asia/Manila' })}`}
                </Text>
              </View>
              <View style={styles.table}>
                <View style={styles.tableRow}>
                  <View style={[styles.tableCol, { width: '20%' }]}>
                    <Text style={styles.headerCell}>Date</Text>
                  </View>
                  <View style={[styles.tableCol, { width: '13%' }]}>
                    <Text style={styles.headerCell}>Plate</Text>
                  </View>
                  <View style={[styles.tableCol, { width: '13%' }]}>
                    <Text style={styles.headerCell}>Bowl</Text>
                  </View>
                  <View style={[styles.tableCol, { width: '13%' }]}>
                    <Text style={styles.headerCell}>Glass</Text>
                  </View>
                  <View style={[styles.tableCol, { width: '13%' }]}>
                    <Text style={styles.headerCell}>Spoon</Text>
                  </View>
                  <View style={[styles.tableCol, { width: '13%' }]}>
                    <Text style={styles.headerCell}>Fork</Text>
                  </View>
                  <View style={[styles.tableCol, { width: '15%' }]}>
                    <Text style={styles.headerCell}>Saucer</Text>
                  </View>
                </View>
                {Object.entries(processedData).map(([date, itemCounts], index) => (
                  <View key={index} style={styles.tableRow}>
                    <View style={[styles.tableCol, { width: '20%' }]}>
                      <Text style={styles.tableCell}>{date}</Text>
                    </View>
                    <View style={[styles.tableCol, { width: '13%' }]}>
                      <Text style={styles.tableCell}>{itemCounts.Plate}</Text>
                    </View>
                    <View style={[styles.tableCol, { width: '13%' }]}>
                      <Text style={styles.tableCell}>{itemCounts.Bowl}</Text>
                    </View>
                    <View style={[styles.tableCol, { width: '13%' }]}>
                      <Text style={styles.tableCell}>{itemCounts.Glass}</Text>
                    </View>
                    <View style={[styles.tableCol, { width: '13%' }]}>
                      <Text style={styles.tableCell}>{itemCounts.Spoon}</Text>
                    </View>
                    <View style={[styles.tableCol, { width: '13%' }]}>
                      <Text style={styles.tableCell}>{itemCounts.Fork}</Text>
                    </View>
                    <View style={[styles.tableCol, { width: '15%' }]}>
                      <Text style={styles.tableCell}>{itemCounts.Saucer}</Text>
                    </View>
                  </View>
                ))}
                
                {/* Subtotal and Grand Total Rows */}
                {(() => {
                  const totals = {
                    Plate: 0,
                    Bowl: 0,
                    Glass: 0,
                    Spoon: 0,
                    Fork: 0,
                    Saucer: 0
                  };
                  
                  // Calculate subtotals
                  Object.values(processedData).forEach(itemCounts => {
                    totals.Plate += itemCounts.Plate;
                    totals.Bowl += itemCounts.Bowl;
                    totals.Glass += itemCounts.Glass;
                    totals.Spoon += itemCounts.Spoon;
                    totals.Fork += itemCounts.Fork;
                    totals.Saucer += itemCounts.Saucer;
                  });
                  
                  // Calculate grand total
                  const grandTotal = Object.values(totals).reduce((sum, value) => sum + value, 0);
                  
                  return (
                    <>
                      {/* Subtotal Row */}
                      <View style={[styles.tableRow, { backgroundColor: '#f3f4f6' }]}>
                        <View style={[styles.tableCol, { width: '20%' }]}>
                          <Text style={[styles.tableCell, { fontWeight: 'bold' }]}>SUBTOTAL</Text>
                        </View>
                        <View style={[styles.tableCol, { width: '13%' }]}>
                          <Text style={[styles.tableCell, { fontWeight: 'bold' }]}>{totals.Plate}</Text>
                        </View>
                        <View style={[styles.tableCol, { width: '13%' }]}>
                          <Text style={[styles.tableCell, { fontWeight: 'bold' }]}>{totals.Bowl}</Text>
                        </View>
                        <View style={[styles.tableCol, { width: '13%' }]}>
                          <Text style={[styles.tableCell, { fontWeight: 'bold' }]}>{totals.Glass}</Text>
                        </View>
                        <View style={[styles.tableCol, { width: '13%' }]}>
                          <Text style={[styles.tableCell, { fontWeight: 'bold' }]}>{totals.Spoon}</Text>
                        </View>
                        <View style={[styles.tableCol, { width: '13%' }]}>
                          <Text style={[styles.tableCell, { fontWeight: 'bold' }]}>{totals.Fork}</Text>
                        </View>
                        <View style={[styles.tableCol, { width: '15%' }]}>
                          <Text style={[styles.tableCell, { fontWeight: 'bold' }]}>{totals.Saucer}</Text>
                        </View>
                      </View>
                      
                      {/* Grand Total Row */}
                      <View style={[styles.tableRow, { backgroundColor: '#e2e8f0' }]}>
                        <View style={[styles.tableCol, { width: '20%' }]}>
                          <Text style={[styles.tableCell, { fontWeight: 'bold', fontSize: 12 }]}>GRAND TOTAL</Text>
                        </View>
                        <View style={[styles.tableCol, { width: '13%' }]}>
                          <Text style={[styles.tableCell, { fontWeight: 'bold', fontSize: 12 }]}>{grandTotal}</Text>
                        </View>
                      </View>
                    </>
                  );
                })()}
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

  // Fetch feedback comments with date range
  const fetchFeedbackComments = async (startDate, endDate) => {
    try {
      setIsExportingFeedback(true);
      const response = await axios.get(`${baseUrl}/api/admin/feedback-comments`, {
        headers: { Authorization: `Bearer ${token}` },
        params: {
          startDate: startDate,
          endDate: endDate
        }
      });
      
      if (response.data && response.data.feedbackComments) {
        setFeedbackComments(response.data.feedbackComments);
        return response.data.feedbackComments;
      }
      return [];
    } catch (error) {
      console.error('Error fetching feedback comments:', error);
      showStatusMessage('error', 'Failed to fetch feedback comments');
      return [];
    } finally {
      setIsExportingFeedback(false);
    }
  };

  // Export feedback comments to Excel
  const handleExportFeedbackComments = async () => {
    if (!feedbackStartDate || !feedbackEndDate) {
      showStatusMessage('error', 'Please select both start and end dates');
      return;
    }

    try {
      setIsExportingFeedback(true);
      
      // Fetch feedback comments for the selected date range
      const comments = await fetchFeedbackComments(feedbackStartDate, feedbackEndDate);
      
      if (!comments || comments.length === 0) {
        showStatusMessage('error', 'No feedback comments found for the selected date range');
        return;
      }

      // Create a new workbook
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('Feedback Comments');

      // Set up the header row
      const headerRow = worksheet.addRow([
        'Date',
        'Comments'
      ]);

      // Style the header row
      headerRow.eachCell((cell) => {
        cell.font = { bold: true, color: { argb: 'FFFFFF' } };
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: '4F46E5' }
        };
        cell.border = {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' }
        };
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
      });

      // Add data rows
      comments.forEach((comment) => {
        const row = worksheet.addRow([
          new Date(comment.createdAt).toLocaleDateString(),
          comment.comments || 'No comments'
        ]);

        // Style data rows
        row.eachCell((cell, colNumber) => {
          cell.border = {
            top: { style: 'thin' },
            left: { style: 'thin' },
            bottom: { style: 'thin' },
            right: { style: 'thin' }
          };
          
          // Align cells
          if (colNumber === 1) {
            cell.alignment = { horizontal: 'center', vertical: 'middle' }; // Center date
          } else {
            cell.alignment = { vertical: 'middle', wrapText: true }; // Wrap text for comments
          }
        });
      });

      // Add summary statistics row
      const summaryRowIndex = worksheet.rowCount + 2;
      const summaryRow = worksheet.addRow([
        'TOTAL COMMENTS:',
        comments.length
      ]);

      // Style summary row
      summaryRow.eachCell((cell) => {
        cell.font = { bold: true };
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'F3F4F6' }
        };
        cell.border = {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' }
        };
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
      });

      // Auto-fit columns
      worksheet.columns.forEach((column) => {
        let maxLength = 0;
        column.eachCell({ includeEmpty: true }, (cell) => {
          const columnLength = cell.value ? cell.value.toString().length : 10;
          if (columnLength > maxLength) {
            maxLength = columnLength;
          }
        });
        column.width = Math.min(maxLength + 2, 50); // Cap at 50 characters
      });

      // Generate and download the file
      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `feedback-comments-${feedbackStartDate}-to-${feedbackEndDate}.xlsx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      showStatusMessage('success', `Successfully exported ${comments.length} feedback comments to Excel`);
    } catch (error) {
      console.error('Error exporting feedback comments:', error);
      showStatusMessage('error', 'Failed to export feedback comments');
    } finally {
      setIsExportingFeedback(false);
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

  // Add fetchFeedbackStats function with caching
  const fetchFeedbackStats = async (forceRefresh = false) => {
    const tabName = 'feedback';
    
    // Check cache first (unless force refresh)
    if (!forceRefresh) {
      const cached = getCachedData(tabName);
      if (cached) {
        setFeedbackStats(cached.feedbackStats);
        return cached;
      }
    }

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);

      const response = await axios.get(`${baseUrl}/api/admin/feedback-stats`, {
        headers: { Authorization: `Bearer ${token}` },
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);

      if (!isMountedRef.current) return;

      const data = { feedbackStats: response.data };
      setFeedbackStats(response.data);
      
      // Cache the data
      setCachedData(tabName, data);
      
      return data;
    } catch (error) {
      if (error.name === 'AbortError') {
        console.log('Feedback stats request was aborted');
      } else {
        console.error('Error fetching feedback stats:', error);
        setError('Failed to fetch feedback statistics');
      }
    }
  };

  // Add useEffect for feedback stats with caching
  useEffect(() => {
    let isMounted = true;
    
    if (activeTab === 'feedback') {
      const loadFeedbackData = async () => {
        if (!isMounted || !isMountedRef.current) return;
        
        try {
          // Check cache first
          const cached = getCachedData('feedback');
          if (cached) {
            setFeedbackStats(cached.feedbackStats);
            return;
          }
          
          // Fetch fresh data
          await fetchFeedbackStats();
        } catch (error) {
          console.error('Error loading feedback data:', error);
        }
      };

      loadFeedbackData();
    }
    
    return () => {
      isMounted = false;
    };
  }, [activeTab]);

  // Process borrowed items data for graph
  const processBorrowedItemsData = (items) => {
    const now = new Date();
    const data = {};
    
    // Define the breakdown for sets
    const setBreakdowns = {
      'Basic Set': [
        { name: 'Plate', quantity: 1 },
        { name: 'Spoon', quantity: 1 },
        { name: 'Fork', quantity: 1 }
        // Note: Tray is not in the individual items list, so we'll skip it
      ],
      'Complete Set': [
        { name: 'Plate', quantity: 1 },
        { name: 'Bowl', quantity: 1 },
        { name: 'Spoon', quantity: 1 },
        { name: 'Fork', quantity: 1 },
        { name: 'Glass', quantity: 1 }
        // Note: Tray is not in the individual items list, so we'll skip it
      ],
      'Spoon & Fork': [
        { name: 'Spoon', quantity: 1 },
        { name: 'Fork', quantity: 1 }
      ]
    };
    
    items.forEach(item => {
      const borrowDate = new Date(item.borrowTime);
      let key;
      
      if (timeRange === 'hour') {
        // Group by hour, showing only time in 12-hour format (Philippine Time)
        key = borrowDate.toLocaleString('en-US', {
          hour: 'numeric',
          hour12: true,
          timeZone: 'Asia/Manila'
        });
      } else if (timeRange === 'day') {
        // Group by day - use Philippine Time date format
        key = borrowDate.toLocaleDateString('en-CA', { timeZone: 'Asia/Manila' });
      } else {
        // Group by month (Philippine Time)
        const phDate = new Date(borrowDate.toLocaleString('en-US', { timeZone: 'Asia/Manila' }));
        key = `${phDate.getFullYear()}-${phDate.getMonth() + 1}`;
      }
      
      if (!data[key]) {
        data[key] = 0;
      }
      
      // Process each item in the borrow record with breakdown
      item.items.forEach(borrowedItem => {
        if (setBreakdowns[borrowedItem.name]) {
          // This is a set, break it down into individual items
          setBreakdowns[borrowedItem.name].forEach(breakdownItem => {
            data[key] += breakdownItem.quantity * borrowedItem.quantity;
          });
        } else {
          // This is an individual item
          data[key] += borrowedItem.quantity;
        }
      });
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

  // New function to process borrowed items data with individual item breakdown
  const processBorrowedItemsDataWithBreakdown = (items) => {
    const data = {};
    
    // Define the breakdown for sets
    const setBreakdowns = {
      'Basic Set': [
        { name: 'Plate', quantity: 1 },
        { name: 'Spoon', quantity: 1 },
        { name: 'Fork', quantity: 1 }
        // Note: Tray is not in the individual items list, so we'll skip it
      ],
      'Complete Set': [
        { name: 'Plate', quantity: 1 },
        { name: 'Bowl', quantity: 1 },
        { name: 'Spoon', quantity: 1 },
        { name: 'Fork', quantity: 1 },
        { name: 'Glass', quantity: 1 }
        // Note: Tray is not in the individual items list, so we'll skip it
      ],
      'Spoon & Fork': [
        { name: 'Spoon', quantity: 1 },
        { name: 'Fork', quantity: 1 }
      ]
    };
    
    items.forEach(item => {
      const borrowDate = new Date(item.borrowTime);
      let key;
      
      if (timeRange === 'hour') {
        // Group by hour, showing only time in 12-hour format (Philippine Time)
        key = borrowDate.toLocaleString('en-US', {
          hour: 'numeric',
          hour12: true,
          timeZone: 'Asia/Manila'
        });
      } else if (timeRange === 'day') {
        // Group by day - use Philippine Time date format
        key = borrowDate.toLocaleDateString('en-CA', { timeZone: 'Asia/Manila' });
      } else {
        // Group by month (Philippine Time)
        const phDate = new Date(borrowDate.toLocaleString('en-US', { timeZone: 'Asia/Manila' }));
        key = `${phDate.getFullYear()}-${phDate.getMonth() + 1}`;
      }
      
      if (!data[key]) {
        data[key] = {
          'Plate': 0,
          'Bowl': 0,
          'Glass': 0,
          'Spoon': 0,
          'Fork': 0,
          'Saucer': 0
        };
      }
      
      // Process each item in the borrow record
      item.items.forEach(borrowedItem => {
        if (setBreakdowns[borrowedItem.name]) {
          // This is a set, break it down into individual items
          setBreakdowns[borrowedItem.name].forEach(breakdownItem => {
            data[key][breakdownItem.name] += breakdownItem.quantity * borrowedItem.quantity;
          });
        } else {
          // This is an individual item
          if (data[key].hasOwnProperty(borrowedItem.name)) {
            data[key][borrowedItem.name] += borrowedItem.quantity;
          }
        }
      });
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
        queryParams.append('startDate', startOfDay.toISOString().split('T')[0]);
        queryParams.append('endDate', endOfDay.toISOString().split('T')[0]);
      } else if (timeRange === 'day') {
        // For daily view, fetch last 30 days by default, or use analytics date range if available
        if (analyticsStartDate && analyticsEndDate) {
          queryParams.append('startDate', analyticsStartDate);
          queryParams.append('endDate', analyticsEndDate);
        } else {
          const thirtyDaysAgo = new Date();
          thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
          const today = new Date();
          queryParams.append('startDate', thirtyDaysAgo.toISOString().split('T')[0]);
          queryParams.append('endDate', today.toISOString().split('T')[0]);
        }
      } else if (timeRange === 'month') {
        // For monthly view, fetch last 12 months by default, or use analytics date range if available
        if (analyticsStartDate && analyticsEndDate) {
          queryParams.append('startDate', analyticsStartDate);
          queryParams.append('endDate', analyticsEndDate);
        } else {
          const twelveMonthsAgo = new Date();
          twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);
          const today = new Date();
          queryParams.append('startDate', twelveMonthsAgo.toISOString().split('T')[0]);
          queryParams.append('endDate', today.toISOString().split('T')[0]);
        }
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
      const interval = setInterval(fetchBorrowedItemsForGraph, 60000); // Update every 60 seconds
      return () => clearInterval(interval);
    }
  }, [activeTab, timeRange, analyticsStartDate, analyticsEndDate]);

  // Add new handlers for analytics date changes
  const handleAnalyticsStartDateChange = (e) => {
    setAnalyticsStartDate(e.target.value);
  };

  const handleAnalyticsEndDateChange = (e) => {
    setAnalyticsEndDate(e.target.value);
  };

  // Auto-sync graph when both analytics dates are set
  useEffect(() => {
    if (analyticsStartDate && analyticsEndDate && activeTab === 'overview') {
      // Small delay to ensure state is updated
      const timer = setTimeout(() => {
        fetchBorrowedItemsForGraph();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [analyticsStartDate, analyticsEndDate, activeTab]);

  // Cache cleanup effect to prevent memory leaks
  useEffect(() => {
    const cleanup = () => {
      // Clean up data for tabs not currently active after a delay
      Object.keys(tabCache).forEach(tabName => {
        if (tabName !== activeTab) {
          // Only clear cache for tabs that haven't been accessed recently
          const timestamp = cacheTimestamps[tabName];
          if (timestamp && (Date.now() - timestamp) > CACHE_DURATION) {
            clearCache(tabName);
          }
        }
      });
    };

    // Cleanup after a delay to allow for quick tab switching
    const timeoutId = setTimeout(cleanup, 30000); // 30 seconds
    return () => clearTimeout(timeoutId);
  }, [activeTab, tabCache, cacheTimestamps]);

  // Removed full-screen loading animation - data loads in background now

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
                {/* Cache status indicator for debugging */}
                <p className="text-xs text-gray-400">
                  Cache: {Object.keys(tabCache).length}/{MAX_CACHE_SIZE} tabs | 
                  Active: {activeTab} | 
                  Memory: {Math.round((JSON.stringify(tabCache).length / 1024) * 100) / 100}KB
                </p>
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

      {/* Success Modal */}
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
                            className="mt-1 w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent text-gray-900"
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
                            className="mt-1 w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent text-gray-900"
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
                            className="mt-1 w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent text-gray-900"
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
            { id: 'redemption-history', icon: CurrencyDollarIcon, label: 'Redemption History' },
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
                <div>
                  <h3 className="text-lg font-semibold text-gray-800">Borrow Graph</h3>
                  {analyticsStartDate && analyticsEndDate ? (
                    <p className="text-sm text-green-600 mt-1">
                      ✓ Showing data from {new Date(analyticsStartDate).toLocaleDateString('en-US', { timeZone: 'Asia/Manila' })} to {new Date(analyticsEndDate).toLocaleDateString('en-US', { timeZone: 'Asia/Manila' })}
                    </p>
                  ) : (
                    <p className="text-sm text-gray-500 mt-1">
                      Showing default range ({timeRange === 'hour' ? 'today' : timeRange === 'day' ? 'last 30 days' : 'last 12 months'})
                    </p>
                  )}
                </div>
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
                          maxTicksLimit: 10,
                          callback: function(value, index, values) {
                            // Calculate appropriate step size based on data range
                            const maxValue = Math.max(...Object.values(borrowedItemsData));
                            const stepSize = Math.max(1, Math.ceil(maxValue / 10));
                            return value % stepSize === 0 ? value : '';
                          },
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
                <div className="md:col-span-3">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Reward Image (optional)</label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleRewardImageChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white"
                  />
                  {rewardImagePreview && (
                    <div className="mt-3 flex items-center space-x-3">
                      <img src={rewardImagePreview} alt="Preview" className="h-16 w-16 object-cover rounded-lg border" />
                      <button
                        type="button"
                        onClick={() => { setRewardImage(null); setRewardImagePreview(null); }}
                        className="px-3 py-1 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
                      >
                        Remove
                      </button>
                    </div>
                  )}
                  <p className="mt-2 text-xs text-gray-500">JPEG/PNG, up to 5MB.</p>
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
                <div className="flex items-center space-x-3">
                  <h2 className="text-2xl font-bold text-gray-800">Borrowed Items</h2>
                  {loadingStates.borrowed && (
                    <div className="flex items-center space-x-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-purple-600"></div>
                      <span className="text-sm text-gray-600">Loading data...</span>
                    </div>
                  )}
                </div>
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
                      Student ID
                    </th>
                    <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Order ID
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
                        {item.orderId || 'N/A'}
                      </td>
                      <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {item.items.map((i, index) => (
                          <div key={index}>
                            {i.name} (x{i.quantity})
                          </div>
                        ))}
                      </td>
                      <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(item.borrowTime).toLocaleString('en-US', { timeZone: 'Asia/Manila' })}
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
                <div className="flex items-center space-x-3">
                  <h2 className="text-2xl font-bold text-gray-800">Returned Items History</h2>
                  {loadingStates.returned && (
                    <div className="flex items-center space-x-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-purple-600"></div>
                      <span className="text-sm text-gray-600">Loading data...</span>
                    </div>
                  )}
                </div>
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
                      Student ID
                    </th>
                    <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Order ID
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
                        {item.orderId || 'N/A'}
                      </td>
                      <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {item.items.map((i, index) => (
                          <div key={index}>
                            {i.name} (x{i.quantity})
                          </div>
                        ))}
                      </td>
                      <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(item.borrowTime).toLocaleString('en-US', { timeZone: 'Asia/Manila' })}
                      </td>
                      <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(item.returnTime).toLocaleString('en-US', { timeZone: 'Asia/Manila' })}
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
                <p className="text-gray-600 mb-4">Export the borrowed data from the Overview tab. Use "Sync Graph" to update the borrow graph with the selected date range.</p>
                
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

                <div className="grid grid-cols-3 gap-4">
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
                  <button
                    onClick={() => {
                      if (analyticsStartDate && analyticsEndDate) {
                        fetchBorrowedItemsForGraph();
                        showStatusMessage('success', 'Graph updated with selected date range');
                      } else {
                        showStatusMessage('error', 'Please select both start and end dates first');
                      }
                    }}
                    className="w-full px-4 py-3 bg-green-600 text-white rounded-xl hover:bg-green-700 flex items-center justify-center space-x-2 transition-all transform hover:scale-105"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    <span>Sync Graph</span>
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
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <ChatAltIcon className="w-6 h-6 text-purple-600" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-gray-800">Feedback Statistics</h2>
                  <p className="text-gray-600 mt-1">Overall ratings from customer feedback</p>
                </div>
              </div>
              
              {/* Export Feedback Comments Section */}
              <div className="bg-gray-50 p-4 rounded-xl border border-gray-200">
                <h3 className="text-sm font-semibold text-gray-700 mb-3">Export Feedback Comments</h3>
                <div className="flex flex-col sm:flex-row gap-3">
                  <div className="flex flex-col">
                    <label className="text-xs text-gray-600 mb-1">Start Date</label>
                    <input
                      type="date"
                      value={feedbackStartDate}
                      onChange={(e) => setFeedbackStartDate(e.target.value)}
                      className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    />
                  </div>
                  <div className="flex flex-col">
                    <label className="text-xs text-gray-600 mb-1">End Date</label>
                    <input
                      type="date"
                      value={feedbackEndDate}
                      onChange={(e) => setFeedbackEndDate(e.target.value)}
                      className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    />
                  </div>
                  <div className="flex flex-col justify-end">
                    <button
                      onClick={handleExportFeedbackComments}
                      disabled={isExportingFeedback || !feedbackStartDate || !feedbackEndDate}
                      className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center space-x-2 text-sm font-medium transition-all transform hover:scale-105 disabled:hover:scale-100"
                    >
                      {isExportingFeedback ? (
                        <>
                          <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="m4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          <span>Exporting...</span>
                        </>
                      ) : (
                        <>
                          <DocumentReportIcon className="w-4 h-4" />
                          <span>Export to Excel</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
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
                      {feedbackStats.totalFeedbacks > 0 
                        ? (feedbackStats[key] / feedbackStats.totalFeedbacks).toFixed(1)
                        : '0.0'}
                    </p>
                    <p className="ml-2 text-sm text-gray-500">/ 5.0</p>
                  </div>
                  <div className="mt-2">
                    <div className="flex items-center">
                      <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-purple-500 to-pink-500"
                          style={{ 
                            width: `${feedbackStats.totalFeedbacks > 0 
                              ? (feedbackStats[key] / (feedbackStats.totalFeedbacks * 5)) * 100 
                              : 0}%` 
                          }}
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

        {/* Redemption History Tab */}
        {activeTab === 'redemption-history' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-2xl shadow-lg p-4 sm:p-6"
          >
            <div className="flex items-center space-x-3 mb-6">
              <div className="p-2 bg-purple-100 rounded-lg">
                <CurrencyDollarIcon className="w-6 h-6 text-purple-600" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-gray-800">Redemption History</h2>
                <p className="text-gray-600 mt-1">View history of code redemptions by students</p>
              </div>
            </div>

            {/* Search Bar */}
            <div className="mb-6">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search by ID Number or Code..."
                  value={redemptionSearchTerm}
                  onChange={handleRedemptionHistorySearch}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
                <svg className="absolute left-3 top-2.5 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
            </div>

            <div className="overflow-x-auto">
              {isRedemptionLoading ? (
                <div className="flex justify-center items-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
                  <span className="ml-2 text-gray-600">Loading redemption history...</span>
                </div>
              ) : (
                <>
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          ID Number
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Code Claimed
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Date & Time
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {redemptionHistory.map((redemption, index) => (
                        <tr key={index} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            {redemption.redeemedBy}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            <span className="px-2 py-1 text-xs font-semibold rounded-full bg-purple-100 text-purple-800">
                              {redemption.code}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {new Date(redemption.redeemedAt).toLocaleString('en-US', {
                              timeZone: 'Asia/Manila',
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                              second: '2-digit'
                            })}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {redemptionHistory.length === 0 && (
                    <div className="text-center py-12">
                      <p className="text-gray-500">No redemption history found.</p>
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Pagination */}
            {redemptionTotalPages > 1 && (
              <div className="flex justify-center items-center mt-6 space-x-4">
                <button
                  onClick={() => handleRedemptionHistoryPageChange(Math.max(1, redemptionPage - 1))}
                  disabled={redemptionPage === 1 || isRedemptionLoading}
                  className={`p-2 rounded-lg transition-colors ${
                    redemptionPage === 1 || isRedemptionLoading
                      ? 'text-gray-400 cursor-not-allowed'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
                <span className="text-gray-700 font-medium">
                  Page {redemptionPage} of {redemptionTotalPages}
                </span>
                <button
                  onClick={() => handleRedemptionHistoryPageChange(Math.min(redemptionTotalPages, redemptionPage + 1))}
                  disabled={redemptionPage === redemptionTotalPages || isRedemptionLoading}
                  className={`p-2 rounded-lg transition-colors ${
                    redemptionPage === redemptionTotalPages || isRedemptionLoading
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