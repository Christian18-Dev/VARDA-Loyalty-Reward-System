import { useEffect, useState } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { HomeIcon, TicketIcon, GiftIcon, LogoutIcon, ShoppingBagIcon, XIcon, TrashIcon } from '@heroicons/react/outline';
import { motion, AnimatePresence } from 'framer-motion';
import confetti from 'canvas-confetti';
import completeSetImage from '../assets/completeset.png';
import spoonImage from '../assets/spoon.png';
import forkImage from '../assets/fork.png';
import plateImage from '../assets/plate.png';
import bowlImage from '../assets/bowl.png';
import glassImage from '../assets/glassofwater.png'; 
import saucerImage from '../assets/saucer.png';
import twoGonzLogo from '../assets/2gonzlogo.png';
import FeedbackForm from '../components/FeedbackForm';

export default function StudentPage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [points, setPoints] = useState(0);
  const [rewards, setRewards] = useState([]);
  const [code, setCode] = useState('');
  const [showFeedback, setShowFeedback] = useState(false);
  const [rating, setRating] = useState(0);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [currentPage, setCurrentPage] = useState('home');
  const [isLoading, setIsLoading] = useState(false);
  const [showClaimModal, setShowClaimModal] = useState(false);
  const [claimedRewardName, setClaimedRewardName] = useState('');
  const [claimTime, setClaimTime] = useState('');
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [borrowedItems, setBorrowedItems] = useState([]);
  const [availableItems, setAvailableItems] = useState([
    {
      id: 1,
      name: 'Complete Set',
      image: completeSetImage,
      description: 'Complete dining set (Plate, Bowl, Spoon, Fork, Glass, Tray)',
      cartQuantity: 0,
      isSet: true
    },
    { 
      id: 2, 
      name: 'Spoon', 
      image: spoonImage,
      description: 'Stainless steel spoon for your dining needs',
      cartQuantity: 0
    },
    { 
      id: 3, 
      name: 'Fork', 
      image: forkImage,
      description: 'Stainless steel fork for your dining needs',
      cartQuantity: 0
    },
    { 
      id: 4, 
      name: 'Plate', 
      image: plateImage,
      description: 'Ceramic plate',
      cartQuantity: 0
    },
    { 
      id: 5, 
      name: 'Bowl', 
      image: bowlImage,
      description: 'Ceramic bowl',
      cartQuantity: 0
    },
    { 
      id: 6, 
      name: 'Saucer', 
      image: saucerImage,
      description: 'Smaller plate',
      cartQuantity: 0
    },
    { 
      id: 7, 
      name: 'Glass', 
      image: glassImage,
      description: 'Glass for water and beverages',
      cartQuantity: 0
    },
  ]);
  const [showCart, setShowCart] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [mealStatus, setMealStatus] = useState({
    breakfast: false,
    lunch: false,
    dinner: false
  });
  const [showBreakfastMenu, setShowBreakfastMenu] = useState(false);
  const [showLunchMenu, setShowLunchMenu] = useState(false);
  const [showDinnerMenu, setShowDinnerMenu] = useState(false);
  const [selectedStore, setSelectedStore] = useState(null);
  const [breakfastPoints, setBreakfastPoints] = useState(0);
  const [lunchPoints, setLunchPoints] = useState(0);
  const [dinnerPoints, setDinnerPoints] = useState(0);
  const [breakfastCart, setBreakfastCart] = useState([]);
  const [lunchCart, setLunchCart] = useState([]);
  const [dinnerCart, setDinnerCart] = useState([]);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [selectedStoreId, setSelectedStoreId] = useState(null);
  const [selectedBreakfastStore, setSelectedBreakfastStore] = useState(null);
  const [selectedLunchStore, setSelectedLunchStore] = useState(null);
  const [selectedDinnerStore, setSelectedDinnerStore] = useState(null);
  const [error, setError] = useState('');
  const [currentReturnItem, setCurrentReturnItem] = useState(null);
  const [modalType, setModalType] = useState('');
  const [modalItems, setModalItems] = useState([]);
  const [modalTime, setModalTime] = useState('');
  const [showFeedbackForm, setShowFeedbackForm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isReturning, setIsReturning] = useState(false);

  const baseUrl = import.meta.env.VITE_API_BASE_URL;
  const token = user.token;

  // Add fetchUserPoints function
  const fetchUserPoints = async () => {
    try {
      const response = await axios.get(`${baseUrl}/api/student/points`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const { breakfast, lunch, dinner } = response.data.cateringPoints;
      setBreakfastPoints(breakfast);
      setLunchPoints(lunch);
      setDinnerPoints(dinner);
      setPoints(response.data.points);
    } catch (error) {
      console.error('Error fetching user points:', error);
      setError('Failed to fetch points balance');
    }
  };

  // Call fetchUserPoints when component mounts and when token changes
  useEffect(() => {
    fetchUserPoints();
  }, [token]);

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        const [pointsRes, rewardsRes] = await Promise.all([
          axios.get(`${baseUrl}/api/student/points`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
          axios.get(`${baseUrl}/api/rewards`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
        ]);
        setPoints(pointsRes.data.points);
        // Update individual meal points from the cateringPoints object
        if (pointsRes.data.cateringPoints) {
          setBreakfastPoints(pointsRes.data.cateringPoints.breakfast || 250);
          setLunchPoints(pointsRes.data.cateringPoints.lunch || 250);
          setDinnerPoints(pointsRes.data.cateringPoints.dinner || 250);
        }
        setRewards(rewardsRes.data);
      } catch (error) {
        console.error('Error fetching data:', error);
        setErrorMessage('Failed to load data. Please try again.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [user.token]);

  const breakfastStores = [
    {
      id: 'bluecafe',
      name: 'Blue Cafe',
      image: 'https://placehold.co/400x300/1e40af/ffffff?text=Blue+Cafe',
      menu: [
        { id: 1, name: 'Classic Breakfast Set', price: 1, points: 1, description: 'Eggs, bacon, toast, and coffee' },
        { id: 2, name: 'Pancake Stack', price: 1, points: 1, description: 'Fluffy pancakes with maple syrup' },
        { id: 3, name: 'Breakfast Burrito', price: 1, points: 1, description: 'Eggs, cheese, and sausage wrapped in tortilla' }
      ]
    },
    {
      id: 'varda',
      name: 'Varda',
      image: 'https://placehold.co/400x300/7e22ce/ffffff?text=Varda',
      menu: [
        { id: 1, name: 'Filipino Breakfast', price: 1, points: 1, description: 'Tapsilog with garlic rice and egg' },
        { id: 2, name: 'Chicken Porridge', price: 1, points: 1, description: 'Warm chicken porridge with toppings' },
        { id: 3, name: 'Breakfast Sandwich', price: 1, points: 1, description: 'Egg and cheese sandwich with coffee' }
      ]
    },
    {
      id: 'colonels',
      name: "Colonel's Curry",
      image: 'https://placehold.co/400x300/166534/ffffff?text=Colonels+Curry',
      menu: [
        { id: 1, name: 'Curry Breakfast Bowl', price: 1, points: 1, description: 'Curry rice bowl with egg and vegetables' },
        { id: 2, name: 'Spicy Breakfast Wrap', price: 1, points: 1, description: 'Curry-spiced wrap with eggs and vegetables' },
        { id: 3, name: 'Breakfast Curry Plate', price: 1, points: 1, description: 'Mild curry with rice and egg' }
      ]
    },
    {
      id: 'chillers',
      name: 'Chillers',
      image: 'https://placehold.co/400x300/0ea5e9/ffffff?text=Chillers',
      menu: [
        { id: 1, name: 'Breakfast Smoothie Bowl', price: 1, points: 1, description: 'Fruit smoothie bowl with granola' },
        { id: 2, name: 'Yogurt Parfait', price: 1, points: 1, description: 'Greek yogurt with fruits and honey' },
        { id: 3, name: 'Healthy Breakfast Plate', price: 1, points: 1, description: 'Avocado toast with eggs and fruits' }
      ]
    },
    {
      id: 'luckyshawarma',
      name: 'Lucky Shawarma',
      image: 'https://placehold.co/400x300/c2410c/ffffff?text=Lucky+Shawarma',
      menu: [
        { id: 1, name: 'Breakfast Shawarma', price: 1, points: 1, description: 'Egg and cheese shawarma wrap' },
        { id: 2, name: 'Shawarma Rice Bowl', price: 1, points: 1, description: 'Rice bowl with shawarma and egg' },
        { id: 3, name: 'Breakfast Pita', price: 1, points: 120, description: 'Pita bread with eggs and vegetables' }
      ]
    },
    {
      id: 'yumdimdum',
      name: 'Yumdimdum',
      image: 'https://placehold.co/400x300/be123c/ffffff?text=Yumdimdum',
      menu: [
        { id: 1, name: 'Dimsum Breakfast Set', price: 1, points: 1, description: 'Assorted dimsum with tea' },
        { id: 2, name: 'Congee with Toppings', price: 1, points: 1, description: 'Rice porridge with various toppings' },
        { id: 3, name: 'Breakfast Noodles', price: 1, points: 1, description: 'Stir-fried noodles with vegetables' }
      ]
    }
  ];

  const lunchStores = [
    {
      id: 'bluecafe',
      name: 'Blue Cafe',
      image: 'https://placehold.co/400x300/1e40af/ffffff?text=Blue+Cafe',
      menu: [
        { id: 1, name: 'Club Sandwich', price: 1, points: 1, description: 'Triple-decker sandwich with chicken, bacon, and vegetables' },
        { id: 2, name: 'Caesar Salad', price: 1, points: 1, description: 'Fresh romaine lettuce with grilled chicken and Caesar dressing' },
        { id: 3, name: 'Pasta Alfredo', price: 1, points: 1, description: 'Fettuccine pasta in creamy Alfredo sauce with grilled chicken' }
      ]
    },
    {
      id: 'varda',
      name: 'Varda',
      image: 'https://placehold.co/400x300/7e22ce/ffffff?text=Varda',
      menu: [
        { id: 1, name: 'Chicken Adobo', price: 1, points: 1, description: 'Classic Filipino adobo with rice and vegetables' },
        { id: 2, name: 'Beef Sinigang', price: 1, points: 1, description: 'Sour soup with beef and vegetables' },
        { id: 3, name: 'Pork Sisig', price: 1, points: 1, description: 'Sizzling pork dish with rice and egg' }
      ]
    },
    {
      id: 'colonels',
      name: "Colonel's Curry",
      image: 'https://placehold.co/400x300/166534/ffffff?text=Colonels+Curry',
      menu: [
        { id: 1, name: 'Chicken Curry', price: 1, points: 1, description: 'Spicy curry with rice and naan bread' },
        { id: 2, name: 'Butter Chicken', price: 1, points: 1, description: 'Creamy tomato-based curry with rice' },
        { id: 3, name: 'Vegetable Biryani', price: 1, points: 1, description: 'Fragrant rice dish with mixed vegetables' }
      ]
    },
    {
      id: 'chillers',
      name: 'Chillers',
      image: 'https://placehold.co/400x300/0ea5e9/ffffff?text=Chillers',
      menu: [
        { id: 1, name: 'Quinoa Bowl', price: 1, points: 1, description: 'Quinoa with roasted vegetables and avocado' },
        { id: 2, name: 'Grilled Chicken Wrap', price: 1, points: 1, description: 'Whole wheat wrap with grilled chicken and vegetables' },
        { id: 3, name: 'Salmon Salad', price: 1, points: 1, description: 'Fresh salad with grilled salmon and citrus dressing' }
      ]
    },
    {
      id: 'luckyshawarma',
      name: 'Lucky Shawarma',
      image: 'https://placehold.co/400x300/c2410c/ffffff?text=Lucky+Shawarma',
      menu: [
        { id: 1, name: 'Chicken Shawarma Plate', price: 1, points: 1, description: 'Grilled chicken with rice and garlic sauce' },
        { id: 2, name: 'Mixed Grill', price: 1, points: 1, description: 'Assorted grilled meats with rice and salad' },
        { id: 3, name: 'Falafel Plate', price: 1, points: 1, description: 'Crispy falafel with hummus and pita bread' }
      ]
    },
    {
      id: 'yumdimdum',
      name: 'Yumdimdum',
      image: 'https://placehold.co/400x300/be123c/ffffff?text=Yumdimdum',
      menu: [
        { id: 1, name: 'Dimsum Platter', price: 1, points: 1, description: 'Assorted dimsum with dipping sauce' },
        { id: 2, name: 'Wok Noodles', price: 1, points: 1, description: 'Stir-fried noodles with vegetables and choice of protein' },
        { id: 3, name: 'Rice Bowl', price: 1, points: 1, description: 'Steamed rice with toppings and sauce' }
      ]
    }
  ];

  const dinnerStores = [
    {
      id: 'bluecafe',
      name: 'Blue Cafe',
      image: 'https://placehold.co/400x300/1e40af/ffffff?text=Blue+Cafe',
      menu: [
        { id: 1, name: 'Dinner Set', price: 1, points: 1, description: 'Main course, dessert, and beverage' },
        { id: 2, name: 'Grilled Salmon', price: 1, points: 1, description: 'Grilled salmon with garlic butter' },
        { id: 3, name: 'Vegetable Stir Fry', price: 1, points: 1, description: 'Stir-fried vegetables with tofu and peanut sauce' }
      ]
    },
    {
      id: 'varda',
      name: 'Varda',
      image: 'https://placehold.co/400x300/7e22ce/ffffff?text=Varda',
      menu: [
        { id: 1, name: 'Chicken Curry', price: 1, points: 1, description: 'Spicy curry with rice and naan bread' },
        { id: 2, name: 'Butter Chicken', price: 1, points: 1, description: 'Creamy tomato-based curry with rice' },
        { id: 3, name: 'Vegetable Biryani', price: 1, points: 1, description: 'Fragrant rice dish with mixed vegetables' }
      ]
    },
    {
      id: 'colonels',
      name: "Colonel's Curry",
      image: 'https://placehold.co/400x300/166534/ffffff?text=Colonels+Curry',
      menu: [
        { id: 1, name: 'Dinner Set', price: 1, points: 1, description: 'Main course, dessert, and beverage' },
        { id: 2, name: 'Grilled Steak', price: 1, points: 1, description: 'Grilled steak with garlic butter' },
        { id: 3, name: 'Vegetable Stir Fry', price: 1, points: 1, description: 'Stir-fried vegetables with tofu and peanut sauce' }
      ]
    },
    {
      id: 'chillers',
      name: 'Chillers',
      image: 'https://placehold.co/400x300/0ea5e9/ffffff?text=Chillers',
      menu: [
        { id: 1, name: 'Quinoa Salad', price: 1, points: 1, description: 'Quinoa with roasted vegetables and avocado' },
        { id: 2, name: 'Grilled Chicken Wrap', price: 1, points: 1, description: 'Whole wheat wrap with grilled chicken and vegetables' },
        { id: 3, name: 'Salmon Salad', price: 1, points: 1, description: 'Fresh salad with grilled salmon and citrus dressing' }
      ]
    },
    {
      id: 'luckyshawarma',
      name: 'Lucky Shawarma',
      image: 'https://placehold.co/400x300/c2410c/ffffff?text=Lucky+Shawarma',
      menu: [
        { id: 1, name: 'Chicken Shawarma Plate', price: 1, points: 1, description: 'Grilled chicken with rice and garlic sauce' },
        { id: 2, name: 'Mixed Grill', price: 1, points: 1, description: 'Assorted grilled meats with rice and salad' },
        { id: 3, name: 'Falafel Plate', price: 1, points: 1, description: 'Crispy falafel with hummus and pita bread' }
      ]
    },
    {
      id: 'yumdimdum',
      name: 'Yumdimdum',
      image: 'https://placehold.co/400x300/be123c/ffffff?text=Yumdimdum',
      menu: [
        { id: 1, name: 'Dimsum Platter', price: 1, points: 1, description: 'Assorted dimsum with dipping sauce' },
        { id: 2, name: 'Wok Noodles', price: 1, points: 1, description: 'Stir-fried noodles with vegetables and choice of protein' },
        { id: 3, name: 'Rice Bowl', price: 1, points: 1, description: 'Steamed rice with toppings and sauce' }
      ]
    }
  ];

  const handleBreakfastClick = () => {
    if (mealStatus.breakfast) {
      setShowBreakfastMenu(true);
    }
  };

  const handleLunchClick = () => {
    if (mealStatus.lunch) {
      setShowLunchMenu(true);
    }
  };

  const handleDinnerClick = () => {
    if (mealStatus.dinner) {
      setShowDinnerMenu(true);
    }
  };

  const handleAddToBreakfastCart = (item, storeId) => {
    // Set the selected store ID if cart is empty
    if (breakfastCart.length === 0) {
      setSelectedBreakfastStore(storeId);
    }

    // Check if trying to add from a different store
    if (breakfastCart.length > 0 && selectedBreakfastStore !== storeId) {
      setError('You can only order from one store at a time');
      return;
    }

    // Check if item already exists in cart
    const existingItemIndex = breakfastCart.findIndex(
      cartItem => cartItem.id === item.id && cartItem.storeId === storeId
    );

    if (existingItemIndex !== -1) {
      // Update quantity of existing item
      const updatedCart = [...breakfastCart];
      updatedCart[existingItemIndex].quantity += 1;
      setBreakfastCart(updatedCart);
    } else {
      // Add new item with quantity 1
      setBreakfastCart([...breakfastCart, { ...item, quantity: 1, storeId }]);
    }
  };

  const handleAddToLunchCart = (item, storeId) => {
    // Set the selected store ID if cart is empty
    if (lunchCart.length === 0) {
      setSelectedLunchStore(storeId);
    }

    // Check if trying to add from a different store
    if (lunchCart.length > 0 && selectedLunchStore !== storeId) {
      setError('You can only order from one store at a time');
      return;
    }

    // Check if item already exists in cart
    const existingItemIndex = lunchCart.findIndex(
      cartItem => cartItem.id === item.id && cartItem.storeId === storeId
    );

    if (existingItemIndex !== -1) {
      // Update quantity of existing item
      const updatedCart = [...lunchCart];
      updatedCart[existingItemIndex].quantity += 1;
      setLunchCart(updatedCart);
    } else {
      // Add new item with quantity 1
      setLunchCart([...lunchCart, { ...item, quantity: 1, storeId }]);
    }
  };

  const handleAddToDinnerCart = (item, storeId) => {
    // Set the selected store ID if cart is empty
    if (dinnerCart.length === 0) {
      setSelectedDinnerStore(storeId);
    }

    // Check if trying to add from a different store
    if (dinnerCart.length > 0 && selectedDinnerStore !== storeId) {
      setError('You can only order from one store at a time');
      return;
    }

    // Check if item already exists in cart
    const existingItemIndex = dinnerCart.findIndex(
      cartItem => cartItem.id === item.id && cartItem.storeId === storeId
    );

    if (existingItemIndex !== -1) {
      // Update quantity of existing item
      const updatedCart = [...dinnerCart];
      updatedCart[existingItemIndex].quantity += 1;
      setDinnerCart(updatedCart);
    } else {
      // Add new item with quantity 1
      setDinnerCart([...dinnerCart, { ...item, quantity: 1, storeId }]);
    }
  };

  const handleRemoveFromBreakfastCart = (index) => {
    const updatedCart = [...breakfastCart];
    if (updatedCart[index].quantity > 1) {
      updatedCart[index].quantity -= 1;
    } else {
      updatedCart.splice(index, 1);
    }
    setBreakfastCart(updatedCart);
  };

  const handleRemoveFromLunchCart = (index) => {
    const updatedCart = [...lunchCart];
    if (updatedCart[index].quantity > 1) {
      updatedCart[index].quantity -= 1;
    } else {
      updatedCart.splice(index, 1);
    }
    setLunchCart(updatedCart);
  };

  const handleRemoveFromDinnerCart = (index) => {
    const updatedCart = [...dinnerCart];
    if (updatedCart[index].quantity > 1) {
      updatedCart[index].quantity -= 1;
    } else {
      updatedCart.splice(index, 1);
    }
    setDinnerCart(updatedCart);
  };

  const handleClearBreakfastCart = () => {
    setBreakfastCart([]);
    setSelectedBreakfastStore(null);
  };

  const handleClearLunchCart = () => {
    setLunchCart([]);
    setSelectedLunchStore(null);
  };

  const handleClearDinnerCart = () => {
    setDinnerCart([]);
    setSelectedDinnerStore(null);
  };

  // Add retry utility function
  const retryOperation = async (operation, maxRetries = 3) => {
    let lastError;
    for (let i = 0; i < maxRetries; i++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error;
        if (error.code === 'ECONNRESET' || error.message.includes('network')) {
          // Wait before retrying (exponential backoff)
          await new Promise(resolve => setTimeout(resolve, Math.pow(2, i) * 1000));
          continue;
        }
        throw error;
      }
    }
    throw lastError;
  };

  // Update handlePlaceBreakfastOrder
  const handlePlaceBreakfastOrder = async () => {
    try {
      console.log('Confirm breakfast order button clicked');
      const totalPoints = getTotalBreakfastPoints();
      const totalAmount = totalPoints;

      // Get the store name from the selected store
      const selectedStore = breakfastStores.find(store => store.id === selectedBreakfastStore);
      if (!selectedStore) {
        setError('Please select a store first');
        return;
      }

      console.log('Attempting to place breakfast order...');
      console.log('Order details:', {
        totalPoints,
        totalAmount,
        cartItems: breakfastCart,
        currentPoints: breakfastPoints,
        storeName: selectedStore.name
      });

      console.log('Sending request to server...');
      const response = await axios.post(
        `${baseUrl}/api/student/points-usage`,
        {
          mealType: 'breakfast',
          storeName: selectedStore.name,
          pointsUsed: totalPoints,
          items: breakfastCart.map(item => ({
            name: item.name,
            points: item.price,
            quantity: item.quantity
          })),
          totalAmount
        },
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      console.log('Server response:', response.data);
      setMessage({
        type: 'success',
        text: 'Breakfast order placed successfully!'
      });
      setBreakfastCart([]);
      setSelectedBreakfastStore(null);
      // Update points immediately from the response
      if (response.data.remainingPoints !== undefined) {
        setBreakfastPoints(response.data.remainingPoints);
      }
      // Also fetch all points to ensure everything is in sync
      await fetchUserPoints();
    } catch (error) {
      console.error('Error placing breakfast order:', error);
      setError(error.response?.data?.message || 'Error placing breakfast order');
    }
  };

  // Update handlePlaceLunchOrder
  const handlePlaceLunchOrder = async () => {
    try {
      console.log('Confirm lunch order button clicked');
      const totalPoints = getTotalLunchPoints();
      const totalAmount = totalPoints;

      // Get the store name from the selected store
      const selectedStore = lunchStores.find(store => store.id === selectedLunchStore);
      if (!selectedStore) {
        setError('Please select a store first');
        return;
      }

      console.log('Attempting to place lunch order...');
      console.log('Order details:', {
        totalPoints,
        totalAmount,
        cartItems: lunchCart,
        currentPoints: lunchPoints,
        storeName: selectedStore.name
      });

      console.log('Sending request to server...');
      const response = await axios.post(
        `${baseUrl}/api/student/points-usage`,
        {
          mealType: 'lunch',
          storeName: selectedStore.name,
          pointsUsed: totalPoints,
          items: lunchCart.map(item => ({
            name: item.name,
            points: item.price,
            quantity: item.quantity
          })),
          totalAmount
        },
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      console.log('Server response:', response.data);
      setMessage({
        type: 'success',
        text: 'Lunch order placed successfully!'
      });
      setLunchCart([]);
      setSelectedLunchStore(null);
      // Update points immediately from the response
      if (response.data.remainingPoints !== undefined) {
        setLunchPoints(response.data.remainingPoints);
      }
      // Also fetch all points to ensure everything is in sync
      await fetchUserPoints();
    } catch (error) {
      console.error('Error placing lunch order:', error);
      setError(error.response?.data?.message || 'Error placing lunch order');
    }
  };

  // Update handlePlaceDinnerOrder
  const handlePlaceDinnerOrder = async () => {
    try {
      console.log('Confirm dinner order button clicked');
      const totalPoints = getTotalDinnerPoints();
      const totalAmount = totalPoints;

      // Get the store name from the selected store
      const selectedStore = dinnerStores.find(store => store.id === selectedDinnerStore);
      if (!selectedStore) {
        setError('Please select a store first');
        return;
      }

      console.log('Attempting to place dinner order...');
      console.log('Order details:', {
        totalPoints,
        totalAmount,
        cartItems: dinnerCart,
        currentPoints: dinnerPoints,
        storeName: selectedStore.name
      });

      console.log('Sending request to server...');
      const response = await axios.post(
        `${baseUrl}/api/student/points-usage`,
        {
          mealType: 'dinner',
          storeName: selectedStore.name,
          pointsUsed: totalPoints,
          items: dinnerCart.map(item => ({
            name: item.name,
            points: item.price,
            quantity: item.quantity
          })),
          totalAmount
        },
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      console.log('Server response:', response.data);
      setMessage({
        type: 'success',
        text: 'Dinner order placed successfully!'
      });
      setDinnerCart([]);
      setSelectedDinnerStore(null);
      // Update points immediately from the response
      if (response.data.remainingPoints !== undefined) {
        setDinnerPoints(response.data.remainingPoints);
      }
      // Also fetch all points to ensure everything is in sync
      await fetchUserPoints();
    } catch (error) {
      console.error('Error placing dinner order:', error);
      setError(error.response?.data?.message || 'Error placing dinner order');
    }
  };

  // Update handleConfirmOrder function
  const handleConfirmOrder = async () => {
    if (isSubmitting) return; // Prevent multiple submissions
    
    const itemsToBorrow = availableItems.filter(item => item.cartQuantity > 0);
    
    if (itemsToBorrow.length === 0) {
      setErrorMessage('Your cart is empty. Please add items before confirming your borrow.');
      return;
    }

    const timestamp = new Date().toISOString();
    const orderDetails = {
      studentId: user._id,
      studentIdNumber: user.idNumber,
      items: itemsToBorrow.map(item => ({
        name: item.name,
        quantity: item.cartQuantity
      })),
      timestamp: timestamp
    };

    try {
      setIsSubmitting(true);
      // Use retry logic for the API call
      const response = await retryOperation(async () => {
        return await axios.post(
          `${baseUrl}/api/student/borrow-items`,
          orderDetails,
          {
            headers: { Authorization: `Bearer ${token}` },
            timeout: 10000 // 10 second timeout
          }
        );
      });

      // Store items and time for modal display
      setModalItems(itemsToBorrow);
      setModalTime(new Date().toLocaleString());
      setModalType('borrow');
      setSuccessMessage('Borrow Complete!');
      setShowSuccessModal(true);
      setShowCart(false); // Close cart only after successful borrow

      // Reset cart quantities
      setAvailableItems(prevItems => 
        prevItems.map(item => ({ ...item, cartQuantity: 0 }))
      );

      // Fetch updated borrowed items with retry
      await retryOperation(fetchBorrowedItems);
    } catch (error) {
      console.error('Error creating borrow record:', error);
      if (error.code === 'ECONNRESET') {
        setErrorMessage('Network connection was lost. Please try again.');
      } else {
        setErrorMessage('Failed to create borrow record. Please try again.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // Update handleReturn function
  const handleReturn = async (item) => {
    if (isReturning) return; // Prevent multiple submissions
    
    try {
      setIsReturning(true);
      const returnData = {
        studentId: user._id,
        studentIdNumber: user.idNumber,
        items: item.items,
        timestamp: item.borrowTime
      };

      // Use retry logic for the API call
      const response = await retryOperation(async () => {
        return await axios.post(
          `${baseUrl}/api/student/return-items`,
          returnData,
          {
            headers: { Authorization: `Bearer ${token}` },
            timeout: 10000 // 10 second timeout
          }
        );
      });

      // Store items and time for modal display
      setModalItems(item.items);
      setModalTime(new Date().toLocaleString());
      setModalType('return');
      setSuccessMessage('Return Complete!');
      setShowSuccessModal(true);

      // Fetch updated borrowed items with retry
      await retryOperation(fetchBorrowedItems);
    } catch (error) {
      console.error('Error returning items:', error);
      if (error.code === 'ECONNRESET') {
        setErrorMessage('Network connection was lost. Please try again.');
      } else {
        setErrorMessage('Failed to return items. Please try again.');
      }
    } finally {
      setIsReturning(false);
    }
  };

  // Update fetchBorrowedItems function
  const fetchBorrowedItems = async () => {
    try {
      const response = await axios.get(
        `${baseUrl}/api/student/borrowed-items`,
        {
          headers: { Authorization: `Bearer ${token}` },
          timeout: 10000 // 10 second timeout
        }
      );
      setBorrowedItems(response.data.data);
    } catch (error) {
      console.error('Error fetching borrowed items:', error);
      if (error.code === 'ECONNRESET') {
        setErrorMessage('Network connection was lost while fetching items. Please refresh the page.');
      } else {
        setErrorMessage('Failed to fetch borrowed items. Please refresh the page.');
      }
    }
  };

  useEffect(() => {
    if (currentPage === 'borrow' || currentPage === 'home') {
      fetchBorrowedItems();
      const pollInterval = setInterval(fetchBorrowedItems, 3000);
      return () => clearInterval(pollInterval);
    }
  }, [currentPage, token]);

  const handleCodeSubmit = async () => {
    if (isLoading) return; // Prevent multiple submissions
    
    if (!code.trim()) {
      setErrorMessage('Please enter a code');
      return;
    }

    try {
      setIsLoading(true);
      const token = user.token;
      const response = await axios.post(
        `${baseUrl}/api/student/claim-code`,
        { code },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setShowFeedback(true);
      setErrorMessage('');
      setSuccessMessage('Code accepted! Please rate your experience.');
      confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
    } catch (error) {
      console.error('Error submitting code:', error);
      if (error.response && error.response.status === 400) {
        setErrorMessage(error.response.data.message || 'Code is invalid or already used.');
      } else {
        setErrorMessage('An unexpected error occurred. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const submitFeedback = async () => {
    if (!rating) {
      setErrorMessage('Please select a rating!');
      return;
    }

    try {
      setIsLoading(true);
      const token = user.token;
      await axios.post(
        `${baseUrl}/api/student/submit-feedback`,
        { code, rating },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      const updated = await axios.get(`${baseUrl}/api/student/points`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      setPoints(updated.data.points);
      setSuccessMessage('Feedback submitted!');
      setShowFeedback(false);
      setCode('');
      setRating(0);

      confetti({ particleCount: rating * 20, spread: 70, origin: { y: 0.6 } });

      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err) {
      console.error('Error submitting feedback:', err);
      setErrorMessage(err.response?.data?.message || 'Failed to submit feedback');
    } finally {
      setIsLoading(false);
    }
  };

  const claimReward = async (rewardId) => {
    try {
      setIsLoading(true);

      const response = await axios.post(
        `${baseUrl}/api/student/claim-reward/${rewardId}`,
        {},
        { headers: { Authorization: `Bearer ${user.token}` } }
      );

      setPoints(response.data.newPoints);

      const claimed = rewards.find((r) => r._id === rewardId);
      setClaimedRewardName(claimed?.name || 'Reward');
      setClaimTime(new Date().toLocaleString());
      setShowClaimModal(true);

      confetti({ particleCount: 150, spread: 100, origin: { y: 0.6 } });
    } catch (err) {
      setErrorMessage(err.response?.data?.message || 'Failed to claim reward');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddToCart = (itemId) => {
    setAvailableItems(prevItems => 
      prevItems.map(item => {
        if (item.id === itemId) {
          return { ...item, cartQuantity: item.cartQuantity + 1 };
        }
        return item;
      })
    );
  };

  const handleRemoveFromCart = (itemId) => {
    setAvailableItems(prevItems => 
      prevItems.map(item => {
        if (item.id === itemId && item.cartQuantity > 0) {
          return { ...item, cartQuantity: item.cartQuantity - 1 };
        }
        return item;
      })
    );
  };

  // Animation variants
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.1 } },
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: { y: 0, opacity: 1 },
  };

  // Function to check if current time is within meal hours
  const checkMealHours = () => {
    const now = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Manila' }));
    const currentTimeInMinutes = now.getHours() * 60 + now.getMinutes();

    // Breakfast: 6:00 AM - 11:00 AM (Philippine time)
    const breakfastStart = 6 * 60;    // 6:00 AM
    const breakfastEnd = 11 * 60;     // 11:00 AM

    // Lunch: 11:00 AM - 4:00 PM (Philippine time)
    const lunchStart = 11 * 60;       // 11:00 AM
    const lunchEnd = 16 * 60;         // 4:00 PM

    // Dinner: 4:00 PM - 12:00 AM (Philippine time)
    const dinnerStart = 16 * 60;      // 4:00 PM
    const dinnerEnd = 24 * 60;        // 12:00 AM (midnight)

    setMealStatus({
      breakfast: currentTimeInMinutes >= breakfastStart && currentTimeInMinutes <= breakfastEnd,
      lunch: currentTimeInMinutes >= lunchStart && currentTimeInMinutes <= lunchEnd,
      dinner: currentTimeInMinutes >= dinnerStart && currentTimeInMinutes <= dinnerEnd
    });
  };

  // Update time every minute
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
      checkMealHours();
    }, 60000); // Update every minute

    // Initial check
    checkMealHours();

    return () => clearInterval(timer);
  }, []);

  // Add message display component
  const MessageDisplay = () => {
    if (!message.text) return null;

    return (
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        className={`fixed top-4 left-1/2 transform -translate-x-1/2 px-4 py-2 rounded-lg shadow-lg z-50 ${
          message.type === 'error' ? 'bg-red-600' : 'bg-green-600'
        }`}
      >
        <p className="text-white font-medium">{message.text}</p>
      </motion.div>
    );
  };

  // Add useEffect to clear message after 3 seconds
  useEffect(() => {
    if (message.text) {
      const timer = setTimeout(() => {
        setMessage({ type: '', text: '' });
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [message]);

  // Update the cart display to show quantities
  const renderBreakfastCart = () => {
    return breakfastCart.map((item, index) => (
      <div key={index} className="flex justify-between items-center py-2">
        <div>
          <p className="font-medium">{item.name}</p>
          {item.quantity > 1 && (
            <p className="text-sm text-gray-500">Quantity: {item.quantity}</p>
          )}
        </div>
        <div className="flex items-center space-x-2">
          <p className="text-sm font-medium">{item.price * item.quantity} points</p>
          <button
            onClick={() => handleRemoveFromBreakfastCart(index)}
            className="text-red-500 hover:text-red-700"
          >
            <TrashIcon className="w-5 h-5" />
          </button>
        </div>
      </div>
    ));
  };

  // Update the cart summary to show total points with quantities
  const getTotalBreakfastPoints = () => {
    return breakfastCart.reduce((total, item) => total + (item.price * item.quantity), 0);
  };

  // Add renderLunchCart function
  const renderLunchCart = () => {
    return lunchCart.map((item, index) => (
      <div key={index} className="flex justify-between items-center py-2">
        <div>
          <p className="font-medium">{item.name}</p>
          {item.quantity > 1 && (
            <p className="text-sm text-gray-500">Quantity: {item.quantity}</p>
          )}
        </div>
        <div className="flex items-center space-x-2">
          <p className="text-sm font-medium">{item.price * item.quantity} points</p>
          <button
            onClick={() => handleRemoveFromLunchCart(index)}
            className="text-red-500 hover:text-red-700"
          >
            <TrashIcon className="w-5 h-5" />
          </button>
        </div>
      </div>
    ));
  };

  // Add getTotalLunchPoints function
  const getTotalLunchPoints = () => {
    return lunchCart.reduce((total, item) => total + (item.price * item.quantity), 0);
  };

  // Add renderDinnerCart function
  const renderDinnerCart = () => {
    return dinnerCart.map((item, index) => (
      <div key={index} className="flex justify-between items-center py-2">
        <div>
          <p className="font-medium">{item.name}</p>
          {item.quantity > 1 && (
            <p className="text-sm text-gray-500">Quantity: {item.quantity}</p>
          )}
        </div>
        <div className="flex items-center space-x-2">
          <p className="text-sm font-medium">{item.price * item.quantity} points</p>
          <button
            onClick={() => handleRemoveFromDinnerCart(index)}
            className="text-red-500 hover:text-red-700"
          >
            <TrashIcon className="w-5 h-5" />
          </button>
        </div>
      </div>
    ));
  };

  // Add getTotalDinnerPoints function
  const getTotalDinnerPoints = () => {
    return dinnerCart.reduce((total, item) => total + (item.price * item.quantity), 0);
  };

  const handleFeedbackSubmit = async (feedbackData) => {
    try {
      const response = await axios.post(
        `${baseUrl}/api/student/feedback`,
        feedbackData,
        {
          headers: { Authorization: `Bearer ${token}` },
          timeout: 10000 // 10 second timeout
        }
      );

      if (response.data.success) {
        setSuccessMessage('Feedback submitted successfully!');
        return true; // Return true to indicate success
      }
      return false;
    } catch (error) {
      console.error('Error submitting feedback:', error);
      if (error.response?.data?.message) {
        setErrorMessage(error.response.data.message);
      } else {
        setErrorMessage('Failed to submit feedback. Please try again.');
      }
      return false; // Return false to indicate failure
    }
  };

  // Add debounce function
  const debounce = (func, wait) => {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  };

  return (
    <div className="min-h-screen bg-[#0f172a] text-white">
      <AnimatePresence>
        {message.text && <MessageDisplay />}
      </AnimatePresence>
      <motion.div
        key={currentPage}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        transition={{ duration: 0.3 }}
        className="container mx-auto px-4 py-8 pb-24"
      >
        {/* Home Page */}
        {currentPage === 'home' && (
          <motion.div variants={itemVariants} className="space-y-6">
            <motion.div 
              className="relative mx-auto p-3 sm:p-4 md:p-6 w-full max-w-md bg-gradient-to-br from-purple-500 via-purple-700 to-purple-500 rounded-2xl shadow-2xl text-white overflow-hidden"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              style={{
                perspective: "1000px",
                transformStyle: "preserve-3d",
                height: "clamp(220px, 50vw, 280px)",
                width: "clamp(280px, 85vw, 400px)",
                margin: "0 auto 2rem auto"
              }}
            >
              {/* Card Content */}
              <div className="relative z-10 flex flex-col justify-between h-full">
                {/* Card issuer and chip */}
                <div className="flex justify-between items-start">
                  <div className="flex items-center space-x-3">
                    <img src={twoGonzLogo} alt="2gonz Logo" className="h-8 sm:h-10 md:h-12 w-auto" />
                    <div className="text-xs sm:text-sm font-medium text-white/80">LOYALTY CARD</div>
                  </div>
                  <div className="w-8 sm:w-10 h-6 sm:h-8 bg-gradient-to-br from-yellow-300 to-yellow-500 rounded-md flex items-center justify-center">
                    <div className="w-6 sm:w-8 h-4 sm:h-6 bg-gradient-to-br from-yellow-400 to-yellow-600 rounded-sm border border-yellow-200/50 flex items-center justify-center">
                      <div className="w-4 sm:w-5 h-3 sm:h-4 bg-gradient-to-br from-yellow-500 to-yellow-700 rounded-xs border border-yellow-300/50"></div>
                    </div>
                  </div>
                </div>

                {/* Points display with animation */}
                <motion.div 
                  key={points}
                  initial={{ scale: 1.1, opacity: 0.8 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="text-center flex-grow flex flex-col justify-center py-2 sm:py-4"
                >
                  <p className="text-xs text-white/80 mb-1">POINTS BALANCE:</p>
                  <p className="text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight text-white flex items-center justify-center">
                    {points} <span className="text-lg sm:text-xl ml-2">⭐</span>
                  </p>
                </motion.div>

                {/* Card footer */}
                <div className="flex justify-between items-end mt-auto pt-2 sm:pt-3">
                  <div className="max-w-[60%]">
                    <p className="text-xs sm:text-sm font-medium tracking-wider text-white/90 truncate">
                      {`${user.firstName} ${user.lastName}`.toUpperCase()}
                    </p>
                  </div>
                  
                  <div className="text-right">
                    <p className="text-xs text-white/80">STATUS</p>
                    <div className="flex items-center justify-end space-x-1">
                      <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                      <p className="text-xs sm:text-sm font-medium text-white/90">ACTIVE</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Shine effect on hover */}
              <div className="absolute inset-0 pointer-events-none overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-r from-transparent via-white/30 to-transparent opacity-0 hover:opacity-30 transition-opacity duration-300"></div>
              </div>
            </motion.div>

            {/* Navigation Buttons */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setCurrentPage('claim')}
                className="flex flex-col items-center p-4 bg-[#1e293b] rounded-xl shadow-md hover:shadow-lg transition-all border border-gray-700/50"
              >
                <TicketIcon className="h-8 w-8 text-purple-400" />
                <span className="mt-2 font-medium text-gray-200">Redeem</span>
              </motion.button>

              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setCurrentPage('rewards')}
                className="flex flex-col items-center p-4 bg-[#1e293b] rounded-xl shadow-md hover:shadow-lg transition-all border border-gray-700/50"
              >
                <GiftIcon className="h-8 w-8 text-purple-400" />
                <span className="mt-2 font-medium text-gray-200">Rewards</span>
              </motion.button>

              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setCurrentPage('borrow')}
                className="flex flex-col items-center p-4 bg-[#1e293b] rounded-xl shadow-md hover:shadow-lg transition-all border border-gray-700/50"
              >
                <ShoppingBagIcon className="h-8 w-8 text-purple-400" />
                <span className="mt-2 font-medium text-gray-200">Borrow</span>
              </motion.button>

              {user.role === 'catering' && (
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setCurrentPage('catering')}
                  className="flex flex-col items-center p-4 bg-[#1e293b] rounded-xl shadow-md hover:shadow-lg transition-all border border-gray-700/50"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                  </svg>
                  <span className="mt-2 font-medium text-gray-200">Catering</span>
                </motion.button>
              )}
            </div>

            {/* Borrowed Items Section */}
            {borrowedItems.length > 0 && (
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-8 bg-[#1e293b] p-6 rounded-2xl shadow-lg border border-gray-700/50"
              >
                <h3 className="text-xl font-semibold text-gray-200 mb-4">Your Borrowed Items</h3>
                <div className="space-y-4">
                  {borrowedItems.map((item) => (
                    <motion.div 
                      key={item._id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="flex items-center justify-between p-4 bg-gray-800/50 rounded-xl"
                    >
                      <div className="flex items-center space-x-4">
                        <div>
                          <h4 className="font-medium text-gray-200">{item.items.map(i => i.name).join(', ')}</h4>
                          <p className="text-sm text-gray-400">Borrowed on: {new Date(item.borrowTime).toLocaleString()}</p>
                        </div>
                      </div>
                      <button
                        onClick={() => handleReturn(item)}
                        disabled={isReturning}
                        className={`px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors ${
                          isReturning ? 'opacity-50 cursor-not-allowed' : ''
                        }`}
                      >
                        {isReturning ? 'Processing...' : 'Return'}
                      </button>
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            )}
          </motion.div>
        )}

        {/* Claim Code Page */}
        {currentPage === 'claim' && (
          <motion.div variants={itemVariants} className="space-y-6">
            <div className="text-center">
              <img src={twoGonzLogo} alt="2gonz Logo" className="h-16 sm:h-20 mx-auto mb-8" />
              <h2 className="text-2xl font-bold text-blue-400">Redeem Your Code</h2>
            </div>
            
            <motion.div 
              className="bg-[#1e293b] p-6 rounded-2xl shadow-lg border-2 border-dashed border-gray-700/50"
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
            >
              <div className="space-y-4">
                <div className="text-center mb-4">
                  <div className="inline-block bg-blue-900/50 px-4 py-2 rounded-full">
                    <span className="font-bold text-blue-300">✨  Enter Code ✨</span>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <input
                    id="code-input"
                    className="w-full border-2 border-gray-700 bg-gray-800/50 p-4 rounded-xl text-center font-mono text-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-white placeholder-gray-500"
                    placeholder="ex. 123456"
                    value={code}
                    onChange={(e) => setCode(e.target.value.toUpperCase())}
                    disabled={isLoading}
                    style={{ letterSpacing: '2px' }}
                  />
                </div>
                
                <button
                  onClick={handleCodeSubmit}
                  disabled={isLoading}
                  className={`w-full py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-all ${
                    isLoading ? 'opacity-50 cursor-not-allowed' : ''
                  }`}
                >
                  {isLoading ? 'Processing...' : 'Submit Code'}
                </button>
              </div>
            </motion.div>

            {showFeedback && (
            <motion.div 
              className="mt-6 w-full max-w-md mx-auto p-4 sm:p-6 bg-[#1e293b] rounded-2xl shadow-lg border-2 border-gray-700/50 space-y-6"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <div className="text-center">
                <h3 className="text-xl font-bold text-blue-400">How was it? 🤔</h3>
                <p className="text-gray-400 mt-1">Rate your experience to earn bonus points!</p>
              </div>
              
              <div className="flex justify-center gap-2 flex-wrap">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    aria-label={`Rate ${star} star`}
                    className={`p-4 rounded-full border-4 text-2xl text-white ${rating >= star ? 'bg-yellow-900/50 border-yellow-600 scale-110' : 'bg-gray-800/50 border-gray-700'} transition-all`}
                    onClick={() => setRating(star)}
                    disabled={isLoading}
                  >
                    {star}⭐
                  </button>
                ))}
              </div>
              
              <div className="text-center">
                <button
                  onClick={submitFeedback}
                  disabled={!rating || isLoading}
                  className={`px-6 py-3 w-full rounded-xl font-bold text-lg shadow-md transition-all ${!rating || isLoading ? 'bg-gray-800 text-gray-600' : 'bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white'}`}
                >
                  {isLoading ? 'Sending...' : (
                    <span className="flex items-center justify-center gap-2">
                      Submit
                    </span>
                  )}
                </button>
              </div>
            </motion.div>
          )}
          </motion.div>
        )}

        {/* Rewards Page */}
        {currentPage === 'rewards' && (
          <motion.div variants={itemVariants} className="space-y-6">
            <div className="text-center">
              <img src={twoGonzLogo} alt="2gonz Logo" className="h-16 sm:h-20 mx-auto mb-8" />
              <h2 className="text-2xl font-bold text-blue-400">Rewards Available!</h2>
              <p className="text-gray-400 mt-1">Redeem your points for awesome rewards!</p>
            </div>
            
            <motion.div 
              className="bg-[#1e293b] p-4 rounded-2xl shadow-inner border-2 border-gray-700/50"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              <div className="text-center mb-4">
                <div className="inline-block bg-blue-900/50 px-4 py-2 rounded-full">
                  <span className="font-bold text-blue-300">🌟 You have: {points} points 🌟</span>
                </div>
              </div>
              
              {rewards.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-gray-400 text-lg">No rewards available right now</p>
                  <p className="text-gray-500 mt-2">Check back later!</p>
                </div>
              ) : (
                <div className="grid gap-4">
              {rewards
                .sort((a, b) => a.cost - b.cost)
                .map((reward) => (
                  <motion.div 
                    key={reward._id}
                    variants={itemVariants}
                    whileHover={{ scale: 1.03 }}
                    className={`p-1 rounded-xl ${points >= reward.cost ? 'bg-gradient-to-r from-indigo-600 via-purple-700 to-purple-800' : 'bg-gray-800/50'}`}
                  >
                    <div className="bg-gradient-to-br from-indigo-400 via-purple-600 to-purple-700 p-4 rounded-lg border-2 border-dashed border-white/20 relative overflow-hidden">
                      <div className="absolute top-0 left-0 w-2 h-full bg-white"></div>
                      <div className="absolute top-2 right-2 text-xs font-bold bg-white/10 px-2 py-1 rounded text-white">
                        {reward.cost} pts
                      </div>
                      
                      <div className="flex justify-between items-center pl-4">
                        <div>
                          <h3 className="text-lg font-bold text-white">{reward.name}</h3>
                          <p className="text-sm text-white/80">{reward.description || 'Awesome reward!'}</p>
                        </div>
                        <button
                          onClick={() => claimReward(reward._id)}
                          disabled={points < reward.cost || isLoading}
                          className={`px-4 py-2 rounded-lg font-bold shadow-md transition-all ${points >= reward.cost ? 
                            'bg-blue-400 hover:bg-blue-500 text-white' : 
                            'bg-gray-800 text-gray-600'}`}
                        >
                          Claim!
                        </button>
                      </div>
                    </div>
                  </motion.div>
              ))}
                </div>
              )}
            </motion.div>
          </motion.div>
        )}

        {/* Borrowing Page */}
        {currentPage === 'borrow' && (
          <motion.div variants={itemVariants} className="space-y-6">
            <div className="text-center">
              <img src={twoGonzLogo} alt="2gonz Logo" className="h-16 sm:h-20 mx-auto mb-8" />
              <h2 className="text-2xl font-bold text-blue-400">Borrow Items</h2>
              <p className="text-gray-400 mt-1">Select items to borrow for your needs</p>
            </div>

            {/* Available Items Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {availableItems.map((item) => (
                <motion.div 
                  key={item.id}
                  whileHover={{ scale: 1.02 }}
                  className={`bg-[#1e293b] rounded-xl shadow-md overflow-hidden border border-gray-700/50 ${
                    item.isSet ? 'md:col-span-2' : ''
                  }`}
                >
                  <div className="relative h-48 overflow-hidden">
                    <img 
                      src={item.image} 
                      alt={item.name}
                      className="w-full h-full object-cover"
                    />
                    {item.isSet && (
                      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-4">
                        <div className="flex items-center space-x-2">
                          <span className="text-white text-sm">Includes:</span>
                          <span className="text-white/90 text-sm">1 Plate</span>
                          <span className="text-white/90 text-sm">•</span>
                          <span className="text-white/90 text-sm">1 Spoon</span>
                          <span className="text-white/90 text-sm">•</span>
                          <span className="text-white/90 text-sm">1 Fork</span>
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="p-4">
                    <h4 className="font-bold text-lg text-gray-200">{item.name}</h4>
                    <p className="text-sm text-gray-400 mb-3">{item.description}</p>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => handleRemoveFromCart(item.id)}
                          disabled={item.cartQuantity === 0}
                          className={`w-8 h-8 rounded-full flex items-center justify-center text-lg font-bold transition-all ${
                            item.cartQuantity === 0
                              ? 'bg-gray-800 text-gray-600 cursor-not-allowed'
                              : 'bg-red-600 text-white hover:bg-red-700'
                          }`}
                        >
                          -
                        </button>
                        <span className="w-8 text-center font-medium text-gray-200">{item.cartQuantity}</span>
                        <button
                          onClick={() => handleAddToCart(item.id)}
                          className="w-8 h-8 rounded-full flex items-center justify-center text-lg font-bold transition-all bg-blue-600 text-white hover:bg-blue-700"
                        >
                          +
                        </button>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>

            {/* Floating Cart Button */}
            {availableItems.some(item => item.cartQuantity > 0) && (
              <motion.button
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                onClick={() => setShowCart(true)}
                className="fixed bottom-24 right-6 bg-blue-600 text-white p-4 rounded-full shadow-lg hover:bg-blue-700 transition-all flex items-center space-x-2"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
                <span className="font-bold">
                  {availableItems.reduce((total, item) => total + item.cartQuantity, 0)}
                </span>
              </motion.button>
            )}

            {/* Slide-out Cart Panel */}
            {showCart && (
              <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50">
                <motion.div 
                  initial={{ x: '100%' }}
                  animate={{ x: 0 }}
                  exit={{ x: '100%' }}
                  className="absolute right-0 top-0 h-full w-full max-w-md bg-[#1e293b] shadow-xl border-l border-gray-700/50"
                >
                  <div className="p-6 h-full flex flex-col">
                    <div className="flex justify-between items-center mb-6">
                      <h3 className="text-xl font-bold text-gray-200">Your Cart</h3>
                      <button 
                        onClick={() => setShowCart(false)}
                        className="text-gray-400 hover:text-gray-200"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>

                    <div className="flex-grow overflow-y-auto">
                      {availableItems.some(item => item.cartQuantity > 0) ? (
                        <>
                          <div className="bg-blue-900/50 p-4 rounded-xl mb-4">
                            <div className="flex justify-between items-center">
                              <span className="text-blue-300 font-medium">Total Items:</span>
                              <span className="text-blue-200 font-bold">
                                {availableItems.reduce((total, item) => total + item.cartQuantity, 0)}
                              </span>
                            </div>
                          </div>

                          {availableItems
                            .filter(item => item.cartQuantity > 0)
                            .map(item => (
                              <div key={item.id} className="flex items-center space-x-4 p-4 bg-gray-800/50 rounded-xl mb-4">
                                <img 
                                  src={item.image} 
                                  alt={item.name}
                                  className="w-20 h-20 object-cover rounded-lg"
                                />
                                <div className="flex-grow">
                                  <h4 className="font-medium text-gray-200">{item.name}</h4>
                                  <p className="text-sm text-gray-400 mt-1">{item.description}</p>
                                  <div className="flex items-center justify-between mt-2">
                                    <div className="flex items-center space-x-2">
                                      <button
                                        onClick={() => handleRemoveFromCart(item.id)}
                                        className="w-6 h-6 rounded-full flex items-center justify-center text-sm font-bold bg-red-600 text-white hover:bg-red-700"
                                      >
                                        -
                                      </button>
                                      <span className="w-8 text-center font-medium text-gray-200">{item.cartQuantity}</span>
                                      <button
                                        onClick={() => handleAddToCart(item.id)}
                                        className="w-6 h-6 rounded-full flex items-center justify-center text-sm font-bold bg-blue-600 text-white hover:bg-blue-700"
                                      >
                                        +
                                      </button>
                                    </div>
                                    <span className="text-sm font-medium text-gray-400">
                                      {item.isSet ? 'Complete Set' : 'Individual Item'}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            ))}
                        </>
                      ) : (
                        <div className="flex flex-col items-center justify-center h-64 text-center">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 text-gray-600 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                          </svg>
                          <h4 className="text-lg font-medium text-gray-400 mb-2">Your cart is empty</h4>
                          <p className="text-gray-500">Add items to your cart to proceed with your borrow</p>
                        </div>
                      )}
                    </div>

                    <div className="mt-6 space-y-4">
                      {availableItems.some(item => item.cartQuantity > 0) && (
                        <div className="bg-gray-800/50 p-4 rounded-xl">
                          <h4 className="font-medium text-gray-200 mb-2">Borrow Summary</h4>
                          <div className="space-y-2">
                            {availableItems
                              .filter(item => item.cartQuantity > 0)
                              .map(item => (
                                <div key={item.id} className="flex justify-between text-sm">
                                  <span className="text-gray-400">{item.name} x {item.cartQuantity}</span>
                                  <span className="font-medium text-gray-300">
                                    {item.isSet ? 'Complete Set' : 'Individual Item'}
                                  </span>
                                </div>
                              ))}
                          </div>
                        </div>
                      )}
                      
                      <button
                        onClick={handleConfirmOrder}
                        disabled={!availableItems.some(item => item.cartQuantity > 0) || isSubmitting}
                        className={`w-full py-4 rounded-xl font-bold transition-all ${
                          availableItems.some(item => item.cartQuantity > 0) && !isSubmitting
                            ? 'bg-blue-600 text-white hover:bg-blue-700'
                            : 'bg-gray-800 text-gray-600 cursor-not-allowed'
                        }`}
                      >
                        {isSubmitting ? (
                          <div className="flex items-center justify-center">
                            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                            Processing...
                          </div>
                        ) : (
                          'Confirm Borrow'
                        )}
                      </button>
                    </div>
                  </div>
                </motion.div>
              </div>
            )}
          </motion.div>
        )}

        {/* Catering Page */}
        {currentPage === 'catering' && (
          <motion.div variants={itemVariants} className="space-y-6">
            {!showBreakfastMenu && !showLunchMenu && !showDinnerMenu ? (
              <>
                <div className="text-center">
                  <img src={twoGonzLogo} alt="2gonz Logo" className="h-16 sm:h-20 mx-auto mb-8" />
                  <h2 className="text-2xl font-bold text-blue-400">Catering Services</h2>
                  <p className="text-gray-400 mt-1">Select your meal time</p>
                </div>

                <motion.div 
                  className="bg-[#1e293b] p-6 rounded-2xl shadow-lg border-2 border-gray-700/50"
                  initial={{ scale: 0.9 }}
                  animate={{ scale: 1 }}
                >
                  <div className="space-y-4">
                    <div className="text-center mb-4">
                      <div className="inline-block bg-blue-900/50 px-4 py-2 rounded-full">
                        <span className="font-bold text-blue-300">
                          Current Time: {currentTime.toLocaleString('en-US', { 
                            timeZone: 'Asia/Manila',
                            hour: '2-digit',
                            minute: '2-digit',
                            hour12: true 
                          })}
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                      {/* Breakfast Button */}
                      <motion.button
                        whileHover={mealStatus.breakfast ? { scale: 1.02 } : {}}
                        onClick={() => mealStatus.breakfast && setShowBreakfastMenu(true)}
                        className={`p-6 rounded-xl shadow-lg ${
                          mealStatus.breakfast
                            ? 'bg-blue-600 hover:bg-blue-500 text-white'
                            : 'bg-gray-600 text-gray-400 cursor-not-allowed'
                        } transition-colors`}
                        disabled={!mealStatus.breakfast}
                      >
                        <div className="text-center">
                          <h3 className="text-xl font-bold mb-2">Breakfast</h3>
                          <p className="text-sm opacity-80">
                            {mealStatus.breakfast ? 'Available' : 'Not available at this time'}
                          </p>
                          <p className="text-sm mt-2">
                            {mealStatus.breakfast ? '6:00 AM - 11:00 AM' : 'Available 6:00 AM - 11:00 AM'}
                          </p>
                        </div>
                      </motion.button>

                      {/* Lunch Button */}
                      <motion.button
                        whileHover={mealStatus.lunch ? { scale: 1.02 } : {}}
                        onClick={() => mealStatus.lunch && setShowLunchMenu(true)}
                        className={`p-6 rounded-xl shadow-lg ${
                          mealStatus.lunch
                            ? 'bg-blue-600 hover:bg-blue-500 text-white'
                            : 'bg-gray-600 text-gray-400 cursor-not-allowed'
                        } transition-colors`}
                        disabled={!mealStatus.lunch}
                      >
                        <div className="text-center">
                          <h3 className="text-xl font-bold mb-2">Lunch</h3>
                          <p className="text-sm opacity-80">
                            {mealStatus.lunch ? 'Available' : 'Not available at this time'}
                          </p>
                          <p className="text-sm mt-2">
                            {mealStatus.lunch ? '11:00 AM - 4:00 PM' : 'Available 11:00 AM - 4:00 PM'}
                          </p>
                        </div>
                      </motion.button>

                      {/* Dinner Button */}
                      <motion.button
                        whileHover={mealStatus.dinner ? { scale: 1.02 } : {}}
                        onClick={() => mealStatus.dinner && setShowDinnerMenu(true)}
                        className={`p-6 rounded-xl shadow-lg ${
                          mealStatus.dinner
                            ? 'bg-blue-600 hover:bg-blue-500 text-white'
                            : 'bg-gray-600 text-gray-400 cursor-not-allowed'
                        } transition-colors`}
                        disabled={!mealStatus.dinner}
                      >
                        <div className="text-center">
                          <h3 className="text-xl font-bold mb-2">Dinner</h3>
                          <p className="text-sm opacity-80">
                            {mealStatus.dinner ? 'Available' : 'Not available at this time'}
                          </p>
                          <p className="text-sm mt-2">
                            {mealStatus.dinner ? '4:00 PM - 12:00 AM' : 'Available 4:00 PM - 12:00 AM'}
                          </p>
                        </div>
                      </motion.button>
                    </div>
                  </div>
                </motion.div>
              </>
            ) : showBreakfastMenu ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="space-y-6"
              >
                <div className="flex items-center justify-between">
                  <button
                    onClick={() => {
                      if (selectedStore) {
                        setSelectedStore(null);
                      } else {
                        setShowBreakfastMenu(false);
                        setSelectedStore(null);
                      }
                    }}
                    className="flex items-center text-gray-400 hover:text-white transition-colors p-2 rounded-full hover:bg-gray-800/50"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                  </button>
                  <div className="bg-blue-900/50 px-4 py-2 rounded-full">
                    <span className="font-bold text-blue-300">
                      Breakfast Points: {breakfastPoints}
                    </span>
                  </div>
                </div>

                {!selectedStore ? (
                  // Show stores grid
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {breakfastStores.map((store) => (
                      <motion.div
                        key={store.id}
                        whileHover={{ scale: 1.02 }}
                        onClick={() => setSelectedStore(store)}
                        className="bg-[#1e293b] rounded-xl shadow-lg overflow-hidden border border-gray-700/50 cursor-pointer"
                      >
                        <div className="relative h-48">
                          <img
                            src={store.image}
                            alt={store.name}
                            className="w-full h-full object-cover"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                          <h3 className="absolute bottom-4 left-4 text-xl font-bold text-white">
                            {store.name}
                          </h3>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                ) : (
                  // Show selected store's menu
                  <div className="space-y-6">
                    <div className="bg-[#1e293b] rounded-xl shadow-lg overflow-hidden border border-gray-700/50">
                      <div className="relative h-48">
                        <img
                          src={selectedStore.image}
                          alt={selectedStore.name}
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                        <h3 className="absolute bottom-4 left-4 text-xl font-bold text-white">
                          {selectedStore.name}
                        </h3>
                      </div>
                      <div className="p-4 space-y-4">
                        {selectedStore.menu.map((item) => (
                          <div
                            key={item.id}
                            className="flex justify-between items-center p-3 bg-gray-800/50 rounded-lg"
                          >
                            <div>
                              <h4 className="font-medium text-white">{item.name}</h4>
                              <p className="text-sm text-gray-400">{item.description}</p>
                              <p className="text-sm text-blue-400 mt-1">{item.points} points</p>
                            </div>
                            <button
                              onClick={() => handleAddToBreakfastCart(item, selectedStore.id)}
                              className={`px-3 py-1 rounded-lg transition-colors ${
                                breakfastPoints >= item.points
                                  ? 'bg-purple-600 hover:bg-purple-500 text-white'
                                  : 'bg-gray-700 text-gray-400 cursor-not-allowed'
                              }`}
                              disabled={breakfastPoints < item.points}
                            >
                              Add
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* Cart Summary */}
                {breakfastCart.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="fixed bottom-0 left-0 right-0 bg-[#1e293b] border-t border-gray-700/50 p-4"
                  >
                    <div className="max-w-7xl mx-auto flex justify-between items-center">
                      <div>
                        <h3 className="text-lg font-bold text-white">Breakfast Cart</h3>
                        <p className="text-gray-400">
                          {breakfastCart.length} items • {250 - breakfastPoints} points used
                        </p>
                      </div>
                      <div className="flex space-x-4">
                        <button
                          onClick={handleClearBreakfastCart}
                          className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                        >
                          Clear Cart
                        </button>
                        <button
                          onClick={() => {
                            console.log('Confirm breakfast order button clicked');
                            handlePlaceBreakfastOrder();
                          }}
                          className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-colors"
                        >
                          Confirm Order
                        </button>
                      </div>
                    </div>
                  </motion.div>
                )}
              </motion.div>
            ) : showLunchMenu ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="space-y-6"
              >
                <div className="flex items-center justify-between">
                  <button
                    onClick={() => {
                      if (selectedStore) {
                        setSelectedStore(null);
                      } else {
                        setShowLunchMenu(false);
                        setSelectedStore(null);
                      }
                    }}
                    className="flex items-center text-gray-400 hover:text-white transition-colors p-2 rounded-full hover:bg-gray-800/50"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                  </button>
                  <div className="bg-blue-900/50 px-4 py-2 rounded-full">
                    <span className="font-bold text-blue-300">
                      Lunch Points: {lunchPoints}
                    </span>
                  </div>
                </div>

                {!selectedStore ? (
                  // Show stores grid
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {lunchStores.map((store) => (
                      <motion.div
                        key={store.id}
                        whileHover={{ scale: 1.02 }}
                        onClick={() => setSelectedStore(store)}
                        className="bg-[#1e293b] rounded-xl shadow-lg overflow-hidden border border-gray-700/50 cursor-pointer"
                      >
                        <div className="relative h-48">
                          <img
                            src={store.image}
                            alt={store.name}
                            className="w-full h-full object-cover"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                          <h3 className="absolute bottom-4 left-4 text-xl font-bold text-white">
                            {store.name}
                          </h3>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                ) : (
                  // Show selected store's menu
                  <div className="space-y-6">
                    <div className="bg-[#1e293b] rounded-xl shadow-lg overflow-hidden border border-gray-700/50">
                      <div className="relative h-48">
                        <img
                          src={selectedStore.image}
                          alt={selectedStore.name}
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                        <h3 className="absolute bottom-4 left-4 text-xl font-bold text-white">
                          {selectedStore.name}
                        </h3>
                      </div>
                      <div className="p-4 space-y-4">
                        {selectedStore.menu.map((item) => (
                          <div
                            key={item.id}
                            className="flex justify-between items-center p-3 bg-gray-800/50 rounded-lg"
                          >
                            <div>
                              <h4 className="font-medium text-white">{item.name}</h4>
                              <p className="text-sm text-gray-400">{item.description}</p>
                              <p className="text-sm text-blue-400 mt-1">{item.points} points</p>
                            </div>
                            <button
                              onClick={() => handleAddToLunchCart(item, selectedStore.id)}
                              className={`px-3 py-1 rounded-lg transition-colors ${
                                lunchPoints >= item.points
                                  ? 'bg-purple-600 hover:bg-purple-500 text-white'
                                  : 'bg-gray-700 text-gray-400 cursor-not-allowed'
                              }`}
                              disabled={lunchPoints < item.points}
                            >
                              Add
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* Cart Summary */}
                {lunchCart.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="fixed bottom-0 left-0 right-0 bg-[#1e293b] border-t border-gray-700/50 p-4"
                  >
                    <div className="max-w-7xl mx-auto flex justify-between items-center">
                      <div>
                        <h3 className="text-lg font-bold text-white">Lunch Cart</h3>
                        <p className="text-gray-400">
                          {lunchCart.length} items • {250 - lunchPoints} points used
                        </p>
                      </div>
                      <div className="flex space-x-4">
                        <button
                          onClick={handleClearLunchCart}
                          className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                        >
                          Clear Cart
                        </button>
                        <button
                          onClick={() => {
                            console.log('Confirm lunch order button clicked');
                            handlePlaceLunchOrder();
                          }}
                          className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-colors"
                        >
                          Confirm Order
                        </button>
                      </div>
                    </div>
                  </motion.div>
                )}
              </motion.div>
            ) : showDinnerMenu ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="space-y-6"
              >
                <div className="flex items-center justify-between">
                  <button
                    onClick={() => {
                      if (selectedStore) {
                        setSelectedStore(null);
                      } else {
                        setShowDinnerMenu(false);
                        setSelectedStore(null);
                      }
                    }}
                    className="flex items-center text-gray-400 hover:text-white transition-colors p-2 rounded-full hover:bg-gray-800/50"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                  </button>
                  <div className="bg-blue-900/50 px-4 py-2 rounded-full">
                    <span className="font-bold text-blue-300">
                      Dinner Points: {dinnerPoints}
                    </span>
                  </div>
                </div>

                {!selectedStore ? (
                  // Show stores grid
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {dinnerStores.map((store) => (
                      <motion.div
                        key={store.id}
                        whileHover={{ scale: 1.02 }}
                        onClick={() => setSelectedStore(store)}
                        className="bg-[#1e293b] rounded-xl shadow-lg overflow-hidden border border-gray-700/50 cursor-pointer"
                      >
                        <div className="relative h-48">
                          <img
                            src={store.image}
                            alt={store.name}
                            className="w-full h-full object-cover"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                          <h3 className="absolute bottom-4 left-4 text-xl font-bold text-white">
                            {store.name}
                          </h3>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                ) : (
                  // Show selected store's menu
                  <div className="space-y-6">
                    <div className="bg-[#1e293b] rounded-xl shadow-lg overflow-hidden border border-gray-700/50">
                      <div className="relative h-48">
                        <img
                          src={selectedStore.image}
                          alt={selectedStore.name}
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                        <h3 className="absolute bottom-4 left-4 text-xl font-bold text-white">
                          {selectedStore.name}
                        </h3>
                      </div>
                      <div className="p-4 space-y-4">
                        {selectedStore.menu.map((item) => (
                          <div
                            key={item.id}
                            className="flex justify-between items-center p-3 bg-gray-800/50 rounded-lg"
                          >
                            <div>
                              <h4 className="font-medium text-white">{item.name}</h4>
                              <p className="text-sm text-gray-400">{item.description}</p>
                              <p className="text-sm text-blue-400 mt-1">{item.points} points</p>
                            </div>
                            <button
                              onClick={() => handleAddToDinnerCart(item, selectedStore.id)}
                              className={`px-3 py-1 rounded-lg transition-colors ${
                                dinnerPoints >= item.points
                                  ? 'bg-purple-600 hover:bg-purple-500 text-white'
                                  : 'bg-gray-700 text-gray-400 cursor-not-allowed'
                              }`}
                              disabled={dinnerPoints < item.points}
                            >
                              Add
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* Cart Summary */}
                {dinnerCart.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="fixed bottom-0 left-0 right-0 bg-[#1e293b] border-t border-gray-700/50 p-4"
                  >
                    <div className="max-w-7xl mx-auto flex justify-between items-center">
                      <div>
                        <h3 className="text-lg font-bold text-white">Dinner Cart</h3>
                        <p className="text-gray-400">
                          {dinnerCart.length} items • {250 - dinnerPoints} points used
                        </p>
                      </div>
                      <div className="flex space-x-4">
                        <button
                          onClick={handleClearDinnerCart}
                          className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                        >
                          Clear Cart
                        </button>
                        <button
                          onClick={() => {
                            console.log('Confirm dinner order button clicked');
                            handlePlaceDinnerOrder();
                          }}
                          className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-colors"
                        >
                          Confirm Order
                        </button>
                      </div>
                    </div>
                  </motion.div>
                )}
              </motion.div>
            ) : (
              <div className="text-center">
                <h3 className="text-xl font-bold text-gray-400">No meal selected</h3>
                <p className="text-gray-500">Please select a meal time to proceed</p>
              </div>
            )}
          </motion.div>
        )}

        {/* Settings Page */}
        {currentPage === 'settings' && (
          <SettingsPage user={user} onBack={() => setCurrentPage('home')} />
        )}
      </motion.div>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-[#1e293b] border-t border-gray-700/50 shadow-md flex justify-around py-2 z-40">
        <button 
          onClick={() => setCurrentPage('settings')}
          className="flex items-center justify-center p-2 rounded-full bg-gray-800/50 hover:bg-gray-700/50 text-gray-400 hover:text-gray-200 transition-all"
          aria-label="Settings"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        </button>

        <div className="relative">
          <button
            onClick={() => {
              setCurrentPage('home');
              setErrorMessage('');
              setSuccessMessage('');
            }}
            className={`absolute -top-8 left-1/2 transform -translate-x-1/2 flex flex-col items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-blue-600 to-blue-800 text-white shadow-lg hover:shadow-xl transition-all ${currentPage === 'home' ? 'ring-4 ring-blue-500/50' : ''}`}
            aria-label="Home"
          >
            <HomeIcon className="h-8 w-8" />
          </button>
        </div>

        <button
          onClick={() => setShowLogoutModal(true)}
          className="flex items-center justify-center p-2 rounded-full bg-gray-800/50 hover:bg-red-900/50 text-red-400 hover:text-red-300 transition-all"
          aria-label="Logout"
        >
          <LogoutIcon className="h-8 w-8" />
        </button>
      </nav>

      {/* Modals */}
      {showClaimModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-[#1e293b] rounded-2xl p-6 max-w-sm w-full shadow-lg border-2 border-gray-700/50 text-center space-y-4"
          >
            <h3 className="text-2xl font-bold text-green-400">🎉 Congrats!</h3>
            <p className="text-gray-200">
              You've successfully claimed:
              <br />
              <span className="font-bold text-blue-400">{claimedRewardName}</span>
            </p>

            <div className="text-sm text-gray-400 mt-2">
              Claimed on: <span className="font-medium text-gray-300">{claimTime}</span>
            </div>

            <p className="text-xs text-gray-500 mt-1">
              Please show this screen to the cashier as proof of reward redemption.
            </p>

            <button
              onClick={() => setShowClaimModal(false)}
              className="mt-4 bg-blue-600 text-white px-4 py-2 rounded-full hover:bg-blue-700 transition"
            >
              Got it!
            </button>
          </motion.div>
        </div>
      )}

      {/* Success Modal */}
      {showSuccessModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-[#1e293b] rounded-2xl p-6 max-w-sm w-full shadow-xl border-2 border-gray-700/50"
          >
            <div className="text-center space-y-4">
              <div className="w-16 h-16 bg-green-900/50 rounded-full flex items-center justify-center mx-auto">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-gray-200">
                {modalType === 'borrow' ? 'Borrow Complete!' : 'Return Complete!'}
              </h3>
              <div className="bg-gray-800/50 p-4 rounded-xl">
                <p className="text-gray-300 mb-2">
                  <span className="font-bold text-gray-200">ID Number:</span> {user.idNumber}
                </p>
                <p className="text-gray-300 mb-2">
                  <span className="font-bold text-gray-200">
                    {modalType === 'borrow' ? 'Borrow Time:' : 'Return Time:'}
                  </span> {modalTime}
                </p>
                <p className="text-gray-300">
                  <span className="font-bold text-gray-200">
                    {modalType === 'borrow' ? 'Borrowed Items:' : 'Returned Items:'}
                  </span>
                </p>
                <ul className="text-gray-300 mt-2 space-y-1">
                  {modalItems.map((item, index) => (
                    <li key={index}>• {item.name} (x{item.quantity || item.cartQuantity})</li>
                  ))}
                </ul>
                <div className="mt-4 p-3 bg-blue-900/30 rounded-lg border border-blue-700/50">
                  <p className="text-blue-300 font-medium">
                    Please show this to the Concierge as Proof.
                  </p>
                </div>
              </div>
              <button 
                onClick={() => {
                  setShowSuccessModal(false);
                  if (modalType === 'return') {
                    setShowFeedbackForm(true);
                  }
                  setModalItems([]); // Clear modal items
                  setModalTime(''); // Clear modal time
                }}
                className="w-full py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-all"
              >
                OK
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Logout Confirmation Modal */}
      {showLogoutModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-[#1e293b] rounded-2xl p-6 w-80 shadow-2xl space-y-4 border border-gray-700/50">
            <h2 className="text-lg font-bold text-gray-200">Confirm Logout</h2>
            <p className="text-sm text-gray-400">Are you sure you want to log out?</p>

            <div className="flex justify-end space-x-4 pt-4">
              <button 
                onClick={() => setShowLogoutModal(false)}
                className="px-4 py-2 text-sm rounded-full border border-gray-300 bg-gray-100 text-gray-700 hover:bg-gray-200 transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleLogout}
                className="px-4 py-2 text-sm rounded-full bg-red-600 text-white hover:bg-red-700 transition-all"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Breakfast Cart */}
      {breakfastCart.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="fixed bottom-0 left-0 right-0 bg-[#1e293b] p-4 rounded-t-2xl shadow-lg border-t border-gray-700/50 z-50"
        >
          <div className="container mx-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-white">Breakfast Cart</h3>
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-400">Total Points:</span>
                <span className="text-lg font-bold text-blue-400">
                  {getTotalBreakfastPoints()}
                </span>
              </div>
            </div>
            <div className="space-y-2 max-h-40 overflow-y-auto mb-4">
              {renderBreakfastCart()}
            </div>
            <div className="flex justify-end gap-2">
              <button
                onClick={handleClearBreakfastCart}
                className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
              >
                Clear
              </button>
              <button
                onClick={() => {
                  console.log('Confirm breakfast order button clicked');
                  handlePlaceBreakfastOrder();
                }}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-colors"
              >
                Confirm Order
              </button>
            </div>
          </div>
        </motion.div>
      )}

      {/* Lunch Cart */}
      {lunchCart.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="fixed bottom-0 left-0 right-0 bg-[#1e293b] p-4 rounded-t-2xl shadow-lg border-t border-gray-700/50 z-50"
        >
          <div className="container mx-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-white">Lunch Cart</h3>
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-400">Total Points:</span>
                <span className="text-lg font-bold text-blue-400">
                  {getTotalLunchPoints()}
                </span>
              </div>
            </div>
            <div className="space-y-2 max-h-40 overflow-y-auto mb-4">
              {renderLunchCart()}
            </div>
            <div className="flex justify-end gap-2">
              <button
                onClick={handleClearLunchCart}
                className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
              >
                Clear
              </button>
              <button
                onClick={() => {
                  console.log('Confirm lunch order button clicked');
                  handlePlaceLunchOrder();
                }}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-colors"
              >
                Confirm Order
              </button>
            </div>
          </div>
        </motion.div>
      )}

      {/* Dinner Cart */}
      {dinnerCart.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="fixed bottom-0 left-0 right-0 bg-[#1e293b] p-4 rounded-t-2xl shadow-lg border-t border-gray-700/50 z-50"
        >
          <div className="container mx-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-white">Dinner Cart</h3>
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-400">Total Points:</span>
                <span className="text-lg font-bold text-blue-400">
                  {getTotalDinnerPoints()}
                </span>
              </div>
            </div>
            <div className="space-y-2 max-h-40 overflow-y-auto mb-4">
              {renderDinnerCart()}
            </div>
            <div className="flex justify-end gap-2">
              <button
                onClick={handleClearDinnerCart}
                className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
              >
                Clear
              </button>
              <button
                onClick={() => {
                  console.log('Confirm dinner order button clicked');
                  handlePlaceDinnerOrder();
                }}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-colors"
              >
                Confirm Order
              </button>
            </div>
          </div>
        </motion.div>
      )}

      {showFeedbackForm && (
        <FeedbackForm
          onSubmit={handleFeedbackSubmit}
          onClose={() => setShowFeedbackForm(false)}
        />
      )}
    </div>
  );
}

function SettingsPage({ user, onBack }) {
  const [currentPassword, setCurrentPassword] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [section, setSection] = useState('profile');
  const baseUrl = import.meta.env.VITE_API_BASE_URL;

  const handleProfileUpdate = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (!currentPassword) {
      setErrorMsg('Please enter your current password');
      return;
    }

    if (password !== confirmPassword) {
      setErrorMsg('New passwords do not match');
      return;
    }

    try {
      setIsLoading(true);
      const token = user.token;
      await axios.put(
        `${baseUrl}/api/student/profile`,
        { 
          currentPassword,
          newPassword: password
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setSuccessMsg('Password updated successfully!');
      setCurrentPassword('');
      setPassword('');
      setConfirmPassword('');
    } catch (err) {
      if (err.response?.data?.message === 'Current password is incorrect') {
        setErrorMsg('Current password is incorrect. Please try again.');
      } else {
        setErrorMsg(err.response?.data?.message || 'Failed to update profile');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto p-6 bg-white rounded-2xl shadow-lg mt-8 mb-24">
      <div className="flex items-center mb-6">
        <button onClick={onBack} className="mr-4 text-purple-600 hover:text-purple-800">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <h2 className="text-2xl font-bold text-purple-800">Settings</h2>
      </div>
      <div className="flex space-x-2 mb-6">
        <button onClick={() => setSection('profile')} className={`flex-1 py-2 rounded-lg font-semibold ${section === 'profile' ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-600'}`}>Profile</button>
        <button onClick={() => setSection('about')} className={`flex-1 py-2 rounded-lg font-semibold ${section === 'about' ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-600'}`}>About</button>
        <button onClick={() => setSection('help')} className={`flex-1 py-2 rounded-lg font-semibold ${section === 'help' ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-600'}`}>Help</button>
      </div>
      {section === 'profile' && (
        <div className="space-y-6">
          <form onSubmit={handleProfileUpdate} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Current Password</label>
              <input 
                type="password" 
                className="w-full border-2 border-purple-200 rounded-lg p-2" 
                value={currentPassword} 
                onChange={e => setCurrentPassword(e.target.value)} 
                placeholder="Enter current password"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">New Password</label>
              <input 
                type="password" 
                className="w-full border-2 border-purple-200 rounded-lg p-2" 
                value={password} 
                onChange={e => setPassword(e.target.value)} 
                placeholder="Enter new password"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Confirm New Password</label>
              <input 
                type="password" 
                className="w-full border-2 border-purple-200 rounded-lg p-2" 
                value={confirmPassword} 
                onChange={e => setConfirmPassword(e.target.value)} 
                placeholder="Confirm new password"
                required
              />
            </div>
            {errorMsg && (
              <div className="p-3 bg-red-50 border-l-4 border-red-500 rounded-lg flex items-start space-x-2">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-red-500 mt-0.5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                <span className="text-red-700 font-medium">{errorMsg}</span>
              </div>
            )}
            {successMsg && (
              <div className="p-3 bg-green-50 border-l-4 border-green-500 rounded-lg flex items-start space-x-2">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-green-500 mt-0.5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <span className="text-green-700 font-medium">{successMsg}</span>
              </div>
            )}
            <button 
              type="submit" 
              disabled={isLoading} 
              className="w-full py-2 bg-purple-600 text-white rounded-lg font-bold hover:bg-purple-700 transition-all"
            >
              {isLoading ? 'Saving...' : 'Update Password'}
            </button>
          </form>
        </div>
      )}
      {section === 'about' && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-900">About 2gonz</h3>
          <p className="text-gray-600">
            2gonz is a loyalty reward system designed to encourage sustainable practices
            by rewarding students for borrowing and returning items properly.
          </p>
        </div>
      )}
      {section === 'help' && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-900">Need Help?</h3>
          <p className="text-gray-600">
            If you need assistance, please head towards the cashier for assistance.
          </p>
        </div>
      )}
    </div>
  );
}